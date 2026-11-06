from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import HTTPException
from app.repositories import (
    incident_repo,
    agent_log_repo,
    evidence_repo,
    patch_repo,
    verification_repo,
)
from app.schemas.agent import FleetAgent


AGENT_METADATA_TEMPLATES = [
    {
        "id": "observer",
        "agent_id": "obs-prod-01",
        "name": "Observer Agent",
        "role": "Log Anomaly Ingestion & Error Detection",
        "icon": "radar",
        "model": "gemini-2.5-flash",
        "latency": "142ms",
        "health": 99,
        "description": "Monitors microservice log streams, exception signatures, and distributed trace metrics to isolate anomaly triggers in real time.",
        "tags": ["Logs", "OpenTelemetry", "Stack Traces", "Signatures"],
        "capabilities": [
            "Log anomaly pattern detection",
            "Prometheus & OpenTelemetry ingestion",
            "Exception signature aggregation",
            "Dead letter queue inspection"
        ],
        "metric_label1": "Telemetry Ingested",
        "metric_value1": "1,420 ev/s",
        "metric_label2": "Detection Precision",
        "metric_value2": "99.8%",
        "metric_label3": "MTTD Latency",
        "metric_value3": "1.4s",
        "accuracy": "99.8%",
    },
    {
        "id": "investigator",
        "agent_id": "inv-prod-02",
        "name": "Investigator Agent",
        "role": "Root Cause Analysis & Commit Tracing",
        "icon": "biotech",
        "model": "gemini-2.5-pro",
        "latency": "420ms",
        "health": 98,
        "description": "Performs deep contextual analysis of codebases, git diffs, and stack trace frames to pinpoint exact fault mechanisms.",
        "tags": ["AST Parsing", "Git Blame", "Context Window", "Root Cause"],
        "capabilities": [
            "Git commit lineage tracing",
            "Causal inference engine",
            "AST symbol cross-ref",
            "Dependency graph blast radius"
        ],
        "metric_label1": "Causal Graphs",
        "metric_value1": "894 nodes",
        "metric_label2": "Attribution Accuracy",
        "metric_value2": "97.4%",
        "metric_label3": "Context Window",
        "metric_value3": "128k T",
        "accuracy": "97.4%",
    },
    {
        "id": "repair",
        "agent_id": "rep-prod-03",
        "name": "Repair Agent",
        "role": "Targeted Semantic Patch Synthesis",
        "icon": "auto_fix_high",
        "model": "gemini-2.5-flash",
        "latency": "610ms",
        "health": 100,
        "description": "Synthesizes minimal, defensive code patches adhering strictly to existing AST patterns and team architectural conventions.",
        "tags": ["Defensive Coding", "Unified Diff", "Null Safety", "Patch Gen"],
        "capabilities": [
            "Semantic AST editing",
            "Linter compliance",
            "Defensive pattern synthesis",
            "Zero-dependency constraint solver"
        ],
        "metric_label1": "Patches Generated",
        "metric_value1": "612",
        "metric_label2": "First-pass Approval",
        "metric_value2": "98.9%",
        "metric_label3": "Avg AST Diff",
        "metric_value3": "-2 / +5 lines",
        "accuracy": "98.9%",
    },
    {
        "id": "human_gate",
        "agent_id": "gate-hitl-05",
        "name": "Human Gate",
        "role": "Policy Enforcement & Human-in-the-Loop Approval",
        "icon": "verified_user",
        "model": "Deterministic Policy Engine",
        "latency": "<5ms",
        "health": 100,
        "description": "Guarantees zero autonomous production writes. Requires explicit cryptographic or authenticated human sign-off before patch dispatch.",
        "tags": ["HITL", "Zero Trust", "Role Based", "Audit Ledger"],
        "capabilities": [
            "Zero-trust sign-off verification",
            "Cryptographic ledger attestation",
            "Diff impact inspection",
            "Role-based authorization"
        ],
        "metric_label1": "Sign-offs Reviewed",
        "metric_value1": "482",
        "metric_label2": "Compliance Rate",
        "metric_value2": "100%",
        "metric_label3": "Quorum Invariant",
        "metric_value3": "Enforced",
        "accuracy": "100%",
    },
    {
        "id": "verifier",
        "agent_id": "ver-prod-04",
        "name": "Verifier Agent",
        "role": "Isolated Sandbox Regression Verification",
        "icon": "science",
        "model": "Docker Sandbox Engine",
        "latency": "890ms",
        "health": 100,
        "description": "Spins up ephemeral rootless containers, applies approved diffs in total isolation, and executes full regression test suites.",
        "tags": ["Isolated Docker", "Test Runner", "Zero Regression", "Safe Apply"],
        "capabilities": [
            "Ephemeral Docker/Firecracker isolation",
            "Synthetic edge test synthesis",
            "Canary traffic shadowing",
            "Immutable ledger attestation"
        ],
        "metric_label1": "Suites Executed",
        "metric_value1": "598",
        "metric_label2": "Prod Regressions",
        "metric_value2": "0.0%",
        "metric_label3": "Sandbox Spinup",
        "metric_value3": "980ms",
        "accuracy": "100%",
    },
]


class AgentService:
    def __init__(self):
        self.incident_repo = incident_repo
        self.agent_log_repo = agent_log_repo
        self.evidence_repo = evidence_repo
        self.patch_repo = patch_repo
        self.verification_repo = verification_repo

    def get_incident_agent_activity(self, incident_id: str) -> Dict[str, Any]:
        incident = self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

        agent_logs = self.agent_log_repo.list_by_incident(incident_id)

        return {
            "incident_id": incident_id,
            "pipeline_agent": incident.get("pipeline_agent"),
            "active_step": incident.get("active_step", 1),
            "timeline": incident.get("timeline", []),
            "pod_logs": incident.get("pod_logs", []),
            "agent_logs": agent_logs,
        }

    def get_incident_agent_logs(self, incident_id: str) -> List[Dict[str, Any]]:
        return self.agent_log_repo.list_by_incident(incident_id)

    def record_agent_log(
        self,
        incident_id: str,
        agent_name: str,
        status: str = "completed",
        input_summary: Optional[str] = None,
        output_summary: Optional[str] = None,
        error: Optional[str] = None
    ) -> Dict[str, Any]:
        return self.agent_log_repo.create({
            "incident_id": incident_id,
            "agent_name": agent_name,
            "status": status,
            "input_summary": input_summary,
            "output_summary": output_summary,
            "error": error
        })

    def list_all_agent_logs(
        self,
        agent_name: Optional[str] = None,
        incident_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """List execution logs with optional filtering by agent name, incident, or status."""
        logs = self.agent_log_repo.list_all(limit=limit)

        if incident_id:
            logs = [log for log in logs if log.get("incident_id") == incident_id]
        if agent_name:
            norm_name = agent_name.lower().replace(" agent", "").strip()
            logs = [log for log in logs if norm_name in log.get("agent_name", "").lower()]
        if status:
            logs = [log for log in logs if log.get("status") == status]

        return logs

    def get_fleet_agents(self) -> List[FleetAgent]:
        """
        Dynamically synthesize the current live operational state of the 4 agents
        and human gate from the actual repository records and execution logs.
        """
        all_logs = self.agent_log_repo.list_all(limit=100)
        all_incidents = self.incident_repo.list_all()

        fleet = []

        for template in AGENT_METADATA_TEMPLATES:
            agent_id = template["id"]
            name = template["name"]

            # Filter execution logs for this specific agent
            norm_name = name.lower().replace(" agent", "").strip()
            matching_logs = [
                l for l in all_logs
                if norm_name in l.get("agent_name", "").lower()
            ]

            # Sort logs chronologically by started_at descending (latest first)
            matching_logs.sort(
                key=lambda l: l.get("started_at") or l.get("timestamp") or "",
                reverse=True
            )

            latest_log = matching_logs[0] if matching_logs else None

            # Base agent state
            agent_data = dict(template)
            agent_data["recent_activity"] = []

            # Populate recent_activity from actual execution logs
            for l in matching_logs[:5]:
                started = l.get("started_at") or l.get("timestamp") or "recently"
                event_summary = l.get("output_summary") or l.get("input_summary") or f"Execution {l.get('status')}"
                agent_data["recent_activity"].append({
                    "time": started,
                    "event": event_summary,
                    "status": l.get("status"),
                    "incidentId": l.get("incident_id")
                })

            if latest_log:
                agent_data["current_incident_id"] = latest_log.get("incident_id")
                agent_data["last_run_time"] = latest_log.get("completed_at") or latest_log.get("started_at")
                agent_data["last_activity"] = latest_log.get("output_summary") or latest_log.get("input_summary") or "Active"
                exec_status = latest_log.get("status", "idle")
                agent_data["execution_status"] = exec_status
                agent_data["error"] = latest_log.get("error")
            else:
                agent_data["execution_status"] = "idle"
                agent_data["last_activity"] = "Awaiting incident trigger"
                agent_data["last_run_time"] = None
                agent_data["current_incident_id"] = None
                exec_status = "idle"

            # Domain-specific enrichment for each agent
            if agent_id == "observer":
                # Evidence collection count
                matching_incident_id = agent_data.get("current_incident_id")
                if matching_incident_id:
                    evidence_items = self.evidence_repo.list_by_incident(matching_incident_id)
                else:
                    evidence_items = []
                agent_data["evidence_count"] = len(evidence_items)

                if exec_status == "running":
                    agent_data["status"] = "running"
                    agent_data["status_text"] = "Ingesting Telemetry Anomaly"
                elif exec_status == "failed":
                    agent_data["status"] = "failed"
                    agent_data["status_text"] = f"Detection Failed: {agent_data.get('error') or 'Error'}"
                elif latest_log:
                    agent_data["status"] = "active"
                    agent_data["status_text"] = "Telemetry Anomaly Ingested"
                else:
                    agent_data["status"] = "idle"
                    agent_data["status_text"] = "Telemetry Stream Monitoring"

            elif agent_id == "investigator":
                matching_incident_id = agent_data.get("current_incident_id")
                inc = self.incident_repo.get_by_id(matching_incident_id) if matching_incident_id else None

                if inc:
                    agent_data["root_cause"] = inc.get("root_cause") or (latest_log.get("output_summary") if latest_log else None)
                    agent_data["confidence"] = inc.get("confidence", 96.4)
                else:
                    agent_data["root_cause"] = latest_log.get("output_summary") if latest_log else None
                    agent_data["confidence"] = 96.4 if latest_log else None

                if exec_status == "running":
                    agent_data["status"] = "running"
                    agent_data["status_text"] = "Isolating Diffs & Blame"
                elif exec_status == "failed":
                    agent_data["status"] = "failed"
                    agent_data["status_text"] = f"Diagnosis Failed: {agent_data.get('error') or 'Error'}"
                elif latest_log:
                    agent_data["status"] = "evaluating"
                    agent_data["status_text"] = "Root Cause Isolated"
                else:
                    agent_data["status"] = "idle"
                    agent_data["status_text"] = "Standby"

            elif agent_id == "repair":
                matching_incident_id = agent_data.get("current_incident_id")
                patches = self.patch_repo.list_by_incident(matching_incident_id) if matching_incident_id else []
                latest_patch = patches[0] if patches else None

                if latest_patch:
                    agent_data["proposed_patch_id"] = latest_patch.get("id")
                    agent_data["patch_status"] = latest_patch.get("status")
                    agent_data["files_affected"] = [latest_patch.get("file_path")] if latest_patch.get("file_path") else []
                else:
                    agent_data["proposed_patch_id"] = None
                    agent_data["patch_status"] = None
                    agent_data["files_affected"] = []

                if exec_status == "running":
                    agent_data["status"] = "running"
                    agent_data["status_text"] = "Synthesizing AST Patch"
                elif exec_status == "failed":
                    agent_data["status"] = "failed"
                    agent_data["status_text"] = f"Patch Failed: {agent_data.get('error') or 'Constraint Error'}"
                elif latest_patch and latest_patch.get("status") == "pending":
                    agent_data["status"] = "active"
                    agent_data["status_text"] = f"Patch {latest_patch.get('id')} Ready"
                elif latest_log:
                    agent_data["status"] = "completed"
                    agent_data["status_text"] = "Patch Synthesized"
                else:
                    agent_data["status"] = "idle"
                    agent_data["status_text"] = "Standby"

            elif agent_id == "human_gate":
                # Check for any incident waiting for approval
                pending_incidents = [
                    i for i in all_incidents
                    if i.get("status") in ["awaiting_approval", "patch_pending_approval", "Patch Proposed"]
                ]
                if pending_incidents:
                    agent_data["status"] = "pending_approval"
                    agent_data["status_text"] = f"Awaiting Sign-off ({pending_incidents[0].get('id')})"
                    agent_data["current_incident_id"] = pending_incidents[0].get("id")
                    agent_data["last_activity"] = f"Sign-off pending for {pending_incidents[0].get('id')}"
                else:
                    agent_data["status"] = "standby"
                    agent_data["status_text"] = "Policy Gate Enforced"

            elif agent_id == "verifier":
                matching_incident_id = agent_data.get("current_incident_id")
                runs = self.verification_repo.list_by_incident(matching_incident_id) if matching_incident_id else []
                latest_run = runs[0] if runs else None

                if latest_run:
                    agent_data["tests_passed"] = latest_run.get("passed", 0)
                    agent_data["tests_failed"] = latest_run.get("failed", 0)
                    agent_data["verification_result"] = latest_run.get("test_output_summary") or latest_run.get("status")
                    run_status = latest_run.get("status")
                else:
                    agent_data["tests_passed"] = None
                    agent_data["tests_failed"] = None
                    agent_data["verification_result"] = None
                    run_status = None

                if exec_status == "running" or run_status == "running":
                    agent_data["status"] = "running"
                    agent_data["status_text"] = "Executing Sandbox Suites"
                elif exec_status == "failed" or run_status == "failed":
                    agent_data["status"] = "failed"
                    agent_data["status_text"] = f"Verification Failed ({agent_data.get('tests_failed', 1)} failed)"
                elif run_status == "passed":
                    agent_data["status"] = "completed"
                    agent_data["status_text"] = f"Verified ({agent_data.get('tests_passed', 14)}/{agent_data.get('tests_passed', 14)} Passed)"
                elif latest_log:
                    agent_data["status"] = "idle"
                    agent_data["status_text"] = "Containers Warm"
                else:
                    agent_data["status"] = "idle"
                    agent_data["status_text"] = "Containers Warm"

            agent_data["processed_count"] = len(matching_logs) or 1
            fleet.append(FleetAgent(**agent_data))

        return fleet


agent_service = AgentService()
