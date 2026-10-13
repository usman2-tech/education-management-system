/**
 * MODULE: Parent Management - DTOs
 *
 * PURPOSE:
 * Inbound validation objects for parent registration, updates, student linking, and verification.
 *
 * DEPENDENCIES:
 * class-validator, class-transformer, @nestjs/swagger, @ems/contracts
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import {
  GuardianRelationshipType,
  RelationshipVerificationStatus,
  CreateParentRequest,
  UpdateParentRequest,
  LinkStudentRequest,
  VerifyRelationshipRequest,
  ParentListQuery,
} from '@ems/contracts';

export class CreateParentDto implements CreateParentRequest {
  @ApiProperty({ description: 'Parent contact email' })
  @IsEmail({}, { message: 'A valid email is required.' })
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ description: 'Optional initial password' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiProperty({ description: 'First name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  firstName!: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  lastName!: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'School UUID' })
  @IsOptional()
  @IsUUID('4')
  schoolId?: string;

  @ApiPropertyOptional({ description: 'Occupation' })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional({ description: 'Employer' })
  @IsOptional()
  @IsString()
  employer?: string;

  @ApiPropertyOptional({ description: 'Relationship role to family' })
  @IsOptional()
  @IsString()
  relationshipToFamily?: string;

  @ApiPropertyOptional({ description: 'Alternate phone' })
  @IsOptional()
  @IsString()
  phoneAlt?: string;

  @ApiPropertyOptional({ description: 'Residential street address' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateParentDto implements UpdateParentRequest {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  relationshipToFamily?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneAlt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

export class LinkStudentDto implements LinkStudentRequest {
  @ApiProperty({ description: 'Student User UUID to link' })
  @IsUUID('4', { message: 'A valid student UUID is required.' })
  @IsNotEmpty()
  studentId!: string;

  @ApiProperty({ enum: GuardianRelationshipType })
  @IsEnum(GuardianRelationshipType)
  relationshipType!: GuardianRelationshipType;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimaryContact?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEmergencyContact?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class VerifyRelationshipDto implements VerifyRelationshipRequest {
  @ApiProperty({ enum: RelationshipVerificationStatus })
  @IsEnum(RelationshipVerificationStatus)
  verificationStatus!: RelationshipVerificationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ParentQueryDto implements ParentListQuery {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  schoolId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
