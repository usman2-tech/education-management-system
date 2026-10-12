/**
 * MODULE: School Management Module
 *
 * PURPOSE:
 * NestJS feature module encapsulating Multi-School management services,
 * authorization guards, controllers, and audit logging.
 *
 * DEPENDENCIES:
 * PrismaModule, AuthModule
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [SchoolsService],
})
export class SchoolsModule {}
