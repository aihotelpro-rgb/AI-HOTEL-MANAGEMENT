from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import datetime

from app.database import get_db
from app.models import Room, Booking, Guest, FolioCharge, WhatsAppLog, User, HotelSettings, Ticket
from app.schemas import RoomResponse, RoomStatusUpdate, CheckInRequest, CheckOutResponse, WhatsAppLogResponse, CreateReservationRequest
from app.auth import RoleChecker, get_current_user

router = APIRouter(prefix="/api/v1/reception", tags=["Front Desk & Reception PMS"])

reception_guard = RoleChecker(["Admin", "Reception", "Executive"])

@router.get("/rooms", response_model=List[RoomResponse])
async def get_all_rooms(
    floor: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(reception_guard)
):
    query = select(Room)
    if floor:
        query = query.where(Room.floor == floor)
    if status_filter:
        query = query.where(Room.status == status_filter)
        
    query = query.order_by(Room.room_number.asc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/active-stays")
async def get_active_stays(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(reception_guard)
):
    result = await db.execute(
        select(Booking).options(joinedload(Booking.guest)).where(Booking.is_active == True).order_by(Booking.room_number.asc())
    )
    bookings = result.scalars().all()
    return [
        {
            "booking_id": b.id,
            "room_number": b.room_number,
            "guest_id": b.guest.id,
            "guest_name": b.guest.name,
            "guest_phone": b.guest.phone,
            "check_in": b.check_in.isoformat(),
            "check_out": b.check_out.isoformat(),
            "room_rate": b.room_rate,
            "vip_status": b.guest.vip_status
        }
        for b in bookings
    ]

@router.post("/check-in", status_code=status.HTTP_201_CREATED)
async def check_in_guest(
    request: CheckInRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(reception_guard)
):
    # 1. Verify Room
    result = await db.execute(select(Room).where(Room.room_number == request.room_number))
    room = result.scalars().first()
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {request.room_number} does not exist")
    if room.is_occupied:
        raise HTTPException(status_code=400, detail=f"Room {request.room_number} is already occupied")

    # 2. Guest Profile
    guest_result = await db.execute(select(Guest).where(Guest.phone == request.guest_phone))
    guest = guest_result.scalars().first()
    if not guest:
        guest = Guest(
            name=request.guest_name,
            phone=request.guest_phone,
            email=request.guest_email,
            vip_status=request.vip_status,
            nationality=request.nationality or "Indian",
            id_type=request.id_type or "Aadhaar Card",
            id_number=request.id_number,
            city_state_origin=request.city_state_origin,
            purpose_of_visit=request.purpose_of_visit or "Tourism & Leisure",
            gstin=request.gstin
        )
        db.add(guest)
        await db.flush()
    else:
        guest.name = request.guest_name
        guest.vip_status = request.vip_status
        guest.nationality = request.nationality or guest.nationality
        guest.id_type = request.id_type or guest.id_type
        if request.id_number:
            guest.id_number = request.id_number
        if request.city_state_origin:
            guest.city_state_origin = request.city_state_origin
        if request.purpose_of_visit:
            guest.purpose_of_visit = request.purpose_of_visit
        if request.gstin:
            guest.gstin = request.gstin

    # Booster #4: VIP Recognition & Guest History Radar
    prior_bookings_q = await db.execute(select(func.count(Booking.id)).where(Booking.guest_id == guest.id))
    prior_stay_count = prior_bookings_q.scalar() or 0
    if prior_stay_count > 0 or request.vip_status:
        guest.vip_status = True
        guest.notes = f"👑 VIP RETURNING GUEST ({prior_stay_count} prior stays). High-value guest record auto-flagged."

    # 3. Create Booking
    now = datetime.datetime.utcnow()
    check_out_date = now + datetime.timedelta(days=request.nights)
    booking = Booking(
        guest_id=guest.id,
        room_number=request.room_number,
        check_in=now,
        check_out=check_out_date,
        is_active=True,
        total_nights=request.nights,
        room_rate=request.room_rate or room.price_per_night
    )
    db.add(booking)
    await db.flush()

    # 4. Update Room
    room.is_occupied = True
    room.current_guest_name = guest.name
    room.status = "Clean"

    # 5. Post Initial Room Charge to Folio in ₹ INR
    total_room_cost = booking.room_rate * booking.total_nights
    folio_room = FolioCharge(
        booking_id=booking.id,
        charge_type="Room",
        description=f"Room Accommodation ({booking.total_nights} Nights @ ₹{booking.room_rate:,.2f}/night)",
        amount=total_room_cost,
        is_paid=False
    )
    db.add(folio_room)
    await db.flush()

    return {
        "status": "checked_in",
        "booking_id": booking.id,
        "room_number": room.room_number,
        "guest_name": guest.name,
        "check_in": booking.check_in.isoformat(),
        "check_out": booking.check_out.isoformat(),
        "total_room_charges": total_room_cost,
        "digital_key_url": f"/room-qr?room={room.room_number}"
    }

@router.post("/check-out/{booking_id}", response_model=CheckOutResponse)
async def check_out_guest(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(reception_guard)
):
    result = await db.execute(
        select(Booking).options(joinedload(Booking.guest)).where(Booking.id == booking_id)
    )
    booking = result.scalars().first()
    if not booking or not booking.is_active:
        raise HTTPException(status_code=400, detail="Active booking not found")

    charges_result = await db.execute(
        select(FolioCharge).where(FolioCharge.booking_id == booking_id)
    )
    charges = charges_result.scalars().all()
    
    total_room = sum(c.amount for c in charges if c.charge_type == "Room")
    total_dining = sum(c.amount for c in charges if c.charge_type == "Dining")
    total_amenity = sum(c.amount for c in charges if c.charge_type in ["Amenity", "Spa", "MiniBar"])
    subtotal = sum(c.amount for c in charges)
    gst_charges = round(subtotal * 0.12, 2)
    grand_total = subtotal + gst_charges

    for c in charges:
        c.is_paid = True

    booking.is_active = False

    room_result = await db.execute(select(Room).where(Room.room_number == booking.room_number))
    room = room_result.scalars().first()
    if room:
        room.is_occupied = False
        room.status = "Dirty"
        room.current_guest_name = None

    # Booster #1: Automated High-Priority Housekeeping Ticket Dispatch
    hk_ticket = Ticket(
        booking_id=booking.id,
        room_number=booking.room_number,
        category="Housekeeping",
        description=f"⚡ POST-CHECKOUT TURNOVER: Suite {booking.room_number} checked out by {booking.guest.name}. Perform complete deep clean & restocking.",
        priority="High",
        status="Pending"
    )
    db.add(hk_ticket)

    await db.flush()

    return {
        "booking_id": booking.id,
        "room_number": booking.room_number,
        "guest_name": booking.guest.name,
        "total_room_charges": total_room,
        "total_dining_charges": total_dining,
        "total_amenity_charges": total_amenity,
        "gst_charges": gst_charges,
        "grand_total": grand_total,
        "status": "Settled & Checked Out",
        "itemized_charges": [
            {
                "id": c.id,
                "type": c.charge_type,
                "description": c.description,
                "amount": c.amount
            }
            for c in charges
        ]
    }

@router.get("/whatsapp-feed", response_model=List[WhatsAppLogResponse])
async def get_whatsapp_feed(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(reception_guard)
):
    result = await db.execute(select(WhatsAppLog).order_by(WhatsAppLog.created_at.desc()).limit(30))
    return result.scalars().all()


# --- SECTION 4: GST TAX INVOICE GENERATOR & BILLING COMPLIANCE ---

from fastapi.responses import HTMLResponse

@router.get("/bookings/{booking_id}/invoice-data")
async def get_booking_invoice_data(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(reception_guard)
):
    """
    Returns structured GST Tax Invoice data for previewing in Reception PMS.
    """
    # Fetch hotel settings
    settings_res = await db.execute(select(HotelSettings).limit(1))
    settings = settings_res.scalars().first()

    # Fetch booking with guest
    result = await db.execute(
        select(Booking).options(joinedload(Booking.guest)).where(Booking.id == booking_id)
    )
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found")

    # Fetch folio charges
    charges_res = await db.execute(
        select(FolioCharge).where(FolioCharge.booking_id == booking_id)
    )
    charges = charges_res.scalars().all()

    subtotal = sum(c.amount for c in charges)
    cgst = round(subtotal * 0.06, 2)
    sgst = round(subtotal * 0.06, 2)
    total_tax = round(cgst + sgst, 2)
    advance_paid = getattr(booking, 'advance_paid', 0.0) or 0.0
    balance_due = max(0.0, grand_total - advance_paid)

    return {
        "invoice_number": f"INV-{datetime.datetime.utcnow().year}-{booking.id:05d}",
        "invoice_date": datetime.datetime.utcnow().strftime("%d-%b-%Y %H:%M"),
        "hotel_details": {
            "name": settings.hotel_name if settings else "The Grand Palace Resort & Spa",
            "gstin": (getattr(settings, 'gstin', None) or getattr(settings, 'tax_id', None) or "08AAAAA0000A1Z5"),
            "address": settings.address if settings else "Heritage Palace Road, Jaipur, Rajasthan 302001",
            "phone": settings.phone if settings else "+91 141 234 5678",
            "email": settings.email if settings else "reservations@grandpalace.in",
            "logo_url": settings.logo_url if settings else "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200"
        },
        "guest_details": {
            "name": booking.guest.name if booking.guest else "Guest",
            "phone": booking.guest.phone if booking.guest else "N/A",
            "email": (booking.guest.email if booking.guest else None) or "N/A",
            "vip_status": booking.guest.vip_status if booking.guest else False,
            "nationality": getattr(booking.guest, 'nationality', 'Indian') or 'Indian',
            "id_type": getattr(booking.guest, 'id_type', 'Aadhaar Card') or 'Aadhaar Card',
            "id_number": getattr(booking.guest, 'id_number', 'N/A') or 'N/A',
            "city_state_origin": getattr(booking.guest, 'city_state_origin', 'N/A') or 'N/A',
            "purpose_of_visit": getattr(booking.guest, 'purpose_of_visit', 'Tourism & Leisure') or 'Tourism & Leisure',
            "gstin": getattr(booking.guest, 'gstin', None)
        },
        "stay_details": {
            "booking_id": booking.id,
            "room_number": booking.room_number,
            "check_in": booking.check_in.strftime("%d-%b-%Y %H:%M"),
            "check_out": booking.check_out.strftime("%d-%b-%Y %H:%M"),
            "total_nights": booking.total_nights,
            "room_rate": booking.room_rate
        },
        "itemized_charges": [
            {
                "type": c.charge_type,
                "description": c.description,
                "amount": c.amount,
                "is_paid": c.is_paid
            }
            for c in charges
        ],
        "financial_summary": {
            "subtotal": subtotal,
            "cgst_percent": 6.0,
            "cgst_amount": cgst,
            "sgst_percent": 6.0,
            "sgst_amount": sgst,
            "total_gst": total_tax,
            "tax_rate_percent": 12.0,
            "grand_total": grand_total,
            "advance_deposit": advance_paid,
            "balance_due": balance_due,
            "currency_symbol": "₹",
            "currency_code": "INR",
            "payment_status": "PAID & SETTLED" if not booking.is_active else ("ADVANCE PARTIAL" if advance_paid > 0 else "PENDING SETTLEMENT")
        }
    }


@router.get("/bookings/{booking_id}/invoice", response_class=HTMLResponse)
async def print_gst_tax_invoice(
    booking_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Renders an official print-ready GST Tax Invoice HTML document with tax breakdown and hotel seal.
    """
    # Fetch hotel settings
    settings_res = await db.execute(select(HotelSettings).limit(1))
    settings = settings_res.scalars().first()

    result = await db.execute(
        select(Booking).options(joinedload(Booking.guest)).where(Booking.id == booking_id)
    )
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    charges_res = await db.execute(select(FolioCharge).where(FolioCharge.booking_id == booking_id))
    charges = charges_res.scalars().all()

    subtotal = sum(c.amount for c in charges)
    cgst = round(subtotal * 0.06, 2)
    sgst = round(subtotal * 0.06, 2)
    total_tax = round(cgst + sgst, 2)
    grand_total = round(subtotal + total_tax, 2)

    hotel_name = settings.hotel_name if settings else "The Grand Palace Resort & Spa"
    gstin = (getattr(settings, 'gstin', None) or getattr(settings, 'tax_id', None) or "08AAAAA0000A1Z5")
    address = settings.address if settings else "Heritage Palace Road, Jaipur, Rajasthan 302001"
    phone = settings.phone if settings else "+91 141 234 5678"
    email = settings.email if settings else "reservations@grandpalace.in"
    inv_no = f"INV-{datetime.datetime.utcnow().year}-{booking.id:05d}"
    inv_date = datetime.datetime.utcnow().strftime("%d-%b-%Y %H:%M")
    guest_name = booking.guest.name if booking.guest else "Valued Guest"
    guest_phone = booking.guest.phone if booking.guest else "N/A"
    guest_email = (booking.guest.email if booking.guest else None) or "N/A"

    rows_html = ""
    for i, c in enumerate(charges, 1):
        rows_html += f"""
        <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 10px; text-align: center;">{i}</td>
            <td style="padding: 10px;"><strong>{c.charge_type}</strong> - {c.description}</td>
            <td style="padding: 10px; text-align: center;">9963 / HSN</td>
            <td style="padding: 10px; text-align: right;">₹{c.amount:,.2f}</td>
        </tr>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>GST Tax Invoice - {inv_no}</title>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937; }}
            .invoice-box {{ max-width: 800px; margin: auto; padding: 30px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }}
            .header {{ display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #f59e0b; }}
            .badge {{ background: #dcfce7; color: #166534; font-weight: bold; padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-block; }}
            .grid-2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }}
            .card {{ background: #f9fafb; padding: 15px; border-radius: 12px; border: 1px solid #f3f4f6; font-size: 13px; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }}
            th {{ background: #111827; color: #ffffff; text-align: left; padding: 10px; }}
            .totals {{ margin-top: 20px; text-align: right; font-size: 14px; border-top: 2px solid #e5e7eb; padding-top: 15px; }}
            .footer {{ margin-top: 30px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; }}
            @media print {{
                body {{ background: #ffffff; padding: 0; }}
                .invoice-box {{ box-shadow: none; border: none; width: 100%; max-width: 100%; }}
                .no-print {{ display: none; }}
            }}
        </style>
    </head>
    <body>
        <div class="no-print" style="max-width: 800px; margin: 0 auto 15px auto; text-align: right;">
            <button onclick="window.print()" style="background: #f59e0b; color: #000; border: none; padding: 10px 20px; font-weight: bold; border-radius: 8px; cursor: pointer;">🖨️ Print Tax Invoice (PDF)</button>
        </div>
        <div class="invoice-box">
            <div class="header">
                <div>
                    <h1 style="margin: 0; font-size: 24px; color: #111827;">TAX INVOICE</h1>
                    <p style="margin: 5px 0 0 0; font-weight: bold; color: #d97706;">{hotel_name}</p>
                    <p style="margin: 2px 0; font-size: 12px; color: #4b5563;">GSTIN: <strong>{gstin}</strong></p>
                    <p style="margin: 2px 0; font-size: 11px; color: #6b7280;">{address}</p>
                    <p style="margin: 2px 0; font-size: 11px; color: #6b7280;">📞 {phone} | ✉️ {email}</p>
                </div>
                <div style="text-align: right;">
                    <span class="badge">ORIGINAL FOR RECIPIENT</span>
                    <h3 style="margin: 10px 0 2px 0; color: #111827;">{inv_no}</h3>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">Date: {inv_date}</p>
                </div>
            </div>

            <div class="grid-2">
                <div class="card">
                    <strong style="color: #d97706; text-transform: uppercase; font-size: 11px;">Billed To (Guest Details)</strong>
                    <h4 style="margin: 5px 0 2px 0; font-size: 15px;">{guest_name}</h4>
                    <p style="margin: 2px 0;">📞 {guest_phone}</p>
                    <p style="margin: 2px 0;">✉️ {guest_email}</p>
                </div>
                <div class="card">
                    <strong style="color: #d97706; text-transform: uppercase; font-size: 11px;">Stay Breakdown</strong>
                    <p style="margin: 5px 0 2px 0;">Suite Number: <strong>Suite {booking.room_number}</strong></p>
                    <p style="margin: 2px 0;">Check-In: <strong>{booking.check_in.strftime('%d-%b-%Y')}</strong></p>
                    <p style="margin: 2px 0;">Check-Out: <strong>{booking.check_out.strftime('%d-%b-%Y')} ({booking.total_nights} Nights)</strong></p>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 8%; text-align: center;">S.No</th>
                        <th>Item & Description</th>
                        <th style="width: 15%; text-align: center;">SAC Code</th>
                        <th style="width: 20%; text-align: right;">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>

            <div class="totals">
                <p style="margin: 4px 0;">Subtotal: <strong>₹{subtotal:,.2f}</strong></p>
                <p style="margin: 4px 0;">Central GST (CGST @ 6.0%): <strong>₹{cgst:,.2f}</strong></p>
                <p style="margin: 4px 0;">State GST (SGST @ 6.0%): <strong>₹{sgst:,.2f}</strong></p>
                <p style="margin: 4px 0; color: #d97706;">Total GST Tax (12.0%): <strong>₹{total_tax:,.2f}</strong></p>
                <h2 style="margin: 10px 0 0 0; color: #111827;">Grand Total: ₹{grand_total:,.2f}</h2>
                <p style="margin: 4px 0; font-size: 12px; color: #166534; font-weight: bold;">Status: PAID & SETTLED</p>
            </div>

            <div style="margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px;">
                <div>
                    <p style="margin: 0; color: #6b7280;">Terms: E. & O.E.</p>
                    <p style="margin: 2px 0; color: #6b7280;">Thank you for staying at {hotel_name}!</p>
                </div>
                <div style="text-align: center;">
                    <div style="border-bottom: 1px solid #111827; width: 180px; margin-bottom: 5px;"></div>
                    <p style="margin: 0; font-weight: bold; color: #111827;">Authorized Signatory</p>
                    <p style="margin: 2px 0; font-size: 10px; color: #6b7280;">(Digital Tax Seal Verified)</p>
                </div>
            </div>

            <div class="footer">
                This is a computer-generated tax invoice issued in accordance with GST Rule 46 of Indian Central Goods & Services Tax Rules, 2017.
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.get("/daily-bookings")
async def get_daily_bookings(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(reception_guard)
):
    """
    Advance 360° Calendar & Stayview Matrix Engine: Returns Past History, Present Active Stays,
    and Upcoming OTA/Direct Reservations across any selected date range.
    """
    now = datetime.datetime.utcnow()
    today_start = datetime.datetime(now.year, now.month, now.day)
    today_end = today_start + datetime.timedelta(days=1)

    query = select(Booking).options(joinedload(Booking.guest)).order_by(Booking.check_in.asc())
    bookings_res = await db.execute(query)
    all_bookings = bookings_res.scalars().all()

    filter_start = None
    filter_end = None
    if start_date:
        try:
            filter_start = datetime.datetime.strptime(start_date, "%Y-%m-%d")
        except Exception:
            pass
    if end_date:
        try:
            filter_end = datetime.datetime.strptime(end_date, "%Y-%m-%d") + datetime.timedelta(days=1)
        except Exception:
            pass

    arrivals = []
    departures = []
    upcoming = []
    past_history = []
    active_stays = []
    all_records = []

    for b in all_bookings:
        # Date Range Filter
        if filter_start and b.check_out < filter_start:
            continue
        if filter_end and b.check_in >= filter_end:
            continue

        guest_name = b.guest.name if b.guest else "Guest"
        guest_phone = b.guest.phone if b.guest else "N/A"
        guest_email = b.guest.email if b.guest else ""
        
        # Search Filter
        if search:
            s_lower = search.lower()
            if (s_lower not in guest_name.lower() and 
                s_lower not in guest_phone.lower() and 
                s_lower not in str(b.room_number)):
                continue

        b_status = "Checked-In" if b.is_active else ("Expected Arrival" if b.check_in >= today_start else "Completed Stay")

        b_data = {
            "booking_id": b.id,
            "room_number": b.room_number,
            "guest_id": b.guest.id if b.guest else None,
            "guest_name": guest_name,
            "guest_phone": guest_phone,
            "guest_email": guest_email,
            "channel": getattr(b, 'channel', None) or "Direct Website",
            "check_in": b.check_in.strftime("%Y-%m-%d"),
            "check_out": b.check_out.strftime("%Y-%m-%d"),
            "room_rate": b.room_rate,
            "is_active": b.is_active,
            "total_nights": b.total_nights,
            "status": b_status,
            "vip_status": b.guest.vip_status if b.guest else False
        }

        all_records.append(b_data)

        if b.is_active:
            active_stays.append(b_data)

        if b.check_in >= today_start and b.check_in < today_end and not b.is_active:
            arrivals.append(b_data)
        elif b.check_out >= today_start and b.check_out < today_end and b.is_active:
            departures.append(b_data)
        elif b.check_in >= today_start or b.is_active:
            upcoming.append(b_data)
        elif not b.is_active and b.check_out < today_start:
            past_history.append(b_data)

    return {
        "today_date": today_start.strftime("%Y-%m-%d"),
        "start_date": start_date or today_start.strftime("%Y-%m-%d"),
        "end_date": end_date or (today_start + datetime.timedelta(days=7)).strftime("%Y-%m-%d"),
        "arrivals_count": len(arrivals),
        "departures_count": len(departures),
        "total_bookings_count": len(all_records),
        "today_arrivals": arrivals,
        "today_departures": departures,
        "upcoming_reservations": upcoming,
        "past_history": past_history,
        "active_stays": active_stays,
        "all_bookings": all_records
    }


@router.post("/convert-booking-checkin/{booking_id}")
async def convert_booking_to_checkin(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(reception_guard)
):
    """
    Converts an advance OTA or Direct reservation into an active checked-in room.
    """
    res = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found")

    room_res = await db.execute(select(Room).where(Room.room_number == booking.room_number))
    room = room_res.scalars().first()
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {booking.room_number} does not exist")
    if room.is_occupied:
        raise HTTPException(status_code=400, detail=f"Suite {booking.room_number} is already occupied")

    # Update Room & Booking Status
    room.is_occupied = True
    room.status = "Occupied"
    booking.is_active = True

    await db.commit()
    await db.refresh(booking)

    return {
        "status": "success",
        "message": f"Booking #{booking_id} converted to active Check-In for Suite {booking.room_number}",
        "room_number": booking.room_number,
        "is_active": True
    }


@router.post("/reservations", status_code=status.HTTP_201_CREATED)
async def create_reservation(
    request: CreateReservationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(reception_guard)
):
    """
    Allows Front Desk to create a new reservation (Direct, Walk-In, Phone, or OTA).
    """
    # 1. Verify Room exists
    result = await db.execute(select(Room).where(Room.room_number == request.room_number))
    room = result.scalars().first()
    if not room:
        raise HTTPException(status_code=404, detail=f"Suite {request.room_number} does not exist")

    # 2. Parse Dates
    try:
        check_in_dt = datetime.datetime.strptime(request.check_in_date, "%Y-%m-%d")
        check_out_dt = datetime.datetime.strptime(request.check_out_date, "%Y-%m-%d")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    if check_out_dt <= check_in_dt:
        raise HTTPException(status_code=400, detail="Check-out date must be after check-in date")

    nights = (check_out_dt - check_in_dt).days or 1

    # 3. Guest Lookup or Create
    guest_result = await db.execute(select(Guest).where(Guest.phone == request.guest_phone))
    guest = guest_result.scalars().first()
    if not guest:
        guest = Guest(
            name=request.guest_name,
            phone=request.guest_phone,
            email=request.guest_email,
            vip_status=request.vip_status,
            notes=request.notes
        )
        db.add(guest)
        await db.flush()
    else:
        guest.name = request.guest_name
        if request.guest_email:
            guest.email = request.guest_email
        if request.vip_status:
            guest.vip_status = True

    # 4. Create Booking
    today_start = datetime.datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    is_active = (check_in_dt <= today_start <= check_out_dt)

    booking = Booking(
        guest_id=guest.id,
        room_number=request.room_number,
        check_in=check_in_dt,
        check_out=check_out_dt,
        is_active=is_active,
        total_nights=nights,
        room_rate=request.room_rate or room.price_per_night,
        channel=request.channel or "Direct Walk-In"
    )
    db.add(booking)
    await db.flush()

    if is_active:
        room.is_occupied = True
        room.current_guest_name = guest.name

    # Post Initial Room Charge to Folio
    total_room_cost = booking.room_rate * booking.total_nights
    folio_charge = FolioCharge(
        booking_id=booking.id,
        charge_type="Room",
        description=f"Room Accommodation ({booking.total_nights} Nights @ ₹{booking.room_rate:,.2f}/night)",
        amount=total_room_cost,
        is_paid=False
    )
    db.add(folio_charge)

    await db.commit()

    return {
        "status": "success",
        "message": f"Reservation #{booking.id} created successfully for {guest.name}",
        "booking_id": booking.id,
        "room_number": booking.room_number,
        "check_in": request.check_in_date,
        "check_out": request.check_out_date,
        "channel": booking.channel
    }


@router.delete("/bookings/{booking_id}/cancel")
async def cancel_reservation(
    booking_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(reception_guard)
):
    """
    Cancels a reservation and frees up the assigned room.
    """
    res = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    room_res = await db.execute(select(Room).where(Room.room_number == booking.room_number))
    room = room_res.scalars().first()
    if room and room.is_occupied and booking.is_active:
        room.is_occupied = False
        room.current_guest_name = None
        room.status = "Clean"

    booking.is_active = False
    await db.delete(booking)
    await db.commit()

    return {
        "status": "success",
        "message": f"Reservation #{booking_id} cancelled successfully"
    }


@router.post("/bookings/{booking_id}/add-charge")
async def add_folio_charge(
    booking_id: int,
    charge_type: str = "Amenity",
    description: str = "Misc Service Charge",
    amount: float = 500.0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(reception_guard)
):
    """
    Adds a custom extra charge (Laundry, Spa, Airport Pickup, MiniBar) to guest folio.
    """
    res = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    charge = FolioCharge(
        booking_id=booking_id,
        charge_type=charge_type,
        description=description,
        amount=amount,
        is_paid=False
    )
    db.add(charge)
    await db.commit()

    return {
        "status": "success",
        "message": f"Added ₹{amount} ({charge_type}) charge to Folio #{booking_id}",
        "charge_id": charge.id
    }


