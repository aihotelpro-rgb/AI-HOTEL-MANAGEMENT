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
