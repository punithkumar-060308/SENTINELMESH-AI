from typing import Optional
from pymongo.database import Database
from app.db.mongodb import db_manager
from app.services import (
    incident_service,
    patch_service,
    verification_service,
    agent_service,
    audit_service,
)


def get_database() -> Optional[Database]:
    """Dependency to inject database reference."""
    return db_manager.db


def get_incident_svc():
    return incident_service


def get_patch_svc():
    return patch_service


def get_verification_svc():
    return verification_service


def get_audit_svc():
    return audit_service
