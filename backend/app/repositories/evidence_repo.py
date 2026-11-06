from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.repositories.base import BaseRepository

SEED_EVIDENCE = [
    {
        "id": "EVI-8921-1",
        "incident_id": "INC-8921",
        "type": "log",
        "source": "payment-gateway-svc /var/log/stripe-worker.log",
        "content": '2026-11-06T09:41:22.012Z ERROR NullPointerException in StripeWebhookHandler.java:142 on thread worker-4. Event payload: {"id": "evt_3P7x9L2eZvKYlo2C", "type": "invoice.payment_succeeded", "customer": null}',
        "collected_at": "2026-11-06T09:41:23Z",
    },
    {
        "id": "EVI-8921-2",
        "incident_id": "INC-8921",
        "type": "stack_trace",
        "source": "JVM Crash Log",
        "content": 'java.lang.NullPointerException: Cannot read field "customerMetadata" because "payload.customer" is null\n\tat com.sentinelmesh.billing.StripeWebhookHandler.processEvent(StripeWebhookHandler.java:142)',
        "collected_at": "2026-11-06T09:41:24Z",
    },
    {
        "id": "EVI-001-1",
        "incident_id": "INC-001",
        "type": "log",
        "source": "demo-api app.log",
        "content": "2026-11-06T10:00:03Z ERROR QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00",
        "collected_at": "2026-11-06T10:00:05Z",
    }
]


class EvidenceRepository(BaseRepository):
    def __init__(self):
        super().__init__("evidence")
        self._memory_store: Dict[str, Dict[str, Any]] = {
            item["id"]: dict(item) for item in SEED_EVIDENCE
        }

    def list_by_incident(self, incident_id: str) -> List[Dict[str, Any]]:
        if self.is_mongo_available:
            cursor = self.collection.find({"incident_id": incident_id}, {"_id": 0})
            docs = list(cursor)
            if docs:
                return docs

        return [e for e in self._memory_store.values() if e.get("incident_id") == incident_id]

    def create(self, evidence_data: Dict[str, Any]) -> Dict[str, Any]:
        evi_id = evidence_data.get("id")
        if not evi_id:
            import random
            evi_id = f"EVI-{evidence_data.get('incident_id', 'GEN')}-{random.randint(100, 999)}"
            evidence_data["id"] = evi_id

        if "collected_at" not in evidence_data:
            evidence_data["collected_at"] = datetime.now(timezone.utc).isoformat()

        self._memory_store[evi_id] = dict(evidence_data)

        if self.is_mongo_available:
            self.collection.update_one({"id": evi_id}, {"$set": evidence_data}, upsert=True)

        return evidence_data
