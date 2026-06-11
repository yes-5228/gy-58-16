from datetime import datetime, timezone

from fastapi import HTTPException

from app.data.store import store
from app.models.domain import Booking
from app.schemas import BookingCreate, BatchBookingCreate
from app.services.settlement import calculate_payable


def list_bookings() -> list[Booking]:
    return sorted(store.bookings.values(), key=lambda booking: booking.created_at, reverse=True)


def create_booking(payload: BookingCreate) -> Booking:
    slot = store.time_slots.get(payload.slot_id)
    if not slot:
        raise HTTPException(status_code=404, detail="时段不存在")
    if slot.status != "available":
        raise HTTPException(status_code=409, detail="该时段不可预约")

    member = store.members.get(payload.member_id)
    if not member:
        raise HTTPException(status_code=404, detail="会员不存在")

    original, discount, payable = calculate_payable(slot, member)
    booking_id = store.next_booking_id()
    order_id = store.next_order_id()
    court = store.courts.get(slot.court_id)
    court_name = court.name if court else "未知场地"
    booking = Booking(
        id=booking_id,
        order_id=order_id,
        slot_id=slot.id,
        slot_label=slot.label,
        court_id=slot.court_id,
        court_name=court_name,
        member_id=member.id,
        member_name=member.name,
        contact_name=payload.contact_name,
        original_amount=original,
        discount_rate=discount,
        payable_amount=payable,
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    store.bookings[booking_id] = booking
    store.time_slots[slot.id] = slot.model_copy(update={"status": "booked"})
    return booking


def create_batch_booking(payload: BatchBookingCreate) -> list[Booking]:
    member = store.members.get(payload.member_id)
    if not member:
        raise HTTPException(status_code=404, detail="会员不存在")

    resolved_slots = []
    for slot_id in payload.slot_ids:
        slot = store.time_slots.get(slot_id)
        if not slot:
            raise HTTPException(status_code=404, detail=f"时段 {slot_id} 不存在")
        if slot.status != "available":
            raise HTTPException(status_code=409, detail=f"时段 {slot.label} 不可预约")
        resolved_slots.append(slot)

    order_id = store.next_order_id()
    created_ids: list[int] = []

    try:
        bookings = []
        court = store.courts.get(resolved_slots[0].court_id)
        default_court_name = court.name if court else "未知场地"
        for slot in resolved_slots:
            original, discount, payable = calculate_payable(slot, member)
            booking_id = store.next_booking_id()
            slot_court = store.courts.get(slot.court_id)
            slot_court_name = slot_court.name if slot_court else default_court_name
            booking = Booking(
                id=booking_id,
                order_id=order_id,
                slot_id=slot.id,
                slot_label=slot.label,
                court_id=slot.court_id,
                court_name=slot_court_name,
                member_id=member.id,
                member_name=member.name,
                contact_name=payload.contact_name,
                original_amount=original,
                discount_rate=discount,
                payable_amount=payable,
                status="pending",
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            store.bookings[booking_id] = booking
            store.time_slots[slot.id] = slot.model_copy(update={"status": "booked"})
            created_ids.append(booking_id)
            bookings.append(booking)
        return bookings
    except Exception:
        for booking_id in created_ids:
            booking = store.bookings.pop(booking_id, None)
            if booking:
                slot = store.time_slots.get(booking.slot_id)
                if slot:
                    store.time_slots[slot.id] = slot.model_copy(update={"status": "available"})
        raise


def settle_booking(booking_id: int) -> Booking:
    booking = store.bookings.get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="预约不存在")
    if booking.status == "paid":
        return booking
    paid = booking.model_copy(update={"status": "paid"})
    store.bookings[booking_id] = paid
    return paid


def cancel_booking(booking_id: int) -> Booking:
    booking = store.bookings.get(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="预约不存在")
    canceled = booking.model_copy(update={"status": "canceled"})
    store.bookings[booking_id] = canceled
    slot = store.time_slots.get(booking.slot_id)
    if slot:
        store.time_slots[slot.id] = slot.model_copy(update={"status": "available"})
    return canceled


def cancel_order(order_id: str) -> list[Booking]:
    order_bookings = [b for b in store.bookings.values() if b.order_id == order_id]
    if not order_bookings:
        raise HTTPException(status_code=404, detail="订单不存在")

    canceled_list = []
    for booking in order_bookings:
        if booking.status == "canceled":
            canceled_list.append(booking)
            continue
        canceled = booking.model_copy(update={"status": "canceled"})
        store.bookings[booking.id] = canceled
        slot = store.time_slots.get(booking.slot_id)
        if slot:
            store.time_slots[slot.id] = slot.model_copy(update={"status": "available"})
        canceled_list.append(canceled)

    return canceled_list
