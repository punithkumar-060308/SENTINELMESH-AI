from typing import List, Dict, Any, Optional
from fastapi import HTTPException
from app.repositories import incident_repo
from app.schemas.agent import FleetAgent


FLEET_AGENTS: List[Dict[str, Any]] = [
    {
        "name": "Observer Agent",
        "role": "Log Anomaly Ingestion & Error Detection",
        "status": "active",
        "status_text": "Live Stream Ingesting",
        "model": "gemini-2.5-flash",
        "latency": "142ms",
        "health": 99,
        "processed_count": 1420,
        "accuracy": "99.8%",
        "description": "Monitors microservice log streams, exception signatures, and distributed trace metrics to isolate anomaly triggers in real time.",
        "tags": ["Logs", "OpenTelemetry", "Stack Traces", "Signatures"],
        "recent_activity": [
            {"time": "2m ago", "event": "Ingested 420 err/sec spike from payment-gateway-svc"},
            {"time": "8m ago", "event": "Heartbeat probe OK across 18 worker pods"}
        ]
    },
    {
        "name": "Investigator Agent",
        "role": "Root Cause Analysis & Commit Tracing",
        "status": "evaluating",
        "status_text": "Isolating Diffs",
        "model": "gemini-2.5-pro",
        "latency": "420ms",
        "health": 98,
        "processed_count": 894,
        "accuracy": "97.4%",
        "description": "Performs deep contextual analysis of codebases, git diffs, and stack trace frames to pinpoint exact fault mechanisms.",
        "tags": ["AST Parsing", "Git Blame", "Context Window", "Root Cause"],
        "recent_activity": [
            {"time": "3m ago", "event": "Isolated PR #389 commit e78f21 null reference"},
            {"time": "12m ago", "event": "Calculated 96.4% confidence root cause attribution"}
        ]
    },
    {
        "name": "Repair Agent",
        "role": "Targeted Semantic Patch Synthesis",
        "status": "active",
        "status_text": "Patch Ready",
        "model": "gemini-2.5-flash",
        "latency": "610ms",
        "health": 100,
        "processed_count": 612,
        "accuracy": "98.9%",
        "description": "Synthesizes minimal, defensive code patches adhering strictly to existing AST patterns and team architectural conventions.",
        "tags": ["Defensive Coding", "Unified Diff", "Null Safety", "Patch Gen"],
        "recent_activity": [
            {"time": "1m ago", "event": "Generated PAT-8921 defensive Optional guard"},
            {"time": "15m ago", "event": "Dispatched unified diff for human operator review"}
        ]
    },
    {
        "name": "Human Gate",
        "role": "Policy Enforcement & Human-in-the-Loop Approval",
        "status": "standby",
        "status_text": "Awaiting Sign-off",
        "model": "Deterministic Policy Engine",
        "latency": "<5ms",
        "health": 100,
        "processed_count": 482,
        "accuracy": "100%",
        "description": "Guarantees zero autonomous production writes. Requires explicit cryptographic or authenticated human sign-off before patch dispatch.",
        "tags": ["HITL", "Zero Trust", "Role Based", "Audit Ledger"],
        "recent_activity": [
            {"time": "Just now", "event": "Sign-off pending for PAT-8921 (Staff SRE clearance)"},
            {"time": "45m ago", "event": "Approved PAT-8892 hotfix by Elena Vance"}
        ]
    },
    {
        "name": "Verifier Agent",
        "role": "Isolated Sandbox Regression Verification",
        "status": "idle",
        "status_text": "Containers Warm",
        "model": "Docker Sandbox Engine",
        "latency": "890ms",
        "health": 100,
        "processed_count": 598,
        "accuracy": "100%",
        "description": "Spins up ephemeral rootless containers, applies approved diffs in total isolation, and executes full regression test suites.",
        "tags": ["Isolated Docker", "Test Runner", "Zero Regression", "Safe Apply"],
        "recent_activity": [
            {"time": "4m ago", "event": "Ephemeral sandbox container initialized"},
            {"time": "44m ago", "event": "Verification suite passed 14/14 tests in 980ms"}
        ]
    }
]


class AgentService:
    def __init__(self):
        self.incident_repo = incident_repo

    def get_incident_agent_activity(self, incident_id: str) -> Dict[str, Any]:
        incident = self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

        return {
            "incident_id": incident_id,
            "pipeline_agent": incident.get("pipeline_agent"),
            "active_step": incident.get("active_step", 1),
            "timeline": incident.get("timeline", []),
            "pod_logs": incident.get("pod_logs", []),
        }

    def get_fleet_agents(self) -> List[FleetAgent]:
        return [FleetAgent(**agent) for agent in FLEET_AGENTS]


agent_service = AgentService()
