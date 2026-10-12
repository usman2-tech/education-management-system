/**
 * MODULE: System Health & Observability Service
 *
 * PURPOSE:
 * Checks availability and latency across core dependencies:
 * - PostgreSQL Database (via Prisma)
 * - Redis Cache (via TCP ping)
 * - AI Microservice (via HTTP health check)
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SystemHealthResponse } from '@ems/contracts';
import { config } from '../../config/env.config';
import * as net from 'net';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async getHealthStatus(): Promise<SystemHealthResponse> {
    this.logger.log('Executing comprehensive system health evaluation.');
    const dbHealth = await this.prisma.checkHealth();
    const redisHealth = await this.checkRedisHealth(config.redisHost, config.redisPort);
    const aiHealth = await this.checkAiServiceHealth(config.aiServiceUrl);

    let status: 'ok' | 'degraded' | 'error' = 'ok';
    if (dbHealth.status === 'down') {
      status = 'error';
    } else if (redisHealth.status === 'down' || aiHealth.status === 'down') {
      status = 'degraded';
    }

    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status,
      service: 'Educational Management System API',
      version: '0.1.0',
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      services: {
        database: dbHealth,
        redis: redisHealth,
        aiService: aiHealth,
      },
    };
  }

  private async checkRedisHealth(
    host: string,
    port: number,
  ): Promise<{ status: 'up' | 'down'; latencyMs?: number; message?: string }> {
    const start = Date.now();
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);

      socket.connect(port, host, () => {
        const latencyMs = Date.now() - start;
        socket.destroy();
        resolve({ status: 'up', latencyMs });
      });

      socket.on('error', (err) => {
        socket.destroy();
        resolve({ status: 'down', message: err.message });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ status: 'down', message: 'Connection timed out' });
      });
    });
  }

  private async checkAiServiceHealth(
    baseUrl: string,
  ): Promise<{ status: 'up' | 'down'; latencyMs?: number; url?: string }> {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        return {
          status: 'up',
          latencyMs: Date.now() - start,
          url: baseUrl,
        };
      }
      return { status: 'down', url: baseUrl };
    } catch {
      return { status: 'down', url: baseUrl };
    }
  }
}
