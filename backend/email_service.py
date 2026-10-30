"""Provider-agnostic email sending.

Pick a provider with EMAIL_PROVIDER in backend/.env. With none set, every
message is still logged (status "queued") so the app works end-to-end and
nothing is lost; plugging a provider in later sends from then on.

Built in: "smtp" (any SMTP server: SMTP_HOST, SMTP_PORT, SMTP_USER,
SMTP_PASSWORD, SMTP_FROM, SMTP_STARTTLS=true|false).
Add another by decorating a factory with @register_provider("name") that
returns an object with `name` and `async send(to, subject, text) -> str`.
"""
import asyncio
import os
import smtplib
from email.message import EmailMessage
from typing import Callable, Dict, Optional, Protocol


class EmailProvider(Protocol):
    name: str

    async def send(self, to: str, subject: str, text: str, reply_to: Optional[str] = None) -> str: ...


_FACTORIES: Dict[str, Callable[[], EmailProvider]] = {}


def register_provider(name: str):
    def wrap(factory: Callable[[], EmailProvider]):
        _FACTORIES[name] = factory
        return factory
    return wrap


class SmtpProvider:
    name = 'smtp'

    def __init__(self):
        self.host = os.environ['SMTP_HOST']
        self.port = int(os.environ.get('SMTP_PORT', '587'))
        self.user = os.environ.get('SMTP_USER', '')
        self.password = os.environ.get('SMTP_PASSWORD', '')
        self.sender = os.environ['SMTP_FROM']
        self.starttls = os.environ.get('SMTP_STARTTLS', 'true').lower() != 'false'

    def _send_sync(self, to: str, subject: str, text: str, reply_to: Optional[str]) -> str:
        msg = EmailMessage()
        msg['From'], msg['To'], msg['Subject'] = self.sender, to, subject
        if reply_to:
            msg['Reply-To'] = reply_to
        msg.set_content(text)
        with smtplib.SMTP(self.host, self.port, timeout=20) as server:
            if self.starttls:
                server.starttls()
            if self.user:
                server.login(self.user, self.password)
            server.send_message(msg)
        return msg.get('Message-ID', '') or 'smtp'

    async def send(self, to: str, subject: str, text: str, reply_to: Optional[str] = None) -> str:
        return await asyncio.to_thread(self._send_sync, to, subject, text, reply_to)


register_provider('smtp')(SmtpProvider)


def active_provider() -> Optional[EmailProvider]:
    name = os.environ.get('EMAIL_PROVIDER', '').strip().lower()
    factory = _FACTORIES.get(name)
    if not factory:
        return None
    try:
        return factory()
    except KeyError:  # provider chosen but its settings are incomplete
        return None


def provider_status() -> dict:
    name = os.environ.get('EMAIL_PROVIDER', '').strip().lower() or None
    provider = active_provider()
    return {'provider': name, 'configured': provider is not None, 'available': sorted(_FACTORIES)}
