import logging
import socket
from typing import Optional
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.core.config import settings

logger = logging.getLogger("sentinelmesh.db")


class MongoDBManager:
    def __init__(self):
        self.client: Optional[MongoClient] = None
        self.db: Optional[Database] = None
        self.is_connected: bool = False

    def connect(self) -> bool:
        """Establish connection to MongoDB Atlas or local instance."""
        if settings.TESTING or settings.ENVIRONMENT == "testing":
            logger.info("Test environment detected. Using resilient in-memory repository.")
            self.is_connected = False
            self.db = None
            return False

        # Fast check if targeting local instance to prevent PyMongo thread hangs if mongod is absent
        if "localhost" in settings.MONGODB_URI or "127.0.0.1" in settings.MONGODB_URI:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(0.2)
            try:
                res = sock.connect_ex(("127.0.0.1", 27017))
                if res != 0:
                    logger.info("Local MongoDB on port 27017 not reachable. Using in-memory repository fallback.")
                    self.is_connected = False
                    self.db = None
                    return False
            except Exception:
                logger.info("Local MongoDB socket error. Using in-memory repository fallback.")
                self.is_connected = False
                self.db = None
                return False
            finally:
                sock.close()

        try:
            logger.info("Attempting to connect to MongoDB at %s...", settings.MONGODB_URI.split("@")[-1])
            self.client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=1000,
                connectTimeoutMS=1000,
            )
            # Ping to verify connectivity
            self.client.admin.command("ping")
            self.db = self.client[settings.DATABASE_NAME]
            self.is_connected = True
            logger.info("Successfully connected to MongoDB database: %s", settings.DATABASE_NAME)
            self._ensure_indexes()
            return True
        except (ConnectionFailure, ServerSelectionTimeoutError, Exception) as e:
            self.is_connected = False
            self.db = None
            logger.warning(
                "MongoDB not reachable (%s). Falling back to resilient in-memory repository.",
                str(e),
            )
            return False

    def disconnect(self):
        """Close connection on shutdown."""
        if self.client:
            self.client.close()
            self.is_connected = False
            logger.info("MongoDB connection closed.")

    def _ensure_indexes(self):
        """Create indexes according to Section 03_DATABASE_IMPLEMENTATION.md."""
        if not self.is_connected or self.db is None:
            return
        try:
            self.db.incidents.create_index("id", unique=True)
            self.db.incidents.create_index("status")
            self.db.incidents.create_index("detected_at")

            self.db.evidence.create_index("id", unique=True)
            self.db.evidence.create_index("incident_id")

            self.db.agent_logs.create_index("id", unique=True)
            self.db.agent_logs.create_index("incident_id")

            self.db.patches.create_index("id", unique=True)
            self.db.patches.create_index("incident_id")
            self.db.patches.create_index("status")

            self.db.verification.create_index("id", unique=True)
            self.db.verification.create_index("incident_id")

            self.db.audit_logs.create_index("id", unique=True)
            self.db.audit_logs.create_index("incident_id")
            self.db.audit_logs.create_index("created_at")

            logger.info("MongoDB indexes verified/created successfully.")
        except Exception as e:
            logger.warning("Could not create MongoDB indexes: %s", str(e))


db_manager = MongoDBManager()


def get_db() -> Optional[Database]:
    return db_manager.db
