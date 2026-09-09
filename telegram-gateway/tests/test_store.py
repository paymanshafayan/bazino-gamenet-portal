"""Idempotency + rate limit + FloodWait window — stdlib only."""
import unittest

from src.store import GatewayStore


class StoreTests(unittest.TestCase):
    def test_idempotency_put_get(self):
        s = GatewayStore(':memory:')
        self.assertIsNone(s.idem_get('k1'))
        s.idem_put('k1', 'r1', {'status': 'sent'})
        self.assertEqual(s.idem_get('k1'), {'status': 'sent'})

    def test_min_interval_blocks_then_allows(self):
        s = GatewayStore(':memory:')
        ok, _ = s.check_rate_limit('-1001', 60, 30, '2026-09-09T10:00:00Z')
        self.assertTrue(ok)
        s.record_send('-1001', '2026-09-09T10:00:00Z')
        ok, reason = s.check_rate_limit('-1001', 60, 30, '2026-09-09T10:00:30Z')
        self.assertFalse(ok)
        self.assertEqual(reason, 'MIN_INTERVAL')
        ok, _ = s.check_rate_limit('-1001', 60, 30, '2026-09-09T10:02:00Z')
        self.assertTrue(ok)

    def test_hourly_cap_rolls(self):
        s = GatewayStore(':memory:')
        for i in range(3):
            s.record_send(f'-100{i}', f'2026-09-09T10:0{i}:00Z')
        ok, reason = s.check_rate_limit('-1009', 0, 3, '2026-09-09T10:30:00Z')
        self.assertFalse(ok)
        self.assertEqual(reason, 'HOURLY_CAP')
        ok, _ = s.check_rate_limit('-1009', 0, 3, '2026-09-09T11:31:00Z')
        self.assertTrue(ok)

    def test_flood_window(self):
        s = GatewayStore(':memory:')
        self.assertFalse(s.flood_active('2026-09-09T10:00:00Z'))
        s.set_flood_wait(120, '2026-09-09T10:00:00Z')
        self.assertTrue(s.flood_active('2026-09-09T10:01:00Z'))
        self.assertFalse(s.flood_active('2026-09-09T10:03:00Z'))


if __name__ == '__main__':
    unittest.main()
