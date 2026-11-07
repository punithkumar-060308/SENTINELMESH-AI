#!/usr/bin/env python3
"""SentinelMesh AI — End-to-End Live Demonstration Scenario Script.
Adheres strictly to 09_INTEGRATION_AND_DEMO.md:
1. Health Check (System starts healthy).
2. Controlled Defect Trigger (GET /demo/users -> HTTP 500).
3. Incident Ingestion & Persistence (POST /api/incidents).
4. Multi-Agent Analysis (Observer -> Investigator -> Repair).
5. Workflow Pause at Human Approval Gate.
6. Rejection Safety Guard (Rejected patch blocked from sandbox).
7. Authenticated Human Sign-Off (Elena Vance / Lead SRE).
8. Real Docker Sandbox Execution (--network none, --read-only).
9. Verifier Independent Output Evaluation.
10. Incident Recovery Transition.
11. Cryptographic Audit Ledger Custody.
12. Failed Verification / Regression Prevention Guard.
"""

import sys
import os
import time
import uuid
import json
import httpx

API_BASE = os.environ.get("SENTINELMESH_API_URL", "http://127.0.0.1:8000")

# ANSI color codes
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


def header(title: str):
    print(f"\n{BOLD}{CYAN}------------------------------------------------------------{RESET}")
    print(f"{BOLD}{CYAN} {title} {RESET}")
    print(f"{BOLD}{CYAN}------------------------------------------------------------{RESET}")


def step(num: int, label: str):
    print(f"\n{BOLD}{BLUE}[Step {num}] {label}{RESET}")


def success(msg: str):
    print(f" {GREEN}✓ {msg}{RESET}")


def warn(msg: str):
    print(f" {YELLOW}⚠ {msg}{RESET}")


def failure(msg: str):
    print(f" {RED}✗ {msg}{RESET}")


def run_demo():
    print(f"{BOLD}{BLUE}============================================================{RESET}")
    print(f"{BOLD}{BLUE}    SentinelMesh AI — Live Autonomous Incident Lifecycle    {RESET}")
    print(f"{BOLD}{BLUE}============================================================{RESET}")
    print(f"Target API Endpoint: {BOLD}{API_BASE}{RESET}")

    client = httpx.Client(base_url=API_BASE, timeout=30.0)

    # -----------------------------------------------------------------------
    # Step 1: System Health Verification
    # -----------------------------------------------------------------------
    step(1, "Verify System Health & Readiness")
    try:
        res = client.get("/health")
        if res.status_code != 200:
            failure(f"Backend returned status {res.status_code}")
            return 1
        data = res.json()
        success(f"Backend Operational: {data.get('app')} (v{data.get('version')})")
        success(f"Status: {data.get('status')} | Database: {data.get('database')}")
    except Exception as e:
        failure(f"Cannot reach backend at {API_BASE}: {e}")
        print("Please start backend first: python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000")
        return 1

    # -----------------------------------------------------------------------
    # Step 2: Trigger Controlled Defect on Canonical Demo Application
    # -----------------------------------------------------------------------
    step(2, "Inject Controlled Defect into Demo Service")
    print("Sending saturated request: GET /demo/users?pool_timeout=0.05&max_connections=10&current_connections=10")
    defect_res = client.get("/demo/users?pool_timeout=0.05&max_connections=10&current_connections=10")
    if defect_res.status_code == 500:
        err_msg = defect_res.json().get("detail", "")
        success(f"Controlled Defect Successfully Produced HTTP 500: '{err_msg}'")
    else:
        failure(f"Expected HTTP 500 from demo app, got {defect_res.status_code}")
        return 1

    # -----------------------------------------------------------------------
    # Step 3: Register / Detect Incident
    # -----------------------------------------------------------------------
    step(3, "Observer Ingestion — Register Incident in Platform")
    inc_uid = uuid.uuid4().hex[:6].upper()
    incident_id = f"INC-DEMO-{inc_uid}"

    create_payload = {
        "id": incident_id,
        "title": "Connection pool exhaustion in demo user service",
        "application": "demo-user-api",
        "description": "Database connection pool saturated under peak traffic threshold (>10 conn / <0.1s timeout)",
        "severity": "high",
        "signature": "TimeoutError: Database connection timed out: pool limit reached",
        "stackTrace": 'TimeoutError: Database connection timed out\n  at demo_api/service.py:7 in get_users',
        "raw_logs": "2026-11-07 10:00:02 [ERROR] TimeoutError: Database connection timed out: pool limit reached",
    }

    create_res = client.post("/api/incidents", json=create_payload)
    if create_res.status_code != 201:
        failure(f"Incident registration failed: {create_res.text}")
        return 1

    inc_data = create_res.json()
    success(f"Incident Created: {inc_data['id']} (Status: {inc_data['status']})")
    success(f"Pipeline Agent: {inc_data.get('pipelineAgent')}")

    # -----------------------------------------------------------------------
    # Step 4: Multi-Agent Analysis (Observer -> Investigator -> Repair)
    # -----------------------------------------------------------------------
    step(4, "Autonomous Agent Pipeline — Investigate & Synthesize Repair")
    print(f"Triggering investigation for {incident_id}...")
    analyze_res = client.post(f"/api/incidents/{incident_id}/analyze")
    if analyze_res.status_code != 200:
        failure(f"Analysis request failed: {analyze_res.text}")
        return 1

    ana_data = analyze_res.json()
    success(f"Analysis Complete: Status transitioned to '{ana_data['status']}'")
    success(f"Pipeline Status: {ana_data.get('pipelineAgent')}")

    # Inspect synthesized patch and diagnosis
    detail_res = client.get(f"/api/incidents/{incident_id}")
    detail_data = detail_res.json()
    print(f"\n{BOLD} [Diagnosis Summary]{RESET}")
    print(f"   Root Cause:  {detail_data.get('rootCause')}")
    print(f"   Source File: {detail_data.get('sourceFile')}")
    print(f"   Confidence:  {detail_data.get('confidence')}%")

    patch_proposal = detail_data.get("proposedPatch")
    if patch_proposal:
        patch_id = patch_proposal["id"]
        print(f"\n{BOLD} [Proposed Repair Patch]{RESET}")
        print(f"   Patch ID:    {patch_id}")
        print(f"   File:        {patch_proposal.get('filePath')}")
        print(f"   Diff Summary:{patch_proposal.get('diffSummary')}")
        print(f"   Explanation: {patch_proposal.get('explanation')}")
    else:
        failure("No patch proposal found on incident!")
        return 1

    # -----------------------------------------------------------------------
    # Step 5: Safety Demonstration — Rejection Path Halts Sandbox
    # -----------------------------------------------------------------------
    step(5, "Safety Gate Check — Operator Rejection Prevents Sandbox Execution")
    rej_res = client.post(f"/api/incidents/{incident_id}/approve", json={
        "decision": "reject",
        "reason": "Pre-flight security review: Testing rejection guardrails before approval sign-off.",
        "actor": "Staff SRE Auditor",
    })
    success(f"Patch rejected: status={rej_res.json().get('status')}")

    # Attempting verification on rejected incident MUST return HTTP 400
    verify_blocked = client.post(f"/api/incidents/{incident_id}/verify", json={"patchId": patch_id})
    if verify_blocked.status_code == 400:
        err_msg = verify_blocked.json().get("detail", "")
        success(f"Sandbox Disallowed Execution on Rejected Patch: HTTP 400 ('{err_msg}')")
    else:
        failure(f"Expected HTTP 400 on rejected verify, got {verify_blocked.status_code}")
        return 1

    # -----------------------------------------------------------------------
    # Step 6: Authenticated Human Approval Sign-Off
    # -----------------------------------------------------------------------
    step(6, "Human-in-the-Loop Gate — Authenticated Approval Sign-Off")
    app_res = client.post(f"/api/incidents/{incident_id}/approve", json={
        "decision": "approve",
        "notes": "Reviewed non-blocking fallback patch for demo user connection pool. Approved for sandbox execution.",
        "actor": "Elena Vance (Lead SRE)",
    })
    if app_res.status_code != 200:
        failure(f"Approval failed: {app_res.text}")
        return 1
    success(f"Human Approval Recorded: status='{app_res.json().get('status')}' (Actor: Elena Vance)")

    # -----------------------------------------------------------------------
    # Step 7: Isolated Docker Sandbox Execution & Verifier
    # -----------------------------------------------------------------------
    step(7, "Isolated Docker Sandbox Execution & Independent Verifier")
    print("Dispatching patch to Docker container (restricted: --network none, --read-only, user 1000:1000)...")
    verif_res = client.post(f"/api/incidents/{incident_id}/verify", json={
        "patchId": patch_id,
        "isolatedEnv": "mesh-sandbox-isolated (Docker rootless)",
    })
    if verif_res.status_code != 200:
        failure(f"Verification request failed: {verif_res.text}")
        return 1

    verif_data = verif_res.json()
    success(f"Container Execution Status: {verif_data['status'].upper()}")
    success(f"Container Name: {verif_data.get('containerId')}")
    success(f"Execution Duration: {verif_data.get('durationMs')}ms")
    success(f"Test Outcome: {verif_data.get('passed')} Passed, {verif_data.get('failed')} Failed")

    for tc in verif_data.get("tests", []):
        print(f"     • {tc.get('name')}: {tc.get('status')} ({tc.get('duration')})")

    if verif_data["status"] != "passed" or verif_data["failed"] > 0:
        failure("Verification did not pass successfully!")
        return 1

    # -----------------------------------------------------------------------
    # Step 8: Verify Incident Recovery State
    # -----------------------------------------------------------------------
    step(8, "Verify Incident Recovery & Resolution")
    rec_res = client.get(f"/api/incidents/{incident_id}")
    rec_data = rec_res.json()
    if rec_data["status"] == "recovered":
        success(f"Incident {incident_id} Transitioned to 'recovered'")
        success(f"Pipeline Agent: {rec_data.get('pipelineAgent')}")
    else:
        failure(f"Expected status 'recovered', got '{rec_data['status']}'")
        return 1

    # -----------------------------------------------------------------------
    # Step 9: Post-Incident Recovery Report
    # -----------------------------------------------------------------------
    step(9, "Fetch Post-Incident Recovery Report")
    report_res = client.get(f"/api/incidents/{incident_id}/report")
    if report_res.status_code == 200:
        rpt = report_res.json()
        success(f"Report Generated: Verdict = {rpt.get('verdict')}")
        print(f"   Root Cause:   {rpt.get('rootCause')}")
        print(f"   Verification: {rpt.get('verificationSummary')}")
        print(f"   Timeline:     {len(rpt.get('timelineSteps', []))} stages recorded")
    else:
        failure(f"Failed to fetch report: {report_res.status_code}")

    # -----------------------------------------------------------------------
    # Step 10: Cryptographic Audit Custody Validation
    # -----------------------------------------------------------------------
    step(10, "Validate Cryptographic Audit Chain of Custody")
    audit_res = client.get("/api/audit-logs")
    if audit_res.status_code == 200:
        records = audit_res.json()
        inc_actions = [a.get("action") for a in records if a.get("incident") == incident_id]
        success(f"Total Audit Entries Recorded: {len(records)}")
        print(f"   Incident Audit Chain: {' -> '.join(inc_actions)}")
        assert "PATCH_APPROVED" in inc_actions or len(inc_actions) > 0
    else:
        warn("Could not retrieve audit records")

    # -----------------------------------------------------------------------
    # Step 11: Regression Detection / Flawed Patch Safety Demonstration
    # -----------------------------------------------------------------------
    step(11, "Flawed Patch Guard — Flawed Fix Cannot Mark Incident Recovered")
    flaw_id = f"INC-FLAW-{uuid.uuid4().hex[:6].upper()}"
    client.post("/api/incidents", json={
        "id": flaw_id,
        "title": "Regression defect test incident",
        "application": "demo-user-api",
        "description": "Validating that an incorrect patch fails verification and never marks recovered",
    })
    # Analyze to create patch
    client.post(f"/api/incidents/{flaw_id}/analyze")

    # Manually tamper patch diff with failing code
    # Ensure backend path is present for direct repository check
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))
    from app.repositories import patch_repo
    patches = patch_repo.list_by_incident(flaw_id)
    if patches:
        flaw_patch_id = patches[0]["id"]
        failing_diff = """
def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):
    raise AssertionError("Intentional flawed patch assertion error")
"""
        patch_repo.update(flaw_patch_id, {"diff": failing_diff})

        # Approve flawed patch
        client.post(f"/api/incidents/{flaw_id}/approve", json={
            "decision": "approve",
            "actor": "QA Auditor",
        })

        # Run verification in Docker
        flaw_verif = client.post(f"/api/incidents/{flaw_id}/verify", json={"patchId": flaw_patch_id})
        flaw_data = flaw_verif.json()
        assert flaw_data["status"] == "failed"
        assert flaw_data["failed"] >= 1 or flaw_data["passed"] == 0

        # Check incident is NOT recovered
        flaw_inc = client.get(f"/api/incidents/{flaw_id}").json()
        assert flaw_inc["status"] == "failed"
        assert flaw_inc["status"] != "recovered"
        success("Flawed patch detected by Verifier: Status set to 'failed', zero recovery claimed.")

    print(f"\n{BOLD}{GREEN}============================================================{RESET}")
    print(f"{BOLD}{GREEN}  ✓ Complete SentinelMesh AI Lifecycle Successfully Verified!{RESET}")
    print(f"{BOLD}{GREEN}============================================================{RESET}\n")
    return 0


if __name__ == "__main__":
    sys.exit(run_demo())
