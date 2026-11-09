from app.repositories.incident_repo import IncidentRepository
from app.repositories.evidence_repo import EvidenceRepository
from app.repositories.patch_repo import PatchRepository
from app.repositories.verification_repo import VerificationRepository
from app.repositories.audit_repo import AuditRepository
from app.repositories.agent_log_repo import AgentLogRepository
from app.repositories.user_repo import UserRepository

incident_repo = IncidentRepository()
evidence_repo = EvidenceRepository()
patch_repo = PatchRepository()
verification_repo = VerificationRepository()
audit_repo = AuditRepository()
agent_log_repo = AgentLogRepository()
user_repo = UserRepository()

__all__ = [
    "IncidentRepository",
    "EvidenceRepository",
    "PatchRepository",
    "VerificationRepository",
    "AuditRepository",
    "AgentLogRepository",
    "UserRepository",
    "incident_repo",
    "evidence_repo",
    "patch_repo",
    "verification_repo",
    "audit_repo",
    "agent_log_repo",
    "user_repo",
]
