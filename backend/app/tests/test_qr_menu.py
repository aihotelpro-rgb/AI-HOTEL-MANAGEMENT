import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
import datetime
from app.models import Guest, Booking, Order, User
from app.auth import get_password_hash

async def seed_guest_booking_and_kitchen(db: AsyncSession):
    user = User(username="chef", password_hash=get_password_hash("chefpass"), role="Kitchen")
    db.add(user)
    
    guest = Guest(name="Pooja Sharma", phone="+919822233344", email="pooja@royalheritage.in")
    db.add(guest)
    await db.flush()

    now = datetime.datetime.now(datetime.timezone.utc)
    booking = Booking(
        guest_id=guest.id,
        room_number="304",
        check_in=now,
        check_out=now + datetime.timedelta(days=2),
        is_active=True,
        room_rate=6500.0
    )
    db.add(booking)
    await db.commit()
    return booking, user

@pytest.mark.asyncio
async def test_get_menu_items(client: AsyncClient):
    response = await client.get("/api/v1/qr_menu")
    assert response.status_code == 200
    menu = response.json()
    assert len(menu) > 0
    assert any("Tikka" in item["name"] or "Chicken" in item["name"] for item in menu)

@pytest.mark.asyncio
async def test_5_stage_order_delivery_lifecycle(client: AsyncClient, db_session: AsyncSession):
    booking, user = await seed_guest_booking_and_kitchen(db_session)

    # 1. Place order (Initial status: Pending) in ₹ INR
    order_payload = {
        "booking_id": booking.id,
        "items": [
            {"id": 1, "name": "Murgh Malai Tikka & Mint Chutney", "quantity": 1, "price": 480.0},
            {"id": 6, "name": "Tandoori Garlic & Butter Naan Basket", "quantity": 2, "price": 140.0}
        ],
        "total_price": 760.00,
        "special_instructions": "Mild spices"
    }
    order_res = await client.post("/api/v1/qr_menu/order", json=order_payload)
    assert order_res.status_code == 201
    order_data = order_res.json()
    order_id = order_data["id"]
    assert order_data["status"] == "Pending"

    # 2. Login as kitchen staff
    login_res = await client.post("/api/v1/auth/login", json={"username": "chef", "password": "chefpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Stage 2: Kitchen starts preparing (Cooking)
    res_prep = await client.put(f"/api/v1/qr_menu/orders/{order_id}/status", json={"status": "Preparing"}, headers=headers)
    assert res_prep.status_code == 200
    assert res_prep.json()["status"] == "Preparing"

    # 4. Stage 3: Ready for Runner
    res_ready = await client.put(f"/api/v1/qr_menu/orders/{order_id}/status", json={"status": "Ready"}, headers=headers)
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "Ready"

    # 5. Stage 4: Out for Delivery with Runner Name
    res_out = await client.put(f"/api/v1/qr_menu/orders/{order_id}/status", json={"status": "OutForDelivery", "runner_name": "Runner Vikram"}, headers=headers)
    assert res_out.status_code == 200
    assert res_out.json()["status"] == "OutForDelivery"
    assert res_out.json()["runner_name"] == "Runner Vikram"

    # 6. Stage 5: Delivered to Room
    res_deliv = await client.put(f"/api/v1/qr_menu/orders/{order_id}/status", json={"status": "Delivered"}, headers=headers)
    assert res_deliv.status_code == 200
    assert res_deliv.json()["status"] == "Delivered"
    assert res_deliv.json()["delivered_at"] is not None

    # 7. Check that guest folio reflects this dining charge
    folio_res = await client.get(f"/api/v1/qr_menu/folio/{booking.id}")
    assert folio_res.status_code == 200
    folio = folio_res.json()
    assert folio["total_dining_charges"] == 760.00
