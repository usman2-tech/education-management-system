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
