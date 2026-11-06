"""SentinelMesh AI Multi-Agent System.
Implements the 4 specialized agents and orchestrator defined in 04_AI_AGENTS_IMPLEMENTATION.md:
- Observer Agent (Evidence collection & normalization)
- Investigator Agent (Root-cause diagnosis)
- Repair Agent (Minimal patch synthesis with strict allowlist & pending status)
- Verifier Agent (Independent regression execution & zero-drift certification)
- Orchestrator (Workflow state coordinator with mandatory human sign-off gate)
"""

from agents.observer import ObserverAgent
from agents.investigator import InvestigatorAgent
from agents.repair import RepairAgent
from agents.verifier import VerifierAgent
from agents.orchestrator import SentinelMeshOrchestrator
from agents.common.schemas import (
    WorkflowState,
    ObserverInput,
    ObserverOutput,
    InvestigatorInput,
    InvestigatorOutput,
    RepairInput,
    RepairOutput,
    VerifierInput,
    VerifierOutput,
    AgentActivityEvent,
)

__all__ = [
    "ObserverAgent",
    "InvestigatorAgent",
    "RepairAgent",
    "VerifierAgent",
    "SentinelMeshOrchestrator",
    "WorkflowState",
    "ObserverInput",
    "ObserverOutput",
    "InvestigatorInput",
    "InvestigatorOutput",
    "RepairInput",
    "RepairOutput",
    "VerifierInput",
    "VerifierOutput",
    "AgentActivityEvent",
]
