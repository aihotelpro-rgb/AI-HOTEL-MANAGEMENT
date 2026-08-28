import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Room

@pytest.mark.asyncio
async def test_get_public_availability(client: AsyncClient, db_session: AsyncSession):
    room = Room(
        room_number="304",
        floor=3,
        room_type="Deluxe Heritage King",
        status="Clean",
        price_per_night=6500.0,
        is_occupied=False
    )
    db_session.add(room)
    await db_session.commit()

    response = await client.get("/api/v1/public/availability")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "available_categories" in data
    assert len(data["available_categories"]) > 0

@pytest.mark.asyncio
async def test_create_public_website_reservation_with_channel(client: AsyncClient, db_session: AsyncSession):
    room = Room(
        room_number="305",
        floor=3,
        room_type="Deluxe Heritage King",
        status="Clean",
        price_per_night=6500.0,
        is_occupied=False
    )
    db_session.add(room)
    await db_session.commit()

    payload = {
        "guest_name": "Direct Website Guest",
        "guest_phone": "+919988776655",
        "guest_email": "direct@guest.in",
        "room_type": "Deluxe Heritage King",
        "nights": 2,
        "payment_txn_id": "PAY_TEST_8888",
        "channel_name": "Self Website"
    }

    response = await client.post("/api/v1/public/reserve", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "confirmed"
    assert data["guest_name"] == "Direct Website Guest"
    assert data["channel_name"] == "Self Website"
    assert "digital_qr_pass_url" in data

@pytest.mark.asyncio
async def test_create_and_verify_razorpay_payment(client: AsyncClient, db_session: AsyncSession):
    room = Room(
        room_number="306",
        floor=3,
        room_type="Deluxe Heritage King",
        status="Clean",
        price_per_night=6500.0,
        is_occupied=False
    )
    db_session.add(room)
    await db_session.commit()

    # 1. Create Payment Order
    order_payload = {
        "amount_inr": 6500.0,
        "room_type": "Deluxe Heritage King",
        "guest_name": "Rajesh Malhotra",
        "guest_email": "rajesh@malhotra.in",
        "guest_phone": "+919876543210",
        "nights": 2,
        "channel_code": "WEB"
    }

    order_res = await client.post("/api/v1/public/create-payment-order", json=order_payload)
    assert order_res.status_code == 200
    order_data = order_res.json()
    assert order_data["status"] == "created"
    assert "order_id" in order_data
    assert order_data["amount_inr"] == 14560.0 # (6500 * 2) + 12% GST

    # 2. Verify Payment & Confirm Reservation
    verify_payload = {
        "razorpay_order_id": order_data["order_id"],
        "razorpay_payment_id": "pay_test_rzp_998877",
        "reservation": {
            "guest_name": "Rajesh Malhotra",
            "guest_phone": "+919876543210",
            "guest_email": "rajesh@malhotra.in",
            "room_type": "Deluxe Heritage King",
            "nights": 2,
            "channel_name": "Self Website"
        }
    }

    verify_res = await client.post("/api/v1/public/verify-payment", json=verify_payload)
    assert verify_res.status_code == 201
    verify_data = verify_res.json()
    assert verify_data["payment_status"] == "SUCCESS"
    assert verify_data["razorpay_payment_id"] == "pay_test_rzp_998877"
    assert verify_data["reservation_details"]["status"] == "confirmed"

