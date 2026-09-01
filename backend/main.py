import logging
import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.future import select

from app.database import engine, Base, AsyncSessionLocal
from app.models import (
    User, Room, Guest, Booking, Order, Ticket, FolioCharge, HotelSettings, MenuItem,
    Property, RoomType, RatePlan, OtaChannel, OtaCredential, ChannelMapping, RateMapping
)
from app.auth import get_password_hash
from app.routes import auth_routes, qr_menu, reception, housekeeping, concierge, whatsapp, executive, admin, public_booking, channel_routes, ota_webhooks
from app.crypto import encrypt_credential

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-hos")

app = FastAPI(
    title="AI-HOS Enterprise Suite (₹ INR Edition)",
    description="Full-Fledged AI Hotel Operating System with Rich Media, Indian Pricing, PMS, KDS, AI Concierge & Super-Admin Control",
    version="2.1.0",
)

from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from app.config import settings

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global Exception on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

# Production Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

app.add_middleware(SecurityHeadersMiddleware)

app.include_router(auth_routes.router)
app.include_router(admin.router)
app.include_router(qr_menu.router)
app.include_router(reception.router)
app.include_router(housekeeping.router)
app.include_router(concierge.router)
app.include_router(whatsapp.router)
app.include_router(executive.router)
app.include_router(public_booking.router)
app.include_router(channel_routes.router)
app.include_router(ota_webhooks.router)

from sqlalchemy import text

@app.on_event("startup")
async def startup_event():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Safe column migration for SQLite fallback
        if "sqlite" in settings.DATABASE_URL:
            async with engine.begin() as conn:
                try:
                    await conn.execute(text("ALTER TABLE bookings ADD COLUMN channel VARCHAR DEFAULT 'Direct Website'"))
                except Exception:
                    pass # Column already exists

        async with AsyncSessionLocal() as session:
            result = await session.execute(select(User).limit(1))
            user = result.scalars().first()
            if not user:
                logger.info("Initializing Seed Data for AI-HOS Enterprise Suite...")
            
            # 1. Hotel Settings & Visual Branding
            settings = HotelSettings(
                hotel_name="The Grand Palace Resort & Heritage Spa",
                tagline="5-Star Royal Luxury & AI Hospitality",
                logo_url="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300",
                banner_url="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200",
                currency_symbol="₹",
                currency_code="INR",
                gstin="07AAAAA0000A1Z5",
                gst_percent=12.0,
                phone="+91 98765 43210",
                email="concierge@grandpalace.in",
                address="1 Palace Road, Jaipur, Rajasthan 302001, India",
                wifi_ssid="RoyalResort-HighSpeed",
                wifi_password="Luxury@2026"
            )
            session.add(settings)
            await session.flush()

            # 2. Staff HR Profiles
            staff_users = [
                User(
                    username="admin", 
                    password_hash=get_password_hash("adminpassword"), 
                    role="Admin",
                    full_name="Maharani Gayatri Devi",
                    employee_id="EMP-0001",
                    phone="+91 98111 00001",
                    email="admin@grandpalace.in",
                    avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
                    shift="General Management (09:00 - 18:00)",
                    emergency_contact="+91 98111 99999"
                ),
                User(
                    username="reception", 
                    password_hash=get_password_hash("receptionpassword"), 
                    role="Reception",
                    full_name="Aarav Sharma",
                    employee_id="EMP-1021",
                    phone="+91 98222 00002",
                    email="frontdesk@grandpalace.in",
                    avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
                    shift="Morning Shift (07:00 - 15:30)",
                    emergency_contact="+91 98222 99999"
                ),
                User(
                    username="kitchen", 
                    password_hash=get_password_hash("kitchenpassword"), 
                    role="Kitchen",
                    full_name="Executive Chef Ranveer Brar",
                    employee_id="EMP-2045",
                    phone="+91 98333 00003",
                    email="kitchen@grandpalace.in",
                    avatar_url="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150",
                    shift="All-Day Dining (11:00 - 23:00)",
                    emergency_contact="+91 98333 99999"
                ),
                User(
                    username="housekeeping", 
                    password_hash=get_password_hash("housekeepingpassword"), 
                    role="Housekeeping",
                    full_name="Sunita Rawat",
                    employee_id="EMP-3012",
                    phone="+91 98444 00004",
                    email="housekeeping@grandpalace.in",
                    avatar_url="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
                    shift="Morning Shift (07:00 - 15:30)",
                    emergency_contact="+91 98444 99999"
                ),
                User(
                    username="manager", 
                    password_hash=get_password_hash("managerpassword"), 
                    role="Executive",
                    full_name="Vikramaditya Rathore",
                    employee_id="EMP-0010",
                    phone="+91 98555 00005",
                    email="gm@grandpalace.in",
                    avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
                    shift="Executive Stand-Up (07:30 - 19:30)",
                    emergency_contact="+91 98555 99999"
                )
            ]
            session.add_all(staff_users)
            await session.flush()

            # 3. Gourmet Indian Menu Items with Photos & Nutrition
            menu_to_seed = [
                MenuItem(
                    name="Murgh Malai Tikka & Mint Chutney",
                    category="Starters",
                    price=480.0,
                    prep_time="15-20 min",
                    image_url="https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600",
                    portion_size="Serves 1-2 (6 pcs)",
                    spice_level="Mild (🌶️)",
                    calories="380 kcal",
                    allergens=["Contains Dairy", "Contains Nuts"],
                    description="Tender chicken morsels marinated in rich cream, cashew paste, green cardamom, roasted in clay tandoor.",
                    tags=["Chef's Special", "Tandoori"]
                ),
                MenuItem(
                    name="Paneer Tikka Shashlik",
                    category="Starters",
                    price=420.0,
                    prep_time="12-15 min",
                    image_url="https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600",
                    portion_size="Serves 1-2 (6 pcs)",
                    spice_level="Medium (🌶️🌶️)",
                    calories="340 kcal",
                    allergens=["Contains Dairy", "Jain Available"],
                    description="Cottage cheese cubes marinated in Kashmiri chili and ajwain, skewered with bell peppers and onions.",
                    tags=["Pure Veg", "Tandoori"]
                ),
                MenuItem(
                    name="Royal Butter Chicken (Murgh Makhani)",
                    category="Indian Mains",
                    price=560.0,
                    prep_time="20-25 min",
                    image_url="https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600",
                    portion_size="Serves 2-3 (500g)",
                    spice_level="Medium (🌶️🌶️)",
                    calories="520 kcal",
                    allergens=["Contains Dairy", "Contains Nuts"],
                    description="Charcoal-grilled chicken simmered in a velvety tomato, honey, and churned butter gravy with kasuri methi.",
                    tags=["Royal Mughlai", "Mildly Spiced"]
                ),
                MenuItem(
                    name="Dal Makhani Grand Palace",
                    category="Indian Mains",
                    price=380.0,
                    prep_time="15 min",
                    image_url="https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600",
                    portion_size="Serves 2 (400g)",
                    spice_level="Mild (🌶️)",
                    calories="390 kcal",
                    allergens=["Contains Dairy", "Pure Veg"],
                    description="Slow-cooked black lentils simmered overnight for 24 hours with fresh cream, butter, and mild aromatic spices.",
                    tags=["Pure Veg", "Signature Dish"]
                ),
                MenuItem(
                    name="Awadhi Dum Gosht Biryani",
                    category="Biryani & Rice",
                    price=640.0,
                    prep_time="20-25 min",
                    image_url="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600",
                    portion_size="Serves 1-2 (Pot)",
                    spice_level="Spicy (🌶️🌶️🌶️)",
                    calories="680 kcal",
                    allergens=["Contains Dairy", "Gluten-Free"],
                    description="Fragrant aged Basmati rice layered with succulent tender mutton, saffron, kewra water, served with Burani Raita.",
                    tags=["Chef's Recommendation", "Aromatic"]
                ),
                MenuItem(
                    name="Tandoori Garlic & Butter Naan Basket",
                    category="Breads",
                    price=140.0,
                    prep_time="5-8 min",
                    image_url="https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600",
                    portion_size="3 Assorted Breads",
                    spice_level="Mild (🌶️)",
                    calories="280 kcal",
                    allergens=["Contains Dairy", "Contains Gluten"],
                    description="Assortment of Garlic Naan, Butter Naan, and Laccha Paratha baked fresh in high-heat clay tandoor.",
                    tags=["Fresh from Tandoor"]
                ),
                MenuItem(
                    name="Gulab Jamun with Kesar Pista Rabdi",
                    category="Desserts",
                    price=240.0,
                    prep_time="5 min",
                    image_url="https://images.unsplash.com/photo-1605197143984-690e2931f24d?w=600",
                    portion_size="Serves 1-2 (2 pcs)",
                    spice_level="Sweet",
                    calories="360 kcal",
                    allergens=["Contains Dairy", "Contains Nuts", "Pure Veg"],
                    description="Golden fried milk dumplings soaked in cardamom saffron syrup, paired with slow-reduced pistachio rabdi.",
                    tags=["Warm & Sweet", "Pure Veg"]
                ),
                MenuItem(
                    name="Royal Saffron Masala Chai & Cookies",
                    category="Beverages",
                    price=160.0,
                    prep_time="5 min",
                    image_url="https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=600",
                    portion_size="2 Cups (Pot)",
                    spice_level="Aromatic",
                    calories="120 kcal",
                    allergens=["Contains Dairy"],
                    description="Assam black tea brewed with fresh ginger, crushed green cardamom, cinnamon, and Kashmiri saffron.",
                    tags=["Traditional", "Immunity Booster"]
                )
            ]
            session.add_all(menu_to_seed)
            await session.flush()

            # 4. Seed 50 Luxury Suites with Photos & Specifications
            suite_photos = [
                "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600",
                "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600",
                "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=600",
                "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600"
            ]

            rooms_to_seed = []
            for floor in range(1, 6):
                for room_idx in range(1, 11):
                    room_num = f"{floor}{room_idx:02d}"
                    if floor == 5:
                        rtype = "Maharaja Penthouse Suite" if room_idx > 8 else "Royal Heritage Suite"
                        price = 18000.0 if room_idx > 8 else 12000.0
                        area = 1400 if room_idx > 8 else 950
                        bed = "Imperial Four-Poster Canopy Bed"
                        view = "Panoramic Lake Palace & Aravalli Mountain View"
                        photo = suite_photos[1]
                    elif floor >= 3:
                        rtype = "Royal Heritage Suite" if room_idx > 7 else "Deluxe Heritage King"
                        price = 9500.0 if room_idx > 7 else 6500.0
                        area = 800 if room_idx > 7 else 550
                        bed = "Royal King Bed"
                        view = "Palace Courtyard & Illuminated Pool View"
                        photo = suite_photos[2]
                    else:
                        rtype = "Deluxe Heritage King" if room_idx > 5 else "Executive Heritage Room"
                        price = 5500.0 if room_idx > 5 else 3800.0
                        area = 480 if room_idx > 5 else 400
                        bed = "King Bed" if room_idx > 5 else "Twin Beds"
                        view = "Heritage Garden & Rose Pavilion View"
                        photo = suite_photos[0]

                    rooms_to_seed.append(Room(
                        room_number=room_num,
                        floor=floor,
                        room_type=rtype,
                        status="Clean",
                        price_per_night=price,
                        image_url=photo,
                        area_sqft=area,
                        bed_type=bed,
                        max_occupancy="3 Adults" if area > 700 else "2 Adults + 1 Child",
                        view_type=view,
                        amenities=["High-Speed Wi-Fi", "Espresso Bar", "Marble Bathtub", "Smart Automation", "Balcony"],
                        description=f"Authentic luxury suite with hand-carved jharokha arches, plush Italian linens, and high-speed palace connectivity.",
                        is_occupied=False
                    ))
            session.add_all(rooms_to_seed)
            await session.flush()

            # 5. Seed demo guests & active bookings
            guest1 = Guest(name="Maharaja Raghavendra Singh", phone="+919811122233", email="raghavendra@royalheritage.in", vip_status=True)
            guest2 = Guest(name="Pooja Sharma", phone="+919822233344", email="pooja.sharma@techcorp.in", vip_status=False)
            guest3 = Guest(name="Vikram Malhotra", phone="+919833344455", email="vikram@malhotracapital.in", vip_status=True)
            
            session.add_all([guest1, guest2, guest3])
            await session.flush()

            now = datetime.datetime.utcnow()
            b1 = Booking(guest_id=guest1.id, room_number="304", check_in=now, check_out=now + datetime.timedelta(days=3), is_active=True, total_nights=3, room_rate=6500.0)
            b2 = Booking(guest_id=guest2.id, room_number="102", check_in=now, check_out=now + datetime.timedelta(days=2), is_active=True, total_nights=2, room_rate=3800.0)
            b3 = Booking(guest_id=guest3.id, room_number="501", check_in=now, check_out=now + datetime.timedelta(days=4), is_active=True, total_nights=4, room_rate=12000.0)

            session.add_all([b1, b2, b3])
            await session.flush()

            # Mark rooms as occupied
            r304 = next(r for r in rooms_to_seed if r.room_number == "304")
            r304.is_occupied = True
            r304.current_guest_name = guest1.name

            r102 = next(r for r in rooms_to_seed if r.room_number == "102")
            r102.is_occupied = True
            r102.current_guest_name = guest2.name

            r501 = next(r for r in rooms_to_seed if r.room_number == "501")
            r501.is_occupied = True
            r501.current_guest_name = guest3.name

            # Seed initial room charges in ₹ INR
            f1 = FolioCharge(booking_id=b1.id, charge_type="Room", description="Deluxe Heritage King (3 Nights @ ₹6,500.00/night)", amount=19500.0, is_paid=False)
            f2 = FolioCharge(booking_id=b2.id, charge_type="Room", description="Executive Heritage Room (2 Nights @ ₹3,800.00/night)", amount=7600.0, is_paid=False)
            f3 = FolioCharge(booking_id=b3.id, charge_type="Room", description="Royal Heritage Suite (4 Nights @ ₹12,000.00/night)", amount=48000.0, is_paid=False)
            session.add_all([f1, f2, f3])

            # Seed an active dining order in Room 304 in ₹ INR
            order1 = Order(
                booking_id=b1.id,
                items=[
                    {"id": 3, "name": "Royal Butter Chicken (Murgh Makhani)", "quantity": 1, "price": 560.00},
                    {"id": 6, "name": "Tandoori Garlic & Butter Naan Basket", "quantity": 2, "price": 140.00}
                ],
                total_price=840.00,
                status="Preparing",
                special_instructions="Mild spices please"
            )
            session.add(order1)
            await session.flush()

            # Add dining charge to Room 304 folio
            f_order = FolioCharge(booking_id=b1.id, charge_type="Dining", description="In-Room Dining: Order #1 (Butter Chicken + Garlic Naan Basket)", amount=840.0, is_paid=False)
            session.add(f_order)

            # Seed sample housekeeping ticket
            ticket1 = Ticket(
                booking_id=b1.id,
                room_number="304",
                category="Amenity",
                description="Guest requested 2 extra plush bath towels and herbal sandalwood mist",
                status="Pending",
                priority="Medium"
            )
            session.add(ticket1)

            # 6. Seed Enterprise Channel Manager Foundation
            prop_q = await session.execute(select(Property).limit(1))
            if not prop_q.scalars().first():
                default_prop = Property(
                    id=1,
                    name="Hotel Blue Bird Inn",
                    code="BBN-001",
                    address="Garacharma, Sri Vijayapuram, A&N Islands",
                    city="Sri Vijayapuram",
                    state="Andaman & Nicobar Islands",
                    country="India",
                    timezone="Asia/Kolkata",
                    currency_code="INR",
                    currency_symbol="₹",
                    total_rooms=24,
                    is_active=True
                )
                session.add(default_prop)
                await session.flush()

                # Seed Room Types
                room_types_seed = [
                    RoomType(id=1, property_id=1, name="Deluxe Heritage Room", code="DHR", total_units=10, base_rate=4500.0, max_occupancy=3, description="Palace view room with king bed"),
                    RoomType(id=2, property_id=2, name="Royal Heritage Suite", code="RHS", total_units=8, base_rate=9500.0, max_occupancy=4, description="Spacious suite with marble tub"),
                    RoomType(id=3, property_id=3, name="Maharaja Penthouse Suite", code="MPS", total_units=6, base_rate=18000.0, max_occupancy=4, description="Penthouse suite with private terrace")
                ]
                session.add_all(room_types_seed)
                await session.flush()

                # Seed Rate Plans
                rate_plans_seed = [
                    RatePlan(id=1, property_id=1, name="Best Available Rate (BAR)", code="BAR", plan_type="BAR", is_refundable=True, includes_breakfast=True),
                    RatePlan(id=2, property_id=1, name="Non-Refundable Saver", code="NREF", plan_type="NonRefundable", is_refundable=False, includes_breakfast=False),
                    RatePlan(id=3, property_id=1, name="Royal Breakfast & Spa Package", code="PKG", plan_type="Package", is_refundable=True, includes_breakfast=True)
                ]
                session.add_all(rate_plans_seed)
                await session.flush()

                # Seed 6 OTA Channels
                channels_seed = [
                    OtaChannel(id=1, name="Booking.com Global", code="BDC", channel_type="Global OTA", api_type="XML", commission_percent=18.0, is_active=True, logo_url="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100"),
                    OtaChannel(id=2, name="MakeMyTrip & Goibibo", code="MMT", channel_type="Indian OTA", api_type="REST", commission_percent=15.0, is_active=True, logo_url="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=100"),
                    OtaChannel(id=3, name="Agoda International", code="AGD", channel_type="Asian OTA", api_type="REST", commission_percent=16.5, is_active=True, logo_url="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=100"),
                    OtaChannel(id=4, name="Expedia Group", code="EXP", channel_type="Global OTA", api_type="XML", commission_percent=17.5, is_active=True, logo_url="https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=100"),
                    OtaChannel(id=5, name="Goibibo Direct", code="GOI", channel_type="Indian OTA", api_type="REST", commission_percent=15.0, is_active=True, logo_url="https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=100"),
                    OtaChannel(id=6, name="Airbnb Experiences", code="AIR", channel_type="Vacation Rental", api_type="REST", commission_percent=14.0, is_active=True, logo_url="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=100")
                ]
                session.add_all(channels_seed)
                await session.flush()

                # Seed OTA Credentials in encrypted vault
                creds_seed = []
                for ch in channels_seed:
                    creds_seed.append(OtaCredential(
                        property_id=1,
                        ota_id=ch.id,
                        hotel_id_on_ota=f"HOTEL-{ch.code}-88192",
                        api_key_encrypted=encrypt_credential(f"api_key_live_{ch.code.lower()}_2026"),
                        api_secret_encrypted=encrypt_credential(f"sec_key_live_{ch.code.lower()}_2026"),
                        is_connected=True,
                        connection_mode="LIVE",
                        connection_status="Configured & Active",
                        last_connection_test=datetime.datetime.utcnow()
                    ))
                session.add_all(creds_seed)
                await session.flush()

                # Seed Channel & Rate Mappings
                mappings_seed = [
                    ChannelMapping(property_id=1, room_type_id=1, ota_id=1, ota_room_type_code="BDC_DELUXE_01", ota_room_type_name="Deluxe Heritage Room"),
                    ChannelMapping(property_id=1, room_type_id=2, ota_id=1, ota_room_type_code="BDC_SUITE_02", ota_room_type_name="Royal Heritage Suite"),
                    ChannelMapping(property_id=1, room_type_id=1, ota_id=2, ota_room_type_code="MMT_DHR_101", ota_room_type_name="Deluxe Heritage Room"),
                    ChannelMapping(property_id=1, room_type_id=2, ota_id=2, ota_room_type_code="MMT_RHS_202", ota_room_type_name="Royal Heritage Suite"),
                ]
                session.add_all(mappings_seed)

                rate_mappings_seed = [
                    RateMapping(property_id=1, rate_plan_id=1, ota_id=1, ota_rate_plan_code="BDC_BAR_STD", ota_rate_plan_name="BAR Plan"),
                    RateMapping(property_id=1, rate_plan_id=1, ota_id=2, ota_rate_plan_code="MMT_BAR_FLEX", ota_rate_plan_name="Flexible BAR Rate")
                ]
                session.add_all(rate_mappings_seed)

            await session.commit()
            logger.info("Database initialized successfully with Enterprise Channel Manager models & seed data.")
    except Exception as e:
        logger.warning(f"Startup DB auto-init notice (service starting normally): {e}")

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "AI-HOS Enterprise Suite",
        "currency": "₹ (INR)",
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "ok", "service": "AI-HOS Enterprise Suite"}
