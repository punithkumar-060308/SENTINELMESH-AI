# SentinelMesh AI Isolated Sandbox Container
# Adheres strictly to Section 06_SANDBOX_IMPLEMENTATION.md & Docker Sandbox Integration:
# Non-root user with UID 1000, minimal attack surface, isolated test runner

FROM python:3.11-slim

# Create dedicated unprivileged non-root user with UID 1000 and GID 1000
RUN groupadd -g 1000 appuser && useradd -u 1000 -g 1000 -s /bin/sh -m appuser

# Set working directory
WORKDIR /workspace

# Install pytest and minimal testing dependencies without cache
RUN pip install --no-cache-dir pytest

# Ensure non-root ownership of the workspace directory
RUN chown -R appuser:appuser /workspace

# Switch to unprivileged non-root user
USER 1000:1000

# Environment restrictions: disable python bytecode generation and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/workspace

# Default command: run pytest inside the isolated workspace
CMD ["pytest", "-v", "-o", "cache_dir=/tmp/.pytest_cache"]
