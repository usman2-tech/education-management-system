# AGENTS.md — PERMANENT AGENTIC & ARCHITECTURAL DIRECTIVES
## Educational Management System (EMS)

This document contains permanent rules and conventions governing all AI agents and contributors working on the Educational Management System repository.

---

## 1. CORE OPERATIONAL PHILOSOPHY
- **Modular Monolith**: We build an enterprise-ready institutional platform with high modularity and clean separation of concerns.
- **Incremental Delivery**: Never attempt to build the entire system at once. We build module by module, verify each module, commit, test manually, and await user approval before proceeding.
- **Zero Fabrication**: Never present fake dashboard statistics or placeholder numbers as real data. If a module lacks data, show clean empty states or real seed fixtures.
- **Enterprise Security**: School-level data isolation, role-based access control (RBAC), parameter validation, and secure inter-service communication are mandatory.
- **No Direct Push to Production**: Never merge unapproved features to `main` branch.

---

## 2. EXPLANATION AND DOCUMENTATION REQUIREMENTS

### Before Starting Any New Module
Briefly explain:
1. **What the module does.**
2. **Why we need it.**
3. **Which files will be created or modified.**
4. **How it connects to other modules.**
5. **How we will test it.**

### Module Code Header Convention
Add a concise documentation comment at the beginning of each main module entry file:

```typescript
/**
 * MODULE: [Module Name]
 *
 * PURPOSE:
 * [Short description of module responsibilities]
 *
 * DEPENDENCIES:
 * [Associated core modules, services, or packages]
 *
 * SECURITY:
 * [Isolation boundary, roles, or multi-tenant scope]
 */
```

### Explaining Logic
- For complex business logic, add concise comments explaining **WHY** the logic exists.
- Avoid obvious redundant comments (e.g., `// set x to 1`).

### After Completing Each Feature
Explain:
- What was implemented
- How it works
- Important files
- Database changes
- API endpoints
- UI pages
- How the user can manually test it
- Known limitations

---

## 3. GIT AND GITHUB PROTOCOL

### Branching Strategy
- `main`: Production-ready, fully tested, approved releases.
- `develop`: Integrated development branch.
- `feature/*`: Specific feature branches (e.g., `feature/TASK-001-foundation`, `feature/TASK-002-auth-rbac`).

### Step-by-Step Task Delivery Loop
1. Create a feature branch from `develop`.
2. Implement the designated feature/task only.
3. Run automated tests (linting, typechecks, unit/integration tests).
4. Fix any discovered errors immediately.
5. Commit changes with semantic commit messages.
6. Push the feature branch to GitHub.
7. Provide the user with a comprehensive manual testing guide.
8. Wait for explicit user review and approval.
9. Upon approval, merge into `develop` and push.
10. Never force push, delete remote branches, or overwrite history.

---

## 4. ARCHITECTURAL & ENGINEERING PRINCIPLES

1. **Modular Architecture**: High cohesion, low coupling between business domains.
2. **Separation of Concerns**: Strict boundary between presentation, application/domain, and persistence layers.
3. **Strict TypeScript Typing**: No `any` escapes in production code contracts.
4. **Consistent API Contracts**: Shared DTOs and interfaces in `packages/contracts`.
5. **School-Level Isolation**: Every school tenant's data must remain scoped by `schoolId`.
6. **Robust Validation**: `class-validator` / `class-transformer` on NestJS APIs; `Zod` on Next.js forms; `Pydantic` on FastAPI.
7. **Graceful Error Handling**: Global HTTP exception filters returning standardized envelopes.
8. **No Hardcoded Secrets**: All configuration loaded via typed environment variables.
9. **Separate AI Service**: FastAPI AI microservice isolated from NestJS core; NestJS remains the authorizer for all business operations.
10. **Clean Testing**: Verify passing unit/integration tests before reporting completion.

---

## 5. DOCUMENTATION DIRECTORY STRUCTURE

Maintain and update documentation as modules evolve:
- `README.md`: Quickstart, architecture overview, running instructions.
- `AGENTS.md`: This permanent directive.
- `docs/architecture/`: High-level system blueprints, sequence diagrams, integration contracts.
- `docs/database/`: ERDs, data dictionaries, migration records.
- `docs/modules/`: Individual module specifications and state definitions.
- `docs/implementation-log/`: Chronological audit log of completed tasks and decisions.
- `docs/testing/manual-test-cases.md`: User-facing verification test suites.
- `docs/testing/automated-test-results.md`: Recorded CI and test run reports.
- `docs/project-progress.md`: Roadmap tracking status (PLANNED -> IN PROGRESS -> AUTOMATED TESTED -> AWAITING MANUAL TEST -> APPROVED -> MERGED).
