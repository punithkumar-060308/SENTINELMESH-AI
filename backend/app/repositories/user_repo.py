import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from app.repositories.base import BaseRepository

SEED_USERS: List[Dict[str, Any]] = [
    {
        "id": "USR-ELENA-01",
        "name": "Elena Vance",
        "email": "elena.vance@sentinelmesh.ai",
        "password_hash": "$2b$12$7kPsk22w4gJ7v0w93j0xK.aA5EfeWvXpW5rZ60g9sN3vQo2r8s0yK", # bcrypt hash of Elena@2026
        "avatar_url": None,
        "created_at": "2026-11-01T08:00:00Z",
        "updated_at": "2026-11-01T08:00:00Z",
    }
]


class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__("users")
        self._initial_seeds = SEED_USERS
        self._memory_store: Dict[str, Dict[str, Any]] = {
            item["id"]: dict(item) for item in SEED_USERS
        }

    def get_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        self.check_production_storage_allowed()
        if self.is_mongo_available and self.collection is not None:
            return self.collection.find_one({"id": user_id}, {"_id": 0})
        return self._memory_store.get(user_id)

    def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        self.check_production_storage_allowed()
        norm_email = email.strip().lower()
        if self.is_mongo_available and self.collection is not None:
            return self.collection.find_one({"email": norm_email}, {"_id": 0})
        for user in self._memory_store.values():
            if user.get("email") == norm_email:
                return user
        return None

    def create(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        self.check_production_storage_allowed()
        if "id" not in user_data:
            user_data["id"] = f"USR-{uuid.uuid4().hex[:8].upper()}"
        if "email" in user_data:
            user_data["email"] = user_data["email"].strip().lower()
        now = datetime.now(timezone.utc).isoformat()
        if "created_at" not in user_data:
            user_data["created_at"] = now
        if "updated_at" not in user_data:
            user_data["updated_at"] = now

        self._memory_store[user_data["id"]] = dict(user_data)
        if self.is_mongo_available and self.collection is not None:
            self.collection.insert_one(dict(user_data))
        return user_data

    def update(self, user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        self.check_production_storage_allowed()
        existing = self.get_by_id(user_id)
        if not existing:
            return None

        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        existing.update(updates)
        self._memory_store[user_id] = existing

        if self.is_mongo_available and self.collection is not None:
            self.collection.update_one({"id": user_id}, {"$set": updates})

        return existing

    def delete(self, user_id: str) -> bool:
        self.check_production_storage_allowed()
        existed = False
        if user_id in self._memory_store:
            del self._memory_store[user_id]
            existed = True
        if self.is_mongo_available and self.collection is not None:
            res = self.collection.delete_one({"id": user_id})
            existed = existed or (res.deleted_count > 0)
        return existed
