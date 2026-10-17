/**
 * MODULE: Attendance Management - Module
 *
 * PURPOSE:
 * Registers AttendanceService and AttendanceController in NestJS.
 *
 * DEPENDENCIES:
 * PrismaModule
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
