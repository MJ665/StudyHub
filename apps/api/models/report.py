import datetime
from database import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship


class QuestionReport(Base):
    __tablename__ = "question_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    issue_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True), server_default="now()", nullable=False)

    question = relationship("Question", back_populates="reports")


class ContentReport(Base):
    """Generic moderation report for non-MCQ content (KT documents + coding
    questions). MCQ questions keep their dedicated ``question_reports`` table
    (already wired end-to-end); this mirrors its shape so the L&D moderation
    view can present all three content types uniformly.

    ``content_id`` is a string to hold both integer ids (coding questions) and
    UUID ids (KT documents).
    """

    __tablename__ = "content_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    # 'kt_document' | 'coding_question'
    content_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    content_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    issue_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Denormalized snapshot of the reported content's title so the moderation
    # view stays meaningful even if the content is later deleted.
    content_title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    resolved_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default="now()", nullable=False
    )
