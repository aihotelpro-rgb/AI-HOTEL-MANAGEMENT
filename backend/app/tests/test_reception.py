import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Room, User
from app.auth import get_password_hash

async def seed_reception_data(db: AsyncSession):
    rec_user = User(username="receptionist", password_hash=get_password_hash("recpass"), role="Reception")
    db.add(rec_user)
    
    room = Room(room_number="401", floor=4, room_type="Royal Heritage Suite", price_per_night=9500.0, is_occupied=False, status="Clean")
    db.add(room)
    await db.commit()
    return rec_user

@pytest.mark.asyncio
async def test_get_rooms_matrix(client: AsyncClient, db_session: AsyncSession):
    await seed_reception_data(db_session)
    login_res = await client.post("/api/v1/auth/login", json={"username": "receptionist", "password": "recpass"})
    token = login_res.json()["access_token"]
    
    response = await client.get("/api/v1/reception/rooms", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    rooms = response.json()
    assert len(rooms) >= 1
    assert rooms[0]["room_number"] == "401"

@pytest.mark.asyncio
async def test_1click_check_in_and_check_out(client: AsyncClient, db_session: AsyncSession):
    await seed_reception_data(db_session)
    login_res = await client.post("/api/v1/auth/login", json={"username": "receptionist", "password": "recpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Check-In (2 nights @ ₹9500 = ₹19,000)
    check_in_payload = {
        "guest_name": "Maharaja Raghavendra Singh",
        "guest_phone": "+919811122233",
        "guest_email": "raghavendra@royalheritage.in",
        "room_number": "401",
        "nights": 2,
        "room_rate": 9500.0,
        "vip_status": True
    }
    check_in_res = await client.post("/api/v1/reception/check-in", json=check_in_payload, headers=headers)
    assert check_in_res.status_code == 201
    check_in_data = check_in_res.json()
    booking_id = check_in_data["booking_id"]
    assert check_in_data["total_room_charges"] == 19000.0

    # 2. Place F&B order (₹1,000)
    order_payload = {
        "booking_id": booking_id,
        "items": [{"id": 3, "name": "Butter Chicken", "quantity": 1, "price": 560.0}, {"id": 2, "name": "Paneer Tikka", "quantity": 1, "price": 440.0}],
        "total_price": 1000.0
    }
    await client.post("/api/v1/qr_menu/order", json=order_payload)

    # 3. Check-Out: Subtotal = 20,000 | 12% GST = 2,400 | Grand Total = 22,400
    check_out_res = await client.post(f"/api/v1/reception/check-out/{booking_id}", headers=headers)
    assert check_out_res.status_code == 200
    out_data = check_out_res.json()
    assert out_data["total_room_charges"] == 19000.0
    assert out_data["total_dining_charges"] == 1000.0
    assert out_data["gst_charges"] == 2400.0
    assert out_data["grand_total"] == 22400.0
    assert out_data["status"] == "Settled & Checked Out"
