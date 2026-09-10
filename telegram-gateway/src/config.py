"""Environment configuration — stdlib only (importable by unit tests)."""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class GatewayConfig:
    bearer: str
    hmac_secret: str
    api_id: str
    api_hash: str
    session_string: str
    send_min_interval_seconds: int
    send_max_per_hour: int
    db_path: str
    use_fake: bool

    @property
    def session_configured(self) -> bool:
        return bool(self.api_id and self.api_hash and self.session_string)


def _int_env(src: dict, name: str, default: int) -> int:
    try:
        return int(src.get(name, default))
    except (TypeError, ValueError):
        return default


def load_config(env: dict | None = None) -> GatewayConfig:
    src: dict = env if env is not None else os.environ  # type: ignore[assignment]
    get = lambda k, d='': str(src.get(k, d) or '').strip()  # noqa: E731
    return GatewayConfig(
        bearer=get('GATEWAY_BEARER'),
        hmac_secret=get('GATEWAY_HMAC_SECRET'),
        api_id=get('TG_API_ID'),
        api_hash=get('TG_API_HASH'),
        session_string=get('TG_SESSION_STRING'),
        send_min_interval_seconds=_int_env(src, 'SEND_MIN_INTERVAL_SECONDS', 60),
        send_max_per_hour=_int_env(src, 'SEND_MAX_PER_HOUR', 30),
        db_path=get('DB_PATH') or '/data/tg-gateway.sqlite',
        use_fake=get('TG_USE_FAKE').lower() in ('1', 'true', 'yes'),
    )
