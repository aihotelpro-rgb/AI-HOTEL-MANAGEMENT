import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User, Guest, Booking, Order, Ticket, Room, FolioCharge
from app.auth import get_password_hash
import datetime

async def seed_dashboard_data(db: AsyncSession):
    # Staff Executive
    exec_user = User(username="gm", password_hash=get_password_hash("gmpass"), role="Executive")
    db.add(exec_user)
    
    # 2 Rooms
    r1 = Room(room_number="101", floor=1, price_per_night=4500.0, is_occupied=True, status="Clean")
    r2 = Room(room_number="102", floor=1, price_per_night=4500.0, is_occupied=True, status="Clean")
    db.add_all([r1, r2])
    await db.flush()

    # Guest & Bookings
    guest1 = Guest(name="Jack Black", phone="+111222", email="jack@test.com")
    guest2 = Guest(name="Jill White", phone="+333444", email="jill@test.com")
    db.add_all([guest1, guest2])
    await db.flush()
    
    now = datetime.datetime.now(datetime.timezone.utc)
    b1 = Booking(guest_id=guest1.id, room_number="101", check_in=now, check_out=now + datetime.timedelta(days=2), is_active=True, room_rate=4500.0)
    b2 = Booking(guest_id=guest2.id, room_number="102", check_in=now, check_out=now + datetime.timedelta(days=1), is_active=True, room_rate=4500.0)
    db.add_all([b1, b2])
    await db.flush()

    f1 = FolioCharge(booking_id=b1.id, charge_type="Room", description="Suite 101 stay", amount=9000.0, is_paid=False)
    db.add(f1)
    
    # Dining Order
    order = Order(booking_id=b1.id, items=[{"name": "Butter Chicken", "price": 560.0, "quantity": 1}], total_price=560.0, status="Preparing")
    db.add(order)
    
    # Outstanding Housekeeping Ticket
    ticket = Ticket(booking_id=b2.id, category="Housekeeping", description="Towel requested", status="Pending")
    db.add(ticket)
    
    await db.commit()
    return exec_user

@pytest.mark.asyncio
async def test_executive_stats_authorized(client: AsyncClient, db_session: AsyncSession):
    await seed_dashboard_data(db_session)
    
    # Login to get JWT
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"username": "gm", "password": "gmpass"}
    )
    token = login_res.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/v1/executive/stats", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["occupied_rooms"] == 2
    assert data["total_rooms"] == 2
    assert data["occupancy_rate"] == 100.0
    assert data["total_revenue"] == 9560.0  # 9000 room + 560 order
    assert data["open_tickets_count"] == 1

@pytest.mark.asyncio
async def test_executive_stats_unauthorized(client: AsyncClient, db_session: AsyncSession):
    await seed_dashboard_data(db_session)
    await client.post(
        "/api/v1/auth/register",
        json={"username": "cleaner", "password": "cleanpwd", "role": "Housekeeping"}
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"username": "cleaner", "password": "cleanpwd"}
    )
    token = login_res.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/v1/executive/stats", headers=headers)
    assert response.status_code == 403
    assert "Operation not permitted" in response.json()["detail"]

@pytest.mark.asyncio
async def test_generate_briefing_log(client: AsyncClient, db_session: AsyncSession):
    await seed_dashboard_data(db_session)
    
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"username": "gm", "password": "gmpass"}
    )
    token = login_res.json()["access_token"]
    
    headers = {"Authorization": f"Bearer {token}"}
    response = await client.get("/api/v1/executive/briefing", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "briefing_text" in data
    assert "Daily GM Executive Stand-Up Briefing" in data["briefing_text"]
    assert data["occupancy_rate"] == 100.0

@pytest.mark.asyncio
async def test_night_audit_and_csv_export(client: AsyncClient, db_session: AsyncSession):
    await seed_dashboard_data(db_session)

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"username": "gm", "password": "gmpass"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test 00:00 Night Audit Execution
    audit_res = await client.post("/api/v1/executive/night-audit", headers=headers)
    assert audit_res.status_code == 200
    audit_data = audit_res.json()
    assert audit_data["status"] == "COMPLETED"
    assert "financial_summary" in audit_data
    assert audit_data["financial_summary"]["grand_total"] > 0

    # 2. Test Tally / Zoho Excel Export
    excel_res = await client.get("/api/v1/executive/export-ledger-excel", headers=headers)
    assert excel_res.status_code == 200
    assert "spreadsheetml" in excel_res.headers["content-type"]
    assert len(excel_res.content) > 100

