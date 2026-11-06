# SentinelMesh AI Isolated Sandbox Container
# Adheres strictly to Section 06_SANDBOX_IMPLEMENTATION.md:
# Non-root user, minimal attack surface, no host mounts, isolated test runner

FROM python:3.11-slim

# Create dedicated unprivileged non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup -u 1000 appuser

# Set working directory
WORKDIR /workspace

# Install pytest and minimal testing dependencies without cache
RUN pip install --no-cache-dir pytest

# Ensure non-root ownership of the workspace directory
RUN chown -R appuser:appgroup /workspace

# Switch to unprivileged non-root user
USER appuser

# Environment restrictions: disable python bytecode generation and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/workspace

# Default command: run pytest inside the isolated workspace
CMD ["pytest", "-v"]
