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
import { AiController } from './ai.controller';
import { AiInternalController } from './ai-internal.controller';
import { AiService } from './ai.service';
import { AiToolsService } from './ai-tools.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiController, AiInternalController],
  providers: [AiService, AiToolsService],
  exports: [AiService, AiToolsService],
})
export class AiModule {}
