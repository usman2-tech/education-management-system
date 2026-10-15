/**
 * MODULE: AI Teacher Copilot Controller
 *
 * PURPOSE:
 * Endpoints for faculty pedagogical generation, drafts lifecycle management,
 * human approval, and publishing into core EMS modules.
 *
 * DEPENDENCIES:
 * AiCopilotService, JwtAuthGuard, CurrentUser.
 *
 * SECURITY:
 * Requires JWT authentication. Verified faculty access only. Students and parents denied.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiCopilotService } from './ai-copilot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, AICopilotContentType, AICopilotDraftStatus } from '@ems/contracts';
import {
  GenerateLessonPlanRequestDto,
  GenerateHomeworkRequestDto,
  GenerateExamRequestDto,
  GenerateGradingRequestDto,
  GeneratePerformanceInsightRequestDto,
  GenerateTeachingMaterialRequestDto,
  UpdateCopilotDraftRequestDto,
  ApproveAndPublishRequestDto,
} from './dto/ai-copilot.dto';

@ApiTags('AI Teacher Copilot')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai/copilot')
export class AiCopilotController {
  constructor(private readonly copilotService: AiCopilotService) {}

  @Get('context')
  @ApiOperation({ summary: "Get teacher's assigned classes, subjects, courses, and pending submissions" })
  async getTeacherContext(@CurrentUser() user: AuthUser) {
    return this.copilotService.getTeacherContext(user);
  }

  @Post('lesson-plan')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate structured lesson plan draft using Gemini' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async generateLessonPlan(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateLessonPlanRequestDto,
  ) {
    return this.copilotService.generateLessonPlan(user, dto);
  }

  @Post('homework')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate curriculum-aligned homework assignment draft' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async generateHomework(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateHomeworkRequestDto,
  ) {
    return this.copilotService.generateHomework(user, dto);
  }

  @Post('exam')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate balanced examination / quiz paper draft' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async generateExam(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateExamRequestDto,
  ) {
    return this.copilotService.generateExam(user, dto);
  }

  @Post('grading')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate objective grading suggestions and rubric feedback for student submission' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async generateGrading(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateGradingRequestDto,
  ) {
    return this.copilotService.generateGradingSuggestion(user, dto);
  }

  @Post('insights')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate classroom performance insights grounded in verified database metrics' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async generateInsights(
    @CurrentUser() user: AuthUser,
    @Body() dto: GeneratePerformanceInsightRequestDto,
  ) {
    return this.copilotService.generatePerformanceInsights(user, dto);
  }

  @Post('teaching-materials')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate worksheets, revision guides, study aids, and activities' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async generateTeachingMaterials(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateTeachingMaterialRequestDto,
  ) {
    return this.copilotService.generateTeachingMaterials(user, dto);
  }

  @Get('drafts')
  @ApiOperation({ summary: "List teacher's saved Copilot drafts with optional filters" })
  async listDrafts(
    @CurrentUser() user: AuthUser,
    @Query('contentType') contentType?: AICopilotContentType,
    @Query('status') status?: AICopilotDraftStatus,
  ) {
    return this.copilotService.listDrafts(user, contentType, status);
  }

  @Get('drafts/:id')
  @ApiOperation({ summary: 'Retrieve specific Copilot draft by ID' })
  async getDraft(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.copilotService.getDraft(user, id);
  }

  @Patch('drafts/:id')
  @ApiOperation({ summary: 'Update / edit content, title, or status of a draft' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updateDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCopilotDraftRequestDto,
  ) {
    return this.copilotService.updateDraft(user, id, dto);
  }

  @Post('drafts/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve and publish draft into active EMS modules (Homework, Exams, Gradebook)' })
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async approveAndPublishDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ApproveAndPublishRequestDto,
  ) {
    return this.copilotService.approveAndPublishDraft(user, id, dto);
  }

  @Delete('drafts/:id')
  @ApiOperation({ summary: 'Delete a saved draft' })
  async deleteDraft(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.copilotService.deleteDraft(user, id);
  }
}
