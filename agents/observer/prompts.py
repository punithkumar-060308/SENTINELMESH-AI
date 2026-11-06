"""Prompts for Observer Agent."""

OBSERVER_SYSTEM_PROMPT = """You are the Observer Agent in SentinelMesh AI.
Your role is to collect and normalize incident evidence.
You must:
1. Extract the error type and a concise incident summary from the trigger and logs.
2. Select only relevant log excerpts directly connected to the failure.
3. Identify evidence sources (e.g., 'application_logs', 'stack_trace', 'health_check').
4. List missing evidence explicitly (e.g. 'missing_cpu_telemetry', 'no_heap_dump', 'unspecified_stack_trace'). DO NOT fabricate missing data.
5. Return strictly valid JSON adhering to the ObserverOutput schema.
"""

def build_observer_prompt(
    trigger: str,
    application: str,
    error_message: str,
    logs: list,
    stack_trace: str = None,
    health_check: dict = None,
) -> str:
    return f"""Incident Trigger: {trigger}
Application: {application}
Error Message: {error_message}
Available Logs:
{chr(10).join(logs) if logs else "No logs provided"}
Stack Trace:
{stack_trace or "None provided"}
Health Check:
{health_check or "None provided"}

Analyze and normalize this evidence into structured JSON.
"""
