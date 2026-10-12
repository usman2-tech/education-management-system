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
    await prisma.user.upsert({
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

    await prisma.user.upsert({
      where: { email: 'parent@stjude.ems.local' },
      update: { passwordHash, isActive: true },
      create: {
        email: 'parent@stjude.ems.local',
        passwordHash,
        firstName: 'Sarah',
        lastName: 'Chen',
        role: UserRole.PARENT,
        schoolId: stJude.id,
        isActive: true,
      },
    });
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
