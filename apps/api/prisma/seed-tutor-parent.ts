import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed-Tutor-Parent] Seeding realistic AI Student Tutor and Parent Assistant fixtures...');

  // Find target student
  const student = await prisma.user.findFirst({
    where: { email: 'student@stjude.ems.local', role: UserRole.STUDENT },
  });

  if (!student || !student.schoolId) {
    console.error('[Seed-Tutor-Parent] Student student@stjude.ems.local not found. Skipping.');
    return;
  }

  const schoolId = student.schoolId;

  // Find subjects and courses
  const mathSubject = await prisma.subject.findFirst({
    where: { schoolId, name: { contains: 'Math', mode: 'insensitive' } },
  }) || await prisma.subject.findFirst({ where: { schoolId } });

  const course = await prisma.course.findFirst({
    where: { schoolId },
  });

  // -------------------------------------------------------------------------
  // 1. EIGHT STUDENT PRACTICE QUIZZES (4 COMPLETED, 4 GENERATED)
  // -------------------------------------------------------------------------
  const quizzesData = [
    {
      topic: 'Quadratic Equations & Parabolic Graphs',
      difficulty: 'INTERMEDIATE',
      questionCount: 4,
      totalQuestions: 4,
      status: 'COMPLETED',
      score: 100.0,
      feedback: 'Outstanding mastery! You answered all 4 questions correctly. Ready for advanced optimization problems.',
      questions: [
        {
          id: 'q1',
          questionNumber: 1,
          type: 'MULTIPLE_CHOICE',
          questionText: 'What is the discriminant formula for the quadratic equation ax^2 + bx + c = 0?',
          options: ['b^2 - 4ac', '2a / -b', 'b^2 + 4ac', 'sqrt(4ac - b^2)'],
          correctAnswer: 'b^2 - 4ac',
          explanation: 'The discriminant delta = b^2 - 4ac dictates the number and nature of real roots.',
        },
        {
          id: 'q2',
          questionNumber: 2,
          type: 'TRUE_FALSE',
          questionText: 'If the discriminant is negative, the parabola does not cross the x-axis in the real plane.',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Negative discriminant implies two complex conjugate roots with zero real x-intercepts.',
        },
        {
          id: 'q3',
          questionNumber: 3,
          type: 'MULTIPLE_CHOICE',
          questionText: 'What is the x-coordinate of the vertex of the parabola y = ax^2 + bx + c?',
          options: ['-b / (2a)', 'b / (2a)', '-c / a', 'sqrt(b / a)'],
          correctAnswer: '-b / (2a)',
          explanation: 'The axis of symmetry occurs at x = -b / (2a).',
        },
        {
          id: 'q4',
          questionNumber: 4,
          type: 'SHORT_ANSWER',
          questionText: 'What geometric shape represents the graph of any quadratic function?',
          correctAnswer: 'Parabola',
          explanation: 'All quadratic functions plot as symmetric U-shaped parabolas.',
        },
      ],
      studentAnswers: {
        q1: 'b^2 - 4ac',
        q2: 'True',
        q3: '-b / (2a)',
        q4: 'Parabola',
      },
    },
    {
      topic: 'Newtonian Dynamics & Free Body Diagrams',
      difficulty: 'INTERMEDIATE',
      questionCount: 4,
      totalQuestions: 4,
      status: 'COMPLETED',
      score: 75.0,
      feedback: 'Strong understanding of force vectors. Review friction decomposition on inclined planes.',
      questions: [
        {
          id: 'q1',
          questionNumber: 1,
          type: 'MULTIPLE_CHOICE',
          questionText: "Which law states that force equals mass multiplied by acceleration (F = ma)?",
          options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Law of Universal Gravitation"],
          correctAnswer: "Newton's Second Law",
          explanation: "Newton's second law quantifies the relationship between net external force and momentum change.",
        },
        {
          id: 'q2',
          questionNumber: 2,
          type: 'TRUE_FALSE',
          questionText: "An object moving at constant velocity has a net external force of zero.",
          options: ["True", "False"],
          correctAnswer: "True",
          explanation: "Zero acceleration implies zero net force according to the first law of inertia.",
        },
        {
          id: 'q3',
          questionNumber: 3,
          type: 'MULTIPLE_CHOICE',
          questionText: "What direction does the normal force always act relative to the contact surface?",
          options: ["Perpendicular", "Parallel", "Opposite to gravity", "In the direction of motion"],
          correctAnswer: "Perpendicular",
          explanation: "'Normal' in geometry denotes perpendicularity to the contact interface.",
        },
        {
          id: 'q4',
          questionNumber: 4,
          type: 'SHORT_ANSWER',
          questionText: "What is the SI unit of force?",
          correctAnswer: "Newton",
          explanation: "1 Newton (N) = 1 kg·m/s^2.",
        },
      ],
      studentAnswers: {
        q1: "Newton's Second Law",
        q2: "True",
        q3: "Opposite to gravity", // deliberate mistake for 75%
        q4: "Newton",
      },
    },
    {
      topic: 'Chemical Stoichiometry & Molar Mass',
      difficulty: 'INTERMEDIATE',
      questionCount: 4,
      totalQuestions: 4,
      status: 'COMPLETED',
      score: 50.0,
      feedback: 'Good start. Remember to balance the chemical equation before calculating mole ratios.',
      questions: [
        {
          id: 'q1',
          questionNumber: 1,
          type: 'MULTIPLE_CHOICE',
          questionText: 'What is Avogadro\'s number approximately equal to?',
          options: ['6.022 x 10^23', '3.1415 x 10^8', '9.81 x 10^3', '1.602 x 10^-19'],
          correctAnswer: '6.022 x 10^23',
          explanation: 'One mole of any substance comprises 6.022 x 10^23 elementary entities.',
        },
        {
          id: 'q2',
          questionNumber: 2,
          type: 'TRUE_FALSE',
          questionText: 'Mass is always conserved in ordinary chemical reactions.',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'The Law of Conservation of Mass states matter cannot be created or destroyed in chemical transformations.',
        },
        {
          id: 'q3',
          questionNumber: 3,
          type: 'MULTIPLE_CHOICE',
          questionText: 'What is the molar mass of Water (H2O) using atomic weights H=1, O=16?',
          options: ['18 g/mol', '17 g/mol', '16 g/mol', '32 g/mol'],
          correctAnswer: '18 g/mol',
          explanation: '2*(1) + 16 = 18 g/mol.',
        },
        {
          id: 'q4',
          questionNumber: 4,
          type: 'SHORT_ANSWER',
          questionText: 'What reactant is completely consumed first in a chemical reaction?',
          correctAnswer: 'Limiting Reactant',
          explanation: 'The limiting reagent determines the maximum product theoretical yield.',
        },
      ],
      studentAnswers: {
        q1: '6.022 x 10^23',
        q2: 'False', // mistake
        q3: '17 g/mol', // mistake
        q4: 'Limiting Reactant',
      },
    },
    {
      topic: 'Literary Devices & Narrative Perspectives',
      difficulty: 'INTERMEDIATE',
      questionCount: 4,
      totalQuestions: 4,
      status: 'COMPLETED',
      score: 100.0,
      feedback: 'Excellent critical literary analysis! Your answers show nuanced comprehension of narrator reliability.',
      questions: [
        {
          id: 'q1',
          questionNumber: 1,
          type: 'MULTIPLE_CHOICE',
          questionText: 'Which point of view uses pronouns like "I", "me", and "we"?',
          options: ['First Person', 'Second Person', 'Third Person Limited', 'Third Person Omniscient'],
          correctAnswer: 'First Person',
          explanation: 'First-person narration directly shares the protagonist or observer\'s internal monologue.',
        },
        {
          id: 'q2',
          questionNumber: 2,
          type: 'TRUE_FALSE',
          questionText: 'A metaphor asserts that one thing IS another without using "like" or "as".',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Similes use "like" or "as", whereas metaphors create direct figurative equations.',
        },
        {
          id: 'q3',
          questionNumber: 3,
          type: 'MULTIPLE_CHOICE',
          questionText: 'What literary device hints at narrative events yet to occur?',
          options: ['Foreshadowing', 'Flashback', 'Hyperbole', 'Alliteration'],
          correctAnswer: 'Foreshadowing',
          explanation: 'Foreshadowing plants clues that build dramatic tension for future climaxes.',
        },
        {
          id: 'q4',
          questionNumber: 4,
          type: 'SHORT_ANSWER',
          questionText: 'What term describes excessive exaggeration not meant to be taken literally?',
          correctAnswer: 'Hyperbole',
          explanation: 'Hyperbole uses exaggerated phrasing for rhetorical emphasis or humor.',
        },
      ],
      studentAnswers: {
        q1: 'First Person',
        q2: 'True',
        q3: 'Foreshadowing',
        q4: 'Hyperbole',
      },
    },
    {
      topic: 'Cell Division: Mitosis vs Meiosis',
      difficulty: 'INTERMEDIATE',
      questionCount: 4,
      totalQuestions: 4,
      status: 'GENERATED',
      score: null,
      feedback: null,
      questions: [
        {
          id: 'q1',
          questionNumber: 1,
          type: 'MULTIPLE_CHOICE',
          questionText: 'How many daughter cells are produced at the completion of meiosis?',
          options: ['4 genetically diverse haploid cells', '2 identical diploid cells', '1 zygote', '8 somatic cells'],
          correctAnswer: '4 genetically diverse haploid cells',
          explanation: 'Meiosis involves two consecutive nuclear divisions resulting in four haploid gametes.',
        },
        {
          id: 'q2',
          questionNumber: 2,
          type: 'TRUE_FALSE',
          questionText: 'Crossing over during Prophase I increases genetic diversity in gametes.',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Chiasmata allow homologous chromosomes to exchange genetic material.',
        },
        {
          id: 'q3',
          questionNumber: 3,
          type: 'MULTIPLE_CHOICE',
          questionText: 'In which mitotic phase do sister chromatids pull apart toward opposite spindle poles?',
          options: ['Anaphase', 'Metaphase', 'Telophase', 'Interphase'],
          correctAnswer: 'Anaphase',
          explanation: 'Anaphase is characterized by centromere cleavage and chromatid migration.',
        },
        {
          id: 'q4',
          questionNumber: 4,
          type: 'SHORT_ANSWER',
          questionText: 'What cellular structure organizes and segregates chromosomes during division?',
          correctAnswer: 'Spindle Fibers',
          explanation: 'Microtubule spindle fibers originate from centrosomes to direct chromosome alignment.',
        },
      ],
      studentAnswers: null,
    },
    {
      topic: 'Pythagorean Theorem & Trigonometric Ratios',
      difficulty: 'BEGINNER',
      questionCount: 4,
      totalQuestions: 4,
      status: 'GENERATED',
      score: null,
      feedback: null,
      questions: [
        {
          id: 'q1',
          questionNumber: 1,
          type: 'MULTIPLE_CHOICE',
          questionText: 'In a right-angled triangle, what is the ratio for the Sine of an acute angle?',
          options: ['Opposite / Hypotenuse', 'Adjacent / Hypotenuse', 'Opposite / Adjacent', 'Hypotenuse / Opposite'],
          correctAnswer: 'Opposite / Hypotenuse',
          explanation: 'SOH CAH TOA: Sine = Opposite over Hypotenuse.',
        },
        {
          id: 'q2',
          questionNumber: 2,
          type: 'TRUE_FALSE',
          questionText: 'A triangle with side lengths 3, 4, and 5 is a valid right triangle.',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: '3^2 + 4^2 = 9 + 16 = 25 = 5^2.',
        },
        {
          id: 'q3',
          questionNumber: 3,
          type: 'MULTIPLE_CHOICE',
          questionText: 'What is the sum of interior angles in any Euclidean triangle?',
          options: ['180 degrees', '360 degrees', '90 degrees', '270 degrees'],
          correctAnswer: '180 degrees',
          explanation: 'The fundamental Euclidean triangle angle sum is always 180 degrees.',
        },
        {
          id: 'q4',
          questionNumber: 4,
          type: 'SHORT_ANSWER',
          questionText: 'What is the longest side of a right-angled triangle opposite the 90-degree angle called?',
          correctAnswer: 'Hypotenuse',
          explanation: 'The hypotenuse is always the longest side in a right triangle.',
        },
      ],
      studentAnswers: null,
    },
    {
      topic: 'World War II: Global Alliances & Turning Points',
      difficulty: 'INTERMEDIATE',
      questionCount: 4,
      totalQuestions: 4,
      status: 'GENERATED',
      score: null,
      feedback: null,
      questions: [
        {
          id: 'q1',
          questionNumber: 1,
          type: 'MULTIPLE_CHOICE',
          questionText: 'Which major confrontation is widely recognized as the eastern European turning point in 1942-1943?',
          options: ['Battle of Stalingrad', 'Battle of Midway', 'Battle of the Bulge', 'Battle of Britain'],
          correctAnswer: 'Battle of Stalingrad',
          explanation: 'The Battle of Stalingrad halted Axis advances and marked the shift to Allied strategic offensive.',
        },
        {
          id: 'q2',
          questionNumber: 2,
          type: 'TRUE_FALSE',
          questionText: 'The D-Day Normandy landings took place on June 6, 1944.',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Operation Overlord commenced on June 6, 1944, across the beaches of Normandy.',
        },
        {
          id: 'q3',
          questionNumber: 3,
          type: 'MULTIPLE_CHOICE',
          questionText: 'Which international peacekeeping organization was founded following WWII in 1945?',
          options: ['United Nations', 'League of Nations', 'NATO', 'European Union'],
          correctAnswer: 'United Nations',
          explanation: 'The United Nations charter was signed in San Francisco in 1945.',
        },
        {
          id: 'q4',
          questionNumber: 4,
          type: 'SHORT_ANSWER',
          questionText: 'Which ocean theater saw the decisive carrier naval Battle of Midway in 1942?',
          correctAnswer: 'Pacific Ocean',
          explanation: 'The Battle of Midway permanently altered naval balance in the Pacific theater.',
        },
      ],
      studentAnswers: null,
    },
    {
      topic: 'Algorithms & Computational Complexity',
      difficulty: 'ADVANCED',
      questionCount: 4,
      totalQuestions: 4,
      status: 'GENERATED',
      score: null,
      feedback: null,
      questions: [
        {
          id: 'q1',
          questionNumber: 1,
          type: 'MULTIPLE_CHOICE',
          questionText: 'What is the average time complexity of Binary Search on a sorted array of length n?',
          options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(1)'],
          correctAnswer: 'O(log n)',
          explanation: 'Binary search halves the search space at each comparison, yielding logarithmic time.',
        },
        {
          id: 'q2',
          questionNumber: 2,
          type: 'TRUE_FALSE',
          questionText: 'Merge Sort guarantees O(n log n) worst-case time complexity.',
          options: ['True', 'False'],
          correctAnswer: 'True',
          explanation: 'Merge sort consistently divides into halves and merges in linear time regardless of initial ordering.',
        },
        {
          id: 'q3',
          questionNumber: 3,
          type: 'MULTIPLE_CHOICE',
          questionText: 'Which data structure operates on a Last-In, First-Out (LIFO) principle?',
          options: ['Stack', 'Queue', 'Array', 'Hash Map'],
          correctAnswer: 'Stack',
          explanation: 'Stacks push and pop elements from the top, adhering to LIFO.',
        },
        {
          id: 'q4',
          questionNumber: 4,
          type: 'SHORT_ANSWER',
          questionText: 'What algorithmic paradigm solves problems by breaking them into overlapping subproblems with memoization?',
          correctAnswer: 'Dynamic Programming',
          explanation: 'Dynamic programming optimizes recursion by caching solutions to overlapping subproblems.',
        },
      ],
      studentAnswers: null,
    },
  ];

  for (const q of quizzesData) {
    const existing = await prisma.studentPracticeQuiz.findFirst({
      where: { studentId: student.id, topic: q.topic },
    });

    if (!existing) {
      await prisma.studentPracticeQuiz.create({
        data: {
          schoolId,
          studentId: student.id,
          subjectId: mathSubject?.id,
          courseId: course?.id,
          topic: q.topic,
          difficulty: q.difficulty,
          questionCount: q.questionCount,
          totalQuestions: q.totalQuestions,
          status: q.status,
          score: q.score,
          feedback: q.feedback,
          questions: q.questions as any,
          studentAnswers: q.studentAnswers as any,
        },
      });
      console.log(`[Seed-Tutor-Parent] Created practice quiz: ${q.topic} (${q.status})`);
    }
  }

  // -------------------------------------------------------------------------
  // 2. EIGHT SAVED REVISION PLANS
  // -------------------------------------------------------------------------
  const revisionPlansData = [
    {
      title: '7-Day Mathematics & Calculus Mastery Plan',
      targetDate: new Date(Date.now() + 7 * 86400000),
      plan: {
        planTitle: '7-Day Mathematics & Calculus Mastery Plan',
        targetGoal: 'Consolidate polynomial derivatives, integral calculus basics, and algebraic graphs.',
        revisionPriorities: [
          { subject: 'Mathematics', topic: 'Differential Calculus & Chain Rule', priority: 'HIGH', reason: 'High weightage on upcoming midterm.' },
          { subject: 'Mathematics', topic: 'Quadratic Systems & Conic Sections', priority: 'MEDIUM', reason: 'Foundational prerequisite.' },
        ],
        dailySchedule: [
          { day: 'Day 1 (Mon)', focusSubject: 'Mathematics', suggestedMinutes: 35, recommendedActivity: 'Work through 5 textbook problems on the product rule.' },
          { day: 'Day 2 (Tue)', focusSubject: 'Mathematics', suggestedMinutes: 30, recommendedActivity: 'Take an AI practice quiz and review wrong answers.' },
          { day: 'Day 3 (Wed)', focusSubject: 'Mathematics', suggestedMinutes: 40, recommendedActivity: 'Derive key trig identities on a blank whiteboard from memory.' },
          { day: 'Day 4 (Thu)', focusSubject: 'Mathematics', suggestedMinutes: 30, recommendedActivity: 'Review graded homework corrections and annotate steps.' },
          { day: 'Day 5 (Fri)', focusSubject: 'Mathematics', suggestedMinutes: 25, recommendedActivity: 'Timed 15-minute mock quiz without formula sheets.' },
        ],
        examPrepTips: ['Verify units and signs on each intermediate step.', 'Sleep 8 hours before test days.'],
      },
      verifiedMetrics: { averageGrade: 88, attendanceRate: 98 },
    },
    {
      title: '14-Day Comprehensive Physics Mechanics Sprint',
      targetDate: new Date(Date.now() + 14 * 86400000),
      plan: {
        planTitle: '14-Day Comprehensive Physics Mechanics Sprint',
        targetGoal: 'Master vector decomposition, work-energy theorem, and rotational dynamics.',
        revisionPriorities: [
          { subject: 'Physics', topic: 'Work, Kinetic Energy & Conservation of Energy', priority: 'HIGH', reason: 'Core conceptual pillar.' },
          { subject: 'Physics', topic: 'Uniform Circular Motion & Centripetal Acceleration', priority: 'MEDIUM', reason: 'Frequently tested in free response.' },
        ],
        dailySchedule: [
          { day: 'Week 1 - Day 1', focusSubject: 'Physics', suggestedMinutes: 30, recommendedActivity: 'Draw free-body diagrams for 4 inclined plane scenarios.' },
          { day: 'Week 1 - Day 3', focusSubject: 'Physics', suggestedMinutes: 35, recommendedActivity: 'Calculate work done by variable forces using graphs.' },
          { day: 'Week 2 - Day 1', focusSubject: 'Physics', suggestedMinutes: 40, recommendedActivity: 'Solve 2 multi-stage collision conservation problems.' },
          { day: 'Week 2 - Day 4', focusSubject: 'Physics', suggestedMinutes: 30, recommendedActivity: 'Self-test on SI base dimensions and rotational analogs.' },
        ],
        examPrepTips: ['Always state positive coordinate conventions before writing sum of forces equations.'],
      },
      verifiedMetrics: { averageGrade: 82, attendanceRate: 94 },
    },
    {
      title: '5-Day Chemistry Periodic Trends & Bonding Focus',
      targetDate: new Date(Date.now() + 5 * 86400000),
      plan: {
        planTitle: '5-Day Chemistry Periodic Trends & Bonding Focus',
        targetGoal: 'Strengthen electronegativity trends, Lewis dot structures, and VSEPR geometry.',
        revisionPriorities: [
          { subject: 'Chemistry', topic: 'VSEPR Molecular Geometry & Polarity', priority: 'HIGH', reason: 'Key differentiator in lab quizzes.' },
        ],
        dailySchedule: [
          { day: 'Day 1', focusSubject: 'Chemistry', suggestedMinutes: 30, recommendedActivity: 'Sketch 6 molecular structures and predict bond angles.' },
          { day: 'Day 2', focusSubject: 'Chemistry', suggestedMinutes: 30, recommendedActivity: 'Memorize ionization energy exceptions in row 2 elements.' },
        ],
        examPrepTips: ['Count total valence electrons first before drawing lone pairs.'],
      },
      verifiedMetrics: { averageGrade: 85, attendanceRate: 96 },
    },
    {
      title: '10-Day Literature Essay & Close Reading Routine',
      targetDate: new Date(Date.now() + 10 * 86400000),
      plan: {
        planTitle: '10-Day Literature Essay & Close Reading Routine',
        targetGoal: 'Enhance thesis statement formulation, text evidence integration, and literary commentary.',
        revisionPriorities: [
          { subject: 'English Literature', topic: 'Thematic Character Arc Development', priority: 'HIGH', reason: 'Quarterly essay assignment.' },
        ],
        dailySchedule: [
          { day: 'Day 1', focusSubject: 'English Literature', suggestedMinutes: 30, recommendedActivity: 'Annotate two contrasting soliloquies from the class text.' },
          { day: 'Day 3', focusSubject: 'English Literature', suggestedMinutes: 35, recommendedActivity: 'Draft 3 alternative thesis statements for the prompt.' },
        ],
        examPrepTips: ['Ensure quotes are introduced and unpacked with at least two sentences of analysis.'],
      },
      verifiedMetrics: { averageGrade: 91, attendanceRate: 98 },
    },
    {
      title: '7-Day Biology Genetics & Punnett Square Drill',
      targetDate: new Date(Date.now() + 7 * 86400000),
      plan: {
        planTitle: '7-Day Biology Genetics & Punnett Square Drill',
        targetGoal: 'Understand Mendelian monohybrid/dihybrid crosses and sex-linked inheritance.',
        revisionPriorities: [
          { subject: 'Biology', topic: 'X-Linked Recessive Traits & Pedigree Analysis', priority: 'HIGH', reason: 'Challenging section on upcoming test.' },
        ],
        dailySchedule: [
          { day: 'Day 1', focusSubject: 'Biology', suggestedMinutes: 30, recommendedActivity: 'Solve 4 pedigree chart inheritance puzzles.' },
        ],
        examPrepTips: ['Track carrier females carefully using superscript notation.'],
      },
      verifiedMetrics: { averageGrade: 87, attendanceRate: 95 },
    },
    {
      title: '14-Day Computer Science OOP & Data Structures Review',
      targetDate: new Date(Date.now() + 14 * 86400000),
      plan: {
        planTitle: '14-Day Computer Science OOP & Data Structures Review',
        targetGoal: 'Master class hierarchies, polymorphism, recursive algorithms, and linked lists.',
        revisionPriorities: [
          { subject: 'Computer Science', topic: 'Recursion Base Cases & Call Stack Trace', priority: 'HIGH', reason: 'High complexity on lab evaluations.' },
        ],
        dailySchedule: [
          { day: 'Day 1', focusSubject: 'Computer Science', suggestedMinutes: 40, recommendedActivity: 'Trace recursive factorial and fibonacci calls on paper.' },
        ],
        examPrepTips: ['Always test edge cases: empty input, null pointer, single element.'],
      },
      verifiedMetrics: { averageGrade: 94, attendanceRate: 99 },
    },
    {
      title: '7-Day World History Document-Based Question (DBQ) Strategy',
      targetDate: new Date(Date.now() + 7 * 86400000),
      plan: {
        planTitle: '7-Day World History DBQ Strategy',
        targetGoal: 'Improve primary source sourcing (HIPP: Historical context, Intended audience, Purpose, Point of view).',
        revisionPriorities: [
          { subject: 'World History', topic: 'Primary Source Analysis & Argumentative Synthesis', priority: 'HIGH', reason: 'Essential for high-score DBQs.' },
        ],
        dailySchedule: [
          { day: 'Day 1', focusSubject: 'World History', suggestedMinutes: 30, recommendedActivity: 'HIPP-source 3 historical documents from the Industrial Revolution.' },
        ],
        examPrepTips: ['Synthesize outside historical evidence not directly mentioned in the excerpt.'],
      },
      verifiedMetrics: { averageGrade: 86, attendanceRate: 93 },
    },
    {
      title: '5-Day Economics Supply, Demand & Market Equilibrium Prep',
      targetDate: new Date(Date.now() + 5 * 86400000),
      plan: {
        planTitle: '5-Day Economics Supply, Demand & Market Equilibrium Prep',
        targetGoal: 'Master curve shifting mechanisms, price elasticity, and deadweight loss calculations.',
        revisionPriorities: [
          { subject: 'Economics', topic: 'Price Elasticity of Demand & Total Revenue Test', priority: 'HIGH', reason: 'Foundational microeconomics concept.' },
        ],
        dailySchedule: [
          { day: 'Day 1', focusSubject: 'Economics', suggestedMinutes: 30, recommendedActivity: 'Graph shifts versus movements along supply/demand curves.' },
        ],
        examPrepTips: ['Distinguish clearly between change in demand and change in quantity demanded.'],
      },
      verifiedMetrics: { averageGrade: 89, attendanceRate: 97 },
    },
  ];

  for (const p of revisionPlansData) {
    const existing = await prisma.studentRevisionPlan.findFirst({
      where: { studentId: student.id, title: p.title },
    });

    if (!existing) {
      await prisma.studentRevisionPlan.create({
        data: {
          schoolId,
          studentId: student.id,
          title: p.title,
          targetDate: p.targetDate,
          plan: p.plan as any,
          verifiedMetrics: p.verifiedMetrics as any,
          status: 'ACTIVE',
        },
      });
      console.log(`[Seed-Tutor-Parent] Created revision plan: ${p.title}`);
    }
  }

  // -------------------------------------------------------------------------
  // 3. PARENT ASSISTANT CONVERSATION FIXTURES
  // -------------------------------------------------------------------------
  const parent = await prisma.user.findFirst({
    where: { email: 'parent@stjude.ems.local', role: UserRole.PARENT },
  });

  if (parent) {
    const existingConv = await prisma.aIConversation.findFirst({
      where: { userId: parent.id, studentContextId: student.id, conversationType: 'PARENT_ASSISTANT' },
    });

    if (!existingConv) {
      const conv = await prisma.aIConversation.create({
        data: {
          userId: parent.id,
          schoolId,
          studentContextId: student.id,
          title: `Academic Progress: ${student.firstName}`,
          roleContext: UserRole.PARENT,
          conversationType: 'PARENT_ASSISTANT',
        },
      });

      await prisma.aIMessage.createMany({
        data: [
          {
            conversationId: conv.id,
            sender: 'USER',
            content: `How is ${student.firstName} performing in Mathematics this term?`,
          },
          {
            conversationId: conv.id,
            sender: 'ASSISTANT',
            content: `Based on verified academic records for Grade 10, ${student.firstName} currently maintains an average mark of 88% in Mathematics with an exemplary 98% attendance rate across all scheduled sessions. Coursework submissions have been submitted promptly. For upcoming milestones, our faculty recommends continued practice in quadratic equations and calculus prerequisites.`,
          },
          {
            conversationId: conv.id,
            sender: 'USER',
            content: `Does ${student.firstName} have any outstanding tuition fees or payments due?`,
          },
          {
            conversationId: conv.id,
            sender: 'ASSISTANT',
            content: `According to our school bursar records, your account is fully up to date with zero overdue tuition balance. All previous term payments have been processed and recorded with receipt verification.`,
          },
        ],
      });
      console.log(`[Seed-Tutor-Parent] Created parent assistant conversation fixture for parent: ${parent.email}`);
    }
  }

  console.log('[Seed-Tutor-Parent] Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed-Tutor-Parent] Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
