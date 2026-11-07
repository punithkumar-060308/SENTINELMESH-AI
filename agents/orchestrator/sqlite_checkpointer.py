"""Persistent SQLite-backed Checkpoint Saver for SentinelMesh AI LangGraph Orchestrator.
Provides persistent storage of workflow checkpoints across backend restarts and process recycles.
Inherits from LangGraph's MemorySaver to maintain 100% schema and serialization compatibility,
while synchronizing all checkpoints, writes, and channel blobs to an SQLite database file.
"""

import os
import sqlite3
import threading
from typing import Optional, Any, Sequence
from langgraph.checkpoint.memory import MemorySaver


class SqliteSaver(MemorySaver):
    """Thread-safe, SQLite-backed checkpoint saver for LangGraph."""

    def __init__(self, db_path: str, serde: Optional[Any] = None):
        super().__init__(serde=serde)
        self.db_path = os.path.abspath(db_path)
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self._lock = threading.Lock()
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._init_db()
        self._load_from_db()

    def _init_db(self) -> None:
        """Create schema tables if they do not exist."""
        with self._lock, self._conn:
            self._conn.execute("""
                CREATE TABLE IF NOT EXISTS checkpoints (
                    thread_id TEXT,
                    checkpoint_ns TEXT,
                    checkpoint_id TEXT,
                    parent_checkpoint_id TEXT,
                    type_str TEXT,
                    checkpoint_blob BLOB,
                    metadata_type TEXT,
                    metadata_blob BLOB,
                    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
                )
            """)
            self._conn.execute("""
                CREATE TABLE IF NOT EXISTS writes (
                    thread_id TEXT,
                    checkpoint_ns TEXT,
                    checkpoint_id TEXT,
                    task_id TEXT,
                    idx INTEGER,
                    channel TEXT,
                    type_str TEXT,
                    value_blob BLOB,
                    task_path TEXT,
                    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
                )
            """)
            self._conn.execute("""
                CREATE TABLE IF NOT EXISTS blobs (
                    thread_id TEXT,
                    checkpoint_ns TEXT,
                    channel TEXT,
                    version TEXT,
                    type_str TEXT,
                    data_blob BLOB,
                    PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
                )
            """)

    def _load_from_db(self) -> None:
        """Load persisted checkpoints, writes, and blobs into memory structures."""
        with self._lock:
            cur = self._conn.cursor()
            for row in cur.execute(
                "SELECT thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, "
                "type_str, checkpoint_blob, metadata_type, metadata_blob FROM checkpoints"
            ):
                tid, cns, cid, pid, ct, cb, mt, mb = row
                self.storage[tid][cns][cid] = ((ct, cb), (mt, mb), pid)

            for row in cur.execute(
                "SELECT thread_id, checkpoint_ns, checkpoint_id, task_id, idx, "
                "channel, type_str, value_blob, task_path FROM writes"
            ):
                tid, cns, cid, task_id, idx, ch, vt, vb, tp = row
                outer_key = (tid, cns, cid)
                inner_key = (task_id, idx)
                self.writes[outer_key][inner_key] = (task_id, ch, (vt, vb), tp)

            for row in cur.execute(
                "SELECT thread_id, checkpoint_ns, channel, version, type_str, data_blob FROM blobs"
            ):
                tid, cns, ch, ver, dt, db = row
                self.blobs[(tid, cns, ch, ver)] = (dt, db)

    def put(self, config: Any, checkpoint: Any, metadata: Any, new_versions: Any) -> Any:
        """Store checkpoint in memory and persist synchronously to SQLite."""
        res = super().put(config, checkpoint, metadata, new_versions)
        tid = config["configurable"]["thread_id"]
        cns = config["configurable"].get("checkpoint_ns", "")
        cid = checkpoint["id"]
        c_typed = self.serde.dumps_typed(checkpoint)
        m_typed = self.serde.dumps_typed(metadata)
        parent_id = config["configurable"].get("checkpoint_id")

        with self._lock, self._conn:
            self._conn.execute("""
                INSERT OR REPLACE INTO checkpoints VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (tid, cns, cid, parent_id, c_typed[0], c_typed[1], m_typed[0], m_typed[1]))

            for k, ver in new_versions.items():
                if (tid, cns, k, ver) in self.blobs:
                    b_val = self.blobs[(tid, cns, k, ver)]
                    self._conn.execute("""
                        INSERT OR REPLACE INTO blobs VALUES (?, ?, ?, ?, ?, ?)
                    """, (tid, cns, k, str(ver), b_val[0], b_val[1]))
        return res

    def put_writes(
        self,
        config: Any,
        writes: Sequence[tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        """Store writes in memory and persist synchronously to SQLite."""
        super().put_writes(config, writes, task_id, task_path)
        tid = config["configurable"]["thread_id"]
        cns = config["configurable"].get("checkpoint_ns", "")
        cid = config["configurable"]["checkpoint_id"]
        outer_key = (tid, cns, cid)

        with self._lock, self._conn:
            for (t_id, idx), (task_id_val, channel, v_typed, tp) in self.writes[outer_key].items():
                self._conn.execute("""
                    INSERT OR REPLACE INTO writes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (tid, cns, cid, task_id_val, idx, channel, v_typed[0], v_typed[1], tp))

    def delete_thread(self, thread_id: str) -> None:
        """Delete thread from memory and persistent SQLite database."""
        super().delete_thread(thread_id)
        with self._lock, self._conn:
            self._conn.execute("DELETE FROM checkpoints WHERE thread_id = ?", (thread_id,))
            self._conn.execute("DELETE FROM writes WHERE thread_id = ?", (thread_id,))
            self._conn.execute("DELETE FROM blobs WHERE thread_id = ?", (thread_id,))

    def close(self) -> None:
        """Close SQLite database connection cleanly."""
        with self._lock:
            try:
                self._conn.close()
            except Exception:
                pass
