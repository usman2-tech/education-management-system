/**
 * MODULE: Internal AI Tools Controller
 *
 * PURPOSE:
 * Secure internal service-to-service endpoint allowing the FastAPI AI Microservice
 * to query scoped, read-only EMS tools on behalf of verified user sessions.
 *
 * SECURITY:
 * Authorized strictly by shared internal secret (INTERNAL_SERVICE_SECRET).
 * Direct browser access is forbidden.
 */

import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiExcludeController } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { AiToolsService } from './ai-tools.service';
import { ExecuteAIToolDto } from './dto/ai-tool-query.dto';

@ApiExcludeController()
@ApiTags('Internal AI Tools')
@Controller('ai/internal')
export class AiInternalController {
  constructor(
    private readonly aiToolsService: AiToolsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Constant-time string comparison to prevent side-channel timing attacks
   */
  private safeCompareSecrets(provided: string, expected: string): boolean {
    if (!provided || !expected) {
      return false;
    }
    const bufProvided = Buffer.from(provided);
    const bufExpected = Buffer.from(expected);
    if (bufProvided.length !== bufExpected.length) {
      return false;
    }
    return crypto.timingSafeEqual(bufProvided, bufExpected);
  }

  @Post('tools/:toolName')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async executeTool(
    @Param('toolName') toolName: string,
    @Headers('x-internal-secret') internalSecret: string,
    @Body() body: ExecuteAIToolDto,
  ) {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    const configuredSecret = this.configService.get<string>('INTERNAL_SERVICE_SECRET');

    // In production, reject any fallback, missing, or short secret immediately
    if (
      isProduction &&
      (!configuredSecret ||
        configuredSecret === 'dev_internal_secret_key_change_in_production' ||
        configuredSecret.trim().length < 16)
    ) {
      throw new UnauthorizedException(
        'Internal service authorization secret is insecurely configured or using development fallback.',
      );
    }

    const expectedSecret =
      configuredSecret || 'dev_internal_secret_key_change_in_production';

    if (!internalSecret || !this.safeCompareSecrets(internalSecret, expectedSecret)) {
      throw new UnauthorizedException('Invalid or missing internal service authorization secret.');
    }

    const principal = {
      userId: body.userId,
      role: body.role,
      schoolId: body.schoolId,
    };

    const result = await this.aiToolsService.executeTool(toolName, principal, body.args || {});
    if (!result.success && result.error) {
      const errLower = result.error.toLowerCase();
      if (
        errLower.includes('access denied') ||
        errLower.includes('do not have') ||
        errLower.includes('restricted') ||
        errLower.includes('unauthorized') ||
        errLower.includes('forbidden')
      ) {
        throw new ForbiddenException(result.error);
      }
    }

    return result;
  }
}
