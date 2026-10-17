/**
 * MODULE: AI Parent / Guardian Assistant Controller
 *
 * PURPOSE:
 * Exposes parent educational oversight endpoints: verified child directory, academic progress,
 * attendance analysis, homework briefings, read-only fee breakdowns, home-learning suggestions, and child-scoped Q&A.
 *
 * DEPENDENCIES:
 * AiParentService, JwtAuthGuard, RolesGuard, Roles, CurrentUser.
 *
 * SECURITY:
 * Requires JWT authentication. Permitted strictly for PARENT (and PLATFORM_ADMIN for administrative audits).
 * Every student access is validated against StudentGuardianRelationship (status = VERIFIED).
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiParentService } from './ai-parent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  ParentAskQuestionDto,
  ParentHomeLearningRequestDto,
} from './dto/ai-parent.dto';

@ApiTags('AI Parent Assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PARENT, UserRole.PLATFORM_ADMIN)
@Controller('ai/parent')
export class AiParentController {
  constructor(private readonly parentService: AiParentService) {}

  @Get('children')
  @ApiOperation({ summary: 'Retrieve verified linked children for the authenticated parent' })
  async getVerifiedChildren(@CurrentUser() user: AuthUser) {
    return this.parentService.getVerifiedChildren(user);
  }

  @Get('academic-summary/:studentId')
  @ApiOperation({ summary: 'Get synthesized academic progress summary from verified records' })
  async getChildAcademicSummary(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
  ) {
    return this.parentService.getChildAcademicSummary(studentId, user);
  }

  @Get('attendance-summary/:studentId')
  @ApiOperation({ summary: 'Get child attendance trends and institutional policy guidance' })
  async getChildAttendanceSummary(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
  ) {
    return this.parentService.getChildAttendanceSummary(studentId, user);
  }

  @Get('homework-summary/:studentId')
  @ApiOperation({ summary: 'Get upcoming homework assignments and completed submissions briefing' })
  async getChildHomeworkSummary(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
  ) {
    return this.parentService.getChildHomeworkSummary(studentId, user);
  }

  @Get('fee-explanation/:studentId')
  @ApiOperation({ summary: 'Get exact, read-only fee balance breakdown and payment history' })
  async getChildFeeExplanation(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
  ) {
    return this.parentService.getChildFeeExplanation(studentId, user);
  }

  @Post('home-learning')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate age-appropriate home learning suggestions and routines' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getHomeLearningSuggestions(
    @CurrentUser() user: AuthUser,
    @Body() dto: ParentHomeLearningRequestDto,
  ) {
    return this.parentService.getHomeLearningSuggestions(dto, user);
  }

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ask parent assistant question scoped to a verified linked child' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async askParentQuestion(
    @CurrentUser() user: AuthUser,
    @Body() dto: ParentAskQuestionDto,
  ) {
    return this.parentService.askParentQuestion(dto, user);
  }

  @Get('conversations/:studentId')
  @ApiOperation({ summary: 'Retrieve parent conversation history scoped to target child' })
  async getParentConversations(
    @CurrentUser() user: AuthUser,
    @Param('studentId') studentId: string,
  ) {
    return this.parentService.getParentConversations(studentId, user);
  }
}
