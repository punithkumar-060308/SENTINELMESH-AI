def test_list_incidents(client):
    response = client.get("/api/incidents")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    # Verify field presence and snake_case + camelCase compatibility
    sample = data[0]
    assert "id" in sample
    assert "title" in sample
    assert "application" in sample
    assert "status" in sample
    assert "severity" in sample


def test_get_incident_detail(client):
    response = client.get("/api/incidents/INC-8921")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "INC-8921"
    assert "StripeWebhookHandler" in data["title"]
    assert data["status"] == "awaiting_approval"


def test_get_unknown_incident_id(client):
    response = client.get("/api/incidents/INC-999999-NOTFOUND")
    assert response.status_code == 404
    data = response.json()
    assert data["error"] is True
    assert "not found" in data["message"].lower()


def test_create_valid_incident(client):
    payload = {
        "title": "Uncaught ValueError in auth token parser",
        "application": "auth-svc",
        "description": "JWT payload format mismatch during oauth exchange",
        "severity": "high",
        "stack_trace": "ValueError: Invalid padding in token string",
    }
    response = client.post("/api/incidents", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == payload["title"]
    assert data["application"] == "auth-svc"
    assert data["id"].startswith("INC-")
    assert data["status"] in ["detected", "investigating"]

    # Retrieve created incident
    get_res = client.get(f"/api/incidents/{data['id']}")
    assert get_res.status_code == 200
    assert get_res.json()["title"] == payload["title"]


def test_invalid_incident_payload(client):
    # Missing required 'title' and 'application'
    response = client.post("/api/incidents", json={"severity": "high"})
    assert response.status_code == 422
    data = response.json()
    assert data["error"] is True
    assert data["status_code"] == 422


def test_analyze_incident_workflow(client):
    response = client.post("/api/incidents/INC-001/analyze")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "awaiting_approval"
    assert "incidentId" in data or "incident_id" in data

    # Verify incident state was updated
    inc_res = client.get("/api/incidents/INC-001")
    assert inc_res.status_code == 200
    inc_data = inc_res.json()
    assert inc_data["status"] == "awaiting_approval"
    patch_obj = inc_data.get("proposedPatch") or inc_data.get("proposed_patch")
    assert patch_obj is not None


def test_incident_report(client):
    response = client.get("/api/incidents/INC-8921/report")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "NullPointer in StripeWebhookHandler after v2.14.0 rollout"
    assert "verdict" in data
