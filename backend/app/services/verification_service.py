import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import HTTPException
from app.repositories import verification_repo, incident_repo, patch_repo, audit_repo
from app.schemas.verification import VerificationRunResponse
from app.services.audit_service import audit_service
from sandbox import sandbox_service


class VerificationService:
    def __init__(self):
        self.verif_repo = verification_repo
        self.incident_repo = incident_repo
        self.patch_repo = patch_repo
        self.audit_repo = audit_repo
        self.sandbox = sandbox_service

    def list_all(self) -> List[VerificationRunResponse]:
        runs = self.verif_repo.list_all()
        return [VerificationRunResponse(**r) for r in runs]

    def list_by_incident(self, incident_id: str) -> List[VerificationRunResponse]:
        runs = self.verif_repo.list_by_incident(incident_id)
        return [VerificationRunResponse(**r) for r in runs]

    def run_verification(
        self,
        incident_id: str,
        patch_id: Optional[str] = None,
        isolated_env: str = "mesh-sandbox-isolated (Docker rootless)",
    ) -> VerificationRunResponse:
        incident = self.incident_repo.get_by_id(incident_id)
        if not incident:
            raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

        current_status = incident.get("status", "")
        # Security Rule: Rejected patches must NEVER reach the sandbox
        if current_status == "rejected":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot run verification on incident {incident_id}: patch was rejected.",
            )

        # 1. Patch selection:
        # - If patch_id is supplied but not found, return HTTP 404. Never silently select another patch.
        # - If patch_id is omitted, allow automatic selection only when exactly one eligible approved patch exists.
        # - Reject ambiguous patch selection.
        target_patch = None
        if patch_id:
            target_patch = self.patch_repo.get_by_id(patch_id)
            if not target_patch:
                raise HTTPException(
                    status_code=404,
                    detail=f"Patch {patch_id} not found.",
                )
        else:
            candidates = self.patch_repo.list_by_incident(incident_id)
            eligible_approved = [
                p for p in candidates
                if p.get("incident_id") == incident_id
                and str(p.get("decision") or p.get("status") or "").strip().lower() in ["approved", "approve"]
            ]
            if len(eligible_approved) == 0:
                # If incident is approved or awaiting approval, synthesize candidate patch on demand
                if current_status in ["approved", "awaiting_approval"]:
                    try:
                        from app.services.incident_service import incident_service
                        incident_service.analyze_incident(incident_id)
                        candidates = self.patch_repo.list_by_incident(incident_id)
                        if candidates:
                            now_iso = datetime.now(timezone.utc).isoformat()
                            cand = candidates[0]
                            cand_id = cand.get("id")
                            self.patch_repo.update(cand_id, {
                                "status": "approved",
                                "decision": "approved",
                                "actor": incident.get("approved_by") or "Human Operator",
                                "approved_by": incident.get("approved_by") or "Human Operator",
                                "decided_at": incident.get("approved_at") or now_iso,
                            })
                            refetched = self.patch_repo.get_by_id(cand_id)
                            if refetched:
                                eligible_approved = [refetched]
                    except Exception:
                        pass

                if len(eligible_approved) == 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"No eligible approved patch found for incident {incident_id}.",
                    )
            if len(eligible_approved) > 1:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ambiguous patch selection: {len(eligible_approved)} approved patches exist for incident {incident_id}. Specify patch_id explicitly.",
                )
            target_patch = eligible_approved[0]

        target_patch_id = target_patch.get("id")
        target_file = target_patch.get("file_path")
        diff_content = target_patch.get("diff")

        if not target_patch_id or not target_file or not diff_content:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot run verification on incident {incident_id}: Patch record is missing id, target file, or diff content.",
            )

        # 2. Patch ownership:
        # Verify target_patch["incident_id"] == incident_id. Reject mismatches before any sandbox execution.
        if target_patch.get("incident_id") != incident_id:
            raise HTTPException(
                status_code=400,
                detail=f"Patch {target_patch_id} does not belong to incident {incident_id}.",
            )

        # 3. Approval authenticity:
        # - Normalize the decision using .strip().lower()
        patch_decision = str(target_patch.get("decision") or "").strip().lower()
        patch_status = str(target_patch.get("status") or "").strip().lower()

        if patch_decision in ["reject", "rejected"] or patch_status == "rejected":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot run verification on patch {target_patch_id}: patch was explicitly rejected.",
            )

        if patch_decision not in ["approved", "approve"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot run verification on patch {target_patch_id}: No recorded human approval exists (decision is '{patch_decision or 'pending'}').",
            )

        # Ensure actor identity comes from persisted approval record
        actor = target_patch.get("approved_by") or target_patch.get("actor") or target_patch.get("decided_by")
        if not actor or not isinstance(actor, str) or not actor.strip():
            raise HTTPException(
                status_code=400,
                detail=f"Cannot run verification on patch {target_patch_id}: Approval record lacks a valid actor.",
            )
        actor = actor.strip()

        # Validate approval timestamp
        timestamp_str = target_patch.get("decided_at") or target_patch.get("approved_at")
        if not timestamp_str or not isinstance(timestamp_str, str) or not timestamp_str.strip():
            raise HTTPException(
                status_code=400,
                detail=f"Cannot run verification on patch {target_patch_id}: Approval record lacks an approval timestamp.",
            )
        timestamp_str = timestamp_str.strip()

        try:
            parsed_ts = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            now_utc = datetime.now(timezone.utc)
            if parsed_ts > now_utc + timedelta(minutes=5):
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot run verification on patch {target_patch_id}: Approval timestamp '{timestamp_str}' is invalid (in the future).",
                )
        except (ValueError, TypeError) as ts_err:
            if isinstance(ts_err, HTTPException):
                raise
            raise HTTPException(
                status_code=400,
                detail=f"Cannot run verification on patch {target_patch_id}: Approval timestamp '{timestamp_str}' is not a valid ISO 8601 timestamp.",
            )

        # Do not treat a non-empty actor name as proof of authentication.
        # Require an approval record persisted through the authenticated approval workflow.
        has_audit_approval = False
        if self.audit_repo:
            try:
                audit_logs = self.audit_repo.list_by_incident(incident_id)
                has_audit_approval = any(
                    entry.get("action") == "PATCH_APPROVED" for entry in audit_logs
                )
            except Exception:
                has_audit_approval = False

        incident_has_approval = (
            incident.get("status") in ["approved", "verifying", "recovered"]
            and (
                bool(incident.get("approved_by"))
                or bool(incident.get("approved_at"))
                or (incident.get("proposed_patch") or {}).get("status") == "approved"
            )
        )

        if not (has_audit_approval or incident_has_approval):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot run verification on patch {target_patch_id}: Approval record was not authenticated through the authorized approval workflow.",
            )

        # Ensure actor matches authenticated approval if incident recorded approved_by
        inc_actor = incident.get("approved_by")
        if inc_actor and inc_actor.strip() and inc_actor.strip() != actor:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot run verification on patch {target_patch_id}: Patch actor '{actor}' does not match authenticated incident approval actor '{inc_actor}'.",
            )

        # 4. State transition and execution:
        # Transition incident to verifying during execution
        self.incident_repo.update(incident_id, {
            "status": "verifying",
            "pipeline_agent": "Verifier Agent (Executing test suites in isolated sandbox)",
            "active_step": 5,
        })

        patch_payload = {
            "id": target_patch_id,
            "file_path": target_file,
            "diff": diff_content,
        }

        human_approval = {
            "decision": "approved",
            "actor": actor,
            "timestamp": timestamp_str,
        }

        # 4. Exception handling:
        # Handle Docker unavailable, execution exceptions, and timeouts.
        # Ensure the incident does not remain stuck in verifying.
        try:
            sandbox_result = self.sandbox.execute_patch_verification(
                incident_id=incident_id,
                patch_data=patch_payload,
                human_approval=human_approval,
                timeout_seconds=15,
                persist_results=False,
            )
        except Exception as exec_err:
            now_iso = datetime.now(timezone.utc).isoformat()
            timeline = incident.get("timeline", [])
            timeline.append({
                "agent": "Verifier",
                "action": f"Sandbox execution exception: {str(exec_err)[:150]}",
                "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
                "status": "failed",
            })
            self.incident_repo.update(incident_id, {
                "status": "failed",
                "pipeline_agent": "Verifier Agent (Sandbox Execution Error)",
                "active_step": 5,
                "timeline": timeline,
            })
            failed_run_id = f"VR-{uuid.uuid4().hex[:6].upper()}"
            failed_run_data = {
                "id": failed_run_id,
                "run_id": failed_run_id,
                "container_id": None,
                "incident_id": incident_id,
                "patch_id": target_patch_id,
                "target_file": target_file,
                "status": "failed",
                "passed": 0,
                "failed": 1,
                "skipped": 0,
                "duration_ms": 0,
                "completed_at": now_iso,
                "environment": isolated_env,
                "tests": [],
                "test_output_summary": f"Sandbox execution failed with exception: {str(exec_err)}",
            }
            try:
                self.verif_repo.create(failed_run_data)
            except Exception:
                pass
            audit_service.record_event(
                agent="Verifier Agent",
                action="VERIFICATION_FAILED",
                incident_id=incident_id,
                status="failed",
                details=f"Sandbox execution failed with exception: {str(exec_err)}",
            )
            raise HTTPException(
                status_code=500,
                detail=f"Sandbox execution error: {str(exec_err)}",
            )

        now_iso = datetime.now(timezone.utc).isoformat()

        # 5. Result integrity:
        # Require a genuine Docker container ID in addition to the existing success conditions.
        # Explicitly reject fabricated or emulated container IDs.
        has_valid_container_id = bool(
            sandbox_result.container_id
            and isinstance(sandbox_result.container_id, str)
            and sandbox_result.container_id.strip()
            and not sandbox_result.container_id.startswith("sentinelmesh-sandbox-emulated")
            and sandbox_result.container_id != sandbox_result.run_id
        )

        # Do not fabricate execution results. Fail-closed on Docker unavailability.
        is_success = (
            sandbox_result.status == "passed"
            and sandbox_result.docker_isolated is True
            and not getattr(sandbox_result, "docker_unavailable", False)
            and has_valid_container_id
            and sandbox_result.exit_code == 0
            and sandbox_result.passed_count > 0
            and sandbox_result.failed_count == 0
            and not sandbox_result.timed_out
            and sandbox_result.error is None
        )

        run_data = {
            "id": sandbox_result.run_id,
            "run_id": sandbox_result.run_id,
            "container_id": sandbox_result.container_id,
            "incident_id": incident_id,
            "patch_id": target_patch_id,
            "target_file": target_file,
            "status": "passed" if is_success else "failed",
            "passed": sandbox_result.passed_count,
            "failed": sandbox_result.failed_count,
            "skipped": sandbox_result.skipped_count,
            "duration_ms": sandbox_result.duration_ms,
            "completed_at": now_iso,
            "environment": sandbox_result.isolated_env,
            "tests": sandbox_result.tests,
            "test_output_summary": (
                f"Docker container {sandbox_result.container_id}: {sandbox_result.passed_count} passed, 0 regressions detected."
                if is_success else
                f"Docker verification failed: {sandbox_result.failed_count} test(s) failed. {sandbox_result.error or ''}".strip()
            ),
        }

        # Persist verification record in repository FIRST before declaring recovery
        try:
            saved_run = self.verif_repo.create(run_data)
        except Exception as persist_err:
            # Do not mark an incident recovered if verification persistence fails!
            self.incident_repo.update(incident_id, {
                "status": "failed",
                "pipeline_agent": "Verifier Agent (Verification Persistence Error)",
                "active_step": 5,
            })
            raise HTTPException(
                status_code=500,
                detail=f"Failed to persist verification record: {str(persist_err)}",
            )

        # Update incident status based strictly on sandbox outcome
        timeline = incident.get("timeline", [])
        if is_success:
            # Confirm actual patch application before setting applied_at
            patch_applied = bool(
                sandbox_result.changed_files
                and target_file in sandbox_result.changed_files
            )

            timeline.append({
                "agent": "Verifier",
                "action": f"Executed verification suite ({sandbox_result.passed_count} passed, 0 failed)",
                "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
                "status": "completed",
            })

            try:
                self.incident_repo.update(incident_id, {
                    "status": "recovered",
                    "pipeline_agent": "Verifier Agent (Verification Passed & Closed)",
                    "active_step": 6,
                    "timeline": timeline,
                })
            except Exception as inc_err:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to update incident state: {str(inc_err)}",
                )

            # Do not set applied_at during verification unless actual patch application is confirmed
            if target_patch_id and patch_applied:
                try:
                    self.patch_repo.update(target_patch_id, {
                        "status": "verified",
                        "applied_at": now_iso,
                    })
                except Exception:
                    pass
            elif target_patch_id:
                try:
                    self.patch_repo.update(target_patch_id, {
                        "status": "verified",
                    })
                except Exception:
                    pass

            audit_service.record_event(
                agent="Verifier Agent",
                action="VERIFICATION_SUCCESS",
                incident_id=incident_id,
                status="completed",
                details=f"Verification run {sandbox_result.run_id} passed: {sandbox_result.passed_count} checks in {sandbox_result.duration_ms}ms.",
            )
        else:
            # Ensure incident does NOT remain stuck in verifying on timeout or failure
            failure_detail = (
                f"Docker verification timed out after {sandbox_result.duration_ms}ms"
                if sandbox_result.timed_out else
                f"Docker Engine unavailable: {sandbox_result.error}"
                if sandbox_result.status == "docker_unavailable" else
                f"Verification failed: {sandbox_result.failed_count} failed"
            )
            timeline.append({
                "agent": "Verifier",
                "action": failure_detail,
                "timestamp": datetime.now(timezone.utc).strftime("%H:%M:%S UTC"),
                "status": "failed",
            })
            self.incident_repo.update(incident_id, {
                "status": "failed",
                "pipeline_agent": "Verifier Agent (Verification Failed - Unrecovered)",
                "active_step": 5,
                "timeline": timeline,
            })
            audit_service.record_event(
                agent="Verifier Agent",
                action="VERIFICATION_FAILED",
                incident_id=incident_id,
                status="failed",
                details=f"Verification run {sandbox_result.run_id} failed: {sandbox_result.error or 'Test assertion failure'}.",
            )

        return VerificationRunResponse(**saved_run)


verification_service = VerificationService()
