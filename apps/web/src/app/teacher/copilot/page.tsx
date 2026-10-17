'use client';

/**
 * MODULE: AI Teacher Copilot
 *
 * PURPOSE:
 * Professional pedagogical copilot providing six AI-powered faculty workflows:
 * 1. Lesson Plan Generator
 * 2. Homework Generator
 * 3. Quiz & Exam Generator
 * 4. AI Grading Assistant
 * 5. Student Performance Insights
 * 6. Teaching Materials Generator
 *
 * DEPENDENCIES:
 * aiCopilotApi, useAuth, ProtectedRoute, Lucide icons, @ems/contracts
 *
 * SECURITY:
 * Strictly isolated to authorized faculty members (TEACHER & SCHOOL_ADMIN).
 * Human-in-the-loop approval workflow: generated content is saved as drafts,
 * and never published automatically to students.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { UserRole } from '@ems/contracts';
import { aiCopilotApi } from '@/lib/ai-api';
import {
  Sparkles,
  BookOpen,
  FileText,
  Award,
  CheckSquare,
  BarChart2,
  FolderOpen,
  Clock,
  Printer,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Trash2,
  Sliders,
  HelpCircle,
  TrendingUp,
  Users,
  Shield,
  Download,
  Copy,
} from 'lucide-react';

type CopilotTab =
  | 'lesson-plan'
  | 'homework'
  | 'exam'
  | 'grading'
  | 'insights'
  | 'materials'
  | 'drafts'
  | 'documents';

export default function TeacherCopilotPage() {
  const { user } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<CopilotTab>('lesson-plan');

  // Teacher Context State (Assigned classes, subjects, pending submissions)
  const [contextLoading, setContextLoading] = useState(true);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);
  const [teacherCourses, setTeacherCourses] = useState<any[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);

  // Generator Shared State
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [topic, setTopic] = useState<string>('');
  const [learningObjectives, setLearningObjectives] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('INTERMEDIATE');
  const [duration, setDuration] = useState<number>(45);

  // Homework & Exam Specific Inputs
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [totalMarks, setTotalMarks] = useState<number>(50);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [rubricCriteria, setRubricCriteria] = useState<string>('Accuracy, step-by-step reasoning, clear derivation.');
  const [materialType, setMaterialType] = useState<string>('STUDY_GUIDE');

  // Generation & Draft State
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeDraft, setActiveDraft] = useState<any | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<any[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Faculty Documents & Notice State (TASK 026)
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [docSearchResults, setDocSearchResults] = useState<any[]>([]);
  const [docSearchLoading, setDocSearchLoading] = useState(false);
  const [parentNoticeForm, setParentNoticeForm] = useState({
    noticeType: 'Academic Progress Advisory',
    keyPoints: 'Term exam preparation; missing physics assignment #3; recommend office hour tutorial',
    urgency: 'NORMAL',
  });
  const [noticeDraftResult, setNoticeDraftResult] = useState<any>(null);
  const [noticeDraftLoading, setNoticeDraftLoading] = useState(false);

  // Fetch teacher's assigned context on mount
  useEffect(() => {
    async function loadContext() {
      setContextLoading(true);
      try {
        const ctx = await aiCopilotApi.getContext();
        setTeacherClasses(ctx.classes || []);
        setTeacherSubjects(ctx.subjects || []);
        setTeacherCourses(ctx.courses || []);
        setPendingSubmissions(ctx.pendingSubmissions || []);

        if (ctx.classes && ctx.classes.length > 0) {
          setSelectedClassId(ctx.classes[0].id);
        }
        if (ctx.subjects && ctx.subjects.length > 0) {
          setSelectedSubjectId(ctx.subjects[0].id);
        }
        if (ctx.pendingSubmissions && ctx.pendingSubmissions.length > 0) {
          setSelectedSubmissionId(ctx.pendingSubmissions[0].id);
        }
      } catch (err: any) {
        console.warn('Could not load teacher assigned context:', err?.message);
        setStatusMessage({
          type: 'info',
          text: 'Operating with default faculty settings. Make sure your account has assigned classes.',
        });
      } finally {
        setContextLoading(false);
      }
    }

    loadContext();
    loadDrafts();
  }, []);

  // Fetch saved drafts
  async function loadDrafts() {
    setDraftsLoading(true);
    try {
      const drafts = await aiCopilotApi.listDrafts();
      setSavedDrafts(drafts || []);
    } catch (err: any) {
      console.warn('Could not load saved drafts:', err?.message);
    } finally {
      setDraftsLoading(false);
    }
  }

  // 1. Generate Lesson Plan
  async function handleGenerateLessonPlan(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassId || !topic.trim()) {
      setStatusMessage({ type: 'error', text: 'Please select a class and enter a lesson topic.' });
      return;
    }

    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const draft = await aiCopilotApi.generateLessonPlan({
        classSectionId: selectedClassId,
        subjectId: selectedSubjectId || undefined,
        courseId: selectedCourseId || undefined,
        topic: topic.trim(),
        learningObjectives: learningObjectives.trim() || 'Understand core curriculum concepts',
        durationMinutes: duration,
        difficultyLevel: difficulty as any,
        instructions: instructions.trim(),
      });
      setActiveDraft(draft);
      setStatusMessage({ type: 'success', text: 'Lesson plan successfully generated and saved as draft!' });
      loadDrafts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to generate lesson plan.' });
    } finally {
      setIsGenerating(false);
    }
  }

  // 2. Generate Homework
  async function handleGenerateHomework(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassId || !selectedSubjectId || !topic.trim()) {
      setStatusMessage({ type: 'error', text: 'Please select class, subject, and enter a homework topic.' });
      return;
    }

    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const draft = await aiCopilotApi.generateHomework({
        classSectionId: selectedClassId,
        subjectId: selectedSubjectId,
        topic: topic.trim(),
        learningObjectives: learningObjectives.trim(),
        questionCount,
        difficultyLevel: difficulty as any,
        instructions: instructions.trim(),
      });
      setActiveDraft(draft);
      setStatusMessage({ type: 'success', text: 'Homework assignment successfully generated and saved as draft!' });
      loadDrafts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to generate homework.' });
    } finally {
      setIsGenerating(false);
    }
  }

  // 3. Generate Exam / Quiz
  async function handleGenerateExam(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassId || !selectedSubjectId || !topic.trim()) {
      setStatusMessage({ type: 'error', text: 'Please select class, subject, and enter an exam topic.' });
      return;
    }

    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const draft = await aiCopilotApi.generateExam({
        classSectionId: selectedClassId,
        subjectId: selectedSubjectId,
        courseId: selectedCourseId || undefined,
        topic: topic.trim(),
        questionCount,
        totalMarks,
        durationMinutes: duration,
        difficultyLevel: difficulty as any,
        instructions: instructions.trim(),
      });
      setActiveDraft(draft);
      setStatusMessage({ type: 'success', text: 'Exam paper successfully generated and saved as draft!' });
      loadDrafts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to generate exam paper.' });
    } finally {
      setIsGenerating(false);
    }
  }

  // 4. Generate AI Grading Suggestions
  async function handleGenerateGrading(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubmissionId) {
      setStatusMessage({ type: 'error', text: 'Please select an eligible student submission to evaluate.' });
      return;
    }

    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const draft = await aiCopilotApi.generateGrading({
        submissionId: selectedSubmissionId,
        rubricCriteria,
      });
      setActiveDraft(draft);
      setStatusMessage({ type: 'success', text: 'Grading suggestion successfully generated!' });
      loadDrafts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to generate grading recommendation.' });
    } finally {
      setIsGenerating(false);
    }
  }

  // 5. Generate Performance Insights
  async function handleGenerateInsights(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClassId) {
      setStatusMessage({ type: 'error', text: 'Please select a class section.' });
      return;
    }

    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const draft = await aiCopilotApi.generateInsights({
        classSectionId: selectedClassId,
        subjectId: selectedSubjectId || undefined,
      });
      setActiveDraft(draft);
      setStatusMessage({ type: 'success', text: 'Classroom performance insights synthesized from database!' });
      loadDrafts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to synthesize insights.' });
    } finally {
      setIsGenerating(false);
    }
  }

  // 6. Generate Teaching Materials
  async function handleGenerateMaterials(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a topic for teaching materials.' });
      return;
    }

    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const draft = await aiCopilotApi.generateTeachingMaterials({
        classSectionId: selectedClassId || undefined,
        subjectId: selectedSubjectId || undefined,
        materialType: materialType as any,
        topic: topic.trim(),
        difficultyLevel: difficulty as any,
        learningObjectives: learningObjectives.trim(),
      });
      setActiveDraft(draft);
      setStatusMessage({ type: 'success', text: 'Teaching material generated and saved as draft!' });
      loadDrafts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to generate teaching materials.' });
    } finally {
      setIsGenerating(false);
    }
  }

  // Save Edits to Draft
  async function handleSaveDraftEdits() {
    if (!activeDraft) return;
    try {
      const updated = await aiCopilotApi.updateDraft(activeDraft.id, {
        title: activeDraft.title,
        content: activeDraft.content,
      });
      setActiveDraft(updated);
      setStatusMessage({ type: 'success', text: 'Draft changes saved successfully.' });
      loadDrafts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to save draft edits.' });
    }
  }

  // Explicit Human Approval & Publishing Workflow
  async function handleApproveAndPublish(targetStatus: 'APPROVED' | 'PUBLISHED') {
    if (!activeDraft) return;

    const confirmText = targetStatus === 'PUBLISHED'
      ? `Are you sure you want to approve and publish "${activeDraft.title}" to active students in the EMS?`
      : `Approve and finalize "${activeDraft.title}"?`;

    if (!window.confirm(confirmText)) return;

    try {
      const result = await aiCopilotApi.approveAndPublishDraft(activeDraft.id, {
        targetStatus,
      });
      setActiveDraft(result);
      setStatusMessage({
        type: 'success',
        text: targetStatus === 'PUBLISHED'
          ? 'Content approved and published to the EMS module successfully!'
          : 'Draft marked as APPROVED by instructor.',
      });
      loadDrafts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to finalize content.' });
    }
  }

  // Delete draft
  async function handleDeleteDraft(id: string) {
    if (!window.confirm('Delete this draft permanently?')) return;
    try {
      await aiCopilotApi.deleteDraft(id);
      if (activeDraft?.id === id) {
        setActiveDraft(null);
      }
      setStatusMessage({ type: 'success', text: 'Draft deleted.' });
      loadDrafts();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to delete draft.' });
    }
  }

  // Faculty Guidelines & Notice Handlers (TASK 026)
  async function handleSearchTeachingDocs(e: React.FormEvent) {
    e.preventDefault();
    if (!docSearchQuery.trim()) return;
    setDocSearchLoading(true);
    try {
      const res = await aiCopilotApi.searchTeachingDocuments(docSearchQuery.trim());
      setDocSearchResults(res.sections || []);
      setStatusMessage({ type: 'success', text: `Found ${res.sections?.length || 0} grounded sections.` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to search teaching documents.' });
    } finally {
      setDocSearchLoading(false);
    }
  }

  async function handleDraftParentNotice(e: React.FormEvent) {
    e.preventDefault();
    if (!parentNoticeForm.keyPoints.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter key points for the notice.' });
      return;
    }
    setNoticeDraftLoading(true);
    try {
      const res = await aiCopilotApi.draftParentNotice({
        noticeType: parentNoticeForm.noticeType,
        keyPoints: parentNoticeForm.keyPoints.split(';').map((k) => k.trim()).filter(Boolean),
        urgency: parentNoticeForm.urgency,
      });
      setNoticeDraftResult(res);
      setStatusMessage({ type: 'success', text: 'Parent notice drafted with AI copilot.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Failed to draft parent notice.' });
    } finally {
      setNoticeDraftLoading(false);
    }
  }

  // Copy content to clipboard
  function handleCopyContent() {
    if (!activeDraft) return;
    const textToCopy = typeof activeDraft.content === 'object'
      ? JSON.stringify(activeDraft.content, null, 2)
      : String(activeDraft.content);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <ProtectedRoute allowedRoles={[UserRole.TEACHER, UserRole.SCHOOL_ADMIN]}>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    AI Teacher Copilot
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <Sparkles className="h-3 w-3" />
                    Gemini 1.5 Flash
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pedagogical planning, assignment generation, objective grading assistance, and verified class insights.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('drafts')}
              className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                activeTab === 'drafts'
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-card-foreground border-border hover:bg-muted'
              }`}
            >
              <FolderOpen className="h-4 w-4" />
              Saved Drafts
              <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {savedDrafts.length}
              </span>
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`flex items-center justify-between rounded-lg p-4 border text-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                : 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs font-medium hover:underline opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Feature Tabs Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-3">
          <button
            onClick={() => setActiveTab('lesson-plan')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              activeTab === 'lesson-plan'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Lesson Plan
          </button>

          <button
            onClick={() => setActiveTab('homework')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              activeTab === 'homework'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <FileText className="h-4 w-4" />
            Homework
          </button>

          <button
            onClick={() => setActiveTab('exam')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              activeTab === 'exam'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Award className="h-4 w-4" />
            Quiz & Exam
          </button>

          <button
            onClick={() => setActiveTab('grading')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              activeTab === 'grading'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <CheckSquare className="h-4 w-4" />
            AI Grading
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              activeTab === 'insights'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            Class Insights
          </button>

          <button
            onClick={() => setActiveTab('materials')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              activeTab === 'materials'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Teaching Materials
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
              activeTab === 'documents'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            Documents & Notices
          </button>
        </div>

        {/* Main Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Generator Form (or Full Width if drafts or documents active) */}
          <div className={`${activeTab === 'drafts' || activeTab === 'documents' ? 'lg:col-span-12' : 'lg:col-span-5'} space-y-6`}>
            {activeTab === 'drafts' ? (
              /* Drafts Repository View */
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Faculty Draft Repository</h2>
                    <p className="text-xs text-muted-foreground">
                      Review, edit, finalize, and publish your generated materials.
                    </p>
                  </div>
                  <button
                    onClick={loadDrafts}
                    disabled={draftsLoading}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${draftsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {draftsLoading ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Loading drafts...</div>
                ) : savedDrafts.length === 0 ? (
                  <div className="py-12 text-center">
                    <FolderOpen className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No drafts saved yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Generate lesson plans, homework, or exams to save your first draft.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedDrafts.map((draft) => (
                      <div
                        key={draft.id}
                        onClick={() => {
                          setActiveDraft(draft);
                          setActiveTab(
                            draft.contentType === 'LESSON_PLAN'
                              ? 'lesson-plan'
                              : draft.contentType === 'HOMEWORK'
                              ? 'homework'
                              : draft.contentType === 'EXAM'
                              ? 'exam'
                              : draft.contentType === 'GRADING_SUGGESTION'
                              ? 'grading'
                              : draft.contentType === 'PERFORMANCE_INSIGHT'
                              ? 'insights'
                              : 'materials'
                          );
                        }}
                        className={`cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md ${
                          activeDraft?.id === draft.id
                            ? 'border-primary ring-1 ring-primary bg-primary/5'
                            : 'border-border bg-card hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                              draft.status === 'PUBLISHED'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : draft.status === 'APPROVED'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {draft.status}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(draft.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <h3 className="mt-2 text-sm font-semibold text-foreground line-clamp-1">
                          {draft.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {draft.contentType.replace(/_/g, ' ')}
                          {draft.classSectionName ? ` • ${draft.classSectionName}` : ''}
                        </p>

                        <div className="mt-4 flex items-center justify-between border-t border-border pt-2 text-xs">
                          <span className="text-primary font-medium flex items-center gap-1">
                            <Edit3 className="h-3 w-3" /> View & Edit
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDraft(draft.id);
                            }}
                            className="text-muted-foreground hover:text-destructive"
                            title="Delete draft"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'documents' ? (
              /* Faculty Documents & Notice Generator View (TASK 026) */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Section 1: Search Guidelines & Regulations */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <div className="border-b border-border pb-3">
                    <div className="flex items-center gap-2 text-foreground font-bold text-base">
                      <BookOpen className="h-5 w-5 text-indigo-600" />
                      <h3>Teaching Guidelines & Institutional Policies</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Direct grounded search in staff handbooks, grading scales, attendance thresholds, and exam rules.
                    </p>
                  </div>

                  <form onSubmit={handleSearchTeachingDocs} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. grading scale, exam invigilation, leave policy..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="submit"
                      disabled={docSearchLoading}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {docSearchLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Search
                    </button>
                  </form>

                  {/* Quick Filter Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-muted-foreground self-center">Quick Inquiries:</span>
                    <button
                      type="button"
                      onClick={() => setDocSearchQuery('Attendance minimum threshold')}
                      className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium hover:bg-muted/80"
                    >
                      Attendance Threshold
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocSearchQuery('Exam rules and invigilation')}
                      className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium hover:bg-muted/80"
                    >
                      Exam Guidelines
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocSearchQuery('Staff code of conduct')}
                      className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium hover:bg-muted/80"
                    >
                      Staff Handbook
                    </button>
                  </div>

                  {/* Results List */}
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pt-2">
                    {docSearchResults.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                        Type an inquiry or click a quick suggestion to search institutional regulations.
                      </div>
                    ) : (
                      docSearchResults.map((sec: any) => (
                        <div key={sec.id} className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground flex items-center gap-1">
                              <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                              {sec.documentTitle}
                            </span>
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {sec.pageNumber ? `Page ${sec.pageNumber}` : `Section ${sec.sectionIndex + 1}`}
                            </span>
                          </div>
                          <h4 className="text-xs font-semibold text-primary">{sec.title}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                            {sec.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Section 2: Draft Parent Notice */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <div className="border-b border-border pb-3">
                    <div className="flex items-center gap-2 text-foreground font-bold text-base">
                      <Send className="h-5 w-5 text-purple-600" />
                      <h3>Draft Parent Notice / Absence Alert</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Synthesize formal, empathetic parent notices grounded in school policy. Human approval required before sending.
                    </p>
                  </div>

                  <form onSubmit={handleDraftParentNotice} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Notice Type / Advisory Topic
                      </label>
                      <select
                        value={parentNoticeForm.noticeType}
                        onChange={(e) => setParentNoticeForm({ ...parentNoticeForm, noticeType: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="Attendance Warning">Attendance Warning (Threshold Alert)</option>
                        <option value="Academic Progress Advisory">Academic Progress Advisory</option>
                        <option value="Homework Completion Alert">Homework Completion Alert</option>
                        <option value="Parent-Teacher Conference Invitation">Parent-Teacher Conference Invitation</option>
                        <option value="General Classroom Announcement">General Classroom Announcement</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Key Points (separated by semicolon ';')
                      </label>
                      <textarea
                        rows={3}
                        value={parentNoticeForm.keyPoints}
                        onChange={(e) => setParentNoticeForm({ ...parentNoticeForm, keyPoints: e.target.value })}
                        placeholder="e.g. 3 consecutive unexcused absences; missed midterm review; mandatory parent check-in"
                        className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-foreground">Urgency:</label>
                        <select
                          value={parentNoticeForm.urgency}
                          onChange={(e) => setParentNoticeForm({ ...parentNoticeForm, urgency: e.target.value })}
                          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                        >
                          <option value="NORMAL">Normal Priority</option>
                          <option value="HIGH">High Priority</option>
                          <option value="URGENT">Urgent Advisory</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={noticeDraftLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow hover:opacity-95 disabled:opacity-50"
                      >
                        {noticeDraftLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        Generate Notice Draft
                      </button>
                    </div>
                  </form>

                  {/* Rendered Notice Draft */}
                  {noticeDraftResult && (
                    <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">Generated Notice Subject:</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${noticeDraftResult.subject}\n\n${noticeDraftResult.content}`
                            );
                            setStatusMessage({ type: 'success', text: 'Notice copied to clipboard!' });
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <Copy className="h-3 w-3" />
                          Copy Notice Text
                        </button>
                      </div>
                      <div className="text-xs font-semibold text-primary">{noticeDraftResult.subject}</div>
                      <div className="rounded-lg bg-card p-3 border border-border text-xs leading-relaxed text-foreground whitespace-pre-line max-h-60 overflow-y-auto">
                        {noticeDraftResult.content}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>Human-in-the-loop: Review draft before messaging guardian via Messages or Announcements.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Generator Controls Card */
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="text-base font-bold text-foreground capitalize">
                    {activeTab.replace('-', ' ')} Generator
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Customize institutional parameters to generate standards-aligned curriculum artifacts.
                  </p>
                </div>

                <form
                  onSubmit={
                    activeTab === 'lesson-plan'
                      ? handleGenerateLessonPlan
                      : activeTab === 'homework'
                      ? handleGenerateHomework
                      : activeTab === 'exam'
                      ? handleGenerateExam
                      : activeTab === 'grading'
                      ? handleGenerateGrading
                      : activeTab === 'insights'
                      ? handleGenerateInsights
                      : handleGenerateMaterials
                  }
                  className="space-y-4"
                >
                  {/* Class Section Selection */}
                  {activeTab !== 'grading' && (
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Assigned Class Section <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        required={activeTab !== 'materials'}
                      >
                        <option value="">Select an assigned class...</option>
                        {teacherClasses.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name} ({cls.studentCount} students)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Subject Selection */}
                  {activeTab !== 'grading' && (
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Subject / Discipline
                      </label>
                      <select
                        value={selectedSubjectId}
                        onChange={(e) => setSelectedSubjectId(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Select subject...</option>
                        {teacherSubjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name} ({sub.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Submission Selector for Grading Assistant */}
                  {activeTab === 'grading' && (
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Student Submission <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={selectedSubmissionId}
                        onChange={(e) => setSelectedSubmissionId(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      >
                        <option value="">Select student submission...</option>
                        {pendingSubmissions.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.studentName} — {sub.homeworkTitle} (Max: {sub.maxPoints} pts)
                          </option>
                        ))}
                      </select>
                      {pendingSubmissions.length === 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          No pending homework submissions detected. You can also evaluate mock fixtures.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Topic / Unit Input */}
                  {activeTab !== 'grading' && activeTab !== 'insights' && (
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Topic / Curriculum Unit <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g., Quadratic Equations, Cellular Respiration, Newton's Laws"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>
                  )}

                  {/* Learning Objectives */}
                  {(activeTab === 'lesson-plan' || activeTab === 'homework' || activeTab === 'materials') && (
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Target Learning Objectives
                      </label>
                      <textarea
                        value={learningObjectives}
                        onChange={(e) => setLearningObjectives(e.target.value)}
                        rows={2}
                        placeholder="e.g., Explain biochemical reaction stages; calculate energy yields."
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}

                  {/* Rubric Criteria for Grading */}
                  {activeTab === 'grading' && (
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Marking Rubric / Criteria
                      </label>
                      <textarea
                        value={rubricCriteria}
                        onChange={(e) => setRubricCriteria(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}

                  {/* Difficulty & Parameters */}
                  {activeTab !== 'grading' && activeTab !== 'insights' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Difficulty Level
                        </label>
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="BEGINNER">Beginner / Foundational</option>
                          <option value="INTERMEDIATE">Intermediate / Standard</option>
                          <option value="ADVANCED">Advanced / Honors</option>
                        </select>
                      </div>

                      {activeTab === 'lesson-plan' && (
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Duration (Minutes)
                          </label>
                          <input
                            type="number"
                            min={15}
                            max={180}
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      )}

                      {(activeTab === 'homework' || activeTab === 'exam') && (
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Questions Count
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={questionCount}
                            onChange={(e) => setQuestionCount(Number(e.target.value))}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      )}

                      {activeTab === 'materials' && (
                        <div>
                          <label className="block text-xs font-medium text-foreground mb-1">
                            Material Type
                          </label>
                          <select
                            value={materialType}
                            onChange={(e) => setMaterialType(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          >
                            <option value="STUDY_GUIDE">Study Guide</option>
                            <option value="WORKSHEET">Worksheet</option>
                            <option value="REVISION_NOTES">Revision Notes</option>
                            <option value="CLASSROOM_ACTIVITY">Classroom Activity</option>
                            <option value="FLASHCARDS">Flashcards</option>
                            <option value="TOPIC_SUMMARY">Topic Summary</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Exam Marks */}
                  {activeTab === 'exam' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Total Marks
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={200}
                          value={totalMarks}
                          onChange={(e) => setTotalMarks(Number(e.target.value))}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          Time Limit (Mins)
                        </label>
                        <input
                          type="number"
                          min={15}
                          max={180}
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}

                  {/* Additional Instructions */}
                  {activeTab !== 'grading' && activeTab !== 'insights' && (
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Optional Instructor Directives
                      </label>
                      <input
                        type="text"
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        placeholder="e.g., Emphasize practical applications; omit complex trigonometry."
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isGenerating || contextLoading}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition-all hover:opacity-95 disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Generating with Gemini...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate {activeTab.replace('-', ' ')}
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Content Preview & Editing Workspace */}
          {activeTab !== 'drafts' && activeTab !== 'documents' && (
            <div className="lg:col-span-7 space-y-6">
              {activeDraft ? (
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
                  {/* Header & Status Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            activeDraft.status === 'PUBLISHED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : activeDraft.status === 'APPROVED'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {activeDraft.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {activeDraft.contentType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={activeDraft.title}
                        onChange={(e) => setActiveDraft({ ...activeDraft, title: e.target.value })}
                        className="mt-1 font-bold text-lg text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyContent}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                        title="Copy content"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                        title="Print / PDF"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print
                      </button>
                    </div>
                  </div>

                  {/* Render Structured Content by Type */}
                  <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2">
                    {/* 1. LESSON PLAN RENDER */}
                    {activeDraft.contentType === 'LESSON_PLAN' && (
                      <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/30 p-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Duration:</span>{' '}
                            <span className="font-semibold text-foreground">
                              {activeDraft.content.durationMinutes || 45} mins
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Difficulty:</span>{' '}
                            <span className="font-semibold text-foreground">
                              {activeDraft.content.difficultyLevel || 'INTERMEDIATE'}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Learning Objectives
                          </h4>
                          <ul className="list-disc pl-5 space-y-1 text-foreground/90">
                            {activeDraft.content.learningObjectives?.map((obj: string, i: number) => (
                              <li key={i}>{obj}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Required Materials
                          </h4>
                          <p className="text-foreground/90">
                            {activeDraft.content.requiredMaterials?.join(', ') || 'Standard course textbooks.'}
                          </p>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            Curriculum Timetable & Activities
                          </h4>
                          <div className="space-y-2">
                            {activeDraft.content.sections?.map((sec: any, i: number) => (
                              <div key={i} className="rounded-lg border border-border p-3">
                                <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                                  <span>{sec.name}</span>
                                  <span className="text-muted-foreground">{sec.durationMinutes} mins</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{sec.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Homework Suggestion
                          </h4>
                          <p className="text-xs text-foreground/90 bg-muted/40 p-2.5 rounded-md">
                            {activeDraft.content.homeworkSuggestions}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* 2. HOMEWORK RENDER */}
                    {activeDraft.contentType === 'HOMEWORK' && (
                      <div className="space-y-4 text-sm">
                        <div className="rounded-lg bg-muted/30 p-3 text-xs flex justify-between">
                          <span>
                            Total Points: <strong className="text-foreground">{activeDraft.content.maxPoints || 100}</strong>
                          </span>
                          <span>
                            Est. Time: <strong className="text-foreground">{activeDraft.content.estimatedTimeMinutes || 30} mins</strong>
                          </span>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Assignment Questions ({activeDraft.content.questions?.length || 0})
                          </h4>
                          {activeDraft.content.questions?.map((q: any, i: number) => (
                            <div key={i} className="rounded-lg border border-border p-3.5 space-y-1.5">
                              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                                <span>Question {q.questionNumber || i + 1}</span>
                                <span className="text-primary font-semibold">{q.points} pts</span>
                              </div>
                              <p className="text-sm text-foreground/90">{q.questionText}</p>
                              <div className="rounded bg-muted/50 p-2 text-xs text-muted-foreground mt-2">
                                <span className="font-semibold text-foreground">Marking Criteria:</span> {q.markingCriteria}
                              </div>
                              <div className="rounded bg-emerald-50 dark:bg-emerald-950/30 p-2 text-xs text-emerald-800 dark:text-emerald-300">
                                <span className="font-semibold">Instructor Solution:</span> {q.suggestedAnswer}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 3. EXAM RENDER */}
                    {activeDraft.contentType === 'EXAM' && (
                      <div className="space-y-4 text-sm">
                        <div className="rounded-lg bg-muted/30 p-3 text-xs flex justify-between">
                          <span>
                            Total Marks: <strong className="text-foreground">{activeDraft.content.totalMarks || 50}</strong>
                          </span>
                          <span>
                            Passing: <strong className="text-foreground">{activeDraft.content.passingMarks || 20}</strong>
                          </span>
                          <span>
                            Duration: <strong className="text-foreground">{activeDraft.content.durationMinutes || 45} mins</strong>
                          </span>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Question Paper ({activeDraft.content.questions?.length || 0} Questions)
                          </h4>
                          {activeDraft.content.questions?.map((q: any, i: number) => (
                            <div key={i} className="rounded-lg border border-border p-3.5 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-foreground">
                                <span>
                                  Q{q.order || i + 1} • <span className="text-muted-foreground">{q.questionType}</span>
                                </span>
                                <span className="text-primary font-semibold">{q.marks} Marks</span>
                              </div>
                              <p className="text-sm text-foreground/90 font-medium">{q.questionText}</p>

                              {q.options && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2 text-xs">
                                  {q.options.map((opt: string, optIdx: number) => (
                                    <div
                                      key={optIdx}
                                      className={`p-1.5 rounded border ${
                                        opt === q.correctAnswer
                                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium'
                                          : 'border-border text-foreground/80'
                                      }`}
                                    >
                                      {String.fromCharCode(65 + optIdx)}. {opt}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2 rounded">
                                <span className="font-semibold">Correct Answer / Key:</span> {q.correctAnswer}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. GRADING ASSISTANT RENDER */}
                    {activeDraft.contentType === 'GRADING_SUGGESTION' && (
                      <div className="space-y-4 text-sm">
                        <div className="flex items-center justify-between rounded-xl bg-purple-500/10 border border-purple-500/20 p-4">
                          <div>
                            <span className="text-xs uppercase font-bold text-purple-700 dark:text-purple-300">
                              AI Suggested Score
                            </span>
                            <div className="text-2xl font-black text-foreground">
                              {activeDraft.content.suggestedScore}{' '}
                              <span className="text-sm font-medium text-muted-foreground">
                                / {activeDraft.content.maxScore} pts ({activeDraft.content.percentage}%)
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground max-w-xs text-right">
                            Human review authoritative. Modify score below if necessary.
                          </span>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Rubric Evaluation
                          </h4>
                          <p className="text-sm text-foreground/90 bg-muted/30 p-3 rounded-lg">
                            {activeDraft.content.rubricExplanation}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                            <h5 className="text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                              Strengths
                            </h5>
                            <ul className="text-xs space-y-1 list-disc pl-4 text-foreground/90">
                              {activeDraft.content.strengths?.map((s: string, idx: number) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                            <h5 className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">
                              Areas for Improvement
                            </h5>
                            <ul className="text-xs space-y-1 list-disc pl-4 text-foreground/90">
                              {activeDraft.content.areasForImprovement?.map((a: string, idx: number) => (
                                <li key={idx}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                            Constructive Feedback for Student
                          </h4>
                          <textarea
                            value={activeDraft.content.constructiveFeedback || ''}
                            onChange={(e) =>
                              setActiveDraft({
                                ...activeDraft,
                                content: { ...activeDraft.content, constructiveFeedback: e.target.value },
                              })
                            }
                            rows={3}
                            className="w-full rounded-md border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    )}

                    {/* 5. CLASS PERFORMANCE INSIGHTS RENDER */}
                    {activeDraft.contentType === 'PERFORMANCE_INSIGHT' && (
                      <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-lg border border-border bg-card p-3 text-center">
                            <span className="text-[11px] text-muted-foreground">Class Average</span>
                            <div className="text-xl font-bold text-foreground">
                              {activeDraft.content.averageGrade}%
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-card p-3 text-center">
                            <span className="text-[11px] text-muted-foreground">Attendance</span>
                            <div className="text-xl font-bold text-foreground">
                              {activeDraft.content.attendanceRate}%
                            </div>
                          </div>
                          <div className="rounded-lg border border-border bg-card p-3 text-center">
                            <span className="text-[11px] text-muted-foreground">Homework Completion</span>
                            <div className="text-xl font-bold text-foreground">
                              {activeDraft.content.homeworkCompletionRate}%
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg bg-muted/40 p-3 text-sm text-foreground/90">
                          <p>{activeDraft.content.classSummary}</p>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Curriculum Topics Requiring Revision
                          </h4>
                          <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/90">
                            {activeDraft.content.topicsNeedingRevision?.map((t: string, i: number) => (
                              <li key={i}>{t}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Suggested Faculty Interventions
                          </h4>
                          <div className="space-y-1.5">
                            {activeDraft.content.suggestedInterventions?.map((inv: string, i: number) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                                <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <span>{inv}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 6. TEACHING MATERIALS RENDER */}
                    {activeDraft.contentType === 'TEACHING_MATERIAL' && (
                      <div className="space-y-4 text-sm">
                        <div className="space-y-3">
                          {activeDraft.content.sections?.map((sec: any, i: number) => (
                            <div key={i} className="rounded-lg border border-border p-3.5">
                              <h4 className="text-xs font-bold text-primary mb-1">{sec.heading}</h4>
                              <p className="text-sm text-foreground/90 whitespace-pre-line">{sec.content}</p>
                            </div>
                          ))}
                        </div>

                        {activeDraft.content.suggestedActivities && (
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                              Suggested Class Activities
                            </h4>
                            <ul className="list-disc pl-5 space-y-1 text-xs text-foreground/90">
                              {activeDraft.content.suggestedActivities.map((act: string, i: number) => (
                                <li key={i}>{act}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Bar (Save Draft, Approve, Publish) */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <button
                      onClick={handleSaveDraftEdits}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Save Edits
                    </button>

                    <div className="flex items-center gap-2">
                      {activeDraft.status !== 'APPROVED' && activeDraft.status !== 'PUBLISHED' && (
                        <button
                          onClick={() => handleApproveAndPublish('APPROVED')}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve Draft
                        </button>
                      )}

                      {(activeDraft.contentType === 'HOMEWORK' || activeDraft.contentType === 'EXAM') &&
                        activeDraft.status !== 'PUBLISHED' && (
                          <button
                            onClick={() => handleApproveAndPublish('PUBLISHED')}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
                          >
                            <Send className="h-3.5 w-3.5" />
                            Approve & Publish to EMS
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty State Workspace */
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-3">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">Ready to Assist</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Select your parameters on the left and click Generate to produce high-fidelity pedagogical materials.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
