"""add matches + match_participants (Find Party)

Tabele pentru functia "meciuri deschise": un Match e legat 1:1 de o rezervare,
iar MatchParticipant tine cererile de alaturare (cu aprobare de la organizator).

Revision ID: 0004_matches
Revises: 0003_recformat
Create Date: 2026-06-16
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0004_matches"
down_revision = "0003_recformat"
branch_labels = None
depends_on = None


def _enum(name: str, *values: str) -> postgresql.ENUM:
    # create_type=False -> nu lasa SQLAlchemy sa-l creeze automat la create_table()
    return postgresql.ENUM(*values, name=name, create_type=False)


def upgrade() -> None:
    # ── Tipuri ENUM ──────────────────────────────────────────────────────────────
    op.execute("CREATE TYPE match_status AS ENUM ('open', 'full', 'cancelled', 'completed')")
    op.execute("CREATE TYPE match_skill_level AS ENUM ('any', 'beginner', 'intermediate', 'advanced')")
    op.execute("CREATE TYPE participant_status AS ENUM ('requested', 'approved', 'rejected', 'left')")

    # ── matches ──────────────────────────────────────────────────────────────────
    op.create_table(
        "matches",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organizer_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("total_spots", sa.Integer(), nullable=False),
        sa.Column("skill_level", _enum("match_skill_level", "any", "beginner", "intermediate", "advanced"),
                  nullable=False, server_default=sa.text("'any'")),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("price_per_player", sa.Numeric(10, 2), nullable=True),
        sa.Column("status", _enum("match_status", "open", "full", "cancelled", "completed"),
                  nullable=False, server_default=sa.text("'open'")),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.CheckConstraint("total_spots BETWEEN 2 AND 30", name="chk_match_spots"),
        sa.CheckConstraint("price_per_player IS NULL OR price_per_player >= 0", name="chk_match_price"),
        sa.UniqueConstraint("booking_id", name="uq_match_booking"),
    )
    op.create_index("idx_matches_booking", "matches", ["booking_id"])
    op.create_index("idx_matches_organizer", "matches", ["organizer_id"])
    op.create_index("idx_matches_status", "matches", ["status"])

    # ── match_participants ─────────────────────────────────────────────────────────
    op.create_table(
        "match_participants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True,
                  server_default=sa.text("gen_random_uuid()")),
        sa.Column("match_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("matches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", _enum("participant_status", "requested", "approved", "rejected", "left"),
                  nullable=False, server_default=sa.text("'requested'")),
        sa.Column("created_at", postgresql.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), nullable=False,
                  server_default=sa.text("NOW()")),
        sa.UniqueConstraint("match_id", "user_id", name="uq_match_participant"),
    )
    op.create_index("idx_match_participants_match", "match_participants", ["match_id"])
    op.create_index("idx_match_participants_user", "match_participants", ["user_id"])
    op.create_index("idx_match_participants_status", "match_participants", ["status"])


def downgrade() -> None:
    op.drop_table("match_participants")
    op.drop_table("matches")
    op.execute("DROP TYPE participant_status")
    op.execute("DROP TYPE match_skill_level")
    op.execute("DROP TYPE match_status")
