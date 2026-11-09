from typing import List, Optional
from fastapi import APIRouter, Query, Path, HTTPException, Depends
from app.dependencies.auth import require_authenticated_operator
from app.schemas.agent import FleetAgent, AgentLogEntry
from app.services import agent_service

router = APIRouter(prefix="/api", tags=["Agents"])


@router.get("/agents", response_model=List[FleetAgent], summary="List AI Fleet agents status")
@router.get("/fleet/agents", response_model=List[FleetAgent], summary="List AI Fleet agents status (alias)")
def list_fleet_agents():
    return agent_service.get_fleet_agents()


@router.get("/fleet/agents/{agent_id}", response_model=FleetAgent, summary="Get single AI Fleet agent by ID or role")
@router.get("/agents/{agent_id}", response_model=FleetAgent, summary="Get single AI Fleet agent by ID (alias)")
def get_fleet_agent(agent_id: str = Path(..., description="Agent ID (e.g. observer, investigator, repair, verifier, human_gate)")):
    agents = agent_service.get_fleet_agents()
    norm = agent_id.lower().replace("-", "_").replace(" ", "_")
    for a in agents:
        if a.id == norm or a.name.lower().replace(" ", "_").startswith(norm):
            return a
    raise HTTPException(status_code=404, detail=f"Agent with ID '{agent_id}' not found in fleet")


@router.get("/agent-logs", summary="List chronological agent execution logs")
@router.get("/fleet/agent-logs", summary="List chronological agent execution logs (alias)")
def list_agent_logs(
    agent_name: Optional[str] = Query(None, description="Filter by agent name (e.g. Observer, Investigator, Repair, Verifier)"),
    incident_id: Optional[str] = Query(None, description="Filter by incident ID"),
    status: Optional[str] = Query(None, description="Filter by execution status (completed, running, failed, idle)"),
    limit: int = Query(100, ge=1, le=500, description="Max logs to return"),
    operator: dict = Depends(require_authenticated_operator),
):
    return agent_service.list_all_agent_logs(agent_name=agent_name, incident_id=incident_id, status=status, limit=limit)
