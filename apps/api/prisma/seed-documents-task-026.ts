/**
 * MODULE: Institutional Document Intelligence & Automation Seed Fixtures (TASK 026)
 *
 * PURPOSE:
 * Seeds realistic, searchable institutional policy documents, chunked sections,
 * version histories, and administrative notice drafts covering:
 * 1. Attendance Policy
 * 2. Examination Guidelines
 * 3. Teacher Handbook (Staff Only)
 * 4. Student Handbook (Public/Student)
 * 5. Parent Guidelines
 * 6. Transport Safety Policy
 * 7. Library Borrowing Policy
 * 8. Fee Payment Policy
 * 9. Administrative Circular (Admin Only)
 * 10. Sample Document Approval Drafts (DRAFT, PENDING_REVIEW, APPROVED, PUBLISHED)
 *
 * IDEMPOTENCY:
 * Checks for existing document titles before inserting to avoid duplicates.
 */

import {
  PrismaClient,
  UserRole,
  DocumentCategory,
  DocumentProcessingStatus,
  DocumentDraftStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Institutional Document Intelligence Seeding (TASK 026) ---');

  const schools = await prisma.school.findMany();
  if (schools.length === 0) {
    console.error('No schools found. Please ensure database is seeded first.');
    return;
  }

  const primarySchool = schools[0];
  const schoolId = primarySchool.id;

  const admin =
    (await prisma.user.findFirst({ where: { schoolId, role: UserRole.SCHOOL_ADMIN } })) ||
    (await prisma.user.findFirst({ where: { role: UserRole.PLATFORM_ADMIN } }));

  if (!admin) {
    console.error('No administrator user found.');
    return;
  }

  // 1. Definition of 9 realistic institutional documents
  const seedDocs = [
    {
      title: 'Institutional Student Attendance & Punctuality Policy',
      description: 'Comprehensive guidelines on student attendance mandates, morning registration, excused absences, and unexcused absence escalation protocols.',
      category: DocumentCategory.ATTENDANCE_POLICY,
      visibilityRoles: [UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT],
      sections: [
        {
          title: 'Minimum Attendance Requirement',
          pageNumber: 1,
          content: 'All enrolled students must maintain a minimum overall attendance rate of 90% across the academic term to remain eligible for official end-of-term examinations. Attendance below 85% without approved medical certification triggers formal academic review and parent notification.',
        },
        {
          title: 'Daily Registration & Late Arrival',
          pageNumber: 1,
          content: 'Morning roll call is conducted promptly at 08:15 AM in homeroom classrooms. Students arriving between 08:20 AM and 08:45 AM must report to the attendance kiosk to register a Late status. Three unexcused late arrivals in a term are recorded as one half-day unexcused absence.',
        },
        {
          title: 'Absence Reporting Procedure',
          pageNumber: 2,
          content: 'Parents and guardians must report anticipated student absences through the parent portal or by contacting the campus office before 08:00 AM on the day of absence. Written excuse notes or doctor certificates must be submitted within 48 hours of return to transition an unexcused absence to Excused.',
        },
        {
          title: 'Automated Parent Alerts',
          pageNumber: 2,
          content: 'Under TASK 030 messaging protocols, an automated instant SMS and in-app absence alert is dispatched to parents at 09:30 AM whenever a student is marked Absent without prior excuse notice. Guardians can acknowledge the alert directly in the portal.',
        },
      ],
    },
    {
      title: 'Standard Examination & Assessment Guidelines',
      description: 'Institutional regulations governing examination schedules, permitted examination room equipment, grading scales, and academic integrity policies.',
      category: DocumentCategory.EXAMINATION_GUIDELINE,
      visibilityRoles: [UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT],
      sections: [
        {
          title: 'Examination Hall Admission & Timing',
          pageNumber: 1,
          content: 'Candidate admission into the examination hall begins 15 minutes prior to the scheduled start time. Students arriving more than 20 minutes after official exam commencement will not be permitted entry. Students must present their institutional student ID badge upon entry.',
        },
        {
          title: 'Permitted Materials & Calculator Rules',
          pageNumber: 1,
          content: 'Only transparent pencil cases, approved writing implements, and non-programmable scientific calculators without wireless or graphing capabilities are permitted. Programmable calculators, mobile phones, smartwatches, and unauthorized notes are strictly prohibited inside the hall.',
        },
        {
          title: 'Institutional Grading Scale',
          pageNumber: 2,
          content: 'Academic assessments are evaluated using the institutional grading standard: A (90-100% - Excellent), B (80-89% - Good), C (70-79% - Competent), D (60-69% - Passing Threshold), and F (below 60% - Unsatisfactory). Continuous formative assessments constitute 40% of the final grade, with the terminal examination accounting for 60%.',
        },
        {
          title: 'Academic Integrity & Make-up Exams',
          pageNumber: 2,
          content: 'Any communication, copying, or unauthorized material possession results in immediate paper confiscation and an automatic grade of Zero. Make-up examinations are only scheduled for candidates presenting documented medical emergencies verified by the campus health clinic.',
        },
      ],
    },
    {
      title: 'Faculty Operational & Pedagogical Handbook',
      description: 'Confidential staff guidelines on curriculum planning, grading submission deadlines, classroom supervision, and safeguarding protocols.',
      category: DocumentCategory.TEACHER_HANDBOOK,
      visibilityRoles: [UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER], // STAFF ONLY
      sections: [
        {
          title: 'Weekly Lesson Planning Mandate',
          pageNumber: 1,
          content: 'Faculty members must submit structured lesson plans for all assigned courses by Friday 16:00 for the subsequent teaching week. Teachers are encouraged to utilize AI Teacher Copilot for formative quiz blueprints, homework assignment drafts, and differentiated learning adaptations.',
        },
        {
          title: 'Gradebook Entry & Feedback Timeline',
          pageNumber: 1,
          content: 'Assessment marks and homework evaluations must be posted into the electronic gradebook within 5 business days of submission. Qualitative rubric feedback is mandatory for all major summative evaluations.',
        },
        {
          title: 'Student Supervision & Safety',
          pageNumber: 2,
          content: 'Instructors must maintain active continuous supervision during all laboratory sessions, sports activities, and transition intervals. Students are never permitted in science laboratories or workshop areas without authorized faculty present.',
        },
      ],
    },
    {
      title: 'Student Rights, Conduct & Campus Life Handbook',
      description: 'Official student code of conduct, digital device policies, uniform standards, and campus community expectations.',
      category: DocumentCategory.STUDENT_HANDBOOK,
      visibilityRoles: [UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT],
      sections: [
        {
          title: 'Campus Code of Conduct',
          pageNumber: 1,
          content: 'Students are expected to demonstrate mutual respect, institutional integrity, and academic honesty. Bullying, harassment, verbal disrespect, and destruction of campus property are subject to progressive disciplinary sanctions up to suspension.',
        },
        {
          title: 'Personal Digital Device Regulations',
          pageNumber: 1,
          content: 'Personal mobile devices must be switched to silent mode and stored inside student lockers between 08:15 AM and 15:30 PM. In-class device usage is permitted solely when explicitly directed by instructors for academic research or AI Student Tutor study activities.',
        },
        {
          title: 'Institutional Uniform Standard',
          pageNumber: 2,
          content: 'Students must wear the complete institutional uniform consisting of the navy blazer, white collared shirt, and grey trousers or pleated skirt on regular school days. Physical Education attire is permitted exclusively on days with scheduled sports periods.',
        },
      ],
    },
    {
      title: 'Institutional Parent & Guardian Partnership Guidelines',
      description: 'Procedures for campus visits, communication channels with educators, and parent portal access.',
      category: DocumentCategory.PARENT_GUIDELINE,
      visibilityRoles: [UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT],
      sections: [
        {
          title: 'Campus Visitor Protocols',
          pageNumber: 1,
          content: 'For campus security, all visiting parents and guardians must sign in at Gate Security, surrender government photo ID in exchange for a Visitor Badge, and be escorted by campus staff. Unannounced classroom visits during instructional hours are prohibited.',
        },
        {
          title: 'Parent-Teacher Communication Channels',
          pageNumber: 1,
          content: 'Parents can communicate with assigned subject teachers via the in-app Direct Messaging module (TASK 030). Teachers respond during official working hours (08:00 - 16:30, Monday through Friday). Formal Parent-Teacher Conferences are hosted twice per academic year.',
        },
      ],
    },
    {
      title: 'Institutional Transit Fleet & Bus Safety Regulations',
      description: 'Safety protocols for students traveling on institutional bus routes, pickup schedules, and emergency transit procedures.',
      category: DocumentCategory.TRANSPORT_SAFETY_POLICY,
      visibilityRoles: [UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.PARENT, UserRole.STUDENT],
      sections: [
        {
          title: 'Pickup Schedules & Stop Protocol',
          pageNumber: 1,
          content: 'Students must arrive at their designated bus stop 5 minutes prior to the scheduled pickup time. Bus drivers adhere to strict timetable windows and are not authorized to wait beyond 2 minutes past schedule. Parents can view real-time GPS vehicle locations in the transport portal.',
        },
        {
          title: 'On-board Safety & Seatbelts',
          pageNumber: 1,
          content: 'All passengers must remain seated with fastened safety belts throughout transit until the vehicle comes to a complete halt at the school gate. Standing, aisle blocking, shouting, and throwing objects are hazardous and will result in transport suspension.',
        },
        {
          title: 'Emergency Breakdown & Weather Contingency',
          pageNumber: 2,
          content: 'In the event of a mechanical delay or adverse weather event, the transport office dispatches a relief vehicle within 20 minutes and broadcasts automated push notifications to affected parents via the communications system.',
        },
      ],
    },
    {
      title: 'Campus Library Borrowing Rules & Collection Policy',
      description: 'Rules governing library membership, book loan durations, renewal limits, reservation queues, and overdue fines.',
      category: DocumentCategory.LIBRARY_RULE,
      visibilityRoles: [UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT],
      sections: [
        {
          title: 'Borrowing Quotas & Loan Periods',
          pageNumber: 1,
          content: 'Enrolled students may borrow up to 3 books simultaneously for an active loan period of 14 days. Faculty members may borrow up to 8 titles for a 30-day period. Reference books, current periodicals, and designated exam past papers must remain in the reading room.',
        },
        {
          title: 'Book Renewals & Reservations',
          pageNumber: 1,
          content: 'A loan may be renewed once for an additional 7 days provided no other user has placed an active reservation hold on the title. Reservations can be placed through the portal and are held at the circulation desk for 3 school days.',
        },
        {
          title: 'Overdue Fines & Lost Book Policies',
          pageNumber: 2,
          content: 'A daily overdue fine of $1.00 is assessed per book following a 2-day grace period, up to a maximum cap of $50.00. Lost or damaged books require replacement cost reimbursement plus a $10.00 administrative cataloging fee.',
        },
      ],
    },
    {
      title: 'Tuition Structure, Invoicing & Fee Payment Regulations',
      description: 'Comprehensive financial policies regarding tuition billing terms, payment deadlines, sibling discounts, and fee arrears.',
      category: DocumentCategory.FEE_POLICY,
      visibilityRoles: [UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PARENT],
      sections: [
        {
          title: 'Billing Cycles & Due Dates',
          pageNumber: 1,
          content: 'Tuition invoices are generated on the 15th of the preceding month and are due in full on the 5th of each calendar month. Payments can be submitted via debit/credit card, electronic bank wire, or direct cash payment at the bursar cashier desk.',
        },
        {
          title: 'Sibling Discounts & Scholarships',
          pageNumber: 1,
          content: 'Families with two or more concurrently enrolled children receive a 10% sibling concession on tuition for the second child and 15% for subsequent children. Merit and need-based scholarships require annual re-verification of academic standing.',
        },
        {
          title: 'Late Fees & Payment Recovery',
          pageNumber: 2,
          content: 'Accounts with balances unpaid 14 days past the due date incur a 5% administrative late surcharge. Unresolved fee arrears exceeding 45 days may result in suspension of non-academic elective services until financial clearance is obtained.',
        },
      ],
    },
    {
      title: 'Internal Administrative Circular: Campus Operational Schedule',
      description: 'Restricted administrative briefing on internal term scheduling, building maintenance, and confidential staff reviews.',
      category: DocumentCategory.ADMINISTRATIVE_CIRCULAR,
      visibilityRoles: [UserRole.PLATFORM_ADMIN, UserRole.SCHOOL_ADMIN], // ADMIN ONLY
      sections: [
        {
          title: 'Quarterly Infrastructure Audit',
          pageNumber: 1,
          content: 'Internal campus security audits, HVAC maintenance, and server room equipment inspections are scheduled for the final weekend of each academic term. Keycard access will be temporarily restricted during maintenance windows.',
        },
        {
          title: 'Confidential Staff Appraisal Cycle',
          pageNumber: 1,
          content: 'Annual faculty peer reviews and administrative performance evaluations are conducted in the second term. Department heads must submit sealed performance dossiers to the Principal office.',
        },
      ],
    },
  ];

  let docsCreated = 0;

  for (const doc of seedDocs) {
    const existing = await prisma.institutionalDocument.findFirst({
      where: { title: doc.title, schoolId },
    });

    if (existing) {
      console.log(`Document already exists: "${doc.title}"`);
      continue;
    }

    const fullContent = doc.sections.map((s) => `## ${s.title}\n${s.content}`).join('\n\n');

    await prisma.institutionalDocument.create({
      data: {
        schoolId,
        title: doc.title,
        description: doc.description,
        category: doc.category,
        documentType: 'TXT',
        fileUrl: `/storage/documents/sample-${doc.category.toLowerCase().replace(/_/g, '-')}.txt`,
        fileSize: Buffer.byteLength(fullContent, 'utf8'),
        version: 1,
        status: DocumentProcessingStatus.READY,
        isPublished: true,
        visibilityRoles: doc.visibilityRoles,
        uploadedById: admin.id,
        sections: {
          create: doc.sections.map((s, idx) => ({
            sectionIndex: idx + 1,
            title: s.title,
            content: s.content,
            pageNumber: s.pageNumber,
            tokenCount: Math.round(s.content.length / 4),
          })),
        },
        versions: {
          create: {
            versionNumber: 1,
            fileUrl: `/storage/documents/sample-${doc.category.toLowerCase().replace(/_/g, '-')}.txt`,
            fileSize: Buffer.byteLength(fullContent, 'utf8'),
            changeSummary: 'Official institutional adoption and cataloging',
            uploadedById: admin.id,
          },
        },
      },
    });

    docsCreated++;
    console.log(`Created document: "${doc.title}" (${doc.category}) with ${doc.sections.length} sections`);
  }

  // 2. Seed realistic sample administrative drafts in different states
  const examDoc = await prisma.institutionalDocument.findFirst({
    where: { category: DocumentCategory.EXAMINATION_GUIDELINE, schoolId },
  });

  const sampleDrafts = [
    {
      subject: 'Notice: Upcoming Term Examination Schedule & Instructions',
      body: 'Dear Parents and Students,\n\nPlease review the official examination guidelines for the upcoming terminal assessments starting next Monday at 08:30 AM. Non-programmable calculators and student ID badges are mandatory.\n\nSincerely,\nAcademic Administration',
      category: 'NOTICE',
      targetRole: 'PARENT',
      status: DocumentDraftStatus.APPROVED,
      sourceDocumentId: examDoc?.id,
      approvedById: admin.id,
      approvedAt: new Date(),
    },
    {
      subject: 'Important: Tuition Fee Payment Reminder for Current Month',
      body: 'Dear Parents,\n\nThis is a friendly reminder that tuition fees for the current month are due by the 5th. Please utilize the parent portal payment gateway or visit the bursar cashier desk to settle any outstanding balances.\n\nThank you,\nFinance Department',
      category: 'FEE_REMINDER',
      targetRole: 'PARENT',
      status: DocumentDraftStatus.PENDING_REVIEW,
      approvedById: null,
      approvedAt: null,
    },
    {
      subject: 'Transit Notice: Route 4 Schedule Adjustment',
      body: 'Dear Parents and Student Riders,\n\nPlease note that morning pickup for Route 4 will begin 10 minutes earlier starting tomorrow due to municipal road resurfacing near the campus north entrance.\n\nTransportation Office',
      category: 'TRANSPORT_ALERT',
      targetRole: 'ALL',
      status: DocumentDraftStatus.DRAFT,
      approvedById: null,
      approvedAt: null,
    },
    {
      subject: 'Library Notice: Overdue Books Return Drive',
      body: 'Dear Students and Faculty,\n\nAll library loans past the 14-day limit should be returned to the circulation desk by Friday. Standard daily fines are temporarily waived during this return drive.\n\nCampus Library',
      category: 'LIBRARY_NOTICE',
      targetRole: 'ALL',
      status: DocumentDraftStatus.PUBLISHED,
      approvedById: admin.id,
      approvedAt: new Date(Date.now() - 86400000),
      publishedAt: new Date(Date.now() - 86400000),
      publishedAnnouncementId: 'broadcast-seed-1',
    },
  ];

  let draftsCreated = 0;
  for (const draft of sampleDrafts) {
    const existing = await prisma.documentApprovalDraft.findFirst({
      where: { subject: draft.subject, schoolId },
    });

    if (existing) continue;

    await prisma.documentApprovalDraft.create({
      data: {
        schoolId,
        authorId: admin.id,
        sourceDocumentId: draft.sourceDocumentId || null,
        category: draft.category,
        targetRole: draft.targetRole,
        subject: draft.subject,
        body: draft.body,
        status: draft.status,
        approvedById: draft.approvedById,
        approvedAt: draft.approvedAt,
        publishedAt: draft.publishedAt,
        publishedAnnouncementId: draft.publishedAnnouncementId,
        version: 1,
        history: [
          {
            action: 'INITIAL_SEED',
            actorId: admin.id,
            timestamp: new Date().toISOString(),
            status: draft.status,
          },
        ] as any,
      },
    });
    draftsCreated++;
  }

  console.log(`--- Seeding complete: ${docsCreated} documents, ${draftsCreated} drafts created ---`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
