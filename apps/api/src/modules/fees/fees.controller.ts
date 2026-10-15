/**
 * MODULE: Student Fee Management Controller
 *
 * PURPOSE:
 * Exposes versioned REST endpoints for fee structures, student fee assignments,
 * invoice issuance and management, manual offline payment collection, receipts,
 * discounts, and role-based parent/student access portals.
 *
 * DEPENDENCIES:
 * FeesService, JwtAuthGuard, RolesGuard, Roles, CurrentUser
 *
 * SECURITY:
 * Multi-tenant isolation enforced. Teachers forbidden from financial access.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FeesService } from './fees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';
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

@Controller('fees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  // ---------------------------------------------------------------------------
  // 1. DASHBOARD OVERVIEW & KPIS
  // ---------------------------------------------------------------------------
  @Get('dashboard')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async getDashboard(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.feesService.getDashboard(user, schoolId);
  }

  // ---------------------------------------------------------------------------
  // 2. FEE CATEGORIES
  // ---------------------------------------------------------------------------
  @Get('categories')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async getCategories(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.feesService.getCategories(user, schoolId);
  }

  @Post('categories')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createCategory(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFeeCategoryDto
  ) {
    return this.feesService.createCategory(user, dto);
  }

  // ---------------------------------------------------------------------------
  // 3. FEE STRUCTURES
  // ---------------------------------------------------------------------------
  @Get('structures')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async getStructures(
    @CurrentUser() user: AuthUser,
    @Query('academicYearId') academicYearId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('gradeLevel') gradeLevel?: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.feesService.getStructures(user, {
      academicYearId,
      categoryId,
      gradeLevel,
      explicitSchoolId: schoolId,
    });
  }

  @Post('structures')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createStructure(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFeeStructureDto
  ) {
    return this.feesService.createStructure(user, dto);
  }

  // ---------------------------------------------------------------------------
  // 4. DISCOUNTS & SCHOLARSHIPS
  // ---------------------------------------------------------------------------
  @Get('discounts')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async getDiscounts(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string
  ) {
    return this.feesService.getDiscounts(user, schoolId);
  }

  @Post('discounts')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createDiscount(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFeeDiscountDto
  ) {
    return this.feesService.createDiscount(user, dto);
  }

  // ---------------------------------------------------------------------------
  // 5. STUDENT FEE ASSIGNMENTS
  // ---------------------------------------------------------------------------
  @Get('assignments')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async getAssignments(
    @CurrentUser() user: AuthUser,
    @Query('studentId') studentId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('feeStructureId') feeStructureId?: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.feesService.getAssignments(user, {
      studentId,
      academicYearId,
      feeStructureId,
      explicitSchoolId: schoolId,
    });
  }

  @Post('assignments')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async assignFee(
    @CurrentUser() user: AuthUser,
    @Body() dto: AssignStudentFeeDto
  ) {
    return this.feesService.assignFee(user, dto);
  }

  // ---------------------------------------------------------------------------
  // 6. INVOICES
  // ---------------------------------------------------------------------------
  @Get('invoices')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async getInvoices(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('studentId') studentId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('search') search?: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.feesService.getInvoices(user, {
      status,
      studentId,
      academicYearId,
      search,
      explicitSchoolId: schoolId,
    });
  }

  @Get('invoices/:id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.PARENT
  )
  async getInvoiceById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string
  ) {
    return this.feesService.getInvoiceById(user, id);
  }

  @Post('invoices')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async createInvoice(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFeeInvoiceDto
  ) {
    return this.feesService.createInvoice(user, dto);
  }

  @Post('invoices/:id/void')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async voidInvoice(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: VoidInvoiceDto
  ) {
    return this.feesService.voidInvoice(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 7. MANUAL PAYMENTS & RECEIPTS
  // ---------------------------------------------------------------------------
  @Get('payments')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async getPayments(
    @CurrentUser() user: AuthUser,
    @Query('invoiceId') invoiceId?: string,
    @Query('studentId') studentId?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('schoolId') schoolId?: string
  ) {
    return this.feesService.getPayments(user, {
      invoiceId,
      studentId,
      paymentMethod,
      explicitSchoolId: schoolId,
    });
  }

  @Post('payments')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async recordPayment(
    @CurrentUser() user: AuthUser,
    @Body() dto: RecordFeePaymentDto
  ) {
    return this.feesService.recordPayment(user, dto);
  }

  @Get('payments/:id/receipt')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.PARENT
  )
  async getReceiptById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string
  ) {
    return this.feesService.getReceiptById(user, id);
  }

  @Post('payments/:id/reverse')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  async reversePayment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReversePaymentDto
  ) {
    return this.feesService.reversePayment(user, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 8. STUDENT FINANCIAL PROFILE (ADMIN / SELF / GUARDIAN)
  // ---------------------------------------------------------------------------
  @Get('student/:studentId')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.STUDENT,
    UserRole.PARENT
  )
  async getStudentFeeProfile(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string
  ) {
    return this.feesService.getStudentFeeProfile(user, studentId);
  }

  // ---------------------------------------------------------------------------
  // 9. STUDENT SELF-SERVICE
  // ---------------------------------------------------------------------------
  @Get('my-fees')
  @Roles(UserRole.STUDENT)
  async getMyFees(@CurrentUser() user: AuthUser) {
    return this.feesService.getStudentFeeProfile(user, user.id);
  }

  // ---------------------------------------------------------------------------
  // 10. PARENT FAMILY PORTAL
  // ---------------------------------------------------------------------------
  @Get('parent/children')
  @Roles(UserRole.PARENT)
  async getParentChildrenFees(@CurrentUser() user: AuthUser) {
    return this.feesService.getParentChildrenFees(user);
  }
}
