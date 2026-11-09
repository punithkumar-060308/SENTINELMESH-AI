from typing import List, Optional
from fastapi import APIRouter, Path, Query, HTTPException, Depends
from app.dependencies.auth import require_authenticated_operator
from app.schemas.verification import VerificationRunResponse
from app.services import verification_service

router = APIRouter(prefix="/api/verification-runs", tags=["Verification"])


@router.get("", response_model=List[VerificationRunResponse], summary="List verification runs")
def list_verification_runs(
    incident_id: Optional[str] = Query(None, alias="incidentId", description="Filter by incident ID"),
    operator: dict = Depends(require_authenticated_operator),
):
    if incident_id:
        return verification_service.list_by_incident(incident_id)
    return verification_service.list_all()


@router.get("/{verification_id}", response_model=VerificationRunResponse, summary="Get verification run details")
def get_verification_run(
    verification_id: str = Path(..., description="Stable verification run ID"),
    operator: dict = Depends(require_authenticated_operator),
):
    runs = verification_service.list_all()
    found = next((r for r in runs if r.id == verification_id), None)
    if not found:
        raise HTTPException(status_code=404, detail=f"Verification run {verification_id} not found")
    return found
