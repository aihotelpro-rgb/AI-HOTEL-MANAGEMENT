from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.database import get_db
from app.models import HotelSettings, Room, MenuItem, User, InventoryItem, CameraFeed
from app.schemas import (
    HotelSettingsResponse, HotelSettingsUpdate,
    RoomResponse, RoomCreate, RoomStatusUpdate,
    MenuItemResponse, MenuItemCreate, MenuItemUpdate,
    UserResponse, UserCreate, StaffUserUpdate
)
from app.auth import RoleChecker, get_password_hash, get_current_user

router = APIRouter(prefix="/api/v1/admin", tags=["Super-Admin Master Control"])

admin_guard = RoleChecker(["Admin", "Executive"])

# --- 1. HOTEL PROPERTY SETTINGS ---
@router.get("/settings", response_model=HotelSettingsResponse)
async def get_hotel_settings(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HotelSettings).limit(1))
    settings = result.scalars().first()
    if not settings:
        settings = HotelSettings()
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings

@router.put("/settings", response_model=HotelSettingsResponse)
async def update_hotel_settings(
    settings_in: HotelSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    result = await db.execute(select(HotelSettings).limit(1))
    settings = result.scalars().first()
    if not settings:
        settings = HotelSettings()
        db.add(settings)
        await db.flush()

    for key, value in settings_in.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)

    await db.commit()
    await db.refresh(settings)
    return settings

# --- 2. ROOM INVENTORY MASTER ---
@router.get("/rooms", response_model=List[RoomResponse])
async def list_admin_rooms(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    result = await db.execute(select(Room).order_by(Room.room_number.asc()))
    return result.scalars().all()

@router.post("/rooms", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(
    room_in: RoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    result = await db.execute(select(Room).where(Room.room_number == room_in.room_number))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail=f"Suite {room_in.room_number} already exists in inventory")

    room = Room(
        room_number=room_in.room_number,
        floor=room_in.floor,
        room_type=room_in.room_type,
        price_per_night=room_in.price_per_night,
        image_url=room_in.image_url or "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
        area_sqft=room_in.area_sqft or 550,
        bed_type=room_in.bed_type or "Royal King Bed",
        max_occupancy=room_in.max_occupancy or "2 Adults + 1 Child",
        view_type=room_in.view_type or "Palace Courtyard View",
        amenities=room_in.amenities or ["High-Speed Wi-Fi", "Espresso Bar", "Marble Bathtub", "Smart Automation", "Balcony"],
        description=room_in.description or "Exquisite luxury suite crafted with heritage architecture and Italian linens.",
        status="Clean",
        is_occupied=False
    )
    db.add(room)
    await db.flush()
    return room

@router.put("/rooms/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: int,
    room_in: RoomStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalars().first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    for key, value in room_in.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(room, key, value)

    await db.flush()
    return room

@router.delete("/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    result = await db.execute(select(Room).where(Room.id == room_id))
    room = result.scalars().first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room.is_occupied:
        raise HTTPException(status_code=400, detail="Cannot delete currently occupied room")

    await db.delete(room)
    await db.flush()
    return None

# --- 3. MENU & F&B MASTER ---
@router.get("/menu", response_model=List[MenuItemResponse])
async def list_admin_menu(
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    query = select(MenuItem)
    if category and category != "All":
        query = query.where(MenuItem.category == category)
    query = query.order_by(MenuItem.category.asc(), MenuItem.id.asc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/menu", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
async def create_menu_item(
    item_in: MenuItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    item = MenuItem(
        name=item_in.name,
        category=item_in.category,
        price=item_in.price,
        prep_time=item_in.prep_time,
        image_url=item_in.image_url or "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600",
        portion_size=item_in.portion_size or "Serves 1-2",
        spice_level=item_in.spice_level or "Medium (🌶️🌶️)",
        calories=item_in.calories or "450 kcal",
        allergens=item_in.allergens or ["Contains Dairy"],
        description=item_in.description,
        tags=item_in.tags or [],
        is_available=item_in.is_available
    )
    db.add(item)
    await db.flush()
    return item

@router.put("/menu/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(
    item_id: int,
    item_in: MenuItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    for key, val in item_in.model_dump(exclude_unset=True).items():
        if val is not None:
            setattr(item, key, val)

    await db.flush()
    return item

@router.patch("/menu/{item_id}/toggle", response_model=MenuItemResponse)
async def toggle_menu_availability(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    item.is_available = not item.is_available
    await db.flush()
    return item

@router.delete("/menu/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    await db.delete(item)
    await db.flush()
    return None

# --- 4. STAFF & RBAC MASTER ---
@router.get("/staff", response_model=List[UserResponse])
async def list_staff(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    result = await db.execute(select(User).order_by(User.id.asc()))
    return result.scalars().all()

@router.post("/staff", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_staff_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    result = await db.execute(select(User).where(User.username == user_in.username))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username already exists")

    new_user = User(
        username=user_in.username,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        full_name=user_in.full_name or "Staff Member",
        employee_id=user_in.employee_id or f"EMP-{datetime.datetime.utcnow().strftime('%M%S')}",
        phone=user_in.phone,
        email=user_in.email,
        avatar_url=user_in.avatar_url or "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
        shift=user_in.shift or "Morning (07:00 - 15:30)",
        emergency_contact=user_in.emergency_contact,
        is_active=True
    )
    db.add(new_user)
    await db.flush()
    return new_user

@router.put("/staff/{user_id}", response_model=UserResponse)
async def update_staff_user(
    user_id: int,
    user_in: StaffUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Staff user not found")

    if user_in.role:
        user.role = user_in.role
    if user_in.password:
        user.password_hash = get_password_hash(user_in.password)
    if user_in.full_name:
        user.full_name = user_in.full_name
    if user_in.employee_id:
        user.employee_id = user_in.employee_id
    if user_in.phone:
        user.phone = user_in.phone
    if user_in.email:
        user.email = user_in.email
    if user_in.avatar_url:
        user.avatar_url = user_in.avatar_url
    if user_in.shift:
        user.shift = user_in.shift
    if user_in.emergency_contact:
        user.emergency_contact = user_in.emergency_contact
    if user_in.is_active is not None:
        user.is_active = user_in.is_active

    await db.flush()
    return user

@router.delete("/staff/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="Staff user not found")
    if user.username == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete root system administrator")

    await db.delete(user)
    await db.flush()
    return None

# --- 5. MASTER RAW INGREDIENT & HOTEL STOCK INVENTORY CONTROL ---
DEFAULT_STOCK_ITEMS = [
    {"item_name": "Fresh A-Grade Paneer", "unit": "kg", "current_stock": 25.0, "min_alert_threshold": 8.0, "cost_per_unit": 380.0},
    {"item_name": "Amul Pure Butter", "unit": "kg", "current_stock": 15.0, "min_alert_threshold": 5.0, "cost_per_unit": 520.0},
    {"item_name": "Royal Basmati Rice", "unit": "kg", "current_stock": 45.0, "min_alert_threshold": 12.0, "cost_per_unit": 160.0},
    {"item_name": "Makhani Gravy Base", "unit": "Liters", "current_stock": 18.0, "min_alert_threshold": 6.0, "cost_per_unit": 220.0},
    {"item_name": "Luxury Egyptian Cotton Towels", "unit": "units", "current_stock": 80.0, "min_alert_threshold": 25.0, "cost_per_unit": 450.0},
    {"item_name": "Espresso Bar Coffee Beans", "unit": "kg", "current_stock": 8.5, "min_alert_threshold": 3.0, "cost_per_unit": 1200.0},
    {"item_name": "Mineral Water Bottles (1L)", "unit": "units", "current_stock": 120.0, "min_alert_threshold": 40.0, "cost_per_unit": 25.0}
]

@router.get("/inventory")
async def list_inventory_items(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    """
    List all master raw ingredient & hotel stock inventory items.
    Seed default inventory items if table is empty.
    """
    result = await db.execute(select(InventoryItem).order_by(InventoryItem.id.asc()))
    items = result.scalars().all()
    
    if not items:
        for seed_data in DEFAULT_STOCK_ITEMS:
            inv = InventoryItem(**seed_data)
            db.add(inv)
        await db.commit()
        result = await db.execute(select(InventoryItem).order_by(InventoryItem.id.asc()))
        items = result.scalars().all()

    return [
        {
            "id": i.id,
            "item_name": i.item_name,
            "unit": i.unit,
            "current_stock": i.current_stock,
            "min_alert_threshold": i.min_alert_threshold,
            "cost_per_unit": i.cost_per_unit,
            "is_low": i.current_stock <= i.min_alert_threshold,
            "updated_at": i.updated_at.isoformat() if i.updated_at else None
        }
        for i in items
    ]

@router.put("/inventory/{item_id}/restock")
async def restock_inventory_item(
    item_id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    """
    Restock inventory item quantity (+10kg, +25L, etc.).
    """
    result = await db.execute(select(InventoryItem).where(InventoryItem.id == item_id))
    inv = result.scalars().first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    qty = float(payload.get("quantity", 10.0))
    inv.current_stock += qty
    await db.commit()
    await db.refresh(inv)

    return {
        "status": "success",
        "message": f"Successfully restocked {inv.item_name} by +{qty} {inv.unit}. New Stock: {inv.current_stock} {inv.unit}",
        "item": {
            "id": inv.id,
            "item_name": inv.item_name,
            "unit": inv.unit,
            "current_stock": inv.current_stock,
            "min_alert_threshold": inv.min_alert_threshold,
            "is_low": inv.current_stock <= inv.min_alert_threshold
        }
    }

# --- 6. MASTER CCTV CAMERA CONTROL & STREAM MANAGEMENT ---
DEFAULT_CAMERAS = [
    {
        "camera_code": "CAM-01",
        "name": "Main Hotel Gate & Entrance (CP Plus)",
        "location": "Ground Floor Lobby",
        "brand": "CP Plus",
        "stream_url": "rtsp://admin:pass@192.168.1.108:554/cam/realmonitor?channel=1&subtype=0",
        "status": "LIVE",
        "is_active": True,
        "fps": 30
    },
    {
        "camera_code": "CAM-02",
        "name": "Front Desk Reception & Foyer (Hikvision)",
        "location": "Lobby Level",
        "brand": "Hikvision",
        "stream_url": "rtsp://admin:pass@192.168.1.64:554/Streaming/Channels/101",
        "status": "LIVE",
        "is_active": True,
        "fps": 30
    },
    {
        "camera_code": "CAM-03",
        "name": "3rd Floor Royal Suites Corridor (Dahua)",
        "location": "East Wing",
        "brand": "Dahua",
        "stream_url": "rtsp://admin:pass@192.168.1.110:554/cam/realmonitor?channel=3&subtype=0",
        "status": "MOTION",
        "is_active": True,
        "fps": 25
    },
    {
        "camera_code": "CAM-04",
        "name": "Grand Banquet & Pool Terrace (Uniview)",
        "location": "Rooftop 5th Floor",
        "brand": "Uniview",
        "stream_url": "rtsp://admin:pass@192.168.1.150:554/unicast/c1/s0/live",
        "status": "LIVE",
        "is_active": True,
        "fps": 30
    }
]

@router.get("/cctv")
async def list_cctv_cameras(db: AsyncSession = Depends(get_db)):
    """
    List all master property CCTV camera stream feeds.
    Seed default cameras if table is empty.
    """
    result = await db.execute(select(CameraFeed).order_by(CameraFeed.id.asc()))
    cameras = result.scalars().all()
    
    if not cameras:
        for cam_data in DEFAULT_CAMERAS:
            cam = CameraFeed(**cam_data)
            db.add(cam)
        await db.commit()
        result = await db.execute(select(CameraFeed).order_by(CameraFeed.id.asc()))
        cameras = result.scalars().all()

    return [
        {
            "id": c.id,
            "camera_code": c.camera_code,
            "name": c.name,
            "location": c.location,
            "brand": c.brand,
            "stream_url": c.stream_url,
            "status": c.status,
            "is_active": c.is_active,
            "fps": c.fps,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in cameras
    ]

@router.post("/cctv", status_code=status.HTTP_201_CREATED)
async def add_cctv_camera(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    """
    Add a new CCTV camera feed stream (CP Plus, Hikvision, Dahua, ONVIF).
    """
    code = payload.get("camera_code", f"CAM-0{datetime.datetime.utcnow().microsecond % 90 + 10}")
    existing = await db.execute(select(CameraFeed).where(CameraFeed.camera_code == code))
    if existing.scalars().first():
        code = f"CAM-{datetime.datetime.utcnow().strftime('%M%S')}"

    cam = CameraFeed(
        camera_code=code,
        name=payload.get("name", "New Security Camera"),
        location=payload.get("location", "Lobby Level"),
        brand=payload.get("brand", "CP Plus"),
        stream_url=payload.get("stream_url", "rtsp://admin:pass@192.168.1.108:554/cam/realmonitor"),
        status="LIVE",
        is_active=True,
        fps=30
    )
    db.add(cam)
    await db.commit()
    await db.refresh(cam)

    return {
        "status": "success",
        "message": f"Camera '{cam.name}' ({cam.brand}) added successfully!",
        "camera": {
            "id": cam.id,
            "camera_code": cam.camera_code,
            "name": cam.name,
            "location": cam.location,
            "brand": cam.brand,
            "stream_url": cam.stream_url,
            "status": cam.status,
            "is_active": cam.is_active
        }
    }

@router.put("/cctv/{camera_id}/toggle")
async def toggle_cctv_camera(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    """
    Toggle CCTV camera stream ON / OFF.
    """
    result = await db.execute(select(CameraFeed).where(CameraFeed.id == camera_id))
    cam = result.scalars().first()
    if not cam:
        raise HTTPException(status_code=404, detail="CCTV Camera not found")

    cam.is_active = not cam.is_active
    cam.status = "LIVE" if cam.is_active else "OFFLINE"
    await db.commit()
    await db.refresh(cam)

    return {
        "status": "success",
        "message": f"Camera '{cam.name}' is now {'ONLINE' if cam.is_active else 'OFFLINE'}.",
        "camera_id": cam.id,
        "is_active": cam.is_active,
        "camera_status": cam.status
    }

@router.delete("/cctv/{camera_id}", status_code=status.HTTP_200_OK)
async def delete_cctv_camera(
    camera_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(admin_guard)
):
    """
    Delete a CCTV camera feed stream.
    """
    result = await db.execute(select(CameraFeed).where(CameraFeed.id == camera_id))
    cam = result.scalars().first()
    if not cam:
        raise HTTPException(status_code=404, detail="CCTV Camera not found")

    cam_name = cam.name
    await db.delete(cam)
    await db.commit()

    return {"status": "success", "message": f"Camera '{cam_name}' removed from surveillance wall."}
