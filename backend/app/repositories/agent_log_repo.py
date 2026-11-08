from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.repositories.base import BaseRepository

SEED_AGENT_LOGS = [
    {
        "id": "ALOG-8921-1",
        "incident_id": "INC-8921",
        "agent_name": "Observer Agent",
        "status": "completed",
        "input_summary": "Telemetry stream from payment-gateway-svc (OpenTelemetry & Prometheus metrics)",
        "output_summary": "Detected 5xx anomaly spike: +420 err/sec on /api/v1/stripe/webhook",
        "started_at": "2026-11-06T09:41:20Z",
        "completed_at": "2026-11-06T09:41:23Z",
        "error": None
    },
    {
        "id": "ALOG-8921-2",
        "incident_id": "INC-8921",
        "agent_name": "Investigator Agent",
        "status": "completed",
        "input_summary": "Stack trace, git commit history, and AST diffs for payment-gateway-svc",
        "output_summary": "Isolated root cause in commit e78f21 (PR #389): guest checkout invoices lack customer object causing NullPointerException at StripeWebhookHandler.java:142",
        "started_at": "2026-11-06T09:41:25Z",
        "completed_at": "2026-11-06T09:42:05Z",
        "error": None
    },
    {
        "id": "ALOG-8921-3",
        "incident_id": "INC-8921",
        "agent_name": "Repair Agent",
        "status": "completed",
        "input_summary": "Root cause analysis report and target file StripeWebhookHandler.java",
        "output_summary": "Synthesized PAT-8921 with defensive Optional guard and guest_customer_id metadata fallback (-2/+5 lines)",
        "started_at": "2026-11-06T09:42:10Z",
        "completed_at": "2026-11-06T09:43:10Z",
        "error": None
    },
    {
        "id": "ALOG-8921-4",
        "incident_id": "INC-8921",
        "agent_name": "Verifier Agent",
        "status": "completed",
        "input_summary": "Approved patch PAT-8921 applied in isolated cgroup sandbox mesh-sandbox-992",
        "output_summary": "Executed 14/14 test suites in 980ms with 0 regressions. Verified recovery.",
        "started_at": "2026-11-06T09:44:00Z",
        "completed_at": "2026-11-06T09:44:12Z",
        "error": None
    }
]


class AgentLogRepository(BaseRepository):
    def __init__(self):
        super().__init__("agent_logs")
        self._memory_store: Dict[str, Dict[str, Any]] = {
            item["id"]: dict(item) for item in SEED_AGENT_LOGS
        }

    def list_by_incident(self, incident_id: str) -> List[Dict[str, Any]]:
        if self.is_mongo_available:
            cursor = self.collection.find({"incident_id": incident_id}, {"_id": 0}).sort("started_at", 1)
            return list(cursor)

        return [log for log in self._memory_store.values() if log.get("incident_id") == incident_id]

    def list_all(self, limit: int = 100) -> List[Dict[str, Any]]:
        if self.is_mongo_available:
            cursor = self.collection.find({}, {"_id": 0}).sort("started_at", -1).limit(limit)
            return list(cursor)

        return list(self._memory_store.values())[:limit]

    def get_by_id(self, log_id: str) -> Optional[Dict[str, Any]]:
        if self.is_mongo_available:
            doc = self.collection.find_one({"id": log_id}, {"_id": 0})
            if doc:
                return doc

        return self._memory_store.get(log_id)

    def create(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        log_id = log_data.get("id")
        if not log_id:
            import random
            log_id = f"ALOG-{log_data.get('incident_id', 'GEN')}-{random.randint(100, 999)}"
            log_data["id"] = log_id

        if "started_at" not in log_data:
            log_data["started_at"] = datetime.now(timezone.utc).isoformat()
        if "completed_at" not in log_data and log_data.get("status") == "completed":
            log_data["completed_at"] = datetime.now(timezone.utc).isoformat()

        # Sanitize summaries to reasonable size limits per Section 03
        if log_data.get("input_summary") and len(log_data["input_summary"]) > 1000:
            log_data["input_summary"] = log_data["input_summary"][:1000] + "... [truncated]"
        if log_data.get("output_summary") and len(log_data["output_summary"]) > 2000:
            log_data["output_summary"] = log_data["output_summary"][:2000] + "... [truncated]"

        self._memory_store[log_id] = dict(log_data)

        if self.is_mongo_available:
            self.collection.update_one({"id": log_id}, {"$set": log_data}, upsert=True)

        return log_data
