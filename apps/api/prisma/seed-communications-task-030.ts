/**
 * MODULE: Direct Messaging & Automated Notifications Seed Fixtures (TASK 030)
 *
 * PURPOSE:
 * Seeds realistic, idempotent institutional fixtures for:
 * 1. Notification Preferences (absence alerts, correction alerts, fees, transport, library)
 * 2. 8+ Conversations across Teachers, Parents, Students, and Administrators
 * 3. 16+ Direct Messages with read/unread statuses and timestamps
 * 4. 12+ Notifications (including Student Absence Alerts, Correction Alerts, Announcements, Fee/Transport/Library alerts)
 *
 * IDEMPOTENCY:
 * Checks for existing subjects and metadata to prevent duplication.
 */

import { PrismaClient, UserRole, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Communications & Messaging Seeding (TASK 030) ---');

  const schools = await prisma.school.findMany({
    include: {
      users: true,
    },
  });

  if (schools.length === 0) {
    console.error('No schools found. Please ensure database is seeded first.');
    return;
  }

  const primarySchool = schools[0];
  const schoolId = primarySchool.id;

  // 1. Ensure Notification Preferences exist
  for (const school of schools) {
    await prisma.notificationPreference.upsert({
      where: { schoolId: school.id },
      update: {},
      create: {
        schoolId: school.id,
        absenceAlertsEnabled: true,
        attendanceCorrectionAlertsEnabled: true,
        homeworkAlertsEnabled: true,
        feeAlertsEnabled: true,
        transportAlertsEnabled: true,
        libraryAlertsEnabled: true,
      },
    });
  }
  console.log('Notification preferences initialized for all schools.');

  // 2. Fetch key role users
  const admin = await prisma.user.findFirst({
    where: { schoolId, role: UserRole.SCHOOL_ADMIN },
  }) || (await prisma.user.findFirst({ where: { role: UserRole.PLATFORM_ADMIN } }));

  const teacher = await prisma.user.findFirst({
    where: { schoolId, role: UserRole.TEACHER },
  });

  const students = await prisma.user.findMany({
    where: { schoolId, role: UserRole.STUDENT },
    take: 4,
  });

  const parents = await prisma.user.findMany({
    where: { role: UserRole.PARENT },
    take: 4,
  });

  if (!admin || !teacher || students.length === 0 || parents.length === 0) {
    console.error('Missing required demo users for messaging seed.');
    return;
  }

  const student1 = students[0];
  const student2 = students.length > 1 ? students[1] : students[0];
  const parent1 = parents[0];
  const parent2 = parents.length > 1 ? parents[1] : parents[0];

  // Verify and ensure parent-child relationship for parent1 -> student1
  const existingRel = await prisma.studentGuardianRelationship.findFirst({
    where: {
      studentId: student1.id,
      guardianId: parent1.id,
    },
  });

  if (existingRel) {
    await prisma.studentGuardianRelationship.update({
      where: { id: existingRel.id },
      data: { verificationStatus: 'VERIFIED' },
    });
  } else {
    await prisma.studentGuardianRelationship.create({
      data: {
        studentId: student1.id,
        guardianId: parent1.id,
        relationshipType: 'MOTHER',
        verificationStatus: 'VERIFIED',
      },
    });
  }

  console.log(`Verified relationship established: Parent ${parent1.firstName} -> Student ${student1.firstName}`);

  // 3. Seed Conversations & Messages
  const conversationDefs = [
    {
      subject: 'Q1 Science Curriculum & Laboratory Schedule',
      p1: admin.id,
      p2: teacher.id,
      messages: [
        { senderId: admin.id, content: 'Marcus, please review the finalized lab schedule for the high school science department.', isRead: true },
        { senderId: teacher.id, content: 'Understood. The safety equipment inspection was completed yesterday, and we are ready for next week.', isRead: true },
        { senderId: admin.id, content: 'Excellent. Please submit the consumable inventory report by Friday.', isRead: false },
      ],
    },
    {
      subject: 'Academic Progress & Physics Project Commendation',
      p1: teacher.id,
      p2: parent1.id,
      messages: [
        { senderId: teacher.id, content: `Dear ${parent1.firstName}, I wanted to commend ${student1.firstName} for their outstanding physics presentation today.`, isRead: true },
        { senderId: parent1.id, content: 'Thank you so much Mr. Marcus! He spent all weekend preparing the demonstration.', isRead: true },
        { senderId: teacher.id, content: 'It truly showed. He has strong aptitude for experimental mechanics.', isRead: false },
      ],
    },
    {
      subject: 'Physics Lab Report Submission Confirmation',
      p1: teacher.id,
      p2: student1.id,
      messages: [
        { senderId: student1.id, content: 'Mr. Marcus, I have uploaded the draft for the mechanics lab report.', isRead: true },
        { senderId: teacher.id, content: 'Received, Liam. Your error margin analysis looks thorough. Make sure to reference the textbook equations.', isRead: true },
      ],
    },
    {
      subject: 'Parent-Teacher Council Annual Delegation',
      p1: admin.id,
      p2: parent1.id,
      messages: [
        { senderId: admin.id, content: `Dear ${parent1.firstName}, the school board cordially invites you to the upcoming term council meeting.`, isRead: true },
        { senderId: parent1.id, content: 'Thank you for the invitation. I will gladly attend on Thursday evening.', isRead: false },
      ],
    },
    {
      subject: 'Midterm Examination Proctoring Schedule',
      p1: admin.id,
      p2: teacher.id,
      messages: [
        { senderId: admin.id, content: 'Attached is the proctoring roster for the Grade 10 and 11 midterm examinations.', isRead: true },
        { senderId: teacher.id, content: 'I have verified my slots. Hall B is fully covered.', isRead: true },
      ],
    },
    {
      subject: 'Resource Materials for Chemistry Review',
      p1: teacher.id,
      p2: student2.id,
      messages: [
        { senderId: teacher.id, content: 'Here are the supplementary problem sets for balancing redox reactions.', isRead: true },
        { senderId: student2.id, content: 'Thank you teacher, I will work through them before Wednesday.', isRead: true },
      ],
    },
    {
      subject: 'School Bus Route 4 Schedule Adjustment',
      p1: admin.id,
      p2: parent2.id,
      messages: [
        { senderId: admin.id, content: 'Please note that starting next Monday, morning pickup for Route 4 will be 10 minutes earlier.', isRead: true },
        { senderId: parent2.id, content: 'Acknowledged. We will have our child at the stop by 7:15 AM.', isRead: false },
      ],
    },
    {
      subject: 'Library Book Reservation Inquiries',
      p1: teacher.id,
      p2: parent2.id,
      messages: [
        { senderId: teacher.id, content: 'We noticed your student requested reference books for the upcoming science fair.', isRead: true },
        { senderId: parent2.id, content: 'Yes, thank you. The librarian confirmed the reservation has been held at the front desk.', isRead: true },
      ],
    },
  ];

  let createdConvCount = 0;
  let createdMsgCount = 0;

  for (const def of conversationDefs) {
    let conv = await prisma.conversation.findFirst({
      where: {
        schoolId,
        subject: def.subject,
      },
    });

    if (!conv) {
      conv = await prisma.conversation.create({
        data: {
          schoolId,
          subject: def.subject,
          lastMessageAt: new Date(),
          participants: {
            create: [
              { userId: def.p1, lastReadAt: new Date() },
              { userId: def.p2, lastReadAt: def.messages.some((m) => !m.isRead) ? null : new Date() },
            ],
          },
        },
      });
      createdConvCount++;

      for (const m of def.messages) {
        await prisma.directMessage.create({
          data: {
            conversationId: conv.id,
            senderId: m.senderId,
            content: m.content,
            isRead: m.isRead,
            readAt: m.isRead ? new Date() : null,
          },
        });
        createdMsgCount++;
      }
    }
  }

  console.log(`Seeded ${createdConvCount} conversations and ${createdMsgCount} direct messages.`);

  // 4. Seed Notifications (Absence alerts, correction alerts, announcements, etc.)
  const notifDefs = [
    {
      userId: parent1.id,
      title: 'Student Absence Alert',
      message: `Dear Parent/Guardian,\n\nYour child, ${student1.firstName} ${student1.lastName}, has been marked absent from ${primarySchool.name} on October 16, 2026.\n\nIf you believe this record is incorrect, please contact the school administration.\n\nRegards,\nSchool Administration`,
      type: NotificationType.ATTENDANCE,
      link: '/parent',
      read: false,
      metadata: {
        studentId: student1.id,
        studentName: `${student1.firstName} ${student1.lastName}`,
        alertType: 'ABSENCE',
        attendanceDate: '2026-10-16T08:00:00.000Z',
      },
    },
    {
      userId: parent1.id,
      title: 'Attendance Record Corrected',
      message: `Dear Parent/Guardian,\n\nThe attendance record for your child, ${student1.firstName} ${student1.lastName}, on October 14, 2026 has been updated from ABSENT to EXCUSED.\n\nRegards,\n${primarySchool.name}`,
      type: NotificationType.ATTENDANCE,
      link: '/parent',
      read: true,
      metadata: {
        studentId: student1.id,
        studentName: `${student1.firstName} ${student1.lastName}`,
        alertType: 'CORRECTION',
        newStatus: 'EXCUSED',
      },
    },
    {
      userId: parent1.id,
      title: 'Campus Spring Festival & Science Fair',
      message: 'All parents and guardians are invited to attend the Annual Science Fair on Friday, November 14th in the main auditorium.',
      type: NotificationType.ANNOUNCEMENT,
      link: '/notifications',
      read: false,
    },
    {
      userId: student1.id,
      title: 'Physics Homework Assignment #4 Published',
      message: 'New assignment: Rotational Dynamics Problem Set 4 is now available. Due by Friday 5:00 PM.',
      type: NotificationType.HOMEWORK,
      link: '/homework',
      read: false,
    },
    {
      userId: parent1.id,
      title: 'Tuition Fee Invoice Issued - Term 2',
      message: `A new invoice for Term 2 tuition fees has been generated for ${student1.firstName} ${student1.lastName}. Due date: November 1, 2026.`,
      type: NotificationType.SUBSCRIPTION,
      link: '/fees',
      read: false,
    },
    {
      userId: parent1.id,
      title: 'Transport Route 4 Delay Notification',
      message: `Morning bus route 4 is experiencing a 15-minute delay due to municipal road construction. Student safety is fully maintained.`,
      type: NotificationType.INFO,
      link: '/transport',
      read: true,
    },
    {
      userId: student1.id,
      title: 'Library Book Loan Expiry Reminder',
      message: 'Your borrowed book "Introduction to Electrodynamics" is due for return in 3 days. Renew online or return to the library counter.',
      type: NotificationType.INFO,
      link: '/library',
      read: false,
    },
    {
      userId: teacher.id,
      title: 'Term Faculty Meeting Rescheduled',
      message: 'The departmental coordination meeting has been moved to Wednesday at 3:30 PM in Conference Room B.',
      type: NotificationType.ANNOUNCEMENT,
      link: '/notifications',
      read: true,
    },
    {
      userId: admin.id,
      title: 'Daily Attendance Register Finalized',
      message: 'Grade 10 Section A attendance register for October 16, 2026 has been finalized by Marcus Holloway.',
      type: NotificationType.ATTENDANCE,
      link: '/attendance',
      read: true,
    },
  ];

  let notifCount = 0;
  for (const nd of notifDefs) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId: nd.userId,
        title: nd.title,
      },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          userId: nd.userId,
          schoolId,
          title: nd.title,
          message: nd.message,
          type: nd.type,
          link: nd.link,
          read: nd.read,
          metadata: nd.metadata ? (nd.metadata as any) : undefined,
        },
      });
      notifCount++;
    }
  }

  console.log(`Seeded ${notifCount} institutional notifications.`);
  console.log('--- Communications & Messaging Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Error seeding TASK 030 data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
