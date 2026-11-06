from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.repositories.base import BaseRepository

# Pre-seeded initial incidents conforming to Section 8 & 9 of design / mockData
SEED_INCIDENTS = [
    {
        "id": "INC-8921",
        "title": "NullPointer in StripeWebhookHandler after v2.14.0 rollout",
        "application": "payment-gateway-svc",
        "version": "v2.14",
        "description": "Cannot read field customerMetadata because payload.customer is null on guest checkout invoices",
        "severity": "critical",
        "status": "awaiting_approval",
        "detected_at": "2026-11-06T09:41:22Z",
        "detected_time": "4m ago",
        "signature": "java.lang.NullPointerException: Cannot invoke StripeWebhookPayload.getCustomerId()",
        "location": "StripeWebhookController.kt:142",
        "trace_id": "8a9f31c0e",
        "impact": "54 req/s impact",
        "pipeline_agent": "Repair Agent (PR #891 ready)",
        "active_step": 4,
        "stack_trace": 'Exception in thread "stripe-worker-4" java.lang.NullPointerException: Cannot read field "customerMetadata" because "payload.customer" is null\n    at com.sentinelmesh.billing.StripeWebhookHandler.processEvent(StripeWebhookHandler.java:142)\n    at com.sentinelmesh.billing.StripeWebhookHandler.handleInvoicePaid(StripeWebhookHandler.java:88)\n    at com.sentinelmesh.billing.IngestionEngine.lambda$consume$2(IngestionEngine.java:41)',
        "root_cause": "Recent Pull Request #389 assumed the Stripe customer object was strictly non-null in invoice.payment_succeeded events. However, guest checkout invoices omit this entity, triggering immediate dereference crash.",
        "source_file": "src/main/java/com/sentinelmesh/billing/StripeWebhookHandler.java:142",
        "confidence": 96.4,
        "blast_radius": "Isolated",
        "blast_radius_detail": "Guest invoice webhook pipeline only. Core recurring billing unaffected.",
        "correlated_pr": "#389 by @j-chen (Merged 42 minutes ago)",
        "evidence_ids": ["EVI-8921-1", "EVI-8921-2"],
        "proposed_patch": {
            "id": "PAT-8921",
            "incidentId": "INC-8921",
            "filePath": "src/main/java/com/sentinelmesh/billing/StripeWebhookHandler.java",
            "diffSummary": "-2 lines / +5 lines",
            "explanation": "Uses Optional to guard nullable customer object and falls back to guest_customer_id from payload metadata.",
            "status": "pending",
            "originalLines": [
                {"num": 139, "text": "public void processEvent(StripeWebhookPayload payload) {", "type": "context"},
                {"num": 140, "text": '    Objects.requireNonNull(payload, "Payload cannot be null");', "type": "context"},
                {"num": 141, "text": " ", "type": "context"},
                {"num": 142, "text": "   String customerId = payload.getCustomer().getId();", "type": "deleted"},
                {"num": 143, "text": "   billingService.recordTransaction(customerId, payload.getAmount());", "type": "deleted"},
                {"num": 144, "text": "}", "type": "context"}
            ],
            "patchedLines": [
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
        },
        "pod_logs": [
            {"time": "09:41:19.401", "level": "INFO", "message": "Webhook payload signature validated for id=evt_3P7x9L2eZvKYlo2C"},
            {"time": "09:41:20.108", "level": "INFO", "message": "Resolved payment_intent: pi_3P7x9L2eZvKYlo2C_secret (status=succeeded)"},
            {"time": "09:41:21.054", "level": "WARN", "message": "Payload customer object evaluates to null for invoice.payment_succeeded"},
            {"time": "09:41:22.012", "level": "ERROR", "message": "NullPointerException: StripeWebhookHandler.java:142 on thread worker-4"},
            {"time": "09:41:22.420", "level": "ERROR", "message": "Dead Letter Queue route activated: 420 messages dispatched to DLQ_STRIPE_DEAD"}
        ],
        "timeline": [
            {"agent": "Observer", "action": "Detected failure spike (+420 err/sec)", "timestamp": "09:41:23 UTC", "status": "completed"},
            {"agent": "Investigator", "action": "Isolated commit e78f21 and root cause", "timestamp": "09:42:05 UTC", "status": "completed"},
            {"agent": "Repair", "action": "Synthesized minimal defensive null-check patch", "timestamp": "09:43:10 UTC", "status": "completed"},
            {"agent": "Human Gate", "action": "Awaiting Staff SRE sign-off", "timestamp": "09:44:00 UTC", "status": "pending"},
            {"agent": "Verifier", "action": "Ephemeral sandbox pre-warmed", "timestamp": "09:44:12 UTC", "status": "queued"}
        ]
    },
    {
        "id": "INC-001",
        "title": "GET /users returns HTTP 500 internal server error",
        "application": "demo-api",
        "version": "v1.0",
        "description": "Database connection pool timeout during unindexed query execution on user profile service",
        "severity": "high",
        "status": "detected",
        "detected_at": "2026-11-06T10:00:00Z",
        "detected_time": "15m ago",
        "signature": "sqlalchemy.exc.TimeoutError: QueuePool limit of size 5 overflow 10 reached",
        "location": "routes/users.py:38",
        "trace_id": "9b128c77f",
        "impact": "12 req/s failure",
        "pipeline_agent": "Observer Agent (Collecting stack logs)",
        "active_step": 1,
        "stack_trace": "sqlalchemy.exc.TimeoutError: QueuePool limit of size 5 overflow 10 reached, connection timed out, timeout 30.00\n  File 'demo_api/routes/users.py', line 38, in get_users\n    result = db.execute(select(User).filter(User.active == True))",
        "root_cause": "Connection leak in unclosed async context manager combined with missing index on User.active",
        "source_file": "demo_api/routes/users.py:38",
        "confidence": 91.0,
        "blast_radius": "Isolated",
        "blast_radius_detail": "User query endpoint only. Mutation endpoints use dedicated pool.",
        "correlated_pr": "#104 (Merged 2 hours ago)",
        "evidence_ids": ["EVI-001-1"],
        "proposed_patch": None,
        "pod_logs": [
            {"time": "10:00:01.120", "level": "WARN", "message": "DB Pool exhaustion: available connections = 0"},
            {"time": "10:00:03.441", "level": "ERROR", "message": "HTTP 500 GET /users - QueuePool timeout"}
        ],
        "timeline": [
            {"agent": "Observer", "action": "Observed 5xx spike on /users endpoint", "timestamp": "10:00:05 UTC", "status": "completed"}
        ]
    }
]


class IncidentRepository(BaseRepository):
    def __init__(self):
        super().__init__("incidents")
        self._memory_store: Dict[str, Dict[str, Any]] = {
            item["id"]: dict(item) for item in SEED_INCIDENTS
        }

    def list_all(self, status: Optional[str] = None, severity: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.is_mongo_available:
            query = {}
            if status:
                query["status"] = status
            if severity:
                query["severity"] = severity
            cursor = self.collection.find(query, {"_id": 0})
            docs = list(cursor)
            if docs:
                return docs
            # If MongoDB collection is empty, seed it
            for item in self._memory_store.values():
                self.collection.update_one({"id": item["id"]}, {"$set": item}, upsert=True)
            return list(self.collection.find(query, {"_id": 0}))

        # In-memory retrieval
        items = list(self._memory_store.values())
        if status:
            items = [i for i in items if i.get("status") == status]
        if severity:
            items = [i for i in items if i.get("severity") == severity]
        return items

    def get_by_id(self, incident_id: str) -> Optional[Dict[str, Any]]:
        if self.is_mongo_available:
            doc = self.collection.find_one({"id": incident_id}, {"_id": 0})
            if doc:
                return doc

        return self._memory_store.get(incident_id)

    def create(self, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        incident_id = incident_data.get("id")
        if not incident_id:
            import random
            incident_id = f"INC-{random.randint(1000, 9999)}"
            incident_data["id"] = incident_id

        if "detected_at" not in incident_data:
            incident_data["detected_at"] = datetime.now(timezone.utc).isoformat()
        if "created_at" not in incident_data:
            incident_data["created_at"] = datetime.now(timezone.utc).isoformat()

        # Update in-memory
        self._memory_store[incident_id] = dict(incident_data)

        # Update MongoDB if available
        if self.is_mongo_available:
            self.collection.update_one({"id": incident_id}, {"$set": incident_data}, upsert=True)

        return incident_data

    def update(self, incident_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        existing = self.get_by_id(incident_id)
        if not existing:
            return None

        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        existing.update(updates)
        self._memory_store[incident_id] = existing

        if self.is_mongo_available:
            self.collection.update_one({"id": incident_id}, {"$set": existing}, upsert=True)

        return existing
