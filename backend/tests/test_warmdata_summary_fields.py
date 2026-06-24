"""WarmDataStore now persists AI 導讀 fields (summary/sentiment/tags) and
migrates old DBs that lack those columns."""

import sqlite3

from deg.schemas import LatLng, Wish
from deg.warmdata.store import WarmDataStore


def _wish(wid: str = "w1") -> Wish:
    return Wish(
        wish_id=wid, raw_text="路燈壞了", category="公共設施",
        location=LatLng(lat=22.99, lng=120.20),
        summary="神農街路燈故障", sentiment="負面", tags=["路燈", "安全"],
    )


def test_add_and_read_back_summary_fields(tmp_path):
    db = tmp_path / "wd.db"
    store = WarmDataStore(db)
    store.add_wish(_wish())
    [got] = store.list_wishes()
    assert got.summary == "神農街路燈故障"
    assert got.sentiment == "負面"
    assert got.tags == ["路燈", "安全"]


def test_summary_includes_recent_with_fields(tmp_path):
    store = WarmDataStore(tmp_path / "wd.db")
    store.add_wish(_wish())
    summary = store.summary()
    assert summary["total"] == 1
    assert summary["recent"][0]["summary"] == "神農街路燈故障"
    assert summary["recent"][0]["sentiment"] == "負面"
    assert summary["points"][0]["category"] == "公共設施"


def test_migrates_old_db_without_new_columns(tmp_path):
    db = tmp_path / "old.db"
    # Simulate a pre-migration DB: original 8-column schema only.
    conn = sqlite3.connect(db)
    conn.execute(
        "CREATE TABLE wishes (wish_id TEXT PRIMARY KEY, raw_text TEXT, category TEXT, "
        "lat REAL, lng REAL, photo_ref TEXT, created_at TEXT, status TEXT)"
    )
    conn.execute(
        "INSERT INTO wishes VALUES ('old1','舊願望','交通',22.9,120.2,NULL,"
        "'2026-01-01T00:00:00+00:00','received')"
    )
    conn.commit()
    conn.close()

    store = WarmDataStore(db)  # __init__ should ALTER TABLE to add columns
    [old] = store.list_wishes()
    assert old.summary == "" and old.sentiment == "" and old.tags == []
    # and new writes still work
    store.add_wish(_wish("w2"))
    assert len(store.list_wishes()) == 2
