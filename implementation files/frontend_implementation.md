SentinelMesh AI — Frontend Implementation Guide
Purpose: Use this document as the implementation specification for the existing SentinelMesh AI frontend.

Important: The UI has already been designed in Google Stitch and implemented in Antigravity. Do not redesign it from scratch. Inspect the existing project first, preserve its visual identity, and make targeted changes so the website matches the requirements below.

1. Instructions for Antigravity
Work directly in the existing repository.

Before changing anything:
1. Inspect the complete frontend folder structure.
2. Identify the framework, build tool, styling system, routing library, and existing components.
3. Run the current application and inspect the existing pages.
4. Identify which screens and interactions are already implemented.
5. Reuse existing components and styles wherever possible.
Non-negotiable rules
- Preserve the existing Stitch design, layout, colors, typography, spacing, and visual style unless a requirement below explicitly needs a small adjustment.
- Do not replace the application with a generic admin template.
- Do not delete working components just to rebuild them.
- Do not introduce a new framework or styling library without a strong technical reason.
- Do not add a login or registration page for the MVP.
- Do not claim that an AI agent, API, database, patch application, Docker sandbox, or test runner is working unless it is actually connected and tested.
- Keep the frontend modular, responsive, and maintainable.
- Use TypeScript types for API data and component props if the project uses TypeScript.
- Keep secrets and API keys out of frontend code.
- After changes, run the available lint, type-check, and build commands. Fix errors introduced by the changes.
If the current implementation differs from this specification, first explain the differences and then make the smallest safe changes needed.
2. Product overview
Product: SentinelMesh AI
Tagline: Detect. Investigate. Repair. Verify.

SentinelMesh AI is a multi-agent software incident detection, investigation, repair, and verification platform.

Its workflow is:
1. Detect a software incident and collect evidence.
2. Investigate the likely root cause using logs and source/configuration context.
3. Generate a minimal, reviewable code patch.
4. Ask a human to approve or reject the proposed patch.
5. Execute an approved patch in an isolated environment.
6. Run independent regression tests.
7. Report verified recovery or failed verification.
The four specialized agents are:
Agent	Responsibility
Observer	Detects failures and collects logs, errors, and service-health evidence.
Investigator	Analyzes evidence and identifies probable root causes.
Repair	Proposes a minimal patch and explains the change.
Verifier	Runs tests independently and reports pass/fail results.


The product's key differentiator is evidence-backed repair with human approval and independent verification. The interface should make this clear.
3. Application navigation
Use the existing sidebar and top navigation from the Stitch implementation.

The main navigation should provide these destinations:
1. Overview
2. Incidents
3. AI Agents
4. Patch Review
5. Verification
6. Audit Logs
7. Settings
Keep navigation consistent across all pages. The active page must be visually highlighted. Sidebar behavior should work on smaller screens, using a collapsible drawer or another pattern consistent with the existing design.

Do not add authentication screens. Open directly into the dashboard/demo environment.
4. Required pages and behavior
4.1 Overview dashboard
Purpose: Give developers a quick view of the incident and recovery state.

Include:
- Total incidents
- Active incidents
- Successfully recovered incidents
- Pending approvals
- Incident trend visualization
- Incident severity distribution
- Recent incidents table
- Recent agent activity
- Overall system/service status
Use clearly marked demo data while the backend is not connected.

Recent incidents should show:
- Incident ID
- Application/service
- Short error description
- Severity
- Status
- Detection time
- Link/action to open incident details
The dashboard must not display fabricated live metrics as if they came from a real monitoring system. Use a visible Demo data or Sample data label where appropriate.
4.2 Incidents page
Include:
- Incident list/table
- Search by incident ID, application, or error text
- Filters for severity and status
- Sort by detection time
- Clear empty state
- Loading and error states
- Action to open incident details
- A Simulate Incident action for the local demo
Suggested severity values:
- Critical
- High
- Medium
- Low
Suggested incident statuses:
- Detected
- Investigating
- Awaiting approval
- Approved
- Verifying
- Recovered
- Failed
- Rejected
The Simulate Incident button should create a clearly identified demo incident. If no backend endpoint exists yet, use a local mock service and label the result as simulated. Do not silently pretend that a real server incident was detected.
4.3 Incident details page
This is the most important page in the product.

Display:

Incident summary
- Incident ID
- Incident title/description
- Application/service
- Severity
- Current status
- Detection timestamp
Evidence
- Error message
- Stack trace
- Relevant application logs
- Timestamp
- Service-health information, if available
Investigation
- Probable root cause
- Investigator explanation
- Relevant source file and line, if available
- Evidence supporting the diagnosis
- Confidence score only if the backend provides one
Agent activity timeline
- Observer detected the incident
- Investigator analyzed evidence
- Repair generated a patch
- Human approval requested
- Verifier executed tests
- Final result recorded
Each timeline entry should show its status and timestamp when available. Do not invent timestamps for real backend events.

Proposed repair
- File path
- Code diff with additions and deletions
- Explanation of the proposed change
- Approve Patch action
- Reject Patch action
Verification
- Test names
- Passed/failed/skipped counts
- Execution duration
- Failure output where applicable
- Final verification status
The page should clearly distinguish:
- Proposed patch
- Approved patch
- Patch applied in sandbox
- Patch verified successfully
These are different states and must not be shown as interchangeable.
4.4 AI Agents page
Show four agent cards:
- Observer
- Investigator
- Repair
- Verifier
Each card should contain:
- Agent name and purpose
- Current state
- Latest activity
- Last run time, if available
- Relevant incident ID, if available
Use states such as:
- Idle
- Running
- Completed
- Failed
- Waiting for approval
Include a workflow visualization showing the order in which agents participate.

Do not display agents as running when there is no real execution. Use Not connected, Demo, or Idle as appropriate.
4.5 Patch Review page
Purpose: Let a human inspect and decide on proposed changes.

Include:
- Pending patch list
- Approved/rejected patch history
- Incident ID
- File path
- Patch status
- Code diff viewer
- Repair agent explanation
- Risk/impact notes if supplied by the backend
- Approve and Reject actions
Approval behavior:
1. Show the complete proposed change before approval.
2. Ask for confirmation before approving or rejecting.
3. Send the decision to the backend when an approval API exists.
4. Update the UI only after a successful response.
5. Display a useful error if the action fails.
6. Record the decision in the audit history when supported.
Important: Approving a patch must not be presented as proof that the patch was applied or verified. Those are later workflow stages.
4.6 Verification page
Display verification runs and their outcomes:
- Incident ID
- Patch ID
- Execution status
- Tests passed
- Tests failed
- Tests skipped
- Duration
- Verification time
- Final result
Use clear states:
- Queued
- Running
- Passed
- Failed
- Cancelled
- Not run
A successful result should mean the backend's independent test execution reports success. Do not let the frontend or an LLM response alone declare a repair verified.
4.7 Audit Logs page
Show a chronological, filterable record of events such as:
- Incident created/detected
- Evidence collected
- Agent started/completed/failed
- Root cause proposed
- Patch generated
- Human approval/rejection
- Sandbox execution
- Verification started/completed
- Final recovery result
Suggested columns:
- Timestamp
- Event/actor
- Action
- Incident ID
- Status
- Details
Use backend timestamps and records when connected. Mark local sample entries as demo data.
4.8 Settings page
Keep settings lightweight for the MVP.

Possible sections:
- Application information
- AI provider connection status
- Model/provider name
- Database connection status
- Sandbox status
- Notification preferences
Never expose API keys or database credentials. If configuration is not available through a secure backend endpoint, show a status or masked placeholder rather than collecting secrets in the browser.
5. User journey and UI state flow
The main incident workflow should be understandable from every relevant page:
Incident detected
       |
       v
Observer collects evidence
       |
       v
Investigator identifies probable cause
       |
       v
Repair proposes a patch
       |
       v
Human reviews the patch
       |
       +---- Reject ----> Rejected / Audit event
       |
       v Approve
Patch is sent for controlled sandbox execution
       |
       v
Verifier runs independent tests
       |
       +---- Tests fail ----> Failed verification / report
       |
       v Tests pass
Recovery verified / report
The UI must represent intermediate states accurately. In particular:
- Approval is not execution.
- Execution is not verification.
- A generated explanation is not evidence of successful recovery.
- Failed verification must remain visible and must not be displayed as success.
6. Frontend architecture
Adapt this structure to the repository that already exists. Do not force a folder restructure if a clean equivalent is already present.

A suggested React + TypeScript structure:
src/
├── assets/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   ├── dashboard/
│   ├── incidents/
│   ├── agents/
│   ├── patches/
│   ├── verification/
│   └── common/
├── pages/
│   ├── Dashboard.tsx
│   ├── Incidents.tsx
│   ├── IncidentDetails.tsx
│   ├── Agents.tsx
│   ├── PatchReview.tsx
│   ├── Verification.tsx
│   ├── AuditLogs.tsx
│   └── Settings.tsx
├── services/
│   ├── api.ts
│   └── mockApi.ts
├── types/
│   └── index.ts
├── hooks/
├── App.tsx
├── main.tsx
└── index.css
Component reuse
Create reusable components where useful:
- StatCard
- StatusBadge
- SeverityBadge
- IncidentTable
- AgentCard
- ActivityTimeline
- CodeDiffViewer
- EmptyState
- LoadingState
- ErrorState
- ConfirmDialog
Avoid duplicating the same layout and status logic across pages.
7. Backend integration contract
Inspect the actual backend before connecting the frontend. The following are proposed endpoint names, not a claim that they already exist.
Method	Proposed endpoint	Purpose
GET	/health	Backend health
GET	/api/incidents	List incidents
POST	/api/incidents	Create/register incident
GET	/api/incidents/{id}	Incident details
POST	/api/incidents/{id}/analyze	Start investigation
GET	/api/incidents/{id}/agents	Agent activity
POST	/api/incidents/{id}/approve	Approve/reject a patch
POST	/api/incidents/{id}/verify	Request verification
GET	/api/incidents/{id}/report	Recovery/verification report


Before implementing API calls:
1. Inspect the backend routes and Pydantic models.
2. Confirm the actual request and response formats.
3. Create TypeScript interfaces that match the backend.
4. Keep HTTP calls in a central API service.
5. Read the backend URL from a frontend environment variable, such as VITE_API_BASE_URL.
6. Handle loading, empty, success, and error states.
7. Do not hardcode API URLs throughout page components.
If the backend is not ready, implement a mock service behind the same service interface. This allows the UI to work now and makes it easier to replace mock data with real API calls later.

Do not mix mock data and live data without clearly identifying the source.
8. Suggested data models
Use these as starting examples only. Match the actual backend schema once it is available.
export type Severity = "critical" | "high" | "medium" | "low";

export type IncidentStatus =
  | "detected"
  | "investigating"
  | "awaiting_approval"
  | "approved"
  | "verifying"
  | "recovered"
  | "failed"
  | "rejected";

export interface Incident {
  id: string;
  title: string;
  application: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  detectedAt: string;
}

export type AgentStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "waiting_for_approval";

export interface AgentActivity {
  id: string;
  agent: "observer" | "investigator" | "repair" | "verifier";
  status: AgentStatus;
  message: string;
  timestamp?: string;
  incidentId: string;
}

export interface Patch {
  id: string;
  incidentId: string;
  filePath: string;
  explanation: string;
  diff: string;
  status: "pending" | "approved" | "rejected" | "applied" | "verified" | "failed";
}

export interface VerificationResult {
  id: string;
  incidentId: string;
  status: "queued" | "running" | "passed" | "failed" | "cancelled" | "not_run";
  passed: number;
  failed: number;
  skipped: number;
  durationMs?: number;
  completedAt?: string;
}
9. Demo mode
The frontend must remain demonstrable before all backend features are ready.

Implement a clearly labelled demo mode with a small, consistent sample dataset.

Suggested demo incident:
- ID: INC-001
- Application: demo-api
- Issue: GET /users returns HTTP 500
- Severity: High
- Initial status: Detected
The demo should let a presenter walk through:
1. Open the incident.
2. View sample logs and stack trace.
3. View a sample root-cause explanation.
4. Inspect a proposed patch.
5. Approve or reject the patch in the demo UI.
6. Show sample verification results.
All simulated actions must be visibly identified as demo behavior. Do not execute generated or arbitrary code from the browser. Do not represent a mock verification result as a real test run.
10. Safety and trust requirements
- Never put LLM API keys, database credentials, or secrets in frontend source code.
- Never execute generated code in the browser.
- Never allow the frontend to bypass human approval.
- Do not claim a patch was applied unless the backend confirms it.
- Do not claim recovery unless independent verification confirms it.
- Show failed and rejected states clearly.
- Confirm destructive or consequential actions.
- Treat all logs, stack traces, code, and agent output as untrusted display content. Render them safely; do not inject them as raw HTML.
- Keep the UI honest about whether information is live, mocked, pending, or unavailable.
11. Responsive and accessibility requirements
- Preserve the existing desktop design as the primary layout.
- Ensure the sidebar and tables work on tablet and mobile.
- Use accessible labels for icon-only buttons.
- Maintain readable contrast.
- Provide visible keyboard focus states.
- Use semantic headings and buttons.
- Do not rely on color alone to communicate severity or status.
- Avoid horizontal page overflow.
12. Implementation order
Make changes in this order. Keep the app runnable after each stage.
Stage 1 — Audit and preserve
- Inspect the existing Stitch implementation.
- Run the application.
- Record existing routes and components.
- Identify incomplete pages and broken interactions.
- Preserve the current design system.
Stage 2 — Navigation and page completeness
- Make all sidebar links work.
- Ensure each required page exists.
- Add consistent page headers and layout.
- Add responsive behavior.
Stage 3 — Shared components and data
- Add reusable status/severity badges.
- Add typed demo data.
- Add shared tables, cards, timeline, and diff viewer.
- Add loading, error, and empty states.
Stage 4 — Core incident journey
- Implement incident list and details.
- Implement investigation/evidence presentation.
- Implement patch review.
- Implement approval/rejection confirmation.
- Implement verification results.
Stage 5 — Demo interactions
- Add Simulate Incident.
- Add demo agent activity.
- Add demo patch approval/rejection.
- Add demo verification states.
- Clearly label all simulated results.
Stage 6 — Backend integration
- Inspect actual backend API contracts.
- Connect available endpoints through the API service.
- Retain mock mode only where endpoints are not yet available.
- Handle API failures gracefully.
Stage 7 — Quality check
- Run the frontend.
- Test every navigation item.
- Test search and filters.
- Test incident details.
- Test approval and rejection.
- Test verification display.
- Test responsive layouts.
- Run lint, type-check, and production build.
- Fix errors and summarize what is genuinely functional.
13. Definition of done
The frontend implementation is ready for the MVP when:
- [ ] Existing Stitch visual design is preserved.
- [ ] All sidebar destinations navigate correctly.
- [ ] Dashboard displays consistent incident data.
- [ ] Incidents can be searched and filtered.
- [ ] Incident details show evidence, investigation, and activity.
- [ ] Patch diff is readable.
- [ ] Approval and rejection require confirmation.
- [ ] Verification results distinguish passed and failed tests.
- [ ] Audit logs show a chronological activity history.
- [ ] Demo mode is clearly labelled.
- [ ] No fake live status or false recovery claims are shown.
- [ ] No secrets are stored in frontend code.
- [ ] Responsive layouts work.
- [ ] Production build completes successfully.
14. Final instruction to Antigravity
Treat this document as the implementation specification for the existing SentinelMesh AI frontend.

Do not start by recreating the website. First inspect the current implementation and compare it with this specification. Then improve the existing code in small, verifiable steps while preserving the Stitch design.

Before finishing, provide a concise report containing:
1. Existing pages/components found.
2. Changes made.
3. Files created or modified.
4. Features that work with real backend APIs.
5. Features that still use mock/demo data.
6. Any backend endpoints or schemas still required.
7. Build, lint, and type-check results.
8. Known issues and recommended next steps.
Do not mark an item complete unless it has actually been implemented and tested.