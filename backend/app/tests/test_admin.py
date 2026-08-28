import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User, HotelSettings, Room, MenuItem
from app.auth import get_password_hash

async def seed_admin(db: AsyncSession):
    admin = User(username="superadmin", password_hash=get_password_hash("superpass"), role="Admin")
    db.add(admin)
    await db.commit()
    return admin

@pytest.mark.asyncio
async def test_get_and_update_hotel_settings(client: AsyncClient, db_session: AsyncSession):
    await seed_admin(db_session)
    
    # Login
    login_res = await client.post("/api/v1/auth/login", json={"username": "superadmin", "password": "superpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Get settings
    get_res = await client.get("/api/v1/admin/settings")
    assert get_res.status_code == 200
    assert get_res.json()["currency_symbol"] == "₹"
    
    # 2. Update settings
    update_res = await client.put("/api/v1/admin/settings", json={
        "hotel_name": "Taj Royal Palace Jaipur",
        "phone": "+91 99999 88888"
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["hotel_name"] == "Taj Royal Palace Jaipur"

@pytest.mark.asyncio
async def test_admin_room_crud(client: AsyncClient, db_session: AsyncSession):
    await seed_admin(db_session)
    login_res = await client.post("/api/v1/auth/login", json={"username": "superadmin", "password": "superpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Create Room
    create_res = await client.post("/api/v1/admin/rooms", json={
        "room_number": "701",
        "floor": 7,
        "room_type": "Maharaja Penthouse Suite",
        "price_per_night": 22000.0
    }, headers=headers)
    assert create_res.status_code == 201
    room_data = create_res.json()
    room_id = room_data["id"]
    
    # 2. Update Room
    upd_res = await client.put(f"/api/v1/admin/rooms/{room_id}", json={"price_per_night": 25000.0}, headers=headers)
    assert upd_res.status_code == 200
    assert upd_res.json()["price_per_night"] == 25000.0
    
    # 3. Delete Room
    del_res = await client.delete(f"/api/v1/admin/rooms/{room_id}", headers=headers)
    assert del_res.status_code == 204

@pytest.mark.asyncio
async def test_admin_menu_crud_and_toggle(client: AsyncClient, db_session: AsyncSession):
    await seed_admin(db_session)
    login_res = await client.post("/api/v1/auth/login", json={"username": "superadmin", "password": "superpass"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Create Dish
    create_res = await client.post("/api/v1/admin/menu", json={
        "name": "Kashmiri Rogan Josh",
        "category": "Indian Mains",
        "price": 680.0,
        "prep_time": "20 min",
        "description": "Slow cooked lamb with Kashmiri whole spices and ratan jot.",
        "tags": ["Chef Special", "Traditional"],
        "is_available": True
    }, headers=headers)
    assert create_res.status_code == 201
    dish_id = create_res.json()["id"]
    
    # 2. Toggle Availability
    toggle_res = await client.patch(f"/api/v1/admin/menu/{dish_id}/toggle", headers=headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_available"] == False
