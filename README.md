# 🛡️ SentinelMesh AI
### AI-Powered Multi-Agent Software Incident Detection, Repair & Verification System

<p align="center">
  <b>Detect. Investigate. Repair. Verify.</b>
</p>

<p align="center">
  Building trustworthy AI-powered software recovery through collaborative agents and independent verification.
</p>

---

## 📌 1. Project Overview

**SentinelMesh AI** is an AI-powered multi-agent software incident recovery platform designed to detect software failures, investigate their root causes, generate potential fixes, and independently verify whether those fixes actually work.

Traditional debugging requires developers to manually inspect logs, trace errors, modify code, and execute tests. Although AI coding assistants can suggest solutions, a generated fix is not necessarily a correct fix.

SentinelMesh AI addresses this gap by introducing a coordinated multi-agent workflow that transforms a software incident into a tested and evidence-backed recovery outcome.

The system uses specialized AI agents, controlled code execution, automated testing, and human approval to make AI-assisted software recovery safer and more reliable.

**Our core philosophy:**

> Finding a fix is not enough. We must prove that the fix works.

---

## 🎯 2. Problem Statement

When software applications experience failures, developers often need to:

- Inspect application logs and error messages.
- Identify the root cause of the failure.
- Analyze relevant source code and configurations.
- Develop and apply corrective changes.
- Execute regression tests.
- Verify that the original issue is resolved without introducing new failures.

These activities are often distributed across disconnected tools and require significant manual effort.

AI coding assistants can generate convincing code fixes, but those fixes may be incorrect, incomplete, or introduce additional problems.

**The fundamental problem is the absence of a reliable, automated process that independently verifies AI-generated software repairs.**

---

## 💡 3. Proposed Solution

SentinelMesh AI introduces a multi-agent architecture where specialized agents collaborate to handle software incidents.

The system follows six major stages:

1. **Detect:** Identify software failures through logs, errors, and service-health information.
2. **Observe:** Collect relevant application logs, metrics, and code context.
3. **Investigate:** Analyze evidence and identify probable root causes.
4. **Repair:** Generate minimal code or configuration patches.
5. **Verify:** Execute independent regression tests in an isolated environment.
6. **Report:** Present the recovery status, evidence, and complete audit history.

Every proposed repair follows a controlled process involving human approval and sandbox execution.

If verification fails, the system rejects the repair or initiates rollback rather than falsely reporting successful recovery.

---

## 🤖 4. Multi-Agent Architecture

SentinelMesh AI uses four specialized agents coordinated through a central orchestration workflow.

### 4.1 Observer Agent
**Responsibility: Incident Detection and Evidence Collection**

- Detect application errors and failures.
- Collect relevant logs and error traces.
- Monitor service-health information.
- Identify the affected application components.
- Prepare incident context for investigation.

### 4.2 Investigator Agent
**Responsibility: Root-Cause Analysis**

- Analyze collected logs and error traces.
- Examine relevant source code and configuration.
- Identify possible root causes.
- Rank hypotheses based on available evidence.
- Provide an explanation of the suspected failure.

### 4.3 Repair Agent
**Responsibility: Intelligent Repair Generation**

- Generate potential code or configuration fixes.
- Produce minimal and reviewable patches.
- Explain the proposed modifications.
- Prepare changes for human approval.
- Submit approved patches for controlled execution.

### 4.4 Verifier Agent
**Responsibility: Independent Repair Verification**

- Execute predefined regression tests.
- Verify whether the original failure is resolved.
- Check for newly introduced failures.
- Evaluate test results and execution evidence.
- Reject unsuccessful fixes or trigger rollback.

The Verifier focuses on actual execution results rather than simply trusting the Repair Agent's explanation.

---

## ⚙️ 5. End-to-End System Workflow

The complete system follows this execution pipeline:

```text
        SOFTWARE APPLICATION
                 |
                 v
          INCIDENT DETECTED
                 |
                 v
          OBSERVER AGENT
       Logs, Errors, Metrics
                 |
                 v
        INVESTIGATOR AGENT
          Root-Cause Analysis
                 |
                 v
           REPAIR AGENT
        Generate Code Patch
                 |
                 v
          HUMAN APPROVAL
                 |
                 v
        ISOLATED SANDBOX
          Docker Execution
                 |
                 v
          VERIFIER AGENT
       Independent Regression Tests
                 |
                 v
          VERIFICATION
                 |
          +------+------+
          |             |
       PASSED         FAILED
          |             |
          v             v
    VERIFIED       REJECT / ROLLBACK
    RECOVERY             |
          |              |
          +------+-------+
                 |
                 v
          INCIDENT REPORT
        Evidence and Audit Trail
```

---

## 🏗️ 6. System Architecture

The proposed architecture consists of the following major components:

### Frontend Layer
Provides an interface for developers to monitor incidents and review proposed repairs.

Responsibilities:
- Incident dashboard.
- Application health and incident timeline.
- AI agent activity.
- Root-cause evidence.
- Repair workspace.
- Patch review and approval.
- Test results and recovery status.

### Backend Layer
Acts as the central communication layer between the frontend, agents, database, and sandbox.

Responsibilities:
- API management.
- Incident processing.
- Agent orchestration.
- Workflow state management.
- Approval handling.
- Sandbox communication.
- Result reporting.

### AI Agent Layer
Contains the four specialized agents responsible for detecting, investigating, repairing, and verifying software incidents.

### Execution and Verification Layer
Provides an isolated environment for executing approved changes and running automated tests.

### Data Layer
Stores incident information, investigation evidence, proposed patches, execution results, and audit records.

---

## 🧰 7. Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React | User interface |
| Frontend Language | TypeScript | Type-safe frontend development |
| Styling | Tailwind CSS | UI styling |
| Backend | Python | Core backend and AI logic |
| API Framework | FastAPI | Backend API development |
| Agent Orchestration | LangGraph | Multi-agent workflow management |
| AI Model | LLM API | Reasoning and structured tool calls |
| Database | MongoDB | Incident and audit data storage |
| Sandbox | Docker | Isolated code execution |
| Testing | pytest | Automated testing |
| Version Control | Git & GitHub | Collaboration and source management |

*The final implementation choices and model provider will be confirmed during development.*

---

## 📊 8. Core Features

### Incident Management
- Incident detection and tracking.
- Error and log collection.
- Incident timeline.
- Root-cause evidence.

### Multi-Agent Collaboration
- Specialized AI agents.
- Coordinated investigation and repair.
- Shared workflow state.
- Evidence-based decision-making.

### Intelligent Repair
- AI-generated code patches.
- Minimal and reviewable changes.
- Repair explanations.
- Human approval.

### Independent Verification
- Isolated code execution.
- Automated regression testing.
- Failure detection.
- Repair rejection and rollback.

### Audit and Reporting
- Agent activity history.
- Investigation evidence.
- Patch history.
- Test execution results.
- Recovery status.

---

## 🔐 9. Safety and Reliability

Safety is a core design principle of SentinelMesh AI.

The proposed system incorporates:

- **Human-in-the-loop approval:** No proposed repair should be applied without the required approval.
- **Isolated execution:** Approved changes are executed in a controlled sandbox.
- **Independent verification:** Fixes must pass actual automated tests.
- **Failure handling:** Unsuccessful repairs must be rejected or rolled back.
- **Auditability:** Important agent actions and execution results are recorded.
- **Controlled permissions:** Agents receive only the permissions necessary for their assigned tasks.

SentinelMesh AI aims to prevent unverified AI-generated changes from being treated as successful repairs.

---

## 🚀 10. Minimum Viable Product (MVP)

The initial MVP will focus on demonstrating one complete and reproducible software incident recovery scenario.

### Initial MVP Scope

1. Create a sample FastAPI application.
2. Introduce a known software failure.
3. Detect the failure and collect relevant logs.
4. Investigate the root cause using AI agents.
5. Generate a proposed code patch.
6. Request human approval.
7. Execute the approved patch in a Docker sandbox.
8. Run independent regression tests using pytest.
9. Display the verification outcome on the dashboard.
10. Store incident evidence and execution history.

### MVP Success Criteria

The MVP should demonstrate:

- Successful identification of a known failure.
- Evidence-backed root-cause analysis.
- Generation of a reviewable repair.
- Controlled execution of the approved patch.
- Independent verification of the outcome.
- Correct handling of failed verification.

---

## 📁 11. Proposed Repository Structure

```text
sentinelmesh-ai/
│
├── README.md
├── LICENSE
├── .gitignore
├── .env.example
│
├── docs/
│   ├── project-overview.md
│   ├── problem-statement.md
│   ├── proposed-solution.md
│   ├── system-architecture.md
│   ├── agent-workflow.md
│   ├── technology-stack.md
│   ├── database-design.md
│   └── development-roadmap.md
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   ├── services/
│   │   ├── models/
│   │   └── database/
│   └── requirements.txt
│
├── agents/
│   ├── observer/
│   ├── investigator/
│   ├── repair/
│   ├── verifier/
│   └── orchestrator/
│
├── sandbox/
│   ├── Dockerfile
│   └── execution.py
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── regression/
│
└── examples/
    └── demo-application/
```

*This is the proposed structure. Directories and modules will be created as implementation progresses.*

---

## 🛣️ 12. Development Roadmap

### Phase 1 — MVP Development
- Establish project architecture.
- Develop the sample application.
- Implement incident detection.
- Develop the initial multi-agent workflow.
- Integrate repair generation and verification.

### Phase 2 — Integration and Reliability
- Connect frontend and backend.
- Implement the incident dashboard.
- Improve agent communication.
- Strengthen sandbox execution.
- Test failure and rollback scenarios.

### Phase 3 — Open-Source Development
- Publish the source code.
- Prepare installation instructions.
- Add sample incidents and test cases.
- Document architecture and workflows.
- Enable community contributions.

### Phase 4 — Future Enhancements
- Support additional incident types.
- Integrate GitHub issues and CI pipelines.
- Expand observability integrations.
- Improve evidence quality and uncertainty handling.
- Enhance reliability and scalability.

---

## 🌍 13. Open-Source Vision

SentinelMesh AI aims to become an open-source platform for safer AI-assisted software debugging and recovery.

Our vision is to help developers and engineering teams move beyond AI-generated suggestions towards evidence-backed and independently verified software repairs.

We aim to make the system reproducible, reviewable, extensible, and community-driven.

---

## 👥 14. Team

**Team Name:** Elite Coders

**Project:** SentinelMesh AI

**Hackathon:** CodeSprint 2026

**Track:** Open Innovation

**Team Members:**

- Member 1 — Punith Kumar B S
- Member 2 — Preetam K Shettar
- Member 3 — Rudramma S T
- Member 4 — Poornesh K
- Member 5 — Nityashree H L

---

## 🏆 15. Hackathon

Built for **CodeSprint 2026**, an open innovation hackathon focused on transforming original ideas into functional and impactful solutions.

Our goal is to demonstrate how collaborative AI agents, controlled execution, and independent verification can make software recovery more trustworthy.

---

## 📜 License

To be finalized before the public open-source release.

---

<p align="center">
  <b>SentinelMesh AI</b>
  <br/>
  Detect. Investigate. Repair. Verify.
  <br/><br/>
  <i>Every action is traceable. Every fix must be tested. Every outcome must be verified.</i>
</p>
