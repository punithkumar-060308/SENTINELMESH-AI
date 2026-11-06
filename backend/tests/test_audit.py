def test_get_audit_logs(client):
    res = client.get("/api/audit-logs")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    sample = data[0]
    assert "agent" in sample
    assert "action" in sample
    assert "details" in sample
    assert "hash" in sample


def test_get_fleet_agents(client):
    res = client.get("/api/fleet/agents")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 5
    agent_names = [a["name"] for a in data]
    assert "Observer Agent" in agent_names
    assert "Investigator Agent" in agent_names
    assert "Repair Agent" in agent_names
    assert "Human Gate" in agent_names
    assert "Verifier Agent" in agent_names
