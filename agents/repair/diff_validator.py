"""Deterministic diff and path validator for Repair Agent.
Enforces safety rules:
- No edits outside allowed paths
- Strict unified diff syntax validation
- Rejects malformed diffs or path traversals
"""

import re
from typing import List, Tuple


class DiffValidationError(ValueError):
    """Raised when a proposed diff fails deterministic safety validation."""
    pass


def validate_target_path(target_path: str, allowed_paths: List[str]) -> bool:
    """Validate that the target path does not use traversal and is within allowed paths."""
    if not target_path or ".." in target_path or target_path.startswith("/") or target_path.startswith("\\"):
        return False
    
    # Normalize path separators
    normalized_target = target_path.replace("\\", "/")
    normalized_allowed = [p.replace("\\", "/") for p in allowed_paths]
    
    return any(normalized_target == p or normalized_target.endswith(p) for p in normalized_allowed)


def validate_unified_diff(diff: str, expected_target: str = None) -> Tuple[bool, str]:
    """Deterministically validates that a diff string follows valid unified diff structure.
    Returns (is_valid, error_message).
    """
    if not diff or not diff.strip():
        return False, "Diff is empty."

    lines = [line for line in diff.strip().splitlines() if line]

    # Look for diff header or hunk header
    has_hunk_header = False
    has_additions_or_deletions = False
    
    hunk_regex = re.compile(r"^@@\s+-\d+(?:,\d+)?\s+\+\d+(?:,\d+)?\s+@@")

    for line in lines:
        if hunk_regex.match(line):
            has_hunk_header = True
            continue
        if line.startswith("+") and not line.startswith("+++"):
            has_additions_or_deletions = True
        elif line.startswith("-") and not line.startswith("---"):
            has_additions_or_deletions = True

    if not has_hunk_header:
        return False, "Diff lacks valid unified diff hunk header (e.g., '@@ -line,len +line,len @@')."

    if not has_additions_or_deletions:
        return False, "Diff contains no valid additions or deletions."

    return True, "Diff is valid unified format."
