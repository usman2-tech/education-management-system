/**
 * MODULE: Authentication Module
 *
 * PURPOSE:
 * Central NestJS authentication and authorization module registering passport,
 * JWT strategy, RBAC roles guard, multi-tenant school isolation guard, and auth endpoints.
 *
 * DEPENDENCIES:
 * PassportModule, JwtModule, PrismaModule, ConfigModule
 *
 * SECURITY:
 * Exports guards for application-wide institutional security enforcement.
 */

import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SchoolIsolationGuard } from './guards/school-isolation.guard';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    SchoolIsolationGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    SchoolIsolationGuard,
    JwtModule,
  ],
})
export class AuthModule {}
