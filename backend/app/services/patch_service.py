from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import HTTPException
from app.repositories import patch_repo, incident_repo
from app.schemas.patch import PatchProposal, PatchDecisionResponse
from app.services.audit_service import audit_service


class PatchService:
    def __init__(self):
        self.patch_repo = patch_repo
        self.incident_repo = incident_repo

    def list_patches_for_incident(self, incident_id: str) -> List[PatchProposal]:
        patches = self.patch_repo.list_by_incident(incident_id)
        return [PatchProposal(**p) for p in patches]

    def get_patch(self, patch_id: str) -> Optional[PatchProposal]:
        p = self.patch_repo.get_by_id(patch_id)
        if not p:
            return None
        return PatchProposal(**p)

    def process_patch_decision(
        self,
        incident_id: str,
        patch_id: Optional[str],
        decision: str,
        notes: Optional[str] = "",
        reason: Optional[str] = "",
        actor: str = "Human Operator (Elena Vance)",
    ) -> PatchDecisionResponse:
        # Normalize decision
        decision = decision.lower().strip()
        if decision not in ["approve", "reject"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid decision '{decision}'. Must be 'approve' or 'reject'.",
            )

        incident = self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

        # Resolve exact patch
        target_patch = None
        if patch_id:
            target_patch = self.patch_repo.get_by_id(patch_id)
            if not target_patch or target_patch.get("incident_id") != incident_id:
                raise HTTPException(
                    status_code=404,
                    detail=f"Patch {patch_id} not found for incident {incident_id}",
                )
        else:
            # If no patch_id supplied in general approve endpoint, check proposed_patch on incident
            patches = self.patch_repo.list_by_incident(incident_id)
            if patches:
                target_patch = patches[0]
            elif incident.get("proposed_patch"):
                target_patch = incident["proposed_patch"]

        target_patch_id = target_patch.get("id") if target_patch else f"PAT-{incident_id.replace('INC-', '')}"
        now_iso = datetime.now(timezone.utc).isoformat()

        if decision == "approve":
            # Rule: Approval records decision; does not implicitly verify
            patch_status = "approved"
            incident_status = "approved"
            msg = notes or "Human approval signed. Patch approved for sandbox application."

            # Update patch record
            if target_patch:
                self.patch_repo.update(target_patch_id, {
                    "status": "approved",
                    "decision": "approve",
                    "decided_at": now_iso,
                })

            # Update incident
            timeline = incident.get("timeline", [])
            timeline.append({
                "agent": "Human Gate",
                "action": f"Approved patch {target_patch_id} ({actor})",
                "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
                "status": "completed",
            })

            # Update proposed patch nested object if present
            proposed_patch = incident.get("proposed_patch") or {}
            proposed_patch["status"] = "approved"

            self.incident_repo.update(incident_id, {
                "status": incident_status,
                "pipeline_agent": "Sandbox Agent (Awaiting isolated application & verification)",
                "active_step": 5,
                "proposed_patch": proposed_patch,
                "timeline": timeline,
            })

            # Record audit log
            audit_service.record_event(
                agent=actor,
                action="PATCH_APPROVED",
                incident_id=incident_id,
                status="completed",
                details=f"Patch {target_patch_id} approved. Notes: {msg}",
            )

            return PatchDecisionResponse(
                success=True,
                incidentId=incident_id,
                patchId=target_patch_id,
                decision="approve",
                status="approved",
                message="Patch decision recorded: approved. Ready for sandbox verification.",
                decidedAt=now_iso,
            )

        else:
            # Rejection path: Rejecting must NOT trigger execution
            patch_status = "rejected"
            incident_status = "rejected"
            msg = reason or notes or "Patch rejected by operator. Alternative patch requested."

            if target_patch:
                self.patch_repo.update(target_patch_id, {
                    "status": "rejected",
                    "decision": "reject",
                    "decided_at": now_iso,
                })

            timeline = incident.get("timeline", [])
            timeline.append({
                "agent": "Human Gate",
                "action": f"Rejected patch {target_patch_id} ({actor})",
                "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
                "status": "completed",
            })

            proposed_patch = incident.get("proposed_patch") or {}
            proposed_patch["status"] = "rejected"

            self.incident_repo.update(incident_id, {
                "status": incident_status,
                "pipeline_agent": "Repair Agent (Awaiting alternative patch synthesis)",
                "active_step": 3,
                "proposed_patch": proposed_patch,
                "timeline": timeline,
            })

            # Record audit log
            audit_service.record_event(
                agent=actor,
                action="PATCH_REJECTED",
                incident_id=incident_id,
                status="completed",
                details=f"Patch {target_patch_id} rejected. Reason: {msg}",
            )

            return PatchDecisionResponse(
                success=True,
                incidentId=incident_id,
                patchId=target_patch_id,
                decision="reject",
                status="rejected",
                message="Patch decision recorded: rejected. Execution halted.",
                decidedAt=now_iso,
            )


patch_service = PatchService()
