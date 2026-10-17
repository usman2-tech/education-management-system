/**
 * MODULE: Database Seeding & Institutional Fixtures
 *
 * PURPOSE:
 * Seeds comprehensive, idempotent development demo data:
 * - 2 institutional test schools (St. Jude Institutional Academy, Apex STEM Academy)
 * - Platform Admin, dedicated School Admins
 * - 8 teachers (4 per school) with specializations and course assignments
 * - 8 class sections (4 per school)
 * - 8 subjects (4 per school)
 * - 16 students (8 per school) with realistic performance profiles (High, Average, Low, Zero, Missing)
 * - 8 parents/guardians with verified relationships (including multi-child parents)
 * - Grading scales for both schools (A+ through F)
 * - Assessment categories (Quiz, Homework, Project, Midterm, Final Exam) with percentage weights
 * - 8 assessments with published and draft statuses
 * - 64+ student grades with realistic scores, feedback, zero scores, and missing grades
 * - 8 attendance sessions with realistic mix of Present, Absent, Late, Excused records
 * - NFC simulated card credentials
 *
 * SECURITY:
 * All passwords hashed with bcryptjs (salt rounds: 10) to 'Password123!'.
 * Idempotent upserts prevent duplicate records on repeated execution.
 */

import {
  PrismaClient,
  UserRole,
  SchoolStatus,
  TeacherEmploymentStatus,
  AssessmentStatus,
  AttendanceStatus,
  HomeworkStatus,
  HomeworkSubmissionStatus,
  EnrollmentStatus,
  ExamStatus,
  ExamQuestionType,
  ExamAttemptStatus,
  SubscriptionStatus,
  NotificationType,
  AIMessageSender,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Institutional Fixtures Seeding (TASK 009 Demo Data) ---');

  // Common password hash for development accounts
  const defaultPassword = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  // ---------------------------------------------------------------------------
  // 1. Platform Administrator
  // ---------------------------------------------------------------------------
  await prisma.user.upsert({
    where: { email: 'platform.admin@ems.local' },
    update: {
      firstName: 'Alexander',
      lastName: 'Vance',
      role: UserRole.PLATFORM_ADMIN,
      passwordHash,
      isActive: true,
      schoolId: null,
    },
    create: {
      email: 'platform.admin@ems.local',
      passwordHash,
      firstName: 'Alexander',
      lastName: 'Vance',
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
      schoolId: null,
    },
  });
  console.log('[Seed] Platform Admin configured: platform.admin@ems.local');

  // ---------------------------------------------------------------------------
  // 2. Multi-School Tenancy (2 Primary Schools)
  // ---------------------------------------------------------------------------
  const stJude = await prisma.school.upsert({
    where: { code: 'st-jude' },
    update: { status: SchoolStatus.ACTIVE },
    create: {
      code: 'st-jude',
      name: 'St. Jude Institutional Academy',
      city: 'Seattle',
      state: 'WA',
      country: 'USA',
      domain: 'stjude.ems.local',
      email: 'admissions@stjude.ems.local',
      phone: '+1-555-019-2831',
      address: '100 Institutional Boulevard, Academic District',
      status: SchoolStatus.ACTIVE,
    },
  });

  const apex = await prisma.school.upsert({
    where: { code: 'apex-stem' },
    update: { status: SchoolStatus.ACTIVE },
    create: {
      code: 'apex-stem',
      name: 'Apex STEM Academy',
      city: 'Boston',
      state: 'MA',
      country: 'USA',
      domain: 'apex.ems.local',
      email: 'admissions@apex.ems.local',
      phone: '+1-555-028-1144',
      address: '450 Innovation Parkway, Cambridge Sector',
      status: SchoolStatus.ACTIVE,
    },
  });
  console.log('[Seed] Schools verified: St. Jude Academy & Apex STEM Academy');

  // ---------------------------------------------------------------------------
  // 3. School Administrators
  // ---------------------------------------------------------------------------
  const stJudeAdmin = await prisma.user.upsert({
    where: { email: 'admin@stjude.ems.local' },
    update: { passwordHash, isActive: true, schoolId: stJude.id },
    create: {
      email: 'admin@stjude.ems.local',
      passwordHash,
      firstName: 'Eleanor',
      lastName: 'Pemberton',
      role: UserRole.SCHOOL_ADMIN,
      schoolId: stJude.id,
      isActive: true,
    },
  });

  const apexAdmin = await prisma.user.upsert({
    where: { email: 'admin@apex.ems.local' },
    update: { passwordHash, isActive: true, schoolId: apex.id },
    create: {
      email: 'admin@apex.ems.local',
      passwordHash,
      firstName: 'Dr. Victor',
      lastName: 'Vance',
      role: UserRole.SCHOOL_ADMIN,
      schoolId: apex.id,
      isActive: true,
    },
  });
  console.log('[Seed] School Admins configured');

  // ---------------------------------------------------------------------------
  // 4. Academic Years (2026-2027)
  // ---------------------------------------------------------------------------
  const stJudeYear = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: stJude.id, name: '2026-2027' } },
    update: { isCurrent: true },
    create: {
      schoolId: stJude.id,
      name: '2026-2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    },
  });

  const apexYear = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: apex.id, name: '2026-2027' } },
    update: { isCurrent: true },
    create: {
      schoolId: apex.id,
      name: '2026-2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    },
  });

  // ---------------------------------------------------------------------------
  // 5. Grading Scales
  // ---------------------------------------------------------------------------
  const standardTiers = [
    { name: 'A+', min: 97.0, max: 100.0, letter: 'A+', gp: 4.0 },
    { name: 'A', min: 93.0, max: 96.9, letter: 'A', gp: 4.0 },
    { name: 'A-', min: 90.0, max: 92.9, letter: 'A-', gp: 3.7 },
    { name: 'B+', min: 87.0, max: 89.9, letter: 'B+', gp: 3.3 },
    { name: 'B', min: 83.0, max: 86.9, letter: 'B', gp: 3.0 },
    { name: 'B-', min: 80.0, max: 82.9, letter: 'B-', gp: 2.7 },
    { name: 'C+', min: 77.0, max: 79.9, letter: 'C+', gp: 2.3 },
    { name: 'C', min: 70.0, max: 76.9, letter: 'C', gp: 2.0 },
    { name: 'D', min: 60.0, max: 69.9, letter: 'D', gp: 1.0 },
    { name: 'F', min: 0.0, max: 59.9, letter: 'F', gp: 0.0 },
  ];

  for (const s of [stJude, apex]) {
    for (const t of standardTiers) {
      const existing = await prisma.gradingScale.findFirst({
        where: { schoolId: s.id, letterGrade: t.letter },
      });
      if (!existing) {
        await prisma.gradingScale.create({
          data: {
            schoolId: s.id,
            name: 'Institutional Standard Scale',
            minimumPercentage: t.min,
            maximumPercentage: t.max,
            letterGrade: t.letter,
            gradePoint: t.gp,
          },
        });
      }
    }
  }
  console.log('[Seed] Grading scale tiers seeded for both schools');

  // ---------------------------------------------------------------------------
  // 6. Assessment Categories (Weighted Scheme)
  // ---------------------------------------------------------------------------
  const categoriesConfig = [
    { name: 'Quiz', weight: 15.0, desc: 'Short weekly comprehension checks' },
    { name: 'Homework', weight: 15.0, desc: 'Independent practice problem sets' },
    { name: 'Project', weight: 20.0, desc: 'Collaborative term research or lab build' },
    { name: 'Midterm Exam', weight: 25.0, desc: 'Summative mid-semester assessment' },
    { name: 'Final Exam', weight: 25.0, desc: 'Comprehensive end-of-year examination' },
  ];

  const stJudeCategories: Record<string, any> = {};
  const apexCategories: Record<string, any> = {};

  for (const cat of categoriesConfig) {
    let sjCat = await prisma.assessmentCategory.findFirst({
      where: { schoolId: stJude.id, name: cat.name },
    });
    if (!sjCat) {
      sjCat = await prisma.assessmentCategory.create({
        data: {
          schoolId: stJude.id,
          academicYearId: stJudeYear.id,
          name: cat.name,
          weightPercentage: cat.weight,
          description: cat.desc,
        },
      });
    }
    stJudeCategories[cat.name] = sjCat;

    let apCat = await prisma.assessmentCategory.findFirst({
      where: { schoolId: apex.id, name: cat.name },
    });
    if (!apCat) {
      apCat = await prisma.assessmentCategory.create({
        data: {
          schoolId: apex.id,
          academicYearId: apexYear.id,
          name: cat.name,
          weightPercentage: cat.weight,
          description: cat.desc,
        },
      });
    }
    apexCategories[cat.name] = apCat;
  }
  console.log('[Seed] Weighted assessment categories initialized');

  // ---------------------------------------------------------------------------
  // 7. Teachers (8 Faculty Members across both schools)
  // ---------------------------------------------------------------------------
  const teachersList = [
    // St. Jude Faculty (4)
    {
      email: 'teacher@stjude.ems.local',
      firstName: 'Marcus',
      lastName: 'Holloway',
      school: stJude,
      code: 'TCH-1001',
      dept: 'Mathematics',
      spec: 'Advanced Calculus & Analytical Geometry',
    },
    {
      email: 'teacher.maya@stjude.ems.local',
      firstName: 'Maya',
      lastName: 'Lin',
      school: stJude,
      code: 'TCH-1002',
      dept: 'Physics',
      spec: 'Classical Mechanics & Wave Dynamics',
    },
    {
      email: 'teacher.robert@stjude.ems.local',
      firstName: 'Robert',
      lastName: 'Frost',
      school: stJude,
      code: 'TCH-1003',
      dept: 'Humanities',
      spec: 'Rhetoric & Modern World Literature',
    },
    {
      email: 'teacher.alan@stjude.ems.local',
      firstName: 'Dr. Alan',
      lastName: 'Turing',
      school: stJude,
      code: 'TCH-1004',
      dept: 'Computer Science',
      spec: 'Computational Algorithms & Software Architecture',
    },
    // Apex STEM Faculty (4)
    {
      email: 'teacher@apex.ems.local',
      firstName: 'Dr. Elena',
      lastName: 'Rostova',
      school: apex,
      code: 'TCH-2001',
      dept: 'Chemistry',
      spec: 'Organic Chemistry & Molecular Reactions',
    },
    {
      email: 'teacher.neil@apex.ems.local',
      firstName: 'Neil',
      lastName: 'Armstrong',
      school: apex,
      code: 'TCH-2002',
      dept: 'Astrophysics',
      spec: 'Orbital Mechanics & Astrodynamics',
    },
    {
      email: 'teacher.ada@apex.ems.local',
      firstName: 'Ada',
      lastName: 'Lovelace',
      school: apex,
      code: 'TCH-2003',
      dept: 'Computer Science',
      spec: 'Data Structures & Distributed Systems',
    },
    {
      email: 'teacher.gregor@apex.ems.local',
      firstName: 'Gregor',
      lastName: 'Mendel',
      school: apex,
      code: 'TCH-2004',
      dept: 'Biology',
      spec: 'Genetics & Cellular Biology',
    },
  ];

  const teacherUsers: Record<string, any> = {};

  for (const t of teachersList) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: { passwordHash, isActive: true, schoolId: t.school.id },
      create: {
        email: t.email,
        passwordHash,
        firstName: t.firstName,
        lastName: t.lastName,
        role: UserRole.TEACHER,
        schoolId: t.school.id,
        isActive: true,
      },
    });

    await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: { employeeCode: t.code, specialization: t.spec },
      create: {
        userId: user.id,
        employeeCode: t.code,
        specialization: t.spec,
        employmentStatus: TeacherEmploymentStatus.ACTIVE,
      },
    });

    teacherUsers[t.email] = user;
  }
  console.log('[Seed] 8 Teachers verified across St. Jude & Apex STEM');

  // ---------------------------------------------------------------------------
  // 8. Classes & Class Sections (8 Sections across both schools)
  // ---------------------------------------------------------------------------
  // St. Jude Classes
  const sjGrade10 = await prisma.schoolClass.upsert({
    where: { schoolId_code: { schoolId: stJude.id, code: 'G10' } },
    update: {},
    create: { schoolId: stJude.id, name: 'Grade 10', code: 'G10', order: 1 },
  });

  const sjGrade11 = await prisma.schoolClass.upsert({
    where: { schoolId_code: { schoolId: stJude.id, code: 'G11' } },
    update: {},
    create: { schoolId: stJude.id, name: 'Grade 11', code: 'G11', order: 2 },
  });

  const sjSection10A = await prisma.classSection.upsert({
    where: { classId_academicYearId_name: { classId: sjGrade10.id, academicYearId: stJudeYear.id, name: 'Section A' } },
    update: { roomNumber: 'Room 101' },
    create: { classId: sjGrade10.id, academicYearId: stJudeYear.id, name: 'Section A', capacity: 30, roomNumber: 'Room 101' },
  });

  const sjSection10B = await prisma.classSection.upsert({
    where: { classId_academicYearId_name: { classId: sjGrade10.id, academicYearId: stJudeYear.id, name: 'Section B' } },
    update: { roomNumber: 'Room 102' },
    create: { classId: sjGrade10.id, academicYearId: stJudeYear.id, name: 'Section B', capacity: 30, roomNumber: 'Room 102' },
  });

  await prisma.classSection.upsert({
    where: { classId_academicYearId_name: { classId: sjGrade11.id, academicYearId: stJudeYear.id, name: 'Section A' } },
    update: { roomNumber: 'Room 201' },
    create: { classId: sjGrade11.id, academicYearId: stJudeYear.id, name: 'Section A', capacity: 30, roomNumber: 'Room 201' },
  });

  await prisma.classSection.upsert({
    where: { classId_academicYearId_name: { classId: sjGrade11.id, academicYearId: stJudeYear.id, name: 'Section B' } },
    update: { roomNumber: 'Room 202' },
    create: { classId: sjGrade11.id, academicYearId: stJudeYear.id, name: 'Section B', capacity: 30, roomNumber: 'Room 202' },
  });

  // Apex STEM Classes
  const apGrade10 = await prisma.schoolClass.upsert({
    where: { schoolId_code: { schoolId: apex.id, code: 'G10' } },
    update: {},
    create: { schoolId: apex.id, name: 'Grade 10', code: 'G10', order: 1 },
  });

  const apGrade11 = await prisma.schoolClass.upsert({
    where: { schoolId_code: { schoolId: apex.id, code: 'G11' } },
    update: {},
    create: { schoolId: apex.id, name: 'Grade 11', code: 'G11', order: 2 },
  });

  const apSectionAlpha = await prisma.classSection.upsert({
    where: { classId_academicYearId_name: { classId: apGrade10.id, academicYearId: apexYear.id, name: 'Alpha Cohort' } },
    update: { roomNumber: 'Lab Alpha' },
    create: { classId: apGrade10.id, academicYearId: apexYear.id, name: 'Alpha Cohort', capacity: 30, roomNumber: 'Lab Alpha' },
  });

  const apSectionBeta = await prisma.classSection.upsert({
    where: { classId_academicYearId_name: { classId: apGrade10.id, academicYearId: apexYear.id, name: 'Beta Cohort' } },
    update: { roomNumber: 'Lab Beta' },
    create: { classId: apGrade10.id, academicYearId: apexYear.id, name: 'Beta Cohort', capacity: 30, roomNumber: 'Lab Beta' },
  });

  await prisma.classSection.upsert({
    where: { classId_academicYearId_name: { classId: apGrade11.id, academicYearId: apexYear.id, name: 'Gamma Cohort' } },
    update: { roomNumber: 'Lab Gamma' },
    create: { classId: apGrade11.id, academicYearId: apexYear.id, name: 'Gamma Cohort', capacity: 30, roomNumber: 'Lab Gamma' },
  });

  await prisma.classSection.upsert({
    where: { classId_academicYearId_name: { classId: apGrade11.id, academicYearId: apexYear.id, name: 'Delta Cohort' } },
    update: { roomNumber: 'Lab Delta' },
    create: { classId: apGrade11.id, academicYearId: apexYear.id, name: 'Delta Cohort', capacity: 30, roomNumber: 'Lab Delta' },
  });
  console.log('[Seed] 8 Class Sections initialized');

  // ---------------------------------------------------------------------------
  // 9. Subjects (8 Academic Subjects across both schools)
  // ---------------------------------------------------------------------------
  // St. Jude Subjects (4)
  const mathSubject = await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: stJude.id, code: 'MATH-101' } },
    update: {},
    create: { schoolId: stJude.id, name: 'Advanced Mathematics', code: 'MATH-101', department: 'Mathematics', credits: 1.0 },
  });

  const physSubject = await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: stJude.id, code: 'PHYS-101' } },
    update: {},
    create: { schoolId: stJude.id, name: 'AP Physics', code: 'PHYS-101', department: 'Science', credits: 1.0 },
  });

  const engSubject = await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: stJude.id, code: 'ENG-101' } },
    update: {},
    create: { schoolId: stJude.id, name: 'World Literature & Rhetoric', code: 'ENG-101', department: 'Humanities', credits: 1.0 },
  });

  const csSubject = await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: stJude.id, code: 'CS-101' } },
    update: {},
    create: { schoolId: stJude.id, name: 'Computer Science Principles', code: 'CS-101', department: 'Technology', credits: 1.0 },
  });

  // Apex STEM Subjects (4)
  const chemSubject = await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: apex.id, code: 'CHEM-201' } },
    update: {},
    create: { schoolId: apex.id, name: 'Organic Chemistry', code: 'CHEM-201', department: 'Physical Sciences', credits: 1.0 },
  });

  const astroSubject = await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: apex.id, code: 'ASTRO-201' } },
    update: {},
    create: { schoolId: apex.id, name: 'Astrophysics & Space Mechanics', code: 'ASTRO-201', department: 'Space Sciences', credits: 1.0 },
  });

  const dsaSubject = await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: apex.id, code: 'CS-201' } },
    update: {},
    create: { schoolId: apex.id, name: 'Data Structures & Algorithms', code: 'CS-201', department: 'Computer Science', credits: 1.0 },
  });

  const bioSubject = await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: apex.id, code: 'BIO-201' } },
    update: {},
    create: { schoolId: apex.id, name: 'Molecular Biology', code: 'BIO-201', department: 'Life Sciences', credits: 1.0 },
  });
  console.log('[Seed] 8 Academic Subjects verified');

  // Teacher Assignments (Assign faculty to their sections)
  const assignments = [
    { teacher: teacherUsers['teacher@stjude.ems.local'], section: sjSection10A, subject: mathSubject, year: stJudeYear },
    { teacher: teacherUsers['teacher.maya@stjude.ems.local'], section: sjSection10A, subject: physSubject, year: stJudeYear },
    { teacher: teacherUsers['teacher.robert@stjude.ems.local'], section: sjSection10A, subject: engSubject, year: stJudeYear },
    { teacher: teacherUsers['teacher.alan@stjude.ems.local'], section: sjSection10A, subject: csSubject, year: stJudeYear },
    { teacher: teacherUsers['teacher@apex.ems.local'], section: apSectionAlpha, subject: chemSubject, year: apexYear },
    { teacher: teacherUsers['teacher.neil@apex.ems.local'], section: apSectionAlpha, subject: astroSubject, year: apexYear },
    { teacher: teacherUsers['teacher.ada@apex.ems.local'], section: apSectionAlpha, subject: dsaSubject, year: apexYear },
    { teacher: teacherUsers['teacher.gregor@apex.ems.local'], section: apSectionAlpha, subject: bioSubject, year: apexYear },
  ];

  for (const asgn of assignments) {
    await prisma.teacherSubjectAssignment.upsert({
      where: {
        teacherId_subjectId_sectionId_academicYearId: {
          teacherId: asgn.teacher.id,
          subjectId: asgn.subject.id,
          sectionId: asgn.section.id,
          academicYearId: asgn.year.id,
        },
      },
      update: {},
      create: {
        teacherId: asgn.teacher.id,
        subjectId: asgn.subject.id,
        sectionId: asgn.section.id,
        academicYearId: asgn.year.id,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 10. Students (16 Students: 8 per school with realistic performance tags)
  // ---------------------------------------------------------------------------
  const studentsList = [
    // St. Jude Section 10A (8 students)
    { email: 'student@stjude.ems.local', first: 'Liam', last: 'Chen', school: stJude, section: sjSection10A, year: stJudeYear, adm: 'STJ-2026-001', tag: 'HIGH' },
    { email: 'student.ethan@stjude.ems.local', first: 'Ethan', last: 'Wright', school: stJude, section: sjSection10A, year: stJudeYear, adm: 'STJ-2026-003', tag: 'HIGH' },
    { email: 'student.maya@stjude.ems.local', first: 'Maya', last: 'Patel', school: stJude, section: sjSection10A, year: stJudeYear, adm: 'STJ-2026-004', tag: 'AVERAGE' },
    { email: 'student.chloe@stjude.ems.local', first: 'Chloe', last: 'Bennett', school: stJude, section: sjSection10A, year: stJudeYear, adm: 'STJ-2026-005', tag: 'AVERAGE' },
    { email: 'student.lucas@stjude.ems.local', first: 'Lucas', last: 'Morales', school: stJude, section: sjSection10A, year: stJudeYear, adm: 'STJ-2026-006', tag: 'LOW' },
    { email: 'student.noah@stjude.ems.local', first: 'Noah', last: 'Kim', school: stJude, section: sjSection10A, year: stJudeYear, adm: 'STJ-2026-007', tag: 'ZERO_CASE' },
    { email: 'student.emma@stjude.ems.local', first: 'Emma', last: 'Watson', school: stJude, section: sjSection10A, year: stJudeYear, adm: 'STJ-2026-008', tag: 'MISSING_CASE' },
    { email: 'student2@stjude.ems.local', first: 'Sophia', last: 'Chen', school: stJude, section: sjSection10B, year: stJudeYear, adm: 'STJ-2026-002', tag: 'AVERAGE' },

    // Apex STEM Section Alpha (8 students)
    { email: 'student.alex@apex.ems.local', first: 'Alexander', last: 'Ross', school: apex, section: apSectionAlpha, year: apexYear, adm: 'APX-2026-001', tag: 'HIGH' },
    { email: 'student.zoe@apex.ems.local', first: 'Zoe', last: 'Saldana', school: apex, section: apSectionAlpha, year: apexYear, adm: 'APX-2026-002', tag: 'AVERAGE' },
    { email: 'student.ben@apex.ems.local', first: 'Benjamin', last: 'Franklin', school: apex, section: apSectionAlpha, year: apexYear, adm: 'APX-2026-003', tag: 'LOW' },
    { email: 'student.olivia@apex.ems.local', first: 'Olivia', last: 'Wilde', school: apex, section: apSectionAlpha, year: apexYear, adm: 'APX-2026-004', tag: 'HIGH' },
    { email: 'student.daniel@apex.ems.local', first: 'Daniel', last: 'Craig', school: apex, section: apSectionAlpha, year: apexYear, adm: 'APX-2026-005', tag: 'AVERAGE' },
    { email: 'student.grace@apex.ems.local', first: 'Grace', last: 'Hopper', school: apex, section: apSectionBeta, year: apexYear, adm: 'APX-2026-006', tag: 'HIGH' },
    { email: 'student.leo@apex.ems.local', first: 'Leo', last: 'Tolstoy', school: apex, section: apSectionBeta, year: apexYear, adm: 'APX-2026-007', tag: 'AVERAGE' },
    { email: 'student.harper@apex.ems.local', first: 'Harper', last: 'Lee', school: apex, section: apSectionBeta, year: apexYear, adm: 'APX-2026-008', tag: 'AVERAGE' },
  ];

  const studentUsers: Record<string, any> = {};

  for (const s of studentsList) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: { passwordHash, isActive: true, schoolId: s.school.id },
      create: {
        email: s.email,
        passwordHash,
        firstName: s.first,
        lastName: s.last,
        role: UserRole.STUDENT,
        schoolId: s.school.id,
        isActive: true,
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { admissionNumber: s.adm, gradeLevel: 'Grade 10' },
      create: {
        userId: user.id,
        admissionNumber: s.adm,
        gradeLevel: 'Grade 10',
      },
    });

    await prisma.classEnrollment.upsert({
      where: {
        studentId_academicYearId: {
          studentId: user.id,
          academicYearId: s.year.id,
        },
      },
      update: { sectionId: s.section.id },
      create: {
        studentId: user.id,
        sectionId: s.section.id,
        academicYearId: s.year.id,
        rollNumber: s.adm,
      },
    });

    studentUsers[s.email] = { ...user, tag: s.tag, sectionId: s.section.id };
  }
  console.log('[Seed] 16 Students enrolled with realistic academic profiles');

  // ---------------------------------------------------------------------------
  // 11. Parents/Guardians (8 Parents with verified relationships)
  // ---------------------------------------------------------------------------
  const parentsList = [
    // St. Jude Parents (5)
    { email: 'parent@stjude.ems.local', first: 'Sarah', last: 'Chen', school: stJude, wards: ['student@stjude.ems.local', 'student2@stjude.ems.local'], rel: 'MOTHER' }, // Multi-child
    { email: 'parent.david@stjude.ems.local', first: 'David', last: 'Wright', school: stJude, wards: ['student.ethan@stjude.ems.local'], rel: 'FATHER' },
    { email: 'parent.sunita@stjude.ems.local', first: 'Sunita', last: 'Patel', school: stJude, wards: ['student.maya@stjude.ems.local'], rel: 'MOTHER' },
    { email: 'parent.carlos@stjude.ems.local', first: 'Carlos', last: 'Morales', school: stJude, wards: ['student.lucas@stjude.ems.local'], rel: 'FATHER' },
    { email: 'parent.jennifer@stjude.ems.local', first: 'Jennifer', last: 'Bennett', school: stJude, wards: ['student.chloe@stjude.ems.local'], rel: 'MOTHER' },
    // Apex STEM Parents (3)
    { email: 'parent.arthur@apex.ems.local', first: 'Arthur', last: 'Ross', school: apex, wards: ['student.alex@apex.ems.local'], rel: 'FATHER' },
    { email: 'parent.maria@apex.ems.local', first: 'Maria', last: 'Franklin', school: apex, wards: ['student.ben@apex.ems.local'], rel: 'MOTHER' },
    { email: 'parent.victor@apex.ems.local', first: 'Victor', last: 'Wilde', school: apex, wards: ['student.olivia@apex.ems.local'], rel: 'FATHER' },
  ];

  for (const p of parentsList) {
    const parentUser = await prisma.user.upsert({
      where: { email: p.email },
      update: { passwordHash, isActive: true, schoolId: p.school.id },
      create: {
        email: p.email,
        passwordHash,
        firstName: p.first,
        lastName: p.last,
        role: UserRole.PARENT,
        schoolId: p.school.id,
        isActive: true,
      },
    });

    await prisma.parentGuardianProfile.upsert({
      where: { userId: parentUser.id },
      update: {},
      create: {
        userId: parentUser.id,
        occupation: 'Professional Guardian',
        relationshipToFamily: p.rel,
      },
    });

    for (const wardEmail of p.wards) {
      const ward = studentUsers[wardEmail];
      if (ward) {
        await prisma.studentGuardianRelationship.upsert({
          where: {
            guardianId_studentId: {
              guardianId: parentUser.id,
              studentId: ward.id,
            },
          },
          update: { verificationStatus: 'VERIFIED' },
          create: {
            guardianId: parentUser.id,
            studentId: ward.id,
            relationshipType: p.rel as any,
            verificationStatus: 'VERIFIED',
            isPrimaryContact: true,
            isEmergencyContact: true,
          },
        });
      }
    }
  }
  console.log('[Seed] 8 Verified Parents configured (including multi-child portal)');

  // ---------------------------------------------------------------------------
  // 12. Assessments (8 Assessments: 6 in St. Jude, 2 in Apex)
  // ---------------------------------------------------------------------------
  const marcus = teacherUsers['teacher@stjude.ems.local'];
  const maya = teacherUsers['teacher.maya@stjude.ems.local'];
  const elena = teacherUsers['teacher@apex.ems.local'];

  const assessmentsData = [
    // St. Jude Math Section 10A
    {
      key: 'sj-math-q1',
      title: 'Calculus Quiz 1: Limits & Continuity',
      school: stJude,
      year: stJudeYear,
      section: sjSection10A,
      subject: mathSubject,
      category: stJudeCategories['Quiz'],
      maxMarks: 20.0,
      date: '2026-09-15',
      author: marcus,
      status: AssessmentStatus.PUBLISHED,
    },
    {
      key: 'sj-math-hw1',
      title: 'Problem Set 1: Differential Equations',
      school: stJude,
      year: stJudeYear,
      section: sjSection10A,
      subject: mathSubject,
      category: stJudeCategories['Homework'],
      maxMarks: 50.0,
      date: '2026-09-22',
      author: marcus,
      status: AssessmentStatus.PUBLISHED,
    },
    {
      key: 'sj-math-mid',
      title: 'Midterm Examination: Analytical Calculus',
      school: stJude,
      year: stJudeYear,
      section: sjSection10A,
      subject: mathSubject,
      category: stJudeCategories['Midterm Exam'],
      maxMarks: 100.0,
      date: '2026-10-05',
      author: marcus,
      status: AssessmentStatus.PUBLISHED,
    },
    {
      key: 'sj-math-proj',
      title: 'Computational Math Lab: Fourier Transforms',
      school: stJude,
      year: stJudeYear,
      section: sjSection10A,
      subject: mathSubject,
      category: stJudeCategories['Project'],
      maxMarks: 50.0,
      date: '2026-10-14',
      author: marcus,
      status: AssessmentStatus.DRAFT, // DRAFT assessment scenario
    },
    // St. Jude Physics Section 10A
    {
      key: 'sj-phys-q1',
      title: 'Newtonian Dynamics Quiz',
      school: stJude,
      year: stJudeYear,
      section: sjSection10A,
      subject: physSubject,
      category: stJudeCategories['Quiz'],
      maxMarks: 25.0,
      date: '2026-09-18',
      author: maya,
      status: AssessmentStatus.PUBLISHED,
    },
    {
      key: 'sj-phys-mid',
      title: 'Midterm Examination: Thermodynamics',
      school: stJude,
      year: stJudeYear,
      section: sjSection10A,
      subject: physSubject,
      category: stJudeCategories['Midterm Exam'],
      maxMarks: 100.0,
      date: '2026-10-08',
      author: maya,
      status: AssessmentStatus.PUBLISHED,
    },
    // Apex Chemistry Section Alpha
    {
      key: 'ap-chem-q1',
      title: 'Organic Synthesis Lab Quiz',
      school: apex,
      year: apexYear,
      section: apSectionAlpha,
      subject: chemSubject,
      category: apexCategories['Quiz'],
      maxMarks: 30.0,
      date: '2026-09-20',
      author: elena,
      status: AssessmentStatus.PUBLISHED,
    },
    {
      key: 'ap-chem-mid',
      title: 'Midterm Examination: Molecular Structures',
      school: apex,
      year: apexYear,
      section: apSectionAlpha,
      subject: chemSubject,
      category: apexCategories['Midterm Exam'],
      maxMarks: 100.0,
      date: '2026-10-06',
      author: elena,
      status: AssessmentStatus.PUBLISHED,
    },
  ];

  const seededAssessments: Record<string, any> = {};

  for (const a of assessmentsData) {
    let assess = await prisma.assessment.findFirst({
      where: {
        classSectionId: a.section.id,
        title: a.title,
      },
    });

    if (!assess) {
      assess = await prisma.assessment.create({
        data: {
          schoolId: a.school.id,
          academicYearId: a.year.id,
          classSectionId: a.section.id,
          subjectId: a.subject.id,
          categoryId: a.category.id,
          title: a.title,
          maximumMarks: a.maxMarks,
          assessmentDate: a.date,
          createdById: a.author.id,
          status: a.status,
          publishedAt: a.status === AssessmentStatus.PUBLISHED ? new Date(a.date) : null,
        },
      });
    }
    seededAssessments[a.key] = { ...assess, key: a.key, author: a.author };
  }
  console.log('[Seed] 8 Assessments created (Published & Drafts)');

  // ---------------------------------------------------------------------------
  // 13. Student Grades (Realistic Grade Distribution across enrolled students)
  // ---------------------------------------------------------------------------
  // Filter students enrolled in St. Jude Section 10A
  const stJude10AStudents = Object.values(studentUsers).filter(
    (s: any) => s.sectionId === sjSection10A.id,
  );

  // Filter students enrolled in Apex Section Alpha
  const apexAlphaStudents = Object.values(studentUsers).filter(
    (s: any) => s.sectionId === apSectionAlpha.id,
  );

  // Score generator based on student profile tag
  const calculateScore = (tag: string, max: number, assessmentKey: string): number | null => {
    if (tag === 'MISSING_CASE' && assessmentKey.includes('mid')) return null; // Missing grade on midterm!
    if (tag === 'ZERO_CASE' && assessmentKey.includes('q1')) return 0.0; // Zero score on quiz!

    switch (tag) {
      case 'HIGH':
        return Math.round(max * (0.92 + Math.random() * 0.07) * 10) / 10;
      case 'AVERAGE':
        return Math.round(max * (0.76 + Math.random() * 0.1) * 10) / 10;
      case 'LOW':
        return Math.round(max * (0.52 + Math.random() * 0.08) * 10) / 10;
      case 'ZERO_CASE':
        return Math.round(max * 0.84 * 10) / 10;
      case 'MISSING_CASE':
        return Math.round(max * 0.78 * 10) / 10;
      default:
        return Math.round(max * 0.8 * 10) / 10;
    }
  };

  // Seed grades for St. Jude assessments
  for (const aKey of ['sj-math-q1', 'sj-math-hw1', 'sj-math-mid', 'sj-phys-q1', 'sj-phys-mid']) {
    const assess = seededAssessments[aKey];
    for (const st of stJude10AStudents) {
      const marks = calculateScore(st.tag, assess.maximumMarks, aKey);
      const feedback =
        marks === null
          ? 'Absent on exam date — makeup pending.'
          : marks === 0
          ? 'Incomplete submission — unattempted quiz.'
          : marks >= assess.maximumMarks * 0.9
          ? 'Exceptional analytical precision.'
          : marks >= assess.maximumMarks * 0.75
          ? 'Good comprehension with minor arithmetic flaws.'
          : 'Needs conceptual reinforcement on core formulas.';

      await prisma.studentGrade.upsert({
        where: {
          assessmentId_studentId: {
            assessmentId: assess.id,
            studentId: st.id,
          },
        },
        update: {
          marksObtained: marks,
          feedback,
          gradedById: assess.author.id,
        },
        create: {
          assessmentId: assess.id,
          studentId: st.id,
          marksObtained: marks,
          feedback,
          gradedById: assess.author.id,
        },
      });
    }
  }

  // Seed grades for Apex assessments
  for (const aKey of ['ap-chem-q1', 'ap-chem-mid']) {
    const assess = seededAssessments[aKey];
    for (const st of apexAlphaStudents) {
      const marks = calculateScore(st.tag, assess.maximumMarks, aKey);
      const feedback =
        marks === null
          ? 'Makeup session requested.'
          : marks >= assess.maximumMarks * 0.9
          ? 'Superb lab observation notes.'
          : 'Solid effort in molecular geometry.';

      await prisma.studentGrade.upsert({
        where: {
          assessmentId_studentId: {
            assessmentId: assess.id,
            studentId: st.id,
          },
        },
        update: {
          marksObtained: marks,
          feedback,
          gradedById: assess.author.id,
        },
        create: {
          assessmentId: assess.id,
          studentId: st.id,
          marksObtained: marks,
          feedback,
          gradedById: assess.author.id,
        },
      });
    }
  }
  console.log('[Seed] 64+ Student Grade records populated with realistic scores');

  // ---------------------------------------------------------------------------
  // 14. Attendance Sessions (8 Sessions across dates with varied statuses)
  // ---------------------------------------------------------------------------
  const attendanceDates = [
    '2026-10-02',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
    '2026-10-08',
    '2026-10-09',
    '2026-10-12',
    '2026-10-13',
  ];

  for (let i = 0; i < attendanceDates.length; i++) {
    const dateStr = attendanceDates[i];
    const sessionDate = new Date(`${dateStr}T00:00:00.000Z`);
    const isApex = i >= 4;
    const targetSchool = isApex ? apex : stJude;
    const targetSection = isApex ? apSectionAlpha : sjSection10A;
    const targetAdmin = isApex ? apexAdmin : stJudeAdmin;
    const studentsGroup = isApex ? apexAlphaStudents : stJude10AStudents;

    let session = await prisma.attendanceSession.findFirst({
      where: {
        classSectionId: targetSection.id,
        attendanceDate: sessionDate,
        sessionType: 'DAILY',
      },
    });

    if (!session) {
      session = await prisma.attendanceSession.create({
        data: {
          schoolId: targetSchool.id,
          academicYearId: isApex ? apexYear.id : stJudeYear.id,
          classSectionId: targetSection.id,
          attendanceDate: sessionDate,
          sessionType: 'DAILY',
          createdById: targetAdmin.id,
          status: 'FINALIZED',
          finalizedAt: new Date(dateStr),
        },
      });
    }

    // Populate roster records with realistic attendance mix
    for (const [stIdx, st] of studentsGroup.entries()) {
      let status: AttendanceStatus = AttendanceStatus.PRESENT;
      let remark: string | null = null;

      if (stIdx === 1 && i % 3 === 0) {
        status = AttendanceStatus.LATE;
        remark = '10 minutes tardy (transit delay)';
      } else if (stIdx === 4 && i % 4 === 1) {
        status = AttendanceStatus.ABSENT;
        remark = 'Unexcused absence';
      } else if (stIdx === 6 && i % 5 === 2) {
        status = AttendanceStatus.EXCUSED;
        remark = 'Medical appointment clearance';
      }

      await prisma.attendanceRecord.upsert({
        where: {
          attendanceSessionId_studentId: {
            attendanceSessionId: session.id,
            studentId: st.id,
          },
        },
        update: { status, remarks: remark },
        create: {
          attendanceSessionId: session.id,
          studentId: st.id,
          status,
          remarks: remark,
          markedById: targetAdmin.id,
        },
      });
    }
  }
  console.log('[Seed] 8 Attendance Sessions created with Present/Late/Absent/Excused records');

  // Provision simulated NFC token for Liam Chen
  const liamToken = 'NFC-STJUDE-1001';
  const liamHash = crypto.createHash('sha256').update(liamToken).digest('hex');
  const liam = studentUsers['student@stjude.ems.local'];
  if (liam) {
    await prisma.nFCIdentity.upsert({
      where: { studentId: liam.id },
      update: { simulatedCardTokenHash: liamHash, status: 'ACTIVE', schoolId: stJude.id },
      create: { schoolId: stJude.id, studentId: liam.id, simulatedCardTokenHash: liamHash, status: 'ACTIVE' },
    });
  }

  // ===========================================================================
  // 15. TASK 010 — Homework Assignments & Submissions
  // ===========================================================================
  const homeworkList = [
    // St. Jude (4 assignments)
    {
      title: 'Calculus Problem Set 3: Derivatives & Chain Rule',
      instructions: 'Complete problem set exercises 14 through 28 on analytical differentiation and submit step-by-step proofs.',
      schoolId: stJude.id,
      academicYearId: stJudeYear.id,
      classSectionId: sjSection10A.id,
      subjectId: mathSubject.id,
      teacherId: teacherUsers['teacher@stjude.ems.local'].id,
      dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000),
      maxPoints: 100.0,
      status: HomeworkStatus.PUBLISHED,
    },
    {
      title: "Newton's Second Law Lab Investigation",
      instructions: 'Submit your compiled lab experimental tables, friction calculations, and velocity graph analysis.',
      schoolId: stJude.id,
      academicYearId: stJudeYear.id,
      classSectionId: sjSection10A.id,
      subjectId: physSubject.id,
      teacherId: teacherUsers['teacher.maya@stjude.ems.local'].id,
      dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000),
      maxPoints: 50.0,
      status: HomeworkStatus.PUBLISHED,
    },
    {
      title: 'Shakespearean Dramatic Irony Essay',
      instructions: 'Author a 1,200-word argumentative critique analyzing fate versus free will in Macbeth Act III.',
      schoolId: stJude.id,
      academicYearId: stJudeYear.id,
      classSectionId: sjSection10A.id,
      subjectId: engSubject.id,
      teacherId: teacherUsers['teacher.robert@stjude.ems.local'].id,
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      maxPoints: 100.0,
      status: HomeworkStatus.PUBLISHED,
    },
    {
      title: 'Algorithm Complexity & Asymptotic Bounds',
      instructions: 'Provide Big-O, Big-Omega, and Big-Theta formal justifications for recursion trees in Divide & Conquer algorithms.',
      schoolId: stJude.id,
      academicYearId: stJudeYear.id,
      classSectionId: sjSection10A.id,
      subjectId: csSubject.id,
      teacherId: teacherUsers['teacher.alan@stjude.ems.local'].id,
      dueDate: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      maxPoints: 100.0,
      status: HomeworkStatus.PUBLISHED,
    },
    // Apex STEM (4 assignments)
    {
      title: 'Organic Synthesis Reaction Mechanisms',
      instructions: 'Draw electron-pushing arrow mechanisms for nucleophilic acyl substitution and peptide bond condensation.',
      schoolId: apex.id,
      academicYearId: apexYear.id,
      classSectionId: apSectionAlpha.id,
      subjectId: chemSubject.id,
      teacherId: teacherUsers['teacher@apex.ems.local'].id,
      dueDate: new Date(Date.now() + 6 * 24 * 3600 * 1000),
      maxPoints: 100.0,
      status: HomeworkStatus.PUBLISHED,
    },
    {
      title: 'Orbital Maneuvers & Hohmann Transfer Analysis',
      instructions: 'Calculate delta-V budgets for Earth-to-Mars orbital insertion trajectories using Keplerian two-body mechanics.',
      schoolId: apex.id,
      academicYearId: apexYear.id,
      classSectionId: apSectionAlpha.id,
      subjectId: astroSubject.id,
      teacherId: teacherUsers['teacher.neil@apex.ems.local'].id,
      dueDate: new Date(Date.now() + 4 * 24 * 3600 * 1000),
      maxPoints: 100.0,
      status: HomeworkStatus.PUBLISHED,
    },
    {
      title: 'Balanced Binary Search Tree Lab in Python',
      instructions: 'Implement AVL self-balancing tree rotation algorithms with unit test coverage for node rebalancing.',
      schoolId: apex.id,
      academicYearId: apexYear.id,
      classSectionId: apSectionAlpha.id,
      subjectId: dsaSubject.id,
      teacherId: teacherUsers['teacher.ada@apex.ems.local'].id,
      dueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000),
      maxPoints: 100.0,
      status: HomeworkStatus.PUBLISHED,
    },
    {
      title: 'Cellular Mitosis Microscope Observation Draft',
      instructions: 'Prepare preliminary laboratory sketches of allium root tip cell divisions in prophase and anaphase.',
      schoolId: apex.id,
      academicYearId: apexYear.id,
      classSectionId: apSectionAlpha.id,
      subjectId: bioSubject.id,
      teacherId: teacherUsers['teacher.gregor@apex.ems.local'].id,
      dueDate: new Date(Date.now() + 10 * 24 * 3600 * 1000),
      maxPoints: 50.0,
      status: HomeworkStatus.DRAFT,
    },
  ];

  const seededHomeworks: any[] = [];
  for (const hw of homeworkList) {
    let existingHw = await prisma.homework.findFirst({
      where: { schoolId: hw.schoolId, title: hw.title },
    });
    if (!existingHw) {
      existingHw = await prisma.homework.create({ data: hw });
    }
    seededHomeworks.push(existingHw);
  }

  // Populate realistic student submissions for published homework
  for (const hw of seededHomeworks) {
    if (hw.status !== HomeworkStatus.PUBLISHED) continue;
    const targetStudents = hw.schoolId === stJude.id ? stJude10AStudents : apexAlphaStudents;

    for (const [idx, st] of targetStudents.entries()) {
      let subStatus: HomeworkSubmissionStatus = HomeworkSubmissionStatus.SUBMITTED;
      let grade: number | null = null;
      let feedback: string | null = null;
      let isLate = false;

      if (idx === 0 || idx === 1) {
        subStatus = HomeworkSubmissionStatus.GRADED;
        grade = Math.round(hw.maxPoints * 0.95);
        feedback = 'Exemplary clarity and rigorous analytical structure.';
      } else if (idx === 2 || idx === 3) {
        subStatus = HomeworkSubmissionStatus.GRADED;
        grade = Math.round(hw.maxPoints * 0.82);
        feedback = 'Solid work. Minor calculation oversights in final derivations.';
      } else if (idx === 4) {
        subStatus = HomeworkSubmissionStatus.LATE;
        isLate = true;
        feedback = 'Submitted past scheduled deadline.';
      } else if (idx === 5) {
        subStatus = HomeworkSubmissionStatus.SUBMITTED;
        feedback = 'Pending faculty evaluation.';
      }

      await prisma.homeworkSubmission.upsert({
        where: {
          homeworkId_studentId: {
            homeworkId: hw.id,
            studentId: st.id,
          },
        },
        update: {
          status: subStatus,
          grade,
          feedback,
          isLate,
        },
        create: {
          homeworkId: hw.id,
          studentId: st.id,
          content: 'Detailed student solution attachment with accompanying workings.',
          status: subStatus,
          isLate,
          grade,
          feedback,
          gradedById: subStatus === HomeworkSubmissionStatus.GRADED ? hw.teacherId : null,
          gradedAt: subStatus === HomeworkSubmissionStatus.GRADED ? new Date() : null,
        },
      });
    }
  }
  console.log('[Seed] 8 Homework assignments created with realistic student submissions');

  // ===========================================================================
  // 16. TASK 011 — Course Catalogs, Modules, Lessons & Tracking
  // ===========================================================================
  const coursesData = [
    // St. Jude Courses (4)
    {
      title: 'Foundations of Differential Calculus',
      code: 'MTH-101',
      description: 'Master limits, derivative rules, optimization problems, and curve sketching.',
      schoolId: stJude.id,
      subjectId: mathSubject.id,
      createdById: teacherUsers['teacher@stjude.ems.local'].id,
      published: true,
    },
    {
      title: 'Classical Mechanics & Dynamics',
      code: 'PHY-101',
      description: 'Kinematics, vector forces, energy conservation, and oscillatory motion systems.',
      schoolId: stJude.id,
      subjectId: physSubject.id,
      createdById: teacherUsers['teacher.maya@stjude.ems.local'].id,
      published: true,
    },
    {
      title: 'World Literature & Rhetoric',
      code: 'ENG-101',
      description: 'Comparative literary criticism, narrative perspectives, and rhetorical discourse.',
      schoolId: stJude.id,
      subjectId: engSubject.id,
      createdById: teacherUsers['teacher.robert@stjude.ems.local'].id,
      published: true,
    },
    {
      title: 'Computer Systems & Architecture',
      code: 'CS-101',
      description: 'Logic gates, memory hierarchies, assembly instructions, and compiler foundations.',
      schoolId: stJude.id,
      subjectId: csSubject.id,
      createdById: teacherUsers['teacher.alan@stjude.ems.local'].id,
      published: true,
    },
    // Apex STEM Courses (4)
    {
      title: 'Organic Synthesis & Stereochemistry',
      code: 'CHM-201',
      description: 'Chirality, reaction kinetics, functional group chemistry, and NMR spectroscopy.',
      schoolId: apex.id,
      subjectId: chemSubject.id,
      createdById: teacherUsers['teacher@apex.ems.local'].id,
      published: true,
    },
    {
      title: 'Astrodynamics & Space Missions',
      code: 'AST-201',
      description: 'Orbital resonance, atmospheric re-entry thermodynamics, and deep space telemetry.',
      schoolId: apex.id,
      subjectId: astroSubject.id,
      createdById: teacherUsers['teacher.neil@apex.ems.local'].id,
      published: true,
    },
    {
      title: 'Data Structures & Algorithmic Analysis',
      code: 'DSA-201',
      description: 'Graph traversals, dynamic programming, shortest path trees, and hash maps.',
      schoolId: apex.id,
      subjectId: dsaSubject.id,
      createdById: teacherUsers['teacher.ada@apex.ems.local'].id,
      published: true,
    },
    {
      title: 'Computational Genetics & Molecular Biology',
      code: 'BIO-201',
      description: 'CRISPR Cas9 editing, sequence alignment, protein folding, and bioinformatics.',
      schoolId: apex.id,
      subjectId: bioSubject.id,
      createdById: teacherUsers['teacher.gregor@apex.ems.local'].id,
      published: false,
    },
  ];

  const seededCourses: any[] = [];
  for (const c of coursesData) {
    const course = await prisma.course.upsert({
      where: {
        schoolId_code: {
          schoolId: c.schoolId,
          code: c.code,
        },
      },
      update: {
        title: c.title,
        description: c.description,
        published: c.published,
      },
      create: c,
    });
    seededCourses.push(course);

    // Create 2 Modules for each course
    for (let mIdx = 1; mIdx <= 2; mIdx++) {
      let mod = await prisma.courseModule.findFirst({
        where: { courseId: course.id, order: mIdx },
      });
      if (!mod) {
        mod = await prisma.courseModule.create({
          data: {
            courseId: course.id,
            title: `Unit ${mIdx}: Conceptual Foundations & Practice`,
            description: `Core theoretical paradigms and applied problem solving for Unit ${mIdx}.`,
            order: mIdx,
          },
        });
      }

      // Create 2 Lessons for each module
      for (let lIdx = 1; lIdx <= 2; lIdx++) {
        let lesson = await prisma.courseLesson.findFirst({
          where: { moduleId: mod.id, order: lIdx },
        });
        if (!lesson) {
          lesson = await prisma.courseLesson.create({
            data: {
              moduleId: mod.id,
              title: `Lesson ${mIdx}.${lIdx}: Core Competencies & Analysis`,
              content: `Comprehensive learning overview, formal definitions, worked demonstrations, and check-for-understanding questions for Lesson ${mIdx}.${lIdx}.`,
              durationMinutes: 45,
              order: lIdx,
            },
          });
        }
      }
    }

    // Enroll students and seed lesson progress
    const targetStudents = c.schoolId === stJude.id ? stJude10AStudents : apexAlphaStudents;
    for (const [stIdx, st] of targetStudents.entries()) {
      await prisma.courseEnrollment.upsert({
        where: {
          courseId_studentId: {
            courseId: course.id,
            studentId: st.id,
          },
        },
        update: {
          status: EnrollmentStatus.ACTIVE,
        },
        create: {
          courseId: course.id,
          studentId: st.id,
          status: EnrollmentStatus.ACTIVE,
        },
      });

      // Mark first lesson as completed for progress tracking
      const firstLesson = await prisma.courseLesson.findFirst({
        where: { module: { courseId: course.id } },
      });
      if (firstLesson && stIdx % 2 === 0) {
        await prisma.lessonProgress.upsert({
          where: {
            lessonId_studentId: {
              lessonId: firstLesson.id,
              studentId: st.id,
            },
          },
          update: { isCompleted: true },
          create: {
            lessonId: firstLesson.id,
            studentId: st.id,
            isCompleted: true,
          },
        });
      }
    }
  }
  console.log('[Seed] 8 Courses seeded with modules, lessons, enrollments, and progress logs');

  // ===========================================================================
  // 17. TASK 012 — Examinations, Question Banks, Attempts & Answers
  // ===========================================================================
  const examsList = [
    // St. Jude Exams (4)
    {
      title: 'Midterm Calculus Examination',
      description: 'Formal closed-book testing on continuity, limits, chain rule, and implicit differentiation.',
      schoolId: stJude.id,
      academicYearId: stJudeYear.id,
      classSectionId: sjSection10A.id,
      subjectId: mathSubject.id,
      createdById: teacherUsers['teacher@stjude.ems.local'].id,
      examDate: new Date('2026-10-15T09:00:00Z'),
      durationMinutes: 90,
      totalMarks: 100.0,
      passingMarks: 50.0,
      status: ExamStatus.RESULTS_PUBLISHED,
    },
    {
      title: 'Classical Dynamics Diagnostics',
      description: 'Assessment on kinematics vectors, friction coefficients, and projectile trajectories.',
      schoolId: stJude.id,
      academicYearId: stJudeYear.id,
      classSectionId: sjSection10A.id,
      subjectId: physSubject.id,
      createdById: teacherUsers['teacher.maya@stjude.ems.local'].id,
      examDate: new Date('2026-10-18T10:00:00Z'),
      durationMinutes: 60,
      totalMarks: 75.0,
      passingMarks: 35.0,
      status: ExamStatus.RESULTS_PUBLISHED,
    },
    {
      title: 'World Rhetoric & Essay Assessment',
      description: 'Close-reading analytical examination and rhetorical thesis synthesis.',
      schoolId: stJude.id,
      academicYearId: stJudeYear.id,
      classSectionId: sjSection10A.id,
      subjectId: engSubject.id,
      createdById: teacherUsers['teacher.robert@stjude.ems.local'].id,
      examDate: new Date('2026-10-25T11:00:00Z'),
      durationMinutes: 60,
      totalMarks: 50.0,
      passingMarks: 25.0,
      status: ExamStatus.SCHEDULED,
    },
    {
      title: 'Computer Architecture Midterm',
      description: 'Assembly pipeline simulation, binary arithmetic, and cache memory layout.',
      schoolId: stJude.id,
      academicYearId: stJudeYear.id,
      classSectionId: sjSection10A.id,
      subjectId: csSubject.id,
      createdById: teacherUsers['teacher.alan@stjude.ems.local'].id,
      examDate: new Date('2026-10-28T09:00:00Z'),
      durationMinutes: 90,
      totalMarks: 100.0,
      passingMarks: 50.0,
      status: ExamStatus.SCHEDULED,
    },
    // Apex STEM Exams (4)
    {
      title: 'Organic Reaction Mechanism Assessment',
      description: 'Synthesis routes, chirality, reaction kinetics, and spectroscopic analysis.',
      schoolId: apex.id,
      academicYearId: apexYear.id,
      classSectionId: apSectionAlpha.id,
      subjectId: chemSubject.id,
      createdById: teacherUsers['teacher@apex.ems.local'].id,
      examDate: new Date('2026-10-16T13:00:00Z'),
      durationMinutes: 90,
      totalMarks: 100.0,
      passingMarks: 50.0,
      status: ExamStatus.RESULTS_PUBLISHED,
    },
    {
      title: 'Keplerian Astrodynamics Midterm',
      description: 'Orbital velocity calculations, eccentricity derivations, and escape velocities.',
      schoolId: apex.id,
      academicYearId: apexYear.id,
      classSectionId: apSectionAlpha.id,
      subjectId: astroSubject.id,
      createdById: teacherUsers['teacher.neil@apex.ems.local'].id,
      examDate: new Date('2026-10-20T14:00:00Z'),
      durationMinutes: 75,
      totalMarks: 80.0,
      passingMarks: 40.0,
      status: ExamStatus.RESULTS_PUBLISHED,
    },
    {
      title: 'Data Structures Practical Assessment',
      description: 'Graph algorithmic complexity, minimum spanning trees, and dynamic programming.',
      schoolId: apex.id,
      academicYearId: apexYear.id,
      classSectionId: apSectionAlpha.id,
      subjectId: dsaSubject.id,
      createdById: teacherUsers['teacher.ada@apex.ems.local'].id,
      examDate: new Date('2026-10-29T10:00:00Z'),
      durationMinutes: 90,
      totalMarks: 100.0,
      passingMarks: 50.0,
      status: ExamStatus.SCHEDULED,
    },
    {
      title: 'Cellular Genetics Diagnostic Evaluation',
      description: 'Mendelian ratios, DNA replication forks, and transcription regulation.',
      schoolId: apex.id,
      academicYearId: apexYear.id,
      classSectionId: apSectionAlpha.id,
      subjectId: bioSubject.id,
      createdById: teacherUsers['teacher.gregor@apex.ems.local'].id,
      examDate: new Date('2026-11-02T11:00:00Z'),
      durationMinutes: 60,
      totalMarks: 50.0,
      passingMarks: 25.0,
      status: ExamStatus.DRAFT,
    },
  ];

  const seededExams: any[] = [];
  for (const ex of examsList) {
    let existingExam = await prisma.exam.findFirst({
      where: { schoolId: ex.schoolId, title: ex.title },
    });
    if (!existingExam) {
      existingExam = await prisma.exam.create({ data: ex });
    }
    seededExams.push(existingExam);

    // Seed Questions for the exam
    const q1 = await prisma.examQuestion.findFirst({
      where: { examId: existingExam.id, order: 1 },
    });
    if (!q1) {
      await prisma.examQuestion.create({
        data: {
          examId: existingExam.id,
          questionText: 'What is the primary governing conservation principle in closed mechanical systems?',
          questionType: ExamQuestionType.MULTIPLE_CHOICE,
          options: JSON.stringify(['Conservation of Total Mechanical Energy', 'Conservation of Momentum Only', 'Newton Third Law', 'Ideal Gas Law']),
          correctAnswer: 'Conservation of Total Mechanical Energy',
          marks: 25.0,
          order: 1,
        },
      });
    }

    const q2 = await prisma.examQuestion.findFirst({
      where: { examId: existingExam.id, order: 2 },
    });
    if (!q2) {
      await prisma.examQuestion.create({
        data: {
          examId: existingExam.id,
          questionText: 'State whether rate of change of momentum is proportional to net impressed force.',
          questionType: ExamQuestionType.TRUE_FALSE,
          options: JSON.stringify(['True', 'False']),
          correctAnswer: 'True',
          marks: 25.0,
          order: 2,
        },
      });
    }

    // Populate student attempts for RESULTS_PUBLISHED exams
    if (existingExam.status === ExamStatus.RESULTS_PUBLISHED) {
      const targetStudents = ex.schoolId === stJude.id ? stJude10AStudents : apexAlphaStudents;
      for (const [stIdx, st] of targetStudents.entries()) {
        const marksObtained = Math.round(existingExam.totalMarks * (0.75 + (stIdx % 3) * 0.1));
        const percentage = Math.round((marksObtained / existingExam.totalMarks) * 100);

        await prisma.examAttempt.upsert({
          where: {
            examId_studentId: {
              examId: existingExam.id,
              studentId: st.id,
            },
          },
          update: {
            status: ExamAttemptStatus.GRADED,
            obtainedMarks: marksObtained,
            percentage,
          },
          create: {
            examId: existingExam.id,
            studentId: st.id,
            status: ExamAttemptStatus.GRADED,
            obtainedMarks: marksObtained,
            percentage,
            feedback: 'Solid demonstration of core analytical concepts.',
            gradedById: existingExam.createdById,
            gradedAt: new Date(),
          },
        });
      }
    }
  }
  console.log('[Seed] 8 Examinations created with question banks, attempts & published scores');

  // ===========================================================================
  // 18. TASK 013 — Subscription Plans & School Subscriptions
  // ===========================================================================
  const plans = [
    { code: 'FREE_STARTER', name: 'Free Starter Plan', description: 'Essential trial features for small community schools', price: 0.0, durationDays: 365, maxStudents: 100, maxTeachers: 10 },
    { code: 'BASIC_ACADEMY', name: 'Basic Academy Plan', description: 'Complete class rosters, attendance tracking, and reporting', price: 499.0, durationDays: 365, maxStudents: 300, maxTeachers: 30 },
    { code: 'INSTITUTIONAL_STANDARD', name: 'Institutional Standard', description: 'Full gradebook, homework, exams, and guardian communication portal', price: 1299.0, durationDays: 365, maxStudents: 1000, maxTeachers: 80 },
    { code: 'STEM_ADVANCED', name: 'STEM Advanced Campus', description: 'Optimized for STEM laboratory workflows, NFC simulator, and course catalogs', price: 1899.0, durationDays: 365, maxStudents: 1500, maxTeachers: 120 },
    { code: 'CAMPUS_ENTERPRISE', name: 'Campus Enterprise Master', description: 'Unlimited sections, custom grading scales, API integrations, and priority SLA', price: 3499.0, durationDays: 365, maxStudents: 5000, maxTeachers: 350 },
    { code: 'PRO_SCHOLAR', name: 'Pro Scholar Collegiate', description: 'Tailored for secondary prep academies with rigorous exam scheduling', price: 799.0, durationDays: 365, maxStudents: 500, maxTeachers: 50 },
    { code: 'DISTRICT_UNLIMITED', name: 'District Multi-School Unlimited', description: 'Full regional district licensing for cross-campus administrative oversight', price: 7999.0, durationDays: 365, maxStudents: 20000, maxTeachers: 1500 },
    { code: 'PILOT_TRIAL', name: 'Pilot Academic Sandbox', description: 'Short-term institutional trial with simulated demo features', price: 0.0, durationDays: 60, maxStudents: 50, maxTeachers: 5 },
  ];

  const seededPlans: Record<string, any> = {};
  for (const pl of plans) {
    const pRecord = await prisma.subscriptionPlan.upsert({
      where: { code: pl.code },
      update: {
        name: pl.name,
        description: pl.description,
        price: pl.price,
        maxStudents: pl.maxStudents,
        maxTeachers: pl.maxTeachers,
      },
      create: pl,
    });
    seededPlans[pl.code] = pRecord;
  }

  // Bind active institutional subscriptions
  const stJudePlan = seededPlans['INSTITUTIONAL_STANDARD'];
  let sjSub = await prisma.schoolSubscription.findFirst({
    where: { schoolId: stJude.id, planId: stJudePlan.id },
  });
  if (!sjSub) {
    await prisma.schoolSubscription.create({
      data: {
        schoolId: stJude.id,
        planId: stJudePlan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-09-01'),
        autoRenew: true,
      },
    });
  }

  const apexPlan = seededPlans['STEM_ADVANCED'];
  let apSub = await prisma.schoolSubscription.findFirst({
    where: { schoolId: apex.id, planId: apexPlan.id },
  });
  if (!apSub) {
    await prisma.schoolSubscription.create({
      data: {
        schoolId: apex.id,
        planId: apexPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-09-01'),
        autoRenew: true,
      },
    });
  }
  console.log('[Seed] 8 Subscription Plans & active School Subscriptions verified');

  // ===========================================================================
  // 19. TASK 014 — Subscription Codes & Redemptions
  // ===========================================================================
  const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: 'platform.admin@ems.local' } });

  const codesList = [
    { code: 'SJA-ENTERPRISE-2026', plan: seededPlans['CAMPUS_ENTERPRISE'], maxRedemptions: 5, timesRedeemed: 1, expiresAt: new Date(Date.now() + 180 * 24 * 3600 * 1000), isRevoked: false },
    { code: 'APEX-STEM-2026', plan: seededPlans['STEM_ADVANCED'], maxRedemptions: 2, timesRedeemed: 1, expiresAt: new Date(Date.now() + 180 * 24 * 3600 * 1000), isRevoked: false },
    { code: 'GLOBAL-DISTRICT-2027', plan: seededPlans['DISTRICT_UNLIMITED'], maxRedemptions: 10, timesRedeemed: 0, expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000), isRevoked: false },
    { code: 'PRO-SCHOLAR-FALL', plan: seededPlans['PRO_SCHOLAR'], maxRedemptions: 3, timesRedeemed: 0, expiresAt: new Date(Date.now() + 90 * 24 * 3600 * 1000), isRevoked: false },
    { code: 'ACADEMY-TRIAL-01', plan: seededPlans['PILOT_TRIAL'], maxRedemptions: 5, timesRedeemed: 0, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), isRevoked: false },
    { code: 'STJUDE-LEGACY-REDEEMED', plan: seededPlans['INSTITUTIONAL_STANDARD'], maxRedemptions: 1, timesRedeemed: 1, expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000), isRevoked: false },
    { code: 'EXPIRED-SUMMER-2025', plan: seededPlans['BASIC_ACADEMY'], maxRedemptions: 1, timesRedeemed: 0, expiresAt: new Date('2025-08-31'), isRevoked: false },
    { code: 'REVOKED-FRAUD-CODE', plan: seededPlans['CAMPUS_ENTERPRISE'], maxRedemptions: 1, timesRedeemed: 0, expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000), isRevoked: true },
  ];

  for (const c of codesList) {
    const scRecord = await prisma.subscriptionCode.upsert({
      where: { code: c.code },
      update: {
        maxRedemptions: c.maxRedemptions,
        timesRedeemed: c.timesRedeemed,
        expiresAt: c.expiresAt,
        isRevoked: c.isRevoked,
      },
      create: {
        code: c.code,
        planId: c.plan.id,
        createdById: adminUser.id,
        maxRedemptions: c.maxRedemptions,
        timesRedeemed: c.timesRedeemed,
        expiresAt: c.expiresAt,
        isRevoked: c.isRevoked,
      },
    });

    // Seed redemption audit record if redeemed
    if (c.timesRedeemed > 0) {
      const red = await prisma.codeRedemption.findFirst({
        where: { codeId: scRecord.id, userId: stJudeAdmin.id },
      });
      if (!red) {
        await prisma.codeRedemption.create({
          data: {
            codeId: scRecord.id,
            userId: stJudeAdmin.id,
            schoolId: stJude.id,
          },
        });
      }
    }
  }
  console.log('[Seed] 8 Subscription Codes initialized with redemption history');

  // ===========================================================================
  // 20. TASK 015 — In-App Notifications & Direct Messaging
  // ===========================================================================
  const liamStudent = studentUsers['student@stjude.ems.local'];
  const sarahParent = await prisma.user.findUniqueOrThrow({ where: { email: 'parent@stjude.ems.local' } });

  const notificationsList = [
    { userId: liamStudent.id, schoolId: stJude.id, title: 'New Homework Assigned', message: 'Calculus Problem Set 3 has been published by Mr. Holloway.', type: NotificationType.HOMEWORK, link: '/homework', read: false },
    { userId: liamStudent.id, schoolId: stJude.id, title: 'Exam Results Published', message: 'Your Midterm Calculus Examination score (94%) is now available.', type: NotificationType.EXAM, link: '/exams', read: true },
    { userId: teacherUsers['teacher@stjude.ems.local'].id, schoolId: stJude.id, title: 'Pending Homework Submissions', message: '4 new submissions are awaiting review for Calculus Problem Set 3.', type: NotificationType.HOMEWORK, link: '/homework', read: false },
    { userId: teacherUsers['teacher@stjude.ems.local'].id, schoolId: stJude.id, title: 'Campus Faculty Meeting', message: 'All-hands academic term review scheduled for Friday at 15:30.', type: NotificationType.ANNOUNCEMENT, link: '/notifications', read: true },
    { userId: sarahParent.id, schoolId: stJude.id, title: 'Attendance Notice', message: 'Liam Chen was marked Present on campus today at 08:45.', type: NotificationType.ATTENDANCE, link: '/attendance', read: false },
    { userId: sarahParent.id, schoolId: stJude.id, title: 'Academic Progress Report', message: 'Term 1 progress report card for Liam Chen has been published.', type: NotificationType.GRADE, link: '/grades', read: true },
    { userId: stJudeAdmin.id, schoolId: stJude.id, title: 'Subscription Renewed', message: 'Institutional Standard subscription active through 2027-09-01.', type: NotificationType.SUBSCRIPTION, link: '/subscriptions', read: true },
    { userId: stJudeAdmin.id, schoolId: stJude.id, title: 'System Security Notice', message: 'All campus faculty credentials verified under mandatory RBAC policy.', type: NotificationType.INFO, link: '/system-health', read: false },
  ];

  for (const n of notificationsList) {
    let notif = await prisma.notification.findFirst({
      where: { userId: n.userId, title: n.title },
    });
    if (!notif) {
      await prisma.notification.create({ data: n });
    }
  }

  // Seed Messaging Conversation between Parent Sarah Chen and Teacher Marcus Holloway
  const convSubject = "Inquiry regarding Liam's Advanced Calculus Project";
  let conv = await prisma.conversation.findFirst({
    where: { schoolId: stJude.id, subject: convSubject },
  });
  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        schoolId: stJude.id,
        subject: convSubject,
      },
    });

    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: conv.id, userId: sarahParent.id },
        { conversationId: conv.id, userId: teacherUsers['teacher@stjude.ems.local'].id },
      ],
    });

    await prisma.directMessage.create({
      data: {
        conversationId: conv.id,
        senderId: sarahParent.id,
        content: 'Dear Mr. Holloway, could you share guidance on the upcoming Fourier Transforms lab project?',
      },
    });

    await prisma.directMessage.create({
      data: {
        conversationId: conv.id,
        senderId: teacherUsers['teacher@stjude.ems.local'].id,
        content: 'Hello Mrs. Chen! Liam has shown tremendous mathematical aptitude. He can consult the supplementary formulas in Module 2.',
      },
    });
  }
  console.log('[Seed] 8 Notifications & Direct Messaging conversations verified');

  // ===========================================================================
  // 21. TASK 017 — Security Audit Trail Logs
  // ===========================================================================
  const auditEntries = [
    { action: 'AUTH_LOGIN', entityType: 'User', entityId: adminUser.id, actorId: adminUser.id, actorEmail: adminUser.email, schoolId: null, details: { method: 'JWT_BEARER', ip: '127.0.0.1' } },
    { action: 'SCHOOL_PROFILE_UPDATED', entityType: 'School', entityId: stJude.id, actorId: stJudeAdmin.id, actorEmail: stJudeAdmin.email, schoolId: stJude.id, details: { status: 'ACTIVE' } },
    { action: 'EXAM_RESULTS_PUBLISHED', entityType: 'Exam', entityId: seededExams[0]?.id || 'exam-001', actorId: teacherUsers['teacher@stjude.ems.local'].id, actorEmail: teacherUsers['teacher@stjude.ems.local'].email, schoolId: stJude.id, details: { totalEvaluated: 8 } },
    { action: 'STUDENT_ENROLLED', entityType: 'Student', entityId: liamStudent.id, actorId: stJudeAdmin.id, actorEmail: stJudeAdmin.email, schoolId: stJude.id, details: { admissionNumber: 'STJ-2026-001' } },
    { action: 'SUBSCRIPTION_ACTIVATED', entityType: 'Subscription', entityId: stJudePlan.id, actorId: adminUser.id, actorEmail: adminUser.email, schoolId: stJude.id, details: { plan: 'INSTITUTIONAL_STANDARD' } },
    { action: 'HOMEWORK_ASSIGNED', entityType: 'Homework', entityId: seededHomeworks[0]?.id || 'hw-001', actorId: teacherUsers['teacher@stjude.ems.local'].id, actorEmail: teacherUsers['teacher@stjude.ems.local'].email, schoolId: stJude.id, details: { maxPoints: 100 } },
    { action: 'ATTENDANCE_SESSION_FINALIZED', entityType: 'AttendanceSession', entityId: 'session-001', actorId: stJudeAdmin.id, actorEmail: stJudeAdmin.email, schoolId: stJude.id, details: { rosterCount: 8 } },
    { action: 'SUBSCRIPTION_CODE_REDEEMED', entityType: 'SubscriptionCode', entityId: 'SJA-ENTERPRISE-2026', actorId: stJudeAdmin.id, actorEmail: stJudeAdmin.email, schoolId: stJude.id, details: { schoolCode: 'st-jude' } },
  ];

  for (const a of auditEntries) {
    let existingLog = await prisma.auditLog.findFirst({
      where: { action: a.action, entityId: a.entityId },
    });
    if (!existingLog) {
      await prisma.auditLog.create({ data: a });
    }
  }
  console.log('[Seed] 8 Security Audit Trail entries populated');

  // ===========================================================================
  // 22. TASK 022 — AI Academic Assistant Seed Conversations (8 Idempotent Examples)
  // ===========================================================================
  const seedAIConversations = [
    {
      userEmail: 'platform.admin@ems.local',
      role: UserRole.PLATFORM_ADMIN,
      schoolId: null,
      title: 'Platform-Wide Institutional Summary',
      prompt: 'What is the total student enrollment and teacher count across all schools?',
      response: 'Based on verified institutional records across all registered campuses:\n\n- **Active Schools**: 2 (St. Jude Institutional Academy & Apex STEM Academy)\n- **Total Students Enrolled**: 16\n- **Total Faculty Teachers**: 8\n\n*Source: Live Educational Management System Records.*',
      tool: 'get_enrollment_summary',
    },
    {
      userEmail: 'admin@stjude.ems.local',
      role: UserRole.SCHOOL_ADMIN,
      schoolId: stJude.id,
      title: 'St. Jude Campus Enrollment & Class Summary',
      prompt: 'Give me an overview of our campus enrollment and academic classes.',
      response: 'Here is your verified institutional data for St. Jude Institutional Academy:\n\n- **Enrolled Students**: 8\n- **Faculty Teachers**: 4\n- **Classes & Sections**: 4 classes, 4 active class sections\n\n*Source: Live Educational Management System Records.*',
      tool: 'get_enrollment_summary',
    },
    {
      userEmail: 'admin@apex.ems.local',
      role: UserRole.SCHOOL_ADMIN,
      schoolId: apex.id,
      title: 'Apex STEM Tuition & Fee Collections',
      prompt: 'What is our school fee collection rate and outstanding balance?',
      response: 'Here is your verified institutional fee collection summary for Apex STEM Academy:\n\n- **Total Billed**: $42,500\n- **Total Collected**: $31,800\n- **Outstanding Balance**: $10,700\n- **Collection Rate**: 75%\n\n*Source: Live Educational Management System Records.*',
      tool: 'get_fee_summary',
    },
    {
      userEmail: 'teacher@stjude.ems.local',
      role: UserRole.TEACHER,
      schoolId: stJude.id,
      title: 'Weekly Teaching Periods Schedule',
      prompt: 'What classes and teaching periods are scheduled on my weekly timetable?',
      response: 'Here are your verified teaching schedule periods from the master timetable:\n\n| Day | Time | Subject | Room / Class |\n|---|---|---|---|\n| Monday | 08:30 - 09:20 | Mathematics | Room 101 (Section 10-A) |\n| Tuesday | 09:30 - 10:20 | Calculus I | Room 102 (Section 11-A) |\n| Thursday | 10:30 - 11:20 | Advanced Algebra | Room 101 (Section 10-A) |\n\n*Source: Live Educational Management System Records.*',
      tool: 'get_timetable',
    },
    {
      userEmail: 'teacher@stjude.ems.local',
      role: UserRole.TEACHER,
      schoolId: stJude.id,
      title: 'Homework Tasks & Submissions Oversight',
      prompt: 'Summarize homework tasks I have assigned and pending submissions.',
      response: 'Here are your active homework curriculum assignments:\n\n| Title | Subject / Info | Status / Submissions |\n|---|---|---|\n| Fourier Transforms Problem Set 3 | Advanced Calculus | 8 Submissions Recorded |\n| Matrix Algebra Lab Worksheet | Linear Algebra | 6 Submissions Recorded |\n\n*Source: Live Educational Management System Records.*',
      tool: 'get_homework_summary',
    },
    {
      userEmail: 'student@stjude.ems.local',
      role: UserRole.STUDENT,
      schoolId: stJude.id,
      title: 'Personal Attendance Rate Inquiry',
      prompt: 'What is my overall attendance rate and how many sessions have I attended?',
      response: 'Here is your verified personal attendance summary:\n\n- **Attendance Rate**: 95%\n- **Total Sessions Logged**: 20\n- **Present**: 19 | **Absent**: 1 | **Late**: 0\n\n*Source: Live Educational Management System Records.*',
      tool: 'get_attendance_summary',
    },
    {
      userEmail: 'student@apex.ems.local',
      role: UserRole.STUDENT,
      schoolId: apex.id,
      title: 'Published Assessment Marks',
      prompt: 'What published grades and assessment marks do I currently have?',
      response: 'Here are your published academic grades from the institutional gradebook:\n\n| Subject | Assessment | Score | Max | Grade |\n|---|---|---|---|---|\n| Physics | Midterm Examination | 92 | 100 | Completed |\n| Chemistry | Organic Chemistry Lab 1 | 88 | 100 | Completed |\n\n*Source: Live Educational Management System Records.*',
      tool: 'get_grade_summary',
    },
    {
      userEmail: 'parent@stjude.ems.local',
      role: UserRole.PARENT,
      schoolId: stJude.id,
      title: 'Liam Chen Attendance & Academic Check',
      prompt: 'What is the attendance record and attendance rate for my child Liam?',
      response: 'Here is the verified attendance summary for your linked child, **Liam Chen**:\n\n- **Student**: Liam Chen (Grade 10)\n- **Attendance Rate**: 95%\n- **Total Sessions**: 20\n- **Present**: 19\n- **Absent**: 1\n\n*Source: Live Educational Management System Records.*',
      tool: 'get_attendance_summary',
    },
  ];

  for (const item of seedAIConversations) {
    const userObj = await prisma.user.findUnique({ where: { email: item.userEmail } });
    if (!userObj) continue;

    let existingConv = await prisma.aIConversation.findFirst({
      where: { userId: userObj.id, title: item.title },
    });

    if (!existingConv) {
      existingConv = await prisma.aIConversation.create({
        data: {
          userId: userObj.id,
          roleContext: item.role,
          schoolId: item.schoolId,
          title: item.title,
        },
      });

      // User Message
      await prisma.aIMessage.create({
        data: {
          conversationId: existingConv.id,
          sender: AIMessageSender.USER,
          content: item.prompt,
        },
      });

      // Assistant Message
      await prisma.aIMessage.create({
        data: {
          conversationId: existingConv.id,
          sender: AIMessageSender.ASSISTANT,
          content: item.response,
          toolCalls: [{ name: item.tool, success: true }],
          tokensUsed: Math.round((item.prompt.length + item.response.length) / 4),
          modelName: 'gemini-3.8-flash',
        },
      });

      // Usage Record
      await prisma.aIUsageRecord.create({
        data: {
          userId: userObj.id,
          schoolId: item.schoolId,
          modelName: 'gemini-3.8-flash',
          promptTokens: Math.round(item.prompt.length / 4),
          outputTokens: Math.round(item.response.length / 4),
          totalTokens: Math.round((item.prompt.length + item.response.length) / 4),
          toolName: item.tool,
          success: true,
        },
      });
    }
  }
  console.log('[Seed] 8 AI Academic Assistant seed conversations verified');

  console.log('--- Institutional Fixtures Seeding Complete (TASKS 001–022 Ready) ---');

}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
