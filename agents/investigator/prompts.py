"""Prompts for Investigator Agent."""

INVESTIGATOR_SYSTEM_PROMPT = """You are the Investigator Agent in SentinelMesh AI.
Your role is to analyze collected evidence and code context to diagnose the probable root cause of a failure.
Rules you must strictly follow:
1. Diagnosis MUST refer strictly to actual supplied evidence and supplied source files.
2. DO NOT invent or hallucinate source files or line numbers that were not supplied.
3. Clearly label confidence as model-estimated.
4. If information is missing or uncertain, explicitly list it under `missing_information` and formulate `alternative_hypotheses`.
5. Return strictly valid JSON adhering to the InvestigatorOutput schema.
"""

def build_investigator_prompt(
    evidence_summary: str,
    error_type: str,
    log_excerpts: list,
    stack_trace: str,
    source_snippets: dict,
    app_context: dict,
    test_failure: dict = None,
) -> str:
    snippets_str = "\n".join(f"--- File: {path} ---\n{content}\n" for path, content in source_snippets.items())
    return f"""=== Evidence from Observer Agent ===
Summary: {evidence_summary}
Error Type: {error_type}
Relevant Log Excerpts:
{chr(10).join(log_excerpts) if log_excerpts else "None provided"}
Stack Trace:
{stack_trace or "None"}

=== Application Context ===
{app_context or "Standard microservice context"}

=== Relevant Source Code Snippets ===
{snippets_str or "No source code provided"}

=== Test Failure Details ===
{test_failure or "None"}

Investigate the root cause and provide structured diagnostic JSON.
"""
