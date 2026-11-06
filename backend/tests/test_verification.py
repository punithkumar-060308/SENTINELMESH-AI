def test_run_verification(client):
    # Ensure incident is in approved state
    client.post("/api/incidents/INC-8921/approve", json={"decision": "approve"})

    # Trigger verification
    verif_res = client.post("/api/incidents/INC-8921/verify", json={
        "isolatedEnv": "mesh-sandbox-isolated (Docker rootless)"
    })
    assert verif_res.status_code == 200
    data = verif_res.json()
    assert data["status"] == "passed"
    assert data["passed"] > 0
    assert data["failed"] == 0
    assert len(data["tests"]) > 0
    assert "RegressionTest" in data["tests"][0]["name"]

    # Verify incident state is now recovered
    inc_res = client.get("/api/incidents/INC-8921")
    assert inc_res.json()["status"] == "recovered"


def test_list_verification_runs(client):
    res = client.get("/api/verification-runs")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "environment" in data[0]


def test_get_single_verification_run(client):
    res = client.get("/api/verification-runs/VR-101")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "VR-101"
    assert data["incidentId"] == "INC-8921"
