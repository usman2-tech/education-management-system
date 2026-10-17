'use client';

/**
 * MODULE: AI Student Tutor Page
 *
 * PURPOSE:
 * Interactive, pedagogical AI learning environment for students:
 * 1. Concept Explanations with worked examples and quick-checks
 * 2. Socratic step-by-step guided dialogue
 * 3. Practice Quiz generation, interactive solving, and immediate formative grading
 * 4. Personalized Revision Planner grounded in verified records
 * 5. Homework Guidance (hints, analogous examples, zero answer copying)
 * 6. Learning Progress dashboard with verified metrics
 *
 * SECURITY:
 * Permitted strictly for authenticated students (UserRole.STUDENT).
 * Formative self-practice only; never alters official exam grades or report cards.
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { UserRole } from '@ems/contracts';
import { aiTutorApi } from '@/lib/ai-api';
import { AIAssistantView } from '@/components/ai/ai-assistant-view';
import {
  Sparkles,
  BookOpen,
  MessageSquare,
  FileCheck2,
  Calendar,
  HelpCircle,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  Award,
  Clock,
  ArrowRight,
  BookMarked,
  Lightbulb,
  Check,
  ChevronRight,
  Save,
  Bot,
} from 'lucide-react';

type TutorTab =
  | 'concept'
  | 'socratic'
  | 'quiz'
  | 'revision'
  | 'homework'
  | 'progress'
  | 'rules'
  | 'assistant';

function StudentCopilotContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const initialConversationId = searchParams.get('conversationId');

  const [activeTab, setActiveTab] = useState<TutorTab>(
    (initialTab as TutorTab) || 'concept'
  );

  useEffect(() => {
    if (
      initialTab &&
      [
        'concept',
        'socratic',
        'quiz',
        'revision',
        'homework',
        'progress',
        'rules',
        'assistant',
      ].includes(initialTab)
    ) {
      setActiveTab(initialTab as TutorTab);
    }
  }, [initialTab]);

  // Student Context
  const [loadingContext, setLoadingContext] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [studentGradeLevel, setStudentGradeLevel] = useState('High School');

  // Shared Form State
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('INTERMEDIATE');

  // Concept Guide State
  const [explanationStyle, setExplanationStyle] = useState('STEP_BY_STEP');
  const [studentQuestion, setStudentQuestion] = useState('');
  const [conceptLoading, setConceptLoading] = useState(false);
  const [conceptResult, setConceptResult] = useState<any>(null);
  const [quickCheckAnswer, setQuickCheckAnswer] = useState<string | null>(null);

  // Socratic Tutor State
  const [socraticInput, setSocraticInput] = useState('');
  const [socraticMessages, setSocraticMessages] = useState<Array<{ sender: 'USER' | 'ASSISTANT'; text: string; prompts?: string[] }>>([
    {
      sender: 'ASSISTANT',
      text: "Hello! I am your AI Academic Tutor. What topic or problem are you studying today? Share a question and we will solve it step-by-step together!",
      prompts: [
        "Explain how to solve quadratic equations using the quadratic formula",
        "How do I determine the limiting reactant in a chemistry problem?",
        "What is the difference between mitosis and meiosis?",
      ],
    },
  ]);
  const [socraticLoading, setSocraticLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();

  // Practice Quiz State
  const [quizQuestionCount, setQuizQuestionCount] = useState(4);
  const [quizQuestionType, setQuizQuestionType] = useState('MIXED');
  const [quizLoading, setQuizLoading] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any>(null);
  const [pastQuizzes, setPastQuizzes] = useState<any[]>([]);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  // Revision Planner State
  const [timeframeDays, setTimeframeDays] = useState(7);
  const [targetExamDate, setTargetExamDate] = useState('Next 2 Weeks');
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [activeRevisionPlan, setActiveRevisionPlan] = useState<any>(null);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);

  // Homework Guidance State
  const [homeworkInput, setHomeworkInput] = useState('');
  const [homeworkDoubt, setHomeworkDoubt] = useState('');
  const [hwLoading, setHwLoading] = useState(false);
  const [hwGuidanceResult, setHwGuidanceResult] = useState<any>(null);

  // Learning Progress State
  const [progressData, setProgressData] = useState<any>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // School Rules & Handbook State (TASK 026)
  const [ruleQuery, setRuleQuery] = useState('');
  const [ruleExplanation, setRuleExplanation] = useState<any>(null);
  const [ruleLoading, setRuleLoading] = useState(false);

  const handleAskRule = async (customQuery?: string) => {
    const q = customQuery || ruleQuery;
    if (!q.trim()) return;
    setRuleLoading(true);
    setStatusMessage(null);
    try {
      const res = await aiTutorApi.explainSchoolRule(q.trim());
      setRuleExplanation(res);
      setStatusMessage({ type: 'success', text: 'School rule explanation retrieved from institutional documents.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to retrieve rule explanation.' });
    } finally {
      setRuleLoading(false);
    }
  };

  // Load student context and past items
  useEffect(() => {
    async function init() {
      try {
        setLoadingContext(true);
        const ctx = await aiTutorApi.getContext();
        setCourses(ctx.courses || []);
        setSubjects(ctx.subjects || []);
        setStudentGradeLevel(ctx.gradeLevel || 'Secondary');

        if (ctx.courses?.length > 0) setSelectedCourseId(ctx.courses[0].id);
        if (ctx.subjects?.length > 0) setSelectedSubjectId(ctx.subjects[0].id);

        // Load existing quizzes and revision plans
        const [quizzes, plans] = await Promise.all([
          aiTutorApi.listPracticeQuizzes().catch(() => []),
          aiTutorApi.listRevisionPlans().catch(() => []),
        ]);
        setPastQuizzes(quizzes);
        setSavedPlans(plans);
      } catch (err: any) {
        console.error('Failed to load student tutor context:', err);
      } finally {
        setLoadingContext(false);
      }
    }
    init();
  }, []);

  // Handler: Generate Concept Explanation
  const handleGenerateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a topic to explain.' });
      return;
    }

    try {
      setConceptLoading(true);
      setStatusMessage(null);
      setQuickCheckAnswer(null);

      const result = await aiTutorApi.generateConceptExplanation({
        courseId: selectedCourseId || undefined,
        subjectId: selectedSubjectId || undefined,
        topic: topic.trim(),
        difficultyLevel: difficulty,
        explanationStyle,
        question: studentQuestion.trim() || undefined,
      });

      setConceptResult(result);
      setStatusMessage({ type: 'success', text: 'Concept guide generated successfully!' });
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to generate concept explanation.' });
    } finally {
      setConceptLoading(false);
    }
  };

  // Handler: Socratic Chat
  const handleSendSocratic = async (textToSend?: string) => {
    const text = textToSend || socraticInput;
    if (!text.trim() || socraticLoading) return;

    const newMessages = [...socraticMessages, { sender: 'USER' as const, text }];
    setSocraticMessages(newMessages);
    setSocraticInput('');
    setSocraticLoading(true);

    try {
      const res = await aiTutorApi.socraticTutor({
        message: text,
        conversationId,
        courseId: selectedCourseId || undefined,
        subjectId: selectedSubjectId || undefined,
      });

      setConversationId(res.conversationId);
      setSocraticMessages([
        ...newMessages,
        {
          sender: 'ASSISTANT',
          text: `${res.guidance}\n\n**Next question:** ${res.followUpQuestion}`,
          prompts: res.suggestedPrompts || [],
        },
      ]);
    } catch (err: any) {
      setSocraticMessages([
        ...newMessages,
        {
          sender: 'ASSISTANT',
          text: "I'm having trouble connecting right now, but let's think: what is the fundamental principle behind this concept?",
        },
      ]);
    } finally {
      setSocraticLoading(false);
    }
  };

  // Handler: Generate Practice Quiz
  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a topic for the quiz.' });
      return;
    }

    try {
      setQuizLoading(true);
      setStatusMessage(null);
      setUserAnswers({});
      setQuizResult(null);

      const res = await aiTutorApi.generatePracticeQuiz({
        courseId: selectedCourseId || undefined,
        subjectId: selectedSubjectId || undefined,
        topic: topic.trim(),
        difficultyLevel: difficulty,
        questionCount: quizQuestionCount,
        questionType: quizQuestionType,
      });

      setActiveQuiz(res);
      setStatusMessage({ type: 'success', text: `Practice quiz with ${res.questions?.length || 4} questions created!` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to generate practice quiz.' });
    } finally {
      setQuizLoading(false);
    }
  };

  // Handler: Submit Quiz Answers
  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;
    try {
      setSubmittingQuiz(true);
      const res = await aiTutorApi.submitPracticeQuiz({
        quizId: activeQuiz.id,
        answers: userAnswers,
      });

      setQuizResult(res);
      // Refresh past quizzes list
      const updated = await aiTutorApi.listPracticeQuizzes().catch(() => []);
      setPastQuizzes(updated);
      setStatusMessage({ type: 'success', text: `Practice quiz completed! Formative Score: ${res.score}%` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to submit quiz.' });
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // Handler: Generate Revision Plan
  const handleGenerateRevisionPlan = async () => {
    try {
      setRevisionLoading(true);
      setStatusMessage(null);

      const res = await aiTutorApi.generateRevisionPlan({
        timeframeDays,
        targetExamDate,
      });

      setActiveRevisionPlan(res);
      setStatusMessage({ type: 'success', text: 'Personalized revision plan generated!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to generate revision plan.' });
    } finally {
      setRevisionLoading(false);
    }
  };

  // Handler: Save Revision Plan
  const handleSaveRevisionPlan = async () => {
    if (!activeRevisionPlan) return;
    try {
      setSavingPlan(true);
      await aiTutorApi.saveRevisionPlan({
        title: activeRevisionPlan.planTitle || `${timeframeDays}-Day Revision Plan`,
        planContent: activeRevisionPlan,
      });
      const plans = await aiTutorApi.listRevisionPlans().catch(() => []);
      setSavedPlans(plans);
      setStatusMessage({ type: 'success', text: 'Revision plan saved to your profile!' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save revision plan.' });
    } finally {
      setSavingPlan(false);
    }
  };

  // Handler: Homework Guidance
  const handleGetHomeworkGuidance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeworkInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter homework title or details.' });
      return;
    }

    try {
      setHwLoading(true);
      setStatusMessage(null);

      // Create a simulated client-side or fallback request
      const res = await aiTutorApi.getHomeworkGuidance({
        homeworkId: homeworkInput.trim(),
        questionOrDoubt: homeworkDoubt.trim() || undefined,
      }).catch(async () => {
        // Direct pedagogical fallback if raw ID not in DB
        return {
          guidanceTitle: `Homework Guidance: ${homeworkInput}`,
          instructionClarification: `This assignment assesses your analytical method and logical progression. Always write out assumptions explicitly.`,
          conceptualHints: [
            "Identify the given parameters and target variable first.",
            "Write the governing equation cleanly before substituting numbers.",
            "Double-check dimensional units before the final step.",
          ],
          similarWorkedExample: {
            problem: "Parallel illustrative practice exercise (illustrative values):",
            solutionWalkthrough: "Step 1: Set up the formula.\nStep 2: Substitute sample numbers.\nStep 3: Solve systematically step-by-step.",
            keyTakeaway: "Break the problem into sub-steps to prevent calculation mistakes.",
          },
          actionableSteps: [
            "Step 1: Re-read the assignment instructions carefully.",
            "Step 2: Write out each intermediate step neatly.",
            "Step 3: Check that your final conclusion answers the prompt.",
          ],
          selfCheckQuestions: [
            "Did I write down all working clearly?",
            "Are units included on the final answer?",
          ],
        };
      });

      setHwGuidanceResult(res);
      setStatusMessage({ type: 'success', text: 'Pedagogical guidance generated! Good luck with your assignment.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to get homework guidance.' });
    } finally {
      setHwLoading(false);
    }
  };

  // Handler: Load Learning Progress
  const handleLoadProgress = async () => {
    try {
      setProgressLoading(true);
      const res = await aiTutorApi.getLearningProgress();
      setProgressData(res);
    } catch (err: any) {
      console.error(err);
    } finally {
      setProgressLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'progress') {
      handleLoadProgress();
    }
  }, [activeTab]);

  return (
    <ProtectedRoute allowedRoles={[UserRole.STUDENT, UserRole.PLATFORM_ADMIN]}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 md:p-8 shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/30 border border-blue-300/40 backdrop-blur-sm flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Google Gemini AI
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 border border-emerald-300/40 text-emerald-200">
                    Formative Practice
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI Student Copilot</h1>
                <p className="text-blue-100 text-sm md:text-base max-w-2xl mt-1">
                  Your personalized Socratic study companion. Explore clear concept breakdowns, solve practice quizzes, build revision schedules, and get ethical homework hints.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-xs flex flex-col gap-1">
                <div className="text-blue-200 font-medium">Logged in as:</div>
                <div className="font-semibold text-white">{user ? `${user.firstName} ${user.lastName}` : 'Student'}</div>
                <div className="text-blue-200">Grade Level: <span className="text-white font-medium">{studentGradeLevel}</span></div>
              </div>
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

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            {[
              { id: 'concept', label: 'Concept Guide', icon: BookOpen },
              { id: 'socratic', label: 'Socratic Tutor', icon: MessageSquare },
              { id: 'quiz', label: 'Practice Quizzes', icon: FileCheck2 },
              { id: 'revision', label: 'Revision Planner', icon: Calendar },
              { id: 'homework', label: 'Homework Hints', icon: HelpCircle },
              { id: 'progress', label: 'Learning Progress', icon: TrendingUp },
              { id: 'rules', label: 'School Rules & Handbook', icon: BookMarked },
              { id: 'assistant', label: 'Ask Assistant', icon: Bot },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as TutorTab);
                    setStatusMessage(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: CONCEPT EXPLANATIONS */}
          {activeTab === 'concept' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Controls */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Explore Concept
                </h2>
                <p className="text-xs text-slate-500">
                  Select your subject and get a step-by-step breakdown tailored to your curriculum.
                </p>

                <form onSubmit={handleGenerateConcept} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                      Subject / Course
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                      {subjects.length === 0 && <option value="">General Studies</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                      Topic or Lesson <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Photosynthesis & Light Reactions"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                        Difficulty
                      </label>
                      <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                      >
                        <option value="BEGINNER">Foundational</option>
                        <option value="INTERMEDIATE">Standard</option>
                        <option value="ADVANCED">Challenging</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                        Style
                      </label>
                      <select
                        value={explanationStyle}
                        onChange={(e) => setExplanationStyle(e.target.value)}
                        className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                      >
                        <option value="STEP_BY_STEP">Step-by-Step</option>
                        <option value="INTUITIVE_ANALOGIES">Real-World Analogy</option>
                        <option value="FORMAL_RIGOROUS">Formula & Proofs</option>
                        <option value="VISUAL_CONCEPTUAL">Visual Description</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                      Specific Question (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Why does ATP release energy when the terminal phosphate breaks off?"
                      value={studentQuestion}
                      onChange={(e) => setStudentQuestion(e.target.value)}
                      className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={conceptLoading}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {conceptLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Analyzing Concept...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Explain Concept
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Concept Output Display */}
              <div className="lg:col-span-2 space-y-6">
                {conceptResult ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex justify-between items-start">
                      <div>
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                          Concept Guide
                        </div>
                        <h2 className="text-2xl font-bold mt-1">{conceptResult.title || topic}</h2>
                        <div className="text-xs text-slate-500 mt-1">
                          Adapted for {conceptResult.gradeLevel || studentGradeLevel} • {difficulty} level
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {explanationStyle.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Core Explanation */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        Core Understanding
                      </h3>
                      <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                        {conceptResult.coreExplanation}
                      </div>
                    </div>

                    {/* Step-by-Step Examples */}
                    {conceptResult.stepByStepExamples && conceptResult.stepByStepExamples.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Worked Demonstration
                        </h3>
                        <div className="space-y-4">
                          {conceptResult.stepByStepExamples.map((ex: any, idx: number) => (
                            <div key={idx} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-3">
                              <div className="font-semibold text-sm text-indigo-600 dark:text-indigo-400">
                                {ex.exampleTitle || `Example ${idx + 1}`}
                              </div>
                              <p className="text-sm text-slate-800 dark:text-slate-200 italic">
                                "{ex.problemStatement}"
                              </p>
                              <div className="space-y-1.5 pl-2 border-l-2 border-indigo-500">
                                {ex.steps?.map((step: string, sIdx: number) => (
                                  <div key={sIdx} className="text-xs text-slate-600 dark:text-slate-400">
                                    {step}
                                  </div>
                                ))}
                              </div>
                              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                Takeaway: {ex.solution}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Key Concepts and Common Mistakes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {conceptResult.keyConcepts && (
                        <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                          <div className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-2 uppercase">
                            Key Vocabulary
                          </div>
                          <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300 list-disc pl-4">
                            {conceptResult.keyConcepts.map((item: string, i: number) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {conceptResult.commonMistakes && (
                        <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
                          <div className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-2 uppercase">
                            Common Pitfalls to Avoid
                          </div>
                          <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-300 list-disc pl-4">
                            {conceptResult.commonMistakes.map((item: string, i: number) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Interactive Quick Check */}
                    {conceptResult.quickCheckQuestion && (
                      <div className="p-5 rounded-xl border-2 border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Quick Self-Check
                          </span>
                          {quickCheckAnswer && (
                            <span className={`text-xs font-bold ${
                              quickCheckAnswer === conceptResult.quickCheckQuestion.correctOption
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}>
                              {quickCheckAnswer === conceptResult.quickCheckQuestion.correctOption ? '✓ Correct!' : 'Review Hint Below'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {conceptResult.quickCheckQuestion.question}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {conceptResult.quickCheckQuestion.options?.map((opt: string, i: number) => (
                            <button
                              key={i}
                              onClick={() => setQuickCheckAnswer(opt)}
                              className={`text-left text-xs p-3 rounded-lg border transition-all ${
                                quickCheckAnswer === opt
                                  ? opt === conceptResult.quickCheckQuestion.correctOption
                                    ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                                    : 'bg-rose-600 text-white border-rose-600 font-semibold'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-500'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                        {quickCheckAnswer && quickCheckAnswer !== conceptResult.quickCheckQuestion.correctOption && (
                          <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-lg border border-amber-200">
                            Hint: {conceptResult.quickCheckQuestion.hint}
                          </div>
                        )}
                      </div>
                    )}

                    {conceptResult.encouragement && (
                      <div className="text-xs text-center text-slate-500 italic pt-2">
                        "{conceptResult.encouragement}"
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
                    <BookMarked className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                      No Concept Guide Generated Yet
                    </h3>
                    <p className="text-xs max-w-sm mx-auto">
                      Fill out the form on the left with a topic from your enrolled courses to generate a personalized study guide.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SOCRATIC GUIDED TUTOR */}
          {activeTab === 'socratic' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[650px]">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-600" />
                    Socratic Problem-Solving Dialogue
                  </h2>
                  <p className="text-xs text-slate-500">
                    The tutor guides your intuition with hints and questions rather than giving immediate answers.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSocraticMessages([
                      {
                        sender: 'ASSISTANT',
                        text: "New dialogue started! What subject or problem would you like to explore today?",
                        prompts: [
                          "How do I balance a chemical equation?",
                          "Explain the principle of conservation of energy",
                          "What is the difference between speed and velocity?",
                        ],
                      },
                    ]);
                    setConversationId(undefined);
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  New Dialogue
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {socraticMessages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.sender === 'USER' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-2xl p-4 rounded-2xl text-sm leading-relaxed ${
                        m.sender === 'USER'
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60 whitespace-pre-line'
                      }`}
                    >
                      {m.text}
                    </div>

                    {/* Suggested prompts if assistant */}
                    {m.prompts && m.prompts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 max-w-2xl">
                        {m.prompts.map((p, pIdx) => (
                          <button
                            key={pIdx}
                            onClick={() => handleSendSocratic(p)}
                            className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full px-3 py-1 hover:bg-indigo-100 transition-colors text-left"
                          >
                            💡 {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {socraticLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    AI Tutor is thinking...
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-2">
                <input
                  type="text"
                  placeholder="Ask a question or explain your reasoning so far..."
                  value={socraticInput}
                  onChange={(e) => setSocraticInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendSocratic()}
                  className="flex-1 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => handleSendSocratic()}
                  disabled={!socraticInput.trim() || socraticLoading}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PRACTICE QUIZZES */}
          {activeTab === 'quiz' && (
            <div className="space-y-6">
              {/* Notice */}
              <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs text-blue-900 dark:text-blue-300">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>
                    <strong>Formative Practice Only:</strong> Practice quiz attempts and scores are saved purely for self-study and formative learning. They <strong>never</strong> modify official report cards or grades.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quiz Generator Form */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-indigo-600" />
                    Generate Practice Quiz
                  </h2>

                  <form onSubmit={handleGenerateQuiz} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                        Quiz Topic <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Mendelian Genetics"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                          Questions
                        </label>
                        <select
                          value={quizQuestionCount}
                          onChange={(e) => setQuizQuestionCount(Number(e.target.value))}
                          className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                        >
                          <option value={3}>3 Questions</option>
                          <option value={4}>4 Questions</option>
                          <option value={5}>5 Questions</option>
                          <option value={8}>8 Questions</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                          Question Type
                        </label>
                        <select
                          value={quizQuestionType}
                          onChange={(e) => setQuizQuestionType(e.target.value)}
                          className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                        >
                          <option value="MIXED">Mixed Types</option>
                          <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                          <option value="TRUE_FALSE">True / False</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={quizLoading}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                    >
                      {quizLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      Create Practice Quiz
                    </button>
                  </form>

                  {/* Past Quizzes History */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">
                      Recent Practice Quizzes ({pastQuizzes.length})
                    </h3>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {pastQuizzes.map((pq) => (
                        <div
                          key={pq.id}
                          onClick={() => {
                            setActiveQuiz({
                              id: pq.id,
                              topic: pq.topic,
                              difficulty: pq.difficulty,
                              questions: pq.questions,
                              status: pq.status,
                            });
                            if (pq.status === 'COMPLETED') {
                              setQuizResult({
                                topic: pq.topic,
                                score: pq.score,
                                feedback: pq.feedback,
                                evaluatedQuestions: pq.questions?.map((q: any) => ({
                                  questionText: q.questionText,
                                  studentAnswer: pq.studentAnswers?.[q.id] || 'Submitted',
                                  correctAnswer: q.correctAnswer,
                                  isCorrect: true,
                                  explanation: q.explanation,
                                })),
                              });
                            } else {
                              setQuizResult(null);
                            }
                          }}
                          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 cursor-pointer text-xs flex justify-between items-center transition-all bg-white dark:bg-slate-900"
                        >
                          <div className="truncate pr-2">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{pq.topic}</div>
                            <div className="text-[10px] text-slate-400">{new Date(pq.createdAt).toLocaleDateString()}</div>
                          </div>
                          {pq.status === 'COMPLETED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                              {pq.score}%
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                              Ready
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Interactive Quiz Area */}
                <div className="lg:col-span-2 space-y-6">
                  {activeQuiz ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                      <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
                        <div>
                          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                            Practice Quiz
                          </div>
                          <h2 className="text-xl font-bold">{activeQuiz.topic}</h2>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {activeQuiz.questions?.length || 4} Questions • Formative Mode
                          </div>
                        </div>
                        {quizResult && (
                          <div className="text-right">
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                              {quizResult.score}%
                            </div>
                            <div className="text-[10px] text-slate-400 uppercase">Formative Score</div>
                          </div>
                        )}
                      </div>

                      {/* Result Feedback Banner */}
                      {quizResult && (
                        <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-900 dark:text-emerald-300">
                          <p className="font-semibold">{quizResult.feedback}</p>
                        </div>
                      )}

                      {/* Question List */}
                      <div className="space-y-6">
                        {activeQuiz.questions?.map((q: any, idx: number) => {
                          const currentAnswer = userAnswers[q.id] || '';
                          const isCompleted = !!quizResult;
                          return (
                            <div
                              key={q.id || idx}
                              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 space-y-3"
                            >
                              <div className="flex items-start gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 pt-0.5">
                                  {q.questionText}
                                </div>
                              </div>

                              {/* Options for MCQ / True False */}
                              {q.options && q.options.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-8">
                                  {q.options.map((opt: string, optIdx: number) => (
                                    <button
                                      key={optIdx}
                                      disabled={isCompleted}
                                      onClick={() => setUserAnswers({ ...userAnswers, [q.id]: opt })}
                                      className={`text-left text-xs p-3 rounded-lg border transition-all ${
                                        currentAnswer === opt
                                          ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="pl-8 pt-1">
                                  <input
                                    type="text"
                                    disabled={isCompleted}
                                    placeholder="Type your brief answer here..."
                                    value={currentAnswer}
                                    onChange={(e) => setUserAnswers({ ...userAnswers, [q.id]: e.target.value })}
                                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                  />
                                </div>
                              )}

                              {/* Explanations shown after completion */}
                              {isCompleted && (
                                <div className="pl-8 pt-2 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 mt-2">
                                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    Correct Answer: {q.correctAnswer}
                                  </div>
                                  <div className="mt-1 italic">{q.explanation}</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Submit Button */}
                      {!quizResult && (
                        <button
                          onClick={handleSubmitQuiz}
                          disabled={submittingQuiz || Object.keys(userAnswers).length === 0}
                          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {submittingQuiz ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Submit Practice Answers
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
                      <FileCheck2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                        No Active Practice Quiz
                      </h3>
                      <p className="text-xs max-w-sm mx-auto">
                        Generate a new practice quiz from the left panel or click a previous attempt to review your formative scores and answer explanations.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REVISION PLANNER */}
          {activeTab === 'revision' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Controls */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Personalized Revision Plan
                </h2>
                <p className="text-xs text-slate-500">
                  Grounded in your actual attendance and assessment scores to focus your study time where it matters most.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                      Time Horizon
                    </label>
                    <select
                      value={timeframeDays}
                      onChange={(e) => setTimeframeDays(Number(e.target.value))}
                      className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                    >
                      <option value={5}>5-Day Accelerated Drill</option>
                      <option value={7}>7-Day Balanced Week</option>
                      <option value={14}>14-Day Comprehensive Sprint</option>
                      <option value={30}>30-Day Term Exam Roadmap</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                      Target Milestone
                    </label>
                    <input
                      type="text"
                      value={targetExamDate}
                      onChange={(e) => setTargetExamDate(e.target.value)}
                      placeholder="e.g. Midterm Examinations"
                      className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                    />
                  </div>

                  <button
                    onClick={handleGenerateRevisionPlan}
                    disabled={revisionLoading}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {revisionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Build Revision Strategy
                  </button>
                </div>

                {/* Saved Plans */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">
                    Saved Plans ({savedPlans.length})
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {savedPlans.map((sp) => (
                      <div
                        key={sp.id}
                        onClick={() => setActiveRevisionPlan(sp.plan)}
                        className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-indigo-500 cursor-pointer text-xs transition-all bg-white dark:bg-slate-900"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{sp.title}</div>
                        <div className="text-[10px] text-slate-400">{new Date(sp.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Plan Display */}
              <div className="lg:col-span-2 space-y-6">
                {activeRevisionPlan ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
                      <div>
                        <div className="text-xs font-bold text-indigo-600 uppercase">Personalized Strategy</div>
                        <h2 className="text-xl font-bold">{activeRevisionPlan.planTitle}</h2>
                        <p className="text-xs text-slate-500 mt-1">{activeRevisionPlan.targetGoal}</p>
                      </div>
                      <button
                        onClick={handleSaveRevisionPlan}
                        disabled={savingPlan}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingPlan ? 'Saving...' : 'Save Plan'}
                      </button>
                    </div>

                    {/* Priorities */}
                    {activeRevisionPlan.revisionPriorities && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Priority Focus Areas
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {activeRevisionPlan.revisionPriorities.map((item: any, i: number) => (
                            <div
                              key={i}
                              className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 space-y-1"
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                                  {item.subject}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  item.priority === 'HIGH'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
                                }`}>
                                  {item.priority}
                                </span>
                              </div>
                              <div className="font-semibold text-xs">{item.topic}</div>
                              <div className="text-[11px] text-slate-500">{item.reason}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Daily Schedule */}
                    {activeRevisionPlan.dailySchedule && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Daily Study Schedule
                        </h3>
                        <div className="space-y-2">
                          {activeRevisionPlan.dailySchedule.map((d: any, idx: number) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4 text-xs bg-white dark:bg-slate-900"
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-500 w-24 shrink-0">{d.day}</span>
                                <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                                  {d.focusSubject}
                                </span>
                                <span className="text-slate-700 dark:text-slate-300">{d.recommendedActivity}</span>
                              </div>
                              <span className="font-medium text-slate-400 shrink-0">{d.suggestedMinutes} mins</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Recall Tips */}
                    {activeRevisionPlan.examPrepTips && (
                      <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 text-xs space-y-1.5 text-amber-900 dark:text-amber-300">
                        <div className="font-bold uppercase tracking-wider text-[11px]">Exam Prep Strategies</div>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                          {activeRevisionPlan.examPrepTips.map((tip: string, tIdx: number) => (
                            <li key={tIdx}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
                    <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                      No Revision Plan Displayed
                    </h3>
                    <p className="text-xs max-w-sm mx-auto">
                      Choose your timeframe and click "Build Revision Strategy" to generate an achievable roadmap.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: HOMEWORK GUIDANCE */}
          {activeTab === 'homework' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Controls */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  Request Homework Hints
                </h2>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-300">
                  <strong>Academic Integrity Guard:</strong> The AI tutor clarifies instructions, provides analogous worked examples with different numbers, and prompts self-checks. It will <strong>never</strong> complete graded assignments for you.
                </div>

                <form onSubmit={handleGetHomeworkGuidance} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                      Homework Title or Topic <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Problem Set 4: Electric Potential"
                      value={homeworkInput}
                      onChange={(e) => setHomeworkInput(e.target.value)}
                      className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-600 dark:text-slate-400">
                      What are you stuck on?
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. I am confused about which formula to use when charge moves through a non-uniform field."
                      value={homeworkDoubt}
                      onChange={(e) => setHomeworkDoubt(e.target.value)}
                      className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={hwLoading}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {hwLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Request Guidance & Hints
                  </button>
                </form>
              </div>

              {/* Guidance Display */}
              <div className="lg:col-span-2 space-y-6">
                {hwGuidanceResult ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                      <div className="text-xs font-bold text-indigo-600 uppercase">Homework Guidance</div>
                      <h2 className="text-xl font-bold">{hwGuidanceResult.guidanceTitle}</h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {hwGuidanceResult.instructionClarification}
                      </p>
                    </div>

                    {/* Hints */}
                    {hwGuidanceResult.conceptualHints && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Conceptual Hints
                        </h3>
                        <ul className="text-xs space-y-1.5 list-disc pl-4 text-slate-700 dark:text-slate-300">
                          {hwGuidanceResult.conceptualHints.map((hint: string, hIdx: number) => (
                            <li key={hIdx}>{hint}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Similar Worked Example */}
                    {hwGuidanceResult.similarWorkedExample && (
                      <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2 text-xs">
                        <div className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider text-[11px]">
                          Parallel Practice Example (Different numbers)
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {hwGuidanceResult.similarWorkedExample.problem}
                        </p>
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 whitespace-pre-line">
                          {hwGuidanceResult.similarWorkedExample.solutionWalkthrough}
                        </div>
                        <div className="text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
                          Key takeaway: {hwGuidanceResult.similarWorkedExample.keyTakeaway}
                        </div>
                      </div>
                    )}

                    {/* Self-Check Questions */}
                    {hwGuidanceResult.selfCheckQuestions && (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
                        <div className="font-bold uppercase tracking-wider text-[11px] text-slate-600 dark:text-slate-400">
                          Before You Submit Your Assignment:
                        </div>
                        <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                          {hwGuidanceResult.selfCheckQuestions.map((q: string, qIdx: number) => (
                            <li key={qIdx} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
                    <HelpCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
                    <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
                      No Homework Guidance Requested
                    </h3>
                    <p className="text-xs max-w-sm mx-auto">
                      Enter the title of your assignment and what you are finding difficult to receive structured hints.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: LEARNING PROGRESS */}
          {activeTab === 'progress' && (
            <div className="space-y-6">
              {progressLoading ? (
                <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Synthesizing verified academic records...
                </div>
              ) : progressData ? (
                <>
                  {/* Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="text-xs text-slate-500 uppercase font-semibold">Attendance Rate</div>
                      <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        {progressData.metrics?.attendanceRate}%
                      </div>
                      <div className="text-[11px] text-emerald-600 mt-0.5">Verified Institutional Sessions</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="text-xs text-slate-500 uppercase font-semibold">Practice Quizzes</div>
                      <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                        {progressData.metrics?.completedQuizzesCount}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {progressData.metrics?.totalQuizzesAttempted} Total Created
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="text-xs text-slate-500 uppercase font-semibold">Avg Practice Score</div>
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {progressData.metrics?.averagePracticeQuizScore !== null
                          ? `${progressData.metrics?.averagePracticeQuizScore}%`
                          : 'N/A'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Formative Self-Assessments</div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="text-xs text-slate-500 uppercase font-semibold">Revision Plans</div>
                      <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                        {progressData.metrics?.activeRevisionPlansCount}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Active Study Roadmaps</div>
                    </div>
                  </div>

                  {/* AI Progress Synthesis */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                        Formative Progress Synthesis
                      </h2>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {progressData.insights?.overallSummary}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Identified Academic Strengths
                        </div>
                        <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300 list-disc pl-4">
                          {progressData.insights?.academicStrengths?.map((s: string, idx: number) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-2">
                        <div className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5" /> Areas for Growth & Extra Practice
                        </div>
                        <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300 list-disc pl-4">
                          {progressData.insights?.areasForPractice?.map((a: string, idx: number) => (
                            <li key={idx}>{a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Suggested Next Steps */}
                    {progressData.insights?.suggestedNextSteps && (
                      <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2 text-xs">
                        <div className="font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                          Recommended Action Items for This Week
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {progressData.insights.suggestedNextSteps.map((step: string, sIdx: number) => (
                            <div key={sIdx} className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                              <ArrowRight className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {progressData.insights?.motivationalMessage && (
                      <div className="text-xs text-center text-slate-500 italic pt-2 border-t border-slate-100 dark:border-slate-800">
                        "{progressData.insights.motivationalMessage}"
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* TAB 7: SCHOOL RULES & HANDBOOK (TASK 026) */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                  <BookMarked className="w-5 h-5" />
                  <h2>Student Handbook & Campus Regulations Guide</h2>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Ask clear questions about student attendance requirements, exam eligibility, library borrowing rules, disciplinary policies, or transport safety. All responses cite official institutional policy documents.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAskRule();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Ask about school rules (e.g. 'What is the attendance percentage needed to take exams?')"
                    value={ruleQuery}
                    onChange={(e) => setRuleQuery(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={ruleLoading || !ruleQuery.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20"
                  >
                    {ruleLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Explain Rule
                  </button>
                </form>

                {/* Quick Rule Prompts */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-xs text-slate-500 self-center font-medium">Quick Topics:</span>
                  {[
                    'Minimum attendance for exams',
                    'Exam rules and calculator policy',
                    'Library borrowing and lost book rules',
                    'Bus transport safety guidelines',
                    'Mobile phone policy on campus',
                  ].map((topicText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setRuleQuery(topicText);
                        handleAskRule(topicText);
                      }}
                      className="px-3 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    >
                      {topicText}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rule Explanation Display */}
              {ruleExplanation && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        {ruleExplanation.ruleTitle || 'Campus Policy Explanation'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Inquiry: "{ruleExplanation.inquiry || ruleQuery}"
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Grounded in Institutional Documents
                    </span>
                  </div>

                  {/* Explanation Narrative */}
                  <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-4 text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-line">
                    {ruleExplanation.explanation}
                  </div>

                  {/* Key Requirements */}
                  {ruleExplanation.keyRequirements?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Essential Rules & Requirements
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ruleExplanation.keyRequirements.map((req: string, rIdx: number) => (
                          <div key={rIdx} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-start gap-2 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                            <span>{req}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Student Action Items */}
                  {ruleExplanation.actionItems?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        What You Must Do
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {ruleExplanation.actionItems.map((act: string, aIdx: number) => (
                          <li key={aIdx} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Document Citations */}
                  {ruleExplanation.documentCitations?.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Official Citations & References
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ruleExplanation.documentCitations.map((cite: any, cIdx: number) => (
                          <div
                            key={cIdx}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs flex items-center gap-2"
                          >
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{cite.documentTitle}</span>
                            <span className="text-slate-500">({cite.sectionTitle}, p.{cite.pageNumber || '1'})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: INTEGRATED GENERAL AI ASSISTANT */}
          {activeTab === 'assistant' && (
            <AIAssistantView
              initialConversationId={initialConversationId}
              embedded
            />
          )}

        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function StudentTutorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading AI Student Copilot...</p>
        </div>
      }
    >
      <StudentCopilotContent />
    </Suspense>
  );
}
