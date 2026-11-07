"""Demo API Service - User Management Component.
Bug: connection pool exhaustion when current_connections >= max_connections.
"""

def get_users(pool_timeout: float = 0.05, max_connections: int = 10, current_connections: int = 10):
    """Retrieve active user records with database pool connection check."""
    if current_connections >= max_connections and pool_timeout < 0.1:
        raise TimeoutError("Database connection timed out: pool limit reached")
    return [
        {"id": 1, "username": "admin", "status": "active"},
        {"id": 2, "username": "elena_v", "status": "active"}
    ]
