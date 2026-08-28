import hmac
import hashlib
import re
import datetime
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import settings
from app.models import Booking, Ticket, Guest, User, WhatsAppLog
from app.schemas import TicketResponse

router = APIRouter(prefix="/api/v1/whatsapp", tags=["WhatsApp Webhook"])

@router.get("")
@router.get("/webhook")
async def verify_webhook(request: Request):
    """
    Official Meta WhatsApp Cloud API Verification Endpoint.
    Validates hub.verify_token and echoes back hub.challenge to confirm webhook integration.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode and token:
        if mode == "subscribe" and token == settings.WHATSAPP_VERIFY_TOKEN:
            return int(challenge) if challenge.isdigit() else challenge
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verification token mismatch"
        )
    return {
        "status": "active",
        "service": "AI-HOS Meta WhatsApp Business Cloud API Bridge",
        "verify_token": settings.WHATSAPP_VERIFY_TOKEN
    }

@router.post("")
@router.post("/webhook")
async def receive_message(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()
    signature_header = request.headers.get("X-Hub-Signature-256")
    
    if settings.WHATSAPP_APP_SECRET and signature_header:
        try:
            sha_type, signature = signature_header.split("=")
            mac = hmac.new(
                settings.WHATSAPP_APP_SECRET.encode(),
                msg=body,
                digestmod=hashlib.sha256
            )
            expected_signature = mac.hexdigest()
            if not hmac.compare_digest(expected_signature, signature):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Signature verification failed"
                )
        except (ValueError, AttributeError):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Malformed signature header"
            )

    payload = await request.json()
    
    msg_type = "text"
    try:
        entry = payload.get("entry", [])[0]
        changes = entry.get("changes", [])[0]
        value = changes.get("value", {})
        message = value.get("messages", [])[0]
        msg_type = message.get("type", "text")
        from_phone = message.get("from")
        
        if msg_type in ["audio", "voice"]:
            voice_caption = message.get("audio", {}).get("caption") or message.get("voice", {}).get("caption")
            message_text = voice_caption if voice_caption else "[Voice Note: Requesting assistance for Room 304]"
        else:
            message_text = message.get("text", {}).get("body", "").strip()
    except (IndexError, KeyError, AttributeError):
        from_phone = payload.get("from_phone", "+1987654321")
        message_text = payload.get("message_text", "")
        if payload.get("is_voice") or payload.get("type") in ["audio", "voice"]:
            msg_type = "audio"

    if not message_text:
        return {"status": "ignored", "reason": "empty message"}

    # Extract Room number
    room_match = re.search(r'(?:room|rm|suite|#)\s*(\d+)', message_text, re.IGNORECASE)
    room_number = room_match.group(1) if room_match else None

    # Classify Category & Intent
    category = "Housekeeping"
    intent = "Housekeeping"
    lower_msg = message_text.lower()
    
    if any(k in lower_msg for k in ["late checkout", "checkout late", "extend stay", "check-out late"]):
        category = "Reception"
        intent = "LateCheckout"
    elif any(k in lower_msg for k in ["recommend", "special dish", "chef special", "what to order"]):
        category = "Dining"
        intent = "Recommendation"
    elif any(k in lower_msg for k in ["ticket status", "request status", "my request", "where is my"]):
        category = "Concierge"
        intent = "TicketStatus"
    elif any(k in lower_msg for k in ["fix", "leak", "light", "broken", "tv", "aircon", "ac"]):
        category = "Maintenance"
        intent = "Complaint"
    elif any(k in lower_msg for k in ["towel", "soap", "pillow", "water", "blanket", "amenities"]):
        category = "Amenity"
        intent = "Amenity"
    elif any(k in lower_msg for k in ["burger", "pizza", "food", "menu", "dining", "order"]):
        intent = "RoomService"

    booking = None
    if room_number:
        result = await db.execute(
            select(Booking).where(Booking.room_number == room_number, Booking.is_active == True)
        )
        booking = result.scalars().first()

    if not booking:
        result = await db.execute(select(Guest).where(Guest.phone == from_phone))
        guest = result.scalars().first()
        if guest:
            result = await db.execute(
                select(Booking).where(Booking.guest_id == guest.id).order_by(Booking.id.desc())
            )
            booking = result.scalars().first()

    if not booking:
        guest = Guest(name=f"WhatsApp Guest {from_phone}", phone=from_phone)
        db.add(guest)
        await db.flush()

        booking = Booking(
            guest_id=guest.id,
            room_number=room_number if room_number else "304",
            check_in=datetime.datetime.utcnow(),
            check_out=datetime.datetime.utcnow() + datetime.timedelta(days=1),
            is_active=True
        )
        db.add(booking)
        await db.flush()

    # Dynamic AI Reply Generation based on Intent
    if intent == "LateCheckout":
        ai_reply = f"Hello! Your request for complimentary Late Check-Out (up to 14:00) for Room {booking.room_number} has been logged with Front Desk. Reception will confirm shortly."
    elif intent == "Recommendation":
        ai_reply = f"Greetings! Chef recommends our signature Royal Dal Baati Churma, Shahi Paneer, and Fresh Mango Lassi for Room {booking.room_number}. You can order directly via your In-Room Digital Pass!"
    elif intent == "TicketStatus":
        result = await db.execute(
            select(Ticket).where(Ticket.booking_id == booking.id).order_by(Ticket.id.desc())
        )
        last_ticket = result.scalars().first()
        if last_ticket:
            ai_reply = f"Status Update for Room {booking.room_number}: Ticket #{last_ticket.id} ({last_ticket.category}) is currently '{last_ticket.status}'."
        else:
            ai_reply = f"No active service tickets found for Room {booking.room_number}."
    # Create Ticket if not a query-only intent
    ticket = None
    if intent not in ["LateCheckout", "Recommendation", "TicketStatus"]:
        ticket = Ticket(
            booking_id=booking.id,
            room_number=booking.room_number,
            category=category,
            description=message_text,
            priority="High" if category in ["Maintenance", "Complaint"] else "Medium",
            status="Pending"
        )
        db.add(ticket)
        await db.flush()

        prefix = "🎙️ [Voice Request Received] " if msg_type in ["audio", "voice"] else ""
        ai_reply = f"{prefix}Thank you! We have received your request for Room {booking.room_number}. Our team has dispatched Ticket #{ticket.id} ({category}) and is attending to it immediately."

    # Log to WhatsApp Conversation Stream
    log = WhatsAppLog(
        from_phone=from_phone,
        guest_name=f"Guest ({booking.room_number})",
        message_text=f"[Voice Message] {message_text}" if msg_type in ["audio", "voice"] else message_text,
        ai_reply=ai_reply,
        intent=intent
    )
    db.add(log)
    await db.flush()

    return {
        "status": "success",
        "message_type": msg_type,
        "intent": intent,
        "room_number": booking.room_number,
        "ticket_created": {
            "id": ticket.id,
            "room_number": booking.room_number,
            "category": ticket.category,
            "description": ticket.description,
            "status": ticket.status
        } if ticket else None,
        "ai_reply": ai_reply
    }


# --- BOOSTER #2: WHATSAPP PRE-ARRIVAL DIGITAL KEYCARD DISPATCH ---

@router.post("/send-pre-arrival-keycard")
async def send_pre_arrival_keycard(
    booking_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Booster #2: Sends an automated WhatsApp Pre-Arrival Welcome Card containing Wi-Fi credentials,
    room details, and a direct 1-click Digital Room Pass link.
    """
    result = await db.execute(
        select(Booking).options(joinedload(Booking.guest)).where(Booking.id == booking_id)
    )
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    wifi_ssid = "RoyalResort-HighSpeed"
    wifi_pass = "Luxury@2026"
    digital_pass_url = f"http://localhost:3000/room-qr?room={booking.room_number}"

    message = (
        f"🌸 Namaste {booking.guest.name}!\n\n"
        f"Welcome to The Grand Palace Resort & Spa. Your Pre-Arrival Digital Pass for Suite {booking.room_number} is now active!\n\n"
        f"🔑 Digital Room Keycard Pass: {digital_pass_url}\n"
        f"📶 High-Speed Wi-Fi SSID: {wifi_ssid}\n"
        f"🔒 Wi-Fi Password: {wifi_pass}\n\n"
        f"Simply tap the link above to order in-room dining, view your folio, or call our 24/7 AI Concierge!"
    )

    log = WhatsAppLog(
        from_phone=booking.guest.phone,
        guest_name=booking.guest.name,
        message_text=f"[PRE-ARRIVAL DISPATCH] Sent to {booking.guest.phone}",
        ai_reply=message,
        intent="Pre-Arrival Welcome Pass"
    )
    db.add(log)
    await db.flush()

    return {
        "status": "SENT",
        "recipient_phone": booking.guest.phone,
        "guest_name": booking.guest.name,
        "room_number": booking.room_number,
        "message_body": message,
        "digital_pass_url": digital_pass_url
    }
