import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.database import get_db
from app.models import Booking, Ticket, Guest, Order, FolioCharge
from app.schemas import ConciergeChatRequest, ConciergeChatResponse
from app.config import settings

# LangChain integration if present
try:
    from langchain_openai import ChatOpenAI
    from langchain.schema import SystemMessage, HumanMessage
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False

router = APIRouter(prefix="/api/v1/concierge", tags=["AI In-Room Concierge"])

HOTEL_KNOWLEDGE = {
    "wifi": "Complimentary high-speed resort Wi-Fi is available across all suites and public areas. Network: 'AI-HOS-Guest' (No password required; simply accept terms on connecting).",
    "breakfast": "The Grand Horizon Breakfast Buffet is served daily from 06:30 AM to 10:30 AM on the 1st Floor Restaurant Terrace.",
    "pool": "The Infinity Pool & Sun Deck are open from 07:00 AM to 10:00 PM on the 5th Floor Rooftop.",
    "gym": "The 24/7 Wellness Center & Fitness Suite is located on Floor 2. Your room digital pass provides 24-hour access.",
    "spa": "The Lotus Sanctuary Spa is open daily from 09:00 AM to 08:00 PM on Floor 2. Dial 400 from your room or request a session here to book.",
    "checkout": "Standard check-out time is 11:00 AM. Late check-out until 02:00 PM is subject to availability upon request at reception.",
    "room_service": "24/7 In-Room Gourmet Dining is available via the 'Dining Menu' tab on your app. Orders are prepared fresh and delivered in ~20-25 minutes."
}

@router.post("/chat", response_model=ConciergeChatResponse)
async def concierge_chat(request: ConciergeChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Conversational AI In-Room Assistant for hotel guests.
    Answers FAQs, provides local recommendations, and automatically executes service requests.
    """
    user_msg = request.message.strip().lower()
    
    # 1. Fetch active booking
    booking = None
    if request.booking_id:
        result = await db.execute(select(Booking).where(Booking.id == request.booking_id, Booking.is_active == True))
        booking = result.scalars().first()
    if not booking:
        result = await db.execute(select(Booking).where(Booking.room_number == request.room_number, Booking.is_active == True))
        booking = result.scalars().first()

    action_taken = None
    action_data = None
    suggested_actions = ["Order In-Room Dining", "Request Fresh Towels", "Pool & Spa Hours", "Late Checkout Inquiry"]

    # 2. Check for Housekeeping / Amenity Dispatch Request
    if any(k in user_msg for k in ["towel", "blanket", "pillow", "soap", "shampoo", "clean my room", "water bottle", "amenity", "toiletries", "iron"]):
        if booking:
            ticket = Ticket(
                booking_id=booking.id,
                room_number=request.room_number,
                category="Amenity" if any(k in user_msg for k in ["towel", "water", "soap", "pillow", "blanket"]) else "Housekeeping",
                description=f"AI Concierge Request for Room {request.room_number}: {request.message}",
                priority="Medium",
                status="Pending"
            )
            db.add(ticket)
            await db.flush()
            
            action_taken = "ticket_dispatched"
            action_data = {"ticket_id": ticket.id, "category": ticket.category}
            reply = f"Sure! I have informed our Housekeeping team to deliver this to Room {request.room_number}. Our staff member will reach your room in about 8 to 10 minutes."
            return {
                "reply": reply,
                "suggested_actions": ["Check Service Status", "Order Food & Drinks", "Wi-Fi Password"],
                "action_taken": action_taken,
                "data": action_data
            }

    # 3. Check for Maintenance Issue
    if any(k in user_msg for k in ["broken", "leak", "ac not working", "aircon", "air conditioning", "tv", "light", "not cooling", "noise"]):
        if booking:
            ticket = Ticket(
                booking_id=booking.id,
                room_number=request.room_number,
                category="Maintenance",
                description=f"AI Concierge Request for Room {request.room_number}: {request.message}",
                priority="High",
                status="Pending"
            )
            db.add(ticket)
            await db.flush()
            
            action_taken = "ticket_dispatched"
            action_data = {"ticket_id": ticket.id, "category": "Maintenance"}
            reply = f"Really sorry for the trouble! I have logged an urgent complaint (#M-{ticket.id}) for Room {request.room_number}. Our technician is coming right away."
            return {
                "reply": reply,
                "suggested_actions": ["Call Reception", "Housekeeping Help"],
                "action_taken": action_taken,
                "data": action_data
            }

    # 4. Check for Food Ordering query
    if any(k in user_msg for k in ["burger", "pizza", "salmon", "salad", "fries", "food", "menu", "hungry", "dessert", "coffee", "paneer"]):
        return {
            "reply": "Our Kitchen Chef is ready for your order! You can check our full food menu on the 'Food Menu' tab or tell me what you would like to eat.",
            "suggested_actions": ["Open Food Menu", "Order Paneer Tikka", "Order Dal Makhani", "Chef Specials"],
            "action_taken": "browse_menu"
        }

    # 5. Check FAQ Knowledge Base
    if "wifi" in user_msg or "wi-fi" in user_msg or "internet" in user_msg:
        return {"reply": HOTEL_KNOWLEDGE["wifi"], "suggested_actions": suggested_actions}
    if "breakfast" in user_msg or "morning buffet" in user_msg or "dining time" in user_msg:
        return {"reply": HOTEL_KNOWLEDGE["breakfast"], "suggested_actions": suggested_actions}
    if "pool" in user_msg or "swim" in user_msg:
        return {"reply": HOTEL_KNOWLEDGE["pool"], "suggested_actions": suggested_actions}
    if "gym" in user_msg or "fitness" in user_msg or "workout" in user_msg:
        return {"reply": HOTEL_KNOWLEDGE["gym"], "suggested_actions": suggested_actions}
    if "spa" in user_msg or "massage" in user_msg:
        return {"reply": HOTEL_KNOWLEDGE["spa"], "suggested_actions": suggested_actions}
    if "checkout" in user_msg or "check-out" in user_msg or "leave" in user_msg:
        return {"reply": HOTEL_KNOWLEDGE["checkout"], "suggested_actions": suggested_actions}

    # 6. LLM Generation (OpenAI GPT-4o) if configured
    has_api_key = settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock-key")
    if LANGCHAIN_AVAILABLE and has_api_key:
        try:
            llm = ChatOpenAI(model_name="gpt-4o", temperature=0.7, openai_api_key=settings.OPENAI_API_KEY)
            system_prompt = f"""You are the friendly AI Assistant at Grand AI Hotel Resort.
Guest is in Room {request.room_number}.
Hotel Details:
- Free High-Speed Wi-Fi: AI-HOS-Guest (Password: Welcome123).
- Breakfast Time: 06:30 AM to 10:30 AM (Floor 1 Dining Hall).
- Swimming Pool: 07:00 AM to 10:00 PM (Floor 5 Rooftop).
- Gym & Fitness: Open 24/7 (Floor 2).
- Spa & Massage: 09:00 AM to 08:00 PM (Floor 2).
- Check-out Time: 11:00 AM.
Speak in simple, polite, helpful, and clear Indian Standard English. Keep responses short and easy to understand."""
            response = await llm.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=request.message)])
            return {
                "reply": response.content,
                "suggested_actions": suggested_actions
            }
        except Exception:
            pass

    # 7. Default Fallback
    return {
        "reply": f"Good day! As your dedicated AI Concierge for Room {request.room_number}, I am delighted to assist you with gourmet in-room dining, fresh amenities, spa appointments, or any questions about your stay. How may I make your visit more comfortable today?",
        "suggested_actions": suggested_actions
    }

@router.get("/folio/{room_number}")
async def get_room_folio(room_number: str, db: AsyncSession = Depends(get_db)):
    """
    Fetch live itemized folio breakdown for guest in room_number.
    """
    result = await db.execute(select(Booking).where(Booking.room_number == room_number, Booking.is_active == True))
    booking = result.scalars().first()
    if not booking:
        return {
            "room_number": room_number,
            "guest_name": "Valued Guest",
            "charges": [
                {"description": "Royal Executive Suite Stay (1 Night)", "amount": 4500.0, "charge_type": "Room"},
                {"description": "Gourmet Butter Chicken & Naan (In-Room)", "amount": 650.0, "charge_type": "Dining"}
            ],
            "total_amount": 5150.0,
            "is_active": False
        }
    
    charges_q = await db.execute(select(FolioCharge).where(FolioCharge.booking_id == booking.id))
    charges = charges_q.scalars().all()
    
    itemized = [
        {
            "description": c.description,
            "amount": c.amount,
            "charge_type": c.charge_type,
            "created_at": c.created_at.isoformat() if c.created_at else None
        }
        for c in charges
    ]
    
    total = sum(c.amount for c in charges) if charges else (booking.total_amount or 4500.0)
    
    return {
        "booking_id": booking.id,
        "room_number": booking.room_number,
        "guest_name": f"{booking.guest.first_name} {booking.guest.last_name}" if booking.guest else "Valued Guest",
        "charges": itemized if itemized else [{"description": "Royal Executive Suite Stay", "amount": total, "charge_type": "Room"}],
        "total_amount": total,
        "is_active": booking.is_active
    }

@router.post("/express-checkout")
async def express_checkout(payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    """
    Execute guest self-express checkout from in-room PWA portal.
    """
    room_number = payload.get("room_number", "304")
    result = await db.execute(select(Booking).where(Booking.room_number == room_number, Booking.is_active == True))
    booking = result.scalars().first()
    if booking:
        booking.is_active = False
        booking.status = "CheckedOut"
    
    hk_ticket = Ticket(
        room_number=room_number,
        category="Housekeeping",
        description=f"Express Guest Checkout completed via PWA. Immediate deep cleaning required for Room {room_number}.",
        priority="High",
        status="Cleaning"
    )
    db.add(hk_ticket)
    await db.commit()
    
    return {
        "status": "success",
        "message": f"Express check-out completed for Suite {room_number}. We hope you had a royal stay!",
        "room_number": room_number
    }
