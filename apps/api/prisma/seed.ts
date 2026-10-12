/**
 * MODULE: Database Seeding & Institutional Fixtures
 *
 * PURPOSE:
 * Seeds 5 institutional test schools, dedicated School Admin accounts,
 * dedicated Teacher accounts with pedagogical profiles, cross-school memberships,
 * and baseline platform administrator accounts for comprehensive manual testing.
 *
 * DEPENDENCIES:
 * @prisma/client, bcryptjs
 *
 * SECURITY:
 * All passwords hashed with bcryptjs (salt rounds: 10) to 'Password123!'.
 */

import { PrismaClient, UserRole, SchoolStatus, TeacherEmploymentStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Institutional Fixtures Seeding ---');

  // Common password hash for development accounts
  const defaultPassword = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  // 1. Seed Platform Admin
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

  // 2. Define the 5 Institutional Test Schools
  const schoolsData = [
    {
      code: 'st-jude',
      name: 'St. Jude Institutional Academy',
      city: 'Seattle',
      state: 'WA',
      country: 'USA',
      domain: 'stjude.ems.local',
      email: 'admissions@stjude.ems.local',
      phone: '+1-555-019-2831',
      address: '100 Institutional Boulevard, Academic District',
      admin: {
        email: 'admin@stjude.ems.local',
        firstName: 'Eleanor',
        lastName: 'Pemberton',
      },
      teacher: {
        email: 'teacher@stjude.ems.local',
        firstName: 'Marcus',
        lastName: 'Holloway',
        employeeCode: 'TCH-1001',
        qualification: 'M.Sc. in Applied Mathematics',
        specialization: 'Advanced Calculus & Analytical Geometry',
        phone: '+1-555-019-3388',
        address: '42 Academic Way, Suite 12, Seattle, WA',
        bio: 'Senior Mathematics Faculty with over 10 years of secondary instructional leadership.',
      },
    },
    {
      code: 'apex-stem',
      name: 'Apex STEM Academy',
      city: 'Boston',
      state: 'MA',
      country: 'USA',
      domain: 'apex.ems.local',
      email: 'admissions@apex.ems.local',
      phone: '+1-555-028-1144',
      address: '450 Innovation Parkway, Cambridge Sector',
      admin: {
        email: 'admin@apex.ems.local',
        firstName: 'Dr. Victor',
        lastName: 'Vance',
      },
      teacher: {
        email: 'teacher@apex.ems.local',
        firstName: 'Dr. Elena',
        lastName: 'Rostova',
        employeeCode: 'TCH-2001',
        qualification: 'Ph.D. in Quantum Physics & Robotics',
        specialization: 'Theoretical Physics & Applied Robotics',
        phone: '+1-555-028-9922',
        address: '88 Tech Boulevard, Boston, MA',
        bio: 'Distinguished STEM Fellow and mentor for collegiate robotics competitions.',
      },
    },
    {
      code: 'beacon-arts',
      name: 'Beacon Science & Arts Academy',
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      domain: 'beacon.ems.local',
      email: 'admissions@beacon.ems.local',
      phone: '+1-555-039-7722',
      address: '720 Millennium Avenue, Arts Quarter',
      admin: {
        email: 'admin@beacon.ems.local',
        firstName: 'Miriam',
        lastName: 'Webster',
      },
      teacher: {
        email: 'teacher@beacon.ems.local',
        firstName: 'David',
        lastName: 'Kim',
        employeeCode: 'TCH-3001',
        qualification: 'M.F.A. in Visual Arts & Art History',
        specialization: 'Classical Fine Arts & Digital Media',
        phone: '+1-555-039-4455',
        address: '15 Lakefront Plaza, Chicago, IL',
        bio: 'Gallery curator and fine arts educator specializing in traditional studio methods.',
      },
    },
    {
      code: 'oakridge-prep',
      name: 'Oakridge Preparatory Collegiate',
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      domain: 'oakridge.ems.local',
      email: 'admissions@oakridge.ems.local',
      phone: '+1-555-048-8833',
      address: '300 Heritage Hills Drive',
      admin: {
        email: 'admin@oakridge.ems.local',
        firstName: 'Arthur',
        lastName: 'Pendelton',
      },
      teacher: {
        email: 'teacher@oakridge.ems.local',
        firstName: 'Rachel',
        lastName: 'Adams',
        employeeCode: 'TCH-4001',
        qualification: 'M.A. in English Literature & Rhetoric',
        specialization: 'AP World Literature & Critical Writing',
        phone: '+1-555-048-1212',
        address: '50 Heritage Court, Austin, TX',
        bio: 'Department chair for humanities focusing on classical rhetoric and debate.',
      },
    },
    {
      code: 'horizon-intl',
      name: 'Horizon International Academy',
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      domain: 'horizon.ems.local',
      email: 'admissions@horizon.ems.local',
      phone: '+1-555-058-9944',
      address: '900 Pacific Crest Way',
      admin: {
        email: 'admin@horizon.ems.local',
        firstName: 'Sophia',
        lastName: 'Al-Mansoor',
      },
      teacher: {
        email: 'teacher@horizon.ems.local',
        firstName: 'Carlos',
        lastName: 'Rivera',
        employeeCode: 'TCH-5001',
        qualification: 'M.Sc. in Economics & International Relations',
        specialization: 'Global Economics & Comparative Government',
        phone: '+1-555-058-3311',
        address: '120 Embarcadero Heights, San Francisco, CA',
        bio: 'International affairs lecturer with expertise in model UN and macroeconomic policy.',
      },
    },
  ];

  // 3. Seed Each School, Admin, and Teacher
  for (const s of schoolsData) {
    const school = await prisma.school.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        city: s.city,
        state: s.state,
        country: s.country,
        domain: s.domain,
        email: s.email,
        phone: s.phone,
        address: s.address,
        status: SchoolStatus.ACTIVE,
      },
      create: {
        code: s.code,
        name: s.name,
        city: s.city,
        state: s.state,
        country: s.country,
        domain: s.domain,
        email: s.email,
        phone: s.phone,
        address: s.address,
        status: SchoolStatus.ACTIVE,
      },
    });

    console.log(`[Seed] School initialized: ${school.name} (${school.id})`);

    // School Admin Account
    const adminUser = await prisma.user.upsert({
      where: { email: s.admin.email },
      update: {
        firstName: s.admin.firstName,
        lastName: s.admin.lastName,
        role: UserRole.SCHOOL_ADMIN,
        schoolId: school.id,
        passwordHash,
        isActive: true,
      },
      create: {
        email: s.admin.email,
        passwordHash,
        firstName: s.admin.firstName,
        lastName: s.admin.lastName,
        role: UserRole.SCHOOL_ADMIN,
        schoolId: school.id,
        isActive: true,
      },
    });
    console.log(`  - Admin: ${adminUser.email} -> ${school.name}`);

    // Teacher Account
    const teacherUser = await prisma.user.upsert({
      where: { email: s.teacher.email },
      update: {
        firstName: s.teacher.firstName,
        lastName: s.teacher.lastName,
        role: UserRole.TEACHER,
        schoolId: school.id,
        phone: s.teacher.phone,
        passwordHash,
        isActive: true,
      },
      create: {
        email: s.teacher.email,
        passwordHash,
        firstName: s.teacher.firstName,
        lastName: s.teacher.lastName,
        role: UserRole.TEACHER,
        schoolId: school.id,
        phone: s.teacher.phone,
        isActive: true,
      },
    });

    // Teacher Profile
    await prisma.teacherProfile.upsert({
      where: { userId: teacherUser.id },
      update: {
        employeeCode: s.teacher.employeeCode,
        qualification: s.teacher.qualification,
        specialization: s.teacher.specialization,
        phone: s.teacher.phone,
        address: s.teacher.address,
        bio: s.teacher.bio,
        employmentStatus: TeacherEmploymentStatus.ACTIVE,
      },
      create: {
        userId: teacherUser.id,
        employeeCode: s.teacher.employeeCode,
        qualification: s.teacher.qualification,
        specialization: s.teacher.specialization,
        phone: s.teacher.phone,
        address: s.teacher.address,
        bio: s.teacher.bio,
        employmentStatus: TeacherEmploymentStatus.ACTIVE,
      },
    });

    // School Membership (Primary)
    await prisma.schoolMembership.upsert({
      where: {
        userId_schoolId: {
          userId: teacherUser.id,
          schoolId: school.id,
        },
      },
      update: {
        role: UserRole.TEACHER,
        employeeCode: s.teacher.employeeCode,
        isActive: true,
        employmentStatus: TeacherEmploymentStatus.ACTIVE,
      },
      create: {
        userId: teacherUser.id,
        schoolId: school.id,
        role: UserRole.TEACHER,
        employeeCode: s.teacher.employeeCode,
        isActive: true,
        employmentStatus: TeacherEmploymentStatus.ACTIVE,
      },
    });

    console.log(`  - Teacher: ${teacherUser.email} (${s.teacher.employeeCode}) -> ${school.name}`);
  }

  // 4. Also ensure Student and Parent test accounts exist for St. Jude Academy
  const stJude = await prisma.school.findUnique({ where: { code: 'st-jude' } });
  if (stJude) {
    // 4.1 Academic Year
    const academicYear = await prisma.academicYear.upsert({
      where: { schoolId_name: { schoolId: stJude.id, name: '2026-2027 Academic Year' } },
      update: { isCurrent: true },
      create: {
        schoolId: stJude.id,
        name: '2026-2027 Academic Year',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-06-30'),
        isCurrent: true,
      },
    });

    // 4.2 School Classes
    const class10 = await prisma.schoolClass.upsert({
      where: { schoolId_code: { schoolId: stJude.id, code: 'G10' } },
      update: {},
      create: {
        schoolId: stJude.id,
        name: 'Grade 10',
        code: 'G10',
        description: 'Secondary Sophomore Level',
        order: 10,
      },
    });

    await prisma.schoolClass.upsert({
      where: { schoolId_code: { schoolId: stJude.id, code: 'G11' } },
      update: {},
      create: {
        schoolId: stJude.id,
        name: 'Grade 11',
        code: 'G11',
        description: 'Secondary Junior Level',
        order: 11,
      },
    });

    // 4.3 Teacher user lookup
    const teacherUser = await prisma.user.findUnique({ where: { email: 'teacher@stjude.ems.local' } });

    // 4.4 Class Sections
    const sectionA = await prisma.classSection.upsert({
      where: {
        classId_academicYearId_name: {
          classId: class10.id,
          academicYearId: academicYear.id,
          name: 'Section A',
        },
      },
      update: {},
      create: {
        classId: class10.id,
        academicYearId: academicYear.id,
        name: 'Section A',
        capacity: 30,
        roomNumber: 'Room 101',
        classTeacherId: teacherUser?.id || null,
      },
    });

    const sectionB = await prisma.classSection.upsert({
      where: {
        classId_academicYearId_name: {
          classId: class10.id,
          academicYearId: academicYear.id,
          name: 'Section B',
        },
      },
      update: {},
      create: {
        classId: class10.id,
        academicYearId: academicYear.id,
        name: 'Section B',
        capacity: 28,
        roomNumber: 'Room 102',
      },
    });

    // 4.5 Subjects
    const math = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: stJude.id, code: 'MATH-101' } },
      update: {},
      create: {
        schoolId: stJude.id,
        name: 'Advanced Mathematics',
        code: 'MATH-101',
        department: 'Mathematics',
        credits: 1.0,
      },
    });

    const physics = await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: stJude.id, code: 'PHYS-101' } },
      update: {},
      create: {
        schoolId: stJude.id,
        name: 'AP Physics',
        code: 'PHYS-101',
        department: 'Natural Sciences',
        credits: 1.0,
      },
    });

    await prisma.subject.upsert({
      where: { schoolId_code: { schoolId: stJude.id, code: 'ENG-101' } },
      update: {},
      create: {
        schoolId: stJude.id,
        name: 'World Literature & Composition',
        code: 'ENG-101',
        department: 'Humanities',
        credits: 1.0,
      },
    });

    // 4.6 Teacher Subject Assignments
    if (teacherUser) {
      await prisma.teacherSubjectAssignment.upsert({
        where: {
          teacherId_subjectId_sectionId_academicYearId: {
            teacherId: teacherUser.id,
            subjectId: math.id,
            sectionId: sectionA.id,
            academicYearId: academicYear.id,
          },
        },
        update: {},
        create: {
          teacherId: teacherUser.id,
          subjectId: math.id,
          sectionId: sectionA.id,
          academicYearId: academicYear.id,
        },
      });

      await prisma.teacherSubjectAssignment.upsert({
        where: {
          teacherId_subjectId_sectionId_academicYearId: {
            teacherId: teacherUser.id,
            subjectId: physics.id,
            sectionId: sectionA.id,
            academicYearId: academicYear.id,
          },
        },
        update: {},
        create: {
          teacherId: teacherUser.id,
          subjectId: physics.id,
          sectionId: sectionA.id,
          academicYearId: academicYear.id,
        },
      });

      // 4.7 Timetable Entries for Section A
      const timetableData = [
        { day: 1, period: 'Period 1', start: '08:30', end: '09:20', subjectId: math.id, room: 'Room 101' },
        { day: 1, period: 'Period 2', start: '09:30', end: '10:20', subjectId: physics.id, room: 'Room 101' },
        { day: 2, period: 'Period 1', start: '08:30', end: '09:20', subjectId: physics.id, room: 'Room 101' },
        { day: 2, period: 'Period 2', start: '09:30', end: '10:20', subjectId: math.id, room: 'Room 101' },
        { day: 3, period: 'Period 1', start: '08:30', end: '09:20', subjectId: math.id, room: 'Room 101' },
        { day: 4, period: 'Period 2', start: '09:30', end: '10:20', subjectId: physics.id, room: 'Room 101' },
        { day: 5, period: 'Period 1', start: '08:30', end: '09:20', subjectId: math.id, room: 'Room 101' },
      ];

      for (const t of timetableData) {
        const existingEntry = await prisma.timetableEntry.findFirst({
          where: {
            sectionId: sectionA.id,
            dayOfWeek: t.day,
            periodName: t.period,
          },
        });
        if (!existingEntry) {
          await prisma.timetableEntry.create({
            data: {
              schoolId: stJude.id,
              sectionId: sectionA.id,
              subjectId: t.subjectId,
              teacherId: teacherUser.id,
              academicYearId: academicYear.id,
              dayOfWeek: t.day,
              periodName: t.period,
              startTime: t.start,
              endTime: t.end,
              roomNumber: t.room,
            },
          });
        }
      }
    }

    // 4.8 Students
    const student1 = await prisma.user.upsert({
      where: { email: 'student@stjude.ems.local' },
      update: { passwordHash, isActive: true },
      create: {
        email: 'student@stjude.ems.local',
        passwordHash,
        firstName: 'Liam',
        lastName: 'Chen',
        role: UserRole.STUDENT,
        schoolId: stJude.id,
        isActive: true,
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: student1.id },
      update: {},
      create: {
        userId: student1.id,
        admissionNumber: 'STJ-2026-001',
        gradeLevel: 'Grade 10',
      },
    });

    await prisma.classEnrollment.upsert({
      where: {
        studentId_academicYearId: {
          studentId: student1.id,
          academicYearId: academicYear.id,
        },
      },
      update: { sectionId: sectionA.id },
      create: {
        studentId: student1.id,
        sectionId: sectionA.id,
        academicYearId: academicYear.id,
        rollNumber: '10A-01',
      },
    });

    const student2 = await prisma.user.upsert({
      where: { email: 'student2@stjude.ems.local' },
      update: { passwordHash, isActive: true },
      create: {
        email: 'student2@stjude.ems.local',
        passwordHash,
        firstName: 'Sophia',
        lastName: 'Chen',
        role: UserRole.STUDENT,
        schoolId: stJude.id,
        isActive: true,
      },
    });

    await prisma.studentProfile.upsert({
      where: { userId: student2.id },
      update: {},
      create: {
        userId: student2.id,
        admissionNumber: 'STJ-2026-002',
        gradeLevel: 'Grade 10',
      },
    });

    await prisma.classEnrollment.upsert({
      where: {
        studentId_academicYearId: {
          studentId: student2.id,
          academicYearId: academicYear.id,
        },
      },
      update: { sectionId: sectionB.id },
      create: {
        studentId: student2.id,
        sectionId: sectionB.id,
        academicYearId: academicYear.id,
        rollNumber: '10B-05',
      },
    });

    // 4.9 Parent Account & Relationships
    const parentUser = await prisma.user.upsert({
      where: { email: 'parent@stjude.ems.local' },
      update: { passwordHash, isActive: true },
      create: {
        email: 'parent@stjude.ems.local',
        passwordHash,
        firstName: 'Sarah',
        lastName: 'Chen',
        role: UserRole.PARENT,
        schoolId: stJude.id,
        phone: '+1-555-019-4411',
        isActive: true,
      },
    });

    await prisma.parentGuardianProfile.upsert({
      where: { userId: parentUser.id },
      update: {},
      create: {
        userId: parentUser.id,
        occupation: 'Senior Systems Architect',
        employer: 'Pacific Aerospace',
        relationshipToFamily: 'Mother',
        phoneAlt: '+1-555-019-4412',
        address: '88 Evergreen Terrace, Seattle, WA',
      },
    });

    // Link Parent to Child 1 (Liam) - VERIFIED
    await prisma.studentGuardianRelationship.upsert({
      where: {
        guardianId_studentId: {
          guardianId: parentUser.id,
          studentId: student1.id,
        },
      },
      update: { verificationStatus: 'VERIFIED' },
      create: {
        guardianId: parentUser.id,
        studentId: student1.id,
        relationshipType: 'MOTHER',
        verificationStatus: 'VERIFIED',
        isPrimaryContact: true,
        isEmergencyContact: true,
        notes: 'Primary legal guardian and emergency respondent.',
      },
    });

    // Link Parent to Child 2 (Sophia) - VERIFIED
    await prisma.studentGuardianRelationship.upsert({
      where: {
        guardianId_studentId: {
          guardianId: parentUser.id,
          studentId: student2.id,
        },
      },
      update: { verificationStatus: 'VERIFIED' },
      create: {
        guardianId: parentUser.id,
        studentId: student2.id,
        relationshipType: 'MOTHER',
        verificationStatus: 'VERIFIED',
        isPrimaryContact: true,
        isEmergencyContact: true,
        notes: 'Primary legal guardian and emergency respondent.',
      },
    });

    console.log(`  - Parent Sarah Chen linked to Liam Chen & Sophia Chen (VERIFIED)`);
  }

  console.log('--- Institutional Fixtures Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
