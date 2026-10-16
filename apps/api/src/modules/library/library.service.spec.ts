import { Test, TestingModule } from '@nestjs/testing';
import { LibraryService } from './library.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@ems/contracts';

describe('LibraryService', () => {
  let service: LibraryService;

  const mockPrisma = {
    libraryBook: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    bookCopy: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    bookLoan: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    bookReservation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    libraryFine: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    libraryPolicy: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    studentGuardianRelationship: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<LibraryService>(LibraryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Catalog & Accession Number Isolation', () => {
    it('should reject duplicate copy accession numbers in the same school', async () => {
      const user: any = {
        id: 'usr-admin-1',
        role: UserRole.SCHOOL_ADMIN,
        schoolId: 'school-100',
      };

      mockPrisma.libraryBook.findFirst.mockResolvedValueOnce({ id: 'b-1' });
      mockPrisma.bookCopy.findFirst.mockResolvedValueOnce({
        id: 'c-1',
        accessionNumber: 'ACC-001',
      });

      await expect(
        service.createCopy(
          {
            bookId: 'b-1',
            accessionNumber: 'ACC-001',
          },
          user
        )
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Borrowing & Issue Verification', () => {
    it('should reject loan issue if copy is not available', async () => {
      const user: any = {
        id: 'usr-admin-1',
        role: UserRole.SCHOOL_ADMIN,
        schoolId: 'school-100',
      };

      mockPrisma.bookCopy.findFirst.mockResolvedValueOnce({
        id: 'c-1',
        status: 'ISSUED', // already checked out!
      });

      await expect(
        service.issueBook(
          {
            copyId: 'c-1',
            borrowerId: 'stud-1',
          },
          user
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Parent Scoping', () => {
    it('should reject parent access if student is not linked to guardian', async () => {
      const user: any = {
        id: 'usr-parent-1',
        role: UserRole.PARENT,
        schoolId: 'school-100',
      };

      mockPrisma.studentGuardianRelationship.findFirst.mockResolvedValueOnce(null);

      await expect(
        service.getParentChildLibrary('unlinked-student-id', user)
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
