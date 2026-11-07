#!/usr/bin/env python3
"""SentinelMesh AI — System Preflight & Readiness Check.
Verifies backend dependencies, node/frontend tooling, Docker Engine,
sandbox container images, network port availability, and database connectivity.
"""

import sys
import os
import socket
import subprocess
import shutil
from typing import Tuple, List

# ANSI Color formatting
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
BOLD = "\033[1m"
RESET = "\033[0m"


def check_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Check if a network port is already in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0


def check_python_environment() -> Tuple[bool, str]:
    """Verify Python runtime version."""
    major, minor = sys.version_info.major, sys.version_info.minor
    if major >= 3 and minor >= 10:
        return True, f"Python {major}.{minor}.{sys.version_info.micro} ({sys.executable})"
    return False, f"Python {major}.{minor} is below recommended 3.10+"


def check_python_packages() -> Tuple[bool, List[str], List[str]]:
    """Verify critical Python packages."""
    required = [
        "fastapi",
        "uvicorn",
        "pydantic",
        "pytest",
        "httpx",
        "langgraph",
    ]
    installed = []
    missing = []
    for pkg in required:
        try:
            __import__(pkg)
            installed.append(pkg)
        except ImportError:
            missing.append(pkg)
    return len(missing) == 0, installed, missing


def check_frontend_environment() -> Tuple[bool, str, str]:
    """Verify Node.js and npm availability."""
    node_path = shutil.which("node")
    npm_path = shutil.which("npm")
    if not node_path or not npm_path:
        return False, "Node.js or npm not found in system PATH", ""
    try:
        node_v = subprocess.run(["node", "-v"], capture_output=True, text=True, timeout=5, shell=(os.name == "nt")).stdout.strip()
        npm_v = subprocess.run(["npm", "-v"], capture_output=True, text=True, timeout=5, shell=(os.name == "nt")).stdout.strip()
        return True, f"Node.js {node_v}", f"npm {npm_v}"
    except Exception as e:
        return False, f"Error querying Node.js: {e}", ""


def check_docker_engine() -> Tuple[bool, str]:
    """Verify Docker Engine is active and responding."""
    docker_path = shutil.which("docker")
    if not docker_path:
        return False, "Docker CLI executable not found in PATH"
    try:
        proc = subprocess.run(
            ["docker", "info", "--format", "{{.ServerVersion}}"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if proc.returncode == 0:
            version = proc.stdout.strip()
            return True, f"Docker Engine {version} (Operational)"
        return False, "Docker daemon connection refused (Ensure Docker Desktop is running)"
    except subprocess.TimeoutExpired:
        return False, "Docker daemon timed out (5s)"
    except Exception as e:
        return False, f"Docker check failed: {e}"


def check_sandbox_image(image_name: str = "sentinelmesh-sandbox:latest") -> Tuple[bool, str]:
    """Verify the isolated sandbox image exists locally."""
    try:
        proc = subprocess.run(
            ["docker", "image", "inspect", image_name, "--format", "{{.Id}}"],
            capture_output=True,
            text=True,
            timeout=4,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            short_id = proc.stdout.strip().replace("sha256:", "")[:12]
            return True, f"Image {image_name} found (ID: {short_id})"
        return False, f"Image '{image_name}' not found locally. Build with: docker build -t {image_name} sandbox/"
    except Exception as e:
        return False, f"Image inspection error: {e}"


def check_database() -> Tuple[bool, str]:
    """Check MongoDB availability or report graceful in-memory repository fallback."""
    try:
        # Check backend config
        sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))
        from app.db.mongodb import db_manager
        db_manager.connect()
        if db_manager.is_connected:
            return True, "MongoDB Atlas connected successfully"
        return True, "MongoDB offline: Graceful in-memory / SQLite fallback active"
    except Exception as e:
        return True, f"In-memory / SQLite repository fallback active ({e})"


def main():
    print(f"\n{BOLD}{BLUE}======================================================{RESET}")
    print(f"{BOLD}{BLUE}    SentinelMesh AI — Preflight System Diagnostics    {RESET}")
    print(f"{BOLD}{BLUE}======================================================{RESET}\n")

    overall_ok = True

    # 1. Python Runtime
    py_ok, py_msg = check_python_environment()
    status_str = f"{GREEN}[OK]{RESET}" if py_ok else f"{RED}[FAIL]{RESET}"
    print(f" {status_str} Python Runtime: {py_msg}")
    if not py_ok:
        overall_ok = False

    # 2. Python Dependencies
    pkg_ok, installed_pkgs, missing_pkgs = check_python_packages()
    if pkg_ok:
        print(f" {GREEN}[OK]{RESET} Core Python Packages: {', '.join(installed_pkgs)}")
    else:
        print(f" {RED}[FAIL]{RESET} Missing Python Packages: {', '.join(missing_pkgs)}")
        print(f"        Run: pip install -r backend/requirements.txt")
        overall_ok = False

    # 3. Node.js & Frontend Tooling
    node_ok, node_msg, npm_msg = check_frontend_environment()
    if node_ok:
        print(f" {GREEN}[OK]{RESET} Frontend Tooling: {node_msg} | {npm_msg}")
    else:
        print(f" {YELLOW}[WARN]{RESET} Frontend Tooling: {node_msg}")

    # 4. Docker Engine
    docker_ok, docker_msg = check_docker_engine()
    if docker_ok:
        print(f" {GREEN}[OK]{RESET} Docker Engine: {docker_msg}")
    else:
        print(f" {RED}[FAIL]{RESET} Docker Engine: {docker_msg}")
        print(f"        Start Docker Desktop before running live verification runs.")
        overall_ok = False

    # 5. Sandbox Container Image
    if docker_ok:
        img_ok, img_msg = check_sandbox_image()
        if img_ok:
            print(f" {GREEN}[OK]{RESET} Sandbox Container: {img_msg}")
        else:
            print(f" {RED}[FAIL]{RESET} Sandbox Container: {img_msg}")
            overall_ok = False

    # 6. Database Connectivity
    db_ok, db_msg = check_database()
    print(f" {GREEN}[OK]{RESET} Data Persistence: {db_msg}")

    # 7. Port Availability
    p8000_used = check_port_in_use(8000)
    p5173_used = check_port_in_use(5173)

    if p8000_used:
        print(f" {YELLOW}[INFO]{RESET} Port 8000: In use (FastAPI backend may already be running)")
    else:
        print(f" {GREEN}[OK]{RESET} Port 8000: Available for FastAPI Backend")

    if p5173_used:
        print(f" {YELLOW}[INFO]{RESET} Port 5173: In use (Vite dev server may already be running)")
    else:
        print(f" {GREEN}[OK]{RESET} Port 5173: Available for React Frontend")

    print(f"\n{BOLD}{BLUE}------------------------------------------------------{RESET}")
    if overall_ok:
        print(f"{BOLD}{GREEN}✓ Preflight Checks Passed! System ready for demo execution.{RESET}\n")
        return 0
    else:
        print(f"{BOLD}{RED}✗ System has unmet requirements. Resolve before demo.{RESET}\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
