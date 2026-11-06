from typing import List
from fastapi import APIRouter
from app.schemas.agent import FleetAgent
from app.services import agent_service

router = APIRouter(prefix="/api", tags=["Agents"])


@router.get("/agents", response_model=List[FleetAgent], summary="List AI Fleet agents status")
@router.get("/fleet/agents", response_model=List[FleetAgent], summary="List AI Fleet agents status (alias)")
def list_fleet_agents():
    return agent_service.get_fleet_agents()
