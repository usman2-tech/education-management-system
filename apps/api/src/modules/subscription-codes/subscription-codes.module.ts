/**
 * MODULE: Subscription Codes & Redemption - NestJS Module
 */

import { Module } from '@nestjs/common';
import { SubscriptionCodesController } from './subscription-codes.controller';
import { SubscriptionCodesService } from './subscription-codes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubscriptionCodesController],
  providers: [SubscriptionCodesService],
  exports: [SubscriptionCodesService],
})
export class SubscriptionCodesModule {}
