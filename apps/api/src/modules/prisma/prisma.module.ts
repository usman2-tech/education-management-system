/**
 * MODULE: Prisma Database Module
 *
 * PURPOSE:
 * Global NestJS module providing PrismaService across all business domain modules.
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
