/**
 * MODULE: Institutional Document Intelligence - Unit Test Suite (TASK 026)
 *
 * PURPOSE:
 * Tests document management lifecycle, strict tenant/role scoping, text extraction,
 * versioning, draft review workflow, TASK 030 broadcast integration, and narrative reports.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationsService } from '../communications/communications.service';
import { AuthUser, UserRole, DocumentCategory, DocumentProcessingStatus, DocumentDraftStatus } from '@ems/contracts';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('DocumentsService (TASK 026)', () => {
  let service: DocumentsService;
  let prisma: any;
  let communicationsService: any;

  const mockAdminUser: AuthUser = {
    id: 'admin-1',
    email: 'admin@school.edu',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.SCHOOL_ADMIN,
    schoolId: 'school-1',
  };

  const mockTeacherUser: AuthUser = {
    id: 'teacher-1',
    email: 'teacher@school.edu',
    firstName: 'Teacher',
    lastName: 'User',
    role: UserRole.TEACHER,
    schoolId: 'school-1',
  };

  const mockStudentUser: AuthUser = {
    id: 'student-1',
    email: 'student@school.edu',
    firstName: 'Student',
    lastName: 'User',
    role: UserRole.STUDENT,
    schoolId: 'school-1',
  };

  const mockParentUser: AuthUser = {
    id: 'parent-1',
    email: 'parent@home.org',
    firstName: 'Parent',
    lastName: 'User',
    role: UserRole.PARENT,
    schoolId: 'school-1',
  };

  beforeEach(async () => {
    prisma = {
      institutionalDocument: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      documentSection: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      documentVersionHistory: {
        create: jest.fn(),
      },
      documentApprovalDraft: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      studentGuardianRelationship: {
        findMany: jest.fn(),
      },
      attendanceRecord: {
        findMany: jest.fn(),
      },
      feeInvoice: {
        findMany: jest.fn(),
      },
      vehicle: { count: jest.fn() },
      transportRoute: { count: jest.fn() },
      studentTransportAllocation: { count: jest.fn() },
      vehicleMaintenance: { count: jest.fn() },
      libraryBook: { count: jest.fn() },
      bookLoan: { count: jest.fn() },
      libraryFine: { aggregate: jest.fn() },
      exam: { findMany: jest.fn() },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    communicationsService = {
      broadcastAnnouncement: jest.fn().mockResolvedValue({ count: 15, message: 'Broadcast successful' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CommunicationsService, useValue: communicationsService },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  describe('Document Creation & Validation', () => {
    it('1. Authorized admin can create an institutional document', async () => {
      const mockDoc = {
        id: 'doc-1',
        title: 'Attendance Policy',
        category: DocumentCategory.ATTENDANCE_POLICY,
        documentType: 'TXT',
        fileUrl: '/storage/documents/att.txt',
        fileSize: 100,
        version: 1,
        status: DocumentProcessingStatus.READY,
        isPublished: true,
        visibilityRoles: [UserRole.TEACHER, UserRole.PARENT],
        schoolId: 'school-1',
        uploadedById: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { sections: 2, versions: 1 },
      };

      prisma.institutionalDocument.create.mockResolvedValue(mockDoc);

      const result = await service.createDocument(mockAdminUser, {
        title: 'Attendance Policy',
        category: DocumentCategory.ATTENDANCE_POLICY,
        documentType: 'TXT',
        textContent: 'Section 1: Morning roll call at 8:15 AM.\n\nSection 2: Excuse notes required.',
      });

      expect(result.id).toBe('doc-1');
      expect(result.title).toBe('Attendance Policy');
      expect(prisma.institutionalDocument.create).toHaveBeenCalled();
    });

    it('2. Unauthorized user (Teacher or Student) cannot upload documents', async () => {
      await expect(
        service.createDocument(mockTeacherUser, {
          title: 'Unauthorized Doc',
          category: DocumentCategory.GENERAL_INSTITUTIONAL,
          documentType: 'TXT',
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.createDocument(mockStudentUser, {
          title: 'Unauthorized Doc',
          category: DocumentCategory.GENERAL_INSTITUTIONAL,
          documentType: 'TXT',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('3. Rejects invalid file types and oversized files', async () => {
      await expect(
        service.createDocument(mockAdminUser, {
          title: 'Bad File',
          category: DocumentCategory.GENERAL_INSTITUTIONAL,
          documentType: 'EXE',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createDocument(mockAdminUser, {
          title: 'Oversized File',
          category: DocumentCategory.GENERAL_INSTITUTIONAL,
          documentType: 'PDF',
          fileSize: 20 * 1024 * 1024, // 20MB > 15MB
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Document Scoping & Role Access Control', () => {
    it('4. School A admin cannot access or manage School B documents', async () => {
      const schoolBDoc = {
        id: 'doc-school-b',
        title: 'Private School B Doc',
        schoolId: 'school-2',
        isPublished: true,
        status: DocumentProcessingStatus.READY,
        visibilityRoles: [UserRole.SCHOOL_ADMIN],
      };

      prisma.institutionalDocument.findUnique.mockResolvedValue(schoolBDoc);

      await expect(service.getDocumentById(mockAdminUser, 'doc-school-b')).rejects.toThrow(
        ForbiddenException,
      );

      await expect(
        service.updateDocument(mockAdminUser, 'doc-school-b', { title: 'Hacked' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('5. Unpublished/Draft documents are hidden from students and parents', async () => {
      const draftDoc = {
        id: 'doc-draft',
        title: 'Confidential Draft',
        schoolId: 'school-1',
        isPublished: false,
        status: DocumentProcessingStatus.PENDING,
        visibilityRoles: [UserRole.STUDENT, UserRole.PARENT],
      };

      prisma.institutionalDocument.findUnique.mockResolvedValue(draftDoc);

      await expect(service.getDocumentById(mockStudentUser, 'doc-draft')).rejects.toThrow(
        ForbiddenException,
      );

      await expect(service.getDocumentById(mockParentUser, 'doc-draft')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('6. Teacher-only documents are hidden from students', async () => {
      const teacherOnlyDoc = {
        id: 'doc-teacher-handbook',
        title: 'Teacher Handbook',
        schoolId: 'school-1',
        isPublished: true,
        status: DocumentProcessingStatus.READY,
        visibilityRoles: [UserRole.TEACHER],
      };

      prisma.institutionalDocument.findUnique.mockResolvedValue(teacherOnlyDoc);

      await expect(service.getDocumentById(mockStudentUser, 'doc-teacher-handbook')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Document Intelligence Search & Citations', () => {
    it('7. AI retrieves only authorized document sections with valid citations', async () => {
      prisma.institutionalDocument.findMany.mockResolvedValue([
        { id: 'doc-att', title: 'Attendance Policy', category: DocumentCategory.ATTENDANCE_POLICY, version: 1 },
      ]);

      prisma.documentSection.findMany.mockResolvedValue([
        {
          id: 'sec-1',
          documentId: 'doc-att',
          sectionIndex: 1,
          title: 'Minimum Attendance Requirement',
          content: 'All enrolled students must maintain a minimum overall attendance rate of 90% across the term.',
          pageNumber: 1,
        },
      ]);

      const results = await service.searchAuthorizedSections(
        mockStudentUser,
        'attendance rate',
        DocumentCategory.ATTENDANCE_POLICY,
      );

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].documentTitle).toBe('Attendance Policy');
      expect(results[0].pageNumber).toBe(1);
      expect(results[0].snippet).toContain('minimum overall attendance rate of 90%');
    });

    it('8. Missing evidence returns an empty search list without fabricating citations', async () => {
      prisma.institutionalDocument.findMany.mockResolvedValue([]);

      const results = await service.searchAuthorizedSections(
        mockStudentUser,
        'unrelated alien space travel policy',
      );

      expect(results.length).toBe(0);
    });
  });

  describe('Administrative Notice Drafting & TASK 030 Dispatch', () => {
    it('9. AI generates an editable draft with DRAFT status', async () => {
      const mockDraft = {
        id: 'draft-1',
        schoolId: 'school-1',
        authorId: 'admin-1',
        category: 'NOTICE',
        targetRole: 'PARENT',
        subject: 'Upcoming Exam Reminder',
        body: 'Please ensure students arrive at 8:00 AM.',
        status: DocumentDraftStatus.DRAFT,
        version: 1,
        history: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.documentApprovalDraft.create.mockResolvedValue(mockDraft);

      const draft = await service.createDraft(mockAdminUser, {
        subject: 'Upcoming Exam Reminder',
        body: 'Please ensure students arrive at 8:00 AM.',
        category: 'NOTICE',
        targetRole: 'PARENT',
      });

      expect(draft.id).toBe('draft-1');
      expect(draft.status).toBe(DocumentDraftStatus.DRAFT);
    });

    it('10. Unapproved drafts cannot be published or sent', async () => {
      prisma.documentApprovalDraft.findUnique.mockResolvedValue({
        id: 'draft-1',
        status: DocumentDraftStatus.DRAFT,
        schoolId: 'school-1',
      });

      await expect(service.publishDraft(mockAdminUser, 'draft-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(communicationsService.broadcastAnnouncement).not.toHaveBeenCalled();
    });

    it('11. Approved drafts dispatch through TASK 030 and prevent duplicate sends', async () => {
      const approvedDraft = {
        id: 'draft-approved',
        subject: 'Official Campus Notice',
        body: 'Campus opens at 7:30 AM.',
        targetRole: 'ALL',
        status: DocumentDraftStatus.APPROVED,
        schoolId: 'school-1',
        history: [],
      };

      prisma.documentApprovalDraft.findUnique.mockResolvedValue(approvedDraft);
      prisma.documentApprovalDraft.update.mockResolvedValue({
        ...approvedDraft,
        status: DocumentDraftStatus.PUBLISHED,
        publishedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.publishDraft(mockAdminUser, 'draft-approved');

      expect(res.success).toBe(true);
      expect(communicationsService.broadcastAnnouncement).toHaveBeenCalledWith(
        mockAdminUser,
        expect.objectContaining({
          title: 'Official Campus Notice',
          message: 'Campus opens at 7:30 AM.',
          targetRole: 'ALL',
        }),
      );

      // Attempting to publish again throws duplicate error
      prisma.documentApprovalDraft.findUnique.mockResolvedValue({
        ...approvedDraft,
        status: DocumentDraftStatus.PUBLISHED,
      });

      await expect(service.publishDraft(mockAdminUser, 'draft-approved')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('12. Material edits to an approved draft revert status to PENDING_REVIEW', async () => {
      const approvedDraft = {
        id: 'draft-mod',
        subject: 'Original Subject',
        body: 'Original Body',
        status: DocumentDraftStatus.APPROVED,
        version: 1,
        schoolId: 'school-1',
        authorId: 'admin-1',
        history: [],
      };

      prisma.documentApprovalDraft.findUnique.mockResolvedValue(approvedDraft);
      prisma.documentApprovalDraft.update.mockImplementation(({ data }) => ({
        ...approvedDraft,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const updated = await service.updateDraft(mockAdminUser, 'draft-mod', {
        body: 'Materially Changed Body Content',
      });

      expect(updated.status).toBe(DocumentDraftStatus.PENDING_REVIEW);
      expect(updated.version).toBe(2);
    });
  });

  describe('Administrative Narrative Reports', () => {
    it('13. Generates authoritative written narrative report from verified EMS data', async () => {
      prisma.attendanceRecord.findMany.mockResolvedValue([
        { status: 'PRESENT' },
        { status: 'PRESENT' },
        { status: 'ABSENT' },
      ]);

      const report = await service.generateNarrativeReport(mockAdminUser, {
        reportType: 'ATTENDANCE_SUMMARY',
      });

      expect(report.reportType).toBe('ATTENDANCE_SUMMARY');
      expect(report.verifiedMetrics.totalRecords).toBe(3);
      expect(report.verifiedMetrics.presentCount).toBe(2);
      expect(report.verifiedMetrics.absentCount).toBe(1);
      expect(report.narrativeText).toContain('Institutional Attendance Narrative Report');
      expect(report.narrativeText).toContain('66.7%');
    });
  });
});
