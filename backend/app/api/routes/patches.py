from typing import Optional
from fastapi import APIRouter, Path, Body, HTTPException, Depends
from app.dependencies.auth import require_authenticated_operator
from app.schemas.patch import PatchProposal, PatchDecisionRequest, PatchDecisionResponse
from app.services import patch_service

router = APIRouter(prefix="/api", tags=["Patches"])


@router.post(
    "/incidents/{incident_id}/patches/{patch_id}/decision",
    response_model=PatchDecisionResponse,
    summary="Approve or reject a specific patch",
)
def patch_decision(
    incident_id: str = Path(..., description="Stable incident identifier"),
    patch_id: str = Path(..., description="Stable patch identifier"),
    payload: PatchDecisionRequest = Body(...),
    operator: dict = Depends(require_authenticated_operator),
):
    actor_name = payload.actor or operator.get("name") or "Human Operator"
    return patch_service.process_patch_decision(
        incident_id=incident_id,
        patch_id=patch_id,
        decision=payload.decision,
        notes=payload.notes,
        reason=payload.reason,
        actor=actor_name,
    )


@router.get("/patches/{patch_id}", response_model=PatchProposal, summary="Get patch details")
def get_patch(
    patch_id: str = Path(..., description="Stable patch identifier"),
    operator: dict = Depends(require_authenticated_operator),
):
    patch = patch_service.get_patch(patch_id)
    if not patch:
        raise HTTPException(status_code=404, detail=f"Patch {patch_id} not found")
    return patch
