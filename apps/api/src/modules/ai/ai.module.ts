/**
 * MODULE: Institutional AI Assistant Module
 *
 * PURPOSE:
 * Encapsulates the conversational AI service, internal tools executor,
 * and authenticated client endpoints.
 *
 * DEPENDENCIES:
 * PrismaModule, ConfigModule.
 *
 * SECURITY:
 * Integrates directly with global authentication and internal shared secret validation.
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsModule } from '../documents/documents.module';
import { AiController } from './ai.controller';
import { AiInternalController } from './ai-internal.controller';
import { AiCopilotController } from './ai-copilot.controller';
import { AiTutorController } from './ai-tutor.controller';
import { AiParentController } from './ai-parent.controller';
import { AiService } from './ai.service';
import { AiToolsService } from './ai-tools.service';
import { AiCopilotService } from './ai-copilot.service';
import { AiTutorService } from './ai-tutor.service';
import { AiParentService } from './ai-parent.service';

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [
    AiController,
    AiInternalController,
    AiCopilotController,
    AiTutorController,
    AiParentController,
  ],
  providers: [
    AiService,
    AiToolsService,
    AiCopilotService,
    AiTutorService,
    AiParentService,
  ],
  exports: [
    AiService,
    AiToolsService,
    AiCopilotService,
    AiTutorService,
    AiParentService,
  ],
})
export class AiModule {}

