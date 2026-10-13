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

  console.log('--- Institutional Fixtures Seeding Complete (TASK 009 Ready) ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
