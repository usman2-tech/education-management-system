/**
 * MODULE: Prisma ORM Persistence Service
 *
 * PURPOSE:
 * Manages database connection pool, lifecycle hooks, and transactional queries
 * using Prisma ORM with PostgreSQL.
 *
 * SECURITY:
 * Central access point for all database interactions.
 */

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error', 'warn'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('PostgreSQL database connection successfully established.');
    } catch (error) {
      this.logger.error(
        `Failed to connect to PostgreSQL database: ${(error as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('PostgreSQL connection pool successfully disconnected.');
  }

  async checkHealth(): Promise<{ status: 'up' | 'down'; latencyMs?: number; message?: string }> {
    const start = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      return { status: 'up', latencyMs };
    } catch (error) {
      return {
        status: 'down',
        message: (error as Error).message,
      };
    }
  }
}
