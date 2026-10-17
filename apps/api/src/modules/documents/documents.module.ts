/**
 * MODULE: Institutional Document Intelligence Module (TASK 026)
 *
 * PURPOSE:
 * Encapsulates institutional document cataloging, versioning, full-text section
 * chunking, role-scoped search, grounded summarization, notice drafting, and
 * approval-to-broadcast workflow with TASK 030.
 *
 * DEPENDENCIES:
 * PrismaModule, CommunicationsModule.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommunicationsModule } from '../communications/communications.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [PrismaModule, CommunicationsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
