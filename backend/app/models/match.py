"""
Modele pentru functia "Find Party" (meciuri deschise).

Un Match "traieste" pe o rezervare existenta (Booking) — organizatorul are deja
terenul rezervat si deschide meciul ca sa caute jucatori. MatchParticipant tine
evidenta cererilor de alaturare; organizatorul le aproba/respinge.
"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import (
    Text, Integer, Numeric, CheckConstraint, UniqueConstraint,
    Enum as SAEnum, text, ForeignKey, Uuid,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.enums import MatchStatus, MatchSkillLevel, ParticipantStatus


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # 1:1 cu o rezervare. CASCADE: daca rezervarea dispare, dispare si meciul.
    booking_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    organizer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Numarul TOTAL de jucatori (ex: 10 = 5v5). Organizatorul ocupa mereu un loc.
    total_spots: Mapped[int] = mapped_column(Integer, nullable=False)

    skill_level: Mapped[MatchSkillLevel] = mapped_column(
        SAEnum(MatchSkillLevel, name="match_skill_level", create_type=False, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        server_default=text("'any'"),
    )

    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Cost informativ per jucator (impartirea banilor se face offline intre ei).
    price_per_player: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    status: Mapped[MatchStatus] = mapped_column(
        SAEnum(MatchStatus, name="match_status", create_type=False, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        server_default=text("'open'"),
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("NOW()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("NOW()")
    )

    __table_args__ = (
        CheckConstraint("total_spots BETWEEN 2 AND 30", name="chk_match_spots"),
        CheckConstraint("price_per_player IS NULL OR price_per_player >= 0", name="chk_match_price"),
    )

    # Relationships
    booking: Mapped["Booking"] = relationship("Booking")
    organizer: Mapped["User"] = relationship("User", foreign_keys=[organizer_id])
    participants: Mapped[List["MatchParticipant"]] = relationship(
        "MatchParticipant", back_populates="match", cascade="all, delete-orphan"
    )


class MatchParticipant(Base):
    __tablename__ = "match_participants"

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)

    match_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[ParticipantStatus] = mapped_column(
        SAEnum(ParticipantStatus, name="participant_status", create_type=False, values_callable=lambda e: [v.value for v in e]),
        nullable=False,
        server_default=text("'requested'"),
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("NOW()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("NOW()")
    )

    __table_args__ = (
        # Un user are un singur rand per meci (re-cererea reactiveaza randul existent).
        UniqueConstraint("match_id", "user_id", name="uq_match_participant"),
    )

    # Relationships
    match: Mapped["Match"] = relationship("Match", back_populates="participants")
    user: Mapped["User"] = relationship("User")
