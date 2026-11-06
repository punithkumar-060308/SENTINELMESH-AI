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
