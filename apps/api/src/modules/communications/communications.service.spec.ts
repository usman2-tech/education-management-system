/**
 * UNIT TESTS: CommunicationsService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationsService } from './communications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { UserRole, AuthUser } from '@ems/contracts';

describe('CommunicationsService', () => {
  let service: CommunicationsService;
  let prisma: any;

  const mockUser = (id: string, role: UserRole, schoolId: string = 'school-1'): AuthUser => ({
    id,
    email: `${id}@test.local`,
    firstName: 'Test',
    lastName: 'User',
    role,
    schoolId,
  });

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      studentGuardianRelationship: {
        findMany: jest.fn(),
      },
      classEnrollment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      teacherSubjectAssignment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      conversation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      conversationParticipant: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      directMessage: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CommunicationsService>(CommunicationsService);
  });

  it('should fetch user notifications and compute unread count', async () => {
    prisma.notification.findMany.mockResolvedValue([
      {
        id: 'n-1',
        userId: 'u-1',
        title: 'Exam Scheduled',
        message: 'Midterms scheduled',
        type: NotificationType.EXAM,
        read: false,
        createdAt: new Date(),
      },
    ]);
    prisma.notification.count.mockResolvedValue(1);

    const res = await service.getNotifications(mockUser('u-1', UserRole.STUDENT));

    expect(res.unreadCount).toBe(1);
    expect(res.notifications.length).toBe(1);
    expect(res.notifications[0].title).toBe('Exam Scheduled');
  });

  it('should mark user notification as read', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'n-1',
      userId: 'u-1',
      read: false,
    });
    prisma.notification.update.mockResolvedValue({
      id: 'n-1',
      userId: 'u-1',
      title: 'Exam',
      message: 'Notice',
      read: true,
      createdAt: new Date(),
    });

    const res = await service.markAsRead(mockUser('u-1', UserRole.STUDENT), 'n-1');

    expect(res.read).toBe(true);
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n-1' },
      data: { read: true },
    });
  });

  it('should forbid user from marking another user notification as read', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'n-2',
      userId: 'other-user',
      read: false,
    });

    await expect(
      service.markAsRead(mockUser('u-1', UserRole.STUDENT), 'n-2'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow School Admin to broadcast announcement to all school users', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'u-1' }, { id: 'u-2' }, { id: 'u-3' }]);
    prisma.notification.createMany.mockResolvedValue({ count: 3 });

    const res = await service.broadcastAnnouncement(
      mockUser('admin-1', UserRole.SCHOOL_ADMIN, 'school-1'),
      {
        title: 'Campus Spring Festival',
        message: 'All parents and students welcome on Friday',
      },
    );

    expect(res.count).toBe(3);
    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('should forbid cross-school direct messaging', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'teacher-2',
      role: UserRole.TEACHER,
      schoolId: 'different-school', // Cross school
    });

    await expect(
      service.createConversation(
        mockUser('teacher-1', UserRole.TEACHER, 'school-1'),
        { recipientId: 'teacher-2', initialMessage: 'Hello colleague' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should reject creating conversation with oneself with BadRequestException', async () => {
    await expect(
      service.createConversation(
        mockUser('user-1', UserRole.TEACHER, 'school-1'),
        { recipientId: 'user-1', initialMessage: 'Note to self' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should forbid student-to-student direct messaging', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-2',
      role: UserRole.STUDENT,
      schoolId: 'school-1',
    });

    await expect(
      service.createConversation(
        mockUser('student-1', UserRole.STUDENT, 'school-1'),
        { recipientId: 'student-2', initialMessage: 'Hey classmate' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow parent to message a teacher assigned to their verified child', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'teacher-1',
        role: UserRole.TEACHER,
        schoolId: 'school-1',
      })
      .mockResolvedValueOnce({
        id: 'parent-1',
        firstName: 'Farida',
      });

    prisma.studentGuardianRelationship.findMany.mockResolvedValue([
      { studentId: 'child-1' },
    ]);
    prisma.classEnrollment.findMany.mockResolvedValue([
      { sectionId: 'sec-1' },
    ]);
    prisma.teacherSubjectAssignment.findFirst.mockResolvedValue({
      id: 'tsa-1',
      teacherId: 'teacher-1',
      sectionId: 'sec-1',
    });

    prisma.conversation.findFirst.mockResolvedValue(null);
    prisma.conversation.create.mockResolvedValue({
      id: 'conv-1',
      schoolId: 'school-1',
    });
    prisma.directMessage.create.mockResolvedValue({
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'parent-1',
      content: 'Inquiry regarding homework',
      createdAt: new Date(),
      sender: { firstName: 'Farida', lastName: 'Khan', role: UserRole.PARENT },
    });
    prisma.conversation.update.mockResolvedValue({});
    prisma.notification.create.mockResolvedValue({});

    const res = await service.createConversation(
      mockUser('parent-1', UserRole.PARENT, 'school-1'),
      { recipientId: 'teacher-1', initialMessage: 'Inquiry regarding homework' },
    );

    expect(res.conversationId).toBe('conv-1');
    expect(res.message.content).toBe('Inquiry regarding homework');
  });
});
