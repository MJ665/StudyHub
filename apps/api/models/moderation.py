import datetime
from database import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint


class ContentModeration(Base):
    """Content quarantine/governance table for L&D governance and compliance."""

    __tablename__ = "content_moderation"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    content_type: Mapped[str] = mapped_column(String(30), index=True, nullable=False)
    # 'bank' | 'coding_question' | 'kt_document'
    content_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    # For banks/coding: numeric id as string; for KT: UUID as string
    status: Mapped[str] = mapped_column(String(20), default="quarantined", nullable=False)
    # 'quarantined' | 'active'
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    moderated_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    organization_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    super_organization_id: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )

    __table_args__ = (
        UniqueConstraint("content_type", "content_id", name="uq_content_moderation"),
    )
