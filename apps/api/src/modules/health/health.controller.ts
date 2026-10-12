/**
 * MODULE: System Health Controller
 *
 * PURPOSE:
 * Exposes the /health status endpoint with OpenAPI/Swagger documentation.
 */

import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { ApiSuccessResponse, SystemHealthResponse } from '@ems/contracts';

@ApiTags('System')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'System Health & Component Status Check',
    description:
      'Returns the real-time operational status of the core API, PostgreSQL database, Redis cache, and AI microservice.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'System health report retrieved successfully',
  })
  async check(): Promise<ApiSuccessResponse<SystemHealthResponse>> {
    const data = await this.healthService.getHealthStatus();
    return {
      success: true,
      statusCode: HttpStatus.OK,
      message: 'System operational status verified',
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
