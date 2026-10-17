import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';
import {
  BookCondition,
  BookCopyStatus,
} from '@prisma/client';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsString()
  @IsNotEmpty()
  author!: string;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  edition?: string;

  @IsOptional()
  @IsNumber()
  publicationYear?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;
}

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  isbn?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  edition?: string;

  @IsOptional()
  @IsNumber()
  publicationYear?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

export class CreateBookCopyDto {
  @IsString()
  @IsNotEmpty()
  bookId!: string;

  @IsString()
  @IsNotEmpty()
  accessionNumber!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  shelfLocation?: string;

  @IsOptional()
  @IsString()
  acquisitionDate?: string;

  @IsOptional()
  @IsEnum(BookCondition)
  condition?: BookCondition;
}

export class UpdateBookCopyDto {
  @IsOptional()
  @IsString()
  shelfLocation?: string;

  @IsOptional()
  @IsEnum(BookCondition)
  condition?: BookCondition;

  @IsOptional()
  @IsEnum(BookCopyStatus)
  status?: BookCopyStatus;
}

export class IssueBookDto {
  @IsOptional()
  @IsString()
  bookId?: string;

  @IsString()
  @IsNotEmpty()
  copyId!: string;

  @IsString()
  @IsNotEmpty()
  borrowerId!: string;

  @IsOptional()
  @IsString()
  borrowerType?: 'STUDENT' | 'TEACHER';

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnBookDto {
  @IsString()
  @IsNotEmpty()
  loanId!: string;

  @IsOptional()
  @IsEnum(BookCondition)
  returnCondition?: BookCondition;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RenewLoanDto {
  @IsString()
  @IsNotEmpty()
  loanId!: string;

  @IsOptional()
  @IsString()
  newDueDate?: string;
}

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  bookId!: string;
}

export class WaiveFineDto {
  @IsString()
  @IsNotEmpty()
  fineId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  waiveAmount?: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class UpdatePolicyDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxBooks?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  loanPeriodDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  renewalLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  finePerDay?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gracePeriodDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxFineAmount?: number;
}
