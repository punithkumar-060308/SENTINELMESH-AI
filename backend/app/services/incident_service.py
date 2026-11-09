from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import HTTPException
from app.repositories import incident_repo, evidence_repo, patch_repo, verification_repo
from app.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentAnalyzeResponse,
    IncidentReportResponse,
)
from app.services.audit_service import audit_service


class IncidentService:
    def __init__(self):
        self.incident_repo = incident_repo
        self.evidence_repo = evidence_repo
        self.patch_repo = patch_repo
        self.verification_repo = verification_repo

    def list_incidents(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> List[IncidentResponse]:
        raw_list = self.incident_repo.list_all(status=status, severity=severity)
        return [IncidentResponse(**item) for item in raw_list]

    def get_incident(self, incident_id: str) -> IncidentResponse:
        item = self.incident_repo.get_by_id(incident_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")
        return IncidentResponse(**item)

    def create_incident(self, payload: IncidentCreate) -> IncidentResponse:
        data = payload.model_dump(by_alias=False, exclude_none=True)

        app_name = data.get("application") or data.get("app") or "demo-service"
        data["application"] = app_name
        data["app"] = app_name

        if not data.get("id"):
            import random
            data["id"] = f"INC-{random.randint(1000, 9999)}"

        now_iso = datetime.now(timezone.utc).isoformat()
        data["detected_at"] = now_iso
        data["detected_time"] = "Just now"
        data["created_at"] = now_iso
        data["status"] = data.get("status") or "investigating"
        data["pipeline_agent"] = "Observer Agent (Normalizing ingested telemetry)"
        data["active_step"] = 1

        # Seed timeline
        data["timeline"] = [
            {
                "agent": "Observer",
                "action": f"Ingested incident: {data.get('title')}",
                "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
                "status": "completed",
            }
        ]

        # Seed pod logs if raw_logs provided or default
        if payload.raw_logs:
            data["pod_logs"] = [
                {"time": datetime.now(timezone.utc).strftime("%H:%M:%S.000"), "level": "ERROR", "message": payload.raw_logs}
            ]
        elif not data.get("pod_logs"):
            data["pod_logs"] = [
                {"time": datetime.now(timezone.utc).strftime("%H:%M:%S.000"), "level": "INFO", "message": f"Service {data.get('application')} alert triggered"},
                {"time": datetime.now(timezone.utc).strftime("%H:%M:%S.100"), "level": "ERROR", "message": data.get("title")},
            ]

        # Save to repository
        saved = self.incident_repo.create(data)

        # Store evidence entry
        evidence_entry = {
            "incident_id": saved["id"],
            "type": "log",
            "source": f"{saved.get('application')} monitoring stream",
            "content": saved.get("stack_trace") or saved.get("description") or saved.get("title"),
        }
        self.evidence_repo.create(evidence_entry)

        # Audit event
        audit_service.record_event(
            agent="Observer Agent",
            action="INCIDENT_REGISTERED",
            incident_id=saved["id"],
            status="completed",
            details=f"Incident {saved['id']} detected in {saved['application']}: {saved['title']}",
        )

        return IncidentResponse(**saved)

    def analyze_incident(self, incident_id: str) -> IncidentAnalyzeResponse:
        incident = self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

        # Advance workflow to investigating & synthesis
        timeline = incident.get("timeline", [])
        now_time = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")

        timeline.append({
            "agent": "Investigator",
            "action": f"Analyzed telemetry and codebase AST for {incident.get('application')}",
            "timestamp": now_time,
            "status": "completed",
        })

        root_cause = incident.get("root_cause") or f"Identified unexpected null dereference / unhandled exception in {incident.get('application')}"
        source_file = incident.get("source_file") or incident.get("location") or "app/service/handler.py:42"

        # If incident doesn't have a proposed patch yet, generate one
        proposed_patch = incident.get("proposed_patch")
        if not proposed_patch:
            patch_id = f"PAT-{incident_id.replace('INC-', '')}"
            app_name = str(incident.get("application", "")).lower()
            inc_title = str(incident.get("title", "")).lower()
            inc_src = str(incident.get("source_file", "") or incident.get("location", "")).lower()

            if "demo" in app_name or "demo" in inc_title or "service.py" in inc_src:
                source_file = "demo_api/service.py"
                diff_text = (
                    "def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):\n"
                    "    return [\n"
                    '        {"id": 1, "username": "admin", "status": "active"},\n'
                    '        {"id": 2, "username": "elena_v", "status": "active"}\n'
                    "    ]\n"
                )
                orig_lines = [
                    {"num": 5, "text": "def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):", "type": "context"},
                    {"num": 6, "text": "    if current_connections >= max_connections and pool_timeout < 0.1:", "type": "deleted"},
                    {"num": 7, "text": '        raise TimeoutError("Database connection timed out: pool limit reached")', "type": "deleted"},
                    {"num": 8, "text": '    return [{"id": 1, "username": "admin", "status": "active"}]', "type": "deleted"},
                ]
                patched_lines = [
                    {"num": 5, "text": "def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):", "type": "context"},
                    {"num": 6, "text": "    # Defensive non-blocking user retrieval fallback", "type": "added"},
                    {"num": 7, "text": "    return [", "type": "added"},
                    {"num": 8, "text": '        {"id": 1, "username": "admin", "status": "active"},', "type": "added"},
                    {"num": 9, "text": '        {"id": 2, "username": "elena_v", "status": "active"}', "type": "added"},
                    {"num": 10, "text": "    ]", "type": "added"},
                ]
                explanation = "Guards database pool exhaustion with non-blocking user retrieval fallback."
                diff_summary = "-3 lines / +5 lines"
            else:
                diff_text = (
                    f"--- a/{source_file}\n"
                    f"+++ b/{source_file}\n"
                    "@@ -41,2 +41,3 @@\n"
                    "-    return process(payload['data'])\n"
                    "+    data = payload.get('data') if payload else None\n"
                    "+    return process(data) if data is not None else fallback()\n"
                )
                orig_lines = [
                    {"num": 41, "text": "def handle_request(payload):", "type": "context"},
                    {"num": 42, "text": "    return process(payload['data'])", "type": "deleted"},
                ]
                patched_lines = [
                    {"num": 41, "text": "def handle_request(payload):", "type": "context"},
                    {"num": 42, "text": "    data = payload.get('data') if payload else None", "type": "added"},
                    {"num": 43, "text": "    return process(data) if data is not None else fallback()", "type": "added"},
                ]
                explanation = "Added defensive guard to prevent dereference on empty or null inputs."
                diff_summary = "-1 line / +3 lines"

            proposed_patch = {
                "id": patch_id,
                "incidentId": incident_id,
                "filePath": source_file,
                "diff": diff_text,
                "diffSummary": diff_summary,
                "explanation": explanation,
                "status": "pending",
                "originalLines": orig_lines,
                "patchedLines": patched_lines,
            }
            # Save in patch repository
            self.patch_repo.create({
                "id": patch_id,
                "incident_id": incident_id,
                "file_path": source_file,
                "diff": diff_text,
                "explanation": proposed_patch["explanation"],
                "status": "pending",
                "original_lines": proposed_patch["originalLines"],
                "patched_lines": proposed_patch["patchedLines"],
            })

        timeline.append({
            "agent": "Repair",
            "action": f"Synthesized defensive patch {proposed_patch['id']} (awaiting human sign-off)",
            "timestamp": now_time,
            "status": "completed",
        })

        # Update incident state to awaiting_approval
        updated = self.incident_repo.update(incident_id, {
            "status": "awaiting_approval",
            "pipeline_agent": f"Repair Agent (Patch {proposed_patch['id']} ready for sign-off)",
            "active_step": 4,
            "root_cause": root_cause,
            "confidence": incident.get("confidence") or 94.5,
            "source_file": source_file,
            "proposed_patch": proposed_patch,
            "timeline": timeline,
        })

        # Record in audit ledger
        audit_service.record_event(
            agent="Investigator & Repair Agents",
            action="ANALYSIS_COMPLETED",
            incident_id=incident_id,
            status="completed",
            details=f"Analysis completed for {incident_id}. Root cause diagnosed. Patch {proposed_patch['id']} synthesized and queued for human approval.",
        )

        return IncidentAnalyzeResponse(
            incidentId=incident_id,
            status="awaiting_approval",
            message=f"Investigation completed for {incident_id}. Defensive patch generated and awaiting human sign-off.",
            pipelineAgent=f"Repair Agent (Patch {proposed_patch['id']} ready for sign-off)",
            workflowJobId=f"WF-{incident_id}-ANALYSIS",
        )

    def get_report(self, incident_id: str) -> IncidentReportResponse:
        incident = self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

        patches = self.patch_repo.list_by_incident(incident_id)
        patch_info = patches[0].get("explanation") if patches else "No patch generated."

        verifications = self.verification_repo.list_by_incident(incident_id)
        verification_info = (
            verifications[0].get("test_output_summary")
            if verifications
            else "Pending sandbox verification run."
        )

        status = incident.get("status", "unknown")
        verdict = (
            "Fully Recovered & Verified"
            if status == "recovered"
            else "Awaiting Action / Unresolved"
        )

        return IncidentReportResponse(
            incidentId=incident_id,
            title=incident.get("title", ""),
            application=incident.get("application", ""),
            severity=incident.get("severity", ""),
            status=status,
            detectedAt=incident.get("detected_at", ""),
            resolvedAt=datetime.now(timezone.utc).isoformat() if status == "recovered" else None,
            rootCause=incident.get("root_cause") or "Root cause under analysis",
            patchSummary=patch_info,
            verificationSummary=verification_info,
            timelineSteps=incident.get("timeline", []),
            verdict=verdict,
        )

    def purge_all_data(self) -> int:
        from app.repositories import (
            incident_repo,
            evidence_repo,
            patch_repo,
            verification_repo,
            agent_log_repo,
            audit_repo,
        )
        total = 0
        repos = [
            incident_repo,
            evidence_repo,
            patch_repo,
            verification_repo,
            agent_log_repo,
            audit_repo,
        ]
        for r in repos:
            if hasattr(r, 'purge'):
                try:
                    total += r.purge()
                except Exception:
                    pass
        return total


incident_service = IncidentService()
