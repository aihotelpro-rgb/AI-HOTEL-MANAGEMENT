import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Float, JSON, Text
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="Reception")  # Admin, Reception, Kitchen, Housekeeping, Executive
    full_name = Column(String, default="Staff Member")
    employee_id = Column(String, default="EMP-1001")
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    avatar_url = Column(String, default="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150")
    shift = Column(String, default="Morning (07:00 - 15:30)")  # Morning, Evening, Night
    emergency_contact = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    tickets = relationship("Ticket", back_populates="assignee")


class HotelSettings(Base):
    __tablename__ = "hotel_settings"

    id = Column(Integer, primary_key=True, default=1)
    hotel_name = Column(String, default="The Grand Palace Resort & Heritage Spa")
    tagline = Column(String, default="5-Star Royal Luxury & AI Hospitality")
    logo_url = Column(String, default="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300")
    banner_url = Column(String, default="https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200")
    currency_symbol = Column(String, default="₹")
    currency_code = Column(String, default="INR")
    gstin = Column(String, default="07AAAAA0000A1Z5")
    gst_percent = Column(Float, default=12.0)
    phone = Column(String, default="+91 98765 43210")
    email = Column(String, default="concierge@grandpalace.in")
    address = Column(String, default="1 Palace Road, Jaipur, Rajasthan 302001, India")
    wifi_ssid = Column(String, default="RoyalResort-HighSpeed")
    wifi_password = Column(String, default="Luxury@2026")
    # Payment Gateway & WhatsApp Integrations
    razorpay_key_id = Column(String, default="rzp_test_AIHOS2026Key")
    razorpay_key_secret = Column(String, default="sec_rzp_test_secret_998877")
    payment_gateway_enabled = Column(Boolean, default=True)
    whatsapp_verify_token = Column(String, default="aihos_verification_token_secure_2026")
    whatsapp_access_token = Column(String, default="EAAG...meta_access_token")
    whatsapp_phone_number_id = Column(String, default="109876543210985")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String, unique=True, index=True, nullable=False)
    floor = Column(Integer, nullable=False)
    room_type = Column(String, default="Deluxe Heritage Room")  # Standard, Deluxe, Royal Suite, Maharaja Penthouse
    status = Column(String, default="Clean")  # Clean, Dirty, Cleaning, Inspected, OutOfOrder
    price_per_night = Column(Float, default=4500.0)  # in INR (₹)
    image_url = Column(String, default="https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600")
    area_sqft = Column(Integer, default=550)
    bed_type = Column(String, default="Royal King Bed")  # Royal King Bed, Twin Beds, Four-Poster Canopy Bed, Queen Bed
    max_occupancy = Column(String, default="2 Adults + 1 Child")
    view_type = Column(String, default="Palace Courtyard & Pool View")  # Lake View, City View, Garden View
    amenities = Column(JSON, default=lambda: ["High-Speed Wi-Fi", "Espresso Bar", "Marble Bathtub", "Smart Automation", "Balcony"])
    description = Column(Text, default="Exquisite luxury suite crafted with heritage Rajasthani architecture, plush Italian linens, and a private sunlit balcony.")
    is_occupied = Column(Boolean, default=False)
    current_guest_name = Column(String, nullable=True)


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, default="Indian Mains")  # Starters, Indian Mains, Biryani & Rice, Breads, Desserts, Beverages
    price = Column(Float, nullable=False)  # in INR (₹)
    prep_time = Column(String, default="15-20 min")
    image_url = Column(String, default="https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600")
    portion_size = Column(String, default="Serves 1-2")
    spice_level = Column(String, default="Medium (🌶️🌶️)")  # Mild (🌶️), Medium (🌶️🌶️), Spicy (🌶️🌶️🌶️), Royal Hot (🌶️🌶️🌶️🌶️)
    calories = Column(String, default="450 kcal")
    allergens = Column(JSON, default=lambda: ["Contains Dairy"])  # Contains Dairy, Contains Nuts, Gluten-Free, Vegan, Jain Option
    description = Column(Text, nullable=False)
    tags = Column(JSON, default=list)  # ["Pure Veg", "Chef Special", "Spicy", "Jain Option"]
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=True)
    vip_status = Column(Boolean, default=False)
    notes = Column(String, nullable=True)

    # Ministry of Tourism & Bureau of Immigration C-Form Compliance Fields
    nationality = Column(String, default="Indian")
    id_type = Column(String, default="Aadhaar Card")
    id_number = Column(String, nullable=True)
    city_state_origin = Column(String, nullable=True)
    purpose_of_visit = Column(String, default="Tourism & Leisure")
    gstin = Column(String, nullable=True)

    bookings = relationship("Booking", back_populates="guest")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id"), nullable=False)
    room_number = Column(String, nullable=False, index=True)
    check_in = Column(DateTime, default=datetime.datetime.utcnow)
    check_out = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    total_nights = Column(Integer, default=1)
    room_rate = Column(Float, default=4500.0)  # in INR (₹)
    channel = Column(String, default="Direct Website")  # Direct Website, Agoda, Booking.com, MakeMyTrip

    # Relationships
    guest = relationship("Guest", back_populates="bookings")
    orders = relationship("Order", back_populates="booking")
    tickets = relationship("Ticket", back_populates="booking")
    folio_charges = relationship("FolioCharge", back_populates="booking")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    items = Column(JSON, nullable=False)  # [{"id": 1, "name": "Paneer Tikka", "quantity": 1, "price": 420.0}]
    total_price = Column(Float, nullable=False)  # in INR (₹)
    status = Column(String, default="Pending")  # Pending, Preparing, Ready, OutForDelivery, Delivered, Cancelled
    runner_name = Column(String, nullable=True)
    estimated_minutes = Column(Integer, default=25)
    special_instructions = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    delivered_at = Column(DateTime, nullable=True)

    # Relationships
    booking = relationship("Booking", back_populates="orders")


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    room_number = Column(String, nullable=True)
    category = Column(String, default="Housekeeping")  # Housekeeping, Maintenance, Amenity
    description = Column(String, nullable=False)
    status = Column(String, default="Pending")  # Pending, In Progress, Cleaned
    priority = Column(String, default="Medium")  # Low, Medium, High, Emergency
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    checklist = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="tickets")
    assignee = relationship("User", back_populates="tickets")


class FolioCharge(Base):
    __tablename__ = "folio_charges"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    charge_type = Column(String, default="Dining")  # Room, Dining, Amenity, MiniBar, Spa
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)  # in INR (₹)
    is_paid = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    booking = relationship("Booking", back_populates="folio_charges")


class WhatsAppLog(Base):
    __tablename__ = "whatsapp_logs"

    id = Column(Integer, primary_key=True, index=True)
    from_phone = Column(String, nullable=False)
    guest_name = Column(String, nullable=True)
    message_text = Column(Text, nullable=False)
    ai_reply = Column(Text, nullable=True)
    intent = Column(String, default="General Inquiry")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    item_name = Column(String, unique=True, nullable=False)
    unit = Column(String, default="kg")
    current_stock = Column(Float, default=50.0)
    min_alert_threshold = Column(Float, default=10.0)
    cost_per_unit = Column(Float, default=250.0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class CameraFeed(Base):
    __tablename__ = "camera_feeds"

    id = Column(Integer, primary_key=True, index=True)
    camera_code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    location = Column(String, default="Ground Floor Lobby")
    brand = Column(String, default="CP Plus")
    stream_url = Column(String, nullable=False)
    status = Column(String, default="LIVE")
    is_active = Column(Boolean, default=True)
    fps = Column(Integer, default=30)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ─────────────────────────────────────────────────────────────────────────────
# ENTERPRISE CHANNEL MANAGER & REVENUE MANAGEMENT MODELS
# ─────────────────────────────────────────────────────────────────────────────

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, default="Hotel Blue Bird Inn")
    code = Column(String, unique=True, index=True, default="BBN-001")
    address = Column(String, default="Garacharma, Sri Vijayapuram, A&N Islands")
    city = Column(String, default="Sri Vijayapuram")
    state = Column(String, default="Andaman & Nicobar Islands")
    country = Column(String, default="India")
    timezone = Column(String, default="Asia/Kolkata")
    currency_code = Column(String, default="INR")
    currency_symbol = Column(String, default="₹")
    total_rooms = Column(Integer, default=24)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class RoomType(Base):
    __tablename__ = "room_types"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), default=1)
    name = Column(String, nullable=False)       # e.g., "Deluxe Heritage King"
    code = Column(String, nullable=False)       # e.g., "DHK"
    total_units = Column(Integer, default=10)
    base_rate = Column(Float, nullable=False, default=4500.0)
    max_occupancy = Column(Integer, default=3)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)


class RatePlan(Base):
    __tablename__ = "rate_plans"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), default=1)
    name = Column(String, nullable=False)       # e.g., "Best Available Rate (BAR)"
    code = Column(String, nullable=False)       # e.g., "BAR"
    plan_type = Column(String, default="BAR")   # BAR, Package, NonRefundable, EarlyBird
    is_refundable = Column(Boolean, default=True)
    cancellation_policy = Column(Text, default="Free cancellation up to 24 hours before check-in")
    includes_breakfast = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)


class OtaChannel(Base):
    __tablename__ = "ota_channels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)       # e.g., "Booking.com"
    code = Column(String, unique=True, index=True, nullable=False) # BDC, MMT, AGD, EXP, GOI, AIR
    channel_type = Column(String, default="Global OTA") # Global OTA, Indian OTA, Vacation Rental
    api_type = Column(String, default="REST")   # REST, XML, JSON
    api_base_url = Column(String, nullable=True)
    webhook_url = Column(String, nullable=True)
    commission_percent = Column(Float, default=15.0)
    is_active = Column(Boolean, default=True)
    logo_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class OtaCredential(Base):
    __tablename__ = "ota_credentials"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), default=1)
    ota_id = Column(Integer, ForeignKey("ota_channels.id"), nullable=False)
    hotel_id_on_ota = Column(String, nullable=True)     # Hotel ID assigned by OTA
    api_key_encrypted = Column(Text, nullable=True)      # AES-256 encrypted
    api_secret_encrypted = Column(Text, nullable=True)   # AES-256 encrypted
    username = Column(String, nullable=True)
    is_connected = Column(Boolean, default=False)
    connection_mode = Column(String, default="SANDBOX") # SANDBOX, LIVE, MOCK
    last_connection_test = Column(DateTime, nullable=True)
    connection_status = Column(String, default="Configured & Ready")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class ChannelMapping(Base):
    __tablename__ = "channel_mappings"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), default=1)
    room_type_id = Column(Integer, ForeignKey("room_types.id"), nullable=False)
    ota_id = Column(Integer, ForeignKey("ota_channels.id"), nullable=False)
    ota_room_type_code = Column(String, nullable=False)  # OTA's room code
    ota_room_type_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class RateMapping(Base):
    __tablename__ = "rate_mappings"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), default=1)
    rate_plan_id = Column(Integer, ForeignKey("rate_plans.id"), nullable=False)
    ota_id = Column(Integer, ForeignKey("ota_channels.id"), nullable=False)
    ota_rate_plan_code = Column(String, nullable=False)  # OTA's rate plan code
    ota_rate_plan_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)


class RoomAvailability(Base):
    __tablename__ = "room_availability"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), default=1)
    room_type_id = Column(Integer, ForeignKey("room_types.id"), nullable=False)
    date_str = Column(String, index=True, nullable=False) # Format: YYYY-MM-DD
    total_rooms = Column(Integer, default=10)
    rooms_available = Column(Integer, default=10)
    rooms_booked = Column(Integer, default=0)
    is_stop_sell = Column(Boolean, default=False)
    is_closed_to_arrival = Column(Boolean, default=False)
    is_closed_to_departure = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class RateCalendar(Base):
    __tablename__ = "rate_calendar"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), default=1)
    room_type_id = Column(Integer, ForeignKey("room_types.id"), nullable=False)
    rate_plan_id = Column(Integer, ForeignKey("rate_plans.id"), nullable=False)
    date_str = Column(String, index=True, nullable=False) # Format: YYYY-MM-DD
    rate = Column(Float, nullable=False, default=4500.0)
    min_los = Column(Integer, default=1)
    max_los = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), default=1)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    username = Column(String, default="System Admin")
    action = Column(String, nullable=False)       # "RATE_UPDATE", "MAPPING_UPDATE", "OTA_SYNC"
    entity_type = Column(String, nullable=False)  # "RateCalendar", "OtaCredential", "RoomMapping"
    entity_id = Column(String, nullable=True)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    ip_address = Column(String, default="127.0.0.1")
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)


class SyncJob(Base):
    __tablename__ = "sync_jobs"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, ForeignKey("properties.id"), default=1)
    ota_id = Column(Integer, ForeignKey("ota_channels.id"), nullable=True)
    job_type = Column(String, default="FULL_SYNC") # "RATE", "INVENTORY", "FULL_SYNC"
    status = Column(String, default="COMPLETED")    # "PENDING", "RUNNING", "COMPLETED", "FAILED"
    channels_attempted = Column(Integer, default=6)
    channels_successful = Column(Integer, default=6)
    records_synced = Column(Integer, default=42)
    duration_ms = Column(Integer, default=320)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)
    triggered_by = Column(String, default="Super-Admin Console")


class SyncError(Base):
    __tablename__ = "sync_errors"

    id = Column(Integer, primary_key=True, index=True)
    sync_job_id = Column(Integer, ForeignKey("sync_jobs.id"), nullable=True)
    ota_code = Column(String, nullable=False)
    error_code = Column(String, default="OTA_401_UNAUTHORIZED")
    error_message = Column(Text, nullable=False)
    retry_count = Column(Integer, default=0)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class ReservationEvent(Base):
    __tablename__ = "reservation_events"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=True)
    ota_id = Column(Integer, ForeignKey("ota_channels.id"), nullable=True)
    ota_booking_ref = Column(String, index=True, nullable=False)
    event_type = Column(String, default="NEW_RESERVATION")
    raw_payload = Column(JSON, nullable=True)
    status = Column(String, default="PROCESSED")
    processed_at = Column(DateTime, default=datetime.datetime.utcnow)


