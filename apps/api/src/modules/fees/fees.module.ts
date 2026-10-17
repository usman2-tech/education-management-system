/**
 * MODULE: Institutional Student Fee Management Module
 *
 * PURPOSE:
 * Registers FeesController and FeesService within the NestJS dependency container.
 *
 * DEPENDENCIES:
 * PrismaModule
 *
 * SECURITY:
 * Scoped under JwtAuthGuard and RolesGuard.
 */

import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FeesController],
  providers: [FeesService],
  exports: [FeesService],
})
export class FeesModule {}
