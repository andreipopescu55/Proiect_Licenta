"""
CRUD + logica de business pentru Find Party (meciuri deschise).

Punctul important academic: APROBAREA unui jucator e SIGURA LA CONCURENTA.
Doi organizatori (sau acelasi, din 2 tab-uri) nu pot aproba peste numarul de
locuri. Garantia vine dintr-un lock pessimist pe randul `matches`
(SELECT ... FOR UPDATE): aprobarile se serializeaza, deci numaratoarea de
locuri ocupate e mereu corecta.
"""
import uuid
from datetime import datetime, timezone, date, timedelta
from decimal import Decimal
from typing import Optional, Sequence
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload, joinedload

from app.models.match import Match, MatchParticipant
from app.models.booking import Booking
from app.models.field import Field
from app.models.venue import Venue
from app.models.enums import (
    MatchStatus, MatchSkillLevel, ParticipantStatus, BookingStatus, VenueStatus,
)

LOCAL_TZ = ZoneInfo("Europe/Bucharest")


# ── Exceptii de domeniu (endpoint-ul le traduce in coduri HTTP) ─────────────────
class MatchError(Exception):
    """Eroare generica de domeniu pentru meciuri."""


class MatchFullError(MatchError):
    """Nu mai sunt locuri libere — aprobarea a fost respinsa."""


class AlreadyParticipantError(MatchError):
    """Userul are deja o cerere activa / e deja in meci."""


class NotParticipantError(MatchError):
    """Nu exista o cerere/participare de procesat pentru acest user."""


# ── Helpers de numarare ──────────────────────────────────────────────────────────
def approved_count(match: Match) -> int:
    return sum(1 for p in match.participants if p.status == ParticipantStatus.APPROVED)


def occupied_spots(match: Match) -> int:
    """Locuri ocupate = jucatori aprobati + organizatorul (ocupa mereu 1 loc)."""
    return approved_count(match) + 1


def spots_left(match: Match) -> int:
    return max(match.total_spots - occupied_spots(match), 0)


# ── Citire ─────────────────────────────────────────────────────────────────────
_LOAD_OPTS = (
    selectinload(Match.participants).selectinload(MatchParticipant.user),
    joinedload(Match.booking).joinedload(Booking.field).joinedload(Field.venue),
    joinedload(Match.organizer),
)


def get_match_by_id(db: Session, match_id: uuid.UUID) -> Optional[Match]:
    stmt = select(Match).where(Match.id == match_id).options(*_LOAD_OPTS)
    return db.execute(stmt).unique().scalar_one_or_none()


def get_match_by_booking(db: Session, booking_id: uuid.UUID) -> Optional[Match]:
    stmt = select(Match).where(Match.booking_id == booking_id).options(*_LOAD_OPTS)
    return db.execute(stmt).unique().scalar_one_or_none()


def list_open_matches(
    db: Session,
    *,
    city: Optional[str] = None,
    sport: Optional[str] = None,
    skill: Optional[MatchSkillLevel] = None,
    on_date: Optional[date] = None,
) -> Sequence[Match]:
    """Meciuri deschise, viitoare, la baze aprobate — cele mai apropiate primele."""
    now = datetime.now(timezone.utc)
    stmt = (
        select(Match)
        .join(Booking, Match.booking_id == Booking.id)
        .join(Field, Booking.field_id == Field.id)
        .join(Venue, Field.venue_id == Venue.id)
        .where(
            Match.status == MatchStatus.OPEN,
            Booking.start_time > now,
            Booking.status != BookingStatus.CANCELLED,
            Venue.status == VenueStatus.APPROVED,
        )
        .options(*_LOAD_OPTS)
        .order_by(Booking.start_time.asc())
    )
    if city:
        stmt = stmt.where(Venue.city == city)
    if sport:
        stmt = stmt.where(Field.sport_type == sport)
    if skill:
        stmt = stmt.where(Match.skill_level == skill)
    if on_date:
        day_start = datetime.combine(on_date, datetime.min.time(), tzinfo=LOCAL_TZ)
        day_end = day_start + timedelta(days=1)
        stmt = stmt.where(Booking.start_time >= day_start, Booking.start_time < day_end)
    return db.execute(stmt).unique().scalars().all()


def list_matches_for_user(db: Session, user_id: uuid.UUID) -> Sequence[Match]:
    """Meciuri unde userul e organizator SAU participant (orice stare activa)."""
    organized = select(Match.id).where(Match.organizer_id == user_id)
    joined = (
        select(MatchParticipant.match_id)
        .where(
            MatchParticipant.user_id == user_id,
            MatchParticipant.status.in_(
                [ParticipantStatus.REQUESTED, ParticipantStatus.APPROVED]
            ),
        )
    )
    stmt = (
        select(Match)
        .where(Match.id.in_(organized.union(joined)))
        .options(*_LOAD_OPTS)
        .join(Booking, Match.booking_id == Booking.id)
        .order_by(Booking.start_time.asc())
    )
    return db.execute(stmt).unique().scalars().all()


# ── Scriere ───────────────────────────────────────────────────────────────────
def create_match(
    db: Session,
    *,
    booking: Booking,
    organizer_id: uuid.UUID,
    total_spots: int,
    skill_level: MatchSkillLevel,
    note: Optional[str],
    price_per_player: Optional[Decimal],
) -> Match:
    match = Match(
        booking_id=booking.id,
        organizer_id=organizer_id,
        total_spots=total_spots,
        skill_level=skill_level,
        note=note,
        price_per_player=price_per_player,
        status=MatchStatus.OPEN,
    )
    db.add(match)
    db.commit()
    return get_match_by_id(db, match.id)


def _find_participant(
    db: Session, match_id: uuid.UUID, user_id: uuid.UUID
) -> Optional[MatchParticipant]:
    stmt = select(MatchParticipant).where(
        MatchParticipant.match_id == match_id,
        MatchParticipant.user_id == user_id,
    )
    return db.execute(stmt).scalar_one_or_none()


def request_join(db: Session, *, match: Match, user_id: uuid.UUID) -> MatchParticipant:
    """Trimite o cerere de alaturare. Re-cererea (dupa reject/left) reactiveaza randul."""
    existing = _find_participant(db, match.id, user_id)
    if existing is not None:
        if existing.status in (ParticipantStatus.REQUESTED, ParticipantStatus.APPROVED):
            raise AlreadyParticipantError("Ai deja o cerere activa pentru acest meci")
        existing.status = ParticipantStatus.REQUESTED
        db.commit()
        db.refresh(existing)
        return existing
    participant = MatchParticipant(
        match_id=match.id, user_id=user_id, status=ParticipantStatus.REQUESTED
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


def leave_match(db: Session, *, match: Match, user_id: uuid.UUID) -> None:
    """Userul iese din meci. Daca era aprobat si meciul era plin -> redevine deschis."""
    participant = _find_participant(db, match.id, user_id)
    if participant is None or participant.status not in (
        ParticipantStatus.REQUESTED, ParticipantStatus.APPROVED
    ):
        raise NotParticipantError("Nu esti inscris la acest meci")
    was_approved = participant.status == ParticipantStatus.APPROVED
    participant.status = ParticipantStatus.LEFT
    if was_approved and match.status == MatchStatus.FULL:
        match.status = MatchStatus.OPEN
    db.commit()


def approve_participant(
    db: Session, *, match_id: uuid.UUID, participant_user_id: uuid.UUID
) -> MatchParticipant:
    """
    Aproba o cerere — SIGUR LA CONCURENTA.

    Blocam randul `matches` cu FOR UPDATE: orice alta aprobare pe acelasi meci
    asteapta pana facem commit. Astfel numaratoarea de locuri ocupate e mereu
    corecta si nu putem trece peste total_spots.
    """
    match = db.execute(
        select(Match).where(Match.id == match_id).with_for_update()
    ).scalar_one_or_none()
    if match is None:
        raise MatchError("Meci inexistent")
    if match.status == MatchStatus.CANCELLED:
        raise MatchError("Meciul este anulat")

    participants = db.execute(
        select(MatchParticipant).where(MatchParticipant.match_id == match_id)
    ).scalars().all()
    target = next((p for p in participants if p.user_id == participant_user_id), None)
    if target is None or target.status != ParticipantStatus.REQUESTED:
        raise NotParticipantError("Nu exista o cerere de aprobat pentru acest jucator")

    approved = sum(1 for p in participants if p.status == ParticipantStatus.APPROVED)
    occupied = approved + 1  # + organizator
    if occupied >= match.total_spots:
        raise MatchFullError("Meciul s-a umplut")

    target.status = ParticipantStatus.APPROVED
    if occupied + 1 >= match.total_spots:
        match.status = MatchStatus.FULL
    db.commit()
    db.refresh(target)
    return target


def reject_participant(
    db: Session, *, match: Match, participant_user_id: uuid.UUID
) -> MatchParticipant:
    """Respinge o cerere sau scoate un jucator aprobat (elibereaza locul)."""
    target = _find_participant(db, match.id, participant_user_id)
    if target is None or target.status in (ParticipantStatus.REJECTED, ParticipantStatus.LEFT):
        raise NotParticipantError("Nu exista o cerere/participare de respins")
    was_approved = target.status == ParticipantStatus.APPROVED
    target.status = ParticipantStatus.REJECTED
    if was_approved and match.status == MatchStatus.FULL:
        match.status = MatchStatus.OPEN
    db.commit()
    db.refresh(target)
    return target


def cancel_match(db: Session, *, match: Match) -> Match:
    match.status = MatchStatus.CANCELLED
    db.commit()
    db.refresh(match)
    return match
