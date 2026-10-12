/**
 * MODULE: Root Application Module
 *
 * PURPOSE:
 * Top-level NestJS module aggregating all core and feature domains.
 *
 * DEPENDENCIES:
 * ConfigModule, PrismaModule, HealthModule.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { SchoolsModule } from './modules/schools/schools.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    SchoolsModule,
  ],
})
export class AppModule {}
