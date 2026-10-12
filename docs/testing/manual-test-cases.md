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



