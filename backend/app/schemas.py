from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Hotel Settings Schemas ---
class HotelSettingsBase(BaseModel):
    hotel_name: str = "The Grand Palace Resort & Heritage Spa"
    tagline: str = "5-Star Royal Luxury & AI Hospitality"
    logo_url: str = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300"
    banner_url: str = "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200"
    currency_symbol: str = "₹"
    currency_code: str = "INR"
    gstin: str = "07AAAAA0000A1Z5"
    gst_percent: float = 12.0
    phone: str = "+91 98765 43210"
    email: str = "concierge@grandpalace.in"
    address: str = "1 Palace Road, Jaipur, Rajasthan 302001, India"
    wifi_ssid: str = "RoyalResort-HighSpeed"
    wifi_password: str = "Luxury@2026"
    check_in_time: str = "14:00"
    check_out_time: str = "11:00"
    razorpay_key_id: str = "rzp_test_AIHOS2026Key"
    razorpay_key_secret: str = "sec_rzp_test_secret_998877"
    payment_gateway_enabled: bool = True
    whatsapp_verify_token: str = "aihos_verification_token_secure_2026"
    whatsapp_access_token: str = "EAAG...meta_access_token"
    whatsapp_phone_number_id: str = "109876543210985"

class HotelSettingsUpdate(BaseModel):
    hotel_name: Optional[str] = None
    tagline: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    currency_symbol: Optional[str] = None
    currency_code: Optional[str] = None
    gstin: Optional[str] = None
    gst_percent: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    wifi_ssid: Optional[str] = None
    wifi_password: Optional[str] = None
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    payment_gateway_enabled: Optional[bool] = None
    whatsapp_verify_token: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_phone_number_id: Optional[str] = None

class HotelSettingsResponse(HotelSettingsBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Authentication & Staff HR Schemas ---
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "Reception"
    full_name: str = "Staff Member"
    employee_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    shift: Optional[str] = "Morning (07:00 - 15:30)"
    emergency_contact: Optional[str] = None

class StaffUserUpdate(BaseModel):
    role: Optional[str] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    employee_id: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    shift: Optional[str] = None
    emergency_contact: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    full_name: Optional[str] = "Staff Member"
    employee_id: Optional[str] = "EMP-1001"
    phone: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    shift: Optional[str] = None
    emergency_contact: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

# --- Room & Inventory Schemas ---
class RoomBase(BaseModel):
    room_number: str
    floor: int
    room_type: str = "Deluxe Heritage Room"
    status: str = "Clean"
    price_per_night: float = 4500.0
    image_url: Optional[str] = "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600"
    area_sqft: Optional[int] = 550
    bed_type: Optional[str] = "Royal King Bed"
    max_occupancy: Optional[str] = "2 Adults + 1 Child"
    view_type: Optional[str] = "Palace Courtyard & Pool View"
    amenities: Optional[List[str]] = ["High-Speed Wi-Fi", "Espresso Bar", "Marble Bathtub", "Smart Automation", "Balcony"]
    description: Optional[str] = None
    is_occupied: bool = False
    current_guest_name: Optional[str] = None

class RoomCreate(BaseModel):
    room_number: str
    floor: int
    room_type: str = "Deluxe Heritage Room"
    price_per_night: float = 4500.0
    image_url: Optional[str] = "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600"
    area_sqft: Optional[int] = 550
    bed_type: Optional[str] = "Royal King Bed"
    max_occupancy: Optional[str] = "2 Adults + 1 Child"
    view_type: Optional[str] = "Palace Courtyard & Pool View"
    amenities: Optional[List[str]] = ["High-Speed Wi-Fi", "Espresso Bar", "Marble Bathtub", "Smart Automation", "Balcony"]
    description: Optional[str] = None

class RoomResponse(RoomBase):
    id: int

    class Config:
        from_attributes = True

class RoomStatusUpdate(BaseModel):
    status: Optional[str] = None
    is_occupied: Optional[bool] = None
    price_per_night: Optional[float] = None
    room_type: Optional[str] = None
    image_url: Optional[str] = None
    area_sqft: Optional[int] = None
    bed_type: Optional[str] = None
    max_occupancy: Optional[str] = None
    view_type: Optional[str] = None
    amenities: Optional[List[str]] = None
    description: Optional[str] = None

# --- Menu Item Schemas ---
class MenuItemBase(BaseModel):
    name: str
    category: str = "Indian Mains"
    price: float = 450.0
    prep_time: str = "15-20 min"
    image_url: Optional[str] = "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600"
    portion_size: Optional[str] = "Serves 1-2"
    spice_level: Optional[str] = "Medium (🌶️🌶️)"
    calories: Optional[str] = "450 kcal"
    allergens: Optional[List[str]] = ["Contains Dairy"]
    description: str
    tags: List[str] = []
    is_available: bool = True

class MenuItemCreate(MenuItemBase):
    pass

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    prep_time: Optional[str] = None
    image_url: Optional[str] = None
    portion_size: Optional[str] = None
    spice_level: Optional[str] = None
    calories: Optional[str] = None
    allergens: Optional[List[str]] = None
    description: Optional[str] = None
    tags: Optional[List[str]] = None
    is_available: Optional[bool] = None

class MenuItemResponse(MenuItemBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Guest & Booking Schemas ---
class GuestBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    vip_status: bool = False
    notes: Optional[str] = None

class GuestResponse(GuestBase):
    id: int

    class Config:
        from_attributes = True

class BookingBase(BaseModel):
    room_number: str
    check_out: datetime
    room_rate: float = 4500.0

class BookingResponse(BookingBase):
    id: int
    guest: GuestResponse
    check_in: datetime
    is_active: bool
    total_nights: int

    class Config:
        from_attributes = True

class CheckInRequest(BaseModel):
    guest_name: str
    guest_phone: str
    guest_email: Optional[str] = None
    room_number: str
    nights: int = 1
    room_rate: float = 4500.0
    vip_status: bool = False
    nationality: Optional[str] = "Indian"
    id_type: Optional[str] = "Aadhaar Card"
    id_number: Optional[str] = None
    city_state_origin: Optional[str] = None
    purpose_of_visit: Optional[str] = "Tourism & Leisure"
    gstin: Optional[str] = None

class CreateReservationRequest(BaseModel):
    guest_name: str
    guest_phone: str
    guest_email: Optional[str] = None
    room_number: str
    check_in_date: str
    check_out_date: str
    room_rate: float = 4500.0
    channel: Optional[str] = "Direct Walk-In"
    vip_status: bool = False
    notes: Optional[str] = None

class CheckOutResponse(BaseModel):
    booking_id: int
    room_number: str
    guest_name: str
    total_room_charges: float
    total_dining_charges: float
    total_amenity_charges: float
    gst_charges: float = 0.0
    grand_total: float
    status: str
    itemized_charges: List[dict]

# --- Room Dining Order Schemas ---
class OrderItem(BaseModel):
    id: int
    name: str
    quantity: int
    price: float
    notes: Optional[str] = None

class OrderCreate(BaseModel):
    booking_id: int
    items: List[OrderItem]
    total_price: float
    special_instructions: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str  # Pending, Preparing, Ready, OutForDelivery, Delivered, Cancelled
    runner_name: Optional[str] = None
    estimated_minutes: Optional[int] = None

class OrderResponse(BaseModel):
    id: int
    booking_id: int
    items: List[dict]
    total_price: float
    status: str
    runner_name: Optional[str] = None
    estimated_minutes: Optional[int] = None
    special_instructions: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    delivered_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- Housekeeping Ticket Schemas ---
class TicketCreate(BaseModel):
    booking_id: int
    room_number: Optional[str] = None
    category: str = "Housekeeping"
    description: str
    priority: str = "Medium"

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[int] = None
    checklist: Optional[Dict[str, bool]] = None

class TicketResponse(BaseModel):
    id: int
    booking_id: int
    room_number: Optional[str] = None
    category: str
    description: str
    status: str
    priority: str
    assigned_to: Optional[int] = None
    checklist: Optional[Dict[str, bool]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Folio & Ledger Schemas ---
class FolioChargeResponse(BaseModel):
    id: int
    booking_id: int
    charge_type: str
    description: str
    amount: float
    is_paid: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- AI In-Room Concierge Schemas ---
class ConciergeChatRequest(BaseModel):
    room_number: str
    booking_id: Optional[int] = None
    message: str

class ConciergeChatResponse(BaseModel):
    reply: str
    suggested_actions: List[str] = []
    action_taken: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

# --- WhatsApp Logs Schemas ---
class WhatsAppLogResponse(BaseModel):
    id: int
    from_phone: str
    guest_name: Optional[str] = None
    message_text: str
    ai_reply: Optional[str] = None
    intent: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Dashboard & Executive Briefing ---
class ExecutiveBriefingResponse(BaseModel):
    date: str
    occupancy_rate: float
    rev_par: float
    adr: float
    total_revenue: float
    room_revenue: float
    dining_revenue: float
    open_tickets_count: int
    active_orders_count: int
    briefing_text: str
    sentiment_score: float = 96.5
    sentiment_summary: str = "96.5% Positive guest feedback on royal hospitality & swift dining service."
    pricing_recommendation: str = "High season demand: recommend +10% rate revision on Royal Suites."
