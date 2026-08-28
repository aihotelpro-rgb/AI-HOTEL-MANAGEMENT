import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Guest, Booking, Room
import datetime

@pytest.mark.asyncio
async def test_concierge_faq_wifi(client: AsyncClient, db_session: AsyncSession):
    response = await client.post("/api/v1/concierge/chat", json={
        "room_number": "304",
        "message": "What is the resort Wi-Fi network and password?"
    })
    assert response.status_code == 200
    data = response.json()
    assert "AI-HOS-Guest" in data["reply"]

@pytest.mark.asyncio
async def test_concierge_auto_ticket_dispatch(client: AsyncClient, db_session: AsyncSession):
    # Seed active booking
    guest = Guest(name="Sophia Loren", phone="+1777888999")
    db_session.add(guest)
    await db_session.flush()

    now = datetime.datetime.utcnow()
    booking = Booking(guest_id=guest.id, room_number="202", check_in=now, check_out=now + datetime.timedelta(days=2))
    db_session.add(booking)
    await db_session.commit()

    response = await client.post("/api/v1/concierge/chat", json={
        "room_number": "202",
        "booking_id": booking.id,
        "message": "Please send 2 extra bath towels and a fresh pillow to our room."
    })
    assert response.status_code == 200
    data = response.json()
    assert data["action_taken"] == "ticket_dispatched"
    assert "Housekeeping" in data["reply"] or "attendant" in data["reply"]
