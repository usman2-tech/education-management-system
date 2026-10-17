/**
 * MODULE: Institutional Document Intelligence Controller (TASK 026)
 *
 * PURPOSE:
 * REST API for document library management, authorized document searches,
 * summarization, administrative notice drafting, review workflows,
 * and narrative institutional reporting.
 *
 * DEPENDENCIES:
 * DocumentsService, JwtAuthGuard, CurrentUser.
 *
 * SECURITY:
 * All endpoints require valid JWT credentials. Role and tenant access rules
 * are strictly enforced at the backend service layer before executing any operation.
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
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '@ems/contracts';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  ReplaceDocumentVersionDto,
  DocumentFilterDto,
  CreateDocumentDraftDto,
  UpdateDocumentDraftDto,
  ReviewDocumentDraftDto,
  PublishDocumentDraftDto,
  DocumentSearchQueryDto,
  DocumentSummaryRequestDto,
  NarrativeReportRequestDto,
} from './dto/documents.dto';

@ApiTags('Institutional Document Intelligence')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ============================================================================
  // DOCUMENT LIBRARY & MANAGEMENT
  // ============================================================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload and catalog a new institutional document (Admins only)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createDocument(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDto) {
    return this.documentsService.createDocument(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List accessible institutional documents with filters and pagination' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getDocuments(@CurrentUser() user: AuthUser, @Query() filter: DocumentFilterDto) {
    return this.documentsService.getDocuments(user, filter);
  }

  @Get('search/sections')
  @ApiOperation({ summary: 'Search authorized document sections for AI Q&A and policy reference' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async searchSections(@CurrentUser() user: AuthUser, @Query() query: DocumentSearchQueryDto) {
    return this.documentsService.searchAuthorizedSections(
      user,
      query.query,
      query.category,
      query.limit,
    );
  }

  @Get('drafts')
  @ApiOperation({ summary: 'List administrative notice drafts' })
  async getDrafts(@CurrentUser() user: AuthUser) {
    return this.documentsService.getDrafts(user);
  }

  @Post('drafts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new administrative notice draft' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async createDraft(@CurrentUser() user: AuthUser, @Body() dto: CreateDocumentDraftDto) {
    return this.documentsService.createDraft(user, dto);
  }

  @Get('drafts/:id')
  @ApiOperation({ summary: 'Get administrative notice draft by ID' })
  async getDraftById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.getDraftById(user, id);
  }

  @Patch('drafts/:id')
  @ApiOperation({ summary: 'Edit administrative draft (reverts approved drafts to review)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDraftDto,
  ) {
    return this.documentsService.updateDraft(user, id, dto);
  }

  @Post('drafts/:id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject administrative draft (Admins only)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async reviewDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewDocumentDraftDto,
  ) {
    return this.documentsService.reviewDraft(user, id, dto);
  }

  @Post('drafts/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish and broadcast approved draft via TASK 030 Messaging (Admins only)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async publishDraft(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() _dto: PublishDocumentDraftDto,
  ) {
    return this.documentsService.publishDraft(user, id);
  }

  @Post('reports/narrative')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate authoritative narrative report from live EMS data (Admins only)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async generateNarrativeReport(
    @CurrentUser() user: AuthUser,
    @Body() dto: NarrativeReportRequestDto,
  ) {
    return this.documentsService.generateNarrativeReport(user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get institutional document details by ID' })
  async getDocumentById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.getDocumentById(user, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update institutional document metadata (Admins only)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async updateDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.updateDocument(user, id, dto);
  }

  @Post(':id/version')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload a new version of the document (Admins only)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async replaceVersion(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReplaceDocumentVersionDto,
  ) {
    return this.documentsService.replaceVersion(user, id, dto);
  }

  @Post(':id/reprocess')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reprocess and re-chunk document text (Admins only)' })
  async reprocessDocument(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.reprocessDocument(user, id);
  }

  @Post(':id/summarize')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate structured summary of an authorized document' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async summarizeDocument(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: Partial<DocumentSummaryRequestDto>,
  ) {
    return this.documentsService.summarizeDocument(user, id, dto.summaryType || 'SHORT');
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Archive institutional document (Admins only)' })
  async archiveDocument(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.documentsService.archiveDocument(user, id);
  }
}
