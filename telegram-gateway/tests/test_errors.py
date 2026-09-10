"""Telethon-name → portal-code mapping — stdlib only (stub classes)."""
import unittest

from src.errors import AUTOSTOP_CODES, is_autostop, map_exception


def _stub(name, **attrs):
    cls = type(name, (Exception,), {})
    inst = cls(name)
    for k, v in attrs.items():
        setattr(inst, k, v)
    return inst


class ErrorMappingTests(unittest.TestCase):
    def test_flood_carries_wait_seconds(self):
        m = map_exception(_stub('FloodWaitError', seconds=123))
        self.assertEqual((m.error_code, m.retryable, m.wait_seconds), ('FLOOD_WAIT', False, 123))

    def test_permission_family(self):
        for name in ('ChatWriteForbiddenError', 'UserBannedInChannelError',
                     'ChatAdminRequiredError', 'UserNotParticipantError'):
            m = map_exception(_stub(name))
            self.assertEqual(m.error_code, 'PERMISSION_DENIED')
            self.assertFalse(m.retryable)

    def test_dialog_and_message_errors(self):
        self.assertEqual(map_exception(_stub('PeerIdInvalidError')).error_code, 'INVALID_DIALOG')
        self.assertEqual(map_exception(_stub('MessageTooLongError')).error_code, 'MESSAGE_TOO_LONG')

    def test_session_and_account_errors(self):
        self.assertEqual(map_exception(_stub('SessionRevokedError')).error_code, 'SESSION_INVALID')
        self.assertEqual(map_exception(_stub('UserDeactivatedBanError')).error_code, 'ACCOUNT_RESTRICTED')
        self.assertEqual(map_exception(_stub('SpamBlockedError')).error_code, 'SPAM_BLOCKED')

    def test_transient_is_retryable_unknown_is_not(self):
        m = map_exception(_stub('TimedOutError'))
        self.assertEqual((m.error_code, m.retryable), ('TRANSIENT', True))
        m = map_exception(_stub('SomethingBrandNewError'))
        self.assertEqual((m.error_code, m.retryable), ('GATEWAY_ERROR', False))

    def test_autostop_set_matches_portal(self):
        for code in ('FLOOD_WAIT', 'PERMISSION_DENIED', 'SPAM_BLOCKED', 'ACCOUNT_RESTRICTED'):
            self.assertTrue(is_autostop(code))
            self.assertIn(code, AUTOSTOP_CODES)
        self.assertFalse(is_autostop('TRANSIENT'))


if __name__ == '__main__':
    unittest.main()
