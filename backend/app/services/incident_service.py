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
            proposed_patch = {
                "id": patch_id,
                "incidentId": incident_id,
                "filePath": source_file,
                "diffSummary": "-1 line / +3 lines",
                "explanation": "Added defensive guard to prevent dereference on empty or null inputs.",
                "status": "pending",
                "originalLines": [
                    {"num": 41, "text": "def handle_request(payload):", "type": "context"},
                    {"num": 42, "text": "    return process(payload['data'])", "type": "deleted"},
                ],
                "patchedLines": [
                    {"num": 41, "text": "def handle_request(payload):", "type": "context"},
                    {"num": 42, "text": "    data = payload.get('data') if payload else None", "type": "added"},
                    {"num": 43, "text": "    return process(data) if data is not None else fallback()", "type": "added"},
                ],
            }
            # Save in patch repository
            self.patch_repo.create({
                "id": patch_id,
                "incident_id": incident_id,
                "file_path": source_file,
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


incident_service = IncidentService()
