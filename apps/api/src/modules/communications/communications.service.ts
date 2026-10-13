/**
 * MODULE: Communications & Messaging - Service
 *
 * PURPOSE:
 * Provides in-app notification center, read/unread tracking, school broadcast announcements,
 * and secure direct messaging threads with strict institutional tenant isolation and verified
 * parent-child permission controls.
 *
 * DEPENDENCIES:
 * PrismaService, UserRole, NotificationType
 *
 * SECURITY:
 * Strict school isolation: prevents cross-school communications.
 * Respects verified parent-child linkages: parents can message teachers of linked children.
 * Students can only message assigned faculty and administrators.
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, NotificationType } from '@prisma/client';
import {
  CreateNotificationDto,
  BroadcastAnnouncementDto,
  CreateConversationDto,
  SendMessageDto,
} from './dto/communications.dto';

@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // NOTIFICATIONS CENTER
  // ============================================================================

  /**
   * Get user notifications with unread count.
   */
  async getNotifications(
    currentUser: { id: string },
    unreadOnly: boolean = false,
  ) {
    const where: any = { userId: currentUser.id };
    if (unreadOnly) where.read = false;

    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.notification.count({
        where: { userId: currentUser.id, read: false },
      }),
    ]);

    return {
      unreadCount,
      notifications: items.map((n) => this.formatNotification(n)),
    };
  }

  /**
   * Mark single notification as read.
   */
  async markAsRead(currentUser: { id: string }, notificationId: string) {
    const notif = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notif) throw new NotFoundException('Notification not found');
    if (notif.userId !== currentUser.id) {
      throw new ForbiddenException('Cannot modify notifications belonging to another user');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    return this.formatNotification(updated);
  }

  /**
   * Mark all user notifications as read.
   */
  async markAllAsRead(currentUser: { id: string }) {
    await this.prisma.notification.updateMany({
      where: { userId: currentUser.id, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  /**
   * Create an individual notification.
   */
  async createNotification(dto: CreateNotificationDto) {
    const notif = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        schoolId: dto.schoolId || null,
        title: dto.title,
        message: dto.message,
        type: dto.type || NotificationType.INFO,
        link: dto.link || null,
        read: false,
      },
    });
    return this.formatNotification(notif);
  }

  /**
   * Broadcast announcement to school members (School Admin or Platform Admin).
   */
  async broadcastAnnouncement(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    dto: BroadcastAnnouncementDto,
  ) {
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.role !== UserRole.SCHOOL_ADMIN
    ) {
      throw new ForbiddenException('Only Administrators can broadcast school announcements');
    }

    const schoolId = currentUser.schoolId;
    if (!schoolId && currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Administrator must belong to a school tenant');
    }

    const userWhere: any = {};
    if (schoolId) userWhere.schoolId = schoolId;
    if (dto.targetRole) userWhere.role = dto.targetRole;

    const targetUsers = await this.prisma.user.findMany({
      where: userWhere,
      select: { id: true },
    });

    if (targetUsers.length === 0) {
      return { count: 0, message: 'No recipients matched the broadcast criteria' };
    }

    await this.prisma.notification.createMany({
      data: targetUsers.map((u) => ({
        userId: u.id,
        schoolId,
        title: dto.title,
        message: dto.message,
        type: NotificationType.ANNOUNCEMENT,
        link: dto.link || null,
        read: false,
      })),
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'ANNOUNCEMENT_BROADCAST',
        entityType: 'Notification',
        entityId: schoolId || 'global',
        actorId: currentUser.id,
        schoolId,
        details: {
          title: dto.title,
          recipientsCount: targetUsers.length,
          targetRole: dto.targetRole || 'ALL',
        },
      },
    });

    return {
      count: targetUsers.length,
      message: `Announcement broadcast successfully to ${targetUsers.length} users`,
    };
  }

  // ============================================================================
  // DIRECT MESSAGING & THREADS
  // ============================================================================

  /**
   * Get all conversation threads for current user.
   */
  async getConversations(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
  ) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId: currentUser.id },
      include: {
        conversation: {
          include: {
            participants: {
              include: { user: true },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: { sender: true },
            },
          },
        },
      },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
    });

    const results: any[] = [];

    for (const p of participants) {
      const conv = p.conversation;
      const lastMsg = conv.messages[0] || null;

      // Count unread messages in this conversation for current user
      const unreadCount = await this.prisma.directMessage.count({
        where: {
          conversationId: conv.id,
          createdAt: p.lastReadAt ? { gt: p.lastReadAt } : undefined,
          senderId: { not: currentUser.id },
        },
      });

      results.push({
        id: conv.id,
        schoolId: conv.schoolId,
        subject: conv.subject,
        lastMessageAt: conv.lastMessageAt ? (typeof conv.lastMessageAt === 'string' ? conv.lastMessageAt : conv.lastMessageAt.toISOString()) : new Date().toISOString(),
        createdAt: conv.createdAt ? (typeof conv.createdAt === 'string' ? conv.createdAt : conv.createdAt.toISOString()) : new Date().toISOString(),
        unreadCount,
        participants: conv.participants.map((cp) => ({
          userId: cp.userId,
          name: `${cp.user.firstName} ${cp.user.lastName}`,
          email: cp.user.email,
          role: cp.user.role,
          lastReadAt: cp.lastReadAt ? (typeof cp.lastReadAt === 'string' ? cp.lastReadAt : cp.lastReadAt.toISOString()) : null,
        })),
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              conversationId: lastMsg.conversationId,
              senderId: lastMsg.senderId,
              senderName: `${lastMsg.sender.firstName} ${lastMsg.sender.lastName}`,
              senderRole: lastMsg.sender.role,
              content: lastMsg.content,
              createdAt: lastMsg.createdAt ? (typeof lastMsg.createdAt === 'string' ? lastMsg.createdAt : lastMsg.createdAt.toISOString()) : new Date().toISOString(),
            }
          : null,
      });
    }

    return results;
  }

  /**
   * Start a new conversation or send to existing conversation.
   */
  async createConversation(
    currentUser: { id: string; role: UserRole; schoolId: string | null },
    dto: CreateConversationDto,
  ) {
    if (currentUser.id === dto.recipientId) {
      throw new BadRequestException('Cannot start a conversation with yourself');
    }

    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
    });
    if (!recipient) throw new NotFoundException('Recipient user not found');

    // Strict School Isolation check
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      recipient.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.schoolId &&
      recipient.schoolId !== currentUser.schoolId
    ) {
      throw new ForbiddenException('Cross-school messaging is forbidden');
    }

    // Role-specific communication permissions
    if (currentUser.role === UserRole.STUDENT) {
      if (recipient.role === UserRole.STUDENT) {
        throw new ForbiddenException('Student-to-student direct messaging is disabled');
      }
    }

    if (currentUser.role === UserRole.PARENT) {
      if (recipient.role !== UserRole.TEACHER && recipient.role !== UserRole.SCHOOL_ADMIN) {
        throw new ForbiddenException('Parents may only message faculty and administrators');
      }
      // If messaging a teacher, verify teacher teaches one of parent's verified children
      if (recipient.role === UserRole.TEACHER) {
        const children = await this.prisma.studentGuardianRelationship.findMany({
          where: { guardianId: currentUser.id, verificationStatus: 'VERIFIED' },
          select: { studentId: true },
        });
        const studentIds = children.map((c) => c.studentId);

        const enrollments = await this.prisma.classEnrollment.findMany({
          where: { studentId: { in: studentIds }, status: 'ACTIVE' },
          select: { sectionId: true },
        });
        const sectionIds = enrollments.map((e) => e.sectionId);

        const teacherAssigned = await this.prisma.teacherSubjectAssignment.findFirst({
          where: { teacherId: recipient.id, sectionId: { in: sectionIds } },
        });

        if (!teacherAssigned && recipient.schoolId !== currentUser.schoolId) {
          throw new ForbiddenException(
            'Parents may only message teachers assigned to their verified children',
          );
        }
      }
    }

    const schoolId = currentUser.schoolId || recipient.schoolId;
    if (!schoolId) {
      throw new BadRequestException('Institutional context is required');
    }

    // Check if an existing 2-person conversation already exists between them
    const existing = await this.prisma.conversation.findFirst({
      where: {
        schoolId,
        AND: [
          { participants: { some: { userId: currentUser.id } } },
          { participants: { some: { userId: dto.recipientId } } },
        ],
      },
      include: {
        participants: { include: { user: true } },
      },
    });

    let conversationId: string;

    if (existing) {
      conversationId = existing.id;
    } else {
      const conv = await this.prisma.conversation.create({
        data: {
          schoolId,
          subject: dto.subject || 'Direct Communication',
          lastMessageAt: new Date(),
          participants: {
            create: [
              { userId: currentUser.id, lastReadAt: new Date() },
              { userId: dto.recipientId, lastReadAt: null },
            ],
          },
        },
      });
      conversationId = conv.id;
    }

    // Post initial message
    const msg = await this.prisma.directMessage.create({
      data: {
        conversationId,
        senderId: currentUser.id,
        content: dto.initialMessage,
      },
      include: { sender: true },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Alert recipient via notification
    const senderUser = await this.prisma.user.findUnique({ where: { id: currentUser.id } });
    await this.prisma.notification.create({
      data: {
        userId: dto.recipientId,
        schoolId,
        title: `New message from ${senderUser?.firstName || 'User'}`,
        message: dto.initialMessage.substring(0, 100),
        type: NotificationType.INFO,
        link: `/messages?conversationId=${conversationId}`,
        read: false,
      },
    });

    return {
      conversationId,
      message: {
        id: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
        senderName: `${msg.sender.firstName} ${msg.sender.lastName}`,
        senderRole: msg.sender.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      },
    };
  }

  /**
   * Get messages in conversation thread and mark user read.
   */
  async getConversationMessages(
    currentUser: { id: string },
    conversationId: string,
  ) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id,
        },
      },
    });
    if (!participant) {
      throw new ForbiddenException('User is not a participant in this conversation');
    }

    // Mark read
    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });

    const messages = await this.prisma.directMessage.findMany({
      where: { conversationId },
      include: { sender: true },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      senderName: `${m.sender.firstName} ${m.sender.lastName}`,
      senderRole: m.sender.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      isMine: m.senderId === currentUser.id,
    }));
  }

  /**
   * Send a message to an existing conversation.
   */
  async sendMessage(
    currentUser: { id: string },
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: currentUser.id,
        },
      },
      include: { conversation: { include: { participants: true } } },
    });
    if (!participant) {
      throw new ForbiddenException('User is not a participant in this conversation');
    }

    const [msg] = await this.prisma.$transaction([
      this.prisma.directMessage.create({
        data: {
          conversationId,
          senderId: currentUser.id,
          content: dto.content,
        },
        include: { sender: true },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
      this.prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() },
      }),
    ]);

    // Notify other participants
    const others = participant.conversation.participants.filter(
      (p) => p.userId !== currentUser.id,
    );
    for (const other of others) {
      await this.prisma.notification.create({
        data: {
          userId: other.userId,
          schoolId: participant.conversation.schoolId,
          title: `New message from ${msg.sender.firstName}`,
          message: dto.content.substring(0, 100),
          type: NotificationType.INFO,
          link: `/messages?conversationId=${conversationId}`,
          read: false,
        },
      });
    }

    return {
      id: msg.id,
      conversationId: msg.conversationId,
      senderId: msg.senderId,
      senderName: `${msg.sender.firstName} ${msg.sender.lastName}`,
      senderRole: msg.sender.role,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
      isMine: true,
    };
  }

  private formatNotification(n: any) {
    return {
      id: n.id,
      userId: n.userId,
      schoolId: n.schoolId,
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read,
      link: n.link,
      createdAt: n.createdAt ? (typeof n.createdAt === 'string' ? n.createdAt : n.createdAt.toISOString()) : new Date().toISOString(),
    };
  }
}
