"""Env config parsing — stdlib only."""
import unittest

from src.config import load_config


class ConfigTests(unittest.TestCase):
    def test_defaults_and_session_flag(self):
        cfg = load_config({})
        self.assertFalse(cfg.session_configured)
        self.assertEqual(cfg.send_min_interval_seconds, 60)
        self.assertEqual(cfg.send_max_per_hour, 30)
        self.assertFalse(cfg.use_fake)

    def test_full_env(self):
        cfg = load_config({
            'GATEWAY_BEARER': 'b', 'GATEWAY_HMAC_SECRET': 'h',
            'TG_API_ID': '1', 'TG_API_HASH': 'hash', 'TG_SESSION_STRING': 'sess',
            'SEND_MIN_INTERVAL_SECONDS': '5', 'SEND_MAX_PER_HOUR': '7',
            'DB_PATH': ':memory:', 'TG_USE_FAKE': 'true',
        })
        self.assertTrue(cfg.session_configured)
        self.assertTrue(cfg.use_fake)
        self.assertEqual(cfg.send_min_interval_seconds, 5)
        self.assertEqual(cfg.send_max_per_hour, 7)


if __name__ == '__main__':
    unittest.main()
