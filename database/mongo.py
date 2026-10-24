"""
Database – MongoDB connection with automatic persistent local fallback.
If MongoDB Atlas or local MongoDB is available, connects and uses real MongoDB.
If MongoDB credentials fail or service is unreachable, seamlessly switches to a local
persistent document store so user authentication, content saving, search, and dashboard
work immediately without blocking the user or college demo.
"""
import os
import json
import re
from datetime import datetime, timezone
from bson import ObjectId
from pymongo import MongoClient, ASCENDING
from pymongo.errors import PyMongoError


_client = None
_db = None
_is_fallback = False


class InsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class DeleteResult:
    def __init__(self, deleted_count):
        self.deleted_count = deleted_count


class UpdateResult:
    def __init__(self, modified_count):
        self.modified_count = modified_count


class LocalCursor:
    def __init__(self, docs):
        self._docs = list(docs)

    def sort(self, key, direction=-1):
        def sort_val(d):
            val = d.get(key)
            if isinstance(val, datetime):
                return val.timestamp()
            return str(val) if val is not None else ""
        self._docs.sort(key=sort_val, reverse=(direction == -1))
        return self

    def skip(self, count):
        self._docs = self._docs[count:]
        return self

    def limit(self, count):
        self._docs = self._docs[:count]
        return self

    def __iter__(self):
        return iter(self._docs)

    def __len__(self):
        return len(self._docs)


class LocalCollection:
    def __init__(self, name, db):
        self.name = name
        self.db = db

    def _get_items(self):
        return self.db._data.setdefault(self.name, [])

    def _save(self):
        self.db._persist()

    def create_index(self, *args, **kwargs):
        pass

    def _matches(self, doc, query):
        if not query:
            return True
        for k, v in query.items():
            if k == "$or":
                # List of sub-queries
                matched_any = False
                for sub_q in v:
                    if self._matches(doc, sub_q):
                        matched_any = True
                        break
                if not matched_any:
                    return False
                continue

            doc_val = doc.get(k)

            # Check if query val is an ObjectId
            if isinstance(v, ObjectId):
                if str(doc_val) != str(v):
                    return False
                continue

            # Check if query val has operators
            if isinstance(v, dict):
                if "$regex" in v:
                    pattern = v["$regex"]
                    flags = re.IGNORECASE if "i" in v.get("$options", "") else 0
                    if not re.search(pattern, str(doc_val or ""), flags):
                        return False
                    continue

            if doc_val != v:
                return False
        return True

    def find_one(self, query):
        for item in self._get_items():
            if self._matches(item, query):
                return dict(item)
        return None

    def find(self, query=None):
        query = query or {}
        matches = [dict(item) for item in self._get_items() if self._matches(item, query)]
        return LocalCursor(matches)

    def insert_one(self, doc):
        doc = dict(doc)
        if "_id" not in doc:
            doc["_id"] = ObjectId()
        self._get_items().append(doc)
        self._save()
        return InsertResult(doc["_id"])

    def update_one(self, query, update_doc):
        items = self._get_items()
        for idx, item in enumerate(items):
            if self._matches(item, query):
                set_vals = update_doc.get("$set", {})
                for sk, sv in set_vals.items():
                    item[sk] = sv
                self._save()
                return UpdateResult(1)
        return UpdateResult(0)

    def find_one_and_update(self, query, update_doc, return_document=True):
        items = self._get_items()
        for idx, item in enumerate(items):
            if self._matches(item, query):
                set_vals = update_doc.get("$set", {})
                for sk, sv in set_vals.items():
                    item[sk] = sv
                self._save()
                return dict(item)
        return None

    def delete_one(self, query):
        items = self._get_items()
        for idx, item in enumerate(items):
            if self._matches(item, query):
                items.pop(idx)
                self._save()
                return DeleteResult(1)
        return DeleteResult(0)

    def delete_many(self, query):
        items = self._get_items()
        initial_len = len(items)
        remaining = [item for item in items if not self._matches(item, query)]
        deleted_count = initial_len - len(remaining)
        self.db._data[self.name] = remaining
        self._save()
        return DeleteResult(deleted_count)

    def count_documents(self, query=None):
        query = query or {}
        count = sum(1 for item in self._get_items() if self._matches(item, query))
        return count

    def aggregate(self, pipeline):
        # Support grouping by tool_type: [{"$match": ...}, {"$group": {"_id": "$tool_type", "count": {"$sum": 1}}}]
        items = self._get_items()
        for stage in pipeline:
            if "$match" in stage:
                items = [it for it in items if self._matches(it, stage["$match"])]
            elif "$group" in stage:
                group_id_field = stage["$group"]["_id"].replace("$", "")
                counts = {}
                for it in items:
                    val = it.get(group_id_field)
                    counts[val] = counts.get(val, 0) + 1
                return [{"_id": k, "count": v} for k, v in counts.items()]
        return []


class LocalFallbackDB:
    """Persistent local document database simulating MongoDB collections."""
    def __init__(self, file_path):
        self.file_path = file_path
        self._data = {"users": [], "contents": [], "activity_logs": []}
        self._load()
        self.users = LocalCollection("users", self)
        self.contents = LocalCollection("contents", self)
        self.activity_logs = LocalCollection("activity_logs", self)

    def _load(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                    for col, items in raw.items():
                        self._data[col] = []
                        for it in items:
                            doc = dict(it)
                            if "_id" in doc:
                                try:
                                    doc["_id"] = ObjectId(doc["_id"])
                                except Exception:
                                    pass
                            for date_field in ("created_at", "updated_at"):
                                if date_field in doc and isinstance(doc[date_field], str):
                                    try:
                                        doc[date_field] = datetime.fromisoformat(doc[date_field])
                                    except Exception:
                                        pass
                            self._data[col].append(doc)
            except Exception as e:
                print(f"[DB] Notice loading local DB file: {e}")

    def _persist(self):
        try:
            os.makedirs(os.path.dirname(self.file_path), exist_ok=True)
            export_data = {}
            for col, items in self._data.items():
                col_list = []
                for it in items:
                    doc = dict(it)
                    if "_id" in doc:
                        doc["_id"] = str(doc["_id"])
                    for date_field in ("created_at", "updated_at"):
                        if date_field in doc and isinstance(doc[date_field], datetime):
                            doc[date_field] = doc[date_field].isoformat()
                    col_list.append(doc)
                export_data[col] = col_list

            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(export_data, f, indent=2)
        except Exception as e:
            print(f"[DB] Error persisting local DB: {e}")


class DatabaseError(Exception):
    pass


def get_db():
    global _db
    if _db is None:
        raise DatabaseError("Database is not connected. Please verify MONGO_URI in .env.")
    return _db


def get_client():
    global _client
    return _client


def init_db(app):
    """Initialise MongoDB connection; automatically falls back to local persistent store if unreachable."""
    global _client, _db, _is_fallback
    mongo_uri = app.config.get("MONGO_URI", "").strip()

    connected = False
    if mongo_uri:
        try:
            _client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
            _client.admin.command("ping")
            db_name = mongo_uri.rsplit("/", 1)[-1].split("?")[0] if "/" in mongo_uri else "creatorai"
            if not db_name:
                db_name = "creatorai"
            _db = _client[db_name]
            _create_indexes(_db)
            _is_fallback = False
            print(f"[DB] Connected to MongoDB Atlas – Database: '{db_name}'")
            connected = True
        except Exception as e:
            connected = False
            print(f"[DB] MongoDB Atlas connection unsuccessful ({e}).")

    if not connected:
        # Activate persistent local document database fallback
        local_db_path = os.path.join(app.root_path, "instance", "creatorai_local_db.json")
        _db = LocalFallbackDB(local_db_path)
        _is_fallback = True
        print("[DB] Persistent local database activated! Users, logins, and project history will persist smoothly.")


def _create_indexes(db):
    try:
        db.users.create_index([("email", ASCENDING)], unique=True)
        db.contents.create_index([("user_id", ASCENDING), ("created_at", -1)])
        db.contents.create_index([("user_id", ASCENDING), ("tool_type", ASCENDING)])
        db.contents.create_index([("user_id", ASCENDING), ("is_favorite", ASCENDING)])
        db.activity_logs.create_index([("user_id", ASCENDING), ("created_at", -1)])
    except Exception as e:
        pass
