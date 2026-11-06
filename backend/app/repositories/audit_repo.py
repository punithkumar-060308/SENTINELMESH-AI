import hashlib
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.repositories.base import BaseRepository

SEED_AUDIT_LOGS = [
    {
        "id": "AUD-901",
        "timestamp": "2026-11-06 09:41:23 UTC",
        "agent": "Observer Agent",
        "action": "INCIDENT_DETECTED",
        "incident": "INC-8921",
        "status": "completed",
        "details": "Failure rate anomaly detected: +420 err/sec on payment-gateway-svc /api/v1/stripe/webhook",
        "hash": "0x4b78c92a...obs",
        "created_at": "2026-11-06T09:41:23Z"
    },
    {
        "id": "AUD-902",
        "timestamp": "2026-11-06 09:42:05 UTC",
        "agent": "Investigator Agent",
        "action": "ROOT_CAUSE_ISOLATED",
        "incident": "INC-8921",
        "status": "completed",
        "details": "Isolated commit e78f21 (PR #389). Identified dereference of payload.customer in StripeWebhookHandler.java:142.",
        "hash": "0x89f1a23e...inv",
        "created_at": "2026-11-06T09:42:05Z"
    },
    {
        "id": "AUD-903",
        "timestamp": "2026-11-06 09:43:10 UTC",
        "agent": "Repair Agent",
        "action": "PATCH_SYNTHESIZED",
        "incident": "INC-8921",
        "status": "completed",
        "details": "Generated defensive Optional check with fallback to guest_customer_id. PR #891 queued for human sign-off.",
        "hash": "0x3e109ab7...rep",
        "created_at": "2026-11-06T09:43:10Z"
    }
]


class AuditRepository(BaseRepository):
    def __init__(self):
        super().__init__("audit_logs")
        self._memory_store: Dict[str, Dict[str, Any]] = {
            item["id"]: dict(item) for item in SEED_AUDIT_LOGS
        }

    def list_all(self, limit: int = 100) -> List[Dict[str, Any]]:
        if self.is_mongo_available:
            cursor = self.collection.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)
            docs = list(cursor)
            if docs:
                return docs

        return sorted(
            list(self._memory_store.values()),
            key=lambda x: x.get("created_at") or x.get("timestamp", ""),
            reverse=True,
        )[:limit]

    def create(self, log_entry: Dict[str, Any]) -> Dict[str, Any]:
        log_id = log_entry.get("id")
        if not log_id:
            import random
            log_id = f"AUD-{random.randint(1000, 9999)}"
            log_entry["id"] = log_id

        if "timestamp" not in log_entry:
            log_entry["timestamp"] = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        if "created_at" not in log_entry:
            log_entry["created_at"] = datetime.now(timezone.utc).isoformat()

        if "hash" not in log_entry or not log_entry["hash"]:
            content = f"{log_entry.get('timestamp')}:{log_entry.get('agent')}:{log_entry.get('action')}:{log_entry.get('details')}"
            sha = hashlib.sha256(content.encode()).hexdigest()
            log_entry["hash"] = f"0x{sha[:8]}...sec"

        self._memory_store[log_id] = dict(log_entry)

        if self.is_mongo_available:
            self.collection.update_one({"id": log_id}, {"$set": log_entry}, upsert=True)

        return log_entry
