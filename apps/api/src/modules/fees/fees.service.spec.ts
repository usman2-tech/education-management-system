/**
 * MODULE: FeesService Unit Tests (TASK 021)
 *
 * PURPOSE:
 * Verifies core financial rules, tenant isolation, overpayment guards,
 * discount calculations, role permissions, and receipt integrity.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FeesService } from './fees.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@ems/contracts';

describe('FeesService', () => {
  let service: FeesService;
  let prisma: any;

  const schoolA = 'school-uuid-a';
  const schoolB = 'school-uuid-b';

  const schoolAdminA = {
    id: 'admin-uuid-a',
    email: 'admin.a@stjude.ems.local',
    role: UserRole.SCHOOL_ADMIN,
    schoolId: schoolA,
  };

  const teacherA = {
    id: 'teacher-uuid-a',
    email: 'teacher.a@stjude.ems.local',
    role: UserRole.TEACHER,
    schoolId: schoolA,
  };

  const studentA = {
    id: 'student-uuid-a',
    email: 'student.a@stjude.ems.local',
    role: UserRole.STUDENT,
    schoolId: schoolA,
  };

  const studentB = {
    id: 'student-uuid-b',
    email: 'student.b@stjude.ems.local',
    role: UserRole.STUDENT,
    schoolId: schoolA,
  };

  const parentA = {
    id: 'parent-uuid-a',
    email: 'parent.a@stjude.ems.local',
    role: UserRole.PARENT,
    schoolId: schoolA,
  };

  beforeEach(async () => {
    prisma = {
      feeCategory: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      feeStructure: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      academicYear: {
        findFirst: jest.fn(),
      },
      feeDiscount: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      studentFeeAssignment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      feeInvoice: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      feePayment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
      },
      classEnrollment: {
        findMany: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      studentGuardianRelationship: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<FeesService>(FeesService);
  });

  describe('1. Fee Category & Structure Management', () => {
    it('creates a fee category within school scope', async () => {
      prisma.feeCategory.findUnique.mockResolvedValue(null);
      prisma.feeCategory.create.mockResolvedValue({
        id: 'cat-1',
        schoolId: schoolA,
        name: 'Tuition Fee',
        code: 'TUIT',
        isTuition: true,
      });

      const result = await service.createCategory(schoolAdminA as any, {
        name: 'Tuition Fee',
        code: 'TUIT',
        isTuition: true,
      });

      expect(result.id).toBe('cat-1');
      expect(prisma.feeCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ schoolId: schoolA, name: 'Tuition Fee' }),
      });
    });

    it('rejects cross-school fee category creation', async () => {
      await expect(
        service.createCategory(schoolAdminA as any, {
          schoolId: schoolB,
          name: 'Invalid School Fee',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates a fee structure linked to school and academic year', async () => {
      prisma.academicYear.findFirst.mockResolvedValue({ id: 'ay-1', schoolId: schoolA });
      prisma.feeCategory.findFirst.mockResolvedValue({ id: 'cat-1', schoolId: schoolA });
      prisma.feeStructure.create.mockResolvedValue({
        id: 'struct-1',
        schoolId: schoolA,
        academicYearId: 'ay-1',
        categoryId: 'cat-1',
        name: 'Annual Tuition Grade 10',
        amount: 5000,
      });

      const result = await service.createStructure(schoolAdminA as any, {
        academicYearId: 'ay-1',
        categoryId: 'cat-1',
        name: 'Annual Tuition Grade 10',
        amount: 5000,
      });

      expect(result.id).toBe('struct-1');
      expect(prisma.feeStructure.create).toHaveBeenCalled();
    });
  });

  describe('2. Student Fee Assignment', () => {
    it('assigns fees to an individual enrolled student', async () => {
      prisma.feeStructure.findFirst.mockResolvedValue({
        id: 'struct-1',
        schoolId: schoolA,
        amount: 5000,
        name: 'Tuition',
        dueDateDays: 30,
      });
      prisma.studentFeeAssignment.findUnique.mockResolvedValue(null);
      prisma.studentFeeAssignment.create.mockResolvedValue({
        id: 'asgn-1',
        studentId: studentA.id,
        feeStructureId: 'struct-1',
      });

      const result = await service.assignFee(schoolAdminA as any, {
        studentId: studentA.id,
        academicYearId: 'ay-1',
        feeStructureId: 'struct-1',
      });

      expect(result.assignedCount).toBe(1);
    });

    it('skips duplicate fee assignments for same student and year', async () => {
      prisma.feeStructure.findFirst.mockResolvedValue({
        id: 'struct-1',
        schoolId: schoolA,
        amount: 5000,
      });
      prisma.studentFeeAssignment.findUnique.mockResolvedValue({ id: 'existing-asgn' });

      const result = await service.assignFee(schoolAdminA as any, {
        studentId: studentA.id,
        academicYearId: 'ay-1',
        feeStructureId: 'struct-1',
      });

      expect(result.assignedCount).toBe(0);
      expect(prisma.studentFeeAssignment.create).not.toHaveBeenCalled();
    });
  });

  describe('3. Invoices & Exact Financial Calculations', () => {
    it('calculates invoice subtotal, discount, and balance correctly', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: studentA.id, schoolId: schoolA, role: UserRole.STUDENT });
      prisma.feeDiscount.findFirst.mockResolvedValue({
        id: 'disc-1',
        type: 'PERCENTAGE',
        value: 20, // 20% discount
      });
      prisma.feeInvoice.count.mockResolvedValue(0);
      prisma.feeInvoice.create.mockImplementation(({ data }: any) => ({
        id: 'inv-1',
        ...data,
      }));

      const result = await service.createInvoice(schoolAdminA as any, {
        studentId: studentA.id,
        academicYearId: 'ay-1',
        discountId: 'disc-1',
        dueDate: '2026-11-30T00:00:00.000Z',
        items: [
          { name: 'Tuition', amount: 4000 },
          { name: 'Laboratory', amount: 500 },
        ],
      });

      // Subtotal = 4500, 20% discount = 900, Total = 3600
      expect(result.subtotal).toBe(4500);
      expect(result.discountAmount).toBe(900);
      expect(result.totalAmount).toBe(3600);
      expect(result.balanceAmount).toBe(3600);
      expect(result.status).toBe('UNPAID');
    });
  });

  describe('4. Payments & Overpayment Guard', () => {
    it('records partial payment and updates invoice status to PARTIALLY_PAID', async () => {
      const mockInvoice = {
        id: 'inv-1',
        schoolId: schoolA,
        studentId: studentA.id,
        subtotal: 1000,
        totalAmount: 1000,
        paidAmount: 0,
        balanceAmount: 1000,
        currency: 'USD',
        status: 'UNPAID',
        dueDate: new Date('2026-12-31'),
      };

      prisma.feeInvoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.feePayment.count.mockResolvedValue(0);
      prisma.feePayment.create.mockResolvedValue({
        id: 'pay-1',
        receiptNumber: 'REC-2026-00001',
        amount: 400,
      });

      const result = await service.recordPayment(schoolAdminA as any, {
        invoiceId: 'inv-1',
        amount: 400,
        paymentMethod: 'CASH',
      });

      expect(prisma.feeInvoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          paidAmount: 400,
          balanceAmount: 600,
          status: 'PARTIALLY_PAID',
        },
      });
      expect(result.remainingBalance).toBe(600);
    });

    it('records full payment and updates invoice status to PAID', async () => {
      const mockInvoice = {
        id: 'inv-2',
        schoolId: schoolA,
        studentId: studentA.id,
        totalAmount: 1000,
        paidAmount: 400,
        balanceAmount: 600,
        currency: 'USD',
        status: 'PARTIALLY_PAID',
        dueDate: new Date('2026-12-31'),
      };

      prisma.feeInvoice.findFirst.mockResolvedValue(mockInvoice);
      prisma.feePayment.count.mockResolvedValue(1);
      prisma.feePayment.create.mockResolvedValue({
        id: 'pay-2',
        receiptNumber: 'REC-2026-00002',
        amount: 600,
      });

      const result = await service.recordPayment(schoolAdminA as any, {
        invoiceId: 'inv-2',
        amount: 600,
        paymentMethod: 'BANK_TRANSFER',
      });

      expect(prisma.feeInvoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-2' },
        data: {
          paidAmount: 1000,
          balanceAmount: 0,
          status: 'PAID',
        },
      });
      expect(result.remainingBalance).toBe(0);
    });

    it('rejects overpayment exceeding invoice outstanding balance', async () => {
      const mockInvoice = {
        id: 'inv-3',
        schoolId: schoolA,
        studentId: studentA.id,
        totalAmount: 500,
        paidAmount: 0,
        balanceAmount: 500,
        currency: 'USD',
        status: 'UNPAID',
      };

      prisma.feeInvoice.findFirst.mockResolvedValue(mockInvoice);

      await expect(
        service.recordPayment(schoolAdminA as any, {
          invoiceId: 'inv-3',
          amount: 600, // exceeds 500
          paymentMethod: 'CASH',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('preserves audit history and restores balance when reversing payment', async () => {
      const mockInvoice = {
        id: 'inv-1',
        totalAmount: 1000,
        paidAmount: 1000,
        balanceAmount: 0,
        status: 'PAID',
        dueDate: new Date('2026-12-31'),
      };

      const mockPayment = {
        id: 'pay-1',
        invoiceId: 'inv-1',
        schoolId: schoolA,
        amount: 500,
        isReversed: false,
        invoice: mockInvoice,
      };

      prisma.feePayment.findFirst.mockResolvedValue(mockPayment);
      prisma.feePayment.update.mockResolvedValue({ ...mockPayment, isReversed: true, reversalReason: 'Cheque bounced' });

      await service.reversePayment(schoolAdminA as any, 'pay-1', {
        reason: 'Cheque bounced',
      });

      expect(prisma.feePayment.update).toHaveBeenCalledWith({
        where: { id: 'pay-1' },
        data: { isReversed: true, reversalReason: 'Cheque bounced' },
      });

      expect(prisma.feeInvoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: {
          paidAmount: 500,
          balanceAmount: 500,
          status: 'PARTIALLY_PAID',
        },
      });
    });
  });

  describe('5. Role Permissions & Privacy Guard', () => {
    it('blocks teachers from accessing student financial profiles', async () => {
      await expect(service.getStudentFeeProfile(teacherA as any, studentA.id)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('blocks students from accessing other students financial profiles', async () => {
      await expect(service.getStudentFeeProfile(studentA as any, studentB.id)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('blocks parents from accessing non-linked students financial profiles', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: studentB.id,
        role: UserRole.STUDENT,
        schoolId: schoolA,
        studentRelationships: [], // not linked to parentA
      });

      await expect(service.getStudentFeeProfile(parentA as any, studentB.id)).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});
