/**
 * MODULE: Subscription Codes & Redemption - DTOs
 */

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class GenerateSubscriptionCodesDto {
  @IsUUID()
  @IsNotEmpty()
  planId!: string;

  @IsNumber()
  @Min(1)
  @Max(500)
  count!: number;

  @IsString()
  @IsOptional()
  prefix?: string;

  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  maxRedemptions?: number;

  @IsDateString()
  @IsNotEmpty()
  expiresAt!: string;
}

export class RedeemSubscriptionCodeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsUUID()
  @IsOptional()
  schoolId?: string;
}

export class SubscriptionCodeFilterDto {
  @IsUUID()
  @IsOptional()
  planId?: string;

  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsBoolean()
  @IsOptional()
  isRevoked?: boolean;

  @IsString()
  @IsOptional()
  search?: string;
}
