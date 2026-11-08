"""
SentinelMesh AI - Manual Database Reset Script
Deletes all records from MongoDB Atlas collections ('sentinelmesh_db')
while preserving schemas, indexes, and connection settings.
"""

import os
import sys
from pymongo import MongoClient
from dotenv import load_dotenv

# Look for .env file
for env_path in ['backend/.env', '.env', '../backend/.env']:
    if os.path.exists(env_path):
        load_dotenv(env_path)
        break

uri = os.getenv('MONGODB_URI')
if not uri:
    print("❌ Error: MONGODB_URI not found in backend/.env")
    sys.exit(1)

try:
    print("🔌 Connecting to MongoDB Atlas...")
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    db = client['sentinelmesh_db']
    collections = ['incidents', 'evidence', 'patches', 'verification', 'audit_logs', 'agent_logs']
    
    print("🧹 Clearing all collections in 'sentinelmesh_db':\n")
    total = 0
    for col in collections:
        if col in db.list_collection_names():
            deleted = db[col].delete_many({}).deleted_count
            total += deleted
            print(f"  • {col.ljust(15)}: {deleted} documents deleted")
        else:
            print(f"  • {col.ljust(15)}: (collection empty/not yet created)")

    print(f"\n✅ Finished! All collections cleared. Total documents removed: {total}")
    print("👉 Refresh http://localhost:3000 to see all counters reset to 0.")

except Exception as err:
    print(f"❌ Failed to clear database: {err}")
    sys.exit(1)
