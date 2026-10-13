# Manual Testing Guide — TASK 001: System Foundation

## Overview
This document guides the user through manually verifying the architecture, frontend institutional layout, backend endpoints, and AI microservice for **TASK 001**.

---

## Test Scenario 1: Theme Switching (Light / Dark / System)
- **Application URL**: `http://localhost:3000`
- **Objective**: Verify that appearance mode toggles correctly and retains semantic color contrast.
- **Steps**:
  1. Open `http://localhost:3000` in the browser.
  2. Verify that the default appearance is **Light Mode** (slate background, crisp white cards, institutional deep navy primary headers).
  3. Locate the theme switcher in the top navigation header (`Light` / `Dark` / `System` toggle).
  4. Click the **Dark** button.
  5. Verify that the background transitions to midnight navy slate (`#090D16`), cards darken, and borders/text maintain high contrast.
  6. Click the **System** button. Verify it follows your operating system preference.
  7. Return to **Light** mode.
- **Expected Result**: Smooth, instantaneous theme switching without visual flicker or unreadable text.

---

## Test Scenario 2: Role Switcher & Navigation Shell
- **Application URL**: `http://localhost:3000`
- **Objective**: Verify the role-aware sidebar navigation across all 5 primary user roles.
- **Steps**:
  1. Open the left sidebar.
  2. Locate the **Active Role View** selector at the top of the sidebar.
  3. Select **School Admin**.
  4. Notice the navigation sections dynamically update to:
     - Academic Administration (Campus Dashboard, Students, Teachers & Faculty, Parents, Classes)
     - Operations & Records (Timetable, Attendance Oversight, Examinations, Campus Bulletins)
  5. Select **Teacher**. Verify sections update to:
     - Teaching Workspace (Teacher Dashboard, My Classes, Attendance, Gradebook, Homework)
     - Collaboration & AI (AI Teaching Assistant, Messages)
  6. Select **Student**. Verify sections update to:
     - Learning Portal (Student Dashboard, My Schedule, Courses & Lessons, Assignments, Exams & Marks)
     - Support & AI (AI Personal Tutor, Student Messages)
  7. Select **Parent / Guardian**. Verify sections update to Family Portal and Communication items.
  8. Switch back to **Platform Admin**.
- **Expected Result**: Navigation updates cleanly per role; links have correct icons, badges, and tooltips.

---

## Test Scenario 3: Responsive Layout (Desktop, Tablet, Mobile)
- **Application URL**: `http://localhost:3000`
- **Objective**: Verify responsive behavior across screen sizes.
- **Steps**:
  1. **Desktop View**: Click **Collapse Sidebar** at the bottom of the sidebar.
     - Verify sidebar transitions to compact icon-only mode (`w-16`).
     - Click the expand toggle; verify it expands back to `w-64`.
  2. **Mobile / Tablet View**: Resize the browser window to `< 768px` width (or open DevTools Device Toolbar).
     - Verify the sidebar automatically hides and a hamburger menu icon appears in the header.
     - Click the hamburger button.
     - Verify a sliding drawer opens with navigation links.
     - Click the close button (`X`) or tap the backdrop; verify the drawer closes smoothly.
     - Verify the page has no horizontal scrollbar or content cutoffs.
- **Expected Result**: Seamless responsive navigation with no layout breaks.

---

## Test Scenario 4: Core Backend API & Swagger Documentation
- **Backend URL**: `http://localhost:4000/api/v1/health`
- **Swagger URL**: `http://localhost:4000/api/docs`
- **Steps**:
  1. Open `http://localhost:4000/api/v1/health` in your browser or curl.
  2. Verify JSON response structure:
     ```json
     {
       "success": true,
       "statusCode": 200,
       "message": "System operational status verified",
       "data": {
         "status": "ok" or "degraded",
         "service": "Educational Management System API",
         "version": "0.1.0",
         "uptimeSeconds": ...,
         "services": {
           "database": { "status": "up" },
           "redis": { ... },
           "aiService": { ... }
         }
       }
     }
     ```
  3. Open `http://localhost:4000/api/docs`.
  4. Verify the Swagger UI renders with the **System** tag, `/health` endpoint description, and response schemas.
  5. Click **Try it out** -> **Execute** on the `/health` endpoint to test it interactively.
- **Expected Result**: 200 OK response with component-level latency and status.

---

## Test Scenario 5: Python AI Service Telemetry
- **AI Service URL**: `http://localhost:8000/health`
- **AI Swagger URL**: `http://localhost:8000/docs`
- **Steps**:
  1. Open `http://localhost:8000/health`.
  2. Verify JSON response:
     ```json
     {
       "status": "ok",
       "service": "EMS AI Service",
       "version": "0.1.0",
       "langgraph_ready": true
     }
     ```
  3. Open `http://localhost:8000/docs` to inspect the FastAPI OpenAPI documentation.
- **Expected Result**: FastAPI responds with 200 OK and confirms LangGraph readiness.

---

## Negative / Error Scenarios Tested
- **Invalid API Route**: Requesting `http://localhost:4000/api/v1/non-existent` returns standardized 404 envelope (`{ "success": false, "statusCode": 404, "message": "Cannot GET ...", "timestamp": ... }`).
- **Offline Backend Simulation**: If the backend is stopped, the frontend's `SystemStatusBadge` displays "Offline / Disconnected" with a retry button instead of crashing.

---

# Manual Testing Guide — TASK 002: Authentication & Multi-School RBAC

## Test Scenario 6: Institutional Login & 1-Click Fast-Fill
- **URL**: `http://localhost:3000/login`
- **Objective**: Verify database-backed authentication and test credentials across all 5 roles.
- **Steps**:
  1. Open `http://localhost:3000/login` in your web browser.
  2. Notice the institutional portal header ("St. Jude Institutional Academy &bull; Academic Portal") and the database status indicator ("PostgreSQL 18 Connected").
  3. Locate the **Development Fast-Access Matrix** on the right side with 5 test accounts:
     - **Platform Admin**: `platform.admin@ems.local`
     - **School Admin**: `admin@stjude.ems.local`
     - **Teacher**: `teacher@stjude.ems.local`
     - **Student**: `student@stjude.ems.local`
     - **Parent**: `parent@stjude.ems.local`
  4. Click **Fill Form** on the **School Admin** card.
     - Verify the email `admin@stjude.ems.local` and `Password123!` are populated into the login form.
  5. Click **Sign In to Institutional Portal**.
- **Expected Result**: Successfully signs in, stores JWT tokens in localStorage, and redirects to the dashboard `http://localhost:3000/`.

---

## Test Scenario 7: Header Profile Context & School Isolation
- **URL**: `http://localhost:3000/`
- **Objective**: Verify that the top header displays the authenticated user's actual profile and institutional scope.
- **Steps**:
  1. After signing in as School Admin, inspect the top application header:
     - **School Name**: "St. Jude Institutional Academy"
     - **User Name**: "Eleanor Pemberton" with verified shield badge
     - **Role Badge**: "Principal / Registrar"
  2. Click the **Logout Button** (door icon) in the far right of the header.
- **Expected Result**: Active session is invalidated on server, localStorage tokens are cleared, and browser immediately redirects back to `http://localhost:3000/login`.

---

## Test Scenario 8: 1-Click Fast In for Other Roles
- **URL**: `http://localhost:3000/login`
- **Steps**:
  1. Click the **1-Click In** button on the **Platform Admin** card.
  2. Verify immediate authentication and redirect to `http://localhost:3000/`.
  3. Header displays "Alexander Vance" with school "Global Platform Scope" and role "System Administrator".
  4. Click logout and repeat for **Teacher** (`Marcus Holloway`), **Student** (`Liam Chen`), or **Parent** (`Sarah Chen`).
- **Expected Result**: Each institutional role logs in seamlessly with correct permissions and institutional identity.

---

## Test Scenario 9: Route Protection & Unauthenticated Redirect
- **URL**: `http://localhost:3000/`
- **Steps**:
  1. While logged out, try typing `http://localhost:3000/` directly into your browser address bar.
- **Expected Result**: ProtectedRoute detects no session and immediately redirects to `http://localhost:3000/login`.

---

## Test Scenario 10: Backend OpenAPI Auth Endpoints
- **URL**: `http://localhost:4000/api/docs`
- **Steps**:
  1. Open `http://localhost:4000/api/docs`.
  2. Notice the new **Authentication & Access Control** section containing:
     - `POST /api/v1/auth/login`
     - `POST /api/v1/auth/refresh`
     - `POST /api/v1/auth/logout`
     - `GET /api/v1/auth/me`
     - `GET /api/v1/auth/tenant-context`
  3. Click the **Authorize** button at the top to enter a Bearer token and test protected routes directly.
- **Expected Result**: All endpoints are documented with DTO schemas and HTTP response codes.

---

# Manual Testing Guide — TASK 003: Multi-School Management

## Test Scenario 11: View Institutional Schools Directory (Platform Admin)
- **URL**: `http://localhost:3000/schools`
- **Steps**:
  1. Log in as **Platform Admin** (`platform.admin@ems.local` / `Password123!`).
  2. Click **Schools Directory** in the left sidebar or navigate to `http://localhost:3000/schools`.
  3. Verify the schools list displays existing institutions with:
     - Real database counts for administrators, teachers, and students.
     - Accurate status badge (e.g. Active).
     - Search bar and status filter dropdown.
- **Expected Result**: All registered schools render with complete metadata and action controls.

---

## Test Scenario 12: Create New Institutional School
- **URL**: `http://localhost:3000/schools/new`
- **Steps**:
  1. While logged in as Platform Admin, click **Register New School**.
  2. Enter:
     - **Name**: `Cambridge Classical Academy`
     - Click **Auto-generate from Name** to generate code `cambridge-classical`
     - **Email**: `admissions@cambridge.ems.local`
     - **City**: `Boston`, **State**: `MA`, **Country**: `USA`
  3. Click **Confirm Registration**.
- **Expected Result**: School is created in PostgreSQL and user is redirected to `/schools/[id]` displaying the newly registered institution.

---

## Test Scenario 13: School Admin Tenant Scoping & Restrictions
- **URL**: `http://localhost:3000/schools`
- **Steps**:
  1. Log out and log in as **School Admin** (`admin@stjude.ems.local` / `Password123!`).
  2. Navigate to `http://localhost:3000/schools`.
  3. Verify:
     - Only **St. Jude Institutional Academy** is displayed in the list.
     - The **Register New School** button is hidden.
     - Deactivation toggle buttons are unavailable.
  4. Try manually navigating to `http://localhost:3000/schools/new`.
  5. Verify the route guard rejects access with **Access Restricted (Role [SCHOOL_ADMIN] not authorized)**.
- **Expected Result**: Strict tenant isolation and RBAC restrictions enforced on both UI and API.

---

## Test Scenario 14: Deactivate and Reactivate School Tenant
- **URL**: `http://localhost:3000/schools`
- **Steps**:
  1. Log back in as **Platform Admin**.
  2. On any school in the list, click the power button or open school details and click **Deactivate School**.
  3. Confirm the action in the confirmation modal.
  4. Verify the status changes to **Deactivated / Inactive** with rose status badge.
  5. Click **Reactivate School** and confirm.
- **Expected Result**: School status toggles safely between ACTIVE and INACTIVE; records are preserved and audit events are logged.

---

## Test Scenario 15: Teacher Directory Oversight & Real Database Data
- **URL**: `http://localhost:3000/teachers`
- **Steps**:
  1. Log in as **School Admin** (`admin@stjude.ems.local` / `Password123!`).
  2. In the navigation sidebar, click **Teachers & Faculty** (or open `http://localhost:3000/teachers`).
  3. Verify the directory displays the seed teacher **Marcus Holloway**:
     - Email: `teacher@stjude.ems.local`
     - Employee Code: `TCH-1001`
     - Specialization: `Advanced Calculus & Analytical Geometry`
     - Qualification: `M.Sc. in Applied Mathematics`
     - Status: `Active Faculty`
  4. Test search input: type `Marcus` or `Calculus` and verify filtering works.
  5. Test status filter: select `Active Faculty Only` or `All Employment Statuses`.
- **Expected Result**: Directory displays authentic database records without simulated or placeholder values.

---

## Test Scenario 16: Onboard a New Faculty Member
- **URL**: `http://localhost:3000/teachers/new`
- **Steps**:
  1. While logged in as School Admin or Platform Admin, click **Onboard New Teacher**.
  2. Enter:
     - **First Name**: `Sophia`
     - **Last Name**: `Rodriguez`
     - **Email**: `sophia.rodriguez@stjude.ems.local`
     - Click **Generate** next to Employee Code to auto-fill (e.g. `TCH-4812`).
     - **Phone**: `+1-555-019-8833`
     - **Highest Qualification**: `Ph.D. in Molecular Biology`
     - **Specialization**: `AP Biology & Genetic Sciences`
     - **Bio**: `Former laboratory researcher and secondary department head with 10 years experience.`
  3. Click **Confirm Onboarding**.
- **Expected Result**: Teacher is created in PostgreSQL and user is redirected to `/teachers/[id]` showing the detailed faculty profile.

---

## Test Scenario 17: Edit Faculty Profile & Verify RBAC Guard on Employee Code
- **URL**: `http://localhost:3000/teachers/[id]/edit`
- **Steps**:
  1. From Sophia Rodriguez's profile page, click **Edit Profile**.
  2. Notice the administrator can update phone, qualification, and employee code.
  3. Change the phone number to `+1-555-019-9944` and click **Save Profile Changes**.
  4. Verify the updated phone displays on the profile.
  5. Log out and log in as **Teacher** (`teacher@stjude.ems.local` / `Password123!`).
  6. Navigate to `http://localhost:3000/teachers/8e42396c-4a37-47c7-b222-f7e5e26f3c7b/edit`.
  7. Notice the **Employee Identifier Code** field is disabled and marked with a lock icon: **"Locked for Educator Role"**.
- **Expected Result**: Teachers cannot modify their own employee code or elevate permissions; administrators retain full management rights.

---

## Test Scenario 18: Secondary Campus Affiliation / Multi-School Membership
- **URL**: `http://localhost:3000/teachers/[id]`
- **Steps**:
  1. Log in as **Platform Admin** (`platform.admin@ems.local` / `Password123!`).
  2. Open Marcus Holloway's profile at `http://localhost:3000/teachers/8e42396c-4a37-47c7-b222-f7e5e26f3c7b`.
  3. Click **Assign Campus**.
  4. Select a secondary campus (e.g. `Apex STEM Academy` or another school tenant).
  5. Enter a campus-scoped employee code (e.g. `TCH-APX-01`) and click **Assign Faculty**.
- **Expected Result**: Teacher profile now reflects multiple campus memberships under **Institutional Campus Memberships**.

---

## Test Scenario 19: Deactivate and Reactivate Teacher Account
- **URL**: `http://localhost:3000/teachers`
- **Steps**:
  1. While logged in as School Admin, locate Sophia Rodriguez or click the power icon on her profile.
  2. In the confirmation modal, click **Confirm Deactivation**.
  3. Verify the status badge switches to **Deactivated User** (rose badge).
  4. Attempting to log in with that teacher's credentials fails or shows deactivated state.
  5. Click **Reactivate Access** and confirm.
- **Expected Result**: Teacher operational status toggles safely; records and associations are strictly preserved.

---

## Test Scenario 20: Teacher Self-Service Profile & Role Isolation
- **URL**: `http://localhost:3000/my-profile`
- **Steps**:
  1. Log in as **Teacher** (`teacher@stjude.ems.local` / `Password123!`).
  2. In the navigation sidebar, click **My Faculty Profile** (or open `http://localhost:3000/my-profile`).
  3. Verify Marcus Holloway's credentials, specialization, degree, and active campus appointments render accurately.
  4. Try navigating directly to `http://localhost:3000/teachers/new`.
  5. Verify the route guard restricts access with **Access Restricted (Role [TEACHER] not authorized)**.
  6. Log in as **Student** (`student@stjude.ems.local`) and navigate to `http://localhost:3000/teachers`.
  7. Verify the student is blocked with **Access Restricted**.
- **Expected Result**: Teachers have dedicated self-service access; non-administrative roles cannot access faculty management tools.

---

# Manual Testing Guide — Combined TASK 006 & TASK 007: Parents & Academic Structures

## Test Scenario A: Parent Creation & Student Linking
- **URL**: `http://localhost:3000/parents/new`
- **Steps**:
  1. Log in as **School Admin** (`admin@stjude.ems.local` / `Password123!`).
  2. Navigate to **Parent Directory** (`/parents`) and click **Onboard Parent**.
  3. Enter:
     - **First Name**: `David`
     - **Last Name**: `Chen`
     - **Email**: `david.chen@stjude.ems.local`
     - **Phone**: `+1-555-019-5566`
     - **Occupation**: `Research Scientist`
     - **Address**: `742 Evergreen Terrace, Springfield`
  4. Submit form. Redirects to `/parents/[id]`.
  5. On the parent profile page, click **Link Student Ward**.
  6. Select student `Liam Chen`, choose Relationship `FATHER`, check `Primary Contact`.
  7. Click **Confirm Student Link**.
- **Expected Result**: Relationship is created in PostgreSQL with status `PENDING`.

---

## Test Scenario B: Relationship Verification & Revocation
- **URL**: `http://localhost:3000/parents/[id]`
- **Steps**:
  1. On David Chen's profile page, locate the linked student card for `Liam Chen`.
  2. Notice the yellow badge: `PENDING VERIFICATION`.
  3. Click the **Verify** button.
  4. Confirm verification in modal. Status updates immediately to `VERIFIED` with green badge.
  5. Click **Revoke Relationship** and confirm.
  6. Status changes to `REVOKED` with red badge.
  7. Click **Re-Verify** to restore the verified status.
- **Expected Result**: Guardian relationship status transitions correctly between PENDING, VERIFIED, and REVOKED, and logs an institutional audit entry.

---

## Test Scenario C: Parent Dashboard & Multi-Child Switching
- **URL**: `http://localhost:3000/parent/dashboard`
- **Steps**:
  1. Log in as **Parent** (`parent@stjude.ems.local` / `Password123!`).
  2. Navigate to `http://localhost:3000/parent/dashboard`.
  3. Observe the **Selected Child** switcher at the top:
     - Displays two verified wards: **Liam Chen** and **Sophia Chen**.
  4. While **Liam Chen** is selected:
     - Shows Class: `Grade 10 — Section A`
     - Room: `Room 101`
     - Timetable: Shows 7 weekly classes (Advanced Mathematics, AP Physics).
  5. Switch active child to **Sophia Chen**:
     - Shows Class: `Grade 11 — Section B`
     - Room: `Room 102`
     - Timetable updates instantly to Sophia's enrolled section schedule.
- **Expected Result**: Smooth, zero-refresh switching between multiple children with distinct academic enrollments and schedules.

---

## Test Scenario D: Revoked Relationship Immediate Access Denial
- **URL**: `http://localhost:3000/parent/dashboard`
- **Steps**:
  1. Log in as **School Admin** (`admin@stjude.ems.local` / `Password123!`).
  2. Navigate to `http://localhost:3000/parents`. Open **Sarah Chen**'s profile.
  3. In the linked students list, click **Revoke** on `Sophia Chen`.
  4. Log out and log back in as **Parent** (`parent@stjude.ems.local` / `Password123!`).
  5. Navigate to `http://localhost:3000/parent/dashboard`.
  6. Check the child switcher: `Sophia Chen` is completely removed from the list.
  7. Attempting to access Sophia's ID directly returns a 403 / access restricted response.
- **Expected Result**: Revoked guardian links immediately remove access to student records and timetables.

---

## Test Scenario E: Academic Year, Class & Section Creation
- **URL**: `http://localhost:3000/academic-years` & `http://localhost:3000/classes`
- **Steps**:
  1. Log in as **School Admin** (`admin@stjude.ems.local` / `Password123!`).
  2. Open `/academic-years`:
     - Verify active session `2026-2027` with green `Active Session` badge.
     - Click **Create Academic Session**, enter name `2027-2028`, start date `2027-09-01`, end date `2028-06-30`, submit.
  3. Open `/classes`:
     - Click **Create Class**, enter Name: `Grade 12`, Code: `G12`. Submit.
  4. Open `/classes/[id]` for Grade 12:
     - Click **Add Section**, enter Name: `Section A`, Room: `Room 201`, Capacity: `30`.
- **Expected Result**: Academic year, class, and section entities are created and isolated by school.

---

## Test Scenario F: Faculty Assignment & Student Class Enrollment
- **URL**: `http://localhost:3000/classes/[id]`
- **Steps**:
  1. As School Admin, open `Grade 10` details at `/classes/[id]`.
  2. Switch to **Faculty Assignments** tab:
     - Verify `Marcus Holloway` is assigned to `Advanced Mathematics` and `AP Physics`.
  3. Switch to **Enrolled Students** tab:
     - Verify `Liam Chen` is enrolled with Roll # `1001`.
     - Click **Enroll Student**, select another student from dropdown, enter Roll # `1002`, submit.
- **Expected Result**: Students are enrolled and faculty members are assigned to specific sections with atomic database transactions.

---

## Test Scenario G: Weekly Timetable Creation
- **URL**: `http://localhost:3000/timetable`
- **Steps**:
  1. As School Admin, navigate to `/timetable`.
  2. Filter by `Grade 10 - Section A`.
  3. View the 5-day schedule grid (Monday through Friday).
  4. Click **+ Add Period**:
     - Day: `WEDNESDAY`
     - Subject: `World Literature`
     - Teacher: `Marcus Holloway`
     - Start Time: `14:00`
     - End Time: `14:50`
     - Room: `Room 101`
  5. Click **Create Schedule Entry**.
- **Expected Result**: Period card appears on Wednesday at 14:00 in Section A's timetable grid.

---

## Test Scenario H: Scheduling Conflict Prevention Engine
- **URL**: `http://localhost:3000/timetable`
- **Steps**:
  1. While viewing `/timetable`, click **+ Add Period**.
  2. **Test Teacher Overlap**:
     - Attempt to schedule `Marcus Holloway` on `MONDAY` from `08:30` to `09:20` in `Section B`.
     - (Note: Marcus is already teaching Advanced Mathematics in Section A at this exact time).
     - Click **Create Schedule Entry**.
     - Verify error toast/alert: **"Scheduling conflict: Teacher is already scheduled for another class during this time period."**
  3. **Test Section Overlap**:
     - Attempt to schedule a second subject for `Section A` on `MONDAY` from `08:30` to `09:20`.
     - Verify error: **"Scheduling conflict: This section already has a class scheduled during this time period."**
  4. **Test Room Overlap**:
     - Attempt to schedule `Section B` in `Room 101` on `MONDAY` from `08:30` to `09:20`.
     - Verify error: **"Scheduling conflict: Room 101 is already booked during this time period."**
- **Expected Result**: The engine strictly enforces all 3 scheduling collision constraints and rejects conflicting entries.

---

## Test Scenario I: Teacher's Dedicated Timetable View
- **URL**: `http://localhost:3000/timetable`
- **Steps**:
  1. Log in as **Teacher** (`teacher@stjude.ems.local` / `Password123!`).
  2. Navigate to `http://localhost:3000/timetable`.
  3. Verify the view defaults to Marcus Holloway's assigned teaching schedule across all classes.
  4. Notice the **+ Add Period** and schedule edit/delete controls are hidden.
- **Expected Result**: Teachers have a clear read-only view of their weekly commitments across all sections.

---

## Test Scenario J: Student's Dedicated Timetable View
- **URL**: `http://localhost:3000/timetable`
- **Steps**:
  1. Log in as **Student** (`student@stjude.ems.local` / `Password123!`).
  2. Navigate to `http://localhost:3000/timetable`.
  3. Verify the schedule shows only Liam Chen's enrolled Section A classes:
     - Monday 08:30: Advanced Mathematics
     - Monday 09:30: AP Physics
     - Tuesday 08:30: Advanced Mathematics
     - etc.
  4. Administrative controls are hidden.
- **Expected Result**: Student sees their personalized timetable according to section enrollment.

---

## Test Scenario K: Parent-Visible Child Timetable
- **URL**: `http://localhost:3000/parent/dashboard`
- **Steps**:
  1. Log in as **Parent** (`parent@stjude.ems.local` / `Password123!`).
  2. Open `/parent/dashboard`.
  3. Under **Weekly Academic Schedule**:
     - Period cards display subject, assigned teacher, and room.
     - Switch from Liam to Sophia; schedule dynamically updates to Sophia's Section B courses.
- **Expected Result**: Verified parents have live access to their children's real schedules without leaking unlinked students.

---

## Test Scenario L: Cross-School Tenant Access Denial
- **URL**: `http://localhost:3000/parents` & `http://localhost:3000/classes`
- **Steps**:
  1. Log in as **School Admin (School B)** (`admin@apex.ems.local` / `Password123!`).
  2. Navigate to `/parents`.
     - Verify St. Jude parents (Sarah Chen, David Chen) are NOT visible.
  3. Navigate to `/classes`.
     - Verify St. Jude classes (Grade 10, Grade 11) are NOT visible.
  4. Try requesting a St. Jude class ID directly via API or URL.
     - Receives 404 / 403 School Isolation error.
- **Expected Result**: School isolation strictly maintained across all parent, academic, and timetable data.

---

## Test Scenario M: Mobile Responsiveness & Theme Testing
- **URL**: `http://localhost:3000/parent/dashboard` & `http://localhost:3000/timetable`
- **Steps**:
  1. Toggle system theme from Light to Dark mode using the theme switcher.
  2. Verify:
     - Schedule grid contrast and readability.
     - Cards, tables, badges, and modals have clean dark palette styling.
  3. Open Developer Tools and toggle Mobile Device Emulation (e.g. iPhone 14 or Pixel 7, 390px width):
     - Child switcher buttons wrap cleanly.
     - Timetable switches to day tabs or horizontal scroll without horizontal page breakage.
- **Expected Result**: Flawless responsive layout and dark/light contrast across desktop and mobile viewports.

---

# Manual Testing Guide — TASK 008: Institutional Attendance Management & NFC Simulation

## Test Scenario A: School Admin Creates Attendance Session
- **URL**: `http://localhost:3000/attendance/sessions/new`
- **Steps**:
  1. Log in as **School Admin** (`admin@stjude.ems.local` / `Password123!`).
  2. Navigate to **Attendance** in the sidebar or go to `http://localhost:3000/attendance`.
  3. Click **Start Attendance Register** (`/attendance/sessions/new`).
  4. Select Class Section: `Grade 10 — Section A`.
  5. Select Attendance Date: Today's date (`2026-10-13`).
  6. Select Session Type: `Daily Full Register`.
  7. Click **Create Attendance Register**.
- **Expected Result**: Session is created in PostgreSQL with status `DRAFT` and redirects directly to `/attendance/sessions/[id]`.

---

## Test Scenario B: Assigned Teacher Marks Attendance
- **URL**: `http://localhost:3000/attendance/sessions/[id]`
- **Steps**:
  1. Log in as **Assigned Teacher** Marcus Holloway (`teacher@stjude.ems.local` / `Password123!`).
  2. Open the attendance register created for Grade 10 Section A.
  3. Verify the enrolled roster shows students (e.g. Liam Chen).
  4. Click the quick button **Mark All Present** to rapidly set everyone to `PRESENT`.
  5. For Liam Chen, switch status to `LATE` and enter remark: `"Arrived 10 minutes late due to transit delay."`.
  6. Click **Save Attendance Register**.
- **Expected Result**: Success banner appears: `"Attendance register saved successfully"`.

---

## Test Scenario C: Teacher Finalizes Register
- **URL**: `http://localhost:3000/attendance/sessions/[id]`
- **Steps**:
  1. On the saved register page, click **Finalize & Lock Register**.
  2. A confirmation modal appears warning that finalizing locks ordinary modifications.
  3. Click **Confirm Finalization**.
- **Expected Result**: Status badge changes from amber `DRAFT` to emerald `FINALIZED`. Inputs are locked in read-only mode for the teacher.

---

## Test Scenario D: Persistence After Page Refresh
- **URL**: `http://localhost:3000/attendance/sessions/[id]`
- **Steps**:
  1. Hard refresh the page (`Ctrl + F5`).
  2. Verify:
     - Register status remains `FINALIZED`.
     - Liam Chen's status is still `LATE`.
     - Remark text remains `"Arrived 10 minutes late due to transit delay."`.
- **Expected Result**: Live data is fully persisted in PostgreSQL and reloads without loss.

---

## Test Scenario E: Unassigned Teacher Denied Access
- **URL**: `http://localhost:3000/attendance/sessions/[id]`
- **Steps**:
  1. Log in as **Unassigned Teacher** Sophia Rodriguez (`teacher@apex.ems.local` or an unassigned faculty account).
  2. Attempt to open or mark the Grade 10 Section A register.
- **Expected Result**: Route or API blocks with `403 Forbidden` ("You are not assigned to instruct or manage this class section").

---

## Test Scenario F: Student Sees Own Attendance
- **URL**: `http://localhost:3000/attendance`
- **Steps**:
  1. Log in as **Student** Liam Chen (`student@stjude.ems.local` / `Password123!`).
  2. Navigate to `/attendance`.
  3. Observe the student portal:
     - Attendance rate gauge (e.g. `100%` presence).
     - Breakdown cards: Days Present, Days Absent, Late / Excused.
     - Chronological attendance records table displaying session date, class, status badge (`LATE`), and teacher remarks.
  4. Notice that editing/marking buttons are completely absent.
- **Expected Result**: Student has clean, read-only visibility into their own attendance history.

---

## Test Scenario G: Parent Sees Linked Child Attendance
- **URL**: `http://localhost:3000/attendance`
- **Steps**:
  1. Log in as **Parent** Sarah Chen (`parent@stjude.ems.local` / `Password123!`).
  2. Open `/attendance`.
  3. The page displays the **Select Ward** switcher with verified children: **Liam Chen** and **Sophia Chen**.
  4. With Liam Chen selected, observe his attendance percentage, presence counts, and recent sessions.
  5. Click on **Sophia Chen**; metrics and history immediately update to Sophia's personal attendance records.
- **Expected Result**: Verified parent can seamlessly monitor attendance for each of their linked children.

---

## Test Scenario H: Parent Cannot See Unrelated Student
- **URL**: `http://localhost:3000/attendance/students/[unrelatedStudentId]`
- **Steps**:
  1. While logged in as Sarah Chen (`parent@stjude.ems.local`), attempt to navigate to a student history endpoint for an unverified/unlinked student.
- **Expected Result**: API returns `403 Forbidden` ("Access denied to attendance records for this student").

---

## Test Scenario I: Attendance Reports Show Correct Real Percentages
- **URL**: `http://localhost:3000/attendance/reports`
- **Steps**:
  1. Log in as **School Admin** (`admin@stjude.ems.local` / `Password123!`).
  2. Open `/attendance/reports`.
  3. Select Class Section: `Grade 10 — Section A`.
  4. Observe the institutional summary:
     - Total Sessions: Real count from database.
     - Presence Rate %: Correct calculation `(Present + Late) / Total * 100`.
     - Status distribution: Exact counts of Present, Absent, Late, Excused.
  5. Click **Export to CSV**.
  6. Verify the downloaded `.csv` file contains matching headers and student rows.
- **Expected Result**: Zero fabrication; metrics, charts, and exports derive strictly from real database records.

---

## Test Scenario J: NFC Simulation Accepts Valid Scan
- **URL**: `http://localhost:3000/attendance/nfc-simulator`
- **Steps**:
  1. Log in as **School Admin** (`admin@stjude.ems.local` / `Password123!`).
  2. Open `/attendance/nfc-simulator`.
  3. In the provision card, provision card token `NFC-STJUDE-1001` for student Liam Chen (or use the pre-seeded active card).
  4. Select an active attendance session for Grade 10 Section A.
  5. In the Card Scanner simulation input, enter `NFC-STJUDE-1001`.
  6. Click **Simulate Card Tap**.
- **Expected Result**: Green success card appears: `"Scan Accepted: Attendance recorded for Liam Chen (Status: PRESENT)"`.

---

## Test Scenario K: NFC Rejects Duplicate & Invalid Scans
- **URL**: `http://localhost:3000/attendance/nfc-simulator`
- **Steps**:
  1. Immediately tap `NFC-STJUDE-1001` a second time for the same session.
  2. Observe result banner: Status `DUPLICATE` ("Student attendance is already recorded for this session").
  3. Enter an unregistered token: `NFC-UNKNOWN-9999` and tap.
  4. Observe result banner: Status `REJECTED` ("Unknown or unregistered NFC token").
  5. Review the **Recent NFC Scan Events** table below to see logged audit entries with timestamps.
- **Expected Result**: Anti-duplicate logic protects registers; unauthorized cards are rejected and audited safely.

---

## Test Scenario L: Cross-School Access Denied
- **URL**: `http://localhost:3000/attendance`
- **Steps**:
  1. Log in as **School Admin (School B)** (`admin@apex.ems.local` / `Password123!`).
  2. Navigate to `/attendance`.
  3. Verify that St. Jude sessions and classes are NOT visible in the sessions register or filters.
  4. Attempt to query a St. Jude session ID directly via `/attendance/sessions/[stJudeSessionId]`.
- **Expected Result**: Direct access is rejected with `404 / 403` School Tenant Isolation error.

---

## Test Scenario M: Mobile Responsiveness & Theme Testing
- **URL**: `http://localhost:3000/attendance` & `http://localhost:3000/attendance/nfc-simulator`
- **Steps**:
  1. Toggle system theme from Light to Dark mode using the theme switcher.
  2. Verify:
     - Register table, radio buttons, and status pill badges maintain clear contrast.
     - NFC scan terminal has polished dark styling.
  3. Open Developer Tools and emulate mobile viewport (iPhone 14, 390px width):
     - Roster displays cards gracefully on narrow screens.
     - Bulk marking toolbar wraps cleanly without horizontal overflow.
- **Expected Result**: Flawless responsive layout and dark/light contrast across desktop and mobile viewports.

---

# TASK 009 — GRADES & ACADEMIC PERFORMANCE TEST CASES

## Test Scenario N: Assessment Categories & Weighting Distribution
- **URL**: `http://localhost:3000/grades/categories`
- **Steps**:
  1. Log in as **School Admin** (`admin@stjude.ems.local` / `Password123!`).
  2. Navigate to `/grades/categories`.
  3. Verify seeded categories:
     - Quiz (10%)
     - Assignment (15%)
     - Midterm Exam (25%)
     - Final Exam (35%)
     - Project Work (15%)
  4. Inspect the cumulative weighting distribution bar at the top (shows 100% Balanced in emerald).
  5. Click **Add Category**, fill in `Laboratory Practicum`, weight `5%`, and save.
- **Expected Result**: Category creates smoothly, cumulative percentage recalculates, and weights enforce academic validation.

---

## Test Scenario O: Teacher Assessment Creation & Assignment Authorization
- **URL**: `http://localhost:3000/grades/assessments/new`
- **Steps**:
  1. Log in as **Teacher** (`teacher@stjude.ems.local` / `Password123!`).
  2. Navigate to `/grades/assessments/new`.
  3. Enter:
     - Title: `Calculus Derivatives Pop Quiz`
     - Class Section: `Grade 10 — Section A`
     - Subject: `Advanced Mathematics`
     - Category: `Quiz (10%)`
     - Maximum Marks: `50`
     - Assessment Date: Today's date
  4. Click **Create & Open Gradebook**.
- **Expected Result**: Assessment initializes in `DRAFT` status and immediately opens the classroom gradebook with enrolled students pre-populated.

---

## Test Scenario P: Teacher Grade Entry, Live Calculations & Missing Marks Handling
- **URL**: `http://localhost:3000/grades/assessments/[id]/gradebook`
- **Steps**:
  1. In the Gradebook table, view the roster of enrolled students.
  2. Enter marks:
     - Student 1 (Liam Chen): `45` (Observe live calculation: `90%`, Grade `A+`)
     - Student 2 (Sophia Chen): `38` (Observe live calculation: `76%`, Grade `B+`)
     - Student 3 (Noah Patel): `0` (Observe zero score handled: `0%`, Grade `F`)
     - Student 4 (Olivia Kim): Leave input empty (Observe displayed as `Missing`, excluded from earned/possible class averages).
  3. Enter feedback: `Exemplary calculus application` for Liam.
  4. Click **Save Draft**.
  5. Refresh page: verify saved scores and feedback remain identical.
- **Expected Result**: Bulk grade entry saves atomically via database transaction; zero scores and missing grades are strictly distinguished.

---

## Test Scenario Q: Assessment Publishing & Audited Grade Corrections
- **URL**: `http://localhost:3000/grades/assessments/[id]/gradebook`
- **Steps**:
  1. With draft marks entered, click **Publish Results**.
  2. Confirm publication in the dialog prompt.
  3. Observe status pill switches to `PUBLISHED` in emerald.
  4. Notice warning banner appears: "Audited Workflow: This assessment is already published."
  5. Correct a grade (e.g. change Liam from `45` to `48`) and click **Save Draft**.
- **Expected Result**: Assessment transitions to PUBLISHED; subsequent grade corrections generate an immutable `PUBLISHED_GRADES_MODIFIED` audit log.

---

## Test Scenario R: Student Portal Self-Service Results & GPA Standing
- **URL**: `http://localhost:3000/grades` & `http://localhost:3000/grades/students/[studentId]`
- **Steps**:
  1. Log in as **Student** (`student1@stjude.ems.local` / `Password123!`).
  2. Navigate to `/grades`.
  3. Verify:
     - Liam's Cumulative GPA (e.g., `3.90`) and Overall Weighted Standing (`92%`, `A+`).
     - Subject badges for Mathematics, Physics, English, CS.
     - Assessment Performance Trend line chart showing published test history.
  4. Open `/grades/students/[studentId]` to inspect the full printable report card.
  5. Verify draft assessments are strictly HIDDEN from student view.
- **Expected Result**: Student views only their own published grades and GPA without any draft assessment leakage.

---

## Test Scenario S: Student Authorization Barrier (Cannot View Peer Results)
- **URL**: `http://localhost:3000/grades/students/[peerStudentId]`
- **Steps**:
  1. While logged in as Student 1 (`student1@stjude.ems.local`), attempt to navigate directly to Student 2's report card (`student2@stjude.ems.local` ID).
- **Expected Result**: Access is blocked with an error / 403 Forbidden ("Access restricted").

---

## Test Scenario T: Parent Portal Multi-Child Gradebook & Relationship Verification
- **URL**: `http://localhost:3000/grades`
- **Steps**:
  1. Log in as **Parent** (`parent@stjude.ems.local` / `Password123!`).
  2. Navigate to `/grades`.
  3. Observe the child switcher:
     - **Liam Chen** (`Grade 10 — Section A`): GPA `3.90`, overall `92%`.
     - **Sophia Chen** (`Grade 11 — Section B`): GPA `3.50`, overall `84%`.
  4. Switch between children: verify academic cards, subject breakdowns, and trend charts update dynamically.
  5. Click **Open Detailed Academic Card** for Liam to see itemized teacher feedback.
- **Expected Result**: Parent can view verified linked children's published grades seamlessly.

---

## Test Scenario U: School Tenant Isolation Barrier
- **URL**: `http://localhost:3000/grades/assessments`
- **Steps**:
  1. Log in as **School Admin (School B - Apex STEM)** (`admin@apex.ems.local` / `Password123!`).
  2. Navigate to `/grades/assessments`.
  3. Verify that only Apex STEM assessments (Chemistry, Astrophysics, Data Structures) are listed.
  4. St. Jude assessments are completely absent.
  5. Attempt to access a St. Jude assessment ID directly.
- **Expected Result**: Direct cross-school access is rejected with `403 Forbidden`.

---

## Test Scenario V: Institutional Class Reports & Real Data Visualizations
- **URL**: `http://localhost:3000/grades/reports`
- **Steps**:
  1. Log in as **School Admin** (`admin@stjude.ems.local` / `Password123!`).
  2. Navigate to `/grades/reports`.
  3. Select Class Section `Grade 10 — Section A`.
  4. Verify:
     - KPI Cards: Class Average %, Cohort Pass Rate %, Highest Score %, Total Graded Students.
     - **Subject Performance Bar Chart**: Real interactive bars showing Mathematics, Physics, English, CS averages.
     - **Letter Grade Distribution**: Histogram bins for A+, A, B+, B, C, D, F.
     - **Student Performance Rankings Table**: Ranked student roster with overall percentages and report card links.
  5. Click **Export CSV** and verify the downloaded file contains accurate tabular records.
- **Expected Result**: Class performance analytics calculate genuine aggregates from database records and export cleanly.

---

## Test Scenario W: Grading Scales Configuration
- **URL**: `http://localhost:3000/grades/scales`
- **Steps**:
  1. Log in as **School Admin** (`admin@stjude.ems.local` / `Password123!`).
  2. Navigate to `/grades/scales`.
  3. Verify the tier table:
     - A+ (90.0% - 100.0%, 4.00 GPA)
     - A (80.0% - 89.9%, 3.70 GPA)
     - B+ (70.0% - 79.9%, 3.30 GPA)
     - B (60.0% - 69.9%, 3.00 GPA)
     - C (50.0% - 59.9%, 2.00 GPA)
     - D (40.0% - 49.9%, 1.00 GPA)
     - F (0.0% - 39.9%, 0.00 GPA)
  4. Click **Edit Tier** on B+ and adjust min percentage if needed.
- **Expected Result**: Grading scale tiers update smoothly and govern student letter grade assignments.

---

## Test Scenario X: Idempotent Development Seed Verification
- **Command**: `npx ts-node prisma/seed.ts`
- **Steps**:
  1. In terminal, run `npx ts-node prisma/seed.ts`.
  2. Run the command a second time.
  3. Inspect PostgreSQL counts: verify no duplicate schools, teachers, students, parents, assessments, or grades were created.
- **Expected Result**: Seed script completes with exit code 0 repeatedly, preserving stable identifiers and zero duplicates.





