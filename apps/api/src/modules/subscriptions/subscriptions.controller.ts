/**
 * MODULE: Subscription Management - REST Controller
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  AssignSchoolSubscriptionDto,
  UpdateSchoolSubscriptionDto,
} from './dto/subscriptions.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('plans')
  @Roles(UserRole.PLATFORM_ADMIN)
  createPlan(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSubscriptionPlanDto,
  ) {
    return this.subscriptionsService.createPlan(user as any, dto);
  }

  @Get('plans')
  getPlans(@Query('includeInactive') includeInactive?: string) {
    return this.subscriptionsService.getPlans(includeInactive === 'true');
  }

  @Get('plans/:id')
  getPlanById(@Param('id') id: string) {
    return this.subscriptionsService.getPlanById(id);
  }

  @Patch('plans/:id')
  @Roles(UserRole.PLATFORM_ADMIN)
  updatePlan(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSubscriptionPlanDto,
  ) {
    return this.subscriptionsService.updatePlan(user as any, id, dto);
  }

  @Post('assign')
  @Roles(UserRole.PLATFORM_ADMIN)
  assignSubscription(
    @CurrentUser() user: AuthUser,
    @Body() dto: AssignSchoolSubscriptionDto,
  ) {
    return this.subscriptionsService.assignSchoolSubscription(user as any, dto);
  }

  @Get('overview')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  getOverview(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.getSubscriptionOverview(user as any);
  }

  @Get('schools')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  getSchoolSubscriptions(
    @CurrentUser() user: AuthUser,
    @Query('schoolId') schoolId?: string,
  ) {
    return this.subscriptionsService.getSchoolSubscriptions(user as any, schoolId);
  }

  @Get('schools/:schoolId')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  getSpecificSchoolSubscriptions(
    @CurrentUser() user: AuthUser,
    @Param('schoolId') schoolId: string,
  ) {
    return this.subscriptionsService.getSchoolSubscriptions(user as any, schoolId);
  }

  @Patch(':id/status')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSchoolSubscriptionDto,
  ) {
    return this.subscriptionsService.updateSubscriptionStatus(user as any, id, dto);
  }

  @Post(':id/renew')
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN)
  renewSubscription(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.subscriptionsService.renewSubscription(user as any, id);
  }

  @Get('entitlements/:schoolId')
  getEntitlements(@Param('schoolId') schoolId: string) {
    return this.subscriptionsService.getSchoolEntitlements(schoolId);
  }
}
