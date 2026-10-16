'use client';

/**
 * MODULE: AI Parent / Guardian Assistant Page
 *
 * PURPOSE:
 * Transparent, supportive AI educational oversight for parents & guardians:
 * 1. Verified Child Selector (strictly scoped to verified guardian-child relationships)
 * 2. Child Academic Progress Summaries grounded in verified grades
 * 3. Attendance Oversight & Trend Explanations
 * 4. Homework & Upcoming Assignment Briefings
 * 5. Read-Only Fee & Tuition Balance Explanations
 * 6. Age-Appropriate Home-Learning Recommendations
 * 7. Child-Scoped Conversational Q&A
 *
 * SECURITY:
 * Strictly isolated to authenticated parents (UserRole.PARENT).
 * Every student record query strictly verifies the guardian relationship in the backend.
 * Switching children resets private conversation context to prevent sibling data leakage.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { UserRole } from '@ems/contracts';
import { aiParentApi } from '@/lib/ai-api';
import {
  Sparkles,
  Users,
  GraduationCap,
  Calendar,
  FileText,
  Receipt,
  Lightbulb,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Shield,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';

type ParentTab = 'academic' | 'attendance' | 'homework' | 'fees' | 'home-learning' | 'chat';

export default function ParentAssistantPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ParentTab>('academic');

  // Verified Children State
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');

  // Selected Child Data States
  const [loadingData, setLoadingData] = useState(false);
  const [academicData, setAcademicData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [homeworkData, setHomeworkData] = useState<any>(null);
  const [feeData, setFeeData] = useState<any>(null);
  const [homeLearningData, setHomeLearningData] = useState<any>(null);

  // Child-Scoped Chat State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'USER' | 'ASSISTANT'; text: string; prompts?: string[] }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load verified children on mount
  useEffect(() => {
    async function fetchChildren() {
      try {
        setLoadingChildren(true);
        const children = await aiParentApi.getChildren();
        setChildrenList(children || []);
        if (children && children.length > 0) {
          setSelectedChildId(children[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load verified children:', err);
        setStatusMessage({ type: 'error', text: 'Failed to retrieve verified child accounts.' });
      } finally {
        setLoadingChildren(false);
      }
    }
    fetchChildren();
  }, []);

  // When selected child changes, clear previous child context and fetch child data
  useEffect(() => {
    if (!selectedChildId) return;

    // Reset data states to prevent sibling data bleed
    setAcademicData(null);
    setAttendanceData(null);
    setHomeworkData(null);
    setFeeData(null);
    setHomeLearningData(null);
    setConversationId(undefined);

    const child = childrenList.find((c) => c.id === selectedChildId);
    const childName = child ? `${child.firstName} ${child.lastName}` : 'your child';

    // Set initial welcome chat message for this child
    setChatMessages([
      {
        sender: 'ASSISTANT',
        text: `Welcome! I am your AI Parent Assistant for ${childName}. Ask me anything about ${child?.firstName || 'their'} academic progress, classroom attendance, upcoming homework, or tuition balances.`,
        prompts: [
          `How is ${child?.firstName || 'my child'} performing academically?`,
          `Has ${child?.firstName || 'my child'}'s attendance been regular?`,
          `What homework assignments are due this week?`,
          `What is our current outstanding tuition fee balance?`,
        ],
      },
    ]);

    // Fetch tab-specific data
    loadTabData(activeTab, selectedChildId);
  }, [selectedChildId, activeTab]);

  // Load data for active tab
  const loadTabData = async (tab: ParentTab, childId: string) => {
    if (!childId) return;
    try {
      setLoadingData(true);
      if (tab === 'academic') {
        const res = await aiParentApi.getAcademicSummary(childId);
        setAcademicData(res);
      } else if (tab === 'attendance') {
        const res = await aiParentApi.getAttendanceSummary(childId);
        setAttendanceData(res);
      } else if (tab === 'homework') {
        const res = await aiParentApi.getHomeworkSummary(childId);
        setHomeworkData(res);
      } else if (tab === 'fees') {
        const res = await aiParentApi.getFeeExplanation(childId);
        setFeeData(res);
      } else if (tab === 'home-learning') {
        const res = await aiParentApi.getHomeLearningSuggestions({ studentId: childId });
        setHomeLearningData(res);
      }
    } catch (err: any) {
      console.error(`Failed to load ${tab} data:`, err);
    } finally {
      setLoadingData(false);
    }
  };

  // Handler: Parent Chat Send
  const handleSendChat = async (textToSend?: string) => {
    const text = textToSend || chatInput;
    if (!text.trim() || !selectedChildId || chatLoading) return;

    const newMessages = [...chatMessages, { sender: 'USER' as const, text }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await aiParentApi.askQuestion({
        studentId: selectedChildId,
        question: text,
        conversationId,
      });

      setConversationId(res.conversationId);
      setChatMessages([
        ...newMessages,
        {
          sender: 'ASSISTANT',
          text: res.answer,
          prompts: res.suggestedFollowUps || [],
        },
      ]);
    } catch (err: any) {
      setChatMessages([
        ...newMessages,
        {
          sender: 'ASSISTANT',
          text: "I am having trouble accessing the assistant service at this moment. You can review verified grades and attendance in the tabs above.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const selectedChild = childrenList.find((c) => c.id === selectedChildId);

  return (
    <ProtectedRoute allowedRoles={[UserRole.PARENT, UserRole.PLATFORM_ADMIN]}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 text-white p-6 md:p-8 shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 border border-emerald-300/40 backdrop-blur-sm flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Google Gemini AI
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 border border-white/30 text-emerald-100 flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-300" /> Verified Guardian Access
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI Parent / Guardian Assistant</h1>
                <p className="text-emerald-100 text-sm md:text-base max-w-2xl mt-1">
                  Transparent, grounded educational oversight. Review verified academic standing, attendance records, homework deadlines, tuition balances, and age-appropriate home learning guidance.
                </p>
              </div>

              {/* Child Selector */}
              {childrenList.length > 0 && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-xs w-full md:w-auto min-w-[280px]">
                  <label className="block text-emerald-200 font-semibold mb-1 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                    Select Verified Child:
                  </label>
                  <select
                    value={selectedChildId}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                    className="w-full text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold border-0 rounded-xl p-2.5 shadow-sm focus:ring-2 focus:ring-emerald-400"
                  >
                    {childrenList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName} ({c.className || c.gradeLevel})
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-emerald-200/80 mt-1.5 flex items-center justify-between">
                    <span>{selectedChild?.schoolName || 'Institutional Academy'}</span>
                    <span className="font-medium text-emerald-100">{selectedChild?.relationshipType}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-4 rounded-xl text-sm flex items-center justify-between border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              <button onClick={() => setStatusMessage(null)} className="text-xs hover:underline opacity-80">
                Dismiss
              </button>
            </div>
          )}

          {/* Empty State if No Verified Children */}
          {!loadingChildren && childrenList.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-4">
              <Users className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                No Verified Child Records Found
              </h2>
              <p className="text-sm max-w-md mx-auto">
                Your guardian account is not currently linked to any verified student enrollments. Please contact your school administrator or admissions office to establish verified guardian-student linkage.
              </p>
            </div>
          )}

          {childrenList.length > 0 && (
            <>
              {/* Navigation Tabs */}
              <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                {[
                  { id: 'academic', label: 'Academic Progress', icon: GraduationCap },
                  { id: 'attendance', label: 'Attendance Analysis', icon: Calendar },
                  { id: 'homework', label: 'Homework & Tasks', icon: FileText },
                  { id: 'fees', label: 'Tuition & Fees', icon: Receipt },
                  { id: 'home-learning', label: 'Home Learning Tips', icon: Lightbulb },
                  { id: 'chat', label: 'Ask Assistant', icon: MessageSquare },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as ParentTab);
                        setStatusMessage(null);
                      }}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200/80 dark:border-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: ACADEMIC PROGRESS */}
              {activeTab === 'academic' && (
                <div className="space-y-6">
                  {loadingData ? (
                    <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      Retrieving verified gradebook metrics...
                    </div>
                  ) : academicData ? (
                    <>
                      {/* Metric Summary Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Average Assessment Mark</div>
                          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            {academicData.verifiedMetrics?.averagePercentage}%
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">Across verified terms</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Graded Assessments</div>
                          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                            {academicData.verifiedMetrics?.gradesCount}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">Formal evaluations recorded</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Attendance Rate</div>
                          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                            {academicData.verifiedMetrics?.attendanceRate}%
                          </div>
                          <div className="text-[11px] text-emerald-600 mt-0.5">Classroom presence</div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Homework Submissions</div>
                          <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                            {academicData.verifiedMetrics?.homeworkCount}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">Completed assignments</div>
                        </div>
                      </div>

                      {/* AI Executive Synthesis */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                        <div>
                          <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                            Verified Academic Progress Summary
                          </div>
                          <h2 className="text-xl font-bold mt-1">
                            Executive Overview for {academicData.childName}
                          </h2>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                            {academicData.summary?.executiveSummary}
                          </p>
                        </div>

                        {/* Subject Breakdowns */}
                        {academicData.summary?.subjectBreakdowns && (
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                              Subject Performance Breakdown
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {academicData.summary.subjectBreakdowns.map((sb: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                      {sb.subject}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                      {sb.currentStanding}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 leading-relaxed">
                                    {sb.observations}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Strengths & Recommendations */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 text-xs space-y-2">
                            <div className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Key Strengths
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                              {academicData.summary?.highlightedStrengths?.map((str: string, i: number) => (
                                <li key={i}>{str}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 text-xs space-y-2">
                            <div className="font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Lightbulb className="w-3.5 h-3.5" /> Support Recommendations
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                              {academicData.summary?.supportRecommendations?.map((rec: string, i: number) => (
                                <li key={i}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {academicData.summary?.upcomingMilestonesNotice && (
                          <div className="text-xs text-slate-500 italic border-t border-slate-100 dark:border-slate-800 pt-3">
                            Notice: {academicData.summary.upcomingMilestonesNotice}
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* TAB 2: ATTENDANCE ANALYSIS */}
              {activeTab === 'attendance' && (
                <div className="space-y-6">
                  {loadingData ? (
                    <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      Retrieving attendance records...
                    </div>
                  ) : attendanceData ? (
                    <>
                      {/* Metric Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Attendance Rate</div>
                          <div className="text-2xl font-black text-emerald-600 mt-1">
                            {attendanceData.rawStatistics?.attendanceRate}%
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Present Sessions</div>
                          <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                            {attendanceData.rawStatistics?.present}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Absent</div>
                          <div className="text-2xl font-black text-rose-600 mt-1">
                            {attendanceData.rawStatistics?.absent}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Late Arrivals</div>
                          <div className="text-2xl font-black text-amber-600 mt-1">
                            {attendanceData.rawStatistics?.late}
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Excused Absences</div>
                          <div className="text-2xl font-black text-blue-600 mt-1">
                            {attendanceData.rawStatistics?.excused}
                          </div>
                        </div>
                      </div>

                      {/* Explanation Card */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {attendanceData.summary?.headline}
                          </h2>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            attendanceData.summary?.trendIndicator === 'EXCELLENT'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {attendanceData.summary?.trendIndicator}
                          </span>
                        </div>

                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {attendanceData.summary?.analysis}
                        </p>

                        {attendanceData.summary?.guardianNotes && (
                          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                            <div className="font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px]">
                              School Attendance Guidelines:
                            </div>
                            <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
                              {attendanceData.summary.guardianNotes.map((note: string, nIdx: number) => (
                                <li key={nIdx}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* TAB 3: HOMEWORK & TASKS */}
              {activeTab === 'homework' && (
                <div className="space-y-6">
                  {loadingData ? (
                    <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      Retrieving assignment records...
                    </div>
                  ) : homeworkData ? (
                    <>
                      {/* Overview */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                        <h2 className="text-lg font-bold">Homework Overview</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          {homeworkData.summary?.overview}
                        </p>

                        {/* Priority Tasks */}
                        {homeworkData.summary?.priorityTasks && homeworkData.summary.priorityTasks.length > 0 && (
                          <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 space-y-2 text-xs">
                            <div className="font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> Upcoming Deadlines Requiring Completion
                            </div>
                            <div className="space-y-1.5">
                              {homeworkData.summary.priorityTasks.map((t: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-slate-800 dark:text-slate-200">
                                  <span><strong>{t.title}</strong> ({t.subject})</span>
                                  <span className="font-semibold text-rose-600">Due: {t.due}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Pending vs Completed Lists */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pending */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
                          <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                            <Clock className="w-4 h-4 text-amber-500" />
                            Pending Assignments ({homeworkData.pendingAssignments?.length || 0})
                          </h3>
                          <div className="space-y-2">
                            {homeworkData.pendingAssignments?.map((p: any) => (
                              <div key={p.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{p.title}</div>
                                <div className="flex justify-between text-slate-500 text-[11px]">
                                  <span>{p.subject}</span>
                                  <span className="text-rose-600 font-medium">Due: {p.dueDate}</span>
                                </div>
                              </div>
                            ))}
                            {homeworkData.pendingAssignments?.length === 0 && (
                              <div className="text-xs text-slate-400 py-4 text-center">No pending assignments! All caught up.</div>
                            )}
                          </div>
                        </div>

                        {/* Completed Submissions */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
                          <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Submitted Assignments ({homeworkData.submittedAssignments?.length || 0})
                          </h3>
                          <div className="space-y-2">
                            {homeworkData.submittedAssignments?.map((s: any) => (
                              <div key={s.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                                <div className="font-semibold text-slate-900 dark:text-slate-100">{s.title}</div>
                                <div className="flex justify-between text-slate-500 text-[11px]">
                                  <span>{s.subject}</span>
                                  <span className="text-emerald-600 font-semibold">
                                    {s.pointsAwarded !== null ? `${s.pointsAwarded} / ${s.maxPoints} pts` : 'Submitted'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* TAB 4: TUITION & FEES */}
              {activeTab === 'fees' && (
                <div className="space-y-6">
                  {loadingData ? (
                    <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      Retrieving verified ledger...
                    </div>
                  ) : feeData ? (
                    <>
                      {/* Notice */}
                      <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span>
                            <strong>Authoritative Read-Only Records:</strong> Fee balances reflect official school accounting. The AI assistant never calculates balances independently or initiates payments.
                          </span>
                        </div>
                      </div>

                      {/* Financial Balances */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Outstanding Balance</div>
                          <div className={`text-3xl font-black mt-1 ${
                            feeData.authoritativeLedger?.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                          }`}>
                            ${feeData.authoritativeLedger?.outstandingBalance?.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">Net amount due</div>
                        </div>

                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Total Invoiced</div>
                          <div className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">
                            ${feeData.authoritativeLedger?.totalInvoiced?.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">Tuition & term fees</div>
                        </div>

                        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                          <div className="text-xs text-slate-500 uppercase font-semibold">Total Payments Recorded</div>
                          <div className="text-3xl font-black text-emerald-600 mt-1">
                            ${feeData.authoritativeLedger?.totalPaid?.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-emerald-600 mt-1">Processed & verified</div>
                        </div>
                      </div>

                      {/* AI Explanation Banner */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
                        <h2 className="text-base font-bold">Fee Status Explanation</h2>
                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {feeData.explanation?.summaryStatement}
                        </p>
                        {feeData.explanation?.overdueWarning && (
                          <div className="text-xs text-rose-700 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200">
                            {feeData.explanation.overdueWarning}
                          </div>
                        )}
                        <p className="text-xs text-slate-500">
                          {feeData.explanation?.nextSteps}
                        </p>
                      </div>

                      {/* Invoices Table */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold">Invoices & Statements</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase text-[10px]">
                              <tr>
                                <th className="p-3">Invoice #</th>
                                <th className="p-3">Due Date</th>
                                <th className="p-3">Total</th>
                                <th className="p-3">Paid</th>
                                <th className="p-3">Balance</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {feeData.authoritativeLedger?.invoices?.map((inv: any) => (
                                <tr key={inv.id}>
                                  <td className="p-3 font-semibold">{inv.invoiceNumber}</td>
                                  <td className="p-3">{inv.dueDate}</td>
                                  <td className="p-3 font-semibold">${inv.totalAmount?.toFixed(2)}</td>
                                  <td className="p-3 text-emerald-600">${inv.paidAmount?.toFixed(2)}</td>
                                  <td className="p-3 font-bold">${inv.balance?.toFixed(2)}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      inv.status === 'PAID'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                                        : inv.status === 'OVERDUE'
                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                    }`}>
                                      {inv.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                              {feeData.authoritativeLedger?.invoices?.length === 0 && (
                                <tr>
                                  <td colSpan={6} className="p-4 text-center text-slate-400">
                                    No invoices issued for this student.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              {/* TAB 5: HOME LEARNING SUGGESTIONS */}
              {activeTab === 'home-learning' && (
                <div className="space-y-6">
                  {loadingData ? (
                    <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
                      Generating personalized home routines...
                    </div>
                  ) : homeLearningData ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                        <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                          Home Learning & Encouragement
                        </div>
                        <h2 className="text-xl font-bold mt-1">
                          {homeLearningData.routineTitle}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">
                          Constructive routines adapted to {selectedChild?.firstName}'s grade level.
                        </p>
                      </div>

                      {/* Daily Routines */}
                      {homeLearningData.dailyRoutines && (
                        <div>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                            Recommended Daily Routines
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {homeLearningData.dailyRoutines.map((r: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-1"
                              >
                                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{r.name}</div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                  {r.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Subject Practice Tips */}
                      {homeLearningData.subjectPracticeTips && (
                        <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 text-xs space-y-2">
                          <div className="font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider text-[11px]">
                            Practical Subject Discussion Prompts
                          </div>
                          <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                            {homeLearningData.subjectPracticeTips.map((tip: string, tIdx: number) => (
                              <li key={tIdx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Encouragement Strategy */}
                      {homeLearningData.encouragementStrategy && (
                        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 text-xs space-y-1">
                          <div className="font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider text-[11px]">
                            Parent Encouragement Strategy
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                            {homeLearningData.encouragementStrategy}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 6: CHAT WITH ASSISTANT */}
              {activeTab === 'chat' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[650px]">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        Parent Q&A: {selectedChild?.firstName} {selectedChild?.lastName}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Inquiries are verified against {selectedChild?.firstName}'s official academic and fee records.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                      Child Context Active
                    </span>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${m.sender === 'USER' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-2xl p-4 rounded-2xl text-sm leading-relaxed ${
                            m.sender === 'USER'
                              ? 'bg-emerald-700 text-white rounded-br-none shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60 whitespace-pre-line'
                          }`}
                        >
                          {m.text}
                        </div>

                        {/* Suggested Follow-Ups */}
                        {m.prompts && m.prompts.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 max-w-2xl">
                            {m.prompts.map((p, pIdx) => (
                              <button
                                key={pIdx}
                                onClick={() => handleSendChat(p)}
                                className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1 hover:bg-emerald-100 transition-colors text-left"
                              >
                                💬 {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {chatLoading && (
                      <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        Reviewing institutional records...
                      </div>
                    )}
                  </div>

                  {/* Input Form */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-2">
                    <input
                      type="text"
                      placeholder={`Ask a question regarding ${selectedChild?.firstName || 'your child'}...`}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                      className="flex-1 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      onClick={() => handleSendChat()}
                      disabled={!chatInput.trim() || chatLoading}
                      className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-700/20"
                    >
                      <Send className="w-4 h-4" />
                      Ask
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}
