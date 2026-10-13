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
import { TeachersModule } from './modules/teachers/teachers.module';
import { ParentsModule } from './modules/parents/parents.module';
import { ClassesModule } from './modules/classes/classes.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { GradesModule } from './modules/grades/grades.module';
import { HomeworkModule } from './modules/homework/homework.module';

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
    TeachersModule,
    ParentsModule,
    ClassesModule,
    AttendanceModule,
    GradesModule,
    HomeworkModule,
  ],
})
export class AppModule {}
