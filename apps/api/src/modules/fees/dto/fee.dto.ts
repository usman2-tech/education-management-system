/**
 * MODULE: Student Fee Management DTOs
 *
 * PURPOSE:
 * Type validation and request contracts for Fee structures, assignments,
 * invoices, manual payments, and discounts.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  FeeFrequency,
  FeePaymentMethod,
  DiscountType,
} from '@ems/contracts';

export class CreateFeeCategoryDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isTuition?: boolean;
}

export class CreateFeeStructureDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsNotEmpty()
  @IsString()
  academicYearId!: string;

  @IsNotEmpty()
  @IsString()
  categoryId!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  frequency?: FeeFrequency;

  @IsOptional()
  @IsNumber()
  @Min(1)
  dueDateDays?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateFeeDiscountDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsString()
  type!: DiscountType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignStudentFeeDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  classSectionId?: string;

  @IsNotEmpty()
  @IsString()
  academicYearId!: string;

  @IsNotEmpty()
  @IsString()
  feeStructureId!: string;

  @IsOptional()
  @IsString()
  discountId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  generateInvoice?: boolean;
}

export class InvoiceItemInputDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  feeStructureId?: string;
}

export class CreateFeeInvoiceDto {
  @IsOptional()
  @IsString()
  schoolId?: string;

  @IsNotEmpty()
  @IsString()
  studentId!: string;

  @IsNotEmpty()
  @IsString()
  academicYearId!: string;

  @IsOptional()
  @IsString()
  discountId?: string;

  @IsNotEmpty()
  @IsString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemInputDto)
  items!: InvoiceItemInputDto[];
}

export class RecordFeePaymentDto {
  @IsNotEmpty()
  @IsString()
  invoiceId!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsNotEmpty()
  @IsString()
  paymentMethod!: FeePaymentMethod;

  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  paymentDate?: string;
}

export class VoidInvoiceDto {
  @IsNotEmpty()
  @IsString()
  reason!: string;
}

export class ReversePaymentDto {
  @IsNotEmpty()
  @IsString()
  reason!: string;
}
