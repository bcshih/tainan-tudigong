"""Warm-data store for citizen wishes (流程 B).

When db_path is None (default), uses a module-level in-memory list so all
requests within the same container instance share the same data.
When db_path is provided, uses SQLite (useful for local dev with persistence).
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from threading import Lock

from deg.schemas import LatLng, Wish

_DEFAULT_DB = Path(__file__).resolve().parents[2] / "data" / "warmdata.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS wishes (
    wish_id     TEXT PRIMARY KEY,
    raw_text    TEXT NOT NULL,
    category    TEXT NOT NULL,
    lat         REAL NOT NULL,
    lng         REAL NOT NULL,
    photo_ref   TEXT,
    created_at  TEXT NOT NULL,
    status      TEXT NOT NULL,
    summary     TEXT DEFAULT '',
    sentiment   TEXT DEFAULT '',
    tags        TEXT DEFAULT '[]'
);
"""

_MIGRATIONS = (
    ("summary", "TEXT DEFAULT ''"),
    ("sentiment", "TEXT DEFAULT ''"),
    ("tags", "TEXT DEFAULT '[]'"),
)

# Shared in-memory store — lives for the lifetime of the process
_mem_wishes: list[Wish] = []
_mem_lock: Lock = Lock()


class WarmDataStore:
    """Wish store backed by in-memory list (default) or SQLite (if db_path given)."""

    def __init__(self, db_path: str | Path | None = None) -> None:
        self._in_memory = db_path is None
        if not self._in_memory:
            self._path = Path(db_path)
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with self._connect() as conn:
                conn.executescript(_SCHEMA)
                existing = {r["name"] for r in conn.execute("PRAGMA table_info(wishes)")}
                for col, decl in _MIGRATIONS:
                    if col not in existing:
                        conn.execute(f"ALTER TABLE wishes ADD COLUMN {col} {decl}")

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        return conn

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def add_wish(self, wish: Wish) -> Wish:
        if self._in_memory:
            with _mem_lock:
                # Replace existing entry with same wish_id, or append
                for i, w in enumerate(_mem_wishes):
                    if w.wish_id == wish.wish_id:
                        _mem_wishes[i] = wish
                        return wish
                _mem_wishes.append(wish)
            return wish

        with self._connect() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO wishes "
                "(wish_id, raw_text, category, lat, lng, photo_ref, created_at, status, "
                " summary, sentiment, tags) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (
                    wish.wish_id, wish.raw_text, wish.category,
                    wish.location.lat, wish.location.lng, wish.photo_ref,
                    wish.created_at.isoformat(), wish.status,
                    wish.summary, wish.sentiment, json.dumps(wish.tags, ensure_ascii=False),
                ),
            )
        return wish

    def list_wishes(self, limit: int | None = None) -> list[Wish]:
        if self._in_memory:
            with _mem_lock:
                ordered = sorted(_mem_wishes, key=lambda w: w.created_at, reverse=True)
            return ordered[:limit] if limit is not None else ordered

        sql = "SELECT * FROM wishes ORDER BY created_at DESC, rowid DESC"
        if limit is not None:
            sql += f" LIMIT {int(limit)}"
        with self._connect() as conn:
            return [self._row_to_wish(r) for r in conn.execute(sql)]

    def category_counts(self) -> dict[str, int]:
        wishes = self.list_wishes()
        counts: dict[str, int] = {}
        for w in wishes:
            counts[w.category] = counts.get(w.category, 0) + 1
        return counts

    def heatmap_points(self) -> list[dict]:
        return [
            {"lat": w.location.lat, "lng": w.location.lng, "category": w.category}
            for w in self.list_wishes()
        ]

    def summary(self, recent_limit: int = 20) -> dict:
        wishes = self.list_wishes()
        counts: dict[str, int] = {}
        for w in wishes:
            counts[w.category] = counts.get(w.category, 0) + 1
        return {
            "total": len(wishes),
            "by_category": counts,
            "points": [{"lat": w.location.lat, "lng": w.location.lng, "category": w.category} for w in wishes],
            "recent": [w.model_dump(mode="json") for w in wishes[:recent_limit]],
        }

    # ------------------------------------------------------------------
    # SQLite helpers (only used when not in-memory)
    # ------------------------------------------------------------------

    def _row_to_wish(self, row: sqlite3.Row) -> Wish:
        keys = row.keys()
        tags_raw = row["tags"] if "tags" in keys else "[]"
        try:
            tags = json.loads(tags_raw) if tags_raw else []
        except (ValueError, TypeError):
            tags = []
        return Wish(
            wish_id=row["wish_id"], raw_text=row["raw_text"], category=row["category"],
            location=LatLng(lat=row["lat"], lng=row["lng"]),
            photo_ref=row["photo_ref"], created_at=row["created_at"], status=row["status"],
            summary=row["summary"] if "summary" in keys else "",
            sentiment=row["sentiment"] if "sentiment" in keys else "",
            tags=tags,
        )
