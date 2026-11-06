def test_list_incident_patches(client):
    response = client.get("/api/incidents/INC-8921/patches")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["id"] == "PAT-8921"
    assert "Optional" in data[0]["explanation"]


def test_invalid_patch_decision(client):
    payload = {"decision": "defer_until_tomorrow"}
    response = client.post("/api/incidents/INC-8921/approve", json=payload)
    assert response.status_code == 400
    data = response.json()
    assert data["error"] is True
    assert "invalid decision" in data["message"].lower()


def test_patch_rejection_path(client):
    # Create fresh incident for rejection test
    create_res = client.post("/api/incidents", json={
        "title": "Division by zero in rate limiter",
        "application": "gateway",
    })
    inc_id = create_res.json()["id"]
    client.post(f"/api/incidents/{inc_id}/analyze")

    # Reject the patch
    rej_payload = {
        "decision": "reject",
        "reason": "Does not account for negative denominator inputs",
        "actor": "Staff SRE",
    }
    rej_res = client.post(f"/api/incidents/{inc_id}/approve", json=rej_payload)
    assert rej_res.status_code == 200
    rej_data = rej_res.json()
    assert rej_data["success"] is True
    assert rej_data["decision"] == "reject"
    assert rej_data["status"] == "rejected"

    # Verify incident status is rejected
    inc_res = client.get(f"/api/incidents/{inc_id}")
    assert inc_res.json()["status"] == "rejected"

    # Verify that trying to run verification after rejection fails as per safety rules
    verif_res = client.post(f"/api/incidents/{inc_id}/verify")
    assert verif_res.status_code == 400
    assert "rejected" in verif_res.json()["message"].lower()


def test_patch_approval_path(client):
    # Approve patch for INC-8921
    appr_payload = {
        "decision": "approve",
        "notes": "Verified against staging schema. Safe to deploy.",
        "actor": "Elena Vance",
    }
    appr_res = client.post("/api/incidents/INC-8921/approve", json=appr_payload)
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["success"] is True
    assert appr_data["decision"] == "approve"
    assert appr_data["status"] == "approved"

    # Verify incident status is approved
    inc_res = client.get("/api/incidents/INC-8921")
    assert inc_res.json()["status"] == "approved"


def test_specific_patch_decision_endpoint(client):
    # Test POST /api/incidents/{incident_id}/patches/{patch_id}/decision
    payload = {
        "decision": "approve",
        "notes": "Direct patch approval",
        "actor": "Release Manager",
    }
    res = client.post(
        "/api/incidents/INC-8921/patches/PAT-8921/decision",
        json=payload,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["patchId"] == "PAT-8921"
