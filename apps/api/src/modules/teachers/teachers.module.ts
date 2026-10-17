/**
 * MODULE: Teacher Management - Teachers Module
 *
 * PURPOSE:
 * Encapsulates teacher administration, profiles, school affiliations, and RBAC controllers.
 *
 * DEPENDENCIES:
 * PrismaModule, TeachersService, TeachersController
 */

import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
