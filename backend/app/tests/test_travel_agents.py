import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Room, User, TravelAgent
from app.auth import get_password_hash

async def seed_test_agent_data(db: AsyncSession):
    user = User(username="agent_manager", password_hash=get_password_hash("manager123"), role="Admin")
    db.add(user)
    
    room = Room(room_number="305", floor=3, room_type="Deluxe Sea View Suite", price_per_night=5000.0, is_occupied=False, status="Clean")
    db.add(room)
    await db.commit()
    return user

@pytest.mark.asyncio
async def test_travel_agent_lifecycle_and_ledger(client: AsyncClient, db_session: AsyncSession):
    await seed_test_agent_data(db_session)
    login_res = await client.post("/api/v1/auth/login", json={"username": "agent_manager", "password": "manager123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Travel Agent
    agent_payload = {
        "agency_name": "Andaman Island Holidays DMC",
        "contact_person": "Vikram Sethi",
        "phone": "+91 94342 99881",
        "email": "vikram@andamanholidays.com",
        "city": "Port Blair",
        "address": "Phoenix Bay, Port Blair",
        "gstin": "35AABCA9988Z1Z9",
        "contract_type": "NET_RATE",
        "credit_limit": 200000.0,
        "credit_days": 30,
        "notes": "Verified DMC Partner"
    }
    create_res = await client.post("/api/v1/agents", json=agent_payload, headers=headers)
    assert create_res.status_code == 201
    agent_id = create_res.json()["agent"]["id"]

    # 2. List Agents & Summary Stats
    list_res = await client.get("/api/v1/agents", headers=headers)
    assert list_res.status_code == 200
    agents = list_res.json()
    assert any(a["id"] == agent_id for a in agents)

    stats_res = await client.get("/api/v1/agents/summary/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_agents"] >= 1

    # 3. Create Reservation with Agent Voucher & Credit Ledger (Bill-to-Company)
    res_payload = {
        "guest_name": "Dr. Rohit Agarwal",
        "guest_phone": "+91 98310 11223",
        "room_number": "305",
        "check_in_date": "2026-10-01",
        "check_out_date": "2026-10-03",
        "room_rate": 5000.0,
        "vip_status": False,
        "travel_agent_id": agent_id,
        "voucher_number": "VCH-AND-8891",
        "billing_type": "CREDIT_LEDGER_BTC",
        "meal_plan": "MAP",
        "agent_advance_paid": 0.0
    }
    booking_res = await client.post("/api/v1/reception/reservations", json=res_payload, headers=headers)
    assert booking_res.status_code == 201

    # 4. Check Agent Ledger (Debit Invoice of 2 Nights x ₹5000 = ₹10,000 should be posted)
    ledger_res = await client.get(f"/api/v1/agents/{agent_id}/ledger", headers=headers)
    assert ledger_res.status_code == 200
    ledger_data = ledger_res.json()
    assert ledger_data["statement_summary"]["net_outstanding_balance_inr"] == 10000.0
    assert len(ledger_data["transactions"]) == 1
    assert ledger_data["transactions"][0]["transaction_type"] == "DEBIT_INVOICE"
    assert ledger_data["transactions"][0]["amount"] == 10000.0

    # 5. Record Advance / Bank Payment from Agent (₹10,000 via NEFT)
    payment_payload = {
        "agent_id": agent_id,
        "amount": 10000.0,
        "payment_mode": "Bank Transfer (NEFT/RTGS)",
        "reference_utr": "UTR-SBIN99283719",
        "notes": "Full settlement for Voucher VCH-AND-8891"
    }
    pay_res = await client.post(f"/api/v1/agents/{agent_id}/payments", json=payment_payload, headers=headers)
    assert pay_res.status_code == 201
    pay_data = pay_res.json()
    assert pay_data["new_balance_due"] == 0.0

    # 6. Verify Statement of Account is now balanced
    updated_ledger_res = await client.get(f"/api/v1/agents/{agent_id}/ledger", headers=headers)
    assert updated_ledger_res.status_code == 200
    updated_ledger = updated_ledger_res.json()
    assert updated_ledger["statement_summary"]["net_outstanding_balance_inr"] == 0.0
    assert len(updated_ledger["transactions"]) == 2
