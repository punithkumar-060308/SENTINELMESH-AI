from typing import Optional
from pymongo.database import Database
from app.db.mongodb import db_manager


class BaseRepository:
    def __init__(self, collection_name: str):
        self.collection_name = collection_name

    @property
    def is_mongo_available(self) -> bool:
        return db_manager.is_connected and db_manager.db is not None

    @property
    def collection(self):
        if self.is_mongo_available:
            return db_manager.db[self.collection_name]
        return None

    def check_production_storage_allowed(self) -> None:
        """In production, fallback to in-memory storage is strictly prohibited."""
        from app.core.config import settings
        if (settings.ENVIRONMENT or "").strip().lower() == "production" and not self.is_mongo_available:
            raise RuntimeError(
                f"Production environment requires active MongoDB persistence for '{self.collection_name}'. "
                "Operating against temporary in-memory storage is strictly disabled in production."
            )

    def purge(self) -> int:
        count = 0
        if self.is_mongo_available and self.collection is not None:
            try:
                res = self.collection.delete_many({})
                count = res.deleted_count
            except Exception:
                pass
        if hasattr(self, "_memory_store"):
            count = max(count, len(self._memory_store))
            self._memory_store.clear()
        return count

    def reset_for_tests(self) -> None:
        """Reset repository to clean initial seed state specifically for test isolation.
        Does not affect standard production purge semantics.
        """
        self.purge()
        if hasattr(self, "_initial_seeds"):
            self._memory_store = {item["id"]: dict(item) for item in self._initial_seeds}
