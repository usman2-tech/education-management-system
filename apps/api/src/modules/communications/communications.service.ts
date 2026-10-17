/**
 * MODULE: Communications & Messaging - Service (TASK 030)
 *
 * PURPOSE:
 * Provides in-app notification center, read/unread tracking, automated absence alerts,
 * school & class broadcast announcements with preview, and secure direct messaging
 * threads with strict institutional tenant isolation and role-based communication barriers.
 *
 * DEPENDENCIES:
 * PrismaService, UserRole, NotificationType
 *
 * SECURITY:
 * Strict school isolation: prevents cross-school communications.
 * Respects verified parent-child linkages: parents can message teachers of linked children.
 * Teachers can only message students and guardians of their assigned classes.
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
  PreviewAnnouncementDto,
  CreateConversationDto,
  SendMessageDto,
  UpdateNotificationPreferenceDto,
} from './dto/communications.dto';
import { AuthUser } from '@ems/contracts';

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
    currentUser: AuthUser,
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
  async markAsRead(currentUser: AuthUser, notificationId: string) {
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
  async markAllAsRead(currentUser: AuthUser) {
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
        metadata: dto.metadata ? (dto.metadata as any) : undefined,
        read: false,
      },
    });
    return this.formatNotification(notif);
  }

  // ============================================================================
  // ANNOUNCEMENTS & PREVIEW
  // ============================================================================

  /**
   * Preview recipient count and sample list before sending announcement.
   */
  async previewAnnouncement(currentUser: AuthUser, dto: PreviewAnnouncementDto) {
    const schoolId = currentUser.schoolId;
    if (!schoolId && currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Administrator must belong to a school tenant');
    }

    const recipientIds = await this.resolveAnnouncementRecipients(currentUser, dto);
    const sampleUsers = await this.prisma.user.findMany({
      where: { id: { in: recipientIds.slice(0, 5) } },
      select: { id: true, firstName: true, lastName: true, role: true, email: true },
    });

    return {
      recipientCount: recipientIds.length,
      targetRole: dto.targetRole || 'ALL',
      classSectionId: dto.classSectionId,
      sampleRecipients: sampleUsers.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        email: u.email,
      })),
    };
  }

  /**
   * Broadcast announcement to school members with class or role targeting.
   */
  async broadcastAnnouncement(
    currentUser: AuthUser,
    dto: BroadcastAnnouncementDto,
  ) {
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.role !== UserRole.SCHOOL_ADMIN &&
      currentUser.role !== UserRole.TEACHER
    ) {
      throw new ForbiddenException('Only Administrators and Teachers can broadcast announcements');
    }

    const schoolId = currentUser.schoolId;
    if (!schoolId && currentUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Administrator must belong to a school tenant');
    }

    const recipientIds = await this.resolveAnnouncementRecipients(currentUser, dto);

    if (recipientIds.length === 0) {
      return { count: 0, message: 'No recipients matched the broadcast criteria' };
    }

    await this.prisma.notification.createMany({
      data: recipientIds.map((userId) => ({
        userId,
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
        actorEmail: currentUser.email,
        schoolId,
        details: {
          title: dto.title,
          recipientsCount: recipientIds.length,
          targetRole: dto.targetRole || 'ALL',
          classSectionId: dto.classSectionId || null,
        },
      },
    });

    return {
      count: recipientIds.length,
      message: `Announcement broadcast successfully to ${recipientIds.length} users`,
    };
  }

  private async resolveAnnouncementRecipients(
    currentUser: AuthUser,
    filter: { targetRole?: UserRole | string; classSectionId?: string },
  ): Promise<string[]> {
    const schoolId = currentUser.schoolId;

    // If teacher, must target one of their assigned class sections
    if (currentUser.role === UserRole.TEACHER) {
      if (!filter.classSectionId) {
        throw new BadRequestException('Teachers must specify an assigned classSectionId for announcements');
      }

      const assigned = await this.prisma.teacherSubjectAssignment.findFirst({
        where: { teacherId: currentUser.id, sectionId: filter.classSectionId },
      });
      if (!assigned) {
        throw new ForbiddenException('Teachers can only broadcast to classes they are assigned to');
      }

      // Target students in section
      const enrollments = await this.prisma.classEnrollment.findMany({
        where: { sectionId: filter.classSectionId, status: 'ACTIVE' },
        select: { studentId: true },
      });
      const studentIds = enrollments.map((e) => e.studentId);

      if (filter.targetRole === UserRole.PARENT) {
        const guardians = await this.prisma.studentGuardianRelationship.findMany({
          where: { studentId: { in: studentIds }, verificationStatus: 'VERIFIED' },
          select: { guardianId: true },
        });
        return Array.from(new Set(guardians.map((g) => g.guardianId)));
      }

      return Array.from(new Set(studentIds));
    }

    // Admin / Platform Admin logic
    if (filter.classSectionId) {
      const enrollments = await this.prisma.classEnrollment.findMany({
        where: { sectionId: filter.classSectionId, status: 'ACTIVE' },
        select: { studentId: true },
      });
      const studentIds = enrollments.map((e) => e.studentId);

      if (filter.targetRole === UserRole.PARENT) {
        const guardians = await this.prisma.studentGuardianRelationship.findMany({
          where: { studentId: { in: studentIds }, verificationStatus: 'VERIFIED' },
          select: { guardianId: true },
        });
        return Array.from(new Set(guardians.map((g) => g.guardianId)));
      }

      return Array.from(new Set(studentIds));
    }

    const where: any = {};
    if (schoolId) where.schoolId = schoolId;
    if (filter.targetRole && filter.targetRole !== 'ALL' && Object.values(UserRole).includes(filter.targetRole as UserRole)) {
      where.role = filter.targetRole;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  // ============================================================================
  // DIRECT MESSAGING & THREADS
  // ============================================================================

  /**
   * Get authorized recipient contacts for composing a message.
   */
  async getAvailableRecipients(currentUser: AuthUser) {
    const schoolId = currentUser.schoolId;

    if (currentUser.role === UserRole.PLATFORM_ADMIN) {
      // Platform Admin can message any school admin
      const admins = await this.prisma.user.findMany({
        where: { role: UserRole.SCHOOL_ADMIN, isActive: true },
        include: { school: { select: { name: true } } },
      });
      return admins.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        email: u.email,
        context: u.school ? `School Admin - ${u.school.name}` : 'School Admin',
      }));
    }

    if (!schoolId) {
      throw new ForbiddenException('User is not associated with an institutional school tenant');
    }

    if (currentUser.role === UserRole.SCHOOL_ADMIN) {
      // School Admin can message any active user in their school
      const users = await this.prisma.user.findMany({
        where: { schoolId, isActive: true, id: { not: currentUser.id } },
        orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
        take: 150,
      });
      return users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.role,
        email: u.email,
        context: `${u.role.replace('_', ' ')}`,
      }));
    }

    if (currentUser.role === UserRole.TEACHER) {
      // Teacher can message:
      // 1. School Admins in their school
      // 2. Students enrolled in their assigned sections
      // 3. Verified Guardians of those students
      const admins = await this.prisma.user.findMany({
        where: { schoolId, role: UserRole.SCHOOL_ADMIN, isActive: true },
      });

      const assignments = await this.prisma.teacherSubjectAssignment.findMany({
        where: { teacherId: currentUser.id },
        select: { sectionId: true, section: { select: { name: true, schoolClass: { select: { name: true } } } } },
      });
      const sectionIds = Array.from(new Set(assignments.map((a) => a.sectionId)));

      const enrollments = await this.prisma.classEnrollment.findMany({
        where: { sectionId: { in: sectionIds }, status: 'ACTIVE' },
        include: {
          student: true,
          section: { select: { name: true, schoolClass: { select: { name: true } } } },
        },
      });

      const studentIds = Array.from(new Set(enrollments.map((e) => e.studentId)));

      const guardians = await this.prisma.studentGuardianRelationship.findMany({
        where: { studentId: { in: studentIds }, verificationStatus: 'VERIFIED' },
        include: {
          guardian: true,
          student: { select: { firstName: true, lastName: true } },
        },
      });

      const results: any[] = [];
      const seenIds = new Set<string>();

      for (const a of admins) {
        results.push({
          id: a.id,
          name: `${a.firstName} ${a.lastName}`,
          role: a.role,
          email: a.email,
          context: 'School Administration',
        });
        seenIds.add(a.id);
      }

      for (const e of enrollments) {
        if (!seenIds.has(e.student.id)) {
          results.push({
            id: e.student.id,
            name: `${e.student.firstName} ${e.student.lastName}`,
            role: e.student.role,
            email: e.student.email,
            context: `Student - ${e.section.schoolClass.name} (${e.section.name})`,
          });
          seenIds.add(e.student.id);
        }
      }

      for (const g of guardians) {
        if (!seenIds.has(g.guardian.id)) {
          results.push({
            id: g.guardian.id,
            name: `${g.guardian.firstName} ${g.guardian.lastName}`,
            role: g.guardian.role,
            email: g.guardian.email,
            context: `Parent of ${g.student.firstName} ${g.student.lastName}`,
          });
          seenIds.add(g.guardian.id);
        }
      }

      return results;
    }

    if (currentUser.role === UserRole.STUDENT) {
      // Student can message teachers of enrolled classes and school administrators
      const admins = await this.prisma.user.findMany({
        where: { schoolId, role: UserRole.SCHOOL_ADMIN, isActive: true },
      });

      const enrollments = await this.prisma.classEnrollment.findMany({
        where: { studentId: currentUser.id, status: 'ACTIVE' },
        select: { sectionId: true },
      });
      const sectionIds = enrollments.map((e) => e.sectionId);

      const assignments = await this.prisma.teacherSubjectAssignment.findMany({
        where: { sectionId: { in: sectionIds } },
        include: { teacher: true, subject: { select: { name: true } } },
      });

      const results: any[] = [];
      const seenIds = new Set<string>();

      for (const a of admins) {
        results.push({
          id: a.id,
          name: `${a.firstName} ${a.lastName}`,
          role: a.role,
          email: a.email,
          context: 'School Administration',
        });
        seenIds.add(a.id);
      }

      for (const asg of assignments) {
        if (!seenIds.has(asg.teacher.id)) {
          results.push({
            id: asg.teacher.id,
            name: `${asg.teacher.firstName} ${asg.teacher.lastName}`,
            role: asg.teacher.role,
            email: asg.teacher.email,
            context: `Teacher - ${asg.subject.name}`,
          });
          seenIds.add(asg.teacher.id);
        }
      }

      return results;
    }

    if (currentUser.role === UserRole.PARENT) {
      // Parent can message teachers of verified linked children and school administrators
      const admins = await this.prisma.user.findMany({
        where: { schoolId, role: UserRole.SCHOOL_ADMIN, isActive: true },
      });

      const children = await this.prisma.studentGuardianRelationship.findMany({
        where: { guardianId: currentUser.id, verificationStatus: 'VERIFIED' },
        select: { studentId: true, student: { select: { firstName: true, lastName: true } } },
      });
      const studentIds = children.map((c) => c.studentId);

      const enrollments = await this.prisma.classEnrollment.findMany({
        where: { studentId: { in: studentIds }, status: 'ACTIVE' },
        select: { sectionId: true },
      });
      const sectionIds = enrollments.map((e) => e.sectionId);

      const assignments = await this.prisma.teacherSubjectAssignment.findMany({
        where: { sectionId: { in: sectionIds } },
        include: { teacher: true, subject: { select: { name: true } } },
      });

      const results: any[] = [];
      const seenIds = new Set<string>();

      for (const a of admins) {
        results.push({
          id: a.id,
          name: `${a.firstName} ${a.lastName}`,
          role: a.role,
          email: a.email,
          context: 'School Administration',
        });
        seenIds.add(a.id);
      }

      for (const asg of assignments) {
        if (!seenIds.has(asg.teacher.id)) {
          results.push({
            id: asg.teacher.id,
            name: `${asg.teacher.firstName} ${asg.teacher.lastName}`,
            role: asg.teacher.role,
            email: asg.teacher.email,
            context: `Faculty - ${asg.subject.name}`,
          });
          seenIds.add(asg.teacher.id);
        }
      }

      return results;
    }

    return [];
  }

  /**
   * Get all conversation threads for current user with optional tab filter and search.
   */
  async getConversations(
    currentUser: AuthUser,
    type: 'inbox' | 'sent' | 'unread' | 'all' = 'all',
    search?: string,
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

      // Filter by tab type
      if (type === 'unread' && unreadCount === 0) continue;
      if (type === 'sent' && lastMsg && lastMsg.senderId !== currentUser.id) continue;
      if (type === 'inbox' && lastMsg && lastMsg.senderId === currentUser.id && unreadCount === 0) continue;

      // Filter by search query
      if (search) {
        const q = search.toLowerCase();
        const matchesSubject = conv.subject?.toLowerCase().includes(q);
        const matchesContent = lastMsg?.content.toLowerCase().includes(q);
        const matchesParticipant = conv.participants.some(
          (cp) =>
            cp.user.firstName.toLowerCase().includes(q) ||
            cp.user.lastName.toLowerCase().includes(q) ||
            cp.user.email.toLowerCase().includes(q),
        );
        if (!matchesSubject && !matchesContent && !matchesParticipant) continue;
      }

      results.push({
        id: conv.id,
        schoolId: conv.schoolId,
        subject: conv.subject,
        lastMessageAt: conv.lastMessageAt instanceof Date ? conv.lastMessageAt.toISOString() : String(conv.lastMessageAt),
        createdAt: conv.createdAt instanceof Date ? conv.createdAt.toISOString() : String(conv.createdAt),
        unreadCount,
        participants: conv.participants.map((cp) => ({
          userId: cp.userId,
          name: `${cp.user.firstName} ${cp.user.lastName}`,
          email: cp.user.email,
          role: cp.user.role,
          lastReadAt: cp.lastReadAt ? (cp.lastReadAt instanceof Date ? cp.lastReadAt.toISOString() : String(cp.lastReadAt)) : null,
        })),
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              conversationId: lastMsg.conversationId,
              senderId: lastMsg.senderId,
              senderName: `${lastMsg.sender.firstName} ${lastMsg.sender.lastName}`,
              senderRole: lastMsg.sender.role,
              content: lastMsg.content,
              isRead: lastMsg.isRead,
              readAt: lastMsg.readAt ? (lastMsg.readAt instanceof Date ? lastMsg.readAt.toISOString() : String(lastMsg.readAt)) : null,
              createdAt: lastMsg.createdAt instanceof Date ? lastMsg.createdAt.toISOString() : String(lastMsg.createdAt),
            }
          : null,
      });
    }

    return results;
  }

  /**
   * Fast total unread message counter for navigation badge.
   */
  async getUnreadCount(currentUser: AuthUser) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId: currentUser.id },
      select: { conversationId: true, lastReadAt: true },
    });

    let total = 0;
    for (const p of participants) {
      const count = await this.prisma.directMessage.count({
        where: {
          conversationId: p.conversationId,
          createdAt: p.lastReadAt ? { gt: p.lastReadAt } : undefined,
          senderId: { not: currentUser.id },
        },
      });
      total += count;
    }

    return { unreadCount: total };
  }

  /**
   * Start a new conversation or send to existing conversation.
   */
  async createConversation(
    currentUser: AuthUser,
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

    if (currentUser.role === UserRole.TEACHER) {
      if (recipient.role === UserRole.STUDENT) {
        const teacherSections = await this.prisma.teacherSubjectAssignment.findMany({
          where: { teacherId: currentUser.id },
          select: { sectionId: true },
        });
        const sectionIds = teacherSections.map((s) => s.sectionId);
        const enrolled = await this.prisma.classEnrollment.findFirst({
          where: { studentId: recipient.id, sectionId: { in: sectionIds }, status: 'ACTIVE' },
        });
        if (!enrolled) {
          throw new ForbiddenException('Teachers can only message students enrolled in their assigned classes');
        }
      } else if (recipient.role === UserRole.PARENT) {
        const teacherSections = await this.prisma.teacherSubjectAssignment.findMany({
          where: { teacherId: currentUser.id },
          select: { sectionId: true },
        });
        const sectionIds = teacherSections.map((s) => s.sectionId);
        const children = await this.prisma.studentGuardianRelationship.findMany({
          where: { guardianId: recipient.id, verificationStatus: 'VERIFIED' },
          select: { studentId: true },
        });
        const studentIds = children.map((c) => c.studentId);
        const enrolled = await this.prisma.classEnrollment.findFirst({
          where: { studentId: { in: studentIds }, sectionId: { in: sectionIds }, status: 'ACTIVE' },
        });
        if (!enrolled) {
          throw new ForbiddenException('Teachers can only message guardians of students in their assigned classes');
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
    currentUser: AuthUser,
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

    // Mark participant read timestamp
    await this.prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { lastReadAt: new Date() },
    });

    // Mark messages as read
    await this.prisma.directMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: currentUser.id },
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
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
      isRead: m.isRead,
      readAt: m.readAt ? m.readAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
      isMine: m.senderId === currentUser.id,
    }));
  }

  /**
   * Send a message to an existing conversation.
   */
  async sendMessage(
    currentUser: AuthUser,
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
      isRead: false,
      readAt: null,
      createdAt: msg.createdAt.toISOString(),
      isMine: true,
    };
  }

  // ============================================================================
  // NOTIFICATION PREFERENCES
  // ============================================================================

  /**
   * Retrieve notification preferences for an institutional school tenant.
   */
  async getNotificationPreferences(currentUser: AuthUser, explicitSchoolId?: string) {
    const schoolId = explicitSchoolId || currentUser.schoolId;
    if (!schoolId) {
      throw new BadRequestException('Institutional school context is required');
    }

    if (currentUser.role !== UserRole.PLATFORM_ADMIN && currentUser.schoolId !== schoolId) {
      throw new ForbiddenException('Cannot access notification preferences of another school');
    }

    let pref = await this.prisma.notificationPreference.findUnique({
      where: { schoolId },
    });

    if (!pref) {
      pref = await this.prisma.notificationPreference.create({
        data: {
          schoolId,
          absenceAlertsEnabled: true,
          attendanceCorrectionAlertsEnabled: true,
          homeworkAlertsEnabled: true,
          feeAlertsEnabled: true,
          transportAlertsEnabled: true,
          libraryAlertsEnabled: true,
        },
      });
    }

    return pref;
  }

  /**
   * Update notification preferences (School Administrator or Platform Admin).
   */
  async updateNotificationPreferences(
    currentUser: AuthUser,
    dto: UpdateNotificationPreferenceDto,
    explicitSchoolId?: string,
  ) {
    if (
      currentUser.role !== UserRole.PLATFORM_ADMIN &&
      currentUser.role !== UserRole.SCHOOL_ADMIN
    ) {
      throw new ForbiddenException('Only Administrators can modify school notification preferences');
    }

    const schoolId = explicitSchoolId || currentUser.schoolId;
    if (!schoolId) {
      throw new BadRequestException('Institutional school context is required');
    }

    if (currentUser.role !== UserRole.PLATFORM_ADMIN && currentUser.schoolId !== schoolId) {
      throw new ForbiddenException('Cannot modify notification preferences of another school');
    }

    const updated = await this.prisma.notificationPreference.upsert({
      where: { schoolId },
      update: {
        absenceAlertsEnabled: dto.absenceAlertsEnabled,
        attendanceCorrectionAlertsEnabled: dto.attendanceCorrectionAlertsEnabled,
        homeworkAlertsEnabled: dto.homeworkAlertsEnabled,
        feeAlertsEnabled: dto.feeAlertsEnabled,
        transportAlertsEnabled: dto.transportAlertsEnabled,
        libraryAlertsEnabled: dto.libraryAlertsEnabled,
      },
      create: {
        schoolId,
        absenceAlertsEnabled: dto.absenceAlertsEnabled ?? true,
        attendanceCorrectionAlertsEnabled: dto.attendanceCorrectionAlertsEnabled ?? true,
        homeworkAlertsEnabled: dto.homeworkAlertsEnabled ?? true,
        feeAlertsEnabled: dto.feeAlertsEnabled ?? true,
        transportAlertsEnabled: dto.transportAlertsEnabled ?? true,
        libraryAlertsEnabled: dto.libraryAlertsEnabled ?? true,
      },
    });

    return updated;
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
      metadata: n.metadata,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
    };
  }
}
