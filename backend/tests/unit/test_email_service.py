"""Unit tests for EmailService (offline — no real SMTP/Resend calls)."""

import pytest

from app.config import settings
from app.services.email_service import EmailService


def test_build_otp_email_contains_code():
    html = EmailService.build_otp_email("123456")
    assert "123456" in html
    assert "DocMind" in html


def test_build_invite_email_contains_org_and_link():
    html = EmailService.build_invite_email("Acme", "Ada", "https://docmind.example/invite/xyz")
    assert "Acme" in html
    assert "https://docmind.example/invite/xyz" in html


def test_smtp_send_raises_when_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "email_provider", "smtp")
    monkeypatch.setattr(settings, "smtp_host", "")
    monkeypatch.setattr(settings, "smtp_user", "")
    monkeypatch.setattr(settings, "smtp_pass", "")

    with pytest.raises(RuntimeError, match="requires SMTP_HOST"):
        EmailService.send_otp_email(to="someone@example.com", code="654321")


def test_resend_send_warns_without_api_key(monkeypatch, caplog):
    import logging

    monkeypatch.setattr(settings, "email_provider", "resend")
    monkeypatch.setattr(settings, "resend_api_key", "")

    with caplog.at_level(logging.WARNING, logger="app.services.email_service"):
        EmailService.send_otp_email(to="someone@example.com", code="654321")

    assert any("RESEND_API_KEY not set" in record.message for record in caplog.records)


def test_send_otp_email_builds_correct_params(monkeypatch):
    captured = {}

    def fake_send(params):
        captured.update(params)

    monkeypatch.setattr(EmailService, "_send", staticmethod(fake_send))
    monkeypatch.setattr(settings, "email_from", "DocMind <no-reply@example.com>")

    EmailService.send_otp_email(to="someone@example.com", code="123456")

    assert captured["to"] == ["someone@example.com"]
    assert captured["from"] == "DocMind <no-reply@example.com>"
    assert "Your DocMind verification code" == captured["subject"]
    assert "123456" in captured["html"]