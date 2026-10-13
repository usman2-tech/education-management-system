/**
 * MODULE: Classes & Timetables - Classes Module
 *
 * PURPOSE:
 * Encapsulates academic structure services and timetable controllers.
 *
 * DEPENDENCIES:
 * PrismaModule, ClassesService, ClassesController
 */

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
