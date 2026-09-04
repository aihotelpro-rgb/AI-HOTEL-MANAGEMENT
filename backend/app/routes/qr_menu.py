from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import datetime

from app.database import get_db
from app.models import Booking, Order, Guest, FolioCharge, User, MenuItem, InventoryItem
from app.schemas import OrderCreate, OrderResponse, OrderStatusUpdate, FolioChargeResponse
from app.auth import RoleChecker, get_current_user

router = APIRouter(prefix="/api/v1/qr_menu", tags=["QR Menu & In-Room Ordering"])

# Default Initial Menu items in Indian Rupee (₹ INR)
DEFAULT_INDIAN_MENU = [
    {
        "id": 1,
        "name": "Murgh Malai Tikka & Mint Chutney",
        "category": "Starters",
        "price": 480.00,
        "prep_time": "15-20 min",
        "tags": ["Chef's Special", "Tandoori Special"],
        "description": "Tender chicken morsels marinated in rich cream, cashew paste, green cardamom, roasted in clay tandoor."
    },
    {
        "id": 2,
        "name": "Paneer Tikka Shashlik",
        "category": "Starters",
        "price": 420.00,
        "prep_time": "12-15 min",
        "tags": ["Pure Veg", "Tandoori"],
        "description": "Cottage cheese cubes marinated in Kashmiri chili and ajwain, skewered with bell peppers and Spanish onions."
    },
    {
        "id": 3,
        "name": "Royal Butter Chicken (Murgh Makhani)",
        "category": "Indian Mains",
        "price": 560.00,
        "prep_time": "20-25 min",
        "tags": ["Royal Mughlai", "Mildly Spiced"],
        "description": "Charcoal-grilled chicken simmered in a velvety tomato, honey, and churned butter gravy with kasuri methi."
    },
    {
        "id": 4,
        "name": "Dal Makhani Grand Palace",
        "category": "Indian Mains",
        "price": 380.00,
        "prep_time": "15 min",
        "tags": ["Pure Veg", "Signature Dish"],
        "description": "Slow-cooked black lentils simmered overnight for 24 hours with fresh cream, butter, and mild aromatic spices."
    },
    {
        "id": 5,
        "name": "Awadhi Dum Gosht Biryani",
        "category": "Biryani & Rice",
        "price": 640.00,
        "prep_time": "20-25 min",
        "tags": ["Chef's Recommendation", "Aromatic"],
        "description": "Fragrant aged Basmati rice layered with succulent tender mutton, saffron, kewra water, served with Burani Raita."
    },
    {
        "id": 6,
        "name": "Tandoori Garlic & Butter Naan Basket",
        "category": "Breads",
        "price": 140.00,
        "prep_time": "5-8 min",
        "tags": ["Fresh from Tandoor"],
        "description": "Assortment of Garlic Naan, Butter Naan, and Laccha Paratha baked fresh in high-heat clay tandoor."
    },
    {
        "id": 7,
        "name": "Gulab Jamun with Kesar Pista Rabdi",
        "category": "Desserts",
        "price": 240.00,
        "prep_time": "5 min",
        "tags": ["Warm & Sweet", "Vegetarian"],
        "description": "Golden fried milk dumplings soaked in cardamom saffron syrup, paired with slow-reduced pistachio rabdi."
    },
    {
        "id": 8,
        "name": "Royal Saffron Masala Chai & Cookies",
        "category": "Beverages",
        "price": 160.00,
        "prep_time": "5 min",
        "tags": ["Traditional", "Immunity Booster"],
        "description": "Assam black tea brewed with fresh ginger, crushed green cardamom, cinnamon, and Kashmiri saffron."
    }
]

@router.get("", response_model=List[dict])
async def get_menu(db: AsyncSession = Depends(get_db)):
    """
    Get all menu items available for in-room gourmet dining.
    Pulls from database MenuItem table or falls back to default menu.
    """
    result = await db.execute(select(MenuItem).where(MenuItem.is_available == True))
    db_items = result.scalars().all()
    
    if db_items and len(db_items) > 0:
        return [
            {
                "id": item.id,
                "name": item.name,
                "category": item.category,
                "price": item.price,
                "prep_time": item.prep_time,
                "tags": item.tags or [],
                "description": item.description
            }
            for item in db_items
        ]
    return DEFAULT_INDIAN_MENU

@router.get("/booking-by-room")
async def get_booking_by_room(room: str, db: AsyncSession = Depends(get_db)):
    """
    Check room number availability and return active booking.
    """
    result = await db.execute(
        select(Booking).options(joinedload(Booking.guest)).where(Booking.room_number == room, Booking.is_active == True)
    )
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active booking found for Suite {room}"
        )
    return {
        "booking_id": booking.id,
        "guest_name": booking.guest.name,
        "room_number": booking.room_number,
        "check_in": booking.check_in.isoformat(),
        "check_out": booking.check_out.isoformat(),
        "room_rate": booking.room_rate
    }

@router.post("/order", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(order_in: OrderCreate, db: AsyncSession = Depends(get_db)):
    """
    Place a room service order with initial 'Pending' status and auto-post to Guest Folio in ₹ INR.
    """
    result = await db.execute(
        select(Booking).options(joinedload(Booking.guest)).where(Booking.id == order_in.booking_id, Booking.is_active == True)
    )
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Active booking not found for order placement"
        )

    items_list = [item.model_dump() for item in order_in.items]

    # Create new order with estimated 25 min delivery window
    order = Order(
        booking_id=order_in.booking_id,
        items=items_list,
        total_price=order_in.total_price,
        status="Pending",
        estimated_minutes=25,
        special_instructions=order_in.special_instructions
    )
    db.add(order)
    await db.flush()

    # Automatically post charge to Guest Folio
    items_summary = ", ".join([f"{item['quantity']}x {item['name']}" for item in items_list])
    folio_charge = FolioCharge(
        booking_id=booking.id,
        charge_type="Dining",
        description=f"In-Room Dining (Order #{order.id}: {items_summary[:60]})",
        amount=order_in.total_price,
        is_paid=False
    )
    db.add(folio_charge)

    # Intelligent Raw Ingredient Stock Auto-Deduction
    for item in items_list:
        item_qty = item.get("quantity", 1)
        item_name = item.get("name", "").lower()

        if "paneer" in item_name:
            p_res = await db.execute(select(InventoryItem).where(InventoryItem.item_name.ilike("%paneer%")))
            p_item = p_res.scalars().first()
            if p_item:
                p_item.current_stock = max(0.0, round(p_item.current_stock - (0.25 * item_qty), 2))

        if "butter" in item_name or "makhani" in item_name:
            b_res = await db.execute(select(InventoryItem).where(InventoryItem.item_name.ilike("%butter%")))
            b_item = b_res.scalars().first()
            if b_item:
                b_item.current_stock = max(0.0, round(b_item.current_stock - (0.15 * item_qty), 2))

        if "rice" in item_name or "biryani" in item_name or "pulao" in item_name:
            r_res = await db.execute(select(InventoryItem).where(InventoryItem.item_name.ilike("%rice%")))
            r_item = r_res.scalars().first()
            if r_item:
                r_item.current_stock = max(0.0, round(r_item.current_stock - (0.35 * item_qty), 2))

    await db.flush()

    return order

@router.get("/orders", response_model=List[OrderResponse])
async def get_orders(
    booking_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Order).options(joinedload(Order.booking).joinedload(Booking.guest))
    if booking_id:
        query = query.where(Order.booking_id == booking_id)
    if status_filter:
        query = query.where(Order.status == status_filter)
    
    query = query.order_by(Order.created_at.desc())
    result = await db.execute(query)
    orders = result.scalars().all()

    # Enrich with room_number and guest_name from the booking join
    enriched = []
    for o in orders:
        d = {
            "id": o.id,
            "booking_id": o.booking_id,
            "items": o.items,
            "total_price": o.total_price,
            "status": o.status,
            "runner_name": o.runner_name,
            "estimated_minutes": o.estimated_minutes,
            "special_instructions": o.special_instructions,
            "created_at": o.created_at,
            "updated_at": o.updated_at,
            "delivered_at": o.delivered_at,
            "room_number": o.booking.room_number if o.booking else None,
            "guest_name": o.booking.guest.name if (o.booking and o.booking.guest) else None,
        }
        enriched.append(d)
    return enriched

@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order_by_id(order_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Order).options(joinedload(Order.booking).joinedload(Booking.guest)).where(Order.id == order_id)
    )
    o = result.scalars().first()
    if not o:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return {
        "id": o.id,
        "booking_id": o.booking_id,
        "items": o.items,
        "total_price": o.total_price,
        "status": o.status,
        "runner_name": o.runner_name,
        "estimated_minutes": o.estimated_minutes,
        "special_instructions": o.special_instructions,
        "created_at": o.created_at,
        "updated_at": o.updated_at,
        "delivered_at": o.delivered_at,
        "room_number": o.booking.room_number if o.booking else None,
        "guest_name": o.booking.guest.name if (o.booking and o.booking.guest) else None,
    }

@router.put("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Order).options(joinedload(Order.booking).joinedload(Booking.guest)).where(Order.id == order_id)
    )
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    
    order.status = status_update.status
    if status_update.runner_name:
        order.runner_name = status_update.runner_name
    if status_update.estimated_minutes:
        order.estimated_minutes = status_update.estimated_minutes
        
    if status_update.status == "Delivered":
        order.delivered_at = datetime.datetime.utcnow()
        order.estimated_minutes = 0
        
    await db.flush()
    return {
        "id": order.id,
        "booking_id": order.booking_id,
        "items": order.items,
        "total_price": order.total_price,
        "status": order.status,
        "runner_name": order.runner_name,
        "estimated_minutes": order.estimated_minutes,
        "special_instructions": order.special_instructions,
        "created_at": order.created_at,
        "updated_at": order.updated_at,
        "delivered_at": order.delivered_at,
        "room_number": order.booking.room_number if order.booking else None,
        "guest_name": order.booking.guest.name if (order.booking and order.booking.guest) else None,
    }

@router.get("/sales-history")
async def get_kitchen_sales_history(
    date_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Historical Kitchen Sales Analytics & Dish Breakdown.
    Provides Chef, GM, and Super-Admin with past sales records.
    """
    now = datetime.datetime.utcnow()
    query = select(Order).options(joinedload(Order.booking).joinedload(Booking.guest))
    
    if date_filter == "today":
        start_of_day = datetime.datetime(now.year, now.month, now.day)
        query = query.where(Order.created_at >= start_of_day)
    elif date_filter == "yesterday":
        yesterday_start = datetime.datetime(now.year, now.month, now.day) - datetime.timedelta(days=1)
        today_start = datetime.datetime(now.year, now.month, now.day)
        query = query.where(Order.created_at >= yesterday_start, Order.created_at < today_start)
    elif date_filter == "7days":
        start_7d = now - datetime.timedelta(days=7)
        query = query.where(Order.created_at >= start_7d)
    elif date_filter and len(date_filter) == 10:
        try:
            target_date = datetime.datetime.strptime(date_filter, "%Y-%m-%d")
            next_day = target_date + datetime.timedelta(days=1)
            query = query.where(Order.created_at >= target_date, Order.created_at < next_day)
        except ValueError:
            pass

    query = query.order_by(Order.created_at.desc())
    result = await db.execute(query)
    orders = result.scalars().all()

    total_orders = len(orders)
    total_sales_inr = sum(o.total_price for o in orders)
    delivered_orders = [o for o in orders if o.status == "Delivered"]
    pending_orders = [o for o in orders if o.status in ["Pending", "Preparing", "Out for Delivery"]]

    dish_sales = {}
    for order in orders:
        for item in (order.items or []):
            name = item.get("name", "Gourmet Dish")
            qty = item.get("quantity", 1)
            price = item.get("price", 0.0)
            if name not in dish_sales:
                dish_sales[name] = {"quantity": 0, "revenue": 0.0, "category": item.get("category", "General")}
            dish_sales[name]["quantity"] += qty
            dish_sales[name]["revenue"] += price * qty

    top_dishes = [
        {"name": k, "quantity": v["quantity"], "revenue": v["revenue"], "category": v["category"]}
        for k, v in sorted(dish_sales.items(), key=lambda x: x[1]["revenue"], reverse=True)
    ]

    return {
        "date_filter": date_filter or "all_time",
        "total_orders": total_orders,
        "total_sales_inr": total_sales_inr,
        "delivered_count": len(delivered_orders),
        "pending_count": len(pending_orders),
        "top_dishes": top_dishes,
        "recent_orders": [
            {
                "order_id": o.id,
                "booking_id": o.booking_id,
                "suite_number": o.booking.room_number if o.booking else "304",
                "guest_name": o.booking.guest.name if (o.booking and o.booking.guest) else "Guest",
                "total_price": o.total_price,
                "status": o.status,
                "items": o.items,
                "special_instructions": o.special_instructions,
                "created_at": o.created_at.isoformat(),
                "delivered_at": o.delivered_at.isoformat() if o.delivered_at else None
            }
            for o in orders
        ]
    }

@router.get("/folio/{booking_id}")
async def get_guest_folio(booking_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get all itemized folio charges for a stay in ₹ INR with GST calculation.
    """
    result = await db.execute(
        select(Booking).options(joinedload(Booking.guest)).where(Booking.id == booking_id)
    )
    booking = result.scalars().first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    
    charges_result = await db.execute(
        select(FolioCharge).where(FolioCharge.booking_id == booking_id).order_by(FolioCharge.created_at.asc())
    )
    charges = charges_result.scalars().all()
    
    total_room = sum(c.amount for c in charges if c.charge_type == "Room")
    total_dining = sum(c.amount for c in charges if c.charge_type == "Dining")
    total_amenity = sum(c.amount for c in charges if c.charge_type in ["Amenity", "Spa", "MiniBar"])
    subtotal = sum(c.amount for c in charges)
    
    # 12% GST standard on luxury hotel accommodation & dining
    gst_amount = round(subtotal * 0.12, 2)
    grand_total = subtotal + gst_amount

    return {
        "booking_id": booking.id,
        "guest_name": booking.guest.name,
        "room_number": booking.room_number,
        "room_rate": booking.room_rate,
        "total_room_charges": total_room,
        "total_dining_charges": total_dining,
        "total_amenity_charges": total_amenity,
        "subtotal": subtotal,
        "gst_charges": gst_amount,
        "grand_total": grand_total,
        "currency": "₹",
        "charges": [
            {
                "id": c.id,
                "charge_type": c.charge_type,
                "description": c.description,
                "amount": c.amount,
                "is_paid": c.is_paid,
                "created_at": c.created_at.isoformat()
            }
            for c in charges
        ]
    }


# --- SECTION 5: ESC/POS THERMAL KITCHEN TICKET PRINTER ENGINE ---

from fastapi.responses import HTMLResponse

@router.get("/orders/{order_id}/kitchen-ticket", response_class=HTMLResponse)
async def print_kitchen_ticket(order_id: int, db: AsyncSession = Depends(get_db)):
    """
    Renders an 80mm ESC/POS thermal printer ready Kitchen Order Ticket (KOT).
    Formats order items, station routing (Tandoori, Hot Kitchen, Bar), and chef notes.
    """
    result = await db.execute(
        select(Order).options(joinedload(Order.booking).joinedload(Booking.guest)).where(Order.id == order_id)
    )
    order = result.scalars().first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    timestamp_str = order.created_at.strftime("%d-%b-%Y %H:%M")
    room_number = order.booking.room_number if order.booking else "304"
    guest_name = order.booking.guest.name if (order.booking and order.booking.guest) else "Resident Guest"

    items_html = ""
    for item in order.items:
        qty = item.get("quantity", 1)
        name = item.get("name", "Gourmet Dish")
        price = item.get("price", 0.0)
        items_html += f"""
        <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; margin-bottom: 6px;">
            <span>{qty}x {name}</span>
            <span>₹{price * qty:.2f}</span>
        </div>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>KOT Ticket #{order.id:04d} - Suite {room_number}</title>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Courier New', Courier, monospace; width: 300px; margin: auto; padding: 10px; background: #fff; color: #000; }}
            .kot-box {{ border: 2px dashed #000; padding: 15px; border-radius: 8px; }}
            .header {{ text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 10px; }}
            .suite-title {{ font-size: 22px; font-weight: 900; text-align: center; margin: 10px 0; background: #000; color: #fff; padding: 6px; border-radius: 4px; }}
            .divider {{ border-top: 1px dashed #000; margin: 10px 0; }}
            .instructions {{ background: #e5e7eb; padding: 8px; border: 1px solid #000; font-size: 13px; font-weight: bold; margin-top: 10px; }}
            @media print {{
                body {{ width: 100%; margin: 0; padding: 0; }}
                .no-print {{ display: none; }}
            }}
        </style>
    </head>
    <body>
        <div class="no-print" style="text-align: center; margin-bottom: 10px;">
            <button onclick="window.print()" style="background: #000; color: #fff; border: none; padding: 8px 16px; font-weight: bold; cursor: pointer; border-radius: 4px;">🖨️ Print ESC/POS KOT</button>
        </div>
        <div class="kot-box">
            <div class="header">
                <h2 style="margin: 0; font-size: 18px;">KITCHEN ORDER TICKET (KOT)</h2>
                <p style="margin: 2px 0; font-size: 12px;">The Grand Palace Gourmet Kitchen</p>
                <p style="margin: 2px 0; font-size: 11px;">Date: {timestamp_str}</p>
            </div>

            <div class="suite-title">SUITE {room_number}</div>
            <p style="margin: 2px 0; font-size: 12px; text-align: center;">Guest: <strong>{guest_name}</strong> | KOT #{order.id:04d}</p>

            <div class="divider"></div>

            <div>
                {items_html}
            </div>

            <div class="divider"></div>

            {f'<div class="instructions">⚠️ CHEF NOTE: {order.special_instructions}</div>' if order.special_instructions else ''}

            <div style="text-align: right; font-size: 16px; font-weight: 900; margin-top: 10px;">
                TOTAL: ₹{order.total_price:,.2f}
            </div>

            <div style="text-align: center; font-size: 10px; margin-top: 15px; border-top: 1px solid #000; padding-top: 5px;">
                STATION: MAIN HOT KITCHEN & TANDOOR<br>
                *** END OF KOT TICKET ***
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

