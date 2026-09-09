"""Durable idempotency + rate-limit + FloodWait state — stdlib sqlite3 only."""
from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


class GatewayStore:
    def __init__(self, db_path: str):
        if db_path != ':memory:':
            parent = os.path.dirname(os.path.abspath(db_path))
            if parent:
                os.makedirs(parent, exist_ok=True)
        self.db = sqlite3.connect(db_path, check_same_thread=False)
        self.db.execute(
            'CREATE TABLE IF NOT EXISTS idempotency ('
            ' key TEXT PRIMARY KEY, request_id TEXT, result_json TEXT, created_at TEXT)'
        )
        self.db.execute(
            'CREATE TABLE IF NOT EXISTS send_log ('
            ' id INTEGER PRIMARY KEY AUTOINCREMENT, dialog_id TEXT, created_at TEXT)'
        )
        self.db.execute(
            'CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)'
        )
        self.db.commit()

    # ---- idempotency ----
    def idem_get(self, key: str) -> dict | None:
        row = self.db.execute('SELECT result_json FROM idempotency WHERE key=?', (key,)).fetchone()
        if not row:
            return None
        try:
            return json.loads(row[0])
        except (ValueError, TypeError):
            return None

    def idem_put(self, key: str, request_id: str, result: dict) -> None:
        self.db.execute(
            'INSERT OR REPLACE INTO idempotency (key, request_id, result_json, created_at)'
            ' VALUES (?, ?, ?, ?)',
            (key, request_id, json.dumps(result, ensure_ascii=False), _now_iso()),
        )
        self.db.commit()

    # ---- rate limit ----
    def record_send(self, dialog_id: str, at_iso: str | None = None) -> None:
        self.db.execute(
            'INSERT INTO send_log (dialog_id, created_at) VALUES (?, ?)',
            (dialog_id, at_iso or _now_iso()),
        )
        self.db.commit()

    def check_rate_limit(self, dialog_id: str, min_interval_s: int, max_per_hour: int,
                         now_iso: str | None = None) -> tuple[bool, str]:
        now = now_iso or _now_iso()
        last = self.db.execute(
            'SELECT created_at FROM send_log WHERE dialog_id=? ORDER BY created_at DESC LIMIT 1',
            (dialog_id,),
        ).fetchone()
        if last and last[0]:
            try:
                gap = (datetime.fromisoformat(now.replace('Z', '+00:00'))
                       - datetime.fromisoformat(str(last[0]).replace('Z', '+00:00'))).total_seconds()
                if gap < min_interval_s:
                    return False, 'MIN_INTERVAL'
            except ValueError:
                pass
        from datetime import timedelta
        cutoff = (datetime.fromisoformat(now.replace('Z', '+00:00'))
                  - timedelta(hours=1)).isoformat().replace('+00:00', 'Z')
        n = self.db.execute(
            'SELECT COUNT(*) FROM send_log WHERE created_at > ?', (cutoff,)
        ).fetchone()[0]
        if n >= max_per_hour:
            return False, 'HOURLY_CAP'
        return True, 'OK'

    # ---- FloodWait window ----
    def flood_blocked_until(self) -> str:
        row = self.db.execute("SELECT v FROM kv WHERE k='flood_until'").fetchone()
        return row[0] if row else ''

    def set_flood_wait(self, wait_seconds: int, now_iso: str | None = None) -> str:
        from datetime import timedelta
        now = now_iso or _now_iso()
        base = datetime.fromisoformat(now.replace('Z', '+00:00'))
        until = (base + timedelta(seconds=max(0, int(wait_seconds)))).isoformat().replace('+00:00', 'Z')
        self.db.execute("INSERT OR REPLACE INTO kv (k, v) VALUES ('flood_until', ?)", (until,))
        self.db.commit()
        return until

    def flood_active(self, now_iso: str | None = None) -> bool:
        until = self.flood_blocked_until()
        if not until:
            return False
        return until > (now_iso or _now_iso())
