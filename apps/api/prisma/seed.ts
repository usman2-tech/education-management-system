/**
 * MODULE: Database Seeding & Institutional Fixtures
 *
 * PURPOSE:
 * Seeds baseline institutional tenancy records and five development test accounts
 * across all core roles (PLATFORM_ADMIN, SCHOOL_ADMIN, TEACHER, STUDENT, PARENT)
 * for rapid manual testing and integration verification.
 *
 * DEPENDENCIES:
 * @prisma/client, bcryptjs
 *
 * SECURITY:
 * All passwords hashed with bcryptjs (salt rounds: 10).
 * Platform Admin has null schoolId; institutional roles are bound to St. Jude Academy.
 */

import { PrismaClient, UserRole, SchoolStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Database Seeding ---');

  // 1. Seed or update default institutional school
  const defaultSchool = await prisma.school.upsert({
    where: { code: 'st-jude' },
    update: {
      name: 'St. Jude Institutional Academy',
      status: SchoolStatus.ACTIVE,
      domain: 'stjude.ems.local',
      address: '100 Institutional Boulevard, Academic District',
      phone: '+1-555-019-2831',
      email: 'admissions@stjude.ems.local',
    },
    create: {
      name: 'St. Jude Institutional Academy',
      code: 'st-jude',
      status: SchoolStatus.ACTIVE,
      domain: 'stjude.ems.local',
      address: '100 Institutional Boulevard, Academic District',
      phone: '+1-555-019-2831',
      email: 'admissions@stjude.ems.local',
      settings: {
        theme: 'institutional-navy',
        academicYear: '2026-2027',
        gradingSystem: 'GPA_4_0',
        allowParentPortal: true,
      },
    },
  });

  console.log(`[Seed] Institutional School initialized: ${defaultSchool.name} (${defaultSchool.id})`);

  // 2. Hash default testing password
  const defaultPassword = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  // 3. Define the 5 development test accounts
  const testAccounts = [
    {
      email: 'platform.admin@ems.local',
      firstName: 'Alexander',
      lastName: 'Vance',
      role: UserRole.PLATFORM_ADMIN,
      schoolId: null, // Platform scope
    },
    {
      email: 'admin@stjude.ems.local',
      firstName: 'Eleanor',
      lastName: 'Pemberton',
      role: UserRole.SCHOOL_ADMIN,
      schoolId: defaultSchool.id,
    },
    {
      email: 'teacher@stjude.ems.local',
      firstName: 'Marcus',
      lastName: 'Holloway',
      role: UserRole.TEACHER,
      schoolId: defaultSchool.id,
    },
    {
      email: 'student@stjude.ems.local',
      firstName: 'Liam',
      lastName: 'Chen',
      role: UserRole.STUDENT,
      schoolId: defaultSchool.id,
    },
    {
      email: 'parent@stjude.ems.local',
      firstName: 'Sarah',
      lastName: 'Chen',
      role: UserRole.PARENT,
      schoolId: defaultSchool.id,
    },
  ];

  for (const acc of testAccounts) {
    const user = await prisma.user.upsert({
      where: { email: acc.email },
      update: {
        firstName: acc.firstName,
        lastName: acc.lastName,
        role: acc.role,
        schoolId: acc.schoolId,
        passwordHash,
        isActive: true,
      },
      create: {
        email: acc.email,
        passwordHash,
        firstName: acc.firstName,
        lastName: acc.lastName,
        role: acc.role,
        schoolId: acc.schoolId,
        isActive: true,
      },
    });

    console.log(`[Seed] User configured: ${user.email} [${user.role}] - School: ${user.schoolId ?? 'GLOBAL'}`);
  }

  console.log('--- Database Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
