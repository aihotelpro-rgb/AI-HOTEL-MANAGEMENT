import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models import User, Room, Guest, Booking, Order, Ticket, InventoryItem
from app.auth import get_password_hash
import datetime

async def seed_booster_data(db: AsyncSession):
    staff_user = User(username="receptionist", password_hash=get_password_hash("recpwd"), role="Reception")
    db.add(staff_user)
    
    room = Room(room_number="401", floor=4, price_per_night=5500.0, is_occupied=True, status="Clean")
    db.add(room)
    await db.flush()

    guest = Guest(name="Rohan Sharma", phone="+91 99887 76655", email="rohan@test.com", vip_status=False)
    db.add(guest)
    await db.flush()

    now = datetime.datetime.now(datetime.timezone.utc)
    booking = Booking(guest_id=guest.id, room_number="401", check_in=now, check_out=now + datetime.timedelta(days=2), is_active=True, room_rate=5500.0)
    db.add(booking)
    await db.flush()

    inv = InventoryItem(item_name="Basmati Rice & Poultry", unit="kg", current_stock=50.0, min_alert_threshold=10.0)
    db.add(inv)
    await db.commit()

    return staff_user, room, guest, booking

@pytest.mark.asyncio
async def test_booster_1_auto_housekeeping_dispatch_on_checkout(client: AsyncClient, db_session: AsyncSession):
    staff_user, room, guest, booking = await seed_booster_data(db_session)
    
    login_res = await client.post("/api/v1/auth/login", json={"username": "receptionist", "password": "recpwd"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Execute Check-Out
    out_res = await client.post(f"/api/v1/reception/check-out/{booking.id}", headers=headers)
    assert out_res.status_code == 200

    # Verify Room status transitioned to Dirty
    room_q = await db_session.execute(select(Room).where(Room.room_number == "401"))
    updated_room = room_q.scalar_one()
    assert updated_room.status == "Dirty"
    assert updated_room.is_occupied == False

    # Verify Auto-Housekeeping Ticket dispatched
    ticket_q = await db_session.execute(select(Ticket).where(Ticket.room_number == "401", Ticket.priority == "High"))
    hk_ticket = ticket_q.scalars().first()
    assert hk_ticket is not None
    assert "POST-CHECKOUT TURNOVER" in hk_ticket.description

@pytest.mark.asyncio
async def test_booster_2_whatsapp_pre_arrival_digital_keycard(client: AsyncClient, db_session: AsyncSession):
    staff_user, room, guest, booking = await seed_booster_data(db_session)

    res = await client.post(f"/api/v1/whatsapp/send-pre-arrival-keycard?booking_id={booking.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SENT"
    assert data["recipient_phone"] == "+91 99887 76655"
    assert "RoyalResort-HighSpeed" in data["message_body"]
    assert "/room-qr?room=401" in data["digital_pass_url"]

@pytest.mark.asyncio
async def test_booster_3_kitchen_stock_auto_deduction(client: AsyncClient, db_session: AsyncSession):
    staff_user, room, guest, booking = await seed_booster_data(db_session)

    # Place an In-Room Dining Order (2x Biryani)
    order_payload = {
        "booking_id": booking.id,
        "items": [{"id": 1, "name": "Hyderabadi Dum Biryani", "quantity": 2, "price": 520.0}],
        "total_price": 1040.0
    }
    res = await client.post("/api/v1/qr_menu/order", json=order_payload)
    assert res.status_code == 201

    # Verify Inventory Stock Auto-Deduction (50.0 - 0.5 = 49.5kg)
    inv_q = await db_session.execute(select(InventoryItem).limit(1))
    inv = inv_q.scalars().first()
    assert inv is not None
    assert inv.current_stock < 50.0

@pytest.mark.asyncio
async def test_booster_4_vip_recognition_history_radar(client: AsyncClient, db_session: AsyncSession):
    staff_user, room, guest, booking = await seed_booster_data(db_session)

    login_res = await client.post("/api/v1/auth/login", json={"username": "receptionist", "password": "recpwd"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Free up room 401
    room.is_occupied = False
    await db_session.commit()

    # Re-check-in the same returning guest (phone: +91 99887 76655)
    checkin_payload = {
        "guest_name": "Rohan Sharma",
        "guest_phone": "+91 99887 76655",
        "guest_email": "rohan@test.com",
        "room_number": "401",
        "nights": 1,
        "room_rate": 5500.0,
        "vip_status": True
    }
    in_res = await client.post("/api/v1/reception/check-in", json=checkin_payload, headers=headers)
    assert in_res.status_code == 201

    # Verify VIP Guest Radar Auto-Flagged
    guest_q = await db_session.execute(select(Guest).where(Guest.phone == "+91 99887 76655"))
    vip_guest = guest_q.scalars().first()
    assert vip_guest is not None
    assert vip_guest.vip_status == True
    assert "VIP RETURNING GUEST" in (vip_guest.notes or "")
