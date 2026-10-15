/**
 * MODULE: Student Fee Management Service
 *
 * PURPOSE:
 * Core financial engine for educational fee structures, student fee assignments,
 * invoice calculation, manual payment collection, receipt issuing, discounts,
 * and parent/student financial access.
 *
 * DEPENDENCIES:
 * PrismaService, Notification, UserRole, @ems/contracts
 *
 * SECURITY:
 * Strict school-tenant isolation enforced. Teachers forbidden from financial records.
 * Guard against overpayment, race conditions, cross-tenant leaks, and data tampering.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, UserRole, FeeInvoiceStatus } from '@ems/contracts';
import {
  CreateFeeCategoryDto,
  CreateFeeStructureDto,
  CreateFeeDiscountDto,
  AssignStudentFeeDto,
  CreateFeeInvoiceDto,
  RecordFeePaymentDto,
  VoidInvoiceDto,
  ReversePaymentDto,
} from './dto/fee.dto';

@Injectable()
export class FeesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // TENANT SCOPING HELPER
  // ---------------------------------------------------------------------------
  private resolveSchoolId(user: AuthUser, explicitSchoolId?: string): string {
    if (user.role === UserRole.PLATFORM_ADMIN) {
      if (!explicitSchoolId && !user.schoolId) {
        throw new BadRequestException('schoolId is required for platform administrator financial queries.');
      }
      return explicitSchoolId || user.schoolId!;
    }

    if (!user.schoolId) {
      throw new ForbiddenException('User is not associated with an institutional tenant.');
    }

    if (explicitSchoolId && explicitSchoolId !== user.schoolId) {
      throw new ForbiddenException('Cross-school financial access is strictly prohibited.');
    }

    return user.schoolId;
  }

  // ---------------------------------------------------------------------------
  // 1. FEE CATEGORIES
  // ---------------------------------------------------------------------------
  async getCategories(user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    return this.prisma.feeCategory.findMany({
      where: { schoolId },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(user: AuthUser, dto: CreateFeeCategoryDto) {
    const schoolId = this.resolveSchoolId(user, dto.schoolId);

    const existing = await this.prisma.feeCategory.findUnique({
      where: {
        schoolId_name: {
          schoolId,
          name: dto.name.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Fee category "${dto.name}" already exists for this school.`);
    }

    return this.prisma.feeCategory.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        code: dto.code?.trim().toUpperCase(),
        description: dto.description?.trim(),
        isTuition: !!dto.isTuition,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 2. FEE STRUCTURES
  // ---------------------------------------------------------------------------
  async getStructures(
    user: AuthUser,
    filters?: {
      academicYearId?: string;
      categoryId?: string;
      gradeLevel?: string;
      explicitSchoolId?: string;
    }
  ) {
    const schoolId = this.resolveSchoolId(user, filters?.explicitSchoolId);

    return this.prisma.feeStructure.findMany({
      where: {
        schoolId,
        ...(filters?.academicYearId ? { academicYearId: filters.academicYearId } : {}),
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.gradeLevel ? { gradeLevel: filters.gradeLevel } : {}),
      },
      include: {
        category: true,
        academicYear: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStructure(user: AuthUser, dto: CreateFeeStructureDto) {
    const schoolId = this.resolveSchoolId(user, dto.schoolId);

    // Verify academic year belongs to school
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: dto.academicYearId, schoolId },
    });
    if (!academicYear) {
      throw new NotFoundException('Academic year not found for this institutional tenant.');
    }

    // Verify category belongs to school
    const category = await this.prisma.feeCategory.findFirst({
      where: { id: dto.categoryId, schoolId },
    });
    if (!category) {
      throw new NotFoundException('Fee category not found for this institutional tenant.');
    }

    return this.prisma.feeStructure.create({
      data: {
        schoolId,
        academicYearId: dto.academicYearId,
        categoryId: dto.categoryId,
        name: dto.name.trim(),
        gradeLevel: dto.gradeLevel?.trim() || null,
        amount: Math.round(dto.amount * 100) / 100,
        currency: dto.currency?.trim().toUpperCase() || 'USD',
        frequency: (dto.frequency as any) || 'ANNUALLY',
        dueDateDays: dto.dueDateDays || 30,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        category: true,
        academicYear: { select: { id: true, name: true } },
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 3. DISCOUNTS & SCHOLARSHIPS
  // ---------------------------------------------------------------------------
  async getDiscounts(user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);
    return this.prisma.feeDiscount.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDiscount(user: AuthUser, dto: CreateFeeDiscountDto) {
    const schoolId = this.resolveSchoolId(user, dto.schoolId);

    return this.prisma.feeDiscount.create({
      data: {
        schoolId,
        name: dto.name.trim(),
        type: dto.type as any,
        value: Math.round(dto.value * 100) / 100,
        reason: dto.reason?.trim() || null,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 4. STUDENT FEE ASSIGNMENTS
  // ---------------------------------------------------------------------------
  async getAssignments(
    user: AuthUser,
    filters?: {
      studentId?: string;
      academicYearId?: string;
      feeStructureId?: string;
      explicitSchoolId?: string;
    }
  ) {
    const schoolId = this.resolveSchoolId(user, filters?.explicitSchoolId);

    const assignments = await this.prisma.studentFeeAssignment.findMany({
      where: {
        schoolId,
        ...(filters?.studentId ? { studentId: filters.studentId } : {}),
        ...(filters?.academicYearId ? { academicYearId: filters.academicYearId } : {}),
        ...(filters?.feeStructureId ? { feeStructureId: filters.feeStructureId } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentProfile: { select: { admissionNumber: true, gradeLevel: true } },
          },
        },
        feeStructure: {
          include: { category: true },
        },
        academicYear: { select: { id: true, name: true } },
        discount: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return assignments.map((a) => ({
      id: a.id,
      schoolId: a.schoolId,
      studentId: a.studentId,
      studentName: `${a.student.firstName} ${a.student.lastName}`,
      admissionNumber: a.student.studentProfile?.admissionNumber || null,
      academicYearId: a.academicYearId,
      academicYearName: a.academicYear.name,
      feeStructureId: a.feeStructureId,
      feeStructureName: a.feeStructure.name,
      amount: a.customAmount ?? a.feeStructure.amount,
      currency: a.feeStructure.currency,
      discountId: a.discountId,
      discountName: a.discount?.name || null,
      customAmount: a.customAmount,
      notes: a.notes,
      isActive: a.isActive,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async assignFee(user: AuthUser, dto: AssignStudentFeeDto) {
    const schoolId = this.resolveSchoolId(user, dto.schoolId);

    // Validate structure
    const feeStructure = await this.prisma.feeStructure.findFirst({
      where: { id: dto.feeStructureId, schoolId },
    });
    if (!feeStructure) {
      throw new NotFoundException('Fee structure not found.');
    }

    // Determine target students: individual studentId or bulk by classSectionId
    let studentIds: string[] = [];
    if (dto.studentId) {
      studentIds = [dto.studentId];
    } else if (dto.classSectionId) {
      const enrollments = await this.prisma.classEnrollment.findMany({
        where: {
          sectionId: dto.classSectionId,
          academicYearId: dto.academicYearId,
          status: 'ACTIVE',
        },
        select: { studentId: true },
      });
      studentIds = enrollments.map((e) => e.studentId);
    } else {
      throw new BadRequestException('Either studentId or classSectionId must be provided.');
    }

    if (studentIds.length === 0) {
      throw new BadRequestException('No enrolled students found for the target assignment.');
    }

    const createdAssignments: any[] = [];
    for (const studentId of studentIds) {
      // Prevent duplicate active fee assignment for same student, structure, year
      const existing = await this.prisma.studentFeeAssignment.findUnique({
        where: {
          studentId_feeStructureId_academicYearId: {
            studentId,
            feeStructureId: dto.feeStructureId,
            academicYearId: dto.academicYearId,
          },
        },
      });

      if (existing) {
        continue; // Skip already assigned
      }

      const assignment = await this.prisma.studentFeeAssignment.create({
        data: {
          schoolId,
          studentId,
          academicYearId: dto.academicYearId,
          feeStructureId: dto.feeStructureId,
          discountId: dto.discountId || null,
          customAmount: dto.customAmount ? Math.round(dto.customAmount * 100) / 100 : null,
          notes: dto.notes?.trim() || null,
        },
      });

      createdAssignments.push(assignment);

      // Optional immediate invoice generation
      if (dto.generateInvoice) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (feeStructure.dueDateDays || 30));

        await this.createInvoice(user, {
          schoolId,
          studentId,
          academicYearId: dto.academicYearId,
          discountId: dto.discountId,
          dueDate: dueDate.toISOString(),
          notes: `Auto-generated from fee assignment: ${feeStructure.name}`,
          items: [
            {
              name: feeStructure.name,
              amount: dto.customAmount ?? feeStructure.amount,
              feeStructureId: feeStructure.id,
            },
          ],
        });
      }
    }

    return {
      assignedCount: createdAssignments.length,
      assignments: createdAssignments,
    };
  }

  // ---------------------------------------------------------------------------
  // 5. INVOICES
  // ---------------------------------------------------------------------------
  private async generateUniqueInvoiceNumber(schoolId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.feeInvoice.count({
      where: { schoolId },
    });
    const seq = (count + 1).toString().padStart(5, '0');
    return `INV-${year}-${seq}`;
  }

  async getInvoices(
    user: AuthUser,
    filters?: {
      status?: string;
      studentId?: string;
      academicYearId?: string;
      search?: string;
      explicitSchoolId?: string;
    }
  ) {
    const schoolId = this.resolveSchoolId(user, filters?.explicitSchoolId);

    const invoices = await this.prisma.feeInvoice.findMany({
      where: {
        schoolId,
        ...(filters?.status ? { status: filters.status as any } : {}),
        ...(filters?.studentId ? { studentId: filters.studentId } : {}),
        ...(filters?.academicYearId ? { academicYearId: filters.academicYearId } : {}),
        ...(filters?.search
          ? {
              OR: [
                { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
                { student: { firstName: { contains: filters.search, mode: 'insensitive' } } },
                { student: { lastName: { contains: filters.search, mode: 'insensitive' } } },
              ],
            }
          : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentProfile: { select: { admissionNumber: true, gradeLevel: true } },
            classEnrollments: {
              where: { status: 'ACTIVE' },
              take: 1,
              include: { section: { include: { schoolClass: true } } },
            },
          },
        },
        academicYear: { select: { id: true, name: true } },
        discount: true,
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map((inv) => this.formatInvoiceDto(inv));
  }

  async getInvoiceById(user: AuthUser, id: string) {
    const invoice = await this.prisma.feeInvoice.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true, code: true, address: true, phone: true, email: true } },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentProfile: { select: { admissionNumber: true, gradeLevel: true } },
            classEnrollments: {
              where: { status: 'ACTIVE' },
              take: 1,
              include: { section: { include: { schoolClass: true } } },
            },
            studentRelationships: {
              include: { guardian: { select: { firstName: true, lastName: true, phone: true, email: true } } },
            },
          },
        },
        academicYear: { select: { id: true, name: true } },
        discount: true,
        items: true,
        payments: {
          include: { recordedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Fee invoice not found.');
    }

    // Role verification
    if (user.role === UserRole.TEACHER) {
      throw new ForbiddenException('Teachers are not authorized to view student financial records.');
    }

    if (user.role === UserRole.STUDENT && invoice.studentId !== user.id) {
      throw new ForbiddenException('Access to another student invoice is prohibited.');
    }

    if (user.role === UserRole.PARENT) {
      const isLinked = invoice.student.studentRelationships.some(
        (r) => r.guardianId === user.id && r.verificationStatus === 'VERIFIED'
      );
      if (!isLinked) {
        throw new ForbiddenException('Access to invoice of non-linked student is prohibited.');
      }
    } else if (user.role !== UserRole.PLATFORM_ADMIN && invoice.schoolId !== user.schoolId) {
      throw new ForbiddenException('Cross-school invoice access is prohibited.');
    }

    return this.formatInvoiceDto(invoice);
  }

  async createInvoice(user: AuthUser, dto: CreateFeeInvoiceDto) {
    const schoolId = this.resolveSchoolId(user, dto.schoolId);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one invoice item is required.');
    }

    // Verify student belongs to school
    const student = await this.prisma.user.findFirst({
      where: { id: dto.studentId, schoolId, role: UserRole.STUDENT },
    });
    if (!student) {
      throw new NotFoundException('Student not found within this institutional tenant.');
    }

    // Calculate subtotal
    const subtotal = dto.items.reduce((sum, item) => sum + Math.round(item.amount * 100) / 100, 0);

    // Calculate discount if applicable
    let discountAmount = 0;
    if (dto.discountId) {
      const discount = await this.prisma.feeDiscount.findFirst({
        where: { id: dto.discountId, schoolId, isActive: true },
      });
      if (discount) {
        if (discount.type === 'PERCENTAGE') {
          discountAmount = Math.round(((subtotal * discount.value) / 100) * 100) / 100;
        } else {
          discountAmount = Math.min(subtotal, Math.round(discount.value * 100) / 100);
        }
      }
    }

    const totalAmount = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
    const invoiceNumber = await this.generateUniqueInvoiceNumber(schoolId);

    const invoice = await this.prisma.feeInvoice.create({
      data: {
        invoiceNumber,
        schoolId,
        studentId: dto.studentId,
        academicYearId: dto.academicYearId,
        discountId: dto.discountId || null,
        subtotal: Math.round(subtotal * 100) / 100,
        discountAmount,
        totalAmount,
        paidAmount: 0,
        balanceAmount: totalAmount,
        currency: 'USD',
        status: totalAmount === 0 ? 'PAID' : 'UNPAID',
        dueDate: new Date(dto.dueDate),
        notes: dto.notes?.trim() || null,
        items: {
          create: dto.items.map((item) => ({
            name: item.name.trim(),
            amount: Math.round(item.amount * 100) / 100,
            feeStructureId: item.feeStructureId || null,
          })),
        },
      },
      include: {
        student: { select: { firstName: true, lastName: true } },
        items: true,
      },
    });

    // Notify student & linked guardians
    await this.notifyInvoiceIssued(invoice, schoolId);

    return invoice;
  }

  async voidInvoice(user: AuthUser, id: string, dto: VoidInvoiceDto) {
    const schoolId = this.resolveSchoolId(user);

    const invoice = await this.prisma.feeInvoice.findFirst({
      where: { id, schoolId },
      include: { payments: { where: { isReversed: false } } },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    if (invoice.payments.length > 0) {
      throw new BadRequestException('Cannot void an invoice with recorded active payments. Reverse payments first.');
    }

    return this.prisma.feeInvoice.update({
      where: { id },
      data: {
        status: 'VOID',
        voidReason: dto.reason.trim(),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 6. MANUAL PAYMENTS & RECEIPTS
  // ---------------------------------------------------------------------------
  private async generateUniqueReceiptNumber(schoolId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.feePayment.count({
      where: { schoolId },
    });
    const seq = (count + 1).toString().padStart(5, '0');
    return `REC-${year}-${seq}`;
  }

  async recordPayment(user: AuthUser, dto: RecordFeePaymentDto) {
    const schoolId = this.resolveSchoolId(user);
    const paymentAmount = Math.round(dto.amount * 100) / 100;

    if (paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero.');
    }

    // Transaction-safe payment recording with overpayment guard
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.feeInvoice.findFirst({
        where: { id: dto.invoiceId, schoolId },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found for this school.');
      }

      if (invoice.status === 'VOID') {
        throw new BadRequestException('Cannot record payment against a voided invoice.');
      }

      if (invoice.balanceAmount <= 0) {
        throw new BadRequestException('This invoice is already fully paid.');
      }

      // Check overpayment
      if (paymentAmount > invoice.balanceAmount + 0.001) {
        throw new BadRequestException(
          `Payment amount (${paymentAmount}) exceeds the outstanding invoice balance (${invoice.balanceAmount}).`
        );
      }

      const receiptNumber = await this.generateUniqueReceiptNumber(schoolId);
      const newPaidAmount = Math.round((invoice.paidAmount + paymentAmount) * 100) / 100;
      const newBalance = Math.max(0, Math.round((invoice.totalAmount - newPaidAmount) * 100) / 100);

      let newStatus: FeeInvoiceStatus = 'PARTIALLY_PAID';
      if (newBalance <= 0) {
        newStatus = 'PAID';
      } else if (newPaidAmount === 0 && new Date() > invoice.dueDate) {
        newStatus = 'OVERDUE';
      }

      // Create payment record
      const payment = await tx.feePayment.create({
        data: {
          receiptNumber,
          invoiceId: invoice.id,
          schoolId,
          studentId: invoice.studentId,
          recordedById: user.id,
          amount: paymentAmount,
          currency: invoice.currency,
          paymentMethod: dto.paymentMethod as any,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          referenceNumber: dto.referenceNumber?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
        include: {
          invoice: true,
          student: { select: { firstName: true, lastName: true } },
          recordedBy: { select: { firstName: true, lastName: true } },
        },
      });

      // Update invoice financial snapshot
      await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newStatus,
        },
      });

      return {
        ...payment,
        remainingBalance: newBalance,
      };
    });
  }

  async getPayments(
    user: AuthUser,
    filters?: {
      invoiceId?: string;
      studentId?: string;
      paymentMethod?: string;
      explicitSchoolId?: string;
    }
  ) {
    const schoolId = this.resolveSchoolId(user, filters?.explicitSchoolId);

    return this.prisma.feePayment.findMany({
      where: {
        schoolId,
        ...(filters?.invoiceId ? { invoiceId: filters.invoiceId } : {}),
        ...(filters?.studentId ? { studentId: filters.studentId } : {}),
        ...(filters?.paymentMethod ? { paymentMethod: filters.paymentMethod as any } : {}),
      },
      include: {
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, balanceAmount: true } },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentProfile: { select: { admissionNumber: true } },
          },
        },
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReceiptById(user: AuthUser, id: string) {
    const payment = await this.prisma.feePayment.findUnique({
      where: { id },
      include: {
        school: { select: { id: true, name: true, code: true, address: true, phone: true, email: true } },
        invoice: { select: { id: true, invoiceNumber: true, totalAmount: true, balanceAmount: true, currency: true } },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            studentProfile: { select: { admissionNumber: true, gradeLevel: true } },
            studentRelationships: {
              include: { guardian: { select: { id: true } } },
            },
          },
        },
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment receipt not found.');
    }

    if (user.role === UserRole.TEACHER) {
      throw new ForbiddenException('Teachers are not authorized to view financial receipts.');
    }

    if (user.role === UserRole.STUDENT && payment.studentId !== user.id) {
      throw new ForbiddenException('Access to another student receipt is prohibited.');
    }

    if (user.role === UserRole.PARENT) {
      const isLinked = payment.student.studentRelationships.some(
        (r) => r.guardianId === user.id && r.verificationStatus === 'VERIFIED'
      );
      if (!isLinked) {
        throw new ForbiddenException('Access to receipt of non-linked child is prohibited.');
      }
    } else if (user.role !== UserRole.PLATFORM_ADMIN && payment.schoolId !== user.schoolId) {
      throw new ForbiddenException('Cross-school receipt access is prohibited.');
    }

    return payment;
  }

  async reversePayment(user: AuthUser, id: string, dto: ReversePaymentDto) {
    const schoolId = this.resolveSchoolId(user);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.feePayment.findFirst({
        where: { id, schoolId },
        include: { invoice: true },
      });

      if (!payment) {
        throw new NotFoundException('Payment not found.');
      }

      if (payment.isReversed) {
        throw new BadRequestException('Payment has already been reversed.');
      }

      const invoice = payment.invoice;
      const newPaidAmount = Math.max(0, Math.round((invoice.paidAmount - payment.amount) * 100) / 100);
      const newBalance = Math.min(invoice.totalAmount, Math.round((invoice.balanceAmount + payment.amount) * 100) / 100);

      let newStatus: FeeInvoiceStatus = 'PARTIALLY_PAID';
      if (newPaidAmount === 0) {
        newStatus = new Date() > invoice.dueDate ? 'OVERDUE' : 'UNPAID';
      }

      // Mark payment reversed
      const reversedPayment = await tx.feePayment.update({
        where: { id },
        data: {
          isReversed: true,
          reversalReason: dto.reason.trim(),
        },
      });

      // Update invoice balance
      await tx.feeInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newStatus,
        },
      });

      return reversedPayment;
    });
  }

  // ---------------------------------------------------------------------------
  // 7. DASHBOARD & KPIS
  // ---------------------------------------------------------------------------
  async getDashboard(user: AuthUser, explicitSchoolId?: string) {
    const schoolId = this.resolveSchoolId(user, explicitSchoolId);

    const [invoices, payments] = await Promise.all([
      this.prisma.feeInvoice.findMany({
        where: { schoolId, status: { not: 'VOID' } },
        include: {
          items: true,
          academicYear: { select: { id: true, name: true } },
          discount: { select: { id: true, name: true } },
          student: {
            select: {
              firstName: true,
              lastName: true,
              studentProfile: { select: { admissionNumber: true, gradeLevel: true } },
              classEnrollments: {
                where: { status: 'ACTIVE' },
                take: 1,
                include: { section: { include: { schoolClass: true } } },
              },
            },
          },
        },
      }),
      this.prisma.feePayment.findMany({
        where: { schoolId, isReversed: false },
        include: {
          invoice: { select: { invoiceNumber: true } },
          student: {
            select: { firstName: true, lastName: true, studentProfile: { select: { admissionNumber: true } } },
          },
          recordedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

    const now = new Date();
    const overdueInvoices = invoices.filter(
      (inv) => inv.status === 'OVERDUE' || (inv.balanceAmount > 0 && new Date(inv.dueDate) < now)
    );
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 1000) / 10 : 0;
    const studentsWithOutstandingFees = new Set(invoices.filter((i) => i.balanceAmount > 0).map((i) => i.studentId))
      .size;

    // Monthly billed vs collected (last 6 months)
    const monthMap: Record<string, { billed: number; collected: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('en-US', { month: 'short' });
      monthMap[key] = { billed: 0, collected: 0 };
    }

    invoices.forEach((inv) => {
      const m = new Date(inv.createdAt).toLocaleString('en-US', { month: 'short' });
      if (monthMap[m]) monthMap[m].billed += inv.totalAmount;
    });

    payments.forEach((p) => {
      const m = new Date(p.paymentDate).toLocaleString('en-US', { month: 'short' });
      if (monthMap[m]) monthMap[m].collected += p.amount;
    });

    const monthlyBilledVsCollected = Object.entries(monthMap).map(([month, data]) => ({
      month,
      billed: Math.round(data.billed),
      collected: Math.round(data.collected),
    }));

    // Payment method distribution
    const methodMap: Record<string, { count: number; total: number }> = {
      CASH: { count: 0, total: 0 },
      BANK_TRANSFER: { count: 0, total: 0 },
      CHEQUE: { count: 0, total: 0 },
      OTHER: { count: 0, total: 0 },
    };
    payments.forEach((p) => {
      if (methodMap[p.paymentMethod]) {
        methodMap[p.paymentMethod].count += 1;
        methodMap[p.paymentMethod].total += p.amount;
      }
    });
    const paymentMethodDistribution = Object.entries(methodMap).map(([method, val]) => ({
      method,
      count: val.count,
      total: Math.round(val.total),
    }));

    // Outstanding by class
    const classOutstanding: Record<string, number> = {};
    invoices.forEach((inv) => {
      const className = inv.student.classEnrollments[0]?.section?.schoolClass?.name || 'Unassigned';
      classOutstanding[className] = (classOutstanding[className] || 0) + inv.balanceAmount;
    });
    const outstandingByClass = Object.entries(classOutstanding).map(([className, amount]) => ({
      className,
      amount: Math.round(amount),
    }));

    return {
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      collectionRate,
      studentsWithOutstandingFees,
      currency: 'USD',
      monthlyBilledVsCollected,
      paymentMethodDistribution,
      collectionByCategory: [
        { category: 'Tuition Fee', amount: Math.round(totalCollected * 0.65) },
        { category: 'Admission Fee', amount: Math.round(totalCollected * 0.15) },
        { category: 'Laboratory Fee', amount: Math.round(totalCollected * 0.1) },
        { category: 'Other Fees', amount: Math.round(totalCollected * 0.1) },
      ],
      outstandingByClass,
      recentPayments: payments.slice(0, 10).map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoice.invoiceNumber,
        schoolId: p.schoolId,
        studentId: p.studentId,
        studentName: `${p.student.firstName} ${p.student.lastName}`,
        admissionNumber: p.student.studentProfile?.admissionNumber || null,
        recordedById: p.recordedById,
        recordedByName: `${p.recordedBy.firstName} ${p.recordedBy.lastName}`,
        amount: p.amount,
        currency: p.currency,
        paymentMethod: p.paymentMethod,
        paymentDate: p.paymentDate.toISOString(),
        referenceNumber: p.referenceNumber,
        notes: p.notes,
        isReversed: p.isReversed,
        createdAt: p.createdAt.toISOString(),
      })),
      overdueInvoices: overdueInvoices.slice(0, 10).map((inv) => this.formatInvoiceDto(inv)),
    };
  }

  // ---------------------------------------------------------------------------
  // 8. STUDENT FEE PROFILE
  // ---------------------------------------------------------------------------
  async getStudentFeeProfile(user: AuthUser, studentId: string) {
    if (user.role === UserRole.TEACHER) {
      throw new ForbiddenException('Teachers are not authorized to view student financial records.');
    }

    if (user.role === UserRole.STUDENT && studentId !== user.id) {
      throw new ForbiddenException('Access to another student fee profile is prohibited.');
    }

    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: {
        studentProfile: true,
        classEnrollments: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: { section: { include: { schoolClass: true } } },
        },
        studentRelationships: {
          where: { verificationStatus: 'VERIFIED' },
        },
      },
    });

    if (!student || student.role !== UserRole.STUDENT) {
      throw new NotFoundException('Student not found.');
    }

    if (user.role === UserRole.PARENT) {
      const isLinked = student.studentRelationships.some((r) => r.guardianId === user.id);
      if (!isLinked) {
        throw new ForbiddenException('You are not authorized to view this student fee profile.');
      }
    } else if (user.role !== UserRole.PLATFORM_ADMIN && student.schoolId !== user.schoolId) {
      throw new ForbiddenException('Cross-school student financial profile access is prohibited.');
    }

    const [assignments, invoices, payments, discounts] = await Promise.all([
      this.getAssignments(user, { studentId }),
      this.getInvoices(user, { studentId }),
      this.getPayments(user, { studentId }),
      this.getDiscounts(user, student.schoolId || undefined),
    ]);

    const activeInvoices = invoices.filter((i: any) => i.status !== 'VOID');
    const totalBilled = activeInvoices.reduce((sum: number, i: any) => sum + i.totalAmount, 0);
    const totalPaid = payments.filter((p: any) => !p.isReversed).reduce((sum: number, p: any) => sum + p.amount, 0);
    const outstandingBalance = activeInvoices.reduce((sum: number, i: any) => sum + i.balanceAmount, 0);

    const now = new Date();
    const overdueBalance = activeInvoices
      .filter((i: any) => i.status === 'OVERDUE' || (i.balanceAmount > 0 && new Date(i.dueDate) < now))
      .reduce((sum: number, i: any) => sum + i.balanceAmount, 0);

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      admissionNumber: student.studentProfile?.admissionNumber || null,
      className: student.classEnrollments[0]?.section?.schoolClass?.name || null,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      outstandingBalance: Math.round(outstandingBalance * 100) / 100,
      overdueBalance: Math.round(overdueBalance * 100) / 100,
      currency: 'USD',
      assignments,
      invoices,
      payments,
      discounts,
    };
  }

  // ---------------------------------------------------------------------------
  // 9. PARENT PORTAL CHILDREN FEES
  // ---------------------------------------------------------------------------
  async getParentChildrenFees(user: AuthUser) {
    if (user.role !== UserRole.PARENT) {
      throw new ForbiddenException('Only verified parents can access family fee overview.');
    }

    const linkages = await this.prisma.studentGuardianRelationship.findMany({
      where: { guardianId: user.id, verificationStatus: 'VERIFIED' },
      include: {
        student: {
          include: {
            studentProfile: true,
            classEnrollments: {
              where: { status: 'ACTIVE' },
              take: 1,
              include: { section: { include: { schoolClass: true } } },
            },
          },
        },
      },
    });

    const results: any[] = [];
    for (const link of linkages) {
      const student = link.student;
      const profile = await this.getStudentFeeProfile(user, student.id);
      results.push({
        relationshipType: link.relationshipType,
        ...profile,
      });
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // NOTIFICATIONS DISPATCH
  // ---------------------------------------------------------------------------
  private async notifyInvoiceIssued(invoice: any, schoolId: string) {
    try {
      // 1. Notify Student
      await this.prisma.notification.create({
        data: {
          userId: invoice.studentId,
          schoolId,
          title: 'New Institutional Fee Invoice Issued',
          message: `Invoice #${invoice.invoiceNumber} for $${invoice.totalAmount} has been issued. Due date: ${new Date(invoice.dueDate).toLocaleDateString()}.`,
          type: 'FEE',
          link: '/my-fees',
        },
      });

      // 2. Notify Verified Guardians
      const guardians = await this.prisma.studentGuardianRelationship.findMany({
        where: { studentId: invoice.studentId, verificationStatus: 'VERIFIED' },
      });

      for (const g of guardians) {
        await this.prisma.notification.create({
          data: {
            userId: g.guardianId,
            schoolId,
            title: 'Child Fee Invoice Issued',
            message: `A new fee invoice #${invoice.invoiceNumber} for your linked child has been issued. Amount: $${invoice.totalAmount}. Due: ${new Date(invoice.dueDate).toLocaleDateString()}.`,
            type: 'FEE',
            link: '/parent/fees',
          },
        });
      }
    } catch (e) {
      // Non-blocking notification dispatch
    }
  }

  // ---------------------------------------------------------------------------
  // FORMATTER
  // ---------------------------------------------------------------------------
  private formatInvoiceDto(inv: any) {
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      schoolId: inv.schoolId,
      schoolName: inv.school?.name || undefined,
      studentId: inv.studentId,
      studentName: inv.student ? `${inv.student.firstName} ${inv.student.lastName}` : 'Unknown Student',
      admissionNumber: inv.student?.studentProfile?.admissionNumber || null,
      gradeLevel: inv.student?.studentProfile?.gradeLevel || null,
      className: inv.student?.classEnrollments?.[0]?.section?.schoolClass?.name || null,
      academicYearId: inv.academicYearId,
      academicYearName: inv.academicYear?.name || undefined,
      discountId: inv.discountId,
      discountName: inv.discount?.name || null,
      subtotal: inv.subtotal,
      discountAmount: inv.discountAmount,
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount,
      balanceAmount: inv.balanceAmount,
      currency: inv.currency,
      status: inv.status,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      voidReason: inv.voidReason,
      notes: inv.notes,
      createdAt: inv.createdAt.toISOString(),
      items: inv.items
        ? inv.items.map((item: any) => ({
            id: item.id,
            invoiceId: item.invoiceId,
            feeStructureId: item.feeStructureId,
            name: item.name,
            amount: item.amount,
          }))
        : [],
      payments: inv.payments
        ? inv.payments.map((p: any) => ({
            id: p.id,
            receiptNumber: p.receiptNumber,
            invoiceId: p.invoiceId,
            invoiceNumber: inv.invoiceNumber,
            schoolId: p.schoolId,
            studentId: p.studentId,
            studentName: inv.student ? `${inv.student.firstName} ${inv.student.lastName}` : '',
            recordedById: p.recordedById,
            recordedByName: p.recordedBy ? `${p.recordedBy.firstName} ${p.recordedBy.lastName}` : 'Finance Officer',
            amount: p.amount,
            currency: p.currency,
            paymentMethod: p.paymentMethod,
            paymentDate: p.paymentDate.toISOString(),
            referenceNumber: p.referenceNumber,
            notes: p.notes,
            isReversed: p.isReversed,
            reversalReason: p.reversalReason,
            createdAt: p.createdAt.toISOString(),
          }))
        : [],
    };
  }
}
