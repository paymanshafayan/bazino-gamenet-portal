"""HMAC/bearer/expiry — stdlib only, no fastapi import."""
import unittest
from datetime import datetime, timedelta, timezone

from src.security import is_expired, sign_command, valid_bearer, verify_signature


class SecurityTests(unittest.TestCase):
    def test_sign_verify_roundtrip(self):
        raw = b'{"request_id":"r1","message":"hi"}'
        sig = 'sha256=' + sign_command('s3cret', raw)
        self.assertTrue(verify_signature(raw, sig, 's3cret'))

    def test_tampered_body_wrong_secret_malformed_fail(self):
        raw = b'{"a":1}'
        sig = 'sha256=' + sign_command('s3cret', raw)
        self.assertFalse(verify_signature(b'{"a":2}', sig, 's3cret'))
        self.assertFalse(verify_signature(raw, sig, 'other'))
        self.assertFalse(verify_signature(raw, 'not-hex', 's3cret'))
        self.assertFalse(verify_signature(raw, '', 's3cret'))
        self.assertFalse(verify_signature(raw, sig, ''))

    def test_bearer_compare(self):
        self.assertTrue(valid_bearer('tok', 'tok'))
        self.assertFalse(valid_bearer('tok', 'other'))
        self.assertFalse(valid_bearer('', 'tok'))
        self.assertFalse(valid_bearer('tok', ''))

    def test_expiry_fail_closed(self):
        now = datetime(2026, 9, 9, 10, 0, tzinfo=timezone.utc)
        future = (now + timedelta(minutes=10)).isoformat()
        past = (now - timedelta(minutes=1)).isoformat()
        self.assertFalse(is_expired(future, now))
        self.assertTrue(is_expired(past, now))
        self.assertTrue(is_expired('garbage', now))
        self.assertTrue(is_expired('', now))


if __name__ == '__main__':
    unittest.main()
