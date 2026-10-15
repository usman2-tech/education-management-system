import { PrismaClient, UserRole } from '@prisma/client';
import { AICopilotContentType, AICopilotDraftStatus } from '@ems/contracts';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed-Copilot] Seeding realistic AI Teacher Copilot drafts...');

  const teacher = await prisma.user.findFirst({
    where: { email: 'teacher@stjude.ems.local', role: UserRole.TEACHER },
  });

  if (!teacher || !teacher.schoolId) {
    console.error('[Seed-Copilot] Teacher teacher@stjude.ems.local not found. Skipping.');
    return;
  }

  const schoolId = teacher.schoolId;

  // Find class section and subject
  const section = await prisma.classSection.findFirst({
    where: { schoolClass: { schoolId } },
    include: { schoolClass: true },
  });

  const mathSubject = await prisma.subject.findFirst({
    where: { schoolId, name: { contains: 'Math', mode: 'insensitive' } },
  }) || await prisma.subject.findFirst({ where: { schoolId } });

  const physicsSubject = await prisma.subject.findFirst({
    where: { schoolId, name: { contains: 'Physics', mode: 'insensitive' } },
  }) || mathSubject;

  const course = await prisma.course.findFirst({
    where: { schoolId },
  });

  const draftsData = [
    // 1. LESSON PLAN (DRAFT)
    {
      contentType: AICopilotContentType.LESSON_PLAN,
      title: 'Lesson Plan: Cellular Respiration & ATP Synthesis',
      status: AICopilotDraftStatus.DRAFT,
      classSectionId: section?.id || null,
      subjectId: physicsSubject?.id || null,
      courseId: course?.id || null,
      content: {
        title: 'Lesson Plan: Cellular Respiration & ATP Synthesis',
        topic: 'Cellular Respiration',
        durationMinutes: 45,
        difficultyLevel: 'INTERMEDIATE',
        learningObjectives: [
          'Differentiate between aerobic and anaerobic respiration pathways',
          'Map the biochemical stages of glycolysis, Krebs cycle, and electron transport',
          'Calculate theoretical ATP yields per glucose molecule',
        ],
        requiredMaterials: [
          'Biology Syllabus Handbook Chapter 5',
          'Mitochondrial Structure Diagram Sheets',
          'Interactive Cellular Respiration Animation Slides',
        ],
        sections: [
          { name: 'Introduction & Hook', durationMinutes: 5, description: 'Ask class how athletic sprinters generate quick energy vs marathon runners.' },
          { name: 'Direct Instruction', durationMinutes: 15, description: 'Step-by-step breakdown of glycolysis and mitochondrial membrane dynamics.' },
          { name: 'Guided Problem Solving', durationMinutes: 10, description: 'Pairs complete reaction stoichiometry for glucose breakdown.' },
          { name: 'Independent Practice', durationMinutes: 10, description: 'Individual exercise sheet tracing carbon atoms through the Krebs cycle.' },
          { name: 'Formative Assessment', durationMinutes: 5, description: 'Exit ticket on role of oxygen as terminal electron acceptor.' },
        ],
        homeworkSuggestions: 'Review Section 5.3 and complete Review Problems 1-4.',
        assessmentActivities: 'Exit ticket evaluation and guided diagram check.',
        teacherNotes: 'Address common misconception that plants only perform photosynthesis and not respiration.',
      },
      metadata: {
        topic: 'Cellular Respiration',
        durationMinutes: 45,
        difficultyLevel: 'INTERMEDIATE',
        tokensUsed: 195,
        modelName: 'gemini-3.8-flash',
      },
    },

    // 2. LESSON PLAN (APPROVED)
    {
      contentType: AICopilotContentType.LESSON_PLAN,
      title: 'Lesson Plan: Calculus Limits and Continuity Theorems',
      status: AICopilotDraftStatus.APPROVED,
      classSectionId: section?.id || null,
      subjectId: mathSubject?.id || null,
      courseId: course?.id || null,
      approvedAt: new Date(),
      content: {
        title: 'Lesson Plan: Calculus Limits and Continuity Theorems',
        topic: 'Calculus Limits',
        durationMinutes: 50,
        difficultyLevel: 'ADVANCED',
        learningObjectives: [
          'Define the epsilon-delta limit concept intuitively',
          'Evaluate indeterminate limits using algebraic conjugates and factoring',
          'Apply the Intermediate Value Theorem to polynomial functions',
        ],
        requiredMaterials: ['Graphing calculators', 'Theorem reference summary card'],
        sections: [
          { name: 'Warm-up Challenge', durationMinutes: 5, description: 'Graph rational function with removable discontinuity at x=2.' },
          { name: 'Interactive Modeling', durationMinutes: 20, description: 'Teacher demonstrates indeterminate 0/0 techniques.' },
          { name: 'Paired Problem Sets', durationMinutes: 15, description: 'Collaborative analysis of piecewise limit conditions.' },
          { name: 'Individual Check', durationMinutes: 10, description: 'Exit ticket evaluating 2 indeterminate limit problems.' },
        ],
        homeworkSuggestions: 'Problems 10 through 22 in Chapter 2 review set.',
        assessmentActivities: 'Classroom whiteboard responses and exit slip check.',
        teacherNotes: 'Pacing was smooth; students engaged with graphic demonstrations.',
      },
      metadata: {
        topic: 'Limits and Continuity',
        durationMinutes: 50,
        difficultyLevel: 'ADVANCED',
        tokensUsed: 220,
        modelName: 'gemini-3.8-flash',
      },
    },

    // 3. HOMEWORK (DRAFT)
    {
      contentType: AICopilotContentType.HOMEWORK,
      title: 'Homework: Quadratic Equations and Real-World Applications',
      status: AICopilotDraftStatus.DRAFT,
      classSectionId: section?.id || null,
      subjectId: mathSubject?.id || null,
      content: {
        title: 'Homework: Quadratic Equations and Real-World Applications',
        instructions: 'Solve each equation step-by-step. Show factoring, quadratic formula derivation, and check for extraneous roots.',
        estimatedTimeMinutes: 35,
        maxPoints: 100,
        questions: [
          {
            questionNumber: 1,
            questionText: 'Find the real solutions of 2x^2 - 7x + 3 = 0 using factoring.',
            points: 20,
            suggestedAnswer: 'Factor as (2x - 1)(x - 3) = 0. Roots: x = 1/2 or x = 3.',
            markingCriteria: '10 pts for correct factors, 10 pts for root solutions.',
          },
          {
            questionNumber: 2,
            questionText: 'Solve x^2 + 6x - 16 = 0 by completing the square.',
            points: 20,
            suggestedAnswer: '(x + 3)^2 = 25 -> x + 3 = +/- 5 -> x = 2 or x = -8.',
            markingCriteria: '10 pts for completion setup, 10 pts for solutions.',
          },
          {
            questionNumber: 3,
            questionText: 'Use the discriminant to determine the nature of roots for 3x^2 - 4x + 5 = 0.',
            points: 20,
            suggestedAnswer: 'Discriminant Delta = (-4)^2 - 4(3)(5) = 16 - 60 = -44 < 0. Two complex conjugate roots.',
            markingCriteria: '10 pts for discriminant formula, 10 pts for conclusion.',
          },
          {
            questionNumber: 4,
            questionText: 'A ball is thrown upward with height h(t) = -5t^2 + 20t. Find time to reach maximum height.',
            points: 20,
            suggestedAnswer: 'Vertex occurs at t = -b/(2a) = -20/(2 * -5) = 2 seconds.',
            markingCriteria: '10 pts for vertex formula, 10 pts for correct time.',
          },
          {
            questionNumber: 5,
            questionText: 'Explain why a quadratic equation cannot have three distinct real roots.',
            points: 20,
            suggestedAnswer: 'By the Fundamental Theorem of Algebra, a polynomial of degree n has exactly n complex roots.',
            markingCriteria: 'Full marks for citing Fundamental Theorem of Algebra and degree constraint.',
          },
        ],
        markingRubric: 'Each question evaluated on methodological accuracy and justification.',
        hiddenAnswerKey: 'Reserved for instructor grading portal.',
      },
      metadata: {
        topic: 'Quadratic Equations',
        questionCount: 5,
        difficultyLevel: 'MEDIUM',
        tokensUsed: 215,
        modelName: 'gemini-3.8-flash',
      },
    },

    // 4. HOMEWORK (PUBLISHED)
    {
      contentType: AICopilotContentType.HOMEWORK,
      title: 'Homework: Wave Optics & Double Slit Interference',
      status: AICopilotDraftStatus.PUBLISHED,
      classSectionId: section?.id || null,
      subjectId: physicsSubject?.id || null,
      approvedAt: new Date(),
      publishedAt: new Date(),
      content: {
        title: 'Homework: Wave Optics & Double Slit Interference',
        instructions: 'Analyze young double-slit interference fringe spacing and calculate optical wavelengths.',
        estimatedTimeMinutes: 30,
        maxPoints: 50,
        questions: [
          {
            questionNumber: 1,
            questionText: 'Light of wavelength 600 nm passes through two slits separated by 0.1 mm onto a screen 1.5 m away. Calculate fringe separation.',
            points: 25,
            suggestedAnswer: 'y = lambda * D / d = (600e-9 * 1.5) / (0.1e-3) = 9.0 mm.',
            markingCriteria: '15 pts formula, 10 pts unit conversion & result.',
          },
          {
            questionNumber: 2,
            questionText: 'What happens to the fringe pattern if the entire apparatus is immersed in water (n = 1.33)?',
            points: 25,
            suggestedAnswer: 'Wavelength decreases to lambda/n, causing fringe width to compress proportionally.',
            markingCriteria: '15 pts index formula, 10 pts conceptual deduction.',
          },
        ],
        markingRubric: 'Standard physical units required for full credit.',
      },
      metadata: {
        topic: 'Wave Optics',
        questionCount: 2,
        tokensUsed: 180,
        modelName: 'gemini-3.8-flash',
      },
    },

    // 5. EXAM (DRAFT)
    {
      contentType: AICopilotContentType.EXAM,
      title: 'Midterm Quiz: Classical Mechanics & Newton Laws',
      status: AICopilotDraftStatus.DRAFT,
      classSectionId: section?.id || null,
      subjectId: physicsSubject?.id || null,
      content: {
        title: 'Midterm Quiz: Classical Mechanics & Newton Laws',
        description: 'Covers Newton three laws of motion, momentum conservation, and free-body diagrams.',
        durationMinutes: 45,
        totalMarks: 50,
        passingMarks: 20,
        questions: [
          {
            order: 1,
            questionType: 'MULTIPLE_CHOICE',
            questionText: 'A constant net force acts on an object. Which quantity remains constant?',
            options: ['Velocity', 'Acceleration', 'Position', 'Momentum'],
            correctAnswer: 'Acceleration',
            marks: 10,
            explanation: 'By F=ma, constant force produces constant acceleration.',
          },
          {
            order: 2,
            questionType: 'MULTIPLE_CHOICE',
            questionText: 'If earth radius is doubled while keeping mass constant, surface gravitational acceleration g becomes:',
            options: ['g / 4', 'g / 2', '2g', '4g'],
            correctAnswer: 'g / 4',
            marks: 10,
            explanation: 'g = GM / r^2, so doubling r scales g by 1/4.',
          },
          {
            order: 3,
            questionType: 'TRUE_FALSE',
            questionText: 'Action and reaction forces cancel each other because they are equal and opposite.',
            options: ['True', 'False'],
            correctAnswer: 'False',
            marks: 10,
            explanation: 'They act on different bodies, so they cannot cancel each other.',
          },
          {
            order: 4,
            questionType: 'SHORT_ANSWER',
            questionText: 'State the law of conservation of linear momentum and write its mathematical equation.',
            options: null,
            correctAnswer: 'In an isolated system with no external net force, total linear momentum is conserved: sum(p_initial) = sum(p_final).',
            marks: 20,
            explanation: 'Evaluated on complete definition and conservation equation.',
          },
        ],
        rubric: 'Objective answers checked automatically; short answers evaluated on principles and formulas.',
      },
      metadata: {
        topic: 'Classical Mechanics',
        questionCount: 4,
        totalMarks: 50,
        tokensUsed: 235,
        modelName: 'gemini-3.8-flash',
      },
    },

    // 6. GRADING SUGGESTION (DRAFT)
    {
      contentType: AICopilotContentType.GRADING_SUGGESTION,
      title: 'Grading Suggestion: Student Submission on Algebraic Calculus',
      status: AICopilotDraftStatus.DRAFT,
      classSectionId: section?.id || null,
      subjectId: mathSubject?.id || null,
      content: {
        suggestedScore: 88,
        maxScore: 100,
        percentage: 88.0,
        rubricExplanation: 'The submission demonstrates solid computational proficiency. All algebraic expansions are executed correctly with clear working.',
        strengths: [
          'Clean, orderly step-by-step layout of solutions',
          'Accurate execution of polynomial factoring and root identification',
          'Clear conceptual justification for choice of method',
        ],
        areasForImprovement: [
          'Part 4 neglected to include dimensional units in final statement',
          'Could explain the geometric meaning of the vertex more thoroughly',
        ],
        constructiveFeedback: 'Outstanding mathematical derivation throughout. Be sure to always attach contextual units to applied word problem solutions.',
        suggestedNextSteps: 'Review Chapter 3 Section 4 on physical interpretation of parabolic vertices.',
        disclaimer: 'This evaluation is an AI-generated suggestion for faculty guidance. Teacher review is authoritative.',
      },
      metadata: {
        studentName: 'Liam Vance',
        tokensUsed: 165,
        modelName: 'gemini-3.8-flash',
      },
    },

    // 7. PERFORMANCE INSIGHTS (APPROVED)
    {
      contentType: AICopilotContentType.PERFORMANCE_INSIGHT,
      title: 'Performance Insights: Grade 10 - Section A (Mathematics)',
      status: AICopilotDraftStatus.APPROVED,
      classSectionId: section?.id || null,
      subjectId: mathSubject?.id || null,
      approvedAt: new Date(),
      content: {
        classSummary: 'Grade 10 - Section A maintains high academic engagement in Mathematics with an average score of 83.4% and homework completion of 91.2%.',
        averageGrade: 83.4,
        attendanceRate: 95.1,
        homeworkCompletionRate: 91.2,
        subjectTrends: [
          { subject: 'Algebraic Derivations', trend: 'IMPROVING', metric: '+5.4% improvement since term start' },
          { subject: 'Geometry Applications', trend: 'STABLE', metric: '81% cohort proficiency' },
        ],
        topicsNeedingRevision: [
          'Rationalizing denominators with complex binomials',
          'Solving multi-variable linear systems via matrix elimination',
        ],
        supportSuggestions: [
          {
            studentFocus: 'Students scoring below 70%',
            recommendation: 'Targeted 15-minute diagnostic tutorial on algebraic factoring prerequisites.',
          },
          {
            studentFocus: 'High-performing student cohort',
            recommendation: 'Introduce advanced quadratic optimization challenges to sustain momentum.',
          },
        ],
        suggestedInterventions: [
          'Open sessions with a 5-minute retrieval challenge on algebraic identity expansions.',
          'Introduce paired peer-review prior to assignment submission.',
        ],
        suggestedRevisionActivities: [
          'Interactive diagnostic whiteboard recap.',
          'Scaffolded worksheet targeting rationalization techniques.',
        ],
      },
      metadata: {
        verifiedMetrics: {
          averageGrade: 83.4,
          attendanceRate: 95.1,
          homeworkCompletionRate: 91.2,
          totalStudents: 28,
        },
        tokensUsed: 210,
        modelName: 'gemini-3.8-flash',
      },
    },

    // 8. TEACHING MATERIAL (DRAFT)
    {
      contentType: AICopilotContentType.TEACHING_MATERIAL,
      title: 'Study Guide: Organic Chemistry Functional Groups',
      status: AICopilotDraftStatus.DRAFT,
      classSectionId: section?.id || null,
      subjectId: physicsSubject?.id || null,
      content: {
        title: 'Study Guide: Organic Chemistry Functional Groups',
        materialType: 'STUDY_GUIDE',
        topic: 'Organic Chemistry',
        difficultyLevel: 'INTERMEDIATE',
        sections: [
          {
            heading: 'Fundamental Principles',
            content: 'Functional groups dictate chemical reactivity, physical boiling points, and polarity across organic compounds.',
          },
          {
            heading: 'Key Functional Groups Summary',
            content: 'Alkanes (single bonds), Alkenes (double bonds), Alcohols (-OH), Carboxylic Acids (-COOH), and Esters (-COO-).',
          },
          {
            heading: 'IUPAC Nomenclature Quick Reference',
            content: 'Prefixes dictate carbon count: Meth- (1), Eth- (2), Prop- (3), But- (4), Pent- (5), Hex- (6).',
          },
          {
            heading: 'Self-Check Practice Problems',
            content: '1. Draw the structural formula of propanoic acid.\n2. Why do alcohols exhibit higher boiling points than alkanes of similar molar mass?',
          },
        ],
        printableMarkdown: '# Study Guide: Organic Chemistry\n\n## Overview\nCore principles and functional families.\n\n## Review Questions\n1. Draw the structure of ethanol.\n2. Explain hydrogen bonding in alcohols.',
        suggestedActivities: [
          'Flashcard pair review matching formulas to nomenclature',
          'Molecular model building challenge',
        ],
      },
      metadata: {
        materialType: 'STUDY_GUIDE',
        topic: 'Organic Chemistry',
        tokensUsed: 190,
        modelName: 'gemini-3.8-flash',
      },
    },
  ];

  for (const draft of draftsData) {
    const existing = await prisma.aICopilotDraft.findFirst({
      where: {
        teacherId: teacher.id,
        title: draft.title,
      },
    });

    if (!existing) {
      await prisma.aICopilotDraft.create({
        data: {
          schoolId,
          teacherId: teacher.id,
          contentType: draft.contentType,
          title: draft.title,
          status: draft.status,
          content: draft.content,
          classSectionId: draft.classSectionId,
          subjectId: draft.subjectId,
          courseId: (draft as any).courseId || null,
          approvedAt: (draft as any).approvedAt || null,
          publishedAt: (draft as any).publishedAt || null,
          metadata: draft.metadata,
        },
      });
      console.log(`[Seed-Copilot] Created draft fixture: ${draft.title}`);
    } else {
      console.log(`[Seed-Copilot] Draft fixture already exists: ${draft.title}`);
    }
  }

  const count = await prisma.aICopilotDraft.count({ where: { teacherId: teacher.id } });
  console.log(`[Seed-Copilot] Complete! Total drafts in database for teacher: ${count}`);
}

main()
  .catch((e) => {
    console.error('[Seed-Copilot] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
