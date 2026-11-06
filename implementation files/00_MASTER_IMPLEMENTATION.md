# SentinelMesh AI — Master Implementation Plan

## Purpose
This is the entry point for implementing SentinelMesh AI as a coordinated team project. Read this file first, then use the relevant module guide for each workstream.

**Product:** SentinelMesh AI  
**Tagline:** Detect. Investigate. Repair. Verify.

SentinelMesh AI is a multi-agent software incident detection, investigation, repair, and verification system. It collects incident evidence, investigates likely causes, proposes a minimal patch, requires human approval, applies the approved patch in an isolated environment, and independently verifies the result with tests.

## Core workflow
1. Incident is created or detected.
2. Observer collects logs, error details, and available service-health evidence.
3. Investigator analyzes evidence and source/configuration context.
4. Repair proposes a minimal, reviewable patch.
5. A human approves or rejects the patch.
6. An approved patch is applied only in a restricted sandbox.
7. Verifier runs independent regression tests.
8. The system reports verified recovery or failed verification.

## Read these guides
- `01_SETUP_AND_REPOSITORY.md` — tools, environment, repository, team workflow.
- `02_BACKEND_IMPLEMENTATION.md` — FastAPI backend and API contracts.
- `03_DATABASE_IMPLEMENTATION.md` — MongoDB collections and persistence.
- `04_AI_AGENTS_IMPLEMENTATION.md` — Observer, Investigator, Repair, Verifier.
- `05_ORCHESTRATOR_LANGGRAPH.md` — workflow state and agent orchestration.
- `06_SANDBOX_IMPLEMENTATION.md` — restricted patch execution.
- `07_FRONTEND_IMPLEMENTATION.md` — dashboard and user interface.
- `08_TESTING_AND_VERIFICATION.md` — pytest, regression testing, acceptance criteria.
- `09_INTEGRATION_AND_DEMO.md` — connecting modules and preparing the demo.

## Team roles for five members
| Member | Primary ownership | Pairing/support |
|---|---|---|
| Member 1 — stronger | Backend and API contracts | Guides demo-app/testing member |
| Member 2 — stronger | AI agents and orchestration | Guides frontend member |
| Member 3 — beginner | Frontend pages and UI states | Works with Member 2 |
| Member 4 — beginner | Demo application and test cases | Works with Member 1 |
| Member 5 — beginner | Database, audit records, documentation | Works with both leads |

Roles are ownership areas, not silos. Everyone should understand the end-to-end workflow.

## Build priorities
### P0 — must work for the MVP
- One demo FastAPI application with one reproducible failure.
- Incident creation and evidence storage.
- Observer and Investigator produce useful outputs from real evidence.
- Repair proposes a patch in a constrained format.
- Human approval is required.
- Approved patch is applied in a restricted environment.
- Verifier runs real tests and reports their results.
- UI shows the workflow and clearly distinguishes demo data from live data.

### P1 — add if P0 is stable
- Audit history.
- Better filtering and incident history.
- More than one demo failure.
- Improved agent status and error handling.

### Not required for the first MVP
- User login or Google OAuth.
- Multi-tenant access control.
- Production server monitoring.
- Training a custom model.
- Multiple LLM providers.
- Support for many programming languages.
- Arbitrary shell-command execution.

## Critical engineering rules
- Do not invent completed functionality. Label planned, mock, and live features accurately.
- Do not put LLM keys or database credentials in frontend code or Git.
- Never let the Repair agent execute code directly on the developer's Windows host.
- Require human approval before patch application.
- Run patches only in a restricted sandbox.
- The Verifier must use actual test execution, not an LLM's self-assessment.
- Approval, application, and verification are separate states.
- Keep the project runnable after each change; integrate frequently.

## Suggested build sequence
1. Establish repository, environment, and shared data contracts.
2. Build the demo application and tests.
3. Build backend incident APIs and database persistence.
4. Implement each agent individually.
5. Implement the LangGraph workflow.
6. Implement the restricted sandbox.
7. Complete the frontend workflow.
8. Integrate and test the end-to-end demo.

## Definition of MVP success
A team member can trigger a known failure, view collected evidence, see an evidence-backed diagnosis, inspect a proposed patch, approve it, have it applied in an isolated environment, and see independently executed tests confirm success or failure.
