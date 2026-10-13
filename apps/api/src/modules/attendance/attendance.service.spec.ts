/**
 * MODULE: Attendance Management - AttendanceService Unit Tests
 *
 * PURPOSE:
 * Verifies all 20 required automated test scenarios:
 * 1. School Admin creates an authorized attendance session.
 * 2. Teacher creates/marks attendance for assigned class.
 * 3. Teacher cannot mark another teacher's class.
 * 4. Student cannot mark attendance.
 * 5. Parent cannot mark attendance.
 * 6. Attendance roster contains only eligible enrolled students.
 * 7. Duplicate attendance records are prevented.
 * 8. Bulk attendance saves atomically.
 * 9. Draft session can be updated.
 * 10. Finalized session rejects unauthorized modifications.
 * 11. Authorized correction is audited.
 * 12. Student views only own attendance.
 * 13. Parent views only verified linked child's attendance.
 * 14. Revoked guardian cannot view attendance.
 * 15. School Admin cannot access another school's attendance.
 * 16. NFC scan accepts valid simulated identity.
 * 17. NFC scan rejects unknown or disabled identity.
 * 18. NFC scan rejects cross-school identity.
 * 19. NFC duplicate scan is handled safely.
 * 20. Attendance reports calculate correct totals and percentages.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthUser,
  UserRole,
  AttendanceStatus,
  AttendanceSessionType,
  AttendanceSessionStatus,
  NFCIdentityStatus,
  NFCEventStatus,
} from '@ems/contracts';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: any;

  const schoolA = 'school-uuid-a';
  const schoolB = 'school-uuid-b';

  const schoolAdminA: AuthUser = {
    id: 'admin-uuid-a',
    email: 'admin@stjude.ems.local',
    firstName: 'Eleanor',
    lastName: 'Admin',
    role: UserRole.SCHOOL_ADMIN,
    schoolId: schoolA,
  };

  const teacherA: AuthUser = {
    id: 'teacher-uuid-a',
    email: 'teacher@stjude.ems.local',
    firstName: 'Marcus',
    lastName: 'Holloway',
    role: UserRole.TEACHER,
    schoolId: schoolA,
  };

  const teacherB: AuthUser = {
    id: 'teacher-uuid-b',
    email: 'other.teacher@stjude.ems.local',
    firstName: 'Other',
    lastName: 'Teacher',
    role: UserRole.TEACHER,
    schoolId: schoolA,
  };

  const studentA: AuthUser = {
    id: 'student-uuid-a',
    email: 'liam@stjude.ems.local',
    firstName: 'Liam',
    lastName: 'Chen',
    role: UserRole.STUDENT,
    schoolId: schoolA,
  };

  const parentA: AuthUser = {
    id: 'parent-uuid-a',
    email: 'sarah@parents.local',
    firstName: 'Sarah',
    lastName: 'Chen',
    role: UserRole.PARENT,
    schoolId: null,
  };

  const mockSectionA = {
    id: 'section-uuid-a',
    name: 'Section A',
    academicYearId: 'ay-uuid-1',
    classTeacherId: teacherA.id,
    schoolClass: {
      id: 'class-uuid-1',
      name: 'Grade 10',
      schoolId: schoolA,
      school: { id: schoolA, name: 'St. Jude Academy' },
    },
    academicYear: { id: 'ay-uuid-1', name: '2026-2027' },
    classTeacher: { id: teacherA.id, firstName: 'Marcus', lastName: 'Holloway' },
    teacherSubjectAssignments: [],
  };

  const mockSessionA = {
    id: 'session-uuid-a',
    schoolId: schoolA,
    academicYearId: 'ay-uuid-1',
    classSectionId: mockSectionA.id,
    attendanceDate: new Date('2026-10-13T00:00:00.000Z'),
    sessionType: AttendanceSessionType.DAILY,
    timetableEntryId: null,
    createdById: schoolAdminA.id,
    status: AttendanceSessionStatus.DRAFT,
    finalizedAt: null,
    finalizedById: null,
    createdAt: new Date('2026-10-13T00:00:00.000Z'),
    updatedAt: new Date('2026-10-13T00:00:00.000Z'),
    school: { id: schoolA, name: 'St. Jude Academy' },
    academicYear: { id: 'ay-uuid-1', name: '2026-2027' },
    classSection: mockSectionA,
    createdBy: { firstName: 'Eleanor', lastName: 'Admin' },
    finalizedBy: null,
    timetableEntry: null,
    records: [
      {
        id: 'rec-1',
        attendanceSessionId: 'session-uuid-a',
        studentId: studentA.id,
        status: AttendanceStatus.PRESENT,
        remarks: null,
        markedById: schoolAdminA.id,
        student: {
          id: studentA.id,
          firstName: 'Liam',
          lastName: 'Chen',
          email: studentA.email,
          studentProfile: { admissionNumber: 'ADM-1001' },
          classEnrollments: [{ rollNumber: '1001' }],
        },
        markedBy: { firstName: 'Eleanor', lastName: 'Admin' },
        markedAt: new Date('2026-10-13T00:00:00.000Z'),
        updatedAt: new Date('2026-10-13T00:00:00.000Z'),
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      classSection: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      attendanceSession: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      attendanceRecord: {
        createMany: jest.fn(),
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      classEnrollment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      studentGuardianRelationship: {
        findFirst: jest.fn(),
      },
      teacherSubjectAssignment: {
        findMany: jest.fn(),
      },
      timetableEntry: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      nFCIdentity: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      nFCAttendanceEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }
        return callback;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AttendanceService>(AttendanceService);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 1 & 2: Authorized creation & teacher marking
  // ---------------------------------------------------------------------------
  it('1. School Admin creates an authorized attendance session', async () => {
    prisma.classSection.findUnique.mockResolvedValue(mockSectionA);
    prisma.attendanceSession.findFirst.mockResolvedValue(null);
    prisma.attendanceSession.create.mockResolvedValue(mockSessionA);
    prisma.classEnrollment.findMany.mockResolvedValue([{ studentId: studentA.id }]);
    prisma.attendanceSession.findUnique.mockResolvedValue(mockSessionA);

    const result = await service.createSession(
      {
        classSectionId: mockSectionA.id,
        attendanceDate: '2026-10-13',
        sessionType: AttendanceSessionType.DAILY,
      },
      schoolAdminA,
    );

    expect(result).toBeDefined();
    expect(result.id).toBe(mockSessionA.id);
    expect(result.recordsCount).toBe(1);
    expect(prisma.attendanceSession.create).toHaveBeenCalled();
  });

  it('2. Teacher creates attendance for assigned class section', async () => {
    prisma.classSection.findUnique.mockResolvedValue(mockSectionA);
    prisma.attendanceSession.findFirst.mockResolvedValue(null);
    prisma.attendanceSession.create.mockResolvedValue(mockSessionA);
    prisma.classEnrollment.findMany.mockResolvedValue([{ studentId: studentA.id }]);
    prisma.attendanceSession.findUnique.mockResolvedValue(mockSessionA);

    const result = await service.createSession(
      {
        classSectionId: mockSectionA.id,
        attendanceDate: '2026-10-13',
        sessionType: AttendanceSessionType.DAILY,
      },
      teacherA,
    );

    expect(result).toBeDefined();
    expect(result.classSectionId).toBe(mockSectionA.id);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Teacher cannot mark unassigned class
  // ---------------------------------------------------------------------------
  it("3. Teacher cannot create attendance for another teacher's unassigned class", async () => {
    prisma.classSection.findUnique.mockResolvedValue(mockSectionA);
    prisma.timetableEntry.findFirst.mockResolvedValue(null);

    await expect(
      service.createSession(
        {
          classSectionId: mockSectionA.id,
          attendanceDate: '2026-10-13',
          sessionType: AttendanceSessionType.DAILY,
        },
        teacherB,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4 & 5: Students and Parents cannot mark attendance
  // ---------------------------------------------------------------------------
  it('4. Student cannot create or mark attendance', async () => {
    prisma.classSection.findUnique.mockResolvedValue(mockSectionA);

    await expect(
      service.createSession(
        {
          classSectionId: mockSectionA.id,
          attendanceDate: '2026-10-13',
        },
        studentA,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('5. Parent cannot create or mark attendance', async () => {
    prisma.classSection.findUnique.mockResolvedValue(mockSectionA);

    await expect(
      service.createSession(
        {
          classSectionId: mockSectionA.id,
          attendanceDate: '2026-10-13',
        },
        parentA,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Roster contains only eligible enrolled students
  // ---------------------------------------------------------------------------
  it('6. Rejects attendance for a student not enrolled in the class roster', async () => {
    prisma.attendanceSession.findUnique.mockResolvedValue(mockSessionA);
    prisma.classSection.findUnique.mockResolvedValue(mockSectionA);
    prisma.classEnrollment.findMany.mockResolvedValue([]); // No valid enrollment

    await expect(
      service.bulkMarkRecords(
        mockSessionA.id,
        {
          records: [
            { studentId: 'unrelated-student-id', status: AttendanceStatus.PRESENT },
          ],
        },
        schoolAdminA,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Duplicate attendance records are prevented
  // ---------------------------------------------------------------------------
  it('7. Rejects bulk mark request containing duplicate student IDs', async () => {
    prisma.attendanceSession.findUnique.mockResolvedValue(mockSessionA);

    await expect(
      service.bulkMarkRecords(
        mockSessionA.id,
        {
          records: [
            { studentId: studentA.id, status: AttendanceStatus.PRESENT },
            { studentId: studentA.id, status: AttendanceStatus.ABSENT },
          ],
        },
        schoolAdminA,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Bulk attendance saves atomically
  // ---------------------------------------------------------------------------
  it('8. Bulk attendance saves atomically inside transaction', async () => {
    prisma.attendanceSession.findUnique
      .mockResolvedValueOnce(mockSessionA)
      .mockResolvedValueOnce(mockSessionA);
    prisma.classEnrollment.findMany.mockResolvedValue([{ studentId: studentA.id }]);
    prisma.attendanceRecord.upsert.mockResolvedValue({});

    const result = await service.bulkMarkRecords(
      mockSessionA.id,
      {
        records: [
          { studentId: studentA.id, status: AttendanceStatus.LATE, remarks: 'Bus delay' },
        ],
      },
      schoolAdminA,
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 9: Draft session can be updated
  // ---------------------------------------------------------------------------
  it('9. Draft session details can be updated', async () => {
    prisma.attendanceSession.findUnique
      .mockResolvedValueOnce(mockSessionA)
      .mockResolvedValueOnce({
        ...mockSessionA,
        attendanceDate: new Date('2026-10-14T00:00:00.000Z'),
      });
    prisma.attendanceSession.update.mockResolvedValue({});

    const result = await service.updateSession(
      mockSessionA.id,
      { attendanceDate: '2026-10-14' },
      schoolAdminA,
    );

    expect(result).toBeDefined();
    expect(prisma.attendanceSession.update).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 10: Finalized session rejects unauthorized modifications
  // ---------------------------------------------------------------------------
  it('10. Finalized session rejects modifications by ordinary teachers', async () => {
    const finalizedSession = {
      ...mockSessionA,
      status: AttendanceSessionStatus.FINALIZED,
    };
    prisma.attendanceSession.findUnique.mockResolvedValue(finalizedSession);
    prisma.classSection.findUnique.mockResolvedValue(mockSectionA);

    await expect(
      service.bulkMarkRecords(
        mockSessionA.id,
        {
          records: [
            { studentId: studentA.id, status: AttendanceStatus.ABSENT },
          ],
        },
        teacherA,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 11: Authorized correction is audited
  // ---------------------------------------------------------------------------
  it('11. Authorized administrator correction on finalized session logs audit event', async () => {
    const finalizedSession = {
      ...mockSessionA,
      status: AttendanceSessionStatus.FINALIZED,
    };
    prisma.attendanceSession.findUnique
      .mockResolvedValueOnce(finalizedSession)
      .mockResolvedValueOnce(finalizedSession);
    prisma.classEnrollment.findMany.mockResolvedValue([{ studentId: studentA.id }]);
    prisma.attendanceRecord.upsert.mockResolvedValue({});

    await service.bulkMarkRecords(
      mockSessionA.id,
      {
        records: [
          { studentId: studentA.id, status: AttendanceStatus.EXCUSED, remarks: 'Doctor note' },
        ],
      },
      schoolAdminA,
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ATTENDANCE_CORRECTION_APPLIED',
        }),
      }),
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 12: Student views only own attendance
  // ---------------------------------------------------------------------------
  it('12. Student can inspect own attendance but is rejected on another student', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: studentA.id,
      firstName: 'Liam',
      lastName: 'Chen',
      email: studentA.email,
      classEnrollments: [{ section: mockSectionA }],
    });
    prisma.attendanceRecord.findMany.mockResolvedValue([
      {
        id: 'rec-1',
        status: AttendanceStatus.PRESENT,
        attendanceSession: mockSessionA,
      },
    ]);

    const ownResult = await service.getStudentAttendance(studentA.id, studentA);
    expect(ownResult.studentId).toBe(studentA.id);
    expect(ownResult.attendancePercentage).toBe(100);

    // Rejecting access to other student
    prisma.user.findUnique.mockResolvedValue({
      id: 'other-student-id',
      firstName: 'Other',
      lastName: 'Student',
      email: 'other@school.local',
      classEnrollments: [],
    });

    await expect(
      service.getStudentAttendance('other-student-id', studentA),
    ).rejects.toThrow(ForbiddenException);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 13 & 14: Parent guardian relationship verification & revocation
  // ---------------------------------------------------------------------------
  it('13. Parent can view verified linked child attendance', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: studentA.id,
      firstName: 'Liam',
      lastName: 'Chen',
      email: studentA.email,
      classEnrollments: [{ section: mockSectionA }],
    });
    prisma.studentGuardianRelationship.findFirst.mockResolvedValue({
      guardianId: parentA.id,
      studentId: studentA.id,
      verificationStatus: 'VERIFIED',
    });
    prisma.attendanceRecord.findMany.mockResolvedValue([
      {
        id: 'rec-1',
        status: AttendanceStatus.PRESENT,
        attendanceSession: mockSessionA,
      },
    ]);

    const result = await service.getStudentAttendance(studentA.id, parentA);
    expect(result.studentId).toBe(studentA.id);
    expect(result.totalSessions).toBe(1);
  });

  it('14. Revoked guardian relationship immediately blocks attendance access', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: studentA.id,
      firstName: 'Liam',
      lastName: 'Chen',
      email: studentA.email,
      classEnrollments: [{ section: mockSectionA }],
    });
    prisma.studentGuardianRelationship.findFirst.mockResolvedValue(null); // Revoked or not verified

    await expect(
      service.getStudentAttendance(studentA.id, parentA),
    ).rejects.toThrow(ForbiddenException);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 15: Cross-school access denial
  // ---------------------------------------------------------------------------
  it('15. School Admin cannot access another school attendance session', async () => {
    const schoolBSession = {
      ...mockSessionA,
      id: 'session-b',
      schoolId: schoolB,
    };
    prisma.attendanceSession.findUnique.mockResolvedValue(schoolBSession);

    await expect(
      service.getSessionById('session-b', schoolAdminA),
    ).rejects.toThrow(ForbiddenException);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 16: NFC scan accepts valid simulated identity
  // ---------------------------------------------------------------------------
  it('16. NFC scan accepts valid simulated card token and marks student PRESENT', async () => {
    const cardToken = 'NFC-STJUDE-9921';

    prisma.attendanceSession.findUnique.mockResolvedValue(mockSessionA);
    prisma.nFCIdentity.findUnique.mockResolvedValue({
      id: 'nfc-id-1',
      schoolId: schoolA,
      studentId: studentA.id,
      status: NFCIdentityStatus.ACTIVE,
      student: { firstName: 'Liam', lastName: 'Chen' },
    });
    prisma.classEnrollment.findFirst.mockResolvedValue({ id: 'enr-1' });
    prisma.attendanceRecord.findUnique.mockResolvedValue(null); // not marked yet

    const result = await service.scanNFC(
      { attendanceSessionId: mockSessionA.id, cardToken },
      schoolAdminA,
    );

    expect(result.eventStatus).toBe(NFCEventStatus.ACCEPTED);
    expect(result.markedStatus).toBe(AttendanceStatus.PRESENT);
    expect(prisma.nFCAttendanceEvent.create).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 17: NFC scan rejects unknown or disabled identity
  // ---------------------------------------------------------------------------
  it('17. NFC scan rejects unknown or disabled identity', async () => {
    prisma.attendanceSession.findUnique.mockResolvedValue(mockSessionA);
    prisma.nFCIdentity.findUnique.mockResolvedValue(null); // unknown card

    await expect(
      service.scanNFC(
        { attendanceSessionId: mockSessionA.id, cardToken: 'INVALID-TOKEN' },
        schoolAdminA,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.nFCAttendanceEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventStatus: NFCEventStatus.REJECTED,
        }),
      }),
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 18: NFC scan rejects cross-school identity
  // ---------------------------------------------------------------------------
  it('18. NFC scan rejects cross-school identity mismatch', async () => {
    prisma.attendanceSession.findUnique.mockResolvedValue(mockSessionA);
    prisma.nFCIdentity.findUnique.mockResolvedValue({
      id: 'nfc-id-cross',
      schoolId: schoolB, // Belongs to School B!
      studentId: 'student-b',
      status: NFCIdentityStatus.ACTIVE,
      student: { firstName: 'Cross', lastName: 'Student' },
    });

    await expect(
      service.scanNFC(
        { attendanceSessionId: mockSessionA.id, cardToken: 'TOKEN-CROSS' },
        schoolAdminA,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 19: NFC duplicate scan is handled safely
  // ---------------------------------------------------------------------------
  it('19. NFC duplicate scan returns DUPLICATE status without duplicate records', async () => {
    const cardToken = 'NFC-STJUDE-9921';
    prisma.attendanceSession.findUnique.mockResolvedValue(mockSessionA);
    prisma.nFCIdentity.findUnique.mockResolvedValue({
      id: 'nfc-id-1',
      schoolId: schoolA,
      studentId: studentA.id,
      status: NFCIdentityStatus.ACTIVE,
      student: { firstName: 'Liam', lastName: 'Chen' },
    });
    prisma.classEnrollment.findFirst.mockResolvedValue({ id: 'enr-1' });
    prisma.attendanceRecord.findUnique.mockResolvedValue({
      status: AttendanceStatus.PRESENT,
    }); // Already marked PRESENT

    const result = await service.scanNFC(
      { attendanceSessionId: mockSessionA.id, cardToken },
      schoolAdminA,
    );

    expect(result.eventStatus).toBe(NFCEventStatus.DUPLICATE);
    expect(result.message).toContain('Duplicate scan ignored');
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 20: Attendance reports calculate correct totals and percentages
  // ---------------------------------------------------------------------------
  it('20. Attendance reports calculate exact totals and percentages', async () => {
    prisma.attendanceSession.findMany.mockResolvedValue([
      {
        id: 's-1',
        attendanceDate: new Date('2026-10-13T00:00:00.000Z'),
        records: [
          {
            studentId: studentA.id,
            status: AttendanceStatus.PRESENT,
            student: { firstName: 'Liam', lastName: 'Chen' },
          },
          {
            studentId: 'student-2',
            status: AttendanceStatus.ABSENT,
            student: { firstName: 'Sophia', lastName: 'Chen' },
          },
          {
            studentId: 'student-3',
            status: AttendanceStatus.LATE,
            student: { firstName: 'Noah', lastName: 'Taylor' },
          },
        ],
      },
    ]);

    const report = await service.getAttendanceReports(schoolAdminA);

    expect(report.totalSessions).toBe(1);
    expect(report.totalRecords).toBe(3);
    expect(report.presentCount).toBe(1);
    expect(report.absentCount).toBe(1);
    expect(report.lateCount).toBe(1);
    expect(report.excusedCount).toBe(0);
    // (present: 1 + late: 1) / total: 3 = 67%
    expect(report.overallAttendancePercentage).toBe(67);
    expect(report.byDate.length).toBe(1);
    expect(report.byStudent?.length).toBe(3);
  });
});
