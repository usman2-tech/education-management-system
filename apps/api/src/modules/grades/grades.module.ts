/**
 * MODULE: Institutional Grades & Academic Performance Module
 *
 * PURPOSE:
 * Registers GradesController and GradesService within the NestJS dependency injection container.
 *
 * DEPENDENCIES:
 * PrismaModule
 *
 * SECURITY:
 * Scoped under JwtAuthGuard and RolesGuard.
 */

import { Module } from '@nestjs/common';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GradesController],
  providers: [GradesService],
  exports: [GradesService],
})
export class GradesModule {}
