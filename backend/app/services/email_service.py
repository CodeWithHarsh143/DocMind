from app.config import settings
from resend import Emails
from resend import Emails as EmailTypes

SendParams = EmailTypes.SendParams


class EmailService:
    @staticmethod
    def _send(params: SendParams) -> None:
        Emails.send(params)

    @staticmethod
    def build_otp_email(code: str) -> str:
        return f"""
      <html>
        <body style="font-family: Arial, sans-serif; background: #f6f7fb; padding: 32px;">
          <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px;">
            <h2 style="margin: 0 0 16px; color: #111827;">Your DocMind verification code</h2>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">Use the code below to reset your password. It expires in 10 minutes.</p>
            <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #2563eb;">{code}</div>
            <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
      """

    @staticmethod
    def send_otp_email(to: str, code: str) -> None:
        params: SendParams = {
            "from": settings.email_from,
            "to": [to],
            "subject": "Your DocMind verification code",
            "html": EmailService.build_otp_email(code),
        }
        EmailService._send(params)

    @staticmethod
    def build_invite_email(org_name: str, inviter_name: str, invite_link: str) -> str:
        return f"""
        <html>
          <body style="font-family: Arial, sans-serif; background: #f6f7fb; padding: 32px;">
            <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #111827;">You've been invited to {org_name}</h2>
              <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                <strong>{inviter_name}</strong> has invited you to join the workspace
                <strong>{org_name}</strong> on DocMind, where you can upload documents and ask questions together.
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="{invite_link}"
                  style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none;
                          font-size: 15px; font-weight: 600; padding: 12px 28px; border-radius: 8px;">
                  Accept invitation
                </a>
              </div>
              <p style="color: #6b7280; font-size: 13px; margin: 0;">Or copy this link into your browser:</p>
              <p style="color: #2563eb; font-size: 13px; word-break: break-all; margin-top: 4px;">{invite_link}</p>
              <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
                If you weren't expecting this invitation, you can safely ignore this email.
              </p>
            </div>
          </body>
        </html>
        """

    @staticmethod
    def send_invite_email(to: str, org_name: str, inviter_name: str, invite_token: str) -> None:
        invite_link = f"{settings.frontend_base_url}/invite/{invite_token}"
        params: SendParams = {
            "from": settings.email_from,
            "to": [to],
            "subject": f"{inviter_name} invited you to {org_name} on DocMind",
            "html": EmailService.build_invite_email(
                org_name, inviter_name, invite_link
            ),
        }
        EmailService._send(params)