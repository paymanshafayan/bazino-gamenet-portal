"""Real MTProto adapter (Telethon). Imported ONLY when a live session is configured.

This module requires the `telethon` package. Unit/app tests use FakeAdapter and
never import this file, so they run with the stdlib + fastapi only.
"""
from __future__ import annotations

from datetime import datetime, timezone


def _now() -> str:
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _dialog_type(entity) -> str:
    # Imported lazily with telethon (see TelethonAdapter.connect).
    from telethon.tl.types import Channel, Chat, User  # type: ignore

    if isinstance(entity, User):
        return 'private'
    if isinstance(entity, Chat):
        return 'group'
    if isinstance(entity, Channel):
        return 'channel' if getattr(entity, 'broadcast', False) else 'supergroup'
    return 'unknown'


class TelethonAdapter:
    """Thin async wrapper around a Telethon client bound to the owner session."""

    def __init__(self, api_id: str, api_hash: str, session_string: str):
        self._api_id = int(api_id)
        self._api_hash = api_hash
        self._session_string = session_string
        self._client = None

    async def connect(self) -> None:
        if self._client is not None:
            return
        from telethon import TelegramClient  # type: ignore
        from telethon.sessions import StringSession  # type: ignore

        client = TelegramClient(StringSession(self._session_string), self._api_id, self._api_hash)
        await client.connect()
        if not await client.is_user_authorized():
            raise RuntimeError('Telegram session is not authorized (ceremony required)')
        self._client = client

    def _require(self):
        if self._client is None:
            raise RuntimeError('Adapter not connected')
        return self._client

    async def dialogs(self) -> list[dict]:
        client = self._require()
        out: list[dict] = []
        async for d in client.iter_dialogs():
            ent = d.entity
            dtype = _dialog_type(ent)
            perms = await self._permissions_for(dtype, ent, d)
            out.append({
                'dialog_id': str(d.id),
                'title': str(d.title or '')[:120],
                'username': getattr(ent, 'username', None),
                'type': dtype,
                'is_member': True,  # iter_dialogs only returns joined dialogs
                'is_admin': perms['is_admin'],
                'can_send': perms['can_send'],
                'can_send_media': perms['can_send_media'],
                'language': None,
                'last_checked_at': _now(),
            })
        return out

    async def _permissions_for(self, dtype: str, entity, dialog) -> dict:
        # Conservative defaults: unknown = cannot send (portal treats it as reject).
        if dtype == 'private':
            return {'is_admin': False, 'can_send': False, 'can_send_media': False}
        try:
            if dtype == 'channel':
                perms = await dialog.get_permissions() if hasattr(dialog, 'get_permissions') else None
                admin = bool(getattr(entity, 'creator', False) or getattr(entity, 'admin_rights', False))
                _ = perms
                return {'is_admin': admin, 'can_send': admin, 'can_send_media': admin}
            # group / supergroup
            banned = getattr(entity, 'default_banned_rights', None)
            no_send = bool(banned and getattr(banned, 'send_messages', False))
            no_media = bool(banned and getattr(banned, 'send_media', False))
            admin = bool(getattr(entity, 'creator', False) or getattr(entity, 'admin_rights', False))
            return {'is_admin': admin, 'can_send': not no_send, 'can_send_media': not no_media}
        except Exception:
            return {'is_admin': False, 'can_send': False, 'can_send_media': False}

    async def permissions(self, dialog_id: str) -> dict:
        client = self._require()
        try:
            ent = await client.get_entity(int(dialog_id))
        except (ValueError, TypeError):
            ent = await client.get_entity(dialog_id)
        dtype = _dialog_type(ent)
        try:
            dialog = await client.get_dialogs()
            match = next((x for x in dialog if str(x.id) == str(dialog_id)), None)
        except Exception:
            match = None
        if match is None:
            return {'dialog_id': str(dialog_id), 'is_member': False, 'is_admin': False,
                    'can_send': False, 'can_send_media': False, 'type': dtype, 'checked_at': _now()}
        perms = await self._permissions_for(dtype, ent, match)
        return {'dialog_id': str(dialog_id), 'is_member': True, **perms, 'type': dtype, 'checked_at': _now()}

    async def search(self, dialog_id: str, keywords: str = '', lookback_hours: int = 72,
                     limit: int = 20) -> list[dict]:
        from datetime import timedelta  # noqa: F401 (kept explicit for readers)

        client = self._require()
        try:
            entity = await client.get_entity(int(dialog_id))
        except (ValueError, TypeError):
            entity = await client.get_entity(dialog_id)
        words = [w.strip().lower() for w in str(keywords or '').split(',') if w.strip()][:20]
        cutoff = datetime.now(timezone.utc).timestamp() - max(1, lookback_hours) * 3600
        out: list[dict] = []
        async for msg in client.iter_messages(entity, limit=max(1, min(limit, 50)) * 5):
            if len(out) >= max(1, min(limit, 20)):
                break
            if not msg or not getattr(msg, 'text', None):
                continue
            if msg.date and msg.date.timestamp() < cutoff:
                continue
            text = str(msg.text)
            low = text.lower()
            hit = next((w for w in words if w and w in low), '')
            if words and not hit:
                continue
            # Minimal public fields only — never sender profiles/phones.
            out.append({'message_id': str(msg.id),
                        'date': msg.date.isoformat().replace('+00:00', 'Z') if msg.date else _now(),
                        'keyword': hit or None, 'text': text[:300]})
        return out

    async def send(self, dialog_id: str, message: str) -> dict:
        client = self._require()
        try:
            entity = await client.get_entity(int(dialog_id))
        except (ValueError, TypeError):
            entity = await client.get_entity(dialog_id)
        if not message or not message.strip():
            raise ValueError('empty message')
        sent = await client.send_message(entity, message[:4096])
        return {'telegram_message_id': str(sent.id), 'sent_at': _now()}
