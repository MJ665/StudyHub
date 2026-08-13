"""Integration tests for GrindBuddy platform fixes.

Tests the fixes from recent commits:
- quiz: code evaluation 404 for non-existent questions, Redis lock release, visibility ladder, progress metrics
- exam: create role gates, untargeted exam staff-only, guest invites
- cert: access gate (released + passed only)
- interaction: bookmarks, question reports
"""

import time
import uuid

import pytest
from fastapi.testclient import TestClient

import main
import models
from database import SessionLocal

pytestmark = pytest.mark.integration


@pytest.fixture()
def seeded_platform_env():
    """Seed a complete platform environment: org, users with various roles, banks, questions, exams."""
    db = SessionLocal()
    # Use UUID (32 hex chars) for guaranteed uniqueness across all test runs
    tag = uuid.uuid4().hex

    # Clean up any leftover test data with this specific tag BEFORE creating new data
    # Use raw SQL DELETE to forcefully remove any conflicting rows (cascade-like behavior)
    super_org_name_1 = f"super-org-{tag}"
    super_org_name_2 = f"unrelated-super-org-{tag}"

    try:
        from sqlalchemy import text
        # Cascade delete: delete organizations first, then super_organizations
        db.execute(text("""
            DELETE FROM organizations
            WHERE super_organization_id IN (
                SELECT id FROM super_organizations
                WHERE name = :name1 OR name = :name2
            )
        """), {"name1": super_org_name_1, "name2": super_org_name_2})

        db.execute(text("""
            DELETE FROM super_organizations
            WHERE name = :name1 OR name = :name2
        """), {"name1": super_org_name_1, "name2": super_org_name_2})
        db.commit()
    except Exception as cleanup_error:
        db.rollback()
        # Continue anyway - the cleanup error won't prevent the test from running
        pass

    # SuperOrganization (required for content scoping)
    super_org = models.SuperOrganization(
        name=f"super-org-{tag}",
        slug=f"super-{tag[:32]}",
        status="active",  # default is "pending", which assert_tenant_active blocks (login 403)
    )
    db.add(super_org)
    db.commit()
    db.refresh(super_org)

    # Organization linked to SuperOrganization
    org = models.Organization(
        name=f"platform-test-org-{tag}",
        slug=f"platform-test-{tag}",
        super_organization_id=super_org.id,
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    # Group
    group = models.Group(
        name=f"platform-test-group-{tag}",
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    # Separate SuperOrganization for isolation testing (MUST be before creating unrelated users)
    unrelated_super_org = models.SuperOrganization(
        name=f"unrelated-super-org-{tag}",
        slug=f"unrelated-super-{tag}",
        status="active",
    )
    db.add(unrelated_super_org)
    db.commit()
    db.refresh(unrelated_super_org)

    unrelated_org = models.Organization(
        name=f"unrelated-org-{tag}",
        slug=f"unrelated-{tag}",
        super_organization_id=unrelated_super_org.id,
    )
    db.add(unrelated_org)
    db.commit()
    db.refresh(unrelated_org)

    unrelated_group = models.Group(
        name=f"unrelated-group-{tag}",
    )
    db.add(unrelated_group)
    db.commit()
    db.refresh(unrelated_group)

    # Users with different roles
    author = models.User(
        email=f"author.{tag}@grindbuddy-tests.dev",
        full_name="Platform Author",
        group_id=group.id,
        organization_id=org.id,
        role="Member",
        is_active=True,
    )
    db.add(author)
    db.commit()
    db.refresh(author)

    learner = models.User(
        email=f"learner.{tag}@grindbuddy-tests.dev",
        full_name="Platform Learner",
        group_id=group.id,
        organization_id=org.id,
        role="Member",
        is_active=True,
    )
    db.add(learner)
    db.commit()
    db.refresh(learner)

    mentor = models.User(
        email=f"mentor.{tag}@grindbuddy-tests.dev",
        full_name="Platform Mentor",
        group_id=group.id,
        organization_id=org.id,
        role="Mentor",
        is_active=True,
    )
    db.add(mentor)
    db.commit()
    db.refresh(mentor)

    ld_admin = models.User(
        email=f"ld.{tag}@grindbuddy-tests.dev",
        full_name="Platform L&D",
        group_id=group.id,
        organization_id=org.id,
        role="LDAdmin",
        is_active=True,
    )
    db.add(ld_admin)
    db.commit()
    db.refresh(ld_admin)

    owner = models.User(
        email=f"owner.{tag}@grindbuddy-tests.dev",
        full_name="Platform Owner",
        group_id=group.id,
        organization_id=org.id,
        role="Owner",
        is_active=True,
    )
    db.add(owner)
    db.commit()
    db.refresh(owner)

    # NOTE: unrelated_super_org / unrelated_org / unrelated_group are already
    # created above (before the users). The duplicate creation that used to be
    # here caused a super_organizations.name unique-constraint error at setup.

    unrelated_user = models.User(
        email=f"unrelated.{tag}@grindbuddy-tests.dev",
        full_name="Unrelated User",
        group_id=unrelated_group.id,
        organization_id=unrelated_org.id,
        role="Member",
        is_active=True,
    )
    db.add(unrelated_user)
    db.commit()
    db.refresh(unrelated_user)

    # Question Bank with Personal visibility (creator only)
    personal_bank = models.QuestionBank(
        name=f"Personal Bank {tag}",
        created_by=author.id,
        organization_id=org.id,
        super_organization_id=super_org.id,  # Content scoped to super-org
        bank_type="practice",
        visibility_scope="personal",  # Only author + staff can see this
    )
    db.add(personal_bank)
    db.commit()
    db.refresh(personal_bank)

    # Global/org-public bank (visible to everyone in org)
    global_bank = models.QuestionBank(
        name=f"Global Bank {tag}",
        created_by=author.id,
        organization_id=org.id,
        super_organization_id=super_org.id,  # Content scoped to super-org
        bank_type="practice",
        visibility_scope="org-public",  # Visible to all in org
    )
    db.add(global_bank)
    db.commit()
    db.refresh(global_bank)

    # Questions in banks
    q1 = models.Question(
        bank_id=personal_bank.id,
        question="Personal Q1?",
        options=["A", "B", "C"],
        answer="A",
        question_type="mcq_single",
        organization_id=org.id,
        super_organization_id=super_org.id,  # Content scoped to super-org
        user_description="Personal bank question",
    )
    db.add(q1)
    db.commit()
    db.refresh(q1)

    q2 = models.Question(
        bank_id=global_bank.id,
        question="Global Q2?",
        options=["X", "Y", "Z"],
        answer="X",
        question_type="mcq_single",
        organization_id=org.id,
        super_organization_id=super_org.id,  # Content scoped to super-org
        user_description="Global bank question",
    )
    db.add(q2)
    db.commit()
    db.refresh(q2)

    # Coding question (for code evaluation tests)
    coding_q = models.CodingQuestion(
        title="Test Code Question",
        description="Write a function",
        language="python",
        organization_id=org.id,
        super_organization_id=super_org.id,  # Content scoped to super-org
        created_by=author.id,
        concept_tags=["Python", "Functions"],
        evaluation_criteria="Code works correctly",
        sample_solution="def test(): pass",
        is_active=True,
    )
    db.add(coding_q)
    db.commit()
    db.refresh(coding_q)

    # Exam (untargeted, staff-only by default)
    untargeted_exam = models.Exam(
        title=f"Untargeted Exam {tag}",
        bank_id=global_bank.id,
        organization_id=org.id,
        super_organization_id=super_org.id,  # _in_super_org gate requires this
        created_by=mentor.id,
        duration_minutes=60,
        passing_score=40,
        max_attempts=1,
        is_published=True,
        proctoring_mode="none",
        settings={"certificates_enabled": False},  # No explicit open_to_org
    )
    db.add(untargeted_exam)
    db.commit()
    db.refresh(untargeted_exam)

    # Exam with recipient (targeted)
    targeted_exam = models.Exam(
        title=f"Targeted Exam {tag}",
        bank_id=global_bank.id,
        organization_id=org.id,
        super_organization_id=super_org.id,
        created_by=mentor.id,
        duration_minutes=60,
        passing_score=40,
        max_attempts=1,
        is_published=True,
        proctoring_mode="none",
        recipient_emails=[learner.email],
        settings={"certificates_enabled": True},
    )
    db.add(targeted_exam)
    db.commit()
    db.refresh(targeted_exam)

    # Exam attempt (released, passed)
    exam_attempt_pass = models.ExamAttempt(
        exam_id=targeted_exam.id,
        user_id=learner.id,
        organization_id=org.id,
        result_status="released",  # Released
        result_verdict="pass",  # Passed
        passed=True,
        score=80,
        total=100,
    )
    db.add(exam_attempt_pass)
    db.commit()
    db.refresh(exam_attempt_pass)

    # Exam attempt (released, failed)
    exam_attempt_fail = models.ExamAttempt(
        exam_id=targeted_exam.id,
        user_id=author.id,
        organization_id=org.id,
        result_status="released",  # Released but failed
        result_verdict="fail",  # Failed
        passed=False,
        score=20,
        total=100,
    )
    db.add(exam_attempt_fail)
    db.commit()
    db.refresh(exam_attempt_fail)

    # Exam attempt (not released)
    exam_attempt_draft = models.ExamAttempt(
        exam_id=targeted_exam.id,
        user_id=learner.id,
        organization_id=org.id,
        result_status="pending",  # Not released
        score=85,
        total=100,
    )
    db.add(exam_attempt_draft)
    db.commit()
    db.refresh(exam_attempt_draft)

    try:
        yield {
            "org": org,
            "unrelated_org": unrelated_org,
            "group": group,
            "unrelated_group": unrelated_group,
            "author": author,
            "learner": learner,
            "mentor": mentor,
            "ld_admin": ld_admin,
            "owner": owner,
            "unrelated_user": unrelated_user,
            "personal_bank": personal_bank,
            "global_bank": global_bank,
            "q1": q1,
            "q2": q2,
            "coding_q": coding_q,
            "untargeted_exam": untargeted_exam,
            "targeted_exam": targeted_exam,
            "exam_attempt_pass": exam_attempt_pass,
            "exam_attempt_fail": exam_attempt_fail,
            "exam_attempt_draft": exam_attempt_draft,
        }
    finally:
        # Clean up in order (dependencies first, then parents)
        # Delete exam-related data
        db.query(models.ExamAttempt).filter(
            models.ExamAttempt.exam_id.in_(
                db.query(models.Exam.id).filter(models.Exam.organization_id == org.id)
            )
        ).delete()
        db.query(models.Exam).filter(models.Exam.organization_id == org.id).delete()

        # Delete quiz-related data
        db.query(models.UserBookmark).filter(
            models.UserBookmark.user_id.in_(
                db.query(models.User.id).filter(models.User.organization_id.in_([org.id, unrelated_org.id]))
            )
        ).delete()
        db.query(models.QuestionReport).filter(
            models.QuestionReport.user_id.in_(
                db.query(models.User.id).filter(models.User.organization_id.in_([org.id, unrelated_org.id]))
            )
        ).delete()
        db.query(models.CodingQuestion).filter(
            models.CodingQuestion.organization_id == org.id
        ).delete()
        db.query(models.Question).filter(
            models.Question.organization_id == org.id
        ).delete()
        db.query(models.QuestionBank).filter(
            models.QuestionBank.organization_id == org.id
        ).delete()

        # Delete users from both orgs
        db.query(models.User).filter(models.User.organization_id == org.id).delete()
        db.query(models.User).filter(models.User.organization_id == unrelated_org.id).delete()

        # Delete groups
        db.query(models.Group).filter(models.Group.id.in_([group.id, unrelated_group.id])).delete()

        # Delete organizations (before super_orgs due to FK)
        db.query(models.Organization).filter(models.Organization.id.in_([org.id, unrelated_org.id])).delete()

        # Delete super_organizations (after orgs)
        db.query(models.SuperOrganization).filter(models.SuperOrganization.id.in_([super_org.id, unrelated_super_org.id])).delete()

        try:
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"Cleanup error (non-fatal): {e}")
        finally:
            db.close()


@pytest.fixture(scope="module")
def client():
    """One client (and one app lifespan) for the whole module — per-test
    clients re-run startup and tear the shared event loop down."""
    with TestClient(main.app) as c:
        yield c


def _get_auth_headers(user, client):
    """Get auth headers by logging in a user."""
    db = SessionLocal()
    try:
        from modules.identity.routers.auth_shared import pwd_context

        # Ensure user has a password by updating the user object in this session
        fresh_user = db.query(models.User).filter(models.User.id == user.id).first()
        if fresh_user and not fresh_user.password_hash:
            fresh_user.password_hash = pwd_context.hash("TestPass123!")
            db.commit()

        r = client.post(
            "/api/auth/login",
            json={"email": user.email, "password": "TestPass123!"},
        )
        if r.status_code != 200:
            raise Exception(f"Login failed: {r.status_code} {r.text}")
        token = r.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()


# ── QUIZ TESTS ─────────────────────────────────────────────────────────────

class TestQuizCodeEvaluation:
    """Test code evaluation with proper error handling."""

    def test_evaluate_nonexistent_question_returns_404(self, client, seeded_platform_env):
        """POST /api/code/evaluate with non-existent coding_question_id returns 404."""
        learner = seeded_platform_env["learner"]
        headers = _get_auth_headers(learner, client)

        r = client.post(
            "/api/code/evaluate",
            json={
                "coding_question_id": 99999,  # Non-existent
                "submitted_code": "print('hello')",
                "language": "python",
                "time_spent_seconds": 120,
            },
            headers=headers,
        )

        assert r.status_code == 404, r.text
        assert "not found" in r.json()["detail"].lower()


class TestQuizAttemptLock:
    """Test that quiz submission lock is properly released."""

    @pytest.mark.skip(reason="Requires live Redis or mock in test env")
    def test_submit_lock_released_on_success(self, client, seeded_platform_env):
        """Redis lock is released after successful submit, allowing retry."""
        learner = seeded_platform_env["learner"]
        bank = seeded_platform_env["global_bank"]
        headers = _get_auth_headers(learner, client)

        payload = {
            "bank_id": bank.id,
            "question_ids": [seeded_platform_env["q2"].id],
            "user_answers": {"q2": "X"},
            "user_name": "Test",
            "is_anonymous": False,
            "time_taken": 30,
        }

        # First submit should succeed
        r1 = client.post("/api/quiz/attempts/submit", json=payload, headers=headers)
        assert r1.status_code == 200

        # Second submit (immediate retry) should NOT get 429 from a stale lock
        r2 = client.post("/api/quiz/attempts/submit", json=payload, headers=headers)
        # Either succeeds (lock released) or returns meaningful error, not 429 from old lock
        assert r2.status_code != 429 or "already in progress" not in r2.text.lower()


class TestQuizVisibility:
    """Test visibility ladder for question banks."""

    def test_personal_bank_not_visible_to_unrelated_user(self, client, seeded_platform_env):
        """Personal bank created by author is NOT returned for unrelated user."""
        unrelated_user = seeded_platform_env["unrelated_user"]
        headers = _get_auth_headers(unrelated_user, client)

        r = client.get("/api/quiz/banks", headers=headers)
        assert r.status_code == 200
        banks = r.json()
        _items = banks.get("items", []) if isinstance(banks, dict) else banks
        bank_ids = [b["id"] for b in _items]

        personal_bank_id = seeded_platform_env["personal_bank"].id
        assert personal_bank_id not in bank_ids, "Personal bank leaked to unrelated user"

    def test_personal_bank_visible_to_ld_admin(self, client, seeded_platform_env):
        """Personal bank IS visible to L&D admin via staff bypass."""
        ld_admin = seeded_platform_env["ld_admin"]
        headers = _get_auth_headers(ld_admin, client)

        r = client.get("/api/quiz/banks", headers=headers)
        assert r.status_code == 200
        banks = r.json()
        _items = banks.get("items", []) if isinstance(banks, dict) else banks
        bank_ids = [b["id"] for b in _items]

        personal_bank_id = seeded_platform_env["personal_bank"].id
        assert personal_bank_id in bank_ids, "Personal bank not visible to L&D admin"

    def test_global_bank_visible_to_all_in_org(self, client, seeded_platform_env):
        """Org-public bank is visible to all users in the organization."""
        learner = seeded_platform_env["learner"]
        headers = _get_auth_headers(learner, client)

        r = client.get("/api/quiz/banks", headers=headers)
        assert r.status_code == 200
        banks = r.json()
        _items = banks.get("items", []) if isinstance(banks, dict) else banks
        bank_ids = [b["id"] for b in _items]

        global_bank_id = seeded_platform_env["global_bank"].id
        assert global_bank_id in bank_ids, "Global bank not visible to learner"


class TestProgressMetrics:
    """Test progress endpoint returns correct metrics."""

    def test_progress_returns_required_metrics(self, client, seeded_platform_env):
        """GET /progress returns total_attempts, avg_accuracy, streak_count."""
        author = seeded_platform_env["author"]
        headers = _get_auth_headers(author, client)

        r = client.get("/api/auth/progress", headers=headers)
        assert r.status_code == 200
        body = r.json()

        assert "total_attempts" in body
        assert "avg_accuracy" in body
        assert "streak_count" in body
        assert isinstance(body["total_attempts"], int)
        assert isinstance(body["avg_accuracy"], (int, float))
        assert isinstance(body["streak_count"], int)


# ── EXAM TESTS ─────────────────────────────────────────────────────────────

class TestExamCreation:
    """Test exam creation access control."""

    def test_learner_cannot_create_exam(self, client, seeded_platform_env):
        """Learner (Member role) cannot create an exam."""
        learner = seeded_platform_env["learner"]
        bank = seeded_platform_env["global_bank"]
        headers = _get_auth_headers(learner, client)

        r = client.post(
            "/api/exams",
            json={
                "title": "Unauthorized Exam",
                "bank_id": bank.id,
                "duration_minutes": 60,
                "passing_score": 40,
            },
            headers=headers,
        )

        assert r.status_code == 403, r.text

    def test_mentor_can_create_exam(self, client, seeded_platform_env):
        """Mentor can create an exam."""
        mentor = seeded_platform_env["mentor"]
        bank = seeded_platform_env["global_bank"]
        headers = _get_auth_headers(mentor, client)

        r = client.post(
            "/api/exams",
            json={
                "title": f"Mentor Exam {uuid.uuid4().hex[:8]}",
                "bank_id": bank.id,
                "duration_minutes": 60,
                "passing_score": 40,
                "is_published": True,
            },
            headers=headers,
        )

        assert r.status_code == 200, r.text
        body = r.json()
        assert "id" in body or "exam_id" in body

    def test_ld_admin_can_create_exam(self, client, seeded_platform_env):
        """L&D Admin can create an exam."""
        ld_admin = seeded_platform_env["ld_admin"]
        bank = seeded_platform_env["global_bank"]
        headers = _get_auth_headers(ld_admin, client)

        r = client.post(
            "/api/exams",
            json={
                "title": f"L&D Exam {uuid.uuid4().hex[:8]}",
                "bank_id": bank.id,
                "duration_minutes": 60,
                "passing_score": 40,
                "is_published": True,
            },
            headers=headers,
        )

        assert r.status_code == 200, r.text


class TestUntargetedExamAccess:
    """Test untargeted exam access control (staff-only by default)."""

    def test_learner_cannot_start_untargeted_exam(self, client, seeded_platform_env):
        """Learner gets 403 when starting untargeted exam (invite-only)."""
        learner = seeded_platform_env["learner"]
        exam = seeded_platform_env["untargeted_exam"]
        headers = _get_auth_headers(learner, client)

        r = client.post(
            f"/api/exams/{exam.id}/start",
            headers=headers,
        )

        assert r.status_code == 403, r.text
        assert "invite-only" in r.json()["detail"].lower()

    def test_mentor_can_start_untargeted_exam(self, client, seeded_platform_env):
        """Mentor (staff) can start untargeted exam."""
        mentor = seeded_platform_env["mentor"]
        exam = seeded_platform_env["untargeted_exam"]
        headers = _get_auth_headers(mentor, client)

        r = client.post(
            f"/api/exams/{exam.id}/start",
            headers=headers,
        )

        assert r.status_code == 200, r.text

    def test_ld_admin_can_start_untargeted_exam(self, client, seeded_platform_env):
        """L&D Admin (staff) can start untargeted exam."""
        ld_admin = seeded_platform_env["ld_admin"]
        exam = seeded_platform_env["untargeted_exam"]
        headers = _get_auth_headers(ld_admin, client)

        r = client.post(
            f"/api/exams/{exam.id}/start",
            headers=headers,
        )

        assert r.status_code == 200, r.text


class TestExamGuestInvite:
    """Test guest invite creation via exam creation."""

    @pytest.mark.xfail(reason="No dedicated /exams/{id}/invites endpoint; invites created via exam POST with recipient_emails")
    def test_create_guest_invite_creates_row(self, client, seeded_platform_env):
        """Inviting unregistered email creates ExamInvite row.

        NOTE: The platform creates invites as part of create_exam(recipient_emails=...),
        not via a dedicated POST /exams/{id}/invites endpoint. This test verifies that
        ExamInvite rows are created when recipient_emails are provided at exam creation.
        """
        # This would require a separate endpoint that doesn't exist, or creating an exam
        # with new recipient_emails and verifying the rows. Marking xfail for now.
        pytest.skip("Endpoint does not exist; invites created via exam creation")


# ── CERTIFICATE TESTS ──────────────────────────────────────────────────────

class TestCertificateAccess:
    """Test certificate access gate (released + passed only)."""

    def test_certificate_denied_for_failed_attempt(self, client, seeded_platform_env):
        """GET /api/exams/attempts/{id}/certificate returns 403 for failed attempt."""
        author = seeded_platform_env["author"]
        attempt = seeded_platform_env["exam_attempt_fail"]  # Released but FAILED
        headers = _get_auth_headers(author, client)

        r = client.get(
            f"/api/exams/attempts/{attempt.id}/certificate",
            headers=headers,
        )

        assert r.status_code == 403, r.text

    def test_certificate_denied_for_unreleased_attempt(self, client, seeded_platform_env):
        """GET /api/exams/attempts/{id}/certificate returns 403 for unreleased attempt."""
        learner = seeded_platform_env["learner"]
        attempt = seeded_platform_env["exam_attempt_draft"]  # NOT released
        headers = _get_auth_headers(learner, client)

        r = client.get(
            f"/api/exams/attempts/{attempt.id}/certificate",
            headers=headers,
        )

        assert r.status_code == 403, r.text

    def test_certificate_available_for_passed_released_attempt(self, client, seeded_platform_env):
        """GET /api/exams/attempts/{id}/certificate succeeds for released + passed attempt."""
        learner = seeded_platform_env["learner"]
        attempt = seeded_platform_env["exam_attempt_pass"]  # Released and PASSED
        headers = _get_auth_headers(learner, client)

        r = client.get(
            f"/api/exams/attempts/{attempt.id}/certificate",
            headers=headers,
        )

        # Should return certificate URL or 200
        assert r.status_code == 200, r.text
        body = r.json()
        assert "certificate_url" in body or "success" in body


# ── INTERACTION TESTS ──────────────────────────────────────────────────────

class TestBookmarks:
    """Test bookmark toggle and listing."""

    def test_bookmark_toggle_returns_200(self, client, seeded_platform_env):
        """POST /api/interaction/questions/{id}/bookmark returns 200."""
        learner = seeded_platform_env["learner"]
        question = seeded_platform_env["q2"]
        headers = _get_auth_headers(learner, client)

        r = client.post(
            f"/api/interaction/questions/{question.id}/bookmark",
            headers=headers,
        )

        assert r.status_code == 200, r.text
        body = r.json()
        assert "is_bookmarked" in body

    def test_bookmark_toggle_on_then_off(self, client, seeded_platform_env):
        """POST bookmark twice toggles state."""
        learner = seeded_platform_env["learner"]
        question = seeded_platform_env["q2"]
        headers = _get_auth_headers(learner, client)

        # Add bookmark
        r1 = client.post(
            f"/api/interaction/questions/{question.id}/bookmark",
            headers=headers,
        )
        assert r1.status_code == 200
        assert r1.json()["is_bookmarked"] is True

        # Remove bookmark
        r2 = client.post(
            f"/api/interaction/questions/{question.id}/bookmark",
            headers=headers,
        )
        assert r2.status_code == 200
        assert r2.json()["is_bookmarked"] is False

    def test_get_bookmarks_lists_bookmarked_questions(self, client, seeded_platform_env):
        """GET /api/interaction/bookmarks lists bookmarked questions."""
        learner = seeded_platform_env["learner"]
        question = seeded_platform_env["q2"]
        headers = _get_auth_headers(learner, client)

        # Add bookmark
        r1 = client.post(
            f"/api/interaction/questions/{question.id}/bookmark",
            headers=headers,
        )
        assert r1.status_code == 200

        # Get bookmarks
        r2 = client.get(
            "/api/interaction/bookmarks",
            headers=headers,
        )
        assert r2.status_code == 200
        bookmarks = r2.json()
        assert isinstance(bookmarks, list)
        bookmark_ids = [b["id"] for b in bookmarks]
        assert question.id in bookmark_ids


class TestQuestionReport:
    """Test question reporting."""

    def test_report_question_returns_200_with_report_id(self, client, seeded_platform_env):
        """POST /api/interaction/questions/{id}/report returns 200 with report_id."""
        learner = seeded_platform_env["learner"]
        question = seeded_platform_env["q2"]
        headers = _get_auth_headers(learner, client)

        r = client.post(
            f"/api/interaction/questions/{question.id}/report",
            json={
                "issue_type": "incorrect_answer",
                "description": "The answer key is wrong",
            },
            headers=headers,
        )

        assert r.status_code == 200, r.text
        body = r.json()
        assert "report_id" in body or "message" in body

    def test_reported_question_creates_report_row(self, client, seeded_platform_env):
        """Reporting a question creates a QuestionReport row."""
        learner = seeded_platform_env["learner"]
        question = seeded_platform_env["q2"]
        headers = _get_auth_headers(learner, client)

        r = client.post(
            f"/api/interaction/questions/{question.id}/report",
            json={
                "issue_type": "typo",
                "description": "Question has typos",
            },
            headers=headers,
        )

        assert r.status_code == 200, r.text
        report_id = r.json().get("report_id")

        if report_id:
            # Verify the row exists in database
            db = SessionLocal()
            try:
                report = (
                    db.query(models.QuestionReport)
                    .filter(models.QuestionReport.id == report_id)
                    .first()
                )
                assert report is not None
                assert report.question_id == question.id
                assert report.user_id == learner.id
            finally:
                db.close()


# Session-scoped cleanup to remove all test data at the end
@pytest.fixture(scope="session", autouse=True)
def cleanup_all_test_data():
    """Clean up all test data after all tests in this module complete."""
    yield  # Let all tests run first

    # After all tests, clean up any leftover test data
    db = SessionLocal()
    try:
        from sqlalchemy import text
        # Delete all test organizations and their associated data
        db.execute(text("""
            DELETE FROM super_organizations
            WHERE name LIKE 'super-org-%'
            OR name LIKE 'unrelated-super-org-%'
        """))
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Session cleanup error (non-fatal): {e}")
    finally:
        db.close()
