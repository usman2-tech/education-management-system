"""
MODULE: AI Student Tutor Workflow
PURPOSE:
Provides structured, pedagogical AI assistance tailored for students:
1. Concept Explanations
2. Interactive Step-by-Step Tutoring (Socratic Method)
3. Practice Quiz Generator & Formative Evaluator
4. Personalized Revision Planner
5. Homework Guidance (hints & analogies, zero answer-copying)
6. Student Learning Progress Insights

SECURITY & PEDAGOGICAL INTEGRITY:
- Encourages student critical thinking; never writes homework answers directly.
- Practice quizzes and formative evaluations NEVER alter official grades or exam records.
- Answer keys to official exams and teacher-only rubrics are strictly protected.
- Age-appropriate, positive, encouraging tone adapted to student's grade level.
"""

import json
import logging
import re
from typing import Dict, Any, List, Optional
from src.agents.gemini_adapter import gemini_adapter

logger = logging.getLogger("ems-student-tutor-workflow")


def _clean_and_parse_json(text: str) -> Optional[Dict[str, Any]]:
    """Extracts and parses JSON object from model output."""
    if not text:
        return None
    try:
        cleaned = text.strip()
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        return json.loads(cleaned)
    except Exception as e:
        logger.warning(f"Failed to parse JSON response: {e}. Attempting regex extraction.")
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
    return None


class StudentTutorWorkflow:
    """Orchestrates AI Student Tutoring workflows using Google Gemini."""

    async def generate_concept_explanation(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generates a comprehensive, age-appropriate concept breakdown."""
        topic = params.get("topic", "General Academic Concept")
        subject = params.get("subjectName", "General Studies")
        grade = params.get("gradeLevel", "High School")
        difficulty = params.get("difficultyLevel", "INTERMEDIATE")
        style = params.get("explanationStyle", "STEP_BY_STEP")
        student_question = params.get("question", "")

        prompt = f"""
You are a friendly, expert Academic Tutor in {subject} for a {grade} student.
Explain the following topic thoroughly, clearly, and engagingly.
Topic: {topic}
Difficulty: {difficulty}
Style: {style}
Specific Student Inquiry: {student_question if student_question else 'Explain the core principles and how to solve problems on this topic.'}

Return a valid JSON object matching this exact structure:
{{
  "title": "Concept Guide: {topic}",
  "topic": "{topic}",
  "gradeLevel": "{grade}",
  "coreExplanation": "Clear, intuitive breakdown of the topic without confusing jargon.",
  "stepByStepExamples": [
    {{
      "exampleTitle": "Worked Example 1",
      "problemStatement": "Realistic problem statement",
      "steps": [
        "Step 1: Identify given variables and goal",
        "Step 2: Apply the governing principle",
        "Step 3: Calculate or derive the solution"
      ],
      "solution": "Final verified answer with conceptual takeaway."
    }}
  ],
  "keyConcepts": [
    "Core term 1 and definition",
    "Core term 2 and definition"
  ],
  "commonMistakes": [
    "Mistake students often make and how to avoid it"
  ],
  "quickCheckQuestion": {{
    "question": "A short self-test question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": "Option A",
    "hint": "Helpful hint if student is stuck."
  }},
  "encouragement": "Positive motivating message encouraging continuous curiosity."
}}
Return ONLY JSON. Do not include markdown preamble.
"""
        raw_res = await gemini_adapter.generate(prompt)
        parsed = _clean_and_parse_json(raw_res.get("text", "")) if raw_res.get("success") else None

        if parsed and parsed.get("coreExplanation"):
            return {
                "success": True,
                "data": parsed,
                "model": raw_res.get("model", "gemini-3.8-flash"),
                "tokens": raw_res.get("tokens_used", 0),
            }

        # Deterministic pedagogical fallback
        return {
            "success": True,
            "data": {
                "title": f"Concept Guide: {topic}",
                "topic": topic,
                "gradeLevel": grade,
                "coreExplanation": f"In {subject}, {topic} is a foundational principle that helps us model and understand how systems behave. By breaking down the problem into elementary parts, we can systematically analyze relationships between components.",
                "stepByStepExamples": [
                    {
                        "exampleTitle": f"Standard Application of {topic}",
                        "problemStatement": f"Solve a typical {topic} problem under standard introductory constraints.",
                        "steps": [
                            f"Step 1: Write down what is given in the problem statement regarding {topic}.",
                            "Step 2: Select the appropriate formula or analytical theorem.",
                            "Step 3: Substitute known quantities and isolate the unknown variable.",
                            "Step 4: Check units and verify that the magnitude is physically reasonable."
                        ],
                        "solution": f"The solution demonstrates the direct relationship dictated by {topic}."
                    }
                ],
                "keyConcepts": [
                    f"Fundamental definition of {topic}",
                    "Boundary conditions and constraints",
                    "Real-world application and significance"
                ],
                "commonMistakes": [
                    "Confusing intermediate variables before simplifying algebraic terms.",
                    "Forgetting to verify units or standard conventions."
                ],
                "quickCheckQuestion": {
                    "question": f"Which of the following is the most critical first step when analyzing {topic}?",
                    "options": [
                        "Identify the known variables and the specific objective",
                        "Immediately guess the final numerical answer",
                        "Skip reading the problem constraints",
                        "Assume all parameters are equal to zero"
                    ],
                    "correctOption": "Identify the known variables and the specific objective",
                    "hint": "Always start with clear identification of knowns and unknowns."
                },
                "encouragement": "Great questions lead to great mastery! Keep practicing one problem at a time."
            },
            "model": "gemini-3.8-flash (pedagogical-fallback)",
            "tokens": 120,
        }

    async def socratic_tutoring(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Provides interactive Socratic tutoring that guides student thinking."""
        message = params.get("message", "")
        topic = params.get("topic", "Academic Learning")
        subject = params.get("subjectName", "General Studies")
        grade = params.get("gradeLevel", "High School")
        history = params.get("conversationHistory", [])

        history_context = ""
        for h in history[-4:]:
            role = h.get("sender", "USER")
            content = h.get("content", "")
            history_context += f"{role}: {content}\n"

        prompt = f"""
You are a Socratic Academic Tutor in {subject} for a {grade} student.
Topic: {topic}
Recent conversation:
{history_context}
Latest student message: "{message}"

Rules for Socratic Tutoring:
1. Do NOT solve the whole problem for the student immediately.
2. Acknowledge what the student got right.
3. Give an intuitive hint, analogy, or guiding question that prompts the student to take the next step.
4. Keep the tone warm, patient, and age-appropriate.
5. If the student asks for a general worked example, provide one that uses different numbers or scenarios than their homework.

Return a valid JSON object:
{{
  "reply": "Your Socratic conversational response with guidance",
  "hint": "A concise hint or clue to guide their next reasoning step",
  "followUpQuestion": "A targeted question asking the student what they think the next step is",
  "topicIdentified": "{topic}",
  "confidenceScore": 0.95
}}
Return ONLY JSON.
"""
        raw_res = await gemini_adapter.generate(prompt)
        parsed = _clean_and_parse_json(raw_res.get("text", "")) if raw_res.get("success") else None

        if parsed and parsed.get("reply"):
            return {
                "success": True,
                "data": parsed,
                "model": raw_res.get("model", "gemini-3.8-flash"),
                "tokens": raw_res.get("tokens_used", 0),
            }

        return {
            "success": True,
            "data": {
                "reply": f"You're on the right track exploring {topic}! When approaching this kind of problem, think about the relationship between what we know and what we are looking for. What principle from {subject} connects these concepts?",
                "hint": "Look closely at the given conditions and identify which variable changes first.",
                "followUpQuestion": "What do you think is the very first equation or relationship we should write down?",
                "topicIdentified": topic,
                "confidenceScore": 0.92
            },
            "model": "gemini-3.8-flash (pedagogical-fallback)",
            "tokens": 85,
        }

    async def generate_practice_quiz(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Generates a formative practice quiz with validated answer keys."""
        topic = params.get("topic", "General Academic Review")
        subject = params.get("subjectName", "General Studies")
        difficulty = params.get("difficulty", "INTERMEDIATE")
        count = int(params.get("questionCount", 4))
        q_type = params.get("questionType", "MIXED")

        prompt = f"""
You are an expert curriculum designer. Generate a formative practice quiz for a student studying {topic} in {subject}.
Difficulty: {difficulty}
Question Count: {count}
Question Type: {q_type}

Requirements:
- Make questions engaging, diagnostic, and conceptual.
- Provide clear, objective answer keys.
- For MULTIPLE_CHOICE: provide exactly 4 options and the correct answer string.
- For TRUE_FALSE: options must be ["True", "False"].
- For SHORT_ANSWER: provide concise expected answer and step explanation.

Return a valid JSON object:
{{
  "quizTitle": "Practice Quiz: {topic}",
  "topic": "{topic}",
  "difficulty": "{difficulty}",
  "totalQuestions": {count},
  "questions": [
    {{
      "questionNumber": 1,
      "questionType": "MULTIPLE_CHOICE",
      "questionText": "Clear diagnostic question statement",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Detailed explanation of why Option A is correct and why other choices are misconceptions."
    }}
  ],
  "revisionTips": "Short advice on which textbook sections to revisit."
}}
Return ONLY JSON.
"""
        raw_res = await gemini_adapter.generate(prompt)
        parsed = _clean_and_parse_json(raw_res.get("text", "")) if raw_res.get("success") else None

        if parsed and parsed.get("questions") and len(parsed["questions"]) > 0:
            return {
                "success": True,
                "data": parsed,
                "model": raw_res.get("model", "gemini-3.8-flash"),
                "tokens": raw_res.get("tokens_used", 0),
            }

        # Deterministic practice quiz fallback
        fallback_questions = [
            {
                "questionNumber": 1,
                "questionType": "MULTIPLE_CHOICE",
                "questionText": f"Which of the following best defines the primary concept of {topic}?",
                "options": [
                    f"A fundamental relationship in {subject} establishing predictable behavior",
                    "An arbitrary convention that applies only in laboratory vacuum conditions",
                    "A rule that contradicts basic conservation principles",
                    "A historical hypothesis that has been completely discarded"
                ],
                "correctAnswer": f"A fundamental relationship in {subject} establishing predictable behavior",
                "explanation": f"{topic} is recognized as a governing relationship in {subject} providing predictive models for problem solving."
            },
            {
                "questionNumber": 2,
                "questionType": "TRUE_FALSE",
                "questionText": f"In {subject}, understanding {topic} allows students to deduce secondary effects without empirical guesswork.",
                "options": ["True", "False"],
                "correctAnswer": "True",
                "explanation": "True. Applying systematic theoretical principles enables deductive reasoning across multiple applications."
            },
            {
                "questionNumber": 3,
                "questionType": "MULTIPLE_CHOICE",
                "questionText": f"When solving an applied exercise on {topic}, what should be verified after computing the numerical result?",
                "options": [
                    "Dimensional consistency, unit accuracy, and physical plausibility",
                    "Only that the result is an even whole integer",
                    "Whether the answer matches someone else's worksheet",
                    "Nothing, the initial calculation is always final"
                ],
                "correctAnswer": "Dimensional consistency, unit accuracy, and physical plausibility",
                "explanation": "Verification of units and plausibility confirms the validity of the computed result."
            },
            {
                "questionNumber": 4,
                "questionType": "SHORT_ANSWER",
                "questionText": f"State in one sentence how {topic} connects theoretical understanding with practical application.",
                "options": [],
                "correctAnswer": f"{topic} translates theoretical laws into quantifiable predictions for applied problems.",
                "explanation": "Award credit for answers highlighting translation of fundamental theory into measurable analytical predictions."
            }
        ]

        return {
            "success": True,
            "data": {
                "quizTitle": f"Practice Quiz: {topic}",
                "topic": topic,
                "difficulty": difficulty,
                "totalQuestions": len(fallback_questions[:count]),
                "questions": fallback_questions[:count],
                "revisionTips": f"Review core chapter notes on {topic} and practice worked examples."
            },
            "model": "gemini-3.8-flash (pedagogical-fallback)",
            "tokens": 150,
        }

    async def evaluate_practice_quiz(self, quiz_data: Dict[str, Any], student_answers: Dict[str, str]) -> Dict[str, Any]:
        """Evaluates student practice quiz answers deterministically with formative feedback."""
        questions = quiz_data.get("questions", [])
        total = len(questions)
        correct_count = 0
        evaluations = []

        for q in questions:
            q_num = str(q.get("questionNumber", 1))
            user_ans = student_answers.get(q_num, "").strip()
            correct_ans = str(q.get("correctAnswer", "")).strip()

            is_correct = False
            if q.get("questionType") in ["MULTIPLE_CHOICE", "TRUE_FALSE"]:
                is_correct = user_ans.lower() == correct_ans.lower()
            else:
                # Basic fuzzy inclusion check for short-answer
                is_correct = len(user_ans) > 3 and any(word in user_ans.lower() for word in correct_ans.lower().split()[:3])

            if is_correct:
                correct_count += 1

            evaluations.append({
                "questionNumber": int(q_num),
                "questionText": q.get("questionText"),
                "studentAnswer": user_ans if user_ans else "(No answer provided)",
                "correctAnswer": correct_ans,
                "isCorrect": is_correct,
                "explanation": q.get("explanation", "Review core principles for full details.")
            })

        percentage = round((correct_count / total * 100), 1) if total > 0 else 0.0

        if percentage >= 85:
            feedback_summary = "Outstanding mastery! You demonstrated a comprehensive understanding of the topic concepts."
        elif percentage >= 65:
            feedback_summary = "Solid performance! You have a good grasp of the foundational principles, with room to refine problem steps."
        else:
            feedback_summary = "Good effort on this practice session. Revisit the explanations below and review the suggested topics to strengthen your foundation."

        return {
            "success": True,
            "data": {
                "scorePercentage": percentage,
                "correctCount": correct_count,
                "totalQuestions": total,
                "feedbackSummary": feedback_summary,
                "evaluations": evaluations,
                "isFormative": True,
                "note": "This is private formative practice. It does NOT modify your official school grades or GPA."
            }
        }

    async def generate_revision_plan(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesizes a personalized revision schedule grounded in verified student performance."""
        student_name = params.get("studentName", "Student")
        grade_level = params.get("gradeLevel", "Grade 10")
        metrics = params.get("verifiedMetrics", {})
        focus_subjects = params.get("focusSubjects", ["Mathematics", "Science"])
        target_date = params.get("targetDate", "Upcoming Midterm Period")

        avg_grade = metrics.get("averageGrade", 80.0)
        attendance = metrics.get("attendanceRate", 95.0)

        prompt = f"""
Create a realistic, supportive, personalized study revision plan for {student_name} ({grade_level}).
Target Exam/Date: {target_date}
Verified Academic Background:
- Average Assessment Score: {avg_grade}%
- Attendance Rate: {attendance}%
- Target Subjects: {', '.join(focus_subjects)}

Requirements:
- Practical, realistic study sessions (25-45 minutes each using Pomodoro technique).
- Highlight specific topics that benefit most from review.
- Provide encouraging, actionable daily revision activities.
- Never use demoralizing or permanent ability labels.

Return a valid JSON object:
{{
  "title": "Personalized Revision Plan: {student_name}",
  "targetDate": "{target_date}",
  "overview": "Encouraging strategic study overview",
  "targetGoals": [
    "Master high-yield concepts across {', '.join(focus_subjects[:2])}",
    "Complete 2 diagnostic practice problem sets per week"
  ],
  "revisionPriorities": [
    {{
      "subject": "{focus_subjects[0] if focus_subjects else 'Mathematics'}",
      "topic": "Core Analytical Problem Solving",
      "priority": "HIGH",
      "reason": "Foundational conceptual area tested frequently on assessments."
    }}
  ],
  "dailySchedule": [
    {{
      "day": "Monday",
      "focusSubject": "{focus_subjects[0] if focus_subjects else 'Mathematics'}",
      "suggestedMinutes": 30,
      "recommendedActivity": "Concept mapping and reviewing teacher worked examples"
    }},
    {{
      "day": "Tuesday",
      "focusSubject": "{focus_subjects[1] if len(focus_subjects) > 1 else 'Science'}",
      "suggestedMinutes": 35,
      "recommendedActivity": "Independent practice problem sets and flashcard retrieval"
    }},
    {{
      "day": "Wednesday",
      "focusSubject": "{focus_subjects[0] if focus_subjects else 'Mathematics'}",
      "suggestedMinutes": 30,
      "recommendedActivity": "Self-timed formative practice quiz"
    }},
    {{
      "day": "Thursday",
      "focusSubject": "{focus_subjects[1] if len(focus_subjects) > 1 else 'Science'}",
      "suggestedMinutes": 30,
      "recommendedActivity": "Error analysis on homework questions and clarifying formulas"
    }},
    {{
      "day": "Friday",
      "focusSubject": "Review & Synthesis",
      "suggestedMinutes": 25,
      "recommendedActivity": "Weekly synthesis review and celebratory study reflection"
    }}
  ],
  "examPrepTips": [
    "Break study sessions into 25-minute focused blocks with 5-minute active breaks.",
    "Formulate questions before reading textbook sections to activate retrieval."
  ]
}}
Return ONLY JSON.
"""
        raw_res = await gemini_adapter.generate(prompt)
        parsed = _clean_and_parse_json(raw_res.get("text", "")) if raw_res.get("success") else None

        if parsed and parsed.get("dailySchedule"):
            return {
                "success": True,
                "data": parsed,
                "model": raw_res.get("model", "gemini-3.8-flash"),
                "tokens": raw_res.get("tokens_used", 0),
            }

        return {
            "success": True,
            "data": {
                "title": f"Personalized Revision Plan: {student_name}",
                "targetDate": target_date,
                "overview": f"A structured, sustainable revision schedule designed to build confidence and mastery across {', '.join(focus_subjects)}.",
                "targetGoals": [
                    "Strengthen core problem-solving accuracy in key subjects",
                    "Establish a predictable 30-minute daily active recall habit",
                    "Complete formative self-checks prior to class quizzes"
                ],
                "revisionPriorities": [
                    {
                        "subject": focus_subjects[0] if focus_subjects else "Mathematics",
                        "topic": "Foundational Analytical Principles",
                        "priority": "HIGH",
                        "reason": "Crucial bedrock concepts that recur across major exam units."
                    },
                    {
                        "subject": focus_subjects[1] if len(focus_subjects) > 1 else "Science",
                        "topic": "Scientific Reasoning & Problem Decomposition",
                        "priority": "MEDIUM",
                        "reason": "Reinforces conceptual clarity and experimental interpretation."
                    }
                ],
                "dailySchedule": [
                    {
                        "day": "Monday",
                        "focusSubject": focus_subjects[0] if focus_subjects else "Mathematics",
                        "suggestedMinutes": 30,
                        "recommendedActivity": "Review lecture slides and annotate core definitions."
                    },
                    {
                        "day": "Tuesday",
                        "focusSubject": focus_subjects[1] if len(focus_subjects) > 1 else "Science",
                        "suggestedMinutes": 35,
                        "recommendedActivity": "Solve 3 guided exercises and verify each intermediate step."
                    },
                    {
                        "day": "Wednesday",
                        "focusSubject": focus_subjects[0] if focus_subjects else "Mathematics",
                        "suggestedMinutes": 30,
                        "recommendedActivity": "Take an interactive practice quiz to test recall speed."
                    },
                    {
                        "day": "Thursday",
                        "focusSubject": focus_subjects[1] if len(focus_subjects) > 1 else "Science",
                        "suggestedMinutes": 30,
                        "recommendedActivity": "Work through past homework corrections with peer discussion notes."
                    },
                    {
                        "day": "Friday",
                        "focusSubject": "Comprehensive Synthesis",
                        "suggestedMinutes": 25,
                        "recommendedActivity": "Create summary cheat-sheets and review week milestones."
                    }
                ],
                "examPrepTips": [
                    "Prioritize active retrieval practice over passive re-reading of textbooks.",
                    "Sleep at least 8 hours before major tests; memory consolidation occurs during rest."
                ]
            },
            "model": "gemini-3.8-flash (pedagogical-fallback)",
            "tokens": 140,
        }

    async def generate_homework_guidance(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Provides pedagogical hints and analogies without writing homework solutions."""
        title = params.get("homeworkTitle", "Assigned Homework")
        instructions = params.get("instructions", "Complete assigned problem set.")
        student_question = params.get("questionOrDoubt", "How should I get started on this assignment?")
        subject = params.get("subjectName", "General Studies")

        prompt = f"""
You are an ethical, supportive Academic Tutor in {subject}.
A student is working on their homework assignment and asked for guidance.
Assignment Title: "{title}"
Assignment Instructions: "{instructions}"
Student's Question/Confusion: "{student_question}"

CRITICAL ETHICAL RULES:
1. Do NOT solve the student's actual homework problem or write out the final answer.
2. Explain the assignment instructions in plain English if they seem confusing.
3. Provide a SIMILAR worked example that uses DIFFERENT numbers or scenarios to model the method.
4. Give a checklist of steps the student should follow to solve their own task.
5. Provide self-check questions for the student to verify their own work.

Return a valid JSON object:
{{
  "guidanceTitle": "Homework Guidance: {title}",
  "instructionClarification": "Clear explanation of what the assignment asks for",
  "conceptualHints": [
    "Hint 1: Think about the core principle...",
    "Hint 2: Pay special attention to..."
  ],
  "similarWorkedExample": {{
    "problem": "A parallel practice problem with different numbers",
    "solutionWalkthrough": "Step-by-step reasoning demonstrating the method",
    "keyTakeaway": "What this example teaches you to apply to your real assignment"
  }},
  "actionableSteps": [
    "Step 1: Write down the given information from your assignment prompt",
    "Step 2: Choose the corresponding formula",
    "Step 3: Perform calculation and check units"
  ],
  "selfCheckQuestions": [
    "Did I clearly show my reasoning on paper?",
    "Does the final magnitude make intuitive sense?"
  ]
}}
Return ONLY JSON.
"""
        raw_res = await gemini_adapter.generate(prompt)
        parsed = _clean_and_parse_json(raw_res.get("text", "")) if raw_res.get("success") else None

        if parsed and parsed.get("similarWorkedExample"):
            return {
                "success": True,
                "data": parsed,
                "model": raw_res.get("model", "gemini-3.8-flash"),
                "tokens": raw_res.get("tokens_used", 0),
            }

        return {
            "success": True,
            "data": {
                "guidanceTitle": f"Homework Guidance: {title}",
                "instructionClarification": f"This assignment on '{title}' in {subject} is designed to reinforce your problem-solving process. Focus on demonstrating your methodology clearly.",
                "conceptualHints": [
                    "Identify what specific variable or outcome the prompt asks you to find.",
                    "Review your class notes for the governing equation or definition.",
                    "Check that all units are converted to consistent dimensions before calculating."
                ],
                "similarWorkedExample": {
                    "problem": f"A sample exercise illustrating the method used in {title} (using illustrative sample values):",
                    "solutionWalkthrough": "First identify the given values. Next, set up the governing formula. Substitute the sample numbers and solve systematically step-by-step.",
                    "keyTakeaway": "Notice how each step logically follows from the previous one. Use this same sequence on your assignment!"
                },
                "actionableSteps": [
                    "Step 1: Re-read the homework problem and underline the key numbers and constraints.",
                    "Step 2: Write out the governing principle or formula you learned in class.",
                    "Step 3: Substitute your specific homework values and solve neatly.",
                    "Step 4: Review your final answer against the self-check questions below."
                ],
                "selfCheckQuestions": [
                    "Have I written down all intermediate steps so my teacher can follow my work?",
                    "Are the units clearly labeled on my final answer?",
                    "Does my conclusion directly answer what the problem asked?"
                ]
            },
            "model": "gemini-3.8-flash (pedagogical-fallback)",
            "tokens": 130,
        }

    async def generate_learning_progress(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesizes student's verified academic and practice activity into actionable progress insights."""
        student_name = params.get("studentName", "Student")
        grade_level = params.get("gradeLevel", "High School")
        subjects = params.get("enrolledSubjects", [])
        grades = params.get("verifiedGrades", [])
        homework = params.get("homeworkStats", {})
        attendance = params.get("attendanceStats", {})
        quizzes = params.get("practiceQuizStats", {})
        plans = params.get("revisionPlanStats", {})

        prompt = f"""
You are an encouraging, objective Academic Mentor analyzing verified learning metrics for {student_name} ({grade_level}).
Enrolled Subjects: {json.dumps(subjects)}
Verified Grades: {json.dumps(grades)}
Homework Stats: {json.dumps(homework)}
Attendance: {json.dumps(attendance)}
AI Practice Quiz Activity: {json.dumps(quizzes)}
Active Revision Plans: {json.dumps(plans)}

Generate a formative, motivating progress review:
1. Summarize overall learning trajectory without assigning permanent labels.
2. Highlight 2-3 genuine academic strengths supported by the metrics.
3. Identify 2-3 specific topics or habits that could benefit from extra practice.
4. Recommend 3 concrete, achievable next steps for the coming week.
5. Provide a supportive, forward-looking closing encouragement.

Return a valid JSON object:
{{
  "overallSummary": "Concise 2-3 sentence overview of the student's progress and effort.",
  "academicStrengths": [
    "Specific subject or skill strength supported by grades or completion"
  ],
  "areasForPractice": [
    "Specific topic or habit to target for growth"
  ],
  "suggestedNextSteps": [
    "Actionable step 1",
    "Actionable step 2",
    "Actionable step 3"
  ],
  "motivationalMessage": "Inspiring closing thought celebrating persistence."
}}
Return ONLY JSON.
"""
        raw_res = await gemini_adapter.generate(prompt)
        parsed = _clean_and_parse_json(raw_res.get("text", "")) if raw_res.get("success") else None

        if parsed and parsed.get("academicStrengths"):
            return {
                "success": True,
                "data": parsed,
                "model": raw_res.get("model", "gemini-3.8-flash"),
                "tokens": raw_res.get("tokens", 180),
            }

        # Resilient fallback grounded in provided metrics
        top_grade = grades[0].get("subject", "Core Subjects") if grades else "Core Subjects"
        return {
            "success": True,
            "data": {
                "overallSummary": f"{student_name} has demonstrated steady engagement across enrolled courses with {attendance.get('presentPercentage', 95)}% attendance and consistent submission of homework assignments.",
                "academicStrengths": [
                    f"Strong performance and engagement in {top_grade}.",
                    "Consistent classroom presence and diligence in completing coursework."
                ],
                "areasForPractice": [
                    "Targeted active recall practice before upcoming cumulative quizzes.",
                    "Reviewing teacher feedback comments on recent assignments."
                ],
                "suggestedNextSteps": [
                    "Generate a 5-question AI practice quiz for any topic you feel less confident in.",
                    "Set aside 20 minutes daily for structured revision using your active revision plan.",
                    "Ask your teacher or AI Tutor for clarification whenever a concept feels ambiguous."
                ],
                "motivationalMessage": "Consistent daily effort leads to mastery. Keep up the disciplined learning journey!"
            },
            "model": "gemini-3.8-flash (progress-fallback)",
            "tokens": 120,
        }


student_tutor_workflow = StudentTutorWorkflow()

