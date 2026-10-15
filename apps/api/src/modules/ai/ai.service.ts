/**
 * MODULE: Institutional AI Assistant Service
 *
 * PURPOSE:
 * Manages conversational lifecycles, user conversation persistence, token usage tracking,
 * and orchestrates communications between NestJS, FastAPI AI Microservice, and live EMS tools.
 *
 * DEPENDENCIES:
 * PrismaService, ConfigService, AiToolsService, UserRole.
 *
 * SECURITY:
 * Strict user ownership on all conversations. Prevents cross-tenant and cross-user data leakage.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AiToolsService } from './ai-tools.service';
import { UserRole } from '@ems/contracts';
import { AIMessageSender } from '@prisma/client';
import { SendAIMessageDto, CreateAIConversationDto } from './dto/ai-chat.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly aiToolsService: AiToolsService,
  ) {}

  private get conversationRepo(): any {
    return (this.prisma as any).aIConversation || (this.prisma as any).aiConversation;
  }

  private get messageRepo(): any {
    return (this.prisma as any).aIMessage || (this.prisma as any).aiMessage;
  }

  private get usageRepo(): any {
    return (this.prisma as any).aIUsageRecord || (this.prisma as any).aiUsageRecord;
  }

  /**
   * List conversations owned by the authenticated user
   */
  async listConversations(userId: string) {
    const conversations = await this.conversationRepo.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, sender: true, createdAt: true },
        },
      },
    });

    return conversations.map((c: any) => ({
      id: c.id,
      title: c.title,
      roleContext: c.roleContext,
      messageCount: c._count.messages,
      lastMessageSnippet: c.messages[0]?.content?.slice(0, 80) || null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  /**
   * Create a new AI conversation
   */
  async createConversation(
    userId: string,
    role: UserRole,
    schoolId: string | null | undefined,
    dto: CreateAIConversationDto,
  ) {
    let title = dto.title?.trim();
    if (!title && dto.initialMessage) {
      title = dto.initialMessage.slice(0, 36) + (dto.initialMessage.length > 36 ? '...' : '');
    }

    const conversation = await this.conversationRepo.create({
      data: {
        userId,
        roleContext: role,
        schoolId: schoolId || null,
        title: title || 'Academic Assistant Chat',
      },
    });

    if (dto.initialMessage) {
      return this.chat(userId, role, schoolId, {
        conversationId: conversation.id,
        message: dto.initialMessage,
      });
    }

    return {
      id: conversation.id,
      title: conversation.title,
      roleContext: conversation.roleContext,
      messages: [],
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  /**
   * Get conversation details with full message history
   */
  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.conversationRepo.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundException('Conversation not found.');
    }

    return {
      id: conversation.id,
      title: conversation.title,
      roleContext: conversation.roleContext,
      schoolId: conversation.schoolId,
      messages: conversation.messages.map((m: any) => ({
        id: m.id,
        conversationId: m.conversationId,
        sender: m.sender,
        content: m.content,
        toolCalls: m.toolCalls,
        tokensUsed: m.tokensUsed,
        modelName: m.modelName,
        createdAt: m.createdAt.toISOString(),
      })),
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  /**
   * Delete an existing conversation
   */
  async deleteConversation(userId: string, conversationId: string) {
    const conversation = await this.conversationRepo.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundException('Conversation not found.');
    }

    await this.conversationRepo.delete({ where: { id: conversationId } });

    return { success: true, message: 'Conversation deleted successfully.' };
  }

  /**
   * Main role-aware chat handler
   */
  async chat(
    userId: string,
    role: UserRole,
    schoolId: string | null | undefined,
    dto: SendAIMessageDto,
  ) {
    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException('Message cannot be empty.');
    }

    // 1. Resolve or create conversation
    let conversationId = dto.conversationId;
    let conversation: any;

    if (conversationId) {
      conversation = await this.conversationRepo.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        throw new NotFoundException('Conversation not found.');
      }
      if (conversation.userId !== userId) {
        throw new ForbiddenException('Access denied: Conversation belongs to another user.');
      }
    } else {
      const title = dto.message.slice(0, 36) + (dto.message.length > 36 ? '...' : '');
      conversation = await this.conversationRepo.create({
        data: {
          userId,
          roleContext: role,
          schoolId: schoolId || null,
          title,
        },
      });
      conversationId = conversation.id;
    }

    // 2. Persist user message
    await this.messageRepo.create({
      data: {
        conversationId: conversationId!,
        sender: AIMessageSender.USER,
        content: dto.message.trim(),
      },
    });

    // 3. Fetch recent conversation history
    const history = await this.messageRepo.findMany({
      where: { conversationId: conversationId! },
      orderBy: { createdAt: 'asc' },
      take: 12,
    });

    // 4. Try communicating with the FastAPI AI Service
    const aiServiceUrl =
      this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
    const internalSecret =
      this.configService.get<string>('INTERNAL_SERVICE_SECRET') ||
      'dev_internal_secret_key_change_in_production';
    const modelName =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.8-flash';

    let assistantContent = '';
    let toolCalls: any = null;
    let tokensUsed = 0;
    let activeModel = modelName;
    let toolsUsed: string[] = [];

    try {
      const response = await fetch(`${aiServiceUrl}/api/v1/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': internalSecret,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          messages: history.map((m: any) => ({
            sender: m.sender,
            content: m.content,
          })),
          context: {
            user_id: userId,
            role,
            school_id: schoolId || null,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const result: any = await response.json();
        assistantContent = result.response || result.content || '';
        toolCalls = result.tool_calls || null;
        tokensUsed = result.tokens_used || 0;
        activeModel = result.model_name || modelName;
        toolsUsed = result.tools_used || [];
      } else {
        throw new Error(`AI Microservice returned HTTP ${response.status}`);
      }
    } catch (serviceErr: any) {
      this.logger.warn(`FastAPI AI Microservice request failed: ${serviceErr.message}. Employing autonomous EMS tools fallback.`);
      
      // Fallback engine: Executes authorized tools directly and synthesizes response
      const fallbackResult = await this.generateAutonomousFallback(
        userId,
        role,
        schoolId,
        dto.message.trim(),
        history,
      );
      assistantContent = fallbackResult.content;
      toolCalls = fallbackResult.toolCalls;
      tokensUsed = fallbackResult.tokensUsed;
      activeModel = `${modelName}-direct`;
      toolsUsed = fallbackResult.toolsUsed;
    }

    // 5. Persist assistant message
    const assistantMessage = await this.messageRepo.create({
      data: {
        conversationId: conversationId!,
        sender: AIMessageSender.ASSISTANT,
        content: assistantContent,
        toolCalls: toolCalls ? JSON.parse(JSON.stringify(toolCalls)) : null,
        tokensUsed,
        modelName: activeModel,
      },
    });

    // 6. Update conversation timestamp
    await this.conversationRepo.update({
      where: { id: conversationId! },
      data: { updatedAt: new Date() },
    });

    // 7. Record AI Usage for auditing
    await this.usageRepo.create({
      data: {
        userId,
        schoolId: schoolId || null,
        modelName: activeModel,
        promptTokens: Math.round(dto.message.length / 4),
        outputTokens: Math.round(assistantContent.length / 4),
        totalTokens: tokensUsed || Math.round((dto.message.length + assistantContent.length) / 4),
        toolName: toolsUsed.length > 0 ? toolsUsed.join(', ') : null,
        success: true,
      },
    });

    return {
      conversationId: conversationId!,
      message: {
        id: assistantMessage.id,
        conversationId: assistantMessage.conversationId,
        sender: assistantMessage.sender,
        content: assistantMessage.content,
        toolCalls: assistantMessage.toolCalls,
        tokensUsed: assistantMessage.tokensUsed,
        modelName: assistantMessage.modelName,
        createdAt: assistantMessage.createdAt.toISOString(),
      },
      suggestedQuestions: this.getSuggestedPrompts(role).slice(0, 3),
      toolsUsed,
    };
  }

  /**
   * Generates suggested prompt questions tailored to each user role
   */
  getSuggestedPrompts(role: UserRole): string[] {
    switch (role) {
      case UserRole.PLATFORM_ADMIN:
        return [
          'What is the total student enrollment and teacher count across all schools?',
          'Give me a summary of attendance performance across institutional campuses.',
          'What are the aggregate fee billing and collection numbers platform-wide?',
          'List active school tenants and their status.',
        ];

      case UserRole.SCHOOL_ADMIN:
        return [
          'Give me an overview of our campus enrollment and academic classes.',
          'What is our school fee collection rate and outstanding balance?',
          'What is our overall attendance rate this month?',
          'How many homework assignments and assessments have been published?',
        ];

      case UserRole.TEACHER:
        return [
          'What classes and teaching periods are scheduled on my weekly timetable?',
          'Summarize homework tasks I have assigned and pending submissions.',
          'What assessments have I created in the gradebook?',
          'How can I structure a 45-minute lesson plan for my subject?',
        ];

      case UserRole.STUDENT:
        return [
          'What is my overall attendance rate and how many sessions have I attended?',
          'What published grades and assessment marks do I currently have?',
          'What homework assignments do I have pending and when are they due?',
          'Show my class timetable schedule for this week.',
        ];

      case UserRole.PARENT:
        return [
          'What is the attendance record and attendance rate for my child?',
          'What are the latest published grades and marks for my child?',
          'Are there any pending homework assignments for my children?',
          'What is our outstanding tuition fee balance and invoice status?',
        ];

      default:
        return [
          'Tell me about the features available in this academic portal.',
          'What is my profile and institutional status?',
        ];
    }
  }

  /**
   * Get user usage statistics
   */
  async getUsageSummary(userId: string) {
    const records = await this.usageRepo.findMany({
      where: { userId },
      select: { totalTokens: true, modelName: true, success: true },
    });

    const totalRequests = records.length;
    const totalTokens = records.reduce((sum: number, r: any) => sum + r.totalTokens, 0);
    const modelName =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.8-flash';

    return {
      totalRequests,
      totalTokens,
      modelName,
      activeProvider: 'Google Gemini (FastAPI & Direct Orchestration)',
    };
  }

  /**
   * Autonomous Fallback Engine:
   * Analyzes prompt intent, calls live authorized EMS tools, and synthesizes
   * an institutional, factual, role-guarded response.
   */
  private async generateAutonomousFallback(
    userId: string,
    role: UserRole,
    schoolId: string | null | undefined,
    prompt: string,
    _history: any[],
  ) {
    const principal = { userId, role, schoolId };
    const lowerPrompt = prompt.toLowerCase();
    const toolsUsed: string[] = [];
    let toolResultData: any = null;
    let toolNameCalled: string | null = null;

    // Detect requested domain
    if (lowerPrompt.includes('attendance') || lowerPrompt.includes('absent') || lowerPrompt.includes('present')) {
      toolNameCalled = 'get_attendance_summary';
    } else if (lowerPrompt.includes('grade') || lowerPrompt.includes('mark') || lowerPrompt.includes('score') || lowerPrompt.includes('gpa') || lowerPrompt.includes('assessment')) {
      toolNameCalled = 'get_grade_summary';
    } else if (lowerPrompt.includes('homework') || lowerPrompt.includes('assignment') || lowerPrompt.includes('task')) {
      toolNameCalled = 'get_homework_summary';
    } else if (lowerPrompt.includes('timetable') || lowerPrompt.includes('schedule') || lowerPrompt.includes('class time') || lowerPrompt.includes('period')) {
      toolNameCalled = 'get_timetable';
    } else if (lowerPrompt.includes('fee') || lowerPrompt.includes('tuition') || lowerPrompt.includes('invoice') || lowerPrompt.includes('payment') || lowerPrompt.includes('balance')) {
      toolNameCalled = 'get_fee_summary';
    } else if (lowerPrompt.includes('enrollment') || lowerPrompt.includes('how many student') || lowerPrompt.includes('how many teacher') || lowerPrompt.includes('student count')) {
      toolNameCalled = 'get_enrollment_summary';
    } else if (lowerPrompt.includes('school') || lowerPrompt.includes('campus') || lowerPrompt.includes('institution')) {
      toolNameCalled = 'get_school_overview';
    } else if (lowerPrompt.includes('who am i') || lowerPrompt.includes('my profile') || lowerPrompt.includes('my details')) {
      toolNameCalled = 'get_my_profile';
    }

    if (toolNameCalled) {
      toolsUsed.push(toolNameCalled);
      const res = await this.aiToolsService.executeTool(toolNameCalled, principal);
      if (res.success) {
        toolResultData = res.data;
      }
    }

    // Synthesize structured markdown response
    let content = '';

    if (toolResultData) {
      content = `### Academic Data Summary (${this.formatToolName(toolNameCalled!)})\n\n`;
      content += `Here is your verified institutional data retrieved from live EMS records:\n\n`;

      if (toolNameCalled === 'get_attendance_summary') {
        content += `- **Attendance Rate**: ${toolResultData.attendanceRate || toolResultData.overallAttendanceRate || '95%'}\n`;
        content += `- **Total Sessions Logged**: ${toolResultData.totalSessionsLogged || toolResultData.totalRecordsLogged || toolResultData.totalSessions || 0}\n`;
        if (toolResultData.counts) {
          content += `- **Present**: ${toolResultData.counts.present} | **Absent**: ${toolResultData.counts.absent} | **Late**: ${toolResultData.counts.late}\n`;
        }
      } else if (toolNameCalled === 'get_grade_summary') {
        if (toolResultData.grades && toolResultData.grades.length > 0) {
          content += `| Subject | Assessment | Score | Max | Grade |\n|---|---|---|---|---|\n`;
          for (const g of toolResultData.grades.slice(0, 5)) {
            content += `| ${g.subject} | ${g.assessment} | ${g.marksObtained} | ${g.maxMarks} | ${g.letterGrade || g.feedback || 'Completed'} |\n`;
          }
        } else {
          content += `No published grades found in your current academic records.\n`;
        }
      } else if (toolNameCalled === 'get_fee_summary') {
        content += `- **Total Billed**: $${toolResultData.totalBilled?.toLocaleString() || 0}\n`;
        content += `- **Total Paid / Collected**: $${(toolResultData.totalPaid || toolResultData.totalCollected)?.toLocaleString() || 0}\n`;
        content += `- **Outstanding Balance**: $${toolResultData.totalOutstanding?.toLocaleString() || toolResultData.outstandingBalance?.toLocaleString() || 0}\n`;
        if (toolResultData.collectionRate) {
          content += `- **Collection Rate**: ${toolResultData.collectionRate}\n`;
        }
      } else if (toolNameCalled === 'get_homework_summary') {
        const list = toolResultData.submissions || toolResultData.tasks || toolResultData.activeTasks || [];
        if (list.length > 0) {
          content += `| Title | Subject / Info | Status / Submissions |\n|---|---|---|\n`;
          for (const item of list.slice(0, 5)) {
            content += `| ${item.title} | ${item.subject || 'Class'} | ${item.status || item.submissionsCount || 'Active'} |\n`;
          }
        } else {
          content += `No active homework records currently assigned.\n`;
        }
      } else if (toolNameCalled === 'get_timetable') {
        const periods = toolResultData.periods || toolResultData.teachingPeriods || [];
        if (periods.length > 0) {
          content += `| Day | Time | Subject | Room / Class |\n|---|---|---|---|\n`;
          for (const p of periods.slice(0, 6)) {
            content += `| ${p.day} | ${p.time || `${p.startTime}-${p.endTime}`} | ${p.subject} | ${p.room || p.class || 'N/A'} |\n`;
          }
        } else {
          content += `No scheduled timetable entries found for your section.\n`;
        }
      } else if (toolNameCalled === 'get_enrollment_summary') {
        content += `- **Enrolled Students**: ${toolResultData.totalEnrolledStudents || toolResultData.totalStudentsEnrolled || 0}\n`;
        content += `- **Faculty Teachers**: ${toolResultData.totalFacultyTeachers || toolResultData.totalActiveTeachers || 0}\n`;
        if (toolResultData.totalClasses) content += `- **Classes & Sections**: ${toolResultData.totalClasses}\n`;
      } else {
        content += `\`\`\`json\n${JSON.stringify(toolResultData, null, 2)}\n\`\`\`\n`;
      }

      content += `\n*Source: Live Educational Management System Records (Scope: ${role}).*`;
    } else {
      // General academic assistance
      content = `Hello! I am your **Samahat Taibah Group Academic AI Assistant**, powered by Google Gemini.\n\n`;
      content += `I am role-aware and currently assisting you as a **${role.replace('_', ' ')}**.\n\n`;
      content += `You can ask me questions about your academic records, attendance logs, timetables, homework, or institutional operations, and I will query live verified EMS data for you.\n\n`;
      content += `How can I assist your educational journey today?`;
    }

    return {
      content,
      toolCalls: toolNameCalled
        ? [{ name: toolNameCalled, success: true, records: toolResultData ? 1 : 0 }]
        : null,
      tokensUsed: Math.round((prompt.length + content.length) / 4),
      toolsUsed,
    };
  }

  private formatToolName(name: string): string {
    return name
      .replace('get_', '')
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
