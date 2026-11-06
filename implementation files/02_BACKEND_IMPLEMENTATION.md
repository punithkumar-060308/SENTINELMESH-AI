# Backend Implementation Guide — FastAPI

## Goal
Build the API layer that receives incidents, stores evidence, coordinates workflow requests, and exposes incident, patch, agent, and verification information to the frontend.

## Ownership
Primary owner: Backend lead.  
Pair with the demo-app/testing member and database/documentation member.

## Responsibilities
- FastAPI application and routing.
- Request validation with Pydantic.
- Service layer separated from route handlers.
- Database integration through repository/service functions.
- CORS for the local frontend.
- Consistent errors and response shapes.
- API contracts documented in OpenAPI.

## Suggested structure
Adapt to the existing backend if it is already organized:
```text
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── core/
│   │   └── config.py
│   ├── api/
│   │   ├── routes/
│   │   │   ├── health.py
│   │   │   ├── incidents.py
│   │   │   ├── agents.py
│   │   │   ├── patches.py
│   │   │   └── verification.py
│   ├── schemas/
│   ├── services/
│   ├── repositories/
│   └── dependencies/
├── requirements.txt
└── tests/
```

## Initial endpoints
These are proposed contracts. Inspect and align with actual implementation before frontend integration.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/incidents` | Create/register an incident |
| GET | `/api/incidents` | List incidents |
| GET | `/api/incidents/{incident_id}` | Incident details |
| POST | `/api/incidents/{incident_id}/analyze` | Start analysis workflow |
| GET | `/api/incidents/{incident_id}/agents` | Agent activity |
| GET | `/api/incidents/{incident_id}/patches` | List proposed patches |
| POST | `/api/incidents/{incident_id}/patches/{patch_id}/decision` | Approve/reject patch |
| POST | `/api/incidents/{incident_id}/verify` | Request verification |
| GET | `/api/incidents/{incident_id}/report` | Final report |
| GET | `/api/audit-logs` | Audit history |

## Data contract principles
Use stable identifiers and ISO-8601 timestamps. Validate all incoming data. Return consistent error shapes.

Suggested incident fields:
- `id`
- `title`
- `application`
- `description`
- `severity`
- `status`
- `detected_at`
- `evidence_ids`

Suggested status values:
- `detected`
- `investigating`
- `awaiting_approval`
- `approved`
- `applying`
- `verifying`
- `recovered`
- `failed`
- `rejected`

Suggested response shape:
```json
{
  "id": "INC-001",
  "title": "GET /users returns HTTP 500",
  "application": "demo-api",
  "severity": "high",
  "status": "detected",
  "detected_at": "2026-11-06T10:00:00Z"
}
```

## Implementation steps
1. Create FastAPI app and health endpoint.
2. Configure CORS for the local frontend origin.
3. Define Pydantic schemas for incidents, evidence, patches, agent events, and verification.
4. Implement incident create/list/detail routes using a temporary in-memory repository if database integration is not ready.
5. Move persistence into repository functions when MongoDB is connected.
6. Add routes for analysis, patch decisions, verification, and audit logs.
7. Call the orchestrator through a service layer; route handlers should not contain LLM prompts or workflow logic.
8. Add validation, error handling, logging, and tests.
9. Document actual request/response examples in OpenAPI.

## API behavior rules
- `POST /analyze` should start the workflow and return a job/workflow status or completed result according to the chosen implementation. Do not leave the response semantics ambiguous.
- Patch decision must identify the exact patch and the decision. Do not approve all patches for an incident implicitly.
- Rejecting a patch must not trigger execution.
- Verification should only run after an approved patch has been safely applied, unless an explicitly defined pre-application test is being run.
- A successful API response to an approval request means the decision was recorded; it does not mean the patch was applied or verified.
- Never expose secrets in responses.
- Avoid long-running LLM/sandbox work inside a request handler if it can exceed request limits. Use a background job/workflow pattern only if the team can implement and test it reliably.

## Local run
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

## Testing
Use FastAPI TestClient or HTTPX to test:
- health endpoint
- invalid incident payload
- create/list/detail incident
- unknown incident ID
- invalid patch decision
- rejection path
- approval path
- error handling when database or agent service is unavailable

## Definition of done
- [ ] API starts locally.
- [ ] OpenAPI docs are accessible.
- [ ] Incident create/list/detail works.
- [ ] Request validation works.
- [ ] Actual routes and schemas are documented.
- [ ] Frontend can call the API with CORS configured.
- [ ] No API keys or database credentials are exposed.
- [ ] Backend tests pass.
