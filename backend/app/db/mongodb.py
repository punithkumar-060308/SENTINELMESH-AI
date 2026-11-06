import logging
import socket
import sys
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
        if settings.TESTING or settings.ENVIRONMENT == "testing" or "pytest" in sys.modules:
            logger.info("Test environment detected. Using resilient in-memory repository.")
            self.is_connected = False
            self.db = None
            return False

        # Fast socket probe before PyMongo initialization to prevent background thread hangs
        target_host = "127.0.0.1"
        target_port = 27017

        if "localhost" not in settings.MONGODB_URI and "127.0.0.1" not in settings.MONGODB_URI:
            try:
                # Extract first node hostname from replica set URI (e.g. user:pass@host:port,host2:port/...)
                host_segment = settings.MONGODB_URI.split("@")[-1].split("/")[0].split(",")[0]
                if ":" in host_segment:
                    target_host, port_str = host_segment.split(":")
                    target_port = int(port_str)
                else:
                    target_host = host_segment
            except Exception:
                target_host = "127.0.0.1"
                target_port = 27017

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.5)
        try:
            res = sock.connect_ex((target_host, target_port))
            if res != 0:
                logger.info(
                    "MongoDB target %s:%d not reachable. Falling back to resilient in-memory repository.",
                    target_host,
                    target_port,
                )
                self.is_connected = False
                self.db = None
                return False
        except Exception as e:
            logger.info(
                "MongoDB probe failed for %s (%s). Falling back to in-memory repository.",
                target_host,
                str(e),
            )
            self.is_connected = False
            self.db = None
            return False
        finally:
            sock.close()

        try:
            logger.info("Attempting to connect to MongoDB at %s...", settings.MONGODB_URI.split("@")[-1])
            self.client = MongoClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=2000,
                connectTimeoutMS=2000,
            )
            # Ping to verify connectivity and credentials
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
                "MongoDB not reachable or auth failed (%s). Falling back to resilient in-memory repository.",
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
            # 1. incidents indexes
            self.db.incidents.create_index("id", unique=True)
            self.db.incidents.create_index("status")
            self.db.incidents.create_index("detected_at")

            # 2. evidence indexes
            self.db.evidence.create_index("id", unique=True)
            self.db.evidence.create_index("incident_id")

            # 3. agent_logs indexes
            self.db.agent_logs.create_index("id", unique=True)
            self.db.agent_logs.create_index("incident_id")

            # 4. patches indexes
            self.db.patches.create_index("id", unique=True)
            self.db.patches.create_index("incident_id")
            self.db.patches.create_index("status")

            # 5. verification indexes
            self.db.verification.create_index("id", unique=True)
            self.db.verification.create_index("incident_id")

            # 6. audit_logs indexes
            self.db.audit_logs.create_index("id", unique=True)
            self.db.audit_logs.create_index("incident_id")
            self.db.audit_logs.create_index("created_at")

            logger.info("MongoDB indexes verified/created successfully.")
        except Exception as e:
            logger.warning("Could not create MongoDB indexes: %s", str(e))


db_manager = MongoDBManager()


def get_db() -> Optional[Database]:
    return db_manager.db
