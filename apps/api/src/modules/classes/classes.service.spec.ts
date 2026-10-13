/**
 * MODULE: Classes & Timetables - ClassesService Unit Tests
 *
 * PURPOSE:
 * Automated verification of academic structures and timetable conflict engine:
 * - Academic Year, Class, Section, and Subject creation
 * - Teacher assignment and student enrollment
 * - Timetable creation
 * - Teacher overlap conflict rejection
 * - Class section overlap conflict rejection
 * - Room booking overlap conflict rejection
 * - Teacher, Student, and Parent timetable visibility
 * - RBAC authorization boundaries
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthUser,
  UserRole,
  EnrollmentStatus,
  RelationshipVerificationStatus,
} from '@ems/contracts';

describe('ClassesService', () => {
  let service: ClassesService;
  let prisma: any;

  const schoolAdminA: AuthUser = {
    id: 'school-admin-uuid-a',
    email: 'admin@stjude.ems.local',
    firstName: 'Eleanor',
    lastName: 'Pemberton',
    role: UserRole.SCHOOL_ADMIN,
    schoolId: 'school-uuid-a',
  };

  const teacherA: AuthUser = {
    id: 'teacher-uuid-a',
    email: 'marcus@stjude.ems.local',
    firstName: 'Marcus',
    lastName: 'Holloway',
    role: UserRole.TEACHER,
    schoolId: 'school-uuid-a',
  };

  const studentA: AuthUser = {
    id: 'student-uuid-a',
    email: 'liam.chen@students.local',
    firstName: 'Liam',
    lastName: 'Chen',
    role: UserRole.STUDENT,
    schoolId: 'school-uuid-a',
  };

  const parentA: AuthUser = {
    id: 'parent-uuid-a',
    email: 'sarah.chen@parents.local',
    firstName: 'Sarah',
    lastName: 'Chen',
    role: UserRole.PARENT,
    schoolId: 'school-uuid-a',
  };

  beforeEach(async () => {
    prisma = {
      academicYear: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      schoolClass: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      classSection: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      subject: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      classEnrollment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      teacherSubjectAssignment: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      timetableEntry: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      studentGuardianRelationship: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
  });

  describe('Scenario 8: Create academic year', () => {
    it('creates an academic year for authorized school', async () => {
      prisma.academicYear.findUnique.mockResolvedValue(null);
      prisma.academicYear.create.mockResolvedValue({
        id: 'ay-1',
        schoolId: 'school-uuid-a',
        name: '2026-2027',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-06-30'),
        isCurrent: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.createAcademicYear(
        {
          name: '2026-2027',
          startDate: '2026-09-01T00:00:00.000Z',
          endDate: '2027-06-30T00:00:00.000Z',
          isCurrent: true,
        },
        schoolAdminA,
      );

      expect(res.id).toBe('ay-1');
      expect(res.name).toBe('2026-2027');
    });

    it('rejects academic year if startDate >= endDate', async () => {
      await expect(
        service.createAcademicYear(
          {
            name: '2026-2027',
            startDate: '2027-09-01T00:00:00.000Z',
            endDate: '2026-06-30T00:00:00.000Z',
          },
          schoolAdminA,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Scenario 9 & 10: Create class, section and subject', () => {
    it('creates school class and class section', async () => {
      prisma.schoolClass.findUnique.mockResolvedValue(null);
      prisma.schoolClass.create.mockResolvedValue({
        id: 'class-1',
        schoolId: 'school-uuid-a',
        name: 'Grade 10',
        code: 'G10',
        order: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const schoolClass = await service.createClass(
        { name: 'Grade 10', code: 'G10', order: 10 },
        schoolAdminA,
      );
      expect(schoolClass.code).toBe('G10');

      // Create section
      prisma.schoolClass.findUnique.mockResolvedValue({ id: 'class-1', schoolId: 'school-uuid-a' });
      prisma.academicYear.findUnique.mockResolvedValue({ id: 'ay-1', schoolId: 'school-uuid-a' });
      prisma.classSection.findUnique.mockResolvedValue(null);
      prisma.classSection.create.mockResolvedValue({
        id: 'sec-1',
        classId: 'class-1',
        academicYearId: 'ay-1',
        name: 'Section A',
        capacity: 30,
        roomNumber: 'Room 201',
        createdAt: new Date(),
        updatedAt: new Date(),
        schoolClass: { name: 'Grade 10', code: 'G10' },
        academicYear: { name: '2026-2027' },
        classTeacher: null,
      });

      const section = await service.createSection(
        { classId: 'class-1', academicYearId: 'ay-1', name: 'Section A', capacity: 30 },
        schoolAdminA,
      );
      expect(section.name).toBe('Section A');
    });

    it('creates subject for school', async () => {
      prisma.subject.findUnique.mockResolvedValue(null);
      prisma.subject.create.mockResolvedValue({
        id: 'sub-1',
        schoolId: 'school-uuid-a',
        name: 'Physics',
        code: 'PHY101',
        credits: 1.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const subject = await service.createSubject(
        { name: 'Physics', code: 'PHY101', credits: 1.0 },
        schoolAdminA,
      );
      expect(subject.code).toBe('PHY101');
    });
  });

  describe('Scenario 11 & 12: Assign teacher and enroll student', () => {
    it('assigns teacher to subject for section', async () => {
      prisma.classSection.findUnique.mockResolvedValue({
        id: 'sec-1',
        academicYearId: 'ay-1',
        schoolClass: { schoolId: 'school-uuid-a' },
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'teacher-uuid-a', role: UserRole.TEACHER });
      prisma.subject.findUnique.mockResolvedValue({ id: 'sub-1', schoolId: 'school-uuid-a' });
      prisma.teacherSubjectAssignment.upsert.mockResolvedValue({
        id: 'assign-1',
        teacherId: 'teacher-uuid-a',
        subjectId: 'sub-1',
        sectionId: 'sec-1',
        academicYearId: 'ay-1',
        teacher: { id: 'teacher-uuid-a', firstName: 'Marcus', lastName: 'Holloway', email: 'marcus@stjude.ems.local' },
        subject: { id: 'sub-1', name: 'Physics', code: 'PHY101' },
        section: { name: 'Section A', schoolClass: { name: 'Grade 10' } },
      });

      const res = await service.assignTeacherToSubject(
        'sec-1',
        { teacherId: 'teacher-uuid-a', subjectId: 'sub-1' },
        schoolAdminA,
      );

      expect(res.id).toBe('assign-1');
      expect(res.subjectName).toBe('Physics');
    });

    it('enrolls student into section', async () => {
      prisma.classSection.findUnique.mockResolvedValue({
        id: 'sec-1',
        academicYearId: 'ay-1',
        capacity: 30,
        schoolClass: { schoolId: 'school-uuid-a' },
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'student-uuid-a',
        role: UserRole.STUDENT,
        schoolId: 'school-uuid-a',
      });
      prisma.classEnrollment.count.mockResolvedValue(15);
      prisma.classEnrollment.findUnique.mockResolvedValue(null);
      prisma.classEnrollment.create.mockResolvedValue({
        id: 'enr-1',
        studentId: 'student-uuid-a',
        sectionId: 'sec-1',
        academicYearId: 'ay-1',
        rollNumber: '10A-01',
        enrolledAt: new Date(),
        status: EnrollmentStatus.ACTIVE,
        student: { id: 'student-uuid-a', firstName: 'Liam', lastName: 'Chen', email: 'liam@test.local' },
      });

      const res = await service.enrollStudent(
        'sec-1',
        { studentId: 'student-uuid-a', rollNumber: '10A-01' },
        schoolAdminA,
      );

      expect(res.id).toBe('enr-1');
      expect(res.status).toBe(EnrollmentStatus.ACTIVE);
    });
  });

  describe('Scenario 13, 14, 15, 16: Timetable creation & Conflict engine', () => {
    it('creates timetable entry when no conflict exists', async () => {
      prisma.classSection.findUnique.mockResolvedValue({
        id: 'sec-1',
        schoolClass: { schoolId: 'school-uuid-a', name: 'Grade 10' },
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'teacher-uuid-a', role: UserRole.TEACHER });
      prisma.subject.findUnique.mockResolvedValue({ id: 'sub-1', schoolId: 'school-uuid-a' });

      // No conflict detected
      prisma.timetableEntry.findMany.mockResolvedValue([]);
      prisma.timetableEntry.create.mockResolvedValue({
        id: 'tt-1',
        schoolId: 'school-uuid-a',
        sectionId: 'sec-1',
        subjectId: 'sub-1',
        teacherId: 'teacher-uuid-a',
        academicYearId: 'ay-1',
        dayOfWeek: 1,
        periodName: 'Period 1',
        startTime: '08:30',
        endTime: '09:20',
        roomNumber: 'Room 101',
        createdAt: new Date(),
        updatedAt: new Date(),
        section: { name: 'Section A', schoolClass: { name: 'Grade 10' } },
        subject: { name: 'Physics', code: 'PHY101' },
        teacher: { firstName: 'Marcus', lastName: 'Holloway', email: 'marcus@stjude.ems.local' },
        academicYear: { name: '2026-2027' },
      });

      const entry = await service.createTimetableEntry(
        {
          sectionId: 'sec-1',
          subjectId: 'sub-1',
          teacherId: 'teacher-uuid-a',
          academicYearId: 'ay-1',
          dayOfWeek: 1,
          periodName: 'Period 1',
          startTime: '08:30',
          endTime: '09:20',
          roomNumber: 'Room 101',
        },
        schoolAdminA,
      );

      expect(entry.id).toBe('tt-1');
    });

    it('rejects timetable entry on TEACHER scheduling conflict', async () => {
      prisma.classSection.findUnique.mockResolvedValue({
        id: 'sec-2',
        schoolClass: { schoolId: 'school-uuid-a', name: 'Grade 11' },
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'teacher-uuid-a', role: UserRole.TEACHER });
      prisma.subject.findUnique.mockResolvedValue({ id: 'sub-1', schoolId: 'school-uuid-a' });

      // Teacher already scheduled at 08:30 - 09:20
      prisma.timetableEntry.findMany.mockResolvedValueOnce([
        {
          id: 'existing-tt',
          startTime: '08:30',
          endTime: '09:20',
          teacher: { firstName: 'Marcus', lastName: 'Holloway' },
          section: { name: 'Section A', schoolClass: { name: 'Grade 10' } },
          subject: { name: 'Physics' },
          academicYear: { name: '2026-2027' },
        },
      ]);

      await expect(
        service.createTimetableEntry(
          {
            sectionId: 'sec-2',
            subjectId: 'sub-1',
            teacherId: 'teacher-uuid-a',
            academicYearId: 'ay-1',
            dayOfWeek: 1,
            periodName: 'Period 1',
            startTime: '08:45', // Overlaps!
            endTime: '09:35',
          },
          schoolAdminA,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects timetable entry on CLASS SECTION scheduling conflict', async () => {
      prisma.classSection.findUnique.mockResolvedValue({
        id: 'sec-1',
        schoolClass: { schoolId: 'school-uuid-a', name: 'Grade 10' },
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'other-teacher', role: UserRole.TEACHER });
      prisma.subject.findUnique.mockResolvedValue({ id: 'sub-2', schoolId: 'school-uuid-a' });

      // No teacher conflict
      prisma.timetableEntry.findMany.mockResolvedValueOnce([]);
      // Section conflict
      prisma.timetableEntry.findMany.mockResolvedValueOnce([
        {
          id: 'existing-sec-tt',
          startTime: '08:30',
          endTime: '09:20',
          teacher: { firstName: 'Marcus', lastName: 'Holloway' },
          section: { name: 'Section A', schoolClass: { name: 'Grade 10' } },
          subject: { name: 'Physics' },
          academicYear: { name: '2026-2027' },
        },
      ]);

      await expect(
        service.createTimetableEntry(
          {
            sectionId: 'sec-1',
            subjectId: 'sub-2',
            teacherId: 'other-teacher',
            academicYearId: 'ay-1',
            dayOfWeek: 1,
            periodName: 'Period 1',
            startTime: '08:30',
            endTime: '09:20',
          },
          schoolAdminA,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects timetable entry on ROOM booking conflict', async () => {
      prisma.classSection.findUnique.mockResolvedValue({
        id: 'sec-2',
        schoolClass: { schoolId: 'school-uuid-a', name: 'Grade 11' },
      });
      prisma.user.findUnique.mockResolvedValue({ id: 'other-teacher', role: UserRole.TEACHER });
      prisma.subject.findUnique.mockResolvedValue({ id: 'sub-2', schoolId: 'school-uuid-a' });

      // No teacher conflict, no section conflict
      prisma.timetableEntry.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        // Room conflict
        .mockResolvedValueOnce([
          {
            id: 'room-conflict-entry',
            startTime: '08:30',
            endTime: '09:20',
            roomNumber: 'Room 204',
            teacher: { firstName: 'Marcus', lastName: 'Holloway' },
            section: { name: 'Section A', schoolClass: { name: 'Grade 10' } },
            subject: { name: 'Physics' },
            academicYear: { name: '2026-2027' },
          },
        ]);

      await expect(
        service.createTimetableEntry(
          {
            sectionId: 'sec-2',
            subjectId: 'sub-2',
            teacherId: 'other-teacher',
            academicYearId: 'ay-1',
            dayOfWeek: 1,
            periodName: 'Period 1',
            startTime: '08:30',
            endTime: '09:20',
            roomNumber: 'Room 204',
          },
          schoolAdminA,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Scenario 17, 18, 19: Role Timetable Visibility', () => {
    it('Teacher sees own timetable; cannot view another teacher timetable', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: teacherA.id, role: UserRole.TEACHER, schoolId: 'school-uuid-a' });
      prisma.timetableEntry.findMany.mockResolvedValue([
        {
          id: 'tt-1',
          startTime: '08:30',
          endTime: '09:20',
          dayOfWeek: 1,
          periodName: 'Period 1',
          teacher: { firstName: 'Marcus', lastName: 'Holloway' },
          section: { name: 'Section A', schoolClass: { name: 'Grade 10' } },
          subject: { name: 'Physics' },
          academicYear: { name: '2026-2027' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await service.getTeacherTimetable(teacherA.id, teacherA);
      expect(res.length).toBe(1);

      // Denies teacher viewing other teacher
      await expect(service.getTeacherTimetable('other-teacher-id', teacherA)).rejects.toThrow(ForbiddenException);
    });

    it('Student sees own timetable based on active enrollment', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: studentA.id,
        role: UserRole.STUDENT,
        schoolId: 'school-uuid-a',
        classEnrollments: [{ sectionId: 'sec-1' }],
      });
      prisma.timetableEntry.findMany.mockResolvedValue([
        {
          id: 'tt-1',
          startTime: '08:30',
          endTime: '09:20',
          dayOfWeek: 1,
          periodName: 'Period 1',
          teacher: { firstName: 'Marcus', lastName: 'Holloway' },
          section: { name: 'Section A', schoolClass: { name: 'Grade 10' } },
          subject: { name: 'Physics' },
          academicYear: { name: '2026-2027' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await service.getStudentTimetable(studentA.id, studentA);
      expect(res.length).toBe(1);

      // Student cannot view another student
      await expect(service.getStudentTimetable('other-student-id', studentA)).rejects.toThrow(ForbiddenException);
    });

    it('Parent sees child timetable only when relationship is VERIFIED', async () => {
      prisma.studentGuardianRelationship.findUnique.mockResolvedValue({
        guardianId: parentA.id,
        studentId: studentA.id,
        verificationStatus: RelationshipVerificationStatus.VERIFIED,
      });

      prisma.user.findUnique.mockResolvedValue({
        id: studentA.id,
        role: UserRole.STUDENT,
        schoolId: 'school-uuid-a',
        classEnrollments: [{ sectionId: 'sec-1' }],
      });
      prisma.timetableEntry.findMany.mockResolvedValue([]);

      const res = await service.getChildTimetable(studentA.id, parentA);
      expect(res).toEqual([]);

      // Denies parent if relationship revoked
      prisma.studentGuardianRelationship.findUnique.mockResolvedValueOnce({
        guardianId: parentA.id,
        studentId: studentA.id,
        verificationStatus: RelationshipVerificationStatus.REVOKED,
      });

      await expect(service.getChildTimetable(studentA.id, parentA)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Scenario 20: Unauthorized modifications rejected', () => {
    it('Teacher or Student cannot create academic structures or timetable entries', async () => {
      await expect(
        service.createAcademicYear({ name: '2026-2027', startDate: '2026-09-01', endDate: '2027-06-30' }, teacherA),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.createClass({ name: 'Grade 10', code: 'G10' }, studentA),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.createTimetableEntry(
          {
            sectionId: 'sec-1',
            subjectId: 'sub-1',
            teacherId: teacherA.id,
            academicYearId: 'ay-1',
            dayOfWeek: 1,
            periodName: 'Period 1',
            startTime: '08:30',
            endTime: '09:20',
          },
          teacherA,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
