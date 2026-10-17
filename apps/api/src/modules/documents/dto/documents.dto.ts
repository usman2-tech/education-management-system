/**
 * MODULE: Institutional Document Intelligence DTOs
 *
 * PURPOSE:
 * Strongly-typed request/response data contracts for document management,
 * text chunking, version replacement, administrative notice drafting,
 * review workflows, and grounded question answering.
 *
 * SECURITY:
 * Strict validation with class-validator. Rejects unsupported file types and invalid roles.
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DocumentCategory,
  DocumentProcessingStatus,
  UserRole,
} from '@ems/contracts';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Institutional document title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ description: 'Detailed description of the document' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ enum: DocumentCategory, description: 'Institutional category' })
  @IsEnum(DocumentCategory)
  category!: DocumentCategory;

  @ApiProperty({ enum: ['PDF', 'DOCX', 'TXT'], default: 'TXT' })
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @ApiPropertyOptional({ description: 'Raw text content for TXT documents or extracted payload' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'Base64-encoded document file payload' })
  @IsOptional()
  @IsString()
  fileContentBase64?: string;

  @ApiPropertyOptional({ description: 'Original file name' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ description: 'File size in bytes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiPropertyOptional({
    enum: UserRole,
    isArray: true,
    description: 'User roles permitted to view this document',
  })
  @IsOptional()
  @IsArray()
  visibilityRoles?: UserRole[];

  @ApiPropertyOptional({ default: true, description: 'Publication status' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ description: 'Target school tenant ID (optional for platform-wide)' })
  @IsOptional()
  @IsString()
  schoolId?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Updated document title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ enum: UserRole, isArray: true })
  @IsOptional()
  @IsArray()
  visibilityRoles?: UserRole[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class ReplaceDocumentVersionDto {
  @ApiPropertyOptional({ description: 'Raw text content for new version' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ description: 'Base64-encoded file payload' })
  @IsOptional()
  @IsString()
  fileContentBase64?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;

  @ApiProperty({ description: 'Summary of modifications in this version' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  changeSummary!: string;
}

export class DocumentFilterDto {
  @ApiPropertyOptional({ enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPublished?: boolean;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  visibilityRole?: UserRole;

  @ApiPropertyOptional({ enum: DocumentProcessingStatus })
  @IsOptional()
  @IsEnum(DocumentProcessingStatus)
  status?: DocumentProcessingStatus;

  @ApiPropertyOptional({ description: 'Full-text or title search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class CreateDocumentDraftDto {
  @ApiPropertyOptional({ description: 'Optional linked source document ID' })
  @IsOptional()
  @IsString()
  sourceDocumentId?: string;

  @ApiProperty({ default: 'NOTICE', description: 'Category of administrative notice' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ default: 'ALL', description: 'Target audience role' })
  @IsString()
  @IsNotEmpty()
  targetRole!: string;

  @ApiPropertyOptional({ description: 'Optional class section targeting' })
  @IsOptional()
  @IsString()
  classSectionId?: string;

  @ApiProperty({ description: 'Subject line of notice' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ description: 'Body text of notice' })
  @IsString()
  @IsNotEmpty()
  body!: string;
}

export class UpdateDocumentDraftDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  targetRole?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classSectionId?: string;
}

export class ReviewDocumentDraftDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsString()
  @IsNotEmpty()
  decision!: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional({ description: 'Reason for rejection if decision is REJECT' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class PublishDocumentDraftDto {
  @ApiProperty({ default: true, description: 'Confirmation flag to broadcast through TASK 030' })
  @IsBoolean()
  confirmDispatch!: boolean;
}

export class DocumentSearchQueryDto {
  @ApiProperty({ description: 'Search term or policy question' })
  @IsString()
  @IsNotEmpty()
  query!: string;

  @ApiPropertyOptional({ enum: DocumentCategory })
  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @ApiPropertyOptional({ default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number = 5;
}

export class DocumentSummaryRequestDto {
  @ApiProperty({ description: 'Document ID to summarize' })
  @IsString()
  @IsNotEmpty()
  documentId!: string;

  @ApiPropertyOptional({
    enum: ['SHORT', 'DETAILED', 'KEY_POINTS', 'ACTION_ITEMS', 'STAFF', 'PARENT', 'STUDENT'],
    default: 'SHORT',
  })
  @IsOptional()
  @IsString()
  summaryType?: 'SHORT' | 'DETAILED' | 'KEY_POINTS' | 'ACTION_ITEMS' | 'STAFF' | 'PARENT' | 'STUDENT' = 'SHORT';
}

export class NarrativeReportRequestDto {
  @ApiProperty({
    enum: [
      'ATTENDANCE_SUMMARY',
      'FEE_COLLECTION',
      'ACADEMIC_PERFORMANCE',
      'TRANSPORT_OPERATIONS',
      'LIBRARY_CIRCULATION',
    ],
  })
  @IsString()
  @IsNotEmpty()
  reportType!:
    | 'ATTENDANCE_SUMMARY'
    | 'FEE_COLLECTION'
    | 'ACADEMIC_PERFORMANCE'
    | 'TRANSPORT_OPERATIONS'
    | 'LIBRARY_CIRCULATION';

  @ApiPropertyOptional({ description: 'Start date in YYYY-MM-DD format' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date in YYYY-MM-DD format' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'School ID for platform administrators' })
  @IsOptional()
  @IsString()
  schoolId?: string;
}
