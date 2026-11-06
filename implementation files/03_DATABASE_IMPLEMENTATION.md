# Database Implementation Guide — MongoDB

## Goal
Persist incidents, evidence, agent activity, patches, verification results, and audit events so the workflow can be inspected after execution.

## Ownership
Primary owner: Database/documentation member, guided by the backend lead.

## Database choice
Use MongoDB Atlas free tier or a local MongoDB instance for development. Keep the connection string only in backend environment variables. The frontend must never connect directly to MongoDB.

## Suggested database
`sentinelmesh_db`

## Suggested collections

### `incidents`
Fields:
- `_id` or stable `id`
- `title`
- `application`
- `description`
- `severity`
- `status`
- `detected_at`
- `updated_at`
- `evidence_ids`

### `evidence`
Fields:
- `id`
- `incident_id`
- `type` (`log`, `stack_trace`, `metric`, `health_check`, etc.)
- `source`
- `content`
- `collected_at`

### `agent_logs`
Fields:
- `id`
- `incident_id`
- `agent_name`
- `status`
- `input_summary`
- `output_summary`
- `started_at`
- `completed_at`
- `error`

Avoid storing unnecessary sensitive data or huge raw payloads. Apply reasonable size limits.

### `patches`
Fields:
- `id`
- `incident_id`
- `file_path`
- `diff`
- `explanation`
- `status`
- `created_at`
- `decision`
- `decided_at`
- `applied_at`

### `verification`
Fields:
- `id`
- `incident_id`
- `patch_id`
- `status`
- `passed`
- `failed`
- `skipped`
- `duration_ms`
- `test_output_summary`
- `started_at`
- `completed_at`

### `audit_logs`
Fields:
- `id`
- `incident_id`
- `actor`
- `action`
- `status`
- `details`
- `created_at`

## Relationships
MongoDB is document-oriented, but use stable IDs to reference related records:
- One incident can reference many evidence records.
- One incident can have multiple agent activity records.
- One incident can have one or more proposed patches.
- One patch can have verification runs.
- One incident can have many audit events.

## Indexes
Create indexes after confirming query patterns:
- `incidents.status`
- `incidents.detected_at`
- `evidence.incident_id`
- `agent_logs.incident_id`
- `patches.incident_id`
- `patches.status`
- `verification.incident_id`
- `audit_logs.incident_id`
- `audit_logs.created_at`

Use unique indexes for stable IDs where appropriate.

## Implementation steps
1. Create database and credentials.
2. Add `MONGODB_URI` and `DATABASE_NAME` to backend `.env`.
3. Create a database connection module with startup/shutdown handling.
4. Create repository functions for each collection.
5. Validate data through Pydantic schemas before persistence.
6. Save incident before starting the agent workflow.
7. Save evidence and agent events as they occur.
8. Save a patch as `pending` before human review.
9. Record the approval/rejection decision and actor.
10. Record sandbox application result separately.
11. Record verifier output separately.
12. Write audit events for important state transitions.

## Data integrity rules
- Do not mark an incident `recovered` merely because a patch was generated or approved.
- Store approval, application, and verification as distinct events/states.
- Keep timestamps in UTC and serialize consistently.
- Use stable IDs across API and database.
- Avoid storing API keys, passwords, or unrelated secrets in logs.
- Handle missing database connection gracefully; do not silently report writes as successful.

## Definition of done
- [ ] Backend connects to MongoDB.
- [ ] Incident records persist.
- [ ] Evidence and agent activity can be retrieved by incident ID.
- [ ] Patch decisions persist.
- [ ] Verification results persist.
- [ ] Audit events are chronological.
- [ ] Indexes support the required queries.
- [ ] Connection errors are surfaced accurately.
