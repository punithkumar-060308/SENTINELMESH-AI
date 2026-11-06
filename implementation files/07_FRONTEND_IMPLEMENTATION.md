# Frontend Implementation Guide — Existing Stitch Design

## Goal
Complete the existing SentinelMesh AI frontend generated from Google Stitch and implemented in Antigravity.

**Do not redesign the application from scratch.** First inspect the existing project, run it, and preserve the current Stitch visual design. Make targeted changes to complete missing pages and functionality.

## Product identity
**SentinelMesh AI**  
**Detect. Investigate. Repair. Verify.**

The UI must communicate evidence-backed incident investigation, human-controlled patch approval, and independent verification.

## Non-negotiable rules
- Preserve existing colors, typography, layout, spacing, components, and visual identity.
- Do not replace the project with a generic dashboard template.
- Do not add login or registration for the MVP.
- Reuse existing framework, routing, and styling choices.
- Do not claim mocked data or actions are real.
- Keep API keys and database credentials out of frontend code.
- Use typed data if the project uses TypeScript.
- Run build/lint/type checks after modifications.

## Navigation
- Overview
- Incidents
- AI Agents
- Patch Review
- Verification
- Audit Logs
- Settings

Keep sidebar and topbar consistent. Make active navigation state and responsive mobile navigation work.

## Required pages

### Overview
Show:
- Total incidents
- Active incidents
- Successfully recovered
- Pending approvals
- Incident trend
- Severity distribution
- Recent incidents
- Agent activity
- System status

Label sample data as Demo/Sample data until connected to real backend records.

### Incidents
Show searchable/filterable incident list with:
- ID
- Application
- Error summary
- Severity
- Status
- Detection time
- View details

Filters: severity, status, application. Add a Simulate Incident button that creates a clearly labelled demo incident if no backend endpoint exists.

### Incident details
Show:
- Incident summary and status
- Error message, logs, stack trace, timestamps
- Investigator diagnosis and supporting evidence
- Relevant file/source context if provided
- Agent activity timeline
- Proposed patch and readable code diff
- Approve and Reject actions
- Verification result and test output

Distinguish proposed, approved, applied, and verified states.

### AI Agents
Show cards for Observer, Investigator, Repair, and Verifier. Each card includes purpose, state, latest activity, and last run when available. Do not display a fake running state.

### Patch Review
Show pending and historical patches, file path, diff, explanation, and approval/rejection controls. Require confirmation. Update state only after backend success. Approval does not mean applied or verified.

### Verification
Show test runs, passed/failed/skipped counts, duration, execution status, and final result. A success state must be based on actual backend test results.

### Audit Logs
Show chronological events: incident detection, evidence collection, agent activity, patch creation, human decision, sandbox execution, test results, final status.

### Settings
Show non-secret configuration and connection status for AI provider, database, sandbox, and application. Never collect or expose secret keys in browser code.

## Design and responsive behavior
Keep the existing Stitch design. Ensure:
- Desktop layout remains the primary design.
- Sidebar works on tablet/mobile.
- Tables adapt without page overflow.
- Icon-only buttons have accessible labels.
- Keyboard focus is visible.
- Status is not communicated by color alone.
- Loading, empty, and error states exist.

## Data and API layer
Inspect actual backend routes and schemas before integration. Proposed endpoints may include:
- `GET /health`
- `GET /api/incidents`
- `POST /api/incidents`
- `GET /api/incidents/{id}`
- `POST /api/incidents/{id}/analyze`
- `GET /api/incidents/{id}/agents`
- `GET /api/incidents/{id}/patches`
- `POST /api/incidents/{id}/patches/{patch_id}/decision`
- `POST /api/incidents/{id}/verify`
- `GET /api/incidents/{id}/report`
- `GET /api/audit-logs`

These are proposed, not assumed to exist. Put API calls in a central service. Use a `VITE_API_BASE_URL` environment variable. Keep a mock service behind the same interface where APIs are unavailable, and label mock content clearly.

## Core state rules
- Approval is not execution.
- Execution is not verification.
- LLM output is not proof of recovery.
- Failed verification must not appear as success.
- A UI action should update only after the backend confirms it.

## Suggested implementation sequence
1. Inspect and run the current Stitch implementation.
2. List existing routes/components and missing items.
3. Fix navigation and page completeness.
4. Add shared badges, tables, timeline, diff viewer, and dialogs.
5. Implement incident list and detail journey.
6. Implement patch approval/rejection UI.
7. Implement verification and audit views.
8. Add clearly labelled demo interactions.
9. Connect available backend endpoints.
10. Test responsive layouts and build.

## Definition of done
- [ ] Existing Stitch visual design preserved.
- [ ] All navigation works.
- [ ] Dashboard and incidents use consistent data.
- [ ] Incident details show evidence and agent timeline.
- [ ] Patch diff is readable.
- [ ] Approval/rejection requires confirmation.
- [ ] Verification distinguishes pass/fail.
- [ ] Demo data is labelled.
- [ ] No fake live status or recovery claims.
- [ ] No secrets in frontend.
- [ ] Responsive behavior works.
- [ ] Production build succeeds.

## Final report required from Antigravity
List existing pages, changes made, files changed, real API-connected features, mock features, missing backend contracts, build results, and remaining issues.
