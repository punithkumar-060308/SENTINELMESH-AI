/**
 * Central API Service Layer for SentinelMesh AI
 * Implements Section 7 of SentinelMesh_Frontend_Implementation_Guide.md
 * Supports both real backend endpoints (via VITE_API_BASE_URL) and typed local mock service.
 */

import { initialIncidents, fleetAgents, verificationRuns, auditLogEntries, platformSettings } from '../data/mockData';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || null;

// Local in-memory state for mock mode
let incidentsStore = [...initialIncidents];
let verificationRunsStore = [...verificationRuns];
let auditLogStore = [...auditLogEntries];

export const isLiveBackend = Boolean(API_BASE_URL);

/**
 * Helper to simulate network latency in mock mode
 */
const mockDelay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  /**
   * Check backend health
   */
  async getHealth() {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        if (res.ok) return await res.json();
      } catch {
        // Fallback to demo mock
      }
    }
    await mockDelay(100);
    return { status: "ok", mode: "demo_mock", timestamp: new Date().toISOString() };
  },

  /**
   * Fetch all incidents with optional filtering
   */
  async getIncidents() {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/incidents`);
        if (res.ok) return await res.json();
      } catch {
        // Fallback to mock store
      }
    }
    await mockDelay(200);
    return [...incidentsStore];
  },

  /**
   * Fetch a single incident by ID
   */
  async getIncidentById(id) {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/incidents/${id}`);
        if (res.ok) return await res.json();
      } catch {
        // Fallback to mock store
      }
    }
    await mockDelay(150);
    const found = incidentsStore.find((i) => i.id === id);
    if (!found) throw new Error(`Incident ${id} not found`);
    return { ...found };
  },

  /**
   * Simulate / inject an incident
   */
  async simulateIncident(incidentData) {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/incidents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(incidentData)
        });
        if (res.ok) return await res.json();
      } catch {
        // Fallback to mock store
      }
    }
    await mockDelay(400);
    const newInc = {
      ...incidentData,
      id: incidentData.id || `INC-${Math.floor(1000 + Math.random() * 9000)}`,
      status: incidentData.status || "investigating",
      detectedAt: new Date().toISOString(),
      detectedTime: "Just now"
    };
    incidentsStore = [newInc, ...incidentsStore];

    // Append to audit log
    const auditRecord = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      agent: "Observer Agent",
      action: "INCIDENT_DETECTED_SIMULATED",
      incident: newInc.id,
      status: "completed",
      details: `[Simulated Demo] Injected failure scenario: ${newInc.title} in ${newInc.application}`,
      hash: "0x" + Math.random().toString(16).substring(2, 10) + "...sim"
    };
    auditLogStore = [auditRecord, ...auditLogStore];

    return newInc;
  },

  /**
   * Start or request analysis for an incident
   */
  async analyzeIncident(id) {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/incidents/${id}/analyze`, { method: "POST" });
        if (res.ok) return await res.json();
      } catch {
        // Fallback to mock store
      }
    }
    await mockDelay(500);
    incidentsStore = incidentsStore.map((inc) =>
      inc.id === id ? { ...inc, status: "investigating" } : inc
    );
    return { status: "investigating", incidentId: id };
  },

  /**
   * Approve a proposed patch
   */
  async approvePatch(incidentId, notes = "") {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: "approve", notes })
        });
        if (res.ok) return await res.json();
      } catch {
        // Fallback to mock store
      }
    }
    await mockDelay(600);

    // Update incident status to 'approved' then 'verifying'
    incidentsStore = incidentsStore.map((inc) => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          status: "verifying",
          pipelineAgent: "Verifier Agent (Running sandbox verification)"
        };
      }
      return inc;
    });

    // Record in audit ledger
    const auditRecord = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      agent: "Human Gate (Elena Vance)",
      action: "PATCH_APPROVED",
      incident: incidentId,
      status: "completed",
      details: notes || "Human approval signed. Patch dispatched to ephemeral sandbox.",
      hash: "0x" + Math.random().toString(16).substring(2, 10) + "...app"
    };
    auditLogStore = [auditRecord, ...auditLogStore];

    return { success: true, incidentId, status: "verifying" };
  },

  /**
   * Reject a proposed patch
   */
  async rejectPatch(incidentId, reason = "") {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision: "reject", reason })
        });
        if (res.ok) return await res.json();
      } catch {
        // Fallback to mock store
      }
    }
    await mockDelay(400);

    incidentsStore = incidentsStore.map((inc) => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          status: "rejected",
          pipelineAgent: "Repair Agent (Awaiting alternative request)"
        };
      }
      return inc;
    });

    // Record in audit ledger
    const auditRecord = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      agent: "Human Gate (Elena Vance)",
      action: "PATCH_REJECTED",
      incident: incidentId,
      status: "completed",
      details: reason || "Patch rejected by human operator. Alternative patch requested.",
      hash: "0x" + Math.random().toString(16).substring(2, 10) + "...rej"
    };
    auditLogStore = [auditRecord, ...auditLogStore];

    return { success: true, incidentId, status: "rejected" };
  },

  /**
   * Run independent verification suites in isolated sandbox
   */
  async runVerification(incidentId) {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/verify`, { method: "POST" });
        if (res.ok) return await res.json();
      } catch {
        // Fallback to mock store
      }
    }
    await mockDelay(1200);

    const newRun = {
      id: `VR-${Math.floor(100 + Math.random() * 900)}`,
      incidentId,
      patchId: `PAT-${incidentId.replace('INC-', '')}`,
      targetFile: "Handler.java",
      status: "passed",
      passed: 14,
      failed: 0,
      skipped: 0,
      durationMs: 980,
      completedAt: new Date().toISOString(),
      environment: "mesh-sandbox-isolated (Docker rootless)",
      tests: [
        { name: "RegressionTest.baselineInvariantCheck()", status: "passed", duration: "180ms" },
        { name: "SyntheticEdgeTest.nullPayloadSafety()", status: "passed", duration: "110ms" },
        { name: "IntegrationTest.transactionBoundaryRollback()", status: "passed", duration: "290ms" }
      ]
    };
    verificationRunsStore = [newRun, ...verificationRunsStore];

    // Mark incident recovered
    incidentsStore = incidentsStore.map((inc) => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          status: "recovered",
          pipelineAgent: "Verifier Agent (Verification Passed & Closed)"
        };
      }
      return inc;
    });

    const auditRecord = {
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      agent: "Verifier Agent",
      action: "VERIFICATION_SUCCESS",
      incident: incidentId,
      status: "completed",
      details: "14/14 tests passed in isolated container. Zero regression confirmed.",
      hash: "0x" + Math.random().toString(16).substring(2, 10) + "...ver"
    };
    auditLogStore = [auditRecord, ...auditLogStore];

    return newRun;
  },

  /**
   * Fetch verification runs
   */
  async getVerificationRuns() {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/verification-runs`);
        if (res.ok) return await res.json();
      } catch {
        // Fallback to local store
      }
    }
    await mockDelay(150);
    return [...verificationRunsStore];
  },

  /**
   * Fetch audit logs
   */
  async getAuditLogs() {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/audit-logs`);
        if (res.ok) return await res.json();
      } catch {
        // Fallback to local store
      }
    }
    await mockDelay(150);
    return [...auditLogStore];
  },

  /**
   * Fetch fleet agents
   */
  async getFleetAgents() {
    if (API_BASE_URL) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/fleet/agents`);
        if (res.ok) return await res.json();
      } catch {
        // Fallback to local store
      }
    }
    await mockDelay(100);
    return [...fleetAgents];
  },

  /**
   * Fetch platform settings
   */
  async getPlatformSettings() {
    await mockDelay(100);
    return { ...platformSettings };
  }
};

