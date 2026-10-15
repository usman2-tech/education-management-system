/**
 * Automated tests for Institutional AI Assistant Service.
 * Verifies conversation ownership, message persistence, and role-aware handling.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AiToolsService } from './ai-tools.service';
import { UserRole } from '@ems/contracts';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AiService - Conversation Lifecycle & Ownership', () => {
  let service: AiService;
  let prisma: any;

  const mockConversationRepo = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockMessageRepo = {
    create: jest.fn(),
    findMany: jest.fn(),
  };

  const mockUsageRepo = {
    create: jest.fn(),
    findMany: jest.fn(),
  };

  const mockPrismaService = {
    aiConversation: mockConversationRepo,
    aIConversation: mockConversationRepo,
    aiMessage: mockMessageRepo,
    aIMessage: mockMessageRepo,
    aiUsageRecord: mockUsageRepo,
    aIUsageRecord: mockUsageRepo,
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'AI_SERVICE_URL') return 'http://localhost:8000';
      if (key === 'INTERNAL_SERVICE_SECRET') return 'test_secret';
      if (key === 'GEMINI_MODEL') return 'gemini-3.8-flash';
      return null;
    }),
  };

  const mockAiToolsService = {
    executeTool: jest.fn().mockResolvedValue({
      toolName: 'get_attendance_summary',
      success: true,
      data: { attendanceRate: '96%', totalSessionsLogged: 25 },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AiToolsService, useValue: mockAiToolsService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('Conversation Ownership Security', () => {
    it('throws ForbiddenException when a user attempts to view another user’s conversation', async () => {
      prisma.aiConversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        userId: 'different-user-456',
        messages: [],
      });

      await expect(
        service.getConversation('current-user-789', 'conv-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if conversation does not exist', async () => {
      prisma.aiConversation.findUnique.mockResolvedValue(null);

      await expect(
        service.getConversation('user-1', 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when attempting to delete another user’s conversation', async () => {
      prisma.aiConversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        userId: 'other-user',
      });

      await expect(
        service.deleteConversation('attacker-user', 'conv-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('successfully deletes conversation when caller is the owner', async () => {
      prisma.aiConversation.findUnique.mockResolvedValue({
        id: 'conv-123',
        userId: 'owner-user',
      });
      prisma.aiConversation.delete.mockResolvedValue({ id: 'conv-123' });

      const result = await service.deleteConversation('owner-user', 'conv-123');
      expect(result.success).toBe(true);
      expect(prisma.aiConversation.delete).toHaveBeenCalledWith({ where: { id: 'conv-123' } });
    });
  });

  describe('Chat Orchestration & Autonomous Fallback', () => {
    it('saves user and assistant messages to database when chatting', async () => {
      prisma.aiConversation.create.mockResolvedValue({
        id: 'new-conv-id',
        userId: 'user-1',
        title: 'What is my attendance?',
      });

      prisma.aiMessage.create
        .mockResolvedValueOnce({
          id: 'user-msg-id',
          conversationId: 'new-conv-id',
          sender: 'USER',
          content: 'What is my attendance?',
          createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'asst-msg-id',
          conversationId: 'new-conv-id',
          sender: 'ASSISTANT',
          content: 'Here is your attendance summary...',
          toolCalls: [{ name: 'get_attendance_summary', success: true }],
          tokensUsed: 45,
          modelName: 'gemini-3.8-flash-direct',
          createdAt: new Date(),
        });

      prisma.aiMessage.findMany.mockResolvedValue([]);
      prisma.aiConversation.update.mockResolvedValue({});
      prisma.aiUsageRecord.create.mockResolvedValue({});

      const response = await service.chat('user-1', UserRole.STUDENT, 'school-1', {
        message: 'What is my attendance?',
      });

      expect(response.conversationId).toBe('new-conv-id');
      expect(response.message.content).toBeDefined();
      expect(prisma.aiMessage.create).toHaveBeenCalledTimes(2);
      expect(prisma.aiUsageRecord.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Suggested Prompts', () => {
    it('returns role-tailored prompt questions for all five user roles', () => {
      const studentPrompts = service.getSuggestedPrompts(UserRole.STUDENT);
      expect(studentPrompts.some((p) => p.toLowerCase().includes('attendance'))).toBe(true);

      const teacherPrompts = service.getSuggestedPrompts(UserRole.TEACHER);
      expect(teacherPrompts.some((p) => p.toLowerCase().includes('timetable') || p.toLowerCase().includes('homework'))).toBe(true);

      const adminPrompts = service.getSuggestedPrompts(UserRole.SCHOOL_ADMIN);
      expect(adminPrompts.some((p) => p.toLowerCase().includes('enrollment') || p.toLowerCase().includes('fee'))).toBe(true);

      const parentPrompts = service.getSuggestedPrompts(UserRole.PARENT);
      expect(parentPrompts.some((p) => p.toLowerCase().includes('child'))).toBe(true);

      const platformPrompts = service.getSuggestedPrompts(UserRole.PLATFORM_ADMIN);
      expect(platformPrompts.some((p) => p.toLowerCase().includes('schools') || p.toLowerCase().includes('platform'))).toBe(true);
    });
  });
});
