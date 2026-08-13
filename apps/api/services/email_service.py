import logging
import os
from datetime import datetime
from typing import Optional

import resend

from config import settings

logger = logging.getLogger("email_service")

# Initialize Resend
api_key = os.environ.get("RESEND_EMAILS_API_KEY") or os.environ.get("RESEND_API_KEY")
if api_key:
    resend.api_key = api_key
else:
    logger.warning(
        "RESEND_EMAILS_API_KEY not found in environment. Emails will not be sent."
    )

# Sender identities + link base come from config (env-driven, safe dev defaults).
FROM_EMAIL = settings.RESEND_FROM_EMAIL
SECURITY_EMAIL = settings.SECURITY_FROM_EMAIL


def _frontend_url() -> str:
    """Base URL for links in emails — the deployed web app (config/env-driven)."""
    return settings.FRONTEND_URL.rstrip("/")


def _send(
    to_email: str,
    subject: str,
    html: str,
    from_addr: str = FROM_EMAIL,
    user_id: Optional[int] = None,
    email_type: str = "SYSTEM",
    reply_to: Optional[str] = None,
) -> bool:
    """Low-level send helper. Returns True on success, raises on transient failures.

    Transient errors (Resend API timeouts, connection errors) are raised so the durable
    job queue can retry. Configuration errors (missing API key in production) also raise.
    Only dev/staging without a key returns False (graceful degradation).
    """
    if not api_key:
        # Email now runs through the DURABLE job queue, so raising here makes every
        # message retry 5x and land in `failed` — filling the queue with noise in any
        # environment that legitimately has no key (dev, CI, staging).
        # In production an unset key IS a real misconfiguration, so it still raises;
        # elsewhere it degrades to a logged no-op.
        import os

        env = (os.environ.get("ENVIRONMENT") or os.environ.get("ENV") or "development").lower()
        if env.startswith("prod"):
            logger.error(
                f"[EMAIL ABORT] No Resend key in production. Cannot send '{subject}' to {to_email}"
            )
            raise NotImplementedError(
                "Email sending requires RESEND_EMAILS_API_KEY to be configured in production."
            )
        logger.warning(
            f"[EMAIL SKIPPED] No Resend key (env={env}); would have sent '{subject}' to {to_email}"
        )
        return False

    import models
    from database import SessionLocal

    db = SessionLocal()

    try:
        _payload = {"from": from_addr, "to": [to_email], "subject": subject, "html": html}
        if reply_to:
            _payload["reply_to"] = [reply_to]
        resend.Emails.send(_payload)  # type: ignore[arg-type]
        logger.info(f"Email sent: '{subject}' → {to_email}")

        # Log to DB
        log_entry = models.EmailLog(
            user_id=user_id,
            recipient_email=to_email,
            email_type=email_type,
            subject=subject,
            status="sent",
        )
        db.add(log_entry)
        db.commit()
        return True
    except Exception as e:
        error_msg = str(e)
        logger.error(f"[EMAIL FAILED] Transient error sending '{subject}' to {to_email}: {error_msg}")

        # Log failure to DB so we have a trace, but re-raise so the job queue retries
        try:
            log_entry = models.EmailLog(
                user_id=user_id,
                recipient_email=to_email,
                email_type=email_type,
                subject=subject,
                status="failed",
                error_message=error_msg,
            )
            db.add(log_entry)
            db.commit()
        except Exception as db_err:
            logger.error(f"[EMAIL] Failed to log email failure to database: {db_err}")
            db.rollback()

        # Re-raise the exception so the durable job queue retries this message
        raise
    finally:
        db.close()


def send_contact_email(
    name: str,
    email: str,
    subject: str,
    category: str,
    message: str,
) -> bool:
    """Deliver a public contact-form submission to the configured CONTACT_EMAIL.
    Reply-To is set to the submitter so a reply goes straight back to them."""
    from config import settings

    safe = lambda s: (s or "").strip()  # noqa: E731
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#4f46e5;">📬 New contact request — someone reached out via GrindBuddy</h2>
      <p><strong>{safe(name)}</strong> has contacted you through the GrindBuddy website with these details:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:6px 0;color:#64748b;width:120px;">Name</td><td style="padding:6px 0;"><strong>{safe(name)}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;"><a href="mailto:{safe(email)}">{safe(email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Category</td><td style="padding:6px 0;">{safe(category) or 'General Inquiry'}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Subject</td><td style="padding:6px 0;">{safe(subject) or '(none)'}</td></tr>
      </table>
      <p style="color:#64748b;margin-bottom:6px;">Message</p>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;white-space:pre-wrap;border-left:4px solid #4f46e5;">{safe(message)}</div>
      <p style="color:#94a3b8;font-size:12px;margin-top:20px;">Reply to this email to respond directly to {safe(name)}.</p>
    </div>"""
    return _send(
        to_email=settings.CONTACT_EMAIL,
        subject=f"[GrindBuddy Contact] {safe(category) or 'Inquiry'}: {safe(subject) or safe(name)}",
        html=html,
        email_type="CONTACT_FORM",
        reply_to=safe(email) or None,
    )


# ──────────────────────────────────────────────────────────────────────────────
# 1. OTP / Security
# ──────────────────────────────────────────────────────────────────────────────
def send_otp_email(to_email: str, otp_code: str) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#4f46e5;margin-bottom:4px;">Verification Required</h2>
      <p style="color:#475569;">Use the OTP below to reset your GrindBuddy password. Valid for <strong>10 minutes</strong>.</p>
      <div style="background:#f8fafc;padding:20px;text-align:center;border-radius:8px;margin:20px 0;">
        <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#1e293b;">{otp_code}</span>
      </div>
      <p style="color:#94a3b8;font-size:13px;">If you didn't request this, you can safely ignore this email.</p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;"/>
      <p style="text-align:center;color:#cbd5e1;font-size:11px;">GrindBuddy Enterprise L&D Framework</p>
    </div>"""
    return _send(
        to_email,
        "🔒 GrindBuddy Password Recovery Code",
        html,
        SECURITY_EMAIL,
        email_type="OTP",
    )


# ──────────────────────────────────────────────────────────────────────────────
# 2. Welcome Email
# ──────────────────────────────────────────────────────────────────────────────
def send_welcome_email(to_email: str, full_name: str, group_name: str) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h1 style="color:#4f46e5;">Welcome to GrindBuddy, {full_name}! 🎉</h1>
      <p>You've been added to <strong>{group_name}</strong>. Your learning journey starts now.</p>
      <ul style="color:#475569;line-height:1.8;">
        <li>📚 Access your group's question banks</li>
        <li>💻 Practice coding challenges</li>
        <li>📊 Track your progress on the leaderboard</li>
        <li>🏆 Compete in daily challenges</li>
      </ul>
      <p style="color:#94a3b8;font-size:13px;margin-top:20px;">Login using the credentials your Group Admin shared with you.</p>
    </div>"""
    return _send(
        to_email, f"🎓 Welcome to GrindBuddy — {group_name}", html, email_type="WELCOME"
    )


# ──────────────────────────────────────────────────────────────────────────────
# 2b. Individual credentials (email-first login lifecycle)
# ──────────────────────────────────────────────────────────────────────────────
def send_credentials_email(
    to_email: str, full_name: str, group_name: str, temp_password: str
) -> bool:
    """Deliver auto-generated individual credentials to a new user.

    Part of the email-first login lifecycle: every account gets its OWN
    password at creation, so the shared group-pattern login can be retired.
    """
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h1 style="color:#4f46e5;">Welcome to GrindBuddy, {full_name}! 🎉</h1>
      <p>You've been added to <strong>{group_name}</strong>. Sign in with your email and the temporary password below.</p>
      <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:20px 0;">
        <p style="margin:0;color:#475569;font-size:13px;">Email</p>
        <p style="margin:0 0 12px;font-weight:700;color:#1e293b;">{to_email}</p>
        <p style="margin:0;color:#475569;font-size:13px;">Temporary password</p>
        <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:2px;color:#1e293b;">{temp_password}</p>
      </div>
      <p style="color:#b45309;font-size:13px;">⚠️ Change this password after your first sign-in (Profile → Change Password).</p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;"/>
      <p style="text-align:center;color:#cbd5e1;font-size:11px;">GrindBuddy Enterprise L&D Framework</p>
    </div>"""
    return _send(
        to_email,
        "🔑 Your GrindBuddy account credentials",
        html,
        SECURITY_EMAIL,
        email_type="CREDENTIALS",
    )


# ──────────────────────────────────────────────────────────────────────────────
# 3. Role Promotion
# ──────────────────────────────────────────────────────────────────────────────
def send_role_promotion_email(
    to_email: str, full_name: str, new_role: str, group_name: str
) -> bool:
    role_descriptions = {
        "Mentor": "You can now review student attempts, add feedback comments, and monitor group performance.",
        "GroupAdmin": "You can now manage your group — add members, create question banks, and view analytics.",
        "LDAdmin": "You now have full platform access across all organizations and groups.",
    }
    description = role_descriptions.get(
        new_role, f"Your role has been updated to {new_role}."
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#059669;">Role Upgraded: {new_role} 🚀</h2>
      <p>Hi <strong>{full_name}</strong>,</p>
      <p>Your role in <strong>{group_name}</strong> has been upgraded to <strong>{new_role}</strong>.</p>
      <p style="color:#475569;">{description}</p>
      <p style="color:#94a3b8;font-size:13px;margin-top:20px;">Log in to GrindBuddy to explore your new capabilities.</p>
    </div>"""
    return _send(
        to_email,
        f"✅ You've been promoted to {new_role} on GrindBuddy",
        html,
        email_type="ROLE_PROMOTION",
    )


# ──────────────────────────────────────────────────────────────────────────────
# 4. Assignment Created (Mandate)
# ──────────────────────────────────────────────────────────────────────────────
def send_assignment_email(
    to_email: str,
    full_name: str,
    bank_name: str,
    due_date: Optional[str] = None,
    max_attempts: Optional[int] = None,
) -> bool:
    due_str = f"<p><strong>Due:</strong> {due_date}</p>" if due_date else ""
    attempts_str = (
        f"<p><strong>Attempts allowed:</strong> {max_attempts}</p>"
        if max_attempts
        else ""
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#7c3aed;">📋 New Assignment Mandate</h2>
      <p>Hi <strong>{full_name}</strong>,</p>
      <p>A new mandatory assignment has been assigned to you:</p>
      <div style="background:#f5f3ff;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #7c3aed;">
        <strong style="font-size:18px;">{bank_name}</strong>
        {due_str}{attempts_str}
      </div>
      <p style="color:#475569;">Log in to GrindBuddy to complete this assignment before the deadline.</p>
    </div>"""
    return _send(
        to_email,
        f"📋 New Mandatory Assignment: {bank_name}",
        html,
        email_type="ASSIGNMENT_MANDATE",
    )


def send_exam_invite(
    to_email: str,
    full_name: str,
    exam_title: str,
    portal_url: str,
    duration_minutes: Optional[int] = None,
    passing_score: Optional[int] = None,
    window_label: Optional[str] = None,
    instructions: Optional[str] = None,
) -> bool:
    """Invite an internal user to a published exam, with a direct portal link.

    `window_label` is a human-readable schedule (e.g. "12 Aug 2026, 10:00–12:00
    IST") shown prominently so candidates know when to attend (Mettl-style).
    """
    meta_bits = []
    if window_label:
        meta_bits.append(
            f'<p><strong>🗓️ When:</strong> {window_label}</p>'
        )
    if duration_minutes:
        meta_bits.append(f"<p><strong>Duration:</strong> {duration_minutes} minutes</p>")
    if passing_score is not None:
        meta_bits.append(f"<p><strong>Passing score:</strong> {passing_score}%</p>")
    if instructions:
        meta_bits.append(
            f'<p style="margin-top:8px;color:#475569;font-size:13px;">{instructions}</p>'
        )
    meta_str = "".join(meta_bits)
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#4f46e5;">📝 You've Been Invited to an Exam</h2>
      <p>Hi <strong>{full_name}</strong>,</p>
      <p>A proctored exam has been published for you:</p>
      <div style="background:#eef2ff;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #4f46e5;">
        <strong style="font-size:18px;">{exam_title}</strong>
        {meta_str}
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="{portal_url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;">Open Exam</a>
      </div>
      <p style="color:#475569;font-size:13px;">Or paste this link into your browser:<br/><span style="color:#4f46e5;word-break:break-all;">{portal_url}</span></p>
    </div>"""
    return _send(
        to_email,
        f"📝 Exam Invitation: {exam_title}",
        html,
        email_type="EXAM_INVITE",
    )


# ──────────────────────────────────────────────────────────────────────────────
# 5. Streak Break Alert
# ──────────────────────────────────────────────────────────────────────────────
def send_streak_break_email(to_email: str, full_name: str, streak_days: int) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #fee2e2;border-radius:12px;">
      <h2 style="color:#dc2626;">⚠️ Don't Break Your Streak!</h2>
      <p>Hi <strong>{full_name}</strong>,</p>
      <p>You're on a <strong>{streak_days}-day learning streak</strong> — don't lose it today!</p>
      <p style="color:#475569;">Complete today's daily challenge or attempt any question bank to keep your streak alive.</p>
      <p style="color:#94a3b8;font-size:12px;">Tomorrow it resets. Come back and keep learning! 🔥</p>
    </div>"""
    return _send(
        to_email,
        f"🔥 Your {streak_days}-day streak is at risk!",
        html,
        email_type="STREAK_ALERT",
    )


# ──────────────────────────────────────────────────────────────────────────────
# 6. Assignment Deadline Reminder
# ──────────────────────────────────────────────────────────────────────────────
def send_deadline_reminder_email(
    to_email: str, full_name: str, bank_name: str, due_date: str
) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #fef3c7;border-radius:12px;">
      <h2 style="color:#d97706;">⏰ Assignment Deadline Tomorrow</h2>
      <p>Hi <strong>{full_name}</strong>,</p>
      <p>The mandatory assignment <strong>{bank_name}</strong> is due on <strong>{due_date}</strong>.</p>
      <p style="color:#475569;">Log in to GrindBuddy now to complete it before the deadline.</p>
    </div>"""
    return _send(
        to_email,
        f"⏰ Deadline Reminder: {bank_name}",
        html,
        email_type="DEADLINE_REMINDER",
    )


# ──────────────────────────────────────────────────────────────────────────────
# 7. Weekly Digest
# ──────────────────────────────────────────────────────────────────────────────
def send_weekly_digest_email(to_email: str, full_name: str, stats: dict) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#4f46e5;">📊 Your Weekly Learning Summary</h2>
      <p>Hi <strong>{full_name}</strong>, here's how you did this week:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#f8fafc;"><td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;">Attempts</td><td style="padding:10px;border:1px solid #e2e8f0;">{stats.get("attempts", 0)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;">Avg Accuracy</td><td style="padding:10px;border:1px solid #e2e8f0;">{stats.get("avg_accuracy", 0)}%</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;">Topics Covered</td><td style="padding:10px;border:1px solid #e2e8f0;">{stats.get("topics", 0)}</td></tr>
        <tr><td style="padding:10px;border:1px solid #e2e8f0;font-weight:bold;">Current Streak</td><td style="padding:10px;border:1px solid #e2e8f0;">{stats.get("streak", 0)} days 🔥</td></tr>
      </table>
      <p style="color:#64748b;font-size:13px;">Keep up the momentum next week!</p>
    </div>"""
    return _send(
        to_email,
        "📊 Your Weekly GrindBuddy Learning Report",
        html,
        email_type="WEEKLY_DIGEST",
    )


# ──────────────────────────────────────────────────────────────────────────────
# 8. Performance Intervention
# ──────────────────────────────────────────────────────────────────────────────
def send_intervention_email(
    to_email: str, full_name: str, message: str, admin_name: str
) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #1e293b;border-radius:12px;background:#fcfcfc;">
      <h2 style="color:#1e293b;border-bottom:2px solid #4f46e5;padding-bottom:8px;">Growth Synchronization</h2>
      <p>Hi <strong>{full_name}</strong>,</p>
      <p style="color:#334155;line-height:1.6;font-size:15px;">
        {message}
      </p>
      <div style="margin-top:24px;padding:12px;background:#f1f5f9;border-radius:6px;font-size:14px;color:#475569;">
        Best regards,<br/>
        <strong>{admin_name}</strong><br/>
        L&D Global Executive Team
      </div>
      <p style="color:#94a3b8;font-size:11px;margin-top:20px;text-align:center;">
        GrindBuddy Intelligence & Development Platform
      </p>
    </div>"""
    return _send(
        to_email,
        "📊 Strategic Performance Notification",
        html,
        email_type="INTERVENTION",
    )


# ──────────────────────────────────────────────────────────────────────────────
# 9. Dormant User Re-engagement
# ──────────────────────────────────────────────────────────────────────────────
def send_reengagement_email(to_email: str, full_name: str, days_inactive: int) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#4f46e5;">We've Missed Your Progress, {full_name}! 🚀</h2>
      <p>It's been <strong>{days_inactive} days</strong> since your last synchronization on GrindBuddy.</p>
      <p style="color:#475569;line-height:1.6;">
        Consistency is the core of master engineering. Your learning track is waiting for you to continue your journey toward 100% proficiency.
      </p>
      <div style="background:#f8fafc;padding:20px;border-radius:8px;margin:20px 0;text-align:center;">
        <p style="margin:0;font-weight:bold;color:#1e293b;">Recommended Action:</p>
        <p style="margin:8px 0 0 0;color:#6366f1;">Complete today's Daily Challenge to jumpstart your momentum.</p>
      </div>
      <p style="color:#94a3b8;font-size:13px;">Don't let your knowledge decay. Log back in and keep building!</p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;"/>
      <p style="text-align:center;color:#cbd5e1;font-size:11px;">GrindBuddy Intelligence & Development Platform</p>
    </div>"""
    return _send(
        to_email,
        f"🚀 Resume Your Learning Journey, {full_name}",
        html,
        email_type="REENGAGEMENT",
    )


# ──────────────────────────────────────────────────────────────────────────────
# 10. Knowledge Transfer (KT)
# ──────────────────────────────────────────────────────────────────────────────
def send_access_key(
    to_email: str,
    recipient_name: str,
    raw_key: str,
    scope_label: str,
    projects: list,
    expires_at: Optional[datetime] = None,
) -> bool:
    project_list = "".join([f"<li>{p}</li>" for p in projects])
    # expires_at arrives as a datetime when called in-process, but as an ISO
    # string when driven by the durable job queue (JSONB round-trip). Accept both.
    expiry_display = ""
    if isinstance(expires_at, str):
        try:
            expiry_display = datetime.fromisoformat(expires_at).strftime("%Y-%m-%d %H:%M")
        except ValueError:
            expiry_display = expires_at
    elif expires_at is not None:
        expiry_display = expires_at.strftime("%Y-%m-%d %H:%M")
    expiry_str = (
        f"<p><strong>Expires:</strong> {expiry_display}</p>" if expiry_display else ""
    )
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#4f46e5;">Access Key Issued: {scope_label} 🔑</h2>
      <p>Hi <strong>{recipient_name}</strong>,</p>
      <p>You have been granted access to the Knowledge Transfer portal for the following projects:</p>
      <ul>{project_list}</ul>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:20px 0;border:1px dashed #cbd5e1;text-align:center;">
        <p style="margin:0;font-size:14px;"><strong>Your Full Access Key:</strong></p>
        <p style="margin:8px 0 0 0;font-family:monospace;font-size:18px;font-weight:bold;word-break:break-all;color:#1e293b;">{raw_key}</p>
        <p style="margin:8px 0 0 0;font-size:12px;color:#dc2626;font-weight:bold;">⚠️ DO NOT SHARE THIS KEY. It will only be shown once in the portal.</p>
      </div>
      {expiry_str}
      <div style="text-align:center;margin:24px 0;">
        <a href="{_frontend_url()}/kt" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;">Open the KT Portal</a>
      </div>
      <p style="color:#475569;font-size:13px;">Open the portal, redeem this key, and start asking the Knowledge Base AI about your projects.</p>
    </div>"""
    return _send(
        to_email, f"🔑 Access Key: {scope_label}", html, email_type="KT_ACCESS_KEY"
    )


def send_kt_notification_email(
    to_email: str, full_name: str, title: str, body: str
) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#4f46e5;">{title}</h2>
      <p>Hi <strong>{full_name}</strong>,</p>
      <div style="color:#334155;line-height:1.6;font-size:15px;margin:20px 0;">
        {body}
      </div>
      <p style="text-align:center;color:#cbd5e1;font-size:11px;">GrindBuddy KT Intelligence</p>
    </div>"""
    return _send(
        to_email, f"📢 KT Notification: {title}", html, email_type="KT_NOTIFICATION"
    )


def send_coauthor_invite(
    to_email: str, recipient_name: str, doc_title: str, doc_id: str, inviter_name: str
) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#4f46e5;">Co-author Invitation: "{doc_title}" ✍️</h2>
      <p>Hi <strong>{recipient_name}</strong>,</p>
      <p><strong>{inviter_name}</strong> has added you as a co-author on the document: <br/>
      <strong style="font-size:16px;">{doc_title}</strong></p>
      <p style="color:#475569;line-height:1.6;">
        As a co-author, you can collaborate on this document, update its content, and contribute to the collective intelligence of your team.
      </p>
      <div style="margin:24px 0;text-align:center;">
        <a href="{_frontend_url()}/kt/documents/{doc_id}"
           style="background:#4f46e5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
           View Document
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;">Login to the Knowledge Transfer portal to start collaborating.</p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;"/>
      <p style="text-align:center;color:#cbd5e1;font-size:11px;">GrindBuddy KT Collaboration Platform</p>
    </div>"""
    return _send(
        to_email,
        f"✍️ Co-author Invitation: {doc_title}",
        html,
        email_type="KT_COAUTHOR_INVITE",
    )


def send_doc_submitted(
    to_email: str, recipient_name: str, doc_title: str, doc_id: str
) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#4f46e5;">Document Submitted for Review 📝</h2>
      <p>Hi <strong>{recipient_name}</strong>,</p>
      <p>A new document has been submitted for your review: <br/>
      <strong style="font-size:16px;">{doc_title}</strong></p>
      <div style="margin:24px 0;text-align:center;">
        <a href="{_frontend_url()}/kt/documents/{doc_id}"
           style="background:#4f46e5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
           Review Document
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;">Please review the document and provide feedback or approval.</p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;"/>
      <p style="text-align:center;color:#cbd5e1;font-size:11px;">GrindBuddy KT Intelligence</p>
    </div>"""
    return _send(
        to_email,
        f"📝 Review Required: {doc_title}",
        html,
        email_type="KT_DOC_SUBMITTED",
    )


def send_doc_approved(to_email: str, recipient_name: str, doc_title: str) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #059669;border-radius:12px;">
      <h2 style="color:#059669;">Document Approved! 🎉</h2>
      <p>Hi <strong>{recipient_name}</strong>,</p>
      <p>Your document "<strong>{doc_title}</strong>" has been approved and is now being ingested into the knowledge base.</p>
      <p style="color:#475569;">It will soon be available for AI-powered queries and team collaboration.</p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;"/>
      <p style="text-align:center;color:#cbd5e1;font-size:11px;">GrindBuddy KT Intelligence</p>
    </div>"""
    return _send(
        to_email, f"🎉 Approved: {doc_title}", html, email_type="KT_DOC_APPROVED"
    )


def send_doc_rejected(
    to_email: str, recipient_name: str, doc_title: str, reason: str
) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #dc2626;border-radius:12px;">
      <h2 style="color:#dc2626;">Updates Requested ⚠️</h2>
      <p>Hi <strong>{recipient_name}</strong>,</p>
      <p>Your document "<strong>{doc_title}</strong>" requires some updates before it can be approved.</p>
      <div style="background:#fef2f2;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #dc2626;">
        <p style="margin:0;font-weight:bold;">Feedback:</p>
        <p style="margin:8px 0 0 0;color:#991b1b;">{reason}</p>
      </div>
      <p style="color:#475569;">Please address the feedback and re-submit the document for review.</p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;"/>
      <p style="text-align:center;color:#cbd5e1;font-size:11px;">GrindBuddy KT Intelligence</p>
    </div>"""
    return _send(
        to_email, f"⚠️ Action Required: {doc_title}", html, email_type="KT_DOC_REJECTED"
    )


def send_exam_invite_to_guest(
    to_email: str,
    exam_id: int,
    exam_title: str,
    signup_url: str,
    duration_minutes: int,
    passing_score: int,
    window_label: str | None = None,
    instructions: str | None = None,
) -> bool:
    """Send exam invitation email to an unregistered (guest) email address.
    Routes to a signup page that will grant access to the exam."""
    window_info = f"<p style='color:#475569;margin:8px 0;'><strong>Available:</strong> {window_label}</p>" if window_label else ""
    instructions_info = f"<p style='color:#475569;margin:8px 0;'><strong>Instructions:</strong> {instructions}</p>" if instructions else ""

    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#0ea5e9;">Exam Invitation 📋</h2>
      <p>You have been invited to take a proctored exam:</p>
      <div style="background:#f0f9ff;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #0ea5e9;">
        <p style="margin:0;font-weight:bold;font-size:16px;">{exam_title}</p>
        <p style="margin:8px 0 0 0;color:#0c4a6e;">Duration: {duration_minutes} minutes | Passing Score: {passing_score}%</p>
        {window_info}
        {instructions_info}
      </div>
      <p style="color:#475569;">To take this exam, please sign up or log in to GrindBuddy:</p>
      <div style="margin:24px 0;text-align:center;">
        <a href="{signup_url}"
           style="background:#0ea5e9;color:white;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
           Create Account & Take Exam
        </a>
      </div>
      <p style="color:#94a3b8;font-size:13px;">After signing up, you'll have access to this exam and our full learning platform.</p>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;"/>
      <p style="text-align:center;color:#cbd5e1;font-size:11px;">GrindBuddy Assessment Platform</p>
    </div>"""
    return _send(
        to_email,
        f"Exam Invitation: {exam_title}",
        html,
        email_type="EXAM_INVITE_GUEST",
    )


def send_exam_result_released(
    to_email: str,
    full_name: str,
    exam_title: str,
    exam_id: int,
    score: float | None,
    total: float | None,
    passing_score: int,
    verdict: str,
) -> bool:
    """Send exam result release notification email."""
    score_info = ""
    if score is not None and total is not None and total > 0:
        pct = (score / total) * 100
        score_info = f"<p style='margin:8px 0;'><strong>Your Score:</strong> {score:.1f} / {total:.1f} ({pct:.0f}%)</p>"

    verdict_badge = ""
    if verdict == "pass":
        verdict_badge = "<p style='background:#dcfce7;color:#166534;padding:12px;border-radius:6px;font-weight:bold;text-align:center;margin:16px 0;'>✓ PASSED</p>"
    elif verdict == "fail":
        verdict_badge = "<p style='background:#fee2e2;color:#991b1b;padding:12px;border-radius:6px;font-weight:bold;text-align:center;margin:16px 0;'>✗ NOT PASSED</p>"

    cert_info = ""
    if verdict == "pass":
        cert_info = "<p style='color:#059669;font-weight:bold;margin:16px 0;'>Your certificate is ready to download!</p>"

    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#1e40af;">Exam Results Released 📊</h2>
      <p>Hi <strong>{full_name}</strong>,</p>
      <p>Your results for <strong>{exam_title}</strong> are now available:</p>
      <div style="background:#f8fafc;padding:16px;border-radius:8px;margin:16px 0;">
        {score_info}
        <p style="margin:8px 0;'><strong>Passing Score Required:</strong> {passing_score}%</p>
      </div>
      {verdict_badge}
      {cert_info}
      <div style="margin:24px 0;text-align:center;">
        <a href="{_frontend_url()}/exam/{exam_id}"
           style="background:#1e40af;color:white;padding:12px 32px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
           View Results
        </a>
      </div>
      <hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;"/>
      <p style="text-align:center;color:#cbd5e1;font-size:11px;">GrindBuddy Assessment Platform</p>
    </div>"""
    return _send(
        to_email,
        f"Exam Results: {exam_title}",
        html,
        email_type="EXAM_RESULT_RELEASED",
    )
