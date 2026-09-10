"""In-memory fake MTProto adapter — dev/tests ONLY (TG_USE_FAKE=true).

Never used in production: app.py refuses live paths unless a real session is
configured AND TG_USE_FAKE is not set... (see app.py — fake requires the explicit flag).
"""
from __future__ import annotations

from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


class FloodWaitError(Exception):
    """Test stub with telethon's exact class name (no telethon import needed)."""

    def __init__(self, seconds: int):
        super().__init__(f'A wait of {seconds} seconds is required')
        self.seconds = seconds


class FakeAdapter:
    """Canned dialogs/permissions/search; send() returns incrementing message ids."""

    def __init__(self) -> None:
        self.sends: list[dict] = []
        self._next_id = 67890
        self.fail_with: BaseException | None = None
        self.dialogs_data = [
            {'dialog_id': '-100111', 'title': 'Gamers Hub', 'username': 'gamershub',
             'type': 'supergroup', 'is_member': True, 'is_admin': False,
             'can_send': True, 'can_send_media': True, 'language': 'en', 'last_checked_at': _now()},
            {'dialog_id': '-100222', 'title': 'Bazino Channel', 'username': 'bazinopro',
             'type': 'channel', 'is_member': True, 'is_admin': True,
             'can_send': True, 'can_send_media': True, 'language': 'fa', 'last_checked_at': _now()},
        ]

    async def connect(self) -> None:
        return None

    async def dialogs(self) -> list[dict]:
        return [dict(d) for d in self.dialogs_data]

    async def permissions(self, dialog_id: str) -> dict:
        for d in self.dialogs_data:
            if d['dialog_id'] == dialog_id:
                return {'dialog_id': dialog_id, 'is_member': d['is_member'], 'is_admin': d['is_admin'],
                        'can_send': d['can_send'], 'can_send_media': d['can_send_media'],
                        'type': d['type'], 'checked_at': _now()}
        return {'dialog_id': dialog_id, 'is_member': False, 'is_admin': False,
                'can_send': False, 'can_send_media': False, 'type': 'unknown', 'checked_at': _now()}

    async def search(self, dialog_id: str, keywords: str = '', lookback_hours: int = 72,
                     limit: int = 20) -> list[dict]:
        _ = (keywords, lookback_hours)
        return [{'message_id': '12345', 'date': _now(), 'keyword': 'PS5',
                 'text': 'Anyone up for PS5 tonight?'}][: max(0, min(limit, 20))]

    async def send(self, dialog_id: str, message: str) -> dict:
        if self.fail_with is not None:
            err = self.fail_with
            self.fail_with = None
            raise err
        self._next_id += 1
        rec = {'dialog_id': dialog_id, 'message': message, 'telegram_message_id': str(self._next_id)}
        self.sends.append(rec)
        return {'telegram_message_id': str(self._next_id), 'sent_at': _now()}
