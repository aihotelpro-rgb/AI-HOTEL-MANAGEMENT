import pytest
from httpx import AsyncClient
from app.auth import get_password_hash, verify_password

@pytest.mark.asyncio
async def test_password_hashing():
    password = "supersecretpassword123"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

@pytest.mark.asyncio
async def test_user_registration(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "new_kds_user", "password": "securepwd123", "role": "Kitchen"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "new_kds_user"
    assert data["role"] == "Kitchen"
    assert "password_hash" not in data

@pytest.mark.asyncio
async def test_user_registration_duplicate(client: AsyncClient):
    # Register once
    await client.post(
        "/api/v1/auth/register",
        json={"username": "duplicate_user", "password": "pwd", "role": "Reception"}
    )
    # Register again
    response = await client.post(
        "/api/v1/auth/register",
        json={"username": "duplicate_user", "password": "pwd", "role": "Reception"}
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

@pytest.mark.asyncio
async def test_user_login_success(client: AsyncClient):
    # Seed user first
    await client.post(
        "/api/v1/auth/register",
        json={"username": "login_user", "password": "correctpassword", "role": "Housekeeping"}
    )
    
    # Login
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "login_user", "password": "correctpassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["role"] == "Housekeeping"

@pytest.mark.asyncio
async def test_user_login_invalid_credentials(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "non_existent", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "Incorrect username" in response.json()["detail"]
