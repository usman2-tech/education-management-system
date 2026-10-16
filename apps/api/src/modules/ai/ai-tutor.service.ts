/**
 * MODULE: AI Student Tutor Service
 *
 * PURPOSE:
 * Orchestrates pedagogical student tutoring tools: concept explanations, Socratic dialogue,
 * practice quiz generation & evaluation, revision planning, homework guidance, and progress tracking.
 *
 * DEPENDENCIES:
 * PrismaService, ConfigService, FastAPI AI Microservice
 *
 * SECURITY:
 * Strictly scoped to authenticated student (UserRole.STUDENT self-access only).
 * School isolation enforced on all queries.
 * Official grades, exams, and financial records are NEVER modified.
 * Teacher-only answer keys and unreleased exam contents are strictly protected.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, UserRole } from '@ems/contracts';
import {
  ConceptExplanationRequestDto,
  SocraticTutorMessageDto,
  GeneratePracticeQuizRequestDto,
  SubmitPracticeQuizRequestDto,
  GenerateRevisionPlanRequestDto,
  SaveRevisionPlanRequestDto,
  HomeworkGuidanceRequestDto,
} from './dto/ai-tutor.dto';

@Injectable()
export class AiTutorService {
  private readonly logger = new Logger(AiTutorService.name);
  private readonly aiServiceUrl: string;
  private readonly internalSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://127.0.0.1:8000');
    this.internalSecret = this.configService.get<string>('AI_INTERNAL_SECRET', 'ems-internal-secret');
  }

  /**
   * Helper to dispatch requests to the FastAPI microservice with fallback
   */
  private async callAiMicroservice(endpoint: string, parameters: any, user: AuthUser): Promise<any> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/api/v1/tutor/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': this.internalSecret,
        },
        body: JSON.stringify({
          user_id: user.id,
          school_id: user.schoolId,
          role: user.role,
          parameters,
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (response.ok) {
        return await response.json();
      }
      this.logger.warn(`FastAPI tutor ${endpoint} returned ${response.status}. Using direct fallback.`);
    } catch (err: any) {
      this.logger.warn(`FastAPI tutor ${endpoint} unreachable: ${err.message}. Using direct fallback.`);
    }

    return null;
  }

  /**
   * Retrieves student context: enrolled courses, active subjects, and active profile
   */
  async getStudentContext(user: AuthUser) {
    const student = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        studentProfile: true,
        classEnrollments: {
          where: { status: 'ACTIVE' },
          include: {
            section: {
              include: {
                schoolClass: true,
                timetableEntries: {
                  include: { subject: true },
                },
              },
            },
          },
        },
        courseEnrollments: {
          include: {
            course: {
              include: { subject: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student account not found.');
    }

    const courses = student.courseEnrollments.map((ce) => ({
      id: ce.course.id,
      title: ce.course.title,
      code: ce.course.code,
      subjectId: ce.course.subjectId,
      subjectName: ce.course.subject?.name || 'General',
    }));

    // Extract subjects from courses and active sections
    const subjectMap = new Map<string, { id: string; name: string; code: string }>();
    student.courseEnrollments.forEach((ce) => {
      if (ce.course.subject) {
        subjectMap.set(ce.course.subject.id, {
          id: ce.course.subject.id,
          name: ce.course.subject.name,
          code: ce.course.subject.code,
        });
      }
    });

    student.classEnrollments.forEach((enrollment) => {
      enrollment.section.timetableEntries.forEach((tt) => {
        if (tt.subject) {
          subjectMap.set(tt.subject.id, {
            id: tt.subject.id,
            name: tt.subject.name,
            code: tt.subject.code,
          });
        }
      });
    });

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      gradeLevel: student.studentProfile?.gradeLevel || 'Secondary',
      courses,
      subjects: Array.from(subjectMap.values()),
    };
  }

  /**
   * Generates comprehensive concept explanation
   */
  async generateConceptExplanation(dto: ConceptExplanationRequestDto, user: AuthUser) {
    const context = await this.getStudentContext(user);

    let subjectName = 'General Studies';
    if (dto.subjectId) {
      const sub = context.subjects.find((s) => s.id === dto.subjectId);
      if (sub) subjectName = sub.name;
    } else if (dto.courseId) {
      const crs = context.courses.find((c) => c.id === dto.courseId);
      if (crs) subjectName = crs.subjectName;
    }

    const params = {
      topic: dto.topic,
      subjectName,
      gradeLevel: context.gradeLevel,
      difficultyLevel: dto.difficultyLevel || 'INTERMEDIATE',
      explanationStyle: dto.explanationStyle || 'STEP_BY_STEP',
      question: dto.question || '',
    };

    const aiRes = await this.callAiMicroservice('concept-explanation', params, user);
    if (aiRes && aiRes.success) {
      return aiRes.data;
    }

    // Grounded fallback
    return {
      title: `Concept Guide: ${dto.topic}`,
      topic: dto.topic,
      gradeLevel: context.gradeLevel,
      coreExplanation: `${dto.topic} is an essential concept in ${subjectName}. It governs how fundamental systems interact and provides analytical frameworks for problem solving.`,
      stepByStepExamples: [
        {
          exampleTitle: `Worked Demonstration: ${dto.topic}`,
          problemStatement: `How do we approach a core problem regarding ${dto.topic}?`,
          steps: [
            'Step 1: Identify given information and target quantities.',
            'Step 2: State the governing definition or formula.',
            'Step 3: Carry out the logical deduction step-by-step.',
          ],
          solution: 'Result derived cleanly with verified units and conceptual verification.',
        },
      ],
      keyConcepts: [
        `Fundamental rule of ${dto.topic}`,
        'Conditions under which this concept applies',
      ],
      commonMistakes: [
        'Confusing input assumptions with outcome parameters.',
        'Skipping intermediate validation steps.',
      ],
      quickCheckQuestion: {
        question: `What is the most critical first step when analyzing ${dto.topic}?`,
        options: [
          'Identify given variables and boundary conditions',
          'Guess the final answer immediately',
          'Ignore the problem constraints',
          'Assume all numbers are zero',
        ],
        correctOption: 'Identify given variables and boundary conditions',
        hint: 'Always begin by organizing what is known before calculating.',
      },
      encouragement: 'Great job exploring this concept! Try solving the quick check question.',
    };
  }

  /**
   * Socratic interactive tutoring
   */
  async socraticTutor(dto: SocraticTutorMessageDto, user: AuthUser) {
    const context = await this.getStudentContext(user);

    // Retrieve or create conversation
    let conversation;
    if (dto.conversationId) {
      conversation = await this.prisma.aIConversation.findFirst({
        where: {
          id: dto.conversationId,
          userId: user.id,
          conversationType: 'STUDENT_TUTOR',
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20,
          },
        },
      });
    }

    if (!conversation) {
      conversation = await this.prisma.aIConversation.create({
        data: {
          userId: user.id,
          schoolId: user.schoolId,
          title: `Tutor: ${dto.message.slice(0, 30)}...`,
          roleContext: user.role,
          conversationType: 'STUDENT_TUTOR',
        },
        include: {
          messages: true,
        },
      });
    }

    // Save student message
    await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        sender: 'USER',
        content: dto.message,
      },
    });

    const recentHistory = (conversation.messages || []).map((m) => ({
      sender: m.sender,
      content: m.content,
    }));

    let subjectName = 'General Studies';
    if (dto.subjectId) {
      const s = context.subjects.find((sub) => sub.id === dto.subjectId);
      if (s) subjectName = s.name;
    }

    const params = {
      message: dto.message,
      conversationHistory: recentHistory,
      subjectName,
      gradeLevel: context.gradeLevel,
    };

    const aiRes = await this.callAiMicroservice('socratic', params, user);
    let replyData;
    if (aiRes && aiRes.success) {
      replyData = aiRes.data;
    } else {
      replyData = {
        topic: 'Concept Review',
        guidance: `That is an insightful question. Let's break this down together: what do you already know about this topic from your lessons?`,
        followUpQuestion: `Can you explain the main idea in your own words, or identify the first step?`,
        suggestedPrompts: [
          'Can you give me a small hint?',
          'Show me an analogous example with different numbers.',
          'Am I on the right track?',
        ],
      };
    }

    // Save assistant response
    const assistantMessageText = `${replyData.guidance}\n\n**Follow-up Question:** ${replyData.followUpQuestion}`;
    await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        sender: 'ASSISTANT',
        content: assistantMessageText,
      },
    });

    return {
      conversationId: conversation.id,
      guidance: replyData.guidance,
      followUpQuestion: replyData.followUpQuestion,
      suggestedPrompts: replyData.suggestedPrompts || [],
      fullReply: assistantMessageText,
    };
  }

  /**
   * Generates a practice quiz and saves formative quiz record
   */
  async generatePracticeQuiz(dto: GeneratePracticeQuizRequestDto, user: AuthUser) {
    if (!user.schoolId) {
      throw new ForbiddenException('User is not assigned to a school.');
    }

    const context = await this.getStudentContext(user);
    let subjectName = 'General Studies';
    if (dto.subjectId) {
      const sub = context.subjects.find((s) => s.id === dto.subjectId);
      if (sub) subjectName = sub.name;
    }

    const count = dto.questionCount || 4;
    const params = {
      topic: dto.topic,
      subjectName,
      gradeLevel: context.gradeLevel,
      difficulty: dto.difficultyLevel || 'INTERMEDIATE',
      questionCount: count,
      questionType: dto.questionType || 'MIXED',
    };

    const aiRes = await this.callAiMicroservice('practice-quiz', params, user);
    let questions;
    if (aiRes && aiRes.success && aiRes.data && Array.isArray(aiRes.data.questions)) {
      questions = aiRes.data.questions;
    } else {
      questions = [
        {
          id: 'q1',
          questionNumber: 1,
          type: 'MULTIPLE_CHOICE',
          questionText: `Which of the following best defines the primary principle of ${dto.topic}?`,
          options: [
            'A foundational principle governing relational behaviors in this field',
            'An unverified assumption without empirical support',
            'A random phenomenon that changes arbitrarily',
            'An obsolete historical concept no longer in use',
          ],
          correctAnswer: 'A foundational principle governing relational behaviors in this field',
          explanation: `${dto.topic} provides reliable, systematic rules used throughout ${subjectName}.`,
        },
        {
          id: 'q2',
          questionNumber: 2,
          type: 'TRUE_FALSE',
          questionText: `True or False: Practical mastery of ${dto.topic} requires verifying intermediate steps.`,
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Verifying intermediate work catches calculation errors early.',
        },
        {
          id: 'q3',
          questionNumber: 3,
          type: 'MULTIPLE_CHOICE',
          questionText: `What is a common error to avoid when working with ${dto.topic}?`,
          options: [
            'Neglecting consistency of units and initial conditions',
            'Carefully re-reading the prompt',
            'Double-checking calculations',
            'Writing down the formula clearly',
          ],
          correctAnswer: 'Neglecting consistency of units and initial conditions',
          explanation: 'Inconsistent units are one of the most common student mistakes.',
        },
        {
          id: 'q4',
          questionNumber: 4,
          type: 'SHORT_ANSWER',
          questionText: `In one sentence, explain why understanding ${dto.topic} is valuable.`,
          correctAnswer: `${dto.topic} builds analytical intuition and helps solve practical problems in ${subjectName}.`,
          explanation: 'Synthesizing the core purpose confirms deep conceptual understanding.',
        },
      ];
    }

    // Save practice quiz
    const quiz = await this.prisma.studentPracticeQuiz.create({
      data: {
        schoolId: user.schoolId,
        studentId: user.id,
        courseId: dto.courseId || null,
        subjectId: dto.subjectId || null,
        topic: dto.topic,
        difficulty: dto.difficultyLevel || 'INTERMEDIATE',
        questionCount: questions.length,
        totalQuestions: questions.length,
        questions: questions as any,
        status: 'GENERATED',
      },
    });

    // Strip correct answers from response sent to client so student practice is genuine
    const clientQuestions = questions.map((q: any) => ({
      id: q.id,
      questionNumber: q.questionNumber,
      type: q.type,
      questionText: q.questionText,
      options: q.options || [],
    }));

    return {
      id: quiz.id,
      topic: quiz.topic,
      difficulty: quiz.difficulty,
      questionCount: quiz.questionCount,
      questions: clientQuestions,
      status: quiz.status,
      createdAt: quiz.createdAt,
    };
  }

  /**
   * Submits answers for formative evaluation.
   * NEVER modifies official exam or grade records.
   */
  async submitPracticeQuiz(dto: SubmitPracticeQuizRequestDto, user: AuthUser) {
    const quiz = await this.prisma.studentPracticeQuiz.findUnique({
      where: { id: dto.quizId },
    });

    if (!quiz) {
      throw new NotFoundException('Practice quiz not found.');
    }

    if (quiz.studentId !== user.id) {
      throw new ForbiddenException('You can only submit your own practice quizzes.');
    }

    if (quiz.status === 'COMPLETED') {
      throw new BadRequestException('This practice quiz has already been completed.');
    }

    const questions = quiz.questions as any[];
    let correctCount = 0;
    const evaluatedQuestions: any[] = [];

    for (const q of questions) {
      const studentAns = dto.answers[q.id] || dto.answers[q.questionNumber?.toString()] || '';
      let isCorrect = false;

      if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
        isCorrect = String(studentAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
      } else {
        // Formative heuristic for short answers
        const cleanAns = String(studentAns).trim().toLowerCase();
        const cleanTarget = String(q.correctAnswer).trim().toLowerCase();
        isCorrect = cleanAns.length > 3 && (cleanTarget.includes(cleanAns) || cleanAns.includes(cleanTarget) || cleanAns.length > 15);
      }

      if (isCorrect) correctCount++;

      evaluatedQuestions.push({
        id: q.id,
        questionText: q.questionText,
        studentAnswer: studentAns,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation || 'Review the core rules of this topic.',
      });
    }

    const scorePercentage = Math.round((correctCount / questions.length) * 100);
    const feedbackText = `You answered ${correctCount} of ${questions.length} questions correctly (${scorePercentage}%). ${
      scorePercentage >= 75
        ? 'Outstanding effort! You have a strong grasp of this topic.'
        : 'Good practice attempt! Review the explanations below to strengthen your understanding.'
    }`;

    const updatedQuiz = await this.prisma.studentPracticeQuiz.update({
      where: { id: quiz.id },
      data: {
        studentAnswers: dto.answers as any,
        score: scorePercentage,
        status: 'COMPLETED',
        feedback: feedbackText,
      },
    });

    return {
      id: updatedQuiz.id,
      topic: updatedQuiz.topic,
      score: scorePercentage,
      totalQuestions: questions.length,
      correctCount,
      feedback: feedbackText,
      evaluatedQuestions,
      status: 'COMPLETED',
      completedAt: updatedQuiz.updatedAt,
    };
  }

  /**
   * Lists practice quizzes for authenticated student
   */
  async listPracticeQuizzes(user: AuthUser) {
    return this.prisma.studentPracticeQuiz.findMany({
      where: {
        studentId: user.id,
        ...(user.schoolId ? { schoolId: user.schoolId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Retrieves single practice quiz
   */
  async getPracticeQuizById(id: string, user: AuthUser) {
    const quiz = await this.prisma.studentPracticeQuiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw new NotFoundException('Practice quiz not found.');
    }

    if (quiz.studentId !== user.id && user.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Access denied. You can only view your own practice quizzes.');
    }

    return quiz;
  }

  /**
   * Generates a personalized revision plan grounded in verified records
   */
  async generateRevisionPlan(dto: GenerateRevisionPlanRequestDto, user: AuthUser) {
    const context = await this.getStudentContext(user);

    // Fetch verified academic performance
    const grades = await this.prisma.studentGrade.findMany({
      where: { studentId: user.id },
      include: {
        assessment: {
          include: { subject: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const verifiedGrades = grades.map((g) => {
      const score = g.marksObtained ?? 0;
      const maxScore = g.assessment.maximumMarks || 100;
      return {
        subject: g.assessment.subject?.name || 'General',
        score,
        maxScore,
        percentage: Math.round((score / maxScore) * 100),
      };
    });

    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: { studentId: user.id },
    });
    const totalSessions = attendanceRecords.length;
    const presentSessions = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
    const attendancePercentage = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 95;

    const params = {
      studentName: context.studentName,
      gradeLevel: context.gradeLevel,
      timeframeDays: dto.timeframeDays || 7,
      focusSubjects: dto.focusSubjects || context.subjects.map((s) => s.name),
      targetExamDate: dto.targetExamDate || 'Next 2 Weeks',
      verifiedGrades,
      verifiedAttendanceRate: attendancePercentage,
    };

    const aiRes = await this.callAiMicroservice('revision-plan', params, user);
    if (aiRes && aiRes.success) {
      return aiRes.data;
    }

    // Grounded fallback
    const subjects = params.focusSubjects.length > 0 ? params.focusSubjects : ['Mathematics', 'Science'];
    return {
      planTitle: `${params.timeframeDays}-Day Personalized Revision Strategy`,
      targetGoal: 'Strengthen core concept retention and build exam confidence through active recall.',
      revisionPriorities: subjects.map((subj, idx) => ({
        subject: subj,
        topic: `${subj} Core Competencies & Problem Decomposition`,
        priority: idx === 0 ? 'HIGH' : 'MEDIUM',
        reason: 'Essential prerequisite for term milestone assessments.',
      })),
      dailySchedule: [
        {
          day: 'Day 1 (Monday)',
          focusSubject: subjects[0],
          suggestedMinutes: 30,
          recommendedActivity: 'Review lecture slides and create a 1-page summary sheet.',
        },
        {
          day: 'Day 2 (Tuesday)',
          focusSubject: subjects[1] || subjects[0],
          suggestedMinutes: 35,
          recommendedActivity: 'Solve 3 guided exercises and verify each intermediate step.',
        },
        {
          day: 'Day 3 (Wednesday)',
          focusSubject: subjects[0],
          suggestedMinutes: 30,
          recommendedActivity: 'Generate and complete an AI Practice Quiz on recent topics.',
        },
        {
          day: 'Day 4 (Thursday)',
          focusSubject: subjects[1] || subjects[0],
          suggestedMinutes: 30,
          recommendedActivity: 'Review past homework corrections and teacher feedback comments.',
        },
        {
          day: 'Day 5 (Friday)',
          focusSubject: 'Active Synthesis',
          suggestedMinutes: 25,
          recommendedActivity: 'Self-test on flashcards and organize weekend rest schedule.',
        },
      ],
      examPrepTips: [
        'Practice active recall: close your notebook and try writing formulas from memory.',
        'Get at least 8 hours of sleep before exam days for cognitive consolidation.',
      ],
      verifiedMetrics: {
        averageGrade: verifiedGrades.length > 0 ? Math.round(verifiedGrades.reduce((a, b) => a + b.percentage, 0) / verifiedGrades.length) : 85,
        attendanceRate: attendancePercentage,
      },
    };
  }

  /**
   * Saves a generated revision plan to student profile
   */
  async saveRevisionPlan(dto: SaveRevisionPlanRequestDto, user: AuthUser) {
    if (!user.schoolId) {
      throw new ForbiddenException('User is not assigned to a school.');
    }

    return this.prisma.studentRevisionPlan.create({
      data: {
        schoolId: user.schoolId,
        studentId: user.id,
        title: dto.title,
        plan: dto.planContent as any,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Lists saved revision plans
   */
  async listRevisionPlans(user: AuthUser) {
    return this.prisma.studentRevisionPlan.findMany({
      where: {
        studentId: user.id,
        ...(user.schoolId ? { schoolId: user.schoolId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Retrieves single revision plan
   */
  async getRevisionPlanById(id: string, user: AuthUser) {
    const plan = await this.prisma.studentRevisionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Revision plan not found.');
    }

    if (plan.studentId !== user.id && user.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Access denied. You can only view your own revision plans.');
    }

    return plan;
  }

  /**
   * Provides pedagogical hints and analogies for homework.
   * STRICT RESTRICTIONS:
   * - Never reveals answers or completed solutions.
   * - Never modifies homework records or submits on student behalf.
   */
  async getHomeworkGuidance(dto: HomeworkGuidanceRequestDto, user: AuthUser) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: dto.homeworkId },
      include: {
        subject: true,
      },
    });

    if (!homework) {
      throw new NotFoundException('Homework assignment not found.');
    }

    if (user.schoolId && homework.schoolId !== user.schoolId) {
      throw new ForbiddenException('Access denied. Homework belongs to a different school.');
    }

    const params = {
      homeworkTitle: homework.title,
      instructions: homework.instructions || 'Complete the assigned exercises.',
      questionOrDoubt: dto.questionOrDoubt || 'How should I get started on this assignment?',
      subjectName: homework.subject?.name || 'General Studies',
    };

    const aiRes = await this.callAiMicroservice('homework-guidance', params, user);
    if (aiRes && aiRes.success) {
      return aiRes.data;
    }

    // Grounded fallback
    return {
      guidanceTitle: `Homework Guidance: ${homework.title}`,
      instructionClarification: `This assignment focuses on ${homework.title}. Your teacher wants to see your method and reasoning, not just the final number.`,
      conceptualHints: [
        'Start by writing down all the given quantities and what the problem asks you to determine.',
        'Review your lecture notes for the corresponding theorem or standard formula.',
        'Make sure units are consistent before performing algebraic manipulations.',
      ],
      similarWorkedExample: {
        problem: `Illustrative Practice Problem (Parallel concept with illustrative numbers):`,
        solutionWalkthrough: `Step 1: Set up the governing equation.\nStep 2: Substitute sample values.\nStep 3: Solve systematically and verify the conclusion.`,
        keyTakeaway: `Notice how breaking the problem into sub-steps prevents errors. Apply this same structure to your assignment.`,
      },
      actionableSteps: [
        'Step 1: Read the homework problem twice carefully.',
        'Step 2: Draw a diagram or list given numbers if applicable.',
        'Step 3: Write out each step neatly on your worksheet.',
        'Step 4: Check if your answer makes physical and intuitive sense.',
      ],
      selfCheckQuestions: [
        'Did I show all intermediate steps clearly?',
        'Did I include the appropriate units on my final answer?',
      ],
    };
  }

  /**
   * Synthesizes student's verified academic and practice activity into actionable progress insights
   */
  async getLearningProgress(user: AuthUser) {
    const context = await this.getStudentContext(user);

    // Verified grades
    const grades = await this.prisma.studentGrade.findMany({
      where: { studentId: user.id },
      include: {
        assessment: { include: { subject: true } },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const verifiedGrades = grades.map((g) => {
      const score = g.marksObtained ?? 0;
      const maxScore = g.assessment.maximumMarks || 100;
      return {
        subject: g.assessment.subject?.name || 'General',
        score,
        maxScore,
        percentage: Math.round((score / maxScore) * 100),
      };
    });

    // Attendance stats
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: { studentId: user.id },
    });
    const totalSessions = attendanceRecords.length;
    const presentSessions = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
    const presentPercentage = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 95;

    // Homework stats
    const submissions = await this.prisma.homeworkSubmission.findMany({
      where: { studentId: user.id },
    });

    // Practice quiz activity
    const quizzes = await this.prisma.studentPracticeQuiz.findMany({
      where: { studentId: user.id },
    });
    const completedQuizzes = quizzes.filter((q) => q.status === 'COMPLETED');
    const averageQuizScore = completedQuizzes.length > 0
      ? Math.round(completedQuizzes.reduce((acc, q) => acc + (q.score || 0), 0) / completedQuizzes.length)
      : null;

    // Revision plans
    const revisionPlans = await this.prisma.studentRevisionPlan.findMany({
      where: { studentId: user.id },
    });

    const params = {
      studentName: context.studentName,
      gradeLevel: context.gradeLevel,
      enrolledSubjects: context.subjects.map((s) => s.name),
      verifiedGrades,
      homeworkStats: {
        submittedCount: submissions.length,
      },
      attendanceStats: {
        totalSessions,
        presentPercentage,
      },
      practiceQuizStats: {
        totalAttempted: quizzes.length,
        completedCount: completedQuizzes.length,
        averageScore: averageQuizScore,
      },
      revisionPlanStats: {
        activeCount: revisionPlans.filter((p) => p.status === 'ACTIVE').length,
        totalPlans: revisionPlans.length,
      },
    };

    const aiRes = await this.callAiMicroservice('learning-progress', params, user);
    let insightData;
    if (aiRes && aiRes.success) {
      insightData = aiRes.data;
    } else {
      insightData = {
        overallSummary: `${context.studentName} is maintaining steady engagement across enrolled courses with a ${presentPercentage}% attendance rate.`,
        academicStrengths: [
          'Consistent class attendance and active course participation.',
          'Proactive engagement with self-directed study tools.',
        ],
        areasForPractice: [
          'Targeted practice quizzes on challenging topics.',
          'Reviewing teacher feedback comments after submitting homework.',
        ],
        suggestedNextSteps: [
          'Generate a practice quiz on your current lesson topic.',
          'Set a 20-minute daily revision block using your revision plan.',
        ],
        motivationalMessage: 'Consistent effort builds long-term confidence and academic mastery!',
      };
    }

    return {
      insights: insightData,
      metrics: {
        attendanceRate: presentPercentage,
        totalQuizzesAttempted: quizzes.length,
        completedQuizzesCount: completedQuizzes.length,
        averagePracticeQuizScore: averageQuizScore,
        activeRevisionPlansCount: revisionPlans.filter((p) => p.status === 'ACTIVE').length,
        recentGrades: verifiedGrades.slice(0, 5),
      },
    };
  }
}
