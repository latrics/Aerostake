import logging
from typing import Any, Dict, Optional
import resend
from app.config import get_settings

logger = logging.getLogger("aerostake.notifications")
settings = get_settings()


class NotificationService:
    """Multi-channel notification service for transactional email and push alerts."""

    def __init__(self):
        self._firebase_initialized = False
        if settings.RESEND_API_KEY:
            resend.api_key = settings.RESEND_API_KEY

        # Initialize Firebase if credentials path is supplied
        if settings.FIREBASE_CREDENTIALS_PATH:
            try:
                import firebase_admin
                from firebase_admin import credentials
                if not firebase_admin._apps:
                    cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
                    firebase_admin.initialize_app(cred)
                self._firebase_initialized = True
            except Exception as e:
                logger.warning(f"Failed to initialize Firebase Admin SDK: {e}")

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
    ) -> bool:
        """Dispatch a transactional email via Resend or log to sandbox."""
        if settings.RESEND_API_KEY:
            try:
                params = {
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                }
                resend.Emails.send(params)
                logger.info(f"Email successfully delivered to {to_email} via Resend")
                return True
            except Exception as e:
                logger.error(f"Resend email delivery failed for {to_email}: {e}")
                return False
        else:
            logger.info(
                f"[NOTIFICATIONS SANDBOX] Email to: {to_email} | Subject: '{subject}' | Content Preview: {html_content[:100]}..."
            )
            return True

    async def send_push(
        self,
        device_token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """Dispatch a mobile push notification via FCM or log to sandbox."""
        if self._firebase_initialized:
            try:
                from firebase_admin import messaging
                message = messaging.Message(
                    notification=messaging.Notification(title=title, body=body),
                    data={str(k): str(v) for k, v in (data or {}).items()},
                    token=device_token,
                )
                messaging.send(message)
                logger.info(f"FCM push notification successfully sent to device token {device_token[:15]}...")
                return True
            except Exception as e:
                logger.error(f"FCM push delivery failed: {e}")
                return False
        else:
            logger.info(
                f"[NOTIFICATIONS SANDBOX] FCM Push to: {device_token[:15]}... | Title: '{title}' | Body: '{body}' | Data: {data}"
            )
            return True


notification_service = NotificationService()
