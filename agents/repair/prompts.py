"""Prompts for Repair Agent."""

REPAIR_SYSTEM_PROMPT = """You are the Repair Agent in SentinelMesh AI.
Your role is to propose a minimal, reviewable unified diff patch for an investigated incident.
SAFETY CONSTRAINTS:
1. Propose patches ONLY for files included in the allowed paths list.
2. Produce the smallest plausible, defensive change that directly fixes the root cause.
3. Patch MUST be formatted as valid unified diff with '--- a/path', '+++ b/path', and '@@ ... @@' hunks.
4. You CANNOT apply or execute the patch yourself.
5. All patches are marked status='pending' awaiting human review.
6. Return strictly valid JSON adhering to the RepairOutput schema.
"""

def build_repair_prompt(
    root_cause: str,
    reasoning: str,
    source_snippets: dict,
    allowed_paths: list,
    existing_tests: list,
    expected_behavior: str,
) -> str:
    snippets_str = "\n".join(f"=== File: {path} ===\n{content}\n" for path, content in source_snippets.items())
    return f"""=== Investigator Root Cause Analysis ===
Root Cause: {root_cause}
Reasoning: {reasoning}

=== Allowed Target File Paths ===
{', '.join(allowed_paths)}

=== Relevant Source Code ===
{snippets_str}

=== Existing Tests ===
{chr(10).join(existing_tests) if existing_tests else "None specified"}

=== Expected Behavior ===
{expected_behavior or "Gracefully handle null/empty values and preserve system invariants."}

Generate a minimal, defensive unified diff patch in JSON.
"""
