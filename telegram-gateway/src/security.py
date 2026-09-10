"""Bearer + HMAC verification — stdlib only. Mirrors server/manus/gateway.ts."""
from __future__ import annotations

import hashlib
import hmac
import re
from datetime import datetime, timezone

_HEX64 = re.compile(r'\A[a-f0-9]{64}\Z', re.IGNORECASE)


def sign_command(secret: str, raw: bytes) -> str:
    return hmac.new(secret.encode('utf-8'), raw, hashlib.sha256).hexdigest()


def verify_signature(raw: bytes, signature: str, secret: str) -> bool:
    sig = (signature or '').removeprefix('sha256=').removeprefix('SHA256=')
    if not secret or not sig or not _HEX64.match(sig):
        return False
    try:
        expected = hmac.new(secret.encode('utf-8'), raw, hashlib.sha256).digest()
        return hmac.compare_digest(bytes.fromhex(sig), expected)
    except (ValueError, TypeError):
        return False


def valid_bearer(provided: str, expected: str) -> bool:
    if not provided or not expected:
        return False
    return hmac.compare_digest(provided, expected)


def is_expired(expires_at_iso: str, now: datetime | None = None) -> bool:
    """Unparseable expiry counts as expired (fail-closed)."""
    try:
        dt = datetime.fromisoformat(str(expires_at_iso).replace('Z', '+00:00'))
        ref = now or datetime.now(timezone.utc)
        return dt <= ref
    except (ValueError, TypeError):
        return True
