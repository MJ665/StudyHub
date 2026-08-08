"""Shared certificate PDF renderer (bank completions + exam results).

One professional, parameterized template used by both the question-bank
certificate (`modules/assessment/routers/attempts.py`) and the exam certificate
(`routers/exam.py`), so the two never drift. Rendering is pure/offline — the
caller resolves the org signatory + signature image bytes and passes them in.

Reuses ReportLab (already a dependency). Layout: border, logo, title, recipient,
achievement line, assessment title, score/%, pass/fail badge, org co-brand line,
verification code, and the org signature block (image + signatory name/title),
with graceful fallbacks when a signature is missing.
"""
from __future__ import annotations

import hashlib
import hmac
import io
import os
from datetime import date

logger = __import__("logging").getLogger("certificate_service")

_LOGO_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "web-next", "public", "images", "logo.png"
)


def verification_code(kind: str, entity_id: int) -> str:
    """Deterministic, tamper-evident public verification code for a certificate
    (e.g. "SB-EXAM-1A2B3C4D"). Derived from SECRET_KEY so it can be re-checked
    without storing anything."""
    from auth_utils import SECRET_KEY

    secret = (SECRET_KEY or "dev-secret").encode()
    digest = hmac.new(secret, f"cert:{kind}:{entity_id}".encode(), hashlib.sha256).hexdigest()
    return f"SB-{kind.upper()}-{digest[:8].upper()}"


def render_certificate_pdf(
    *,
    recipient_name: str,
    title: str,
    score: float | int | None,
    total: float | int | None,
    pct: float | None,
    passed: bool | None,
    verification_id: str,
    kind_label: str = "Completion",           # "Completion" | "Achievement"
    achievement_line: str = "has successfully completed the assessment",
    org_brand: str = "StudyBuddy",
    signatory_name: str | None = None,
    signatory_title: str | None = None,
    signature_png_bytes: bytes | None = None,
    issued_on: date | None = None,
) -> bytes:
    """Render a certificate to PDF bytes. Never raises for cosmetic/asset issues."""
    from reportlab.lib.pagesizes import landscape, letter
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(letter))
    width, height = landscape(letter)

    # Border
    c.setStrokeColorRGB(0.1, 0.1, 0.4)
    c.setLineWidth(4)
    c.rect(20, 20, width - 40, height - 40)

    # Logo
    if os.path.exists(_LOGO_PATH):
        try:
            c.drawImage(
                _LOGO_PATH, width / 2 - 50, height - 120, width=100, height=100,
                preserveAspectRatio=True, mask="auto",
            )
        except Exception:  # noqa: BLE001
            pass

    # Co-brand line
    c.setFont("Helvetica-Bold", 13)
    c.setFillColorRGB(0.1, 0.1, 0.4)
    c.drawCentredString(width / 2, height - 130, f"{org_brand}  ×  StudyBuddy")
    c.setFillColorRGB(0, 0, 0)

    # Title
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(width / 2, height - 165, f"Certificate of {kind_label}")

    c.setFont("Helvetica", 20)
    c.drawCentredString(width / 2, height - 220, "This is to certify that")

    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width / 2, height - 270, recipient_name or "Participant")

    c.setFont("Helvetica", 20)
    c.drawCentredString(width / 2, height - 315, achievement_line)

    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2, height - 360, title or "Assessment")

    # Score line
    if score is not None and total:
        _pct = pct if pct is not None else (float(score) / float(total) * 100 if total else 0)
        c.setFont("Helvetica", 16)
        c.drawCentredString(
            width / 2, height - 405, f"with a score of {score}/{total} ({_pct:.1f}%)"
        )

    # Pass/Fail badge (only when a verdict is known — bank completions may omit)
    if passed is not None:
        badge = "PASSED" if passed else "NOT PASSED"
        if passed:
            c.setFillColorRGB(0.13, 0.55, 0.33)
        else:
            c.setFillColorRGB(0.7, 0.15, 0.15)
        c.setFont("Helvetica-Bold", 18)
        c.drawCentredString(width / 2, height - 440, badge)
        c.setFillColorRGB(0, 0, 0)

    # Footer: date + verification (left), signature block (right)
    issued = (issued_on or date.today()).strftime("%B %d, %Y")
    c.setFont("Helvetica", 11)
    c.drawString(70, 70, f"Issued: {issued}")
    c.drawString(70, 55, f"Verification ID: {verification_id}")

    # Signature block (right)
    sig_cx = width - 175
    if signature_png_bytes:
        try:
            c.drawImage(
                ImageReader(io.BytesIO(signature_png_bytes)),
                sig_cx - 75, 80, width=150, height=45,
                preserveAspectRatio=True, mask="auto",
            )
        except Exception:  # noqa: BLE001
            pass
    c.line(width - 250, 70, width - 100, 70)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(sig_cx, 55, signatory_name or "Authorized Signatory")
    if signatory_title:
        c.setFont("Helvetica", 9)
        c.drawCentredString(sig_cx, 42, signatory_title)

    c.setFont("Helvetica-Oblique", 10)
    c.setFillColorRGB(0.4, 0.4, 0.4)
    c.drawCentredString(width / 2, 30, "Powered by StudyBuddy")
    c.setFillColorRGB(0, 0, 0)

    c.showPage()
    c.save()
    pdf = buffer.getvalue()
    buffer.close()
    return pdf


def resolve_signatory(db, super_org_id: int | None):
    """Return (signatory_name, signatory_title, signature_png_bytes|None) for a
    super-org from OrgBrandingSettings. Never raises — missing/unfetchable
    signature degrades to (None, None, None)."""
    import models

    if super_org_id is None:
        return (None, None, None)
    row = (
        db.query(models.OrgBrandingSettings)
        .filter(models.OrgBrandingSettings.super_organization_id == super_org_id)
        .first()
    )
    if not row:
        return (None, None, None)
    sig_bytes = None
    if row.signature_s3_key:
        try:
            from services import s3_service

            sig_bytes = s3_service.fetch_object_bytes(row.signature_s3_key)
        except Exception as e:  # noqa: BLE001
            logger.warning("signature fetch failed for super_org %s: %s", super_org_id, e)
    return (row.signatory_name, row.signatory_title, sig_bytes)
