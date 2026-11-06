from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.repositories.base import BaseRepository

SEED_VERIFICATION_RUNS = [
    {
        "id": "VR-101",
        "incident_id": "INC-8921",
        "patch_id": "PAT-8921",
        "target_file": "StripeWebhookHandler.java",
        "status": "passed",
        "passed": 14,
        "failed": 0,
        "skipped": 0,
        "duration_ms": 980,
        "completed_at": "2026-11-06T09:44:12Z",
        "environment": "mesh-sandbox-isolated (Docker rootless)",
        "tests": [
            {"name": "RegressionTest.baselineInvariantCheck()", "status": "passed", "duration": "180ms"},
            {"name": "SyntheticEdgeTest.nullPayloadSafety()", "status": "passed", "duration": "110ms"},
            {"name": "IntegrationTest.transactionBoundaryRollback()", "status": "passed", "duration": "290ms"},
            {"name": "GuestCheckoutWebhookTest.guestCustomerIdFallback()", "status": "passed", "duration": "140ms"},
        ],
        "test_output_summary": "14/14 tests passed in isolated container. Zero regression confirmed. Guest customer fallback verified."
    }
]


class VerificationRepository(BaseRepository):
    def __init__(self):
        super().__init__("verification")
        self._memory_store: Dict[str, Dict[str, Any]] = {
            item["id"]: dict(item) for item in SEED_VERIFICATION_RUNS
        }

    def list_all(self) -> List[Dict[str, Any]]:
        if self.is_mongo_available:
            cursor = self.collection.find({}, {"_id": 0})
            docs = list(cursor)
            if docs:
                return docs

        return list(self._memory_store.values())

    def list_by_incident(self, incident_id: str) -> List[Dict[str, Any]]:
        if self.is_mongo_available:
            cursor = self.collection.find({"incident_id": incident_id}, {"_id": 0})
            docs = list(cursor)
            if docs:
                return docs

        return [v for v in self._memory_store.values() if v.get("incident_id") == incident_id]

    def get_by_id(self, verification_id: str) -> Optional[Dict[str, Any]]:
        if self.is_mongo_available:
            doc = self.collection.find_one({"id": verification_id}, {"_id": 0})
            if doc:
                return doc

        return self._memory_store.get(verification_id)

    def create(self, run_data: Dict[str, Any]) -> Dict[str, Any]:
        vr_id = run_data.get("id")
        if not vr_id:
            import random
            vr_id = f"VR-{random.randint(100, 999)}"
            run_data["id"] = vr_id

        if "completed_at" not in run_data:
            run_data["completed_at"] = datetime.now(timezone.utc).isoformat()

        self._memory_store[vr_id] = dict(run_data)

        if self.is_mongo_available:
            self.collection.update_one({"id": vr_id}, {"$set": run_data}, upsert=True)

        return run_data
