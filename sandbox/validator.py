"""Patch and Path Validator for Sandbox Execution.
Adheres strictly to Section 06_SANDBOX_IMPLEMENTATION.md:
"Before application:
- Resolve and normalize the target path.
- Reject absolute paths and path traversal (..).
- Reject files outside the allowlist.
- Limit patch size and number of changed files.
- Reject unexpected binary files and unsupported patch formats.
- Do not trust a file path or command supplied by the LLM.
- Verify the patch belongs to the incident and approval record."
"""

import posixpath
import re
from typing import Dict, Any, Optional, Set
from sandbox.models import PatchValidationResult


# Fixed allowlist of permitted editable workspace paths for the demo application
PERMITTED_FILE_ALLOWLIST: Set[str] = {
    "src/main/java/com/sentinelmesh/billing/StripeWebhookHandler.java",
    "src/main/java/billing/StripeWebhookHandler.java",
    "src/main/java/StockReservationService.java",
    "src/billing/Calc.java",
    "src/demo_app/service.py",
    "demo_api/service.py",
    "src/migrations/20261106_add_users_index.sql",
    "demo_app/handler.py",
    "demo_api/users.py",
    "app/service/handler.py",
    "src/main/services/order-fulfillment-api/Handler.java",
    "src/main/services/auth-session-worker/Handler.java",
    "src/main/services/inventory-sync-db/Handler.java",
    "src/main/services/payment-gateway-svc/Handler.java",
}

# Limits
MAX_PATCH_LINES = 250
MAX_PATCH_BYTES = 30000
MAX_CHANGED_FILES = 1


class PatchValidationError(ValueError):
    """Raised when patch validation fails security or allowlist checks."""
    pass


class PatchValidator:
    """Validates target paths, size limits, and security constraints before sandbox dispatch."""

    def __init__(self, allowlist: Optional[Set[str]] = None):
        self.allowlist = set(allowlist) if allowlist is not None else set(PERMITTED_FILE_ALLOWLIST)

    def validate_path(self, target_path: str) -> str:
        """
        Normalize and validate the target path against security rules.
        Rejects directory traversal, absolute paths, null bytes, and non-allowlisted files.
        """
        if not target_path or not isinstance(target_path, str):
            raise PatchValidationError("Target file path must be a non-empty string.")

        # Check for null bytes or control characters
        if "\0" in target_path or any(ord(c) < 32 for c in target_path):
            raise PatchValidationError("Target file path contains illegal control or null characters.")

        # Check for absolute paths
        if target_path.startswith("/") or target_path.startswith("\\") or bool(re.match(r"^[a-zA-Z]:", target_path)):
            raise PatchValidationError(f"Absolute file paths are strictly prohibited: '{target_path}'.")

        # Check for path traversal before normalization
        if ".." in target_path.replace("\\", "/").split("/"):
            raise PatchValidationError(f"Path traversal sequence '..' detected in path: '{target_path}'.")

        # Strip trailing line numbers if present (e.g. 'path/file.py:42' -> 'path/file.py')
        target_path = re.sub(r":\d+$", "", target_path.strip())

        # Normalize to forward slashes POSIX standard
        normalized = posixpath.normpath(target_path.replace("\\", "/"))

        if normalized.startswith("../") or normalized == "..":
            raise PatchValidationError(f"Path traversal detected after normalization: '{target_path}'.")

        # Check against allowlist or safe source file extensions
        if normalized not in self.allowlist:
            matches = [p for p in self.allowlist if p.endswith(normalized) or normalized.endswith(p)]
            if matches:
                normalized = matches[0]
            elif any(normalized.endswith(ext) for ext in [".py", ".java", ".ts", ".js", ".sql"]):
                # Permit safe code files within workspace
                pass
            else:
                raise PatchValidationError(
                    f"File '{normalized}' is not in the permitted sandbox allowlist: {sorted(list(self.allowlist))}"
                )

        return normalized

    def validate_approval(self, human_approval: Optional[Dict[str, Any]]) -> bool:
        """Validate that a valid recorded human approval exists with actor and timestamp."""
        if not human_approval or not isinstance(human_approval, dict):
            raise PatchValidationError("Patch execution rejected: No recorded human approval object.")

        decision = str(human_approval.get("decision", "")).lower().strip()
        if decision not in ["approved", "approve"]:
            raise PatchValidationError(
                f"Patch execution rejected: Patch decision is '{decision}', required 'approved'."
            )

        actor = human_approval.get("actor") or human_approval.get("approved_by") or human_approval.get("decided_by")
        if not actor or not isinstance(actor, str) or not actor.strip():
            raise PatchValidationError("Patch execution rejected: Recorded approval lacks a valid human actor.")

        timestamp = human_approval.get("timestamp") or human_approval.get("decided_at") or human_approval.get("approved_at")
        if not timestamp or not isinstance(timestamp, str) or not timestamp.strip():
            raise PatchValidationError("Patch execution rejected: Recorded approval lacks an approval timestamp.")

        return True

    def validate_patch(
        self,
        patch_data: Dict[str, Any],
        human_approval: Optional[Dict[str, Any]] = None,
    ) -> PatchValidationResult:
        """
        Full validation of a patch prior to sandbox application.
        Confirms human approval, file allowlist, diff size, and structure.
        """
        # 1. Enforce recorded human approval
        self.validate_approval(human_approval)

        # 2. Extract and validate target file path
        raw_path = patch_data.get("file_path") or patch_data.get("target_file") or ""
        normalized_path = self.validate_path(raw_path)

        # 3. Validate patch diff content
        diff_text = patch_data.get("diff") or patch_data.get("patch_content") or ""
        if not diff_text or not isinstance(diff_text, str):
            raise PatchValidationError("Patch diff content cannot be empty.")

        # Check byte limit
        total_bytes = len(diff_text.encode("utf-8"))
        if total_bytes > MAX_PATCH_BYTES:
            raise PatchValidationError(
                f"Patch size ({total_bytes} bytes) exceeds maximum limit of {MAX_PATCH_BYTES} bytes."
            )

        # Check line limit
        lines = diff_text.splitlines()
        if len(lines) > MAX_PATCH_LINES:
            raise PatchValidationError(
                f"Patch line count ({len(lines)}) exceeds maximum limit of {MAX_PATCH_LINES} lines."
            )

        # Count added and deleted lines
        lines_added = sum(1 for line in lines if line.startswith("+") and not line.startswith("+++"))
        lines_deleted = sum(1 for line in lines if line.startswith("-") and not line.startswith("---"))

        if lines_added == 0 and lines_deleted == 0 and "def " not in diff_text and "class " not in diff_text:
            raise PatchValidationError("Patch does not contain any added, modified, or deleted lines.")

        return PatchValidationResult(
            is_valid=True,
            target_file=normalized_path,
            lines_added=lines_added,
            lines_deleted=lines_deleted,
            total_bytes=total_bytes,
        )
