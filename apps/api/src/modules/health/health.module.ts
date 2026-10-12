/**
 * MODULE: Health Module
 *
 * PURPOSE:
 * Encapsulates the health checking endpoints and services.
 */

import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
