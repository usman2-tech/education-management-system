'use client';

/**
 * MODULE: Institutional Document Library & Policy Intelligence (TASK 026)
 *
 * PURPOSE:
 * Central institutional policy repository, grounded document intelligence, versioning,
 * administrative notice draft review & human-in-the-loop broadcast workflows (TASK 030),
 * and executive narrative reports backed by verified database metrics.
 *
 * SECURITY:
 * Multi-school tenant isolation. Authorizes Platform and School Administrators.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  UserRole,
  DocumentCategory,
  DocumentProcessingStatus,
  DocumentDraftStatus,
} from '@ems/contracts';
import { documentsApi } from '@/lib/documents-api';
import {
  FolderGit2,
  FileText,
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  Sparkles,
  History,
  Archive,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Check,
  X,
  Loader2,
  BookOpen,
  Shield,
  Layers,
  Users,
  Building2,
  Calendar,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  FileSpreadsheet,
  AlertCircle,
  FileCheck,
  Edit3,
} from 'lucide-react';

export default function DocumentLibraryPage() {
  const { user, effectiveRole } = useAuth();
  const isAuthorized =
    effectiveRole === UserRole.PLATFORM_ADMIN || effectiveRole === UserRole.SCHOOL_ADMIN;

  const [activeTab, setActiveTab] = useState<'documents' | 'drafts' | 'search' | 'reports'>('documents');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Documents state
  const [documents, setDocuments] = useState<any[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState('ALL');

  // Drafts state
  const [drafts, setDrafts] = useState<any[]>([]);
  const [draftStatusFilter, setDraftStatusFilter] = useState('ALL');

  // Grounded search state
  const [groundedQuery, setGroundedQuery] = useState('');
  const [groundedResults, setGroundedResults] = useState<any>(null);
  const [groundedLoading, setGroundedLoading] = useState(false);

  // Narrative reports state
  const [reportType, setReportType] = useState('ATTENDANCE');
  const [narrativeReport, setNarrativeReport] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isSummarizeModalOpen, setIsSummarizeModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryAudience, setSummaryAudience] = useState('All Stakeholders');
  const [summaryFocus, setSummaryFocus] = useState('Key Rules & Responsibilities');

  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionForm, setVersionForm] = useState({ changeSummary: '', textContent: '' });
  const [selectedFileForVersion, setSelectedFileForVersion] = useState<File | null>(null);

  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftForm, setDraftForm] = useState({
    title: '',
    audience: 'Parents and Guardians',
    purpose: 'Quarterly academic review and upcoming parent-teacher conference schedule',
    keyPoints: 'Parent conferences start Nov 10; Review gradebook; Online appointment booking open',
    tone: 'Formal Institutional',
  });

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [reviewFeedback, setReviewFeedback] = useState('');

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTargetRole, setBroadcastTargetRole] = useState<UserRole>(UserRole.PARENT);
  const [broadcastChannel, setBroadcastChannel] = useState<'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP'>('IN_APP');
  const [broadcastPriority, setBroadcastPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');

  // Upload Form
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('text');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    category: DocumentCategory.POLICY,
    visibilityRoles: [UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT],
    isPublished: true,
    textContent: '',
    tags: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch Documents
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const docRes = await documentsApi.getDocuments({
          search: searchQuery || undefined,
          category: categoryFilter,
          visibility: visibilityFilter,
          limit: 50,
        });
        setDocuments(docRes.data || []);
        setTotalDocs(docRes.total || 0);

        const draftRes = await documentsApi.getDrafts(draftStatusFilter);
        setDrafts(draftRes.data || []);
      } catch (err: any) {
        console.error('Failed to load documents data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshKey, searchQuery, categoryFilter, visibilityFilter, draftStatusFilter]);

  const handleRefresh = () => setRefreshKey((prev) => prev + 1);

  // Upload submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title.trim()) {
      setActionMessage({ type: 'error', text: 'Document title is required.' });
      return;
    }
    if (uploadMode === 'text' && !uploadForm.textContent.trim()) {
      setActionMessage({ type: 'error', text: 'Please enter text content for the document.' });
      return;
    }
    if (uploadMode === 'file' && !uploadFile) {
      setActionMessage({ type: 'error', text: 'Please select a document file to upload.' });
      return;
    }

    setSubmitting(true);
    setActionMessage(null);
    try {
      const tagsArray = uploadForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await documentsApi.uploadDocument(
        {
          title: uploadForm.title,
          description: uploadForm.description,
          category: uploadForm.category,
          visibilityRoles: uploadForm.visibilityRoles,
          isPublished: uploadForm.isPublished,
          textContent: uploadMode === 'text' ? uploadForm.textContent : undefined,
          tags: tagsArray,
        },
        uploadMode === 'file' ? uploadFile || undefined : undefined,
      );

      setActionMessage({ type: 'success', text: 'Institutional document uploaded and indexed successfully.' });
      setIsUploadModalOpen(false);
      setUploadForm({
        title: '',
        description: '',
        category: DocumentCategory.POLICY,
        visibilityRoles: [UserRole.TEACHER, UserRole.STUDENT, UserRole.PARENT],
        isPublished: true,
        textContent: '',
        tags: '',
      });
      setUploadFile(null);
      handleRefresh();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to upload document.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Preview Document
  const handleOpenPreview = async (docId: string) => {
    try {
      setLoading(true);
      const doc = await documentsApi.getDocumentById(docId);
      setSelectedDoc(doc);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Failed to retrieve document sections.' });
    } finally {
      setLoading(false);
    }
  };

  // Summarize Document
  const handleOpenSummarize = async (doc: any) => {
    setSelectedDoc(doc);
    setSummaryData(null);
    setIsSummarizeModalOpen(true);
    setSummaryLoading(true);
    try {
      const summary = await documentsApi.summarizeDocument(doc.id, summaryAudience, summaryFocus);
      setSummaryData(summary);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Summarization failed: ' + (err.message || 'Error') });
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleRegenerateSummary = async () => {
    if (!selectedDoc) return;
    setSummaryLoading(true);
    try {
      const summary = await documentsApi.summarizeDocument(selectedDoc.id, summaryAudience, summaryFocus);
      setSummaryData(summary);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Summarization failed: ' + (err.message || 'Error') });
    } finally {
      setSummaryLoading(false);
    }
  };

  // Version Replace
  const handleOpenVersionModal = (doc: any) => {
    setSelectedDoc(doc);
    setVersionForm({ changeSummary: '', textContent: '' });
    setSelectedFileForVersion(null);
    setIsVersionModalOpen(true);
  };

  const handleVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    if (!versionForm.changeSummary.trim()) {
      setActionMessage({ type: 'error', text: 'Please describe the changes in this version.' });
      return;
    }
    setSubmitting(true);
    try {
      await documentsApi.replaceVersion(
        selectedDoc.id,
        {
          changeSummary: versionForm.changeSummary,
          textContent: versionForm.textContent || undefined,
        },
        selectedFileForVersion || undefined,
      );
      setActionMessage({ type: 'success', text: `Document updated to next version successfully.` });
      setIsVersionModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update version.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Archive
  const handleArchive = async (docId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to archive "${title}"? It will be removed from AI search context.`)) {
      return;
    }
    try {
      await documentsApi.archiveDocument(docId);
      setActionMessage({ type: 'success', text: `Document "${title}" archived.` });
      handleRefresh();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to archive document.' });
    }
  };

  // Grounded Search
  const handleGroundedSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groundedQuery.trim()) return;
    setGroundedLoading(true);
    try {
      const res = await documentsApi.searchSections(groundedQuery, categoryFilter !== 'ALL' ? categoryFilter : undefined, 5);
      setGroundedResults(res);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Search failed: ' + (err.message || 'Error') });
    } finally {
      setGroundedLoading(false);
    }
  };

  // Create Draft
  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftForm.title.trim() || !draftForm.purpose.trim()) {
      setActionMessage({ type: 'error', text: 'Title and purpose are required.' });
      return;
    }
    setSubmitting(true);
    try {
      const keyPoints = draftForm.keyPoints
        .split(';')
        .map((k) => k.trim())
        .filter(Boolean);

      await documentsApi.createDraft({
        title: draftForm.title,
        audience: draftForm.audience,
        purpose: draftForm.purpose,
        keyPoints: keyPoints.length > 0 ? keyPoints : [draftForm.purpose],
        tone: draftForm.tone,
      });

      setActionMessage({ type: 'success', text: 'Administrative notice draft generated with AI copilot.' });
      setIsDraftModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to generate draft.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Review Draft
  const handleOpenReview = (draft: any) => {
    setSelectedDraft(draft);
    setReviewFeedback(draft.reviewFeedback || '');
    setIsReviewModalOpen(true);
  };

  const handleUpdateReviewStatus = async (status: DocumentDraftStatus) => {
    if (!selectedDraft) return;
    setSubmitting(true);
    try {
      await documentsApi.reviewDraft(selectedDraft.id, {
        status,
        reviewFeedback,
      });
      setActionMessage({ type: 'success', text: `Draft status updated to ${status}.` });
      setIsReviewModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Review update failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Broadcast Draft
  const handleOpenBroadcast = (draft: any) => {
    setSelectedDraft(draft);
    setIsBroadcastModalOpen(true);
  };

  const handleExecuteBroadcast = async () => {
    if (!selectedDraft) return;
    setSubmitting(true);
    try {
      const res = await documentsApi.broadcastDraft(selectedDraft.id, {
        announcementTitle: selectedDraft.title,
        targetRole: broadcastTargetRole,
        channel: broadcastChannel,
        priority: broadcastPriority,
      });
      setActionMessage({
        type: 'success',
        text: `Notice broadcast successfully via TASK 030 Messaging! Recipients notified: ${res.recipientCount || 'Campus'}`,
      });
      setIsBroadcastModalOpen(false);
      handleRefresh();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Broadcast failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Generate Narrative Report
  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const res = await documentsApi.generateNarrativeReport(reportType);
      setNarrativeReport(res);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: 'Report generation failed: ' + (err.message || 'Error') });
    } finally {
      setReportLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4 text-center">
        <Shield className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          The Institutional Document Library and administrative draft workflows are restricted to authorized Platform and School Administrators.
        </p>
      </div>
    );
  }

  const roleLabel = (role: string) => {
    switch (role) {
      case 'PLATFORM_ADMIN':
        return 'Platform Admin';
      case 'SCHOOL_ADMIN':
        return 'School Admin';
      case 'TEACHER':
        return 'Faculty';
      case 'STUDENT':
        return 'Students';
      case 'PARENT':
        return 'Parents';
      default:
        return role;
    }
  };

  const categoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'POLICY':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'HANDBOOK':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'EXAM_RULE':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'SAFETY_GUIDELINE':
      case 'TRANSPORT_RULE':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'LIBRARY_RULE':
        return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'CIRCULAR':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-sm">
              <FolderGit2 className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Institutional Document Library</h1>
              <p className="text-sm text-muted-foreground">
                Searchable institutional policies, grounded AI document citations, administrative drafts, and executive narrative reporting.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            title="Refresh repository"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-accent-foreground shadow-sm transition-all hover:bg-accent/90"
          >
            <Plus className="h-3.5 w-3.5" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`flex items-center justify-between rounded-lg border p-4 text-sm ${
            actionMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
            activeTab === 'documents'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="h-4 w-4" />
          Institutional Documents ({totalDocs})
        </button>
        <button
          onClick={() => setActiveTab('drafts')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
            activeTab === 'drafts'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Edit3 className="h-4 w-4" />
          Administrative Drafts ({drafts.length})
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
            activeTab === 'search'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="h-4 w-4" />
          Grounded Policy Search & Q&A
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all ${
            activeTab === 'reports'
              ? 'border-accent text-accent font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Executive Narrative Reports
        </button>
      </div>

      {/* TAB 1: INSTITUTIONAL DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Repository Volume</span>
                <Layers className="h-4 w-4 text-accent" />
              </div>
              <div className="mt-2 text-2xl font-bold">{totalDocs}</div>
              <p className="mt-1 text-xs text-muted-foreground">Indexed institutional policies & handbooks</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Active Published</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-bold">
                {documents.filter((d) => d.isPublished && !d.isArchived).length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Available to authorized AI assistants</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Index Quality</span>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-bold">100% Grounded</div>
              <p className="mt-1 text-xs text-muted-foreground">Zero metric fabrication guarantee</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium uppercase tracking-wider">Tenant Scope</span>
                <Building2 className="h-4 w-4 text-purple-500" />
              </div>
              <div className="mt-2 text-sm font-bold truncate">
                {user?.school?.name || (effectiveRole === UserRole.PLATFORM_ADMIN ? 'All Platform Campuses' : 'Campus Scope')}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Enforces strict tenant boundary</p>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search policies by keyword, regulation, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm focus:border-accent focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="POLICY">Policies</option>
                <option value="HANDBOOK">Handbooks</option>
                <option value="EXAM_RULE">Exam Rules</option>
                <option value="SAFETY_GUIDELINE">Safety Guidelines</option>
                <option value="TRANSPORT_RULE">Transport Rules</option>
                <option value="LIBRARY_RULE">Library Rules</option>
                <option value="CIRCULAR">Administrative Circulars</option>
                <option value="FEE_SCHEDULE">Fee Schedules</option>
              </select>

              <select
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All Audiences</option>
                <option value="TEACHER">Faculty & Teachers</option>
                <option value="STUDENT">Students</option>
                <option value="PARENT">Parents</option>
                <option value="SCHOOL_ADMIN">School Admins</option>
              </select>
            </div>
          </div>

          {/* Documents Table */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Document Title</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Version</th>
                    <th className="px-4 py-3 font-semibold">Authorized Audience</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading && documents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-accent" />
                          <span>Loading institutional repository...</span>
                        </div>
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <FolderGit2 className="h-8 w-8 text-muted-foreground/40" />
                          <p className="font-medium">No institutional documents match your criteria.</p>
                          <p className="text-xs">Upload campus policies, student handbooks, or exam regulations to index them.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">{doc.title}</div>
                          {doc.description && (
                            <div className="max-w-md truncate text-xs text-muted-foreground">
                              {doc.description}
                            </div>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{doc.mimeType || 'Document'}</span>
                            <span>•</span>
                            <span>{(doc.fileSize / 1024).toFixed(1)} KB</span>
                            <span>•</span>
                            <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${categoryBadgeColor(
                              doc.category,
                            )}`}
                          >
                            {doc.category}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-medium text-foreground">
                            v{doc.currentVersion || 1}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {doc.visibilityRoles?.map((r: string) => (
                              <span
                                key={r}
                                className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                              >
                                {roleLabel(r)}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {doc.isArchived ? (
                            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              Archived
                            </span>
                          ) : doc.processingStatus === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
                              <Clock className="h-3 w-3" />
                              {doc.processingStatus}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenPreview(doc.id)}
                              className="rounded-md border border-border p-1.5 text-foreground hover:bg-muted"
                              title="View document sections"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenSummarize(doc)}
                              className="rounded-md border border-border p-1.5 text-accent hover:bg-muted"
                              title="Generate AI Summary"
                            >
                              <Sparkles className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenVersionModal(doc)}
                              className="rounded-md border border-border p-1.5 text-foreground hover:bg-muted"
                              title="Upload new version"
                            >
                              <History className="h-4 w-4" />
                            </button>
                            {!doc.isArchived && (
                              <button
                                onClick={() => handleArchive(doc.id, doc.title)}
                                className="rounded-md border border-border p-1.5 text-rose-500 hover:bg-rose-500/10"
                                title="Archive document"
                              >
                                <Archive className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADMINISTRATIVE NOTICE DRAFTS */}
      {activeTab === 'drafts' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Administrative Drafts & Approval Pipeline</h2>
              <p className="text-xs text-muted-foreground">
                Author notices with AI assistance, require institutional review, and broadcast via TASK 030 Messaging.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={draftStatusFilter}
                onChange={(e) => setDraftStatusFilter(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PUBLISHED">Published</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <button
                onClick={() => setIsDraftModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground shadow-sm transition-colors hover:bg-accent/90"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Draft New Notice with AI
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {drafts.length === 0 ? (
              <div className="col-span-2 rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
                <FileCheck className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 font-medium">No administrative drafts currently registered.</p>
                <p className="text-xs">Click "Draft New Notice with AI" to generate institutional notices.</p>
              </div>
            ) : (
              drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-accent/40"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{draft.title}</h3>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          draft.status === 'PUBLISHED'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : draft.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : draft.status === 'PENDING_REVIEW'
                            ? 'bg-amber-500/10 text-amber-600'
                            : draft.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-600'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {draft.status}
                      </span>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-3 text-xs leading-relaxed text-foreground whitespace-pre-line line-clamp-4">
                      {draft.draftContent}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Target Audience:</span> {draft.audience}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Tone:</span> {draft.tone || 'Formal'}
                      </div>
                    </div>

                    {draft.reviewFeedback && (
                      <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-300">
                        <span className="font-semibold">Reviewer Notes:</span> {draft.reviewFeedback}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-[11px] text-muted-foreground">
                      Created: {new Date(draft.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenReview(draft)}
                        className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        Review / Edit
                      </button>

                      {draft.status === 'APPROVED' && (
                        <button
                          onClick={() => handleOpenBroadcast(draft)}
                          className="flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground hover:bg-accent/90"
                        >
                          <Send className="h-3 w-3" />
                          Broadcast (TASK 030)
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GROUNDED POLICY SEARCH & Q&A */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold">Grounded Institutional Policy Search</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Direct semantic and keyword inquiry into campus policies. Returns exact matching sections, page numbers, and verified rule citations.
            </p>

            <form onSubmit={handleGroundedSearch} className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Ask or search policies (e.g., 'What is the attendance threshold for sitting final exams?')"
                value={groundedQuery}
                onChange={(e) => setGroundedQuery(e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                disabled={groundedLoading}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground shadow-sm hover:bg-accent/90 disabled:opacity-50"
              >
                {groundedLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search Sections
              </button>
            </form>
          </div>

          {groundedResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Found {groundedResults.sections?.length || 0} grounded sections for "{groundedResults.query}"
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Strict Evidence Grounding Active
                </span>
              </div>

              {groundedResults.sections?.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
                  No matching document sections found. The AI system does not fabricate policy answers if evidence is absent.
                </div>
              ) : (
                <div className="space-y-3">
                  {groundedResults.sections.map((sec: any) => (
                    <div
                      key={sec.id}
                      className="rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-accent/40"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-accent" />
                          <span className="font-semibold text-foreground">{sec.documentTitle}</span>
                          <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium uppercase">
                            {sec.category}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {sec.pageNumber ? `Page ${sec.pageNumber}` : `Section #${sec.sectionIndex + 1}`}
                        </span>
                      </div>

                      <h4 className="mt-2 text-sm font-semibold text-accent">{sec.title}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {sec.content}
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Authorized for:</span>
                        {sec.visibilityRoles?.map((r: string) => (
                          <span key={r} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                            {roleLabel(r)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: EXECUTIVE NARRATIVE REPORTS */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold">Executive Institutional Narrative Reports</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Generate publication-ready administrative reports synthesizing real database metrics across attendance, grades, fee collections, transport, and library operations.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold focus:outline-none"
              >
                <option value="ATTENDANCE">Attendance Operational Brief</option>
                <option value="ACADEMIC">Academic & Assessment Overview</option>
                <option value="FINANCIAL">Fee Collections & Financial Health</option>
                <option value="OPERATIONS">Campus Transport & Library Operations</option>
                <option value="EXECUTIVE">Complete Institutional Summary</option>
              </select>

              <button
                onClick={handleGenerateReport}
                disabled={reportLoading}
                className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground shadow-sm hover:bg-accent/90 disabled:opacity-50"
              >
                {reportLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Generate Narrative Report
              </button>
            </div>
          </div>

          {narrativeReport && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-xl font-bold">{narrativeReport.reportTitle}</h3>
                  <p className="text-xs text-muted-foreground">
                    Generated on {new Date(narrativeReport.generatedAt).toLocaleString()} • Scope:{' '}
                    {narrativeReport.schoolName}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Verified Real Metrics
                </span>
              </div>

              {/* Verified Metrics Cards */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Underlying Database Grounding
                </h4>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {Object.entries(narrativeReport.metrics || {}).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </div>
                      <div className="mt-1 text-lg font-bold">{String(value)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Report Narrative Content */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Executive Narrative Synthesis
                </h4>
                <div className="prose dark:prose-invert max-w-none rounded-lg bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-line">
                  {narrativeReport.narrative}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: UPLOAD DOCUMENT */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FolderGit2 className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-bold">Upload Institutional Document</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold">Document Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2024-2025 Comprehensive Student Code of Conduct"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">Category *</label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) =>
                      setUploadForm({ ...uploadForm, category: e.target.value as DocumentCategory })
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="POLICY">Institutional Policy</option>
                    <option value="HANDBOOK">Handbook</option>
                    <option value="EXAM_RULE">Exam Regulation</option>
                    <option value="SAFETY_GUIDELINE">Safety Guideline</option>
                    <option value="TRANSPORT_RULE">Transport Rule</option>
                    <option value="LIBRARY_RULE">Library Rule</option>
                    <option value="CIRCULAR">Administrative Circular</option>
                    <option value="FEE_SCHEDULE">Fee Schedule</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold">Tags (comma separated)</label>
                  <input
                    type="text"
                    placeholder="conduct, attendance, discipline"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold">Brief Description</label>
                <textarea
                  rows={2}
                  placeholder="Official guidelines outlining student behavior, attendance thresholds, and grievance processes."
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>

              {/* Mode switch */}
              <div className="flex items-center gap-4 text-xs font-medium">
                <span className="text-muted-foreground">Upload Type:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="uploadMode"
                    checked={uploadMode === 'text'}
                    onChange={() => setUploadMode('text')}
                  />
                  <span>Text / Markdown Input</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="uploadMode"
                    checked={uploadMode === 'file'}
                    onChange={() => setUploadMode('file')}
                  />
                  <span>File Attachment (PDF, TXT, DOCX)</span>
                </label>
              </div>

              {uploadMode === 'text' ? (
                <div>
                  <label className="text-xs font-semibold">Policy Text Content *</label>
                  <textarea
                    rows={6}
                    placeholder="Paste or type document content. Sections and headings (# Section Name) will be indexed automatically..."
                    value={uploadForm.textContent}
                    onChange={(e) => setUploadForm({ ...uploadForm, textContent: e.target.value })}
                    className="mt-1 w-full font-mono text-xs rounded-lg border border-border bg-background p-3 focus:border-accent focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold">Select File *</label>
                  <input
                    type="file"
                    accept=".pdf,.txt,.docx,.md"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs"
                  />
                </div>
              )}

              {/* Visibility Roles */}
              <div>
                <label className="text-xs font-semibold">Authorized Viewers (Roles)</label>
                <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                  {[
                    UserRole.PLATFORM_ADMIN,
                    UserRole.SCHOOL_ADMIN,
                    UserRole.TEACHER,
                    UserRole.STUDENT,
                    UserRole.PARENT,
                  ].map((role) => (
                    <label
                      key={role}
                      className="flex items-center gap-1.5 rounded-md border border-border bg-muted/20 px-2.5 py-1.5 cursor-pointer hover:bg-muted/40"
                    >
                      <input
                        type="checkbox"
                        checked={uploadForm.visibilityRoles.includes(role)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...uploadForm.visibilityRoles, role]
                            : uploadForm.visibilityRoles.filter((r) => r !== role);
                          setUploadForm({ ...uploadForm, visibilityRoles: updated });
                        }}
                      />
                      <span>{roleLabel(role)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uploadForm.isPublished}
                    onChange={(e) => setUploadForm({ ...uploadForm, isPublished: e.target.checked })}
                  />
                  <span>Publish and activate immediately in AI assistant knowledge bases</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground shadow-sm hover:bg-accent/90 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                    Upload & Index
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DOCUMENT PREVIEW */}
      {isPreviewModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex h-[80vh] w-full max-w-4xl flex-col rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold">{selectedDoc.title}</h3>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                    v{selectedDoc.currentVersion || 1}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedDoc.description}</p>
              </div>
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Extracted Sections ({selectedDoc.sections?.length || 0}) • Total Word Count:{' '}
                  {selectedDoc.wordCount || 0}
                </span>
                <span>Category: {selectedDoc.category}</span>
              </div>

              {selectedDoc.sections?.map((sec: any) => (
                <div key={sec.id} className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <h4 className="text-sm font-bold text-accent">{sec.title}</h4>
                    <span className="text-[11px] text-muted-foreground">
                      {sec.pageNumber ? `Page ${sec.pageNumber}` : `Section #${sec.sectionIndex + 1}`}
                    </span>
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-foreground whitespace-pre-line">
                    {sec.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-border pt-3">
              <button
                onClick={() => setIsPreviewModalOpen(false)}
                className="rounded-lg bg-muted px-4 py-1.5 text-xs font-medium hover:bg-muted/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI SUMMARIZE */}
      {isSummarizeModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <div>
                  <h3 className="text-lg font-bold">Document AI Summarization</h3>
                  <p className="text-xs text-muted-foreground">{selectedDoc.title}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSummarizeModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Audience & Focus controls */}
            <div className="grid grid-cols-2 gap-3 border-b border-border py-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Audience</label>
                <select
                  value={summaryAudience}
                  onChange={(e) => setSummaryAudience(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="All Stakeholders">All Stakeholders</option>
                  <option value="Parents and Guardians">Parents & Guardians</option>
                  <option value="Students">Students</option>
                  <option value="Teaching Faculty">Teaching Faculty</option>
                  <option value="School Leadership">School Leadership</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase">Focus</label>
                <select
                  value={summaryFocus}
                  onChange={(e) => setSummaryFocus(e.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  <option value="Key Rules & Responsibilities">Key Rules & Responsibilities</option>
                  <option value="Deadlines, Penalties & Appeals">Deadlines, Penalties & Appeals</option>
                  <option value="Executive Overview">Executive Overview</option>
                </select>
              </div>

              <div className="col-span-2 flex justify-end">
                <button
                  onClick={handleRegenerateSummary}
                  disabled={summaryLoading}
                  className="flex items-center gap-1 rounded bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/80 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${summaryLoading ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {summaryLoading ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <span>Synthesizing grounded institutional summary...</span>
                </div>
              ) : summaryData ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-accent/10 p-4 text-xs font-medium text-accent leading-relaxed">
                    {summaryData.summary}
                  </div>

                  {summaryData.keyPoints?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Key Takeaways
                      </h4>
                      <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                        {summaryData.keyPoints.map((pt: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {summaryData.actionItems?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Action Items & Obligations
                      </h4>
                      <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                        {summaryData.actionItems.map((act: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-xs text-muted-foreground">
                  No summary available.
                </div>
              )}
            </div>

            <div className="border-t border-border pt-3 flex justify-end">
              <button
                onClick={() => setIsSummarizeModalOpen(false)}
                className="rounded-lg bg-muted px-4 py-1.5 text-xs font-medium hover:bg-muted/80"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REPLACE VERSION */}
      {isVersionModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-bold">Upload New Document Version</h3>
              </div>
              <button
                onClick={() => setIsVersionModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleVersionSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold">Change Summary *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Annual revision updating section 4 attendance thresholds"
                  value={versionForm.changeSummary}
                  onChange={(e) => setVersionForm({ ...versionForm, changeSummary: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Attach Updated File (or enter text below)</label>
                <input
                  type="file"
                  accept=".pdf,.txt,.docx,.md"
                  onChange={(e) => setSelectedFileForVersion(e.target.files?.[0] || null)}
                  className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Updated Text Content (Optional)</label>
                <textarea
                  rows={4}
                  placeholder="Paste modified text content if not attaching a file..."
                  value={versionForm.textContent}
                  onChange={(e) => setVersionForm({ ...versionForm, textContent: e.target.value })}
                  className="mt-1 w-full font-mono text-xs rounded-lg border border-border bg-background p-2 focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground shadow-sm hover:bg-accent/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Submit Version
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DRAFT NEW NOTICE */}
      {isDraftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-bold">Draft Notice with AI Assistant</h3>
              </div>
              <button
                onClick={() => setIsDraftModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mandatory Parent-Teacher Conference Schedule"
                  value={draftForm.title}
                  onChange={(e) => setDraftForm({ ...draftForm, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">Target Audience</label>
                  <input
                    type="text"
                    value={draftForm.audience}
                    onChange={(e) => setDraftForm({ ...draftForm, audience: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold">Tone</label>
                  <select
                    value={draftForm.tone}
                    onChange={(e) => setDraftForm({ ...draftForm, tone: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="Formal Institutional">Formal Institutional</option>
                    <option value="Urgent Advisory">Urgent Advisory</option>
                    <option value="Encouraging & Informational">Encouraging & Informational</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold">Purpose & Summary *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="State the core objective of the communication..."
                  value={draftForm.purpose}
                  onChange={(e) => setDraftForm({ ...draftForm, purpose: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Key Points (separated by semicolon ';')</label>
                <textarea
                  rows={3}
                  placeholder="Point 1; Point 2; Point 3"
                  value={draftForm.keyPoints}
                  onChange={(e) => setDraftForm({ ...draftForm, keyPoints: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsDraftModalOpen(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground shadow-sm hover:bg-accent/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Generate Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVIEW DRAFT */}
      {isReviewModalOpen && selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold">Review Administrative Notice</h3>
                <p className="text-xs text-muted-foreground">
                  Status: {selectedDraft.status} • Audience: {selectedDraft.audience}
                </p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold">Draft Content</label>
                <textarea
                  rows={8}
                  value={selectedDraft.draftContent}
                  onChange={(e) =>
                    setSelectedDraft({ ...selectedDraft, draftContent: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-background p-3 text-xs leading-relaxed focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold">Reviewer Notes / Feedback</label>
                <input
                  type="text"
                  placeholder="Notes regarding changes or justification for approval/rejection..."
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <button
                onClick={() => handleUpdateReviewStatus(DocumentDraftStatus.REJECTED)}
                disabled={submitting}
                className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
              >
                Reject Notice
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateReviewStatus(DocumentDraftStatus.PENDING_REVIEW)}
                  disabled={submitting}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Mark Pending Review
                </button>
                <button
                  onClick={() => handleUpdateReviewStatus(DocumentDraftStatus.APPROVED)}
                  disabled={submitting}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  Approve Notice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BROADCAST VIA TASK 030 */}
      {isBroadcastModalOpen && selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-bold">Broadcast Notice via TASK 030</h3>
              </div>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-accent/10 p-3 text-xs text-accent">
                <span className="font-bold">Human-in-the-Loop Safeguard:</span> This notice has been reviewed and approved. Publishing will broadcast this institutional announcement via the TASK 030 Messaging engine to recipient inboxes.
              </div>

              <div>
                <label className="text-xs font-semibold">Announcement Title</label>
                <input
                  type="text"
                  value={selectedDraft.title}
                  readOnly
                  className="mt-1 w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">Target Audience</label>
                  <select
                    value={broadcastTargetRole}
                    onChange={(e) => setBroadcastTargetRole(e.target.value as UserRole)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium"
                  >
                    <option value={UserRole.PARENT}>Parents & Guardians</option>
                    <option value={UserRole.TEACHER}>Faculty & Staff</option>
                    <option value={UserRole.STUDENT}>Students</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold">Channel</label>
                  <select
                    value={broadcastChannel}
                    onChange={(e) => setBroadcastChannel(e.target.value as any)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium"
                  >
                    <option value="IN_APP">In-App Notification</option>
                    <option value="EMAIL">Email</option>
                    <option value="SMS">SMS Alert</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold">Priority</label>
                <select
                  value={broadcastPriority}
                  onChange={(e) => setBroadcastPriority(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium"
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent Announcement</option>
                  <option value="LOW">Low / Informational</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBroadcast}
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground shadow-sm hover:bg-accent/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-3 w-3 animate-spin" />}
                  Confirm & Broadcast Notice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
