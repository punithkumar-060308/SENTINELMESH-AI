from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.repositories.base import BaseRepository

SEED_PATCHES = [
    {
        "id": "PAT-8921",
        "incident_id": "INC-8921",
        "file_path": "src/main/java/com/sentinelmesh/billing/StripeWebhookHandler.java",
        "diff": "@@ -142,2 +142,5 @@\n-   String customerId = payload.getCustomer().getId();\n-   billingService.recordTransaction(customerId, payload.getAmount());\n+   String customerId = Optional.ofNullable(payload.getCustomer())\n+           .map(Customer::getId)\n+           .orElseGet(() -> payload.getMetadata().getOrDefault(\"guest_customer_id\", \"GUEST_UNKNOWN\"));\n+   billingService.recordTransaction(customerId, payload.getAmount());\n+   log.info(\"Handled webhook event for customer: {}\", customerId);",
        "diff_summary": "-2 lines / +5 lines",
        "explanation": "Uses Optional to guard nullable customer object and falls back to guest_customer_id from payload metadata.",
        "status": "pending",
        "decision": None,
        "decided_at": None,
        "applied_at": None,
        "created_at": "2026-11-06T09:43:10Z",
        "original_lines": [
            {"num": 139, "text": "public void processEvent(StripeWebhookPayload payload) {", "type": "context"},
            {"num": 140, "text": '    Objects.requireNonNull(payload, "Payload cannot be null");', "type": "context"},
            {"num": 141, "text": " ", "type": "context"},
            {"num": 142, "text": "   String customerId = payload.getCustomer().getId();", "type": "deleted"},
            {"num": 143, "text": "   billingService.recordTransaction(customerId, payload.getAmount());", "type": "deleted"},
            {"num": 144, "text": "}", "type": "context"}
        ],
        "patched_lines": [
            {"num": 139, "text": "public void processEvent(StripeWebhookPayload payload) {", "type": "context"},
            {"num": 140, "text": '    Objects.requireNonNull(payload, "Payload cannot be null");', "type": "context"},
            {"num": 141, "text": " ", "type": "context"},
            {"num": 142, "text": "   String customerId = Optional.ofNullable(payload.getCustomer())", "type": "added"},
            {"num": 143, "text": "           .map(Customer::getId)", "type": "added"},
            {"num": 144, "text": '           .orElseGet(() -> payload.getMetadata().getOrDefault("guest_customer_id", "GUEST_UNKNOWN"));', "type": "added"},
            {"num": 145, "text": "   billingService.recordTransaction(customerId, payload.getAmount());", "type": "added"},
            {"num": 146, "text": '   log.info("Handled webhook event for customer: {}", customerId);', "type": "added"},
            {"num": 147, "text": "}", "type": "context"}
        ]
    }
]


class PatchRepository(BaseRepository):
    def __init__(self):
        super().__init__("patches")
        self._memory_store: Dict[str, Dict[str, Any]] = {
            item["id"]: dict(item) for item in SEED_PATCHES
        }

    def list_by_incident(self, incident_id: str) -> List[Dict[str, Any]]:
        if self.is_mongo_available:
            cursor = self.collection.find({"incident_id": incident_id}, {"_id": 0})
            docs = list(cursor)
            if docs:
                return docs

        return [p for p in self._memory_store.values() if p.get("incident_id") == incident_id]

    def get_by_id(self, patch_id: str) -> Optional[Dict[str, Any]]:
        if self.is_mongo_available:
            doc = self.collection.find_one({"id": patch_id}, {"_id": 0})
            if doc:
                return doc

        return self._memory_store.get(patch_id)

    def create(self, patch_data: Dict[str, Any]) -> Dict[str, Any]:
        patch_id = patch_data.get("id")
        if not patch_id:
            import random
            patch_id = f"PAT-{random.randint(1000, 9999)}"
            patch_data["id"] = patch_id

        if "created_at" not in patch_data:
            patch_data["created_at"] = datetime.now(timezone.utc).isoformat()
        if "status" not in patch_data:
            patch_data["status"] = "pending"

        self._memory_store[patch_id] = dict(patch_data)

        if self.is_mongo_available:
            self.collection.update_one({"id": patch_id}, {"$set": patch_data}, upsert=True)

        return patch_data

    def update(self, patch_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        existing = self.get_by_id(patch_id)
        if not existing:
            return None

        existing.update(updates)
        self._memory_store[patch_id] = existing

        if self.is_mongo_available:
            self.collection.update_one({"id": patch_id}, {"$set": existing}, upsert=True)

        return existing
