from app.repositories.incident_repo import IncidentRepository
from app.repositories.evidence_repo import EvidenceRepository
from app.repositories.patch_repo import PatchRepository
from app.repositories.verification_repo import VerificationRepository
from app.repositories.audit_repo import AuditRepository

incident_repo = IncidentRepository()
evidence_repo = EvidenceRepository()
patch_repo = PatchRepository()
verification_repo = VerificationRepository()
audit_repo = AuditRepository()

__all__ = [
    "IncidentRepository",
    "EvidenceRepository",
    "PatchRepository",
    "VerificationRepository",
    "AuditRepository",
    "incident_repo",
    "evidence_repo",
    "patch_repo",
    "verification_repo",
    "audit_repo",
]
