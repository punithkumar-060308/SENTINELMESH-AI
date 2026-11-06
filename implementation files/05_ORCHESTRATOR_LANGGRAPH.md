# Orchestrator Implementation Guide — LangGraph

## Goal
Coordinate the Observer, Investigator, Repair, human approval, sandbox application, and Verifier in a controlled workflow.

## Ownership
Primary owner: AI lead, with backend lead reviewing API and persistence boundaries.

## Why an orchestrator
The agents are not four independent chatbots. They are steps in one workflow that share a controlled state. LangGraph can represent nodes, transitions, conditional branches, and human-in-the-loop pauses.

## Suggested workflow
```text
START
  |
  v
Observer
  |
  v
Investigator
  |
  v
Repair
  |
  v
Human approval checkpoint
  |                 |
 approve           reject
  |                 |
  v                 v
Sandbox apply     Record rejection
  |
  v
Verifier
  |             |
 pass          fail
  |             |
  v             v
Recovered      Failed
  |
 END
```

## Shared workflow state
Define a typed state with fields such as:
- `incident_id`
- `incident`
- `evidence`
- `investigation`
- `patch_proposal`
- `patch_id`
- `human_decision`
- `sandbox_result`
- `verification_result`
- `agent_events`
- `workflow_status`
- `error`

Keep state data serializable where possible. Avoid storing open file handles, live database clients, or other non-serializable objects in checkpointed state.

## Node responsibilities
- `observer_node`: collect evidence and return normalized evidence.
- `investigator_node`: analyze evidence and return diagnosis.
- `repair_node`: propose patch and persist it as pending.
- `approval_node`: pause/wait for a human decision.
- `sandbox_node`: call a trusted sandbox service only after approval.
- `verifier_node`: invoke the real test runner and interpret deterministic results.
- `finalize_node`: update incident status and create final report.

## Conditional transitions
- If Observer cannot collect minimum evidence, route to a controlled `needs_attention` or failure state.
- If Investigator cannot identify a plausible cause, stop and request more evidence rather than inventing a diagnosis.
- If Repair produces an invalid patch, return a repair error or limited retry.
- If human rejects, record rejection and end without sandbox execution.
- If sandbox application fails, do not run verification as if the patch were applied.
- If tests fail or time out, mark verification failed.
- Only mark recovered when the required independent tests pass.

## Human approval
The approval decision must come from an explicit user action through the backend. Do not allow the LLM to approve its own patch. Persist the pending patch and workflow checkpoint so the process can resume after approval.

If persistent checkpointing is too complex for the MVP, implement a simpler explicit state machine in the backend first. Do not pretend a workflow is resumable if it is not.

## Error handling
- Catch and record node failures.
- Use bounded retries only for transient errors.
- Do not retry dangerous patch execution automatically.
- Record node start/end status and error details.
- Ensure repeated requests do not accidentally apply the same patch multiple times.
- Use idempotency or state checks for approval and execution actions.

## Implementation steps
1. Define shared Pydantic schemas and workflow state.
2. Implement each node as a normal Python function.
3. Test each node independently.
4. Create the graph and transitions.
5. Add the human approval checkpoint.
6. Connect sandbox and verifier services.
7. Add persistence/checkpointing if required.
8. Expose workflow start/status through backend services.
9. Test approval, rejection, node failure, sandbox failure, and verifier failure paths.

## Definition of done
- [ ] Graph order matches the intended workflow.
- [ ] Human approval is a real gate.
- [ ] Rejection cannot reach sandbox execution.
- [ ] Sandbox failure cannot be shown as recovery.
- [ ] Verifier uses real test results.
- [ ] Every transition updates workflow status.
- [ ] Failure paths are tested.
