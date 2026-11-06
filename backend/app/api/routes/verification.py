from typing import List, Optional
from fastapi import APIRouter, Path, Query, HTTPException
from app.schemas.verification import VerificationRunResponse
from app.services import verification_service

router = APIRouter(prefix="/api/verification-runs", tags=["Verification"])


@router.get("", response_model=List[VerificationRunResponse], summary="List verification runs")
def list_verification_runs(
    incident_id: Optional[str] = Query(None, alias="incidentId", description="Filter by incident ID"),
):
    if incident_id:
        return verification_service.list_by_incident(incident_id)
    return verification_service.list_all()


@router.get("/{verification_id}", response_model=VerificationRunResponse, summary="Get verification run details")
def get_verification_run(verification_id: str = Path(..., description="Stable verification run ID")):
    runs = verification_service.list_all()
    found = next((r for r in runs if r.id == verification_id), None)
    if not found:
        raise HTTPException(status_code=404, detail=f"Verification run {verification_id} not found")
    return found
