/**
 * MODULE: Subscription Codes & Redemption - REST Controller
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionCodesService } from './subscription-codes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  GenerateSubscriptionCodesDto,
  RedeemSubscriptionCodeDto,
  SubscriptionCodeFilterDto,
} from './dto/subscription-codes.dto';

@Controller('subscription-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionCodesController {
  constructor(private readonly codesService: SubscriptionCodesService) {}

  @Post('generate')
  @Roles(UserRole.PLATFORM_ADMIN)
  generate(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateSubscriptionCodesDto,
  ) {
    return this.codesService.generateCodes(user as any, dto);
  }

  @Get()
  @Roles(UserRole.PLATFORM_ADMIN)
  findAll(
    @CurrentUser() user: AuthUser,
    @Query() query: SubscriptionCodeFilterDto,
  ) {
    return this.codesService.getCodes(user as any, query);
  }

  @Post(':id/revoke')
  @Roles(UserRole.PLATFORM_ADMIN)
  revoke(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.codesService.revokeCode(user as any, id);
  }

  @Get('redemptions')
  @Roles(UserRole.PLATFORM_ADMIN)
  getRedemptions(
    @CurrentUser() user: AuthUser,
    @Query('codeId') codeId?: string,
  ) {
    return this.codesService.getRedemptions(user as any, codeId);
  }

  @Post('redeem')
  redeem(
    @CurrentUser() user: AuthUser,
    @Body() dto: RedeemSubscriptionCodeDto,
  ) {
    return this.codesService.redeemCode(user as any, dto);
  }

  @Get('my-redemptions')
  getMyRedemptions(@CurrentUser() user: AuthUser) {
    return this.codesService.getMyRedemptions(user as any);
  }
}
