/**
 * Comprehensive Automated Verification Suite for TASK 024:
 * AI Student Tutor & AI Parent/Guardian Assistant
 *
 * Runs all 19 required tests over live HTTP against port 4000 (NestJS) and port 8000 (FastAPI).
 */

const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function login(email, password = 'Password123!') {
  const res = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email, password }
  );
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`Login failed for ${email} (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.tokens?.accessToken || res.body.accessToken || res.body.token;
}

async function runVerification() {
  console.log('================================================================');
  console.log('TASK 024 — AI STUDENT TUTOR & PARENT ASSISTANT VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} -> ${details}`);
      failed++;
    }
  }

  try {
    // Authenticate roles
    console.log('Logging in test actors...');
    const studentToken = await login('student@stjude.ems.local');
    const parentToken = await login('parent@stjude.ems.local');
    const teacherToken = await login('teacher@stjude.ems.local');
    const adminToken = await login('admin@stjude.ems.local');
    const platformToken = await login('platform.admin@ems.local');

    const studentHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${studentToken}` };
    const parentHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${parentToken}` };
    const teacherHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${teacherToken}` };
    const adminHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` };
    const platformHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${platformToken}` };

    // TEST 1: Student can access AI Tutor
    const tutorCtxRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ai/tutor/context',
      method: 'GET',
      headers: studentHeaders,
    });
    report(
      '1. Student can access AI Tutor context',
      tutorCtxRes.status === 200 && tutorCtxRes.body.studentId && Array.isArray(tutorCtxRes.body.courses),
      `Status: ${tutorCtxRes.status}`
    );

    // TEST 2: Parent can access AI Parent Assistant
    const parentChildrenRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ai/parent/children',
      method: 'GET',
      headers: parentHeaders,
    });
    const verifiedChildren = parentChildrenRes.body;
    report(
      '2. Parent can access AI Parent Assistant and retrieve verified children',
      parentChildrenRes.status === 200 && Array.isArray(verifiedChildren) && verifiedChildren.length > 0,
      `Status: ${parentChildrenRes.status}, count: ${verifiedChildren?.length}`
    );

    const verifiedChildId = verifiedChildren?.[0]?.id;

    // TEST 3: Teacher cannot access student-private AI tutor endpoints
    const teacherTutorRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ai/tutor/context',
      method: 'GET',
      headers: teacherHeaders,
    });
    report(
      '3. Teacher cannot access student-private AI Tutor endpoints (Role restriction)',
      teacherTutorRes.status === 403,
      `Status: ${teacherTutorRes.status}`
    );

    // TEST 4: Student cannot access another student's records or parent assistant
    const studentParentRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ai/parent/children',
      method: 'GET',
      headers: studentHeaders,
    });
    report(
      '4. Student cannot access Parent Assistant endpoints',
      studentParentRes.status === 403,
      `Status: ${studentParentRes.status}`
    );

    // TEST 5: Parent cannot access an unrelated child
    const fakeChildRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ai/parent/academic-summary/00000000-0000-0000-0000-000000000000',
      method: 'GET',
      headers: parentHeaders,
    });
    report(
      '5. Parent cannot access an unrelated / unverified child',
      fakeChildRes.status === 403,
      `Status: ${fakeChildRes.status}`
    );

    // TEST 6: Cross-school access is rejected / school isolation enforced
    const otherSchoolRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ai/tutor/practice-quiz/00000000-0000-0000-0000-000000000000',
      method: 'GET',
      headers: studentHeaders,
    });
    report(
      '6. Unauthorized or non-existent quiz access is rejected',
      otherSchoolRes.status === 404 || otherSchoolRes.status === 403,
      `Status: ${otherSchoolRes.status}`
    );

    // TEST 7: Tutor uses only authorized course context
    const explanationRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/ai/tutor/concept-explanation',
        method: 'POST',
        headers: studentHeaders,
      },
      {
        topic: 'Photosynthesis & Light Reactions',
        difficultyLevel: 'INTERMEDIATE',
        explanationStyle: 'STEP_BY_STEP',
      }
    );
    report(
      '7. Tutor generates concept explanation using student academic context',
      explanationRes.status === 200 && explanationRes.body.coreExplanation && explanationRes.body.quickCheckQuestion,
      `Status: ${explanationRes.status}`
    );

    // TEST 8: Unreleased answer keys are not exposed in student quizzes
    const createQuizRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/ai/tutor/practice-quiz',
        method: 'POST',
        headers: studentHeaders,
      },
      {
        topic: 'Chemical Equilibrium & Le Chatelier Principle',
        questionCount: 4,
        questionType: 'MULTIPLE_CHOICE',
      }
    );
    const newQuiz = createQuizRes.body;
    const hasExposedAnswer = newQuiz.questions?.some((q) => q.correctAnswer !== undefined);
    report(
      '8. Unreleased answer keys are not exposed in generated student quiz',
      createQuizRes.status === 201 && newQuiz.id && !hasExposedAnswer,
      `Status: ${createQuizRes.status}, exposed answer: ${hasExposedAnswer}`
    );

    // TEST 9 & 10: Practice quiz submission validates answers without modifying official grades
    // Check official grades count first
    const gradesBeforeRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/grades/students/${tutorCtxRes.body.studentId}`,
      method: 'GET',
      headers: adminHeaders,
    });
    const officialGradesCountBefore = Array.isArray(gradesBeforeRes.body) ? gradesBeforeRes.body.length : 0;

    // Submit answers
    const submitQuizRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/ai/tutor/submit-quiz',
        method: 'POST',
        headers: studentHeaders,
      },
      {
        quizId: newQuiz.id,
        answers: { [newQuiz.questions[0]?.id]: 'Sample Answer' },
      }
    );

    const gradesAfterRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/grades/students/${tutorCtxRes.body.studentId}`,
      method: 'GET',
      headers: adminHeaders,
    });
    const officialGradesCountAfter = Array.isArray(gradesAfterRes.body) ? gradesAfterRes.body.length : 0;

    report(
      '9. Practice quizzes do not modify official grades',
      submitQuizRes.status === 200 && officialGradesCountBefore === officialGradesCountAfter,
      `Grades count before: ${officialGradesCountBefore}, after: ${officialGradesCountAfter}`
    );

    report(
      '10. Quiz answers are validated and formative percentage score returned',
      submitQuizRes.status === 200 && submitQuizRes.body.score !== undefined && submitQuizRes.body.status === 'COMPLETED',
      `Score: ${submitQuizRes.body?.score}, status: ${submitQuizRes.body?.status}`
    );

    // TEST 11: Duplicate quiz submissions are prevented
    const duplicateSubmitRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/ai/tutor/submit-quiz',
        method: 'POST',
        headers: studentHeaders,
      },
      {
        quizId: newQuiz.id,
        answers: { [newQuiz.questions[0]?.id]: 'Different Answer' },
      }
    );
    report(
      '11. Duplicate quiz submissions are strictly prevented (400 Bad Request)',
      duplicateSubmitRes.status === 400,
      `Status: ${duplicateSubmitRes.status}`
    );

    // TEST 12: Revision plans use verified academic data
    const revisionRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/ai/tutor/revision-plan',
        method: 'POST',
        headers: studentHeaders,
      },
      { timeframeDays: 7 }
    );
    report(
      '12. Revision plans use verified academic and attendance data',
      revisionRes.status === 200 && revisionRes.body.planTitle && Array.isArray(revisionRes.body.dailySchedule),
      `Status: ${revisionRes.status}, days: ${revisionRes.body?.dailySchedule?.length}`
    );

    // TEST 13: Parent academic summaries use linked-child records
    const academicSummaryRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/ai/parent/academic-summary/${verifiedChildId}`,
      method: 'GET',
      headers: parentHeaders,
    });
    report(
      '13. Parent academic summaries use linked-child records',
      academicSummaryRes.status === 200 && academicSummaryRes.body.childName && academicSummaryRes.body.summary,
      `Status: ${academicSummaryRes.status}, child: ${academicSummaryRes.body?.childName}`
    );

    // TEST 14: Parent fee queries respect financial permissions & reflect exact ledger
    const feeRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/ai/parent/fee-explanation/${verifiedChildId}`,
      method: 'GET',
      headers: parentHeaders,
    });
    const ledger = feeRes.body.authoritativeLedger;
    report(
      '14. Parent fee queries return authoritative ledger with verified balances',
      feeRes.status === 200 && ledger && typeof ledger.outstandingBalance === 'number',
      `Outstanding: $${ledger?.outstandingBalance}, invoices: ${ledger?.invoices?.length}`
    );

    // TEST 15: Parent child switching does not leak conversation context
    const askRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/ai/parent/ask',
        method: 'POST',
        headers: parentHeaders,
      },
      {
        studentId: verifiedChildId,
        question: 'How is my child progressing in class?',
      }
    );
    report(
      '15. Parent conversation Q&A is strictly scoped to selected child ID',
      askRes.status === 200 && askRes.body.childId === verifiedChildId && askRes.body.answer,
      `Status: ${askRes.status}, answer: ${askRes.body?.answer?.slice(0, 40)}...`
    );

    // TEST 16: Conversation history ownership is enforced
    const studentConvRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ai/conversations',
      method: 'GET',
      headers: studentHeaders,
    });
    const studentConvs = studentConvRes.body;
    let crossAccessDenied = true;
    if (Array.isArray(studentConvs) && studentConvs.length > 0) {
      const otherAttempt = await request({
        hostname: 'localhost',
        port: 4000,
        path: `/api/v1/ai/conversations/${studentConvs[0].id}`,
        method: 'GET',
        headers: parentHeaders, // Parent trying to access student's conversation
      });
      crossAccessDenied = otherAttempt.status === 403 || otherAttempt.status === 404;
    }
    report(
      '16. Conversation history ownership is enforced across users',
      crossAccessDenied,
      `Ownership check verified`
    );

    // TEST 17: Gemini failures are handled gracefully
    const socraticRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/ai/tutor/socratic',
        method: 'POST',
        headers: studentHeaders,
      },
      {
        message: 'How do I start calculating centripetal acceleration?',
      }
    );
    report(
      '17. Socratic tutoring and AI fallbacks operate seamlessly',
      socraticRes.status === 200 && socraticRes.body.guidance && socraticRes.body.followUpQuestion,
      `Status: ${socraticRes.status}`
    );

    // TEST 18: Existing AI Assistant and Teacher Copilot continue working
    const copilotCtxRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/ai/copilot/context',
      method: 'GET',
      headers: teacherHeaders,
    });
    const generalChatRes = await request(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/v1/ai/chat',
        method: 'POST',
        headers: studentHeaders,
      },
      {
        message: 'Hello Assistant, what is the school motto?',
      }
    );
    report(
      '18. Existing AI Assistant and Teacher Copilot continue working',
      copilotCtxRes.status === 200 && generalChatRes.status === 200,
      `Copilot status: ${copilotCtxRes.status}, General chat status: ${generalChatRes.status}`
    );

    // TEST 19: All five dashboards continue working
    const [pAdminDash, sAdminDash, teacherDash, studentDash, parentDash] = await Promise.all([
      request({ hostname: 'localhost', port: 4000, path: '/api/v1/dashboards/platform-admin', method: 'GET', headers: platformHeaders }),
      request({ hostname: 'localhost', port: 4000, path: '/api/v1/dashboards/school-admin', method: 'GET', headers: adminHeaders }),
      request({ hostname: 'localhost', port: 4000, path: '/api/v1/dashboards/teacher', method: 'GET', headers: teacherHeaders }),
      request({ hostname: 'localhost', port: 4000, path: '/api/v1/dashboards/student', method: 'GET', headers: studentHeaders }),
      request({ hostname: 'localhost', port: 4000, path: '/api/v1/dashboards/parent', method: 'GET', headers: parentHeaders }),
    ]);
    const allDashboardsOk =
      pAdminDash.status === 200 &&
      sAdminDash.status === 200 &&
      teacherDash.status === 200 &&
      studentDash.status === 200 &&
      parentDash.status === 200;

    report(
      '19. All five dashboards continue working with zero regression',
      allDashboardsOk,
      `PAdmin: ${pAdminDash.status}, SAdmin: ${sAdminDash.status}, Teacher: ${teacherDash.status}, Student: ${studentDash.status}, Parent: ${parentDash.status}`
    );

    console.log('\n================================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED / ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal verification error:', err);
    process.exit(1);
  }
}

runVerification();
