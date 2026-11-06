import pytest
from app.repositories import (
    incident_repo,
    evidence_repo,
    patch_repo,
    verification_repo,
    audit_repo,
    agent_log_repo,
)
from app.services import incident_service, patch_service, verification_service, agent_service
from app.schemas.incident import IncidentCreate
from app.schemas.patch import PatchDecisionRequest


def test_database_collections_initialized():
    """Verify all 6 collections from 03_DATABASE_IMPLEMENTATION.md are defined."""
    assert incident_repo.collection_name == "incidents"
    assert evidence_repo.collection_name == "evidence"
    assert agent_log_repo.collection_name == "agent_logs"
    assert patch_repo.collection_name == "patches"
    assert verification_repo.collection_name == "verification"
    assert audit_repo.collection_name == "audit_logs"


def test_incident_persistence_and_relationships():
    """Verify incident persistence and relationships with evidence, agent_logs, patches, and audit_logs."""
    inc_id = "INC-TEST-DB-01"
    
    # 1. Create Incident
    payload = IncidentCreate(
        id=inc_id,
        title="PostgreSQL deadlock under concurrent reservation batch",
        application="inventory-svc",
        version="v2.0",
        description="Deadlock detected between concurrent reservation workers",
        severity="high",
        status="detected",
        rawLogs="PSQLException: deadlock detected between process 14209 and 14211"
    )
    created = incident_service.create_incident(payload)
    assert created.id == inc_id
    assert created.status in ["detected", "investigating"]

    # Verify incident retrieved from repo
    fetched = incident_repo.get_by_id(inc_id)
    assert fetched is not None
    assert fetched["title"] == payload.title
    assert fetched["application"] == "inventory-svc"

    # 2. Evidence Persistence and Retrieval by incident_id
    evidence_entry = evidence_repo.create({
        "incident_id": inc_id,
        "type": "log",
        "source": "inventory-svc postgres.log",
        "content": "deadlock detected between transaction 8912 and 8913 on lock_row_sku",
    })
    assert evidence_entry["incident_id"] == inc_id
    
    evidence_list = evidence_repo.list_by_incident(inc_id)
    assert len(evidence_list) >= 1
    assert any(e["source"] == "inventory-svc postgres.log" for e in evidence_list)

    # 3. Agent Activity Logging (agent_logs collection)
    agent_log = agent_log_repo.create({
        "incident_id": inc_id,
        "agent_name": "Investigator Agent",
        "status": "completed",
        "input_summary": "Analyzed postgres lock graph and query order in StockReservationService.java",
        "output_summary": "Discovered non-deterministic row locking in batch reservation handler",
    })
    assert agent_log["incident_id"] == inc_id
    assert agent_log["agent_name"] == "Investigator Agent"

    agent_logs = agent_log_repo.list_by_incident(inc_id)
    assert len(agent_logs) >= 1
    assert any(log["agent_name"] == "Investigator Agent" for log in agent_logs)

    # 4. Patch Persistence as 'pending' before human review
    patch_id = f"PAT-{inc_id.replace('INC-', '')}"
    patch = patch_repo.create({
        "id": patch_id,
        "incident_id": inc_id,
        "file_path": "src/main/java/StockReservationService.java",
        "diff": "- lockRow(item.getSkuId())\n+ items.sort(Comparator.comparing(Item::getSkuId)).forEach(this::lockRow)",
        "explanation": "Sorts items deterministically by SKU before acquiring row locks",
        "status": "pending"
    })
    assert patch["id"] == patch_id
    assert patch["status"] == "pending"

    # 5. Patch Decision: Record Approval and verify Data Integrity Rule:
    # "Do not mark an incident recovered merely because a patch was generated or approved"
    decision_resp = patch_service.process_patch_decision(
        incident_id=inc_id,
        patch_id=patch_id,
        decision="approve",
        notes="Code reviewed and safe for sandbox execution.",
        actor="Elena Vance (Lead SRE)"
    )
    assert decision_resp.status == "approved"
    
    # Incident must NOT be recovered yet!
    incident_after_approval = incident_repo.get_by_id(inc_id)
    assert incident_after_approval["status"] == "approved"
    assert incident_after_approval["status"] != "recovered"

    # 6. Verification Results Persistence
    verification_resp = verification_service.run_verification(
        incident_id=inc_id,
        patch_id=patch_id,
        isolated_env="mesh-sandbox-isolated (Docker rootless)"
    )
    assert verification_resp.status == "passed"
    assert verification_resp.passed > 0
    assert verification_resp.failed == 0

    # Verification must be stored in verification collection
    verif_runs = verification_repo.list_by_incident(inc_id)
    assert len(verif_runs) >= 1
    assert verif_runs[0]["patch_id"] == patch_id

    # Now incident is verified recovered
    incident_after_verif = incident_repo.get_by_id(inc_id)
    assert incident_after_verif["status"] == "recovered"

    # 7. Audit Events Chronology & Relationship
    audit_events = audit_repo.list_by_incident(inc_id)
    assert len(audit_events) >= 1
    for event in audit_events:
        assert event.get("incident_id") == inc_id or event.get("incident") == inc_id
        assert "created_at" in event or "timestamp" in event
        assert "hash" in event


def test_api_endpoints_retrieve_evidence_and_agent_logs():
    """Verify endpoint handlers for retrieving evidence, agent logs, and audit logs by incident ID."""
    from app.api.routes.incidents import list_incident_evidence, get_incident_agent_logs, list_incident_audit_logs

    evidence_data = list_incident_evidence("INC-8921")
    assert isinstance(evidence_data, list)
    assert len(evidence_data) >= 1
    assert any(e.get("incident_id") == "INC-8921" for e in evidence_data)

    agent_logs_data = get_incident_agent_logs("INC-8921")
    assert isinstance(agent_logs_data, list)
    assert len(agent_logs_data) >= 1
    assert any(log.get("incident_id") == "INC-8921" for log in agent_logs_data)

    audit_data = list_incident_audit_logs("INC-8921")
    assert isinstance(audit_data, list)
    assert len(audit_data) >= 1
    assert any(log.get("incident_id") == "INC-8921" or log.get("incident") == "INC-8921" for log in audit_data)
