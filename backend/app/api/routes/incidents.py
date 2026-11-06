from typing import List, Optional
from fastapi import APIRouter, Query, Path, Body
from app.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentAnalyzeResponse,
    IncidentReportResponse,
)
from app.schemas.patch import PatchProposal, PatchDecisionRequest, PatchDecisionResponse
from app.schemas.verification import VerificationRunRequest, VerificationRunResponse
from app.services import incident_service, patch_service, verification_service, agent_service

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


@router.get("", response_model=List[IncidentResponse], summary="List all incidents")
def list_incidents(
    status: Optional[str] = Query(None, description="Filter by status (e.g. detected, investigating, awaiting_approval, recovered)"),
    severity: Optional[str] = Query(None, description="Filter by severity (critical, high, medium, low)"),
):
    return incident_service.list_incidents(status=status, severity=severity)


@router.post("", response_model=IncidentResponse, status_code=201, summary="Register or simulate an incident")
def create_incident(payload: IncidentCreate):
    return incident_service.create_incident(payload)


@router.get("/{incident_id}", response_model=IncidentResponse, summary="Get incident details")
def get_incident(incident_id: str = Path(..., description="Stable incident identifier (e.g. INC-001)")):
    return incident_service.get_incident(incident_id)


@router.post("/{incident_id}/analyze", response_model=IncidentAnalyzeResponse, summary="Start incident analysis workflow")
def analyze_incident(incident_id: str = Path(..., description="Stable incident identifier")):
    return incident_service.analyze_incident(incident_id)


@router.get("/{incident_id}/agents", summary="Get agent activity and timeline for incident")
def get_incident_agents(incident_id: str = Path(..., description="Stable incident identifier")):
    return agent_service.get_incident_agent_activity(incident_id)


@router.get("/{incident_id}/patches", response_model=List[PatchProposal], summary="List proposed patches for incident")
def list_incident_patches(incident_id: str = Path(..., description="Stable incident identifier")):
    return patch_service.list_patches_for_incident(incident_id)


@router.post("/{incident_id}/approve", response_model=PatchDecisionResponse, summary="Approve or reject patch for incident (Frontend compatible)")
def approve_or_reject_patch(
    incident_id: str = Path(..., description="Stable incident identifier"),
    payload: PatchDecisionRequest = Body(...),
):
    return patch_service.process_patch_decision(
        incident_id=incident_id,
        patch_id=None,
        decision=payload.decision,
        notes=payload.notes,
        reason=payload.reason,
        actor=payload.actor or "Human Operator",
    )


@router.post("/{incident_id}/verify", response_model=VerificationRunResponse, summary="Request verification in isolated sandbox")
def verify_incident(
    incident_id: str = Path(..., description="Stable incident identifier"),
    payload: Optional[VerificationRunRequest] = Body(None),
):
    patch_id = payload.patch_id if payload else None
    env = payload.isolated_env if payload and payload.isolated_env else "mesh-sandbox-isolated (Docker rootless)"
    return verification_service.run_verification(incident_id=incident_id, patch_id=patch_id, isolated_env=env)


@router.get("/{incident_id}/report", response_model=IncidentReportResponse, summary="Get final post-incident recovery report")
def get_incident_report(incident_id: str = Path(..., description="Stable incident identifier")):
    return incident_service.get_report(incident_id)
