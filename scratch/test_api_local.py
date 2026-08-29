import asyncio
import sys
import os

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
backend_dir = os.path.join(root_dir, 'backend')
sys.path.insert(0, backend_dir)
sys.path.insert(0, root_dir)

from backend.main import app
from httpx import AsyncClient, ASGITransport

async def test_app():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/public/availability")
        print(f"Status Code: {res.status_code}")
        print(f"Response: {res.json()}")

asyncio.run(test_app())
