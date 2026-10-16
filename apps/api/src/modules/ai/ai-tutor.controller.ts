/**
 * MODULE: AI Student Tutor Controller
 *
 * PURPOSE:
 * Exposes secure student tutoring endpoints: concept explanations, Socratic tutoring,
 * practice quizzes, personalized revision planning, homework guidance, and progress metrics.
 *
 * DEPENDENCIES:
 * AiTutorService, JwtAuthGuard, RolesGuard, Roles, CurrentUser.
 *
 * SECURITY:
 * Requires JWT authentication. Permitted for STUDENT (and PLATFORM_ADMIN for administrative audits).
 * Faculty and unauthorized users are restricted.
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
import { AiTutorService } from './ai-tutor.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  ConceptExplanationRequestDto,
  SocraticTutorMessageDto,
  GeneratePracticeQuizRequestDto,
  SubmitPracticeQuizRequestDto,
  GenerateRevisionPlanRequestDto,
  SaveRevisionPlanRequestDto,
  HomeworkGuidanceRequestDto,
} from './dto/ai-tutor.dto';

@ApiTags('AI Student Tutor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.PLATFORM_ADMIN)
@Controller('ai/tutor')
export class AiTutorController {
  constructor(private readonly tutorService: AiTutorService) {}

  @Get('context')
  @ApiOperation({ summary: 'Retrieve student enrolled courses, subjects, and grade level context' })
  async getStudentContext(@CurrentUser() user: AuthUser) {
    return this.tutorService.getStudentContext(user);
  }

  @Post('concept-explanation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate personalized concept breakdown with worked examples' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async generateConceptExplanation(
    @CurrentUser() user: AuthUser,
    @Body() dto: ConceptExplanationRequestDto,
  ) {
    return this.tutorService.generateConceptExplanation(dto, user);
  }

  @Post('socratic')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Interactive Socratic step-by-step tutoring dialogue' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async socraticTutor(
    @CurrentUser() user: AuthUser,
    @Body() dto: SocraticTutorMessageDto,
  ) {
    return this.tutorService.socraticTutor(dto, user);
  }

  @Post('practice-quiz')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate structured practice quiz for self-assessment' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async generatePracticeQuiz(
    @CurrentUser() user: AuthUser,
    @Body() dto: GeneratePracticeQuizRequestDto,
  ) {
    return this.tutorService.generatePracticeQuiz(dto, user);
  }

  @Post('submit-quiz')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit practice quiz answers for immediate formative evaluation' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async submitPracticeQuiz(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitPracticeQuizRequestDto,
  ) {
    return this.tutorService.submitPracticeQuiz(dto, user);
  }

  @Get('practice-quizzes')
  @ApiOperation({ summary: 'List student practice quiz history' })
  async listPracticeQuizzes(@CurrentUser() user: AuthUser) {
    return this.tutorService.listPracticeQuizzes(user);
  }

  @Get('practice-quiz/:id')
  @ApiOperation({ summary: 'Retrieve specific practice quiz by ID' })
  async getPracticeQuizById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.tutorService.getPracticeQuizById(id, user);
  }

  @Post('revision-plan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate personalized revision schedule grounded in verified data' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async generateRevisionPlan(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateRevisionPlanRequestDto,
  ) {
    return this.tutorService.generateRevisionPlan(dto, user);
  }

  @Post('save-revision-plan')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Save generated revision plan to student profile' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async saveRevisionPlan(
    @CurrentUser() user: AuthUser,
    @Body() dto: SaveRevisionPlanRequestDto,
  ) {
    return this.tutorService.saveRevisionPlan(dto, user);
  }

  @Get('revision-plans')
  @ApiOperation({ summary: 'List saved revision plans' })
  async listRevisionPlans(@CurrentUser() user: AuthUser) {
    return this.tutorService.listRevisionPlans(user);
  }

  @Get('revision-plan/:id')
  @ApiOperation({ summary: 'Retrieve single revision plan' })
  async getRevisionPlanById(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.tutorService.getRevisionPlanById(id, user);
  }

  @Post('homework-guidance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get pedagogical hints and analogous examples without answer copying' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getHomeworkGuidance(
    @CurrentUser() user: AuthUser,
    @Body() dto: HomeworkGuidanceRequestDto,
  ) {
    return this.tutorService.getHomeworkGuidance(dto, user);
  }

  @Get('learning-progress')
  @ApiOperation({ summary: 'Synthesize verified learning trajectory and strengths summary' })
  async getLearningProgress(@CurrentUser() user: AuthUser) {
    return this.tutorService.getLearningProgress(user);
  }
}
