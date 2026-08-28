import pytest
from httpx import AsyncClient
from app.config import settings

@pytest.mark.asyncio
async def test_verify_whatsapp_webhook_success(client: AsyncClient):
    response = await client.get(
        f"/api/v1/whatsapp?hub.mode=subscribe&hub.verify_token={settings.WHATSAPP_VERIFY_TOKEN}&hub.challenge=12345"
    )
    assert response.status_code == 200
    assert response.json() == 12345

@pytest.mark.asyncio
async def test_verify_meta_webhook_alias(client: AsyncClient):
    response = await client.get(
        f"/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token={settings.WHATSAPP_VERIFY_TOKEN}&hub.challenge=998877"
    )
    assert response.status_code == 200
    assert response.json() == 998877

@pytest.mark.asyncio
async def test_verify_whatsapp_webhook_mismatch(client: AsyncClient):
    response = await client.get(
        "/api/v1/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=12345"
    )
    assert response.status_code == 403
    assert "Verification token mismatch" in response.json()["detail"]

@pytest.mark.asyncio
async def test_receive_whatsapp_housekeeping_request(client: AsyncClient):
    payload = {
        "from_phone": "+15550199",
        "message_text": "Need fresh towels in room 304 please."
    }
    
    response = await client.post("/api/v1/whatsapp", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["ticket_created"]["room_number"] == "304"
    assert data["ticket_created"]["category"] == "Amenity"
    assert "towels" in data["ticket_created"]["description"]

@pytest.mark.asyncio
async def test_receive_whatsapp_maintenance_request(client: AsyncClient):
    payload = {
        "from_phone": "+15550299",
        "message_text": "Rm 102: The AC is leaking water and not cooling."
    }
    
    response = await client.post("/api/v1/whatsapp", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["ticket_created"]["room_number"] == "102"
    assert data["ticket_created"]["category"] == "Maintenance"
