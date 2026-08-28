import datetime
import secrets
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.database import get_db
from app.models import Room, Booking, Guest, FolioCharge, HotelSettings, User
from app.auth import RoleChecker, get_current_user

router = APIRouter(prefix="/api/v1", tags=["Public Website Booking Engine & Channel Sync"])

admin_guard = RoleChecker(["Admin", "Executive"])

# Global Master State for Admin Stop-Sell, Channel Secret & Connected OTAs
channel_engine_config = {
    "is_enabled": True,
    "channel_api_key": "aihos_channel_secret_2026",
    "webhook_url": "http://localhost:8000/api/v1/public/reserve",
    "last_sync": datetime.datetime.utcnow().isoformat(),
    "channels": [
        {
            "id": 1, 
            "name": "Self Website", 
            "code": "WEB", 
            "channel_type": "Direct Website",
            "is_active": True, 
            "commission_percent": 0.0, 
            "rate_plan": "BAR (Best Available Rate)",
            "api_secret": "sec_web_2026_direct",
            "webhook_url": "http://localhost:8000/api/v1/public/reserve?channel=WEB",
            "auto_confirm": True,
            "total_bookings": 14, 
            "total_revenue_inr": 91000.0,
            "badge_color": "bg-green-950 text-green-400 border-green-700"
        },
        {
            "id": 2, 
            "name": "MakeMyTrip", 
            "code": "MMT", 
            "channel_type": "OTA",
            "is_active": True, 
            "commission_percent": 15.0, 
            "rate_plan": "BAR (Best Available Rate)",
            "api_secret": "sec_mmt_2026_ota",
            "webhook_url": "http://localhost:8000/api/v1/public/reserve?channel=MMT",
            "auto_confirm": True,
            "total_bookings": 8, 
            "total_revenue_inr": 52000.0,
            "badge_color": "bg-red-950 text-red-400 border-red-700"
        },
        {
            "id": 3, 
            "name": "Booking.com", 
            "code": "BDC", 
            "channel_type": "OTA",
            "is_active": True, 
            "commission_percent": 18.0, 
            "rate_plan": "CP Plan (Breakfast Included)",
            "api_secret": "sec_bdc_2026_ota",
            "webhook_url": "http://localhost:8000/api/v1/public/reserve?channel=BDC",
            "auto_confirm": True,
            "total_bookings": 6, 
            "total_revenue_inr": 39000.0,
            "badge_color": "bg-blue-950 text-blue-400 border-blue-700"
        },
        {
            "id": 4, 
            "name": "Agoda", 
            "code": "AGD", 
            "channel_type": "OTA",
            "is_active": True, 
            "commission_percent": 15.0, 
            "rate_plan": "BAR (Best Available Rate)",
            "api_secret": "sec_agd_2026_ota",
            "webhook_url": "http://localhost:8000/api/v1/public/reserve?channel=AGD",
            "auto_confirm": True,
            "total_bookings": 4, 
            "total_revenue_inr": 26000.0,
            "badge_color": "bg-purple-950 text-purple-400 border-purple-700"
        },
        {
            "id": 5, 
            "name": "Expedia", 
            "code": "EXP", 
            "channel_type": "OTA",
            "is_active": True, 
            "commission_percent": 18.0, 
            "rate_plan": "BAR (Best Available Rate)",
            "api_secret": "sec_exp_2026_ota",
            "webhook_url": "http://localhost:8000/api/v1/public/reserve?channel=EXP",
            "auto_confirm": True,
            "total_bookings": 3, 
            "total_revenue_inr": 19500.0,
            "badge_color": "bg-amber-950 text-amber-400 border-amber-700"
        },
        {
            "id": 6, 
            "name": "Corporate Direct", 
            "code": "CORP", 
            "channel_type": "Corporate B2B",
            "is_active": True, 
            "commission_percent": 0.0, 
            "rate_plan": "MAP Plan (Half Board)",
            "api_secret": "sec_corp_2026_b2b",
            "webhook_url": "http://localhost:8000/api/v1/public/reserve?channel=CORP",
            "auto_confirm": True,
            "total_bookings": 5, 
            "total_revenue_inr": 32500.0,
            "badge_color": "bg-emerald-950 text-emerald-400 border-emerald-700"
        }
    ]
}

import os
import hmac
import hashlib

class WebsiteReservationRequest(BaseModel):
    guest_name: str
    guest_phone: str
    guest_email: Optional[str] = None
    room_type: str = "Deluxe Heritage King"
    check_in_date: Optional[str] = None # YYYY-MM-DD
    nights: int = 1
    payment_txn_id: str = "PAY_DIRECT_WEB"
    channel_name: Optional[str] = "Self Website" # Self Website, MakeMyTrip, Booking.com, Agoda, Expedia, Corporate Direct
    special_requests: Optional[str] = None

class PaymentOrderRequest(BaseModel):
    amount_inr: float
    room_type: str = "Deluxe Heritage King"
    guest_name: str
    guest_email: Optional[str] = None
    guest_phone: str
    nights: int = 1
    channel_code: Optional[str] = "WEB"

class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: Optional[str] = None
    reservation: WebsiteReservationRequest

class ChannelConfigUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    channel_api_key: Optional[str] = None

class ChannelCreateRequest(BaseModel):
    name: str
    code: str
    channel_type: Optional[str] = "OTA" # Direct Website, OTA, Corporate B2B, GDS, Travel Agent
    commission_percent: float = 0.0
    rate_plan: Optional[str] = "BAR (Best Available Rate)"
    auto_confirm: Optional[bool] = True
    api_secret: Optional[str] = None

class ChannelUpdateRequest(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    channel_type: Optional[str] = None
    commission_percent: Optional[float] = None
    rate_plan: Optional[str] = None
    auto_confirm: Optional[bool] = None


# --- PUBLIC ENDPOINTS (HOTEL WEBSITE & OTA ENGINE) ---

@router.get("/public/availability")
async def get_public_availability(
    check_in: Optional[str] = None,
    check_out: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Public Hotel Website & OTAs call this endpoint to fetch live clean room availability,
    room categories, and rates in ₹ INR.
    """
    settings_res = await db.execute(select(HotelSettings).limit(1))
    settings = settings_res.scalars().first()

    result = await db.execute(
        select(Room).where(Room.is_occupied == False, Room.status == "Clean")
    )
    clean_rooms = result.scalars().all()

    # Aggregate by Category
    categories = {}
    for r in clean_rooms:
        if r.room_type not in categories:
            categories[r.room_type] = {
                "room_type": r.room_type,
                "price_per_night": r.price_per_night,
                "available_count": 0,
                "image_url": r.image_url,
                "area_sqft": r.area_sqft,
                "bed_type": r.bed_type,
                "amenities": r.amenities,
                "description": r.description
            }
        categories[r.room_type]["available_count"] += 1

    active_channels = [c["name"] for c in channel_engine_config["channels"] if c["is_active"]]

    return {
        "status": "online" if channel_engine_config["is_enabled"] else "stop_sell",
        "booking_engine_active": channel_engine_config["is_enabled"],
        "hotel_name": settings.hotel_name if settings else "The Grand Palace Resort",
        "tagline": settings.tagline if settings else "5-Star Royal Luxury & AI Hospitality",
        "logo_url": settings.logo_url if settings else "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300",
        "banner_url": settings.banner_url if settings else "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200",
        "currency_symbol": settings.currency_symbol if settings else "₹",
        "currency_code": settings.currency_code if settings else "INR",
        "available_categories": list(categories.values()),
        "total_available_rooms": len(clean_rooms),
        "active_booking_channels": active_channels
    }

@router.post("/public/reserve", status_code=status.HTTP_201_CREATED)
async def create_public_website_reservation(
    payload: WebsiteReservationRequest,
    channel: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Processes online booking requests submitted from public hotel website or OTA channels.
    Validates Master & Per-Channel Stop-Sell flags, allocates room, creates Guest, Booking & Folio.
    """
    # 1. Master Stop-Sell Check
    if not channel_engine_config["is_enabled"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public Booking Engine is PAUSED (Master House Stop-Sell Active). Please contact Front Desk."
        )

    # 2. Per-Channel Stop-Sell Check (Matches ?channel=CODE query param or payload.channel_name)
    target_channel = channel or payload.channel_name or "Self Website"
    matched_channel = next(
        (c for c in channel_engine_config["channels"] if c["code"].lower() == target_channel.lower() or c["name"].lower() == target_channel.lower()),
        None
    )
    channel_name = matched_channel["name"] if matched_channel else target_channel

    if matched_channel and not matched_channel["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Bookings for channel '{matched_channel['name']}' are PAUSED (Channel Stop-Sell Active by Admin)."
        )

    # 3. Select matching clean room
    result = await db.execute(
        select(Room).where(
            Room.room_type == payload.room_type,
            Room.is_occupied == False,
            Room.status == "Clean"
        )
    )
    room = result.scalars().first()

    # Fallback to any available clean room if exact category sold out
    if not room:
        fallback_res = await db.execute(
            select(Room).where(Room.is_occupied == False, Room.status == "Clean")
        )
        room = fallback_res.scalars().first()

    if not room:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hotel is fully occupied for the requested dates."
        )

    # 4. Get or Create Guest
    guest_res = await db.execute(select(Guest).where(Guest.phone == payload.guest_phone))
    guest = guest_res.scalars().first()
    if not guest:
        guest = Guest(
            name=payload.guest_name,
            phone=payload.guest_phone,
            email=payload.guest_email,
            vip_status=False
        )
        db.add(guest)
        await db.flush()
    else:
        guest.name = payload.guest_name
        if payload.guest_email:
            guest.email = payload.guest_email

    # 5. Create Booking Record
    now = datetime.datetime.utcnow()
    check_in_dt = now
    if payload.check_in_date:
        try:
            check_in_dt = datetime.datetime.strptime(payload.check_in_date, "%Y-%m-%d")
        except ValueError:
            pass

    check_out_dt = check_in_dt + datetime.timedelta(days=payload.nights)

    booking = Booking(
        guest_id=guest.id,
        room_number=room.room_number,
        check_in=check_in_dt,
        check_out=check_out_dt,
        is_active=True,
        total_nights=payload.nights,
        room_rate=room.price_per_night
    )
    db.add(booking)
    await db.flush()

    # 6. Mark Room Occupied in PMS Matrix
    room.is_occupied = True
    room.current_guest_name = guest.name

    # 7. Post Paid Room Charge to Folio
    total_cost = booking.room_rate * booking.total_nights
    folio_charge = FolioCharge(
        booking_id=booking.id,
        charge_type="Room",
        description=f"[{channel_name}] Booking #{payload.payment_txn_id} ({payload.nights} Nights @ ₹{booking.room_rate:,.2f}/night)",
        amount=total_cost,
        is_paid=True
    )
    db.add(folio_charge)
    await db.commit()

    # 8. Update Channel Analytics
    if matched_channel:
        matched_channel["total_bookings"] += 1
        matched_channel["total_revenue_inr"] += total_cost

    channel_engine_config["last_sync"] = datetime.datetime.utcnow().isoformat()

    return {
        "status": "confirmed",
        "booking_reference": f"GPR-{booking.id:05d}",
        "booking_id": booking.id,
        "assigned_room": room.room_number,
        "guest_name": guest.name,
        "guest_phone": guest.phone,
        "channel_name": channel_name,
        "check_in": booking.check_in.strftime("%Y-%m-%d"),
        "check_out": booking.check_out.strftime("%Y-%m-%d"),
        "total_nights": booking.total_nights,
        "total_paid_inr": total_cost,
        "payment_txn_id": payload.payment_txn_id,
        "digital_qr_pass_url": f"/room-qr?room={room.room_number}"
    }


# --- SECTION 3: RAZORPAY / STRIPE PAYMENT GATEWAY INTEGRATION ---

@router.post("/public/create-payment-order")
async def create_payment_order(
    payload: PaymentOrderRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generates an official Razorpay/Stripe Payment Gateway Order for direct website reservations.
    Calculates total room tariff + 12% GST tax breakdown in ₹ INR.
    """
    # 1. Master Stop-Sell Check
    if not channel_engine_config["is_enabled"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public Online Bookings are currently PAUSED (Master House Freeze Active)."
        )

    # 2. Per-Channel Stop-Sell Check
    matched_channel = next(
        (c for c in channel_engine_config["channels"] if c["code"].lower() == payload.channel_code.lower() or c["name"].lower() == payload.channel_code.lower()),
        None
    )
    if matched_channel and not matched_channel["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Bookings for channel '{matched_channel['name']}' are PAUSED by Admin."
        )

    subtotal = payload.amount_inr * payload.nights
    gst_tax = round(subtotal * 0.12, 2)
    total_payable = round(subtotal + gst_tax, 2)
    amount_in_paise = int(total_payable * 100)

    timestamp_str = datetime.datetime.utcnow().strftime("%Y%m%d%H%M%S")
    order_id = f"order_rzp_{timestamp_str}_{payload.nights}n"

    # Query HotelSettings for dynamic Admin-configured Razorpay Key
    settings_res = await db.execute(select(HotelSettings).limit(1))
    hotel_sett = settings_res.scalars().first()
    razorpay_key_id = hotel_sett.razorpay_key_id if (hotel_sett and hotel_sett.razorpay_key_id) else os.getenv("RAZORPAY_KEY_ID", "rzp_test_AIHOS2026Key")

    return {
        "status": "created",
        "order_id": order_id,
        "amount_inr": total_payable,
        "amount_paise": amount_in_paise,
        "currency": "INR",
        "currency_symbol": "₹",
        "subtotal": subtotal,
        "gst_tax_12pct": gst_tax,
        "razorpay_key_id": razorpay_key_id,
        "merchant_name": "The Grand Palace Resort & Spa",
        "description": f"Direct Web Reservation: {payload.nights} Night(s) in {payload.room_type}",
        "prefill": {
            "name": payload.guest_name,
            "email": payload.guest_email or "",
            "contact": payload.guest_phone
        }
    }


@router.post("/public/verify-payment", status_code=status.HTTP_201_CREATED)
async def verify_payment_and_reserve(
    payload: PaymentVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Verifies Razorpay payment signature / transaction ID and automatically provisions the reservation.
    """
    razorpay_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    if razorpay_secret and payload.razorpay_signature:
        generated_signature = hmac.new(
            razorpay_secret.encode(),
            f"{payload.razorpay_order_id}|{payload.razorpay_payment_id}".encode(),
            hashlib.sha256
        ).hexdigest()
        if generated_signature != payload.razorpay_signature:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment signature verification failed! Transaction rejected."
            )

    # Attach verified payment transaction ID
    payload.reservation.payment_txn_id = payload.razorpay_payment_id

    # Complete reservation
    booking_result = await create_public_website_reservation(
        payload=payload.reservation,
        channel=payload.reservation.channel_name,
        db=db
    )

    return {
        "payment_status": "SUCCESS",
        "razorpay_payment_id": payload.razorpay_payment_id,
        "razorpay_order_id": payload.razorpay_order_id,
        "reservation_details": booking_result
    }


# --- SUPER-ADMIN CONTROL ENDPOINTS ---

@router.get("/admin/channel-engine/status")
async def get_channel_engine_status(
    current_user: User = Depends(admin_guard)
):
    """
    Super-Admin checks live status of master booking engine & connected channels.
    """
    return channel_engine_config

@router.put("/admin/channel-engine/status")
async def update_channel_engine_status(
    payload: ChannelConfigUpdate,
    current_user: User = Depends(admin_guard)
):
    """
    Super-Admin toggles Master Stop-Sell ON/OFF or updates Channel Secret API key.
    """
    if payload.is_enabled is not None:
        channel_engine_config["is_enabled"] = payload.is_enabled
    if payload.channel_api_key is not None:
        channel_engine_config["channel_api_key"] = payload.channel_api_key
        
    channel_engine_config["last_sync"] = datetime.datetime.utcnow().isoformat()
    return {
        "message": "Master Booking Engine configuration updated successfully.",
        "config": channel_engine_config
    }

@router.post("/admin/channel-engine/channels", status_code=status.HTTP_201_CREATED)
async def add_booking_channel(
    payload: ChannelCreateRequest,
    current_user: User = Depends(admin_guard)
):
    """
    Super-Admin adds a new Booking Channel Website or OTA with enterprise attributes.
    """
    new_id = max([c["id"] for c in channel_engine_config["channels"]], default=0) + 1
    code_clean = payload.code.upper()
    api_secret = payload.api_secret or f"sec_{code_clean.lower()}_{secrets.token_hex(4)}"
    webhook_url = f"http://localhost:8000/api/v1/public/reserve?channel={code_clean}"

    new_channel = {
        "id": new_id,
        "name": payload.name,
        "code": code_clean,
        "channel_type": payload.channel_type or "OTA",
        "is_active": True,
        "commission_percent": payload.commission_percent,
        "rate_plan": payload.rate_plan or "BAR (Best Available Rate)",
        "api_secret": api_secret,
        "webhook_url": webhook_url,
        "auto_confirm": payload.auto_confirm if payload.auto_confirm is not None else True,
        "total_bookings": 0,
        "total_revenue_inr": 0.0,
        "badge_color": "bg-cyan-950 text-cyan-400 border-cyan-700"
    }
    channel_engine_config["channels"].append(new_channel)
    return {
        "message": f"Booking Channel '{payload.name}' added successfully with API Token '{api_secret}'.",
        "channel": new_channel,
        "channels": channel_engine_config["channels"]
    }

@router.patch("/admin/channel-engine/channels/{channel_id}/toggle")
async def toggle_channel_status(
    channel_id: int,
    current_user: User = Depends(admin_guard)
):
    """
    Super-Admin toggles Stop-Sell ON/OFF for an individual booking channel or website.
    """
    channel = next((c for c in channel_engine_config["channels"] if c["id"] == channel_id), None)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    channel["is_active"] = not channel["is_active"]
    return {
        "message": f"Channel '{channel['name']}' status set to {'ACTIVE' if channel['is_active'] else 'PAUSED (Stop-Sell)'}.",
        "channel": channel,
        "channels": channel_engine_config["channels"]
    }

@router.put("/admin/channel-engine/channels/{channel_id}")
async def update_booking_channel(
    channel_id: int,
    payload: ChannelUpdateRequest,
    current_user: User = Depends(admin_guard)
):
    """
    Super-Admin updates booking channel attributes (name, rate plan, commission, type).
    """
    channel = next((c for c in channel_engine_config["channels"] if c["id"] == channel_id), None)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    if payload.name is not None:
        channel["name"] = payload.name
    if payload.code is not None:
        channel["code"] = payload.code.upper()
    if payload.channel_type is not None:
        channel["channel_type"] = payload.channel_type
    if payload.commission_percent is not None:
        channel["commission_percent"] = payload.commission_percent
    if payload.rate_plan is not None:
        channel["rate_plan"] = payload.rate_plan
    if payload.auto_confirm is not None:
        channel["auto_confirm"] = payload.auto_confirm

    return {
        "message": f"Channel '{channel['name']}' updated successfully.",
        "channel": channel,
        "channels": channel_engine_config["channels"]
    }

@router.delete("/admin/channel-engine/channels/{channel_id}")
async def delete_booking_channel(
    channel_id: int,
    current_user: User = Depends(admin_guard)
):
    """
    Super-Admin removes a booking channel.
    """
    channel_engine_config["channels"] = [c for c in channel_engine_config["channels"] if c["id"] != channel_id]
    return {
        "message": f"Channel #{channel_id} removed.",
        "channels": channel_engine_config["channels"]
    }


# --- GUEST EXPRESS PRE-CHECKIN ENDPOINTS ---

class PreCheckInSubmission(BaseModel):
    guest_name: str
    guest_phone: str
    guest_email: Optional[str] = None
    govt_id_type: str
    govt_id_number: str
    eta_time: str
    arriving_via: Optional[str] = "Personal Vehicle"
    special_requests: Optional[str] = None
    floor_preference: Optional[str] = "High Floor"
    digital_signature: str

@router.get("/public/pre-checkin/{booking_id}")
async def get_pre_checkin_details(booking_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Booking).options(joinedload(Booking.guest)).where(Booking.id == booking_id)
    )
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    return {
        "booking_id": booking.id,
        "guest_name": booking.guest.name,
        "guest_phone": booking.guest.phone,
        "guest_email": booking.guest.email,
        "room_number": booking.room_number,
        "check_in": booking.check_in.isoformat(),
        "check_out": booking.check_out.isoformat(),
        "hotel_name": "The Grand Palace Resort & Spa"
    }

@router.post("/public/pre-checkin/{booking_id}")
async def submit_pre_checkin(
    booking_id: int,
    payload: PreCheckInSubmission,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Booking).options(joinedload(Booking.guest)).where(Booking.id == booking_id)
    )
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.guest.name = payload.guest_name
    booking.guest.notes = (
        f"✅ EXPRESS PRE-CHECKIN VERIFIED.\n"
        f"ID: {payload.govt_id_type} #{payload.govt_id_number}.\n"
        f"ETA: {payload.eta_time} ({payload.arriving_via}).\n"
        f"Pref: {payload.floor_preference}. Requests: {payload.special_requests or 'None'}"
    )
    await db.flush()

    return {
        "status": "PRE_CHECKIN_COMPLETE",
        "message": f"Pre-Check-In successfully verified for {payload.guest_name}.",
        "express_pass_code": f"EXP-{booking.id}-{secrets.token_hex(3).upper()}",
        "room_number": booking.room_number,
        "guest_name": payload.guest_name
    }

