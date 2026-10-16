/**
 * MODULE: Library Management Service (TASK 028)
 *
 * PURPOSE:
 * Core business logic for book cataloging, physical copy barcode/accession tracking,
 * transactional book issue and return workflows, loan renewals, reservations queue,
 * fine calculations with policy limits, and role-based student/parent borrower portals.
 *
 * SECURITY:
 * Enforces school-level tenant isolation, RBAC role permissions, and verified
 * parent-child relationship checks.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  CreateBookDto,
  UpdateBookDto,
  CreateBookCopyDto,
  UpdateBookCopyDto,
  IssueBookDto,
  ReturnBookDto,
  RenewLoanDto,
  CreateReservationDto,
  WaiveFineDto,
  UpdatePolicyDto,
} from './dto/library.dto';

@Injectable()
export class LibraryService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveSchoolId(user: AuthUser, explicitSchoolId?: string): string {
    if (user.role === UserRole.PLATFORM_ADMIN) {
      if (explicitSchoolId) return explicitSchoolId;
      if (user.schoolId) return user.schoolId;
      throw new BadRequestException('schoolId is required for platform administrator actions');
    }
    if (!user.schoolId) {
      throw new ForbiddenException('User is not associated with an institutional school tenant');
    }
    if (explicitSchoolId && explicitSchoolId !== user.schoolId) {
      throw new ForbiddenException('Cross-school operations are strictly prohibited');
    }
    return user.schoolId;
  }

  // ===========================================================================
  // 1. BOOK CATALOG
  // ===========================================================================

  async listBooks(
    user: AuthUser,
    explicitSchoolId?: string,
    query?: string,
    category?: string,
    isArchived = false
  ) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    return this.prisma.libraryBook.findMany({
      where: {
        schoolId,
        isArchived,
        ...(category ? { category } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { author: { contains: query, mode: 'insensitive' } },
                { isbn: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        copies: { select: { id: true, accessionNumber: true, status: true, shelfLocation: true, condition: true } },
      },
      orderBy: { title: 'asc' },
    });
  }

  async getBook(id: string, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const book = await this.prisma.libraryBook.findFirst({
      where: { id, schoolId },
      include: {
        copies: {
          include: {
            loans: {
              where: { status: 'ISSUED' },
              include: { borrower: { select: { id: true, firstName: true, lastName: true, email: true } } },
            },
          },
        },
        reservations: {
          where: { status: 'PENDING' },
          include: { borrower: { select: { id: true, firstName: true, lastName: true, email: true } } },
          orderBy: { queuePosition: 'asc' },
        },
      },
    });
    if (!book) throw new NotFoundException('Book not found in this school');
    return book;
  }

  async createBook(dto: CreateBookDto, user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);

    return this.prisma.libraryBook.create({
      data: {
        schoolId,
        title: dto.title.trim(),
        isbn: dto.isbn ? dto.isbn.trim() : null,
        author: dto.author.trim(),
        publisher: dto.publisher ? dto.publisher.trim() : null,
        category: dto.category || 'General',
        subject: dto.subject || null,
        language: dto.language || 'English',
        edition: dto.edition || null,
        publicationYear: dto.publicationYear || null,
        description: dto.description || null,
        coverImage: dto.coverImage || null,
        totalCopies: 0,
        availableCopies: 0,
      },
    });
  }

  async updateBook(id: string, dto: UpdateBookDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const book = await this.prisma.libraryBook.findFirst({ where: { id, schoolId } });
    if (!book) throw new NotFoundException('Book not found');

    return this.prisma.libraryBook.update({
      where: { id },
      data: {
        title: dto.title ? dto.title.trim() : undefined,
        isbn: dto.isbn ? dto.isbn.trim() : undefined,
        author: dto.author ? dto.author.trim() : undefined,
        publisher: dto.publisher ? dto.publisher.trim() : undefined,
        category: dto.category,
        subject: dto.subject,
        language: dto.language,
        edition: dto.edition,
        publicationYear: dto.publicationYear,
        description: dto.description,
        coverImage: dto.coverImage,
        isArchived: dto.isArchived,
      },
    });
  }

  // ===========================================================================
  // 2. PHYSICAL COPIES (INVENTORY)
  // ===========================================================================

  async listCopies(user: AuthUser, bookId?: string, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    return this.prisma.bookCopy.findMany({
      where: {
        schoolId,
        ...(bookId ? { bookId } : {}),
      },
      include: {
        book: { select: { id: true, title: true, author: true, isbn: true } },
        loans: {
          where: { status: 'ISSUED' },
          include: { borrower: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { accessionNumber: 'asc' },
    });
  }

  async createCopy(dto: CreateBookCopyDto, user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);

    const book = await this.prisma.libraryBook.findFirst({ where: { id: dto.bookId, schoolId } });
    if (!book) throw new NotFoundException('Book not found in this school');

    const accession = dto.accessionNumber.trim().toUpperCase();
    const existing = await this.prisma.bookCopy.findFirst({
      where: { schoolId, accessionNumber: accession },
    });
    if (existing) {
      throw new ConflictException(`Accession number ${accession} already exists in this school inventory`);
    }

    return this.prisma.$transaction(async (tx) => {
      const copy = await tx.bookCopy.create({
        data: {
          schoolId,
          bookId: dto.bookId,
          accessionNumber: accession,
          barcode: dto.barcode ? dto.barcode.trim() : null,
          shelfLocation: dto.shelfLocation ? dto.shelfLocation.trim() : null,
          acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : new Date(),
          condition: dto.condition || 'GOOD',
          status: 'AVAILABLE',
        },
      });

      // Update book copy counts
      await tx.libraryBook.update({
        where: { id: dto.bookId },
        data: {
          totalCopies: { increment: 1 },
          availableCopies: { increment: 1 },
        },
      });

      return copy;
    });
  }

  async updateCopy(id: string, dto: UpdateBookCopyDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const copy = await this.prisma.bookCopy.findFirst({ where: { id, schoolId } });
    if (!copy) throw new NotFoundException('Copy not found');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.bookCopy.update({
        where: { id },
        data: {
          shelfLocation: dto.shelfLocation,
          condition: dto.condition,
          status: dto.status,
        },
      });

      // Recalculate available copies
      const available = await tx.bookCopy.count({
        where: { bookId: copy.bookId, status: 'AVAILABLE' },
      });
      const total = await tx.bookCopy.count({
        where: { bookId: copy.bookId },
      });

      await tx.libraryBook.update({
        where: { id: copy.bookId },
        data: { availableCopies: available, totalCopies: total },
      });

      return updated;
    });
  }

  // ===========================================================================
  // 3. BOOK ISSUE & RETURN (ATOMIC TRANSACTIONS)
  // ===========================================================================

  async issueBook(dto: IssueBookDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch copy with lock
      const copy = await tx.bookCopy.findFirst({
        where: { id: dto.copyId, schoolId },
        include: { book: true },
      });
      if (!copy) throw new NotFoundException('Book copy not found');
      if (copy.status !== 'AVAILABLE') {
        throw new BadRequestException(`Book copy is not available (current status: ${copy.status})`);
      }

      // 2. Fetch borrower
      const borrower = await tx.user.findFirst({
        where: { id: dto.borrowerId, schoolId },
      });
      if (!borrower) throw new NotFoundException('Borrower not found in this school');

      const borrowerType = borrower.role === UserRole.TEACHER ? 'TEACHER' : 'STUDENT';

      // 3. Check borrower active loans limit from policy
      const policy = await tx.libraryPolicy.findFirst({
        where: { schoolId, borrowerType },
      });
      const maxBooks = policy?.maxBooks || (borrowerType === 'TEACHER' ? 5 : 3);
      const activeLoansCount = await tx.bookLoan.count({
        where: { borrowerId: dto.borrowerId, status: 'ISSUED' },
      });

      if (activeLoansCount >= maxBooks) {
        throw new BadRequestException(
          `Borrower has reached maximum borrowing limit of ${maxBooks} books (currently holding ${activeLoansCount})`
        );
      }

      // 4. Calculate due date
      const loanPeriodDays = policy?.loanPeriodDays || 14;
      const dueDate = dto.dueDate
        ? new Date(dto.dueDate)
        : new Date(Date.now() + loanPeriodDays * 24 * 60 * 60 * 1000);

      // 5. Update copy status to ISSUED
      await tx.bookCopy.update({
        where: { id: copy.id },
        data: { status: 'ISSUED' },
      });

      // 6. Decrement availableCopies on book
      await tx.libraryBook.update({
        where: { id: copy.bookId },
        data: { availableCopies: { decrement: 1 } },
      });

      // 7. Create loan record
      const loan = await tx.bookLoan.create({
        data: {
          schoolId,
          bookId: copy.bookId,
          copyId: copy.id,
          borrowerType,
          borrowerId: dto.borrowerId,
          issueDate: new Date(),
          dueDate,
          status: 'ISSUED',
          issuedById: user.id,
          notes: dto.notes || null,
        },
        include: {
          book: true,
          copy: true,
          borrower: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        },
      });

      // 8. Fulfill reservation if exists
      const reservation = await tx.bookReservation.findFirst({
        where: { bookId: copy.bookId, borrowerId: dto.borrowerId, status: 'PENDING' },
      });
      if (reservation) {
        await tx.bookReservation.update({
          where: { id: reservation.id },
          data: { status: 'FULFILLED' },
        });
      }

      return loan;
    });
  }

  async returnBook(dto: ReturnBookDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);

    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.bookLoan.findFirst({
        where: { id: dto.loanId, schoolId },
        include: { copy: true, book: true },
      });
      if (!loan) throw new NotFoundException('Loan record not found');
      if (loan.status === 'RETURNED') {
        throw new BadRequestException('This book loan has already been returned');
      }

      const returnDate = new Date();
      const returnCondition = dto.returnCondition || loan.copy.condition;
      const newCopyStatus = returnCondition === 'DAMAGED' ? 'DAMAGED' : 'AVAILABLE';

      // 1. Calculate overdue days & fine
      const policy = await tx.libraryPolicy.findFirst({
        where: { schoolId, borrowerType: loan.borrowerType },
      });

      const graceDays = policy?.gracePeriodDays || 0;
      const finePerDay = policy?.finePerDay || 1.0;
      const maxFine = policy?.maxFineAmount || 50.0;

      const diffMs = returnDate.getTime() - new Date(loan.dueDate).getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const overdueDays = diffDays > graceDays ? diffDays : 0;
      const fineAmount = Math.min(overdueDays * finePerDay, maxFine);

      let fineRecord: any = null;
      if (fineAmount > 0) {
        fineRecord = await tx.libraryFine.create({
          data: {
            schoolId,
            loanId: loan.id,
            borrowerType: loan.borrowerType,
            borrowerId: loan.borrowerId,
            amount: fineAmount,
            balanceAmount: fineAmount,
            overdueDays,
            status: 'UNPAID',
          },
        });
      }

      // 2. Update copy status
      await tx.bookCopy.update({
        where: { id: loan.copyId },
        data: {
          status: newCopyStatus,
          condition: returnCondition,
        },
      });

      // 3. Increment available copies if available
      if (newCopyStatus === 'AVAILABLE') {
        await tx.libraryBook.update({
          where: { id: loan.bookId },
          data: { availableCopies: { increment: 1 } },
        });
      }

      // 4. Update loan status
      const updatedLoan = await tx.bookLoan.update({
        where: { id: loan.id },
        data: {
          status: 'RETURNED',
          returnDate,
          returnCondition,
          returnedById: user.id,
          notes: dto.notes || loan.notes,
        },
        include: {
          book: true,
          copy: true,
          borrower: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
          fines: true,
        },
      });

      return {
        loan: updatedLoan,
        overdueDays,
        fine: fineRecord,
      };
    });
  }

  async renewLoan(dto: RenewLoanDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const loan = await txOrPrisma(this.prisma).bookLoan.findFirst({
      where: { id: dto.loanId, schoolId },
    });
    if (!loan) throw new NotFoundException('Loan record not found');
    if (loan.status !== 'ISSUED') {
      throw new BadRequestException('Only active loans can be renewed');
    }

    const policy = await this.prisma.libraryPolicy.findFirst({
      where: { schoolId, borrowerType: loan.borrowerType },
    });
    const renewalLimit = policy?.renewalLimit !== undefined ? policy.renewalLimit : 1;

    if (loan.renewCount >= renewalLimit) {
      throw new BadRequestException(`Maximum renewals (${renewalLimit}) reached for this book loan`);
    }

    // Default renew extension
    const extensionDays = policy?.loanPeriodDays || 14;
    const newDueDate = dto.newDueDate
      ? new Date(dto.newDueDate)
      : new Date(new Date(loan.dueDate).getTime() + extensionDays * 24 * 60 * 60 * 1000);

    return this.prisma.bookLoan.update({
      where: { id: loan.id },
      data: {
        dueDate: newDueDate,
        renewCount: { increment: 1 },
      },
      include: { book: true, copy: true },
    });
  }

  // ===========================================================================
  // 4. BOOK RESERVATIONS
  // ===========================================================================

  async reserveBook(dto: CreateReservationDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);

    const book = await this.prisma.libraryBook.findFirst({ where: { id: dto.bookId, schoolId } });
    if (!book) throw new NotFoundException('Book not found in this school');

    // Check if borrower already has an active reservation
    const existing = await this.prisma.bookReservation.findFirst({
      where: { bookId: dto.bookId, borrowerId: user.id, status: 'PENDING' },
    });
    if (existing) {
      throw new ConflictException('You already have a pending reservation for this book title');
    }

    const queueCount = await this.prisma.bookReservation.count({
      where: { bookId: dto.bookId, status: 'PENDING' },
    });

    const borrowerType = user.role === UserRole.TEACHER ? 'TEACHER' : 'STUDENT';

    return this.prisma.bookReservation.create({
      data: {
        schoolId,
        bookId: dto.bookId,
        borrowerType,
        borrowerId: user.id,
        queuePosition: queueCount + 1,
        status: 'PENDING',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        book: true,
      },
    });
  }

  async cancelReservation(id: string, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const reservation = await this.prisma.bookReservation.findFirst({
      where: { id, schoolId },
    });
    if (!reservation) throw new NotFoundException('Reservation not found');

    if (user.role !== UserRole.SCHOOL_ADMIN && user.role !== UserRole.PLATFORM_ADMIN && reservation.borrowerId !== user.id) {
      throw new ForbiddenException('Cannot cancel reservation belonging to another user');
    }

    return this.prisma.bookReservation.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  // ===========================================================================
  // 5. FINES & WAIVERS
  // ===========================================================================

  async listFines(user: AuthUser, explicitSchoolId?: string, status?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    return this.prisma.libraryFine.findMany({
      where: {
        schoolId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        loan: { include: { book: true, copy: true } },
        borrower: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async waiveFine(dto: WaiveFineDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);
    const fine = await this.prisma.libraryFine.findFirst({ where: { id: dto.fineId, schoolId } });
    if (!fine) throw new NotFoundException('Fine not found');

    const waiveAmount = dto.waiveAmount !== undefined ? dto.waiveAmount : fine.balanceAmount;
    if (waiveAmount <= 0) throw new BadRequestException('Waive amount must be greater than zero');
    if (waiveAmount > fine.balanceAmount) {
      throw new BadRequestException(`Cannot waive more than outstanding balance of $${fine.balanceAmount}`);
    }

    const newBalance = fine.balanceAmount - waiveAmount;
    const newStatus = newBalance === 0 ? 'WAIVED' : 'PARTIAL';

    return this.prisma.libraryFine.update({
      where: { id: fine.id },
      data: {
        waivedAmount: { increment: waiveAmount },
        balanceAmount: newBalance,
        status: newStatus,
        waivedReason: dto.reason,
        waivedById: user.id,
      },
    });
  }

  // ===========================================================================
  // 6. BORROWER SELF-SERVICE (STUDENT, TEACHER, PARENT)
  // ===========================================================================

  async getMyLibrary(user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);

    const [loans, reservations, fines] = await Promise.all([
      this.prisma.bookLoan.findMany({
        where: { borrowerId: user.id, schoolId },
        include: { book: true, copy: true },
        orderBy: { issueDate: 'desc' },
      }),
      this.prisma.bookReservation.findMany({
        where: { borrowerId: user.id, schoolId, status: 'PENDING' },
        include: { book: true },
        orderBy: { reservationDate: 'desc' },
      }),
      this.prisma.libraryFine.findMany({
        where: { borrowerId: user.id, schoolId },
        include: { loan: { include: { book: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { loans, reservations, fines };
  }

  async getParentChildLibrary(childId: string, user: AuthUser) {
    if (user.role !== UserRole.PARENT) {
      throw new ForbiddenException('Only parents can access child library records');
    }

    // Verify verified guardian relationship
    const relationship = await this.prisma.studentGuardianRelationship.findFirst({
      where: {
        guardianId: user.id,
        studentId: childId,
        verificationStatus: 'VERIFIED',
      },
    });
    if (!relationship) {
      throw new ForbiddenException('Access denied: You are not authorized to view library records for this student');
    }

    const [loans, fines] = await Promise.all([
      this.prisma.bookLoan.findMany({
        where: { borrowerId: childId },
        include: { book: true, copy: true },
        orderBy: { issueDate: 'desc' },
      }),
      this.prisma.libraryFine.findMany({
        where: { borrowerId: childId },
        include: { loan: { include: { book: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { childId, loans, fines };
  }

  // ===========================================================================
  // 7. BORROWING POLICIES
  // ===========================================================================

  async getPolicies(user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    return this.prisma.libraryPolicy.findMany({ where: { schoolId } });
  }

  async updatePolicy(borrowerType: 'STUDENT' | 'TEACHER', dto: UpdatePolicyDto, user: AuthUser) {
    const schoolId = this.resolveSchoolId(user);

    return this.prisma.libraryPolicy.upsert({
      where: { schoolId_borrowerType: { schoolId, borrowerType } },
      create: {
        schoolId,
        borrowerType,
        maxBooks: dto.maxBooks || (borrowerType === 'TEACHER' ? 5 : 3),
        loanPeriodDays: dto.loanPeriodDays || 14,
        renewalLimit: dto.renewalLimit !== undefined ? dto.renewalLimit : 1,
        finePerDay: dto.finePerDay || 1.0,
        gracePeriodDays: dto.gracePeriodDays || 2,
        maxFineAmount: dto.maxFineAmount || 50.0,
      },
      update: {
        maxBooks: dto.maxBooks,
        loanPeriodDays: dto.loanPeriodDays,
        renewalLimit: dto.renewalLimit,
        finePerDay: dto.finePerDay,
        gracePeriodDays: dto.gracePeriodDays,
        maxFineAmount: dto.maxFineAmount,
      },
    });
  }

  // ===========================================================================
  // 8. LIBRARY REPORTS & KPIS
  // ===========================================================================

  async getReports(user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);

    const [
      totalTitles,
      totalCopies,
      availableCopies,
      issuedCopies,
      overdueLoans,
      lostOrDamagedCopies,
      activeReservations,
      finesSummary,
      recentLoans,
    ] = await Promise.all([
      this.prisma.libraryBook.count({ where: { schoolId, isArchived: false } }),
      this.prisma.bookCopy.count({ where: { schoolId } }),
      this.prisma.bookCopy.count({ where: { schoolId, status: 'AVAILABLE' } }),
      this.prisma.bookCopy.count({ where: { schoolId, status: 'ISSUED' } }),
      this.prisma.bookLoan.count({
        where: { schoolId, status: 'ISSUED', dueDate: { lt: new Date() } },
      }),
      this.prisma.bookCopy.count({
        where: { schoolId, status: { in: ['LOST', 'DAMAGED'] } },
      }),
      this.prisma.bookReservation.count({
        where: { schoolId, status: 'PENDING' },
      }),
      this.prisma.libraryFine.aggregate({
        where: { schoolId },
        _sum: { amount: true, balanceAmount: true },
      }),
      this.prisma.bookLoan.findMany({
        where: { schoolId },
        include: {
          book: true,
          copy: true,
          borrower: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
        },
        orderBy: { issueDate: 'desc' },
        take: 5,
      }),
    ]);

    return {
      totalTitles,
      totalCopies,
      availableCopies,
      issuedCopies,
      overdueLoans,
      lostOrDamagedCopies,
      activeReservations,
      totalFinesAccrued: finesSummary._sum.amount || 0,
      outstandingFines: finesSummary._sum.balanceAmount || 0,
      recentLoans,
    };
  }
}

function txOrPrisma(prisma: any): any {
  return prisma;
}
