"""Telethon exception → portal error-code mapping — stdlib only.

Mapping is done by exception CLASS NAME (not import) so this module — and its
tests — never need the telethon package installed.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MappedError:
    error_code: str
    retryable: bool
    wait_seconds: int = 0


_BY_NAME: dict[str, MappedError] = {
    # Flood / slow-mode: honor the full wait, stop the remainder, never auto-retry.
    'FloodWaitError': MappedError('FLOOD_WAIT', False),
    'FloodTestPhoneWaitError': MappedError('FLOOD_WAIT', False),
    'SlowModeWaitError': MappedError('SLOW_MODE', False),
    # Permission / membership problems: human must look.
    'ChatWriteForbiddenError': MappedError('PERMISSION_DENIED', False),
    'UserBannedInChannelError': MappedError('PERMISSION_DENIED', False),
    'ChatAdminRequiredError': MappedError('PERMISSION_DENIED', False),
    'UserNotParticipantError': MappedError('PERMISSION_DENIED', False),
    # Bad destination reference.
    'PeerIdInvalidError': MappedError('INVALID_DIALOG', False),
    'UsernameInvalidError': MappedError('INVALID_DIALOG', False),
    'UsernameNotOccupiedError': MappedError('INVALID_DIALOG', False),
    # Message problems.
    'MessageTooLongError': MappedError('MESSAGE_TOO_LONG', False),
    'MessageEmptyError': MappedError('MESSAGE_EMPTY', False),
    'MediaInvalidError': MappedError('MEDIA_INVALID', False),
    # Session / account health: owner ceremony required.
    'AuthKeyError': MappedError('SESSION_INVALID', False),
    'AuthKeyUnregisteredError': MappedError('SESSION_INVALID', False),
    'SessionRevokedError': MappedError('SESSION_INVALID', False),
    'UserDeactivatedError': MappedError('SESSION_INVALID', False),
    'UserDeactivatedBanError': MappedError('ACCOUNT_RESTRICTED', False),
    'SpamBlockedError': MappedError('SPAM_BLOCKED', False),
    # Transient transport issues: safe to retry later (explicitly, not aggressively).
    'TimedOutError': MappedError('TRANSIENT', True),
    'ConnectionError': MappedError('TRANSIENT', True),
    'ServerError': MappedError('TRANSIENT', True),
}

AUTOSTOP_CODES = frozenset({'FLOOD_WAIT', 'PERMISSION_DENIED', 'SPAM_BLOCKED', 'ACCOUNT_RESTRICTED'})


def map_exception(exc: BaseException) -> MappedError:
    name = type(exc).__name__
    mapped = _BY_NAME.get(name)
    if mapped is None:
        return MappedError('GATEWAY_ERROR', False)
    seconds = 0
    if name in ('FloodWaitError', 'FloodTestPhoneWaitError', 'SlowModeWaitError'):
        try:
            seconds = max(0, int(getattr(exc, 'seconds', 0) or 0))
        except (TypeError, ValueError):
            seconds = 0
    return MappedError(mapped.error_code, mapped.retryable, seconds)


def is_autostop(error_code: str) -> bool:
    return (error_code or '') in AUTOSTOP_CODES
