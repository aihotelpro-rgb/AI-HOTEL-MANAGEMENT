# Blue Bird Nest AI — Channel Manager Implementation Backlog

**Created:** 2026-09-01  
**Status:** READY FOR DEVELOPMENT  
**Total Backlog Items:** 39  
**Source:** Gap Analysis vs `Blue_Bird_Nest_Complete_Enterprise_Channel_Manager.xlsx`

> [!IMPORTANT]
> This backlog contains development-ready specifications for every missing feature. Items are ordered by implementation dependency — earlier items must be completed before later items in the same phase.

---

## PHASE 1 — Core Channel Manager Foundation

---

### BLK-001: OTA Channel Database Foundation
**Module:** Enterprise Channel Manager  
**Priority:** P0 | **Complexity:** VERY HIGH | **Est. Time:** 3–4 days

**Description:**  
Create the complete database schema for OTA channel management. This is the foundation on which all other channel manager features depend. No OTA integration can be built without these models.

**Current State:** NOT IMPLEMENTED. No OTA-related database models exist in `backend/app/models.py`.

**Database Work Required:**
Add to `backend/app/models.py`:
```python
class Property(Base):
    __tablename__ = "properties"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    code = Column(String, unique=True)        # e.g. "BBN-001"
    address = Column(String)
    city = Column(String)
    state = Column(String)
    country = Column(String, default="India")
    timezone = Column(String, default="Asia/Kolkata")
    currency_code = Column(String, default="INR")
    total_rooms = Column(Integer, default=24)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class RoomType(Base):
    __tablename__ = "room_types"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    name = Column(String, nullable=False)     # e.g. "Standard Room"
    code = Column(String, nullable=False)     # e.g. "STD"
    total_units = Column(Integer, default=1)
    base_rate = Column(Float, nullable=False)
    max_occupancy = Column(Integer, default=2)
    description = Column(Text)
    is_active = Column(Boolean, default=True)

class RatePlan(Base):
    __tablename__ = "rate_plans"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    name = Column(String, nullable=False)     # e.g. "Best Available Rate"
    code = Column(String, nullable=False)     # e.g. "BAR"
    plan_type = Column(String)                # "BAR", "Package", "Non-Refundable", "Early-Bird"
    is_refundable = Column(Boolean, default=True)
    cancellation_policy = Column(Text)
    includes_breakfast = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

class OtaChannel(Base):
    __tablename__ = "ota_channels"
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)     # e.g. "Booking.com"
    code = Column(String, unique=True)        # e.g. "BDC", "AGD", "EXP", "MMT", "GOI", "AIR"
    channel_type = Column(String)             # "Global OTA", "Indian OTA", "Vacation Rental"
    api_type = Column(String)                 # "REST", "XML", "JSON"
    api_base_url = Column(String)
    webhook_url = Column(String)
    commission_percent = Column(Float, default=15.0)
    is_active = Column(Boolean, default=True)
    logo_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class OtaCredential(Base):
    __tablename__ = "ota_credentials"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    ota_id = Column(Integer, ForeignKey("ota_channels.id"))
    hotel_id_on_ota = Column(String)          # Property ID assigned by OTA
    api_key_encrypted = Column(String)        # AES-256 encrypted
    api_secret_encrypted = Column(String)     # AES-256 encrypted
    username = Column(String)
    is_connected = Column(Boolean, default=False)
    last_connection_test = Column(DateTime)
    connection_status = Column(String, default="Not Connected")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
```

**Backend Work Required:**
- Create Alembic migration for all new models
- `POST /api/v1/ota/channels` — create OTA channel record
- `GET /api/v1/ota/channels` — list all configured channels
- `PUT /api/v1/ota/channels/{id}` — update channel config
- `DELETE /api/v1/ota/channels/{id}` — remove channel

**Frontend Work Required:**
- Replace `frontend/src/app/api/v1/admin/channel-engine/status/route.ts` mock with real API proxy
- Update admin "channel" tab to show real data from database

**Security Requirements:**
- OTA API keys must be encrypted with AES-256 before database storage
- pip install cryptography; create `backend/app/crypto.py` with encrypt/decrypt helpers
- Never expose decrypted keys in API responses

**Dependencies:** None (this is the foundation)

---

### BLK-002: Room Mapping Engine
**Module:** Enterprise Channel Manager  
**Priority:** P0 | **Complexity:** HIGH | **Est. Time:** 2 days

**Description:**  
Map internal PMS room types to OTA-specific room type codes. Each OTA has its own naming convention. Without this, rate and inventory pushes cannot correctly target the right room category on each OTA.

**Current State:** NOT IMPLEMENTED. No mapping table exists.

**Database Work Required:**
```python
class ChannelMapping(Base):
    __tablename__ = "channel_mappings"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    room_type_id = Column(Integer, ForeignKey("room_types.id"))
    ota_id = Column(Integer, ForeignKey("ota_channels.id"))
    ota_room_type_code = Column(String, nullable=False)  # OTA's internal room code
    ota_room_type_name = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Backend Work Required:**
- `GET /api/v1/mapping/rooms` — list all room mappings
- `POST /api/v1/mapping/rooms` — create room mapping
- `PUT /api/v1/mapping/rooms/{id}` — update mapping
- `DELETE /api/v1/mapping/rooms/{id}` — remove mapping

**Frontend Work Required:**
- New admin tab section: "Room Mapping"
- Table UI: PMS Room Type | OTA Name | OTA Room Code | Status
- Form: Add/Edit mapping

**Dependencies:** BLK-001

---

### BLK-003: Rate Plan Mapping Engine
**Module:** Enterprise Channel Manager  
**Priority:** P0 | **Complexity:** HIGH | **Est. Time:** 2 days

**Description:**  
Map internal rate plans (BAR, Package, Non-Refundable) to OTA-specific rate plan IDs. Required before any rate synchronization can work.

**Current State:** NOT IMPLEMENTED.

**Database Work Required:**
```python
class RateMapping(Base):
    __tablename__ = "rate_mappings"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    rate_plan_id = Column(Integer, ForeignKey("rate_plans.id"))
    ota_id = Column(Integer, ForeignKey("ota_channels.id"))
    ota_rate_plan_code = Column(String, nullable=False)
    ota_rate_plan_name = Column(String)
    is_active = Column(Boolean, default=True)
```

**Backend Work Required:**
- `GET /api/v1/mapping/rates` — list all rate mappings
- `POST /api/v1/mapping/rates` — create rate mapping
- `PUT /api/v1/mapping/rates/{id}` — update
- `DELETE /api/v1/mapping/rates/{id}` — remove

**Frontend Work Required:**
- Admin section: "Rate Plan Mapping"
- Table: PMS Rate Plan | OTA | OTA Rate Code
- Form: Add/Edit rate mapping

**Dependencies:** BLK-001, BLK-002

---

### BLK-004: Rate & Availability Calendar
**Module:** Enterprise Channel Manager  
**Priority:** P0 | **Complexity:** VERY HIGH | **Est. Time:** 4–5 days

**Description:**  
Date-level rate and availability grid — the core data store for the channel manager. Every OTA push reads from this calendar. Currently the system only has a static `price_per_night` per room — there is no concept of rates varying by date.

**Current State:** NOT IMPLEMENTED.

**Database Work Required:**
```python
class RoomAvailability(Base):
    __tablename__ = "room_availability"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    room_type_id = Column(Integer, ForeignKey("room_types.id"))
    date = Column(DateTime, nullable=False, index=True)
    total_rooms = Column(Integer, default=1)
    rooms_available = Column(Integer, default=1)
    rooms_booked = Column(Integer, default=0)
    is_stop_sell = Column(Boolean, default=False)
    is_closed_to_arrival = Column(Boolean, default=False)
    is_closed_to_departure = Column(Boolean, default=False)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

class RateCalendar(Base):
    __tablename__ = "rate_calendar"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    room_type_id = Column(Integer, ForeignKey("room_types.id"))
    rate_plan_id = Column(Integer, ForeignKey("rate_plans.id"))
    date = Column(DateTime, nullable=False, index=True)
    rate = Column(Float, nullable=False)
    min_los = Column(Integer, default=1)
    max_los = Column(Integer, nullable=True)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)
    updated_by = Column(Integer, ForeignKey("users.id"))
```

**Backend Work Required:**
- `GET /api/v1/rates/calendar?from=&to=&room_type=` — fetch rate grid
- `PUT /api/v1/rates/calendar` — update single date rate
- `POST /api/v1/rates/bulk-update` — update date range

**Frontend Work Required:**
- Visual rate calendar (spreadsheet-style date grid)
- Room type rows, date columns
- Click cell to edit rate
- Color coding: green (high rate), yellow (medium), red (low / stop-sell)

**Dependencies:** BLK-001, BLK-002, BLK-003

---

### BLK-005: Audit Log System
**Module:** Security & Control  
**Priority:** P0 | **Complexity:** MEDIUM | **Est. Time:** 2 days

**Description:**  
Track every change to rates, inventory, bookings, staff, and OTA configuration — with user, timestamp, IP, before/after values.

**Current State:** NOT IMPLEMENTED. No audit_logs table exists.

**Database Work Required:**
```python
class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)       # "RATE_UPDATE", "BOOKING_CREATE", etc.
    entity_type = Column(String)                  # "Room", "Booking", "RateCalendar"
    entity_id = Column(Integer)
    old_value = Column(JSON)
    new_value = Column(JSON)
    ip_address = Column(String)
    user_agent = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
```

**Backend Work Required:**
- Audit middleware: auto-log all PUT/POST/DELETE requests
- `GET /api/v1/audit-logs?page=&entity=&user=&from=&to=` — searchable log viewer
- Internal `write_audit_log()` helper function

**Frontend Work Required:**
- Admin tab: "Audit Logs"
- Table: Timestamp | User | Action | Entity | Old Value | New Value
- Filters: date range, entity type, user, action

**Dependencies:** BLK-001

---

### BLK-006: Multi-Property Foundation
**Module:** Multi-Property  
**Priority:** P0 | **Complexity:** VERY HIGH | **Est. Time:** 5–7 days

**Description:**  
Migrate the single-property architecture to support multiple properties. This is the most architecturally significant change in the roadmap. Must be done as an additive migration — existing data becomes "Property 1".

**Current State:** NOT IMPLEMENTED. Single-property only. HotelSettings table has one hardcoded row.

**Database Work Required:**
- Property model created in BLK-001
- Add `property_id` FK to: Room, RoomType, RatePlan, Guest, Booking, OtaCredential, ChannelMapping, RateMapping, AuditLog
- Migration: set all existing records to property_id = 1

**Backend Work Required:**
- `GET /api/v1/properties` — list all properties
- `POST /api/v1/properties` — create new property
- `GET /api/v1/properties/{id}` — property details
- `PUT /api/v1/properties/{id}` — update property
- Add `X-Property-ID` header middleware to scope all API queries

**Frontend Work Required:**
- Property selector dropdown in top navigation
- All admin API calls include selected property_id
- Per-property dashboard views

**Dependencies:** BLK-001, BLK-005

---

### BLK-007: Enhanced RBAC with Permission Matrix
**Module:** Security & Control  
**Priority:** P0 | **Complexity:** MEDIUM | **Est. Time:** 2–3 days

**Description:**  
Extend the current simple role system to support granular permissions per module per role.

**Current State:** PARTIALLY IMPLEMENTED. 5 roles exist with basic RoleChecker, but no per-module granular permissions.

**Database Work Required:**
```python
class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True)
    role = Column(String, nullable=False)
    module = Column(String, nullable=False)       # "rates", "inventory", "bookings", "ota", etc.
    can_view = Column(Boolean, default=False)
    can_create = Column(Boolean, default=False)
    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    can_sync = Column(Boolean, default=False)     # OTA sync permission
```

**Backend Work Required:**
- Permission seeding for all 5 roles across all modules
- `GET /api/v1/admin/permissions` — list all permissions
- `PUT /api/v1/admin/permissions` — update permission matrix
- Middleware: check permissions before each sensitive action

**Frontend Work Required:**
- Admin staff tab: Show permissions matrix grid (role x module x action)

**Dependencies:** BLK-001

---

## PHASE 2 — OTA Synchronization

---

### BLK-008: Booking.com API Connector
**Module:** Enterprise Channel Manager  
**Priority:** P0 | **Complexity:** VERY HIGH | **Est. Time:** 5–7 days

**Description:**  
Real API connector to Booking.com Connectivity API for rate push, inventory push, and reservation pull via webhooks.

**Current State:** NOT IMPLEMENTED. Only a static label "BDC" in mock JSON.

**Backend Work Required:**
- Create `backend/app/ota_connectors/booking_com.py`
- Implement: `push_rates()`, `push_availability()`, `pull_reservations()`, `test_connection()`
- Booking.com uses XML-based OTA API (OpenTravel Alliance schema)
- Rate push: `OTA_HotelRateAmountNotifRQ`
- Inventory push: `OTA_HotelAvailNotifRQ`
- Reservation pull: `OTA_ReadRQ` + webhook receiver

**API Endpoints Required:**
- `POST /api/v1/ota/booking-com/sync-rates` — push rates to Booking.com
- `POST /api/v1/ota/booking-com/sync-inventory` — push availability
- `POST /api/v1/ota/booking-com/reservations/inbound` — webhook for new bookings
- `GET /api/v1/ota/booking-com/connection-status` — test API connection

**Integration Work Required:**
- Register on Booking.com Connectivity Partner program
- Obtain test hotel sandbox credentials
- Parse OTA XML responses and map to internal booking format

**Error Handling Required:**
- Retry 3x on timeout with exponential backoff
- Log all failures to sync_errors table
- Alert admin on consecutive failures

**Dependencies:** BLK-001, BLK-002, BLK-003, BLK-004

---

### BLK-009: MakeMyTrip API Connector
**Module:** Enterprise Channel Manager  
**Priority:** P0 | **Complexity:** HIGH | **Est. Time:** 4–5 days

**Description:**  
Real API connector to MakeMyTrip/Goibibo (merged platform) for rate, inventory, and reservation synchronization.

**Current State:** NOT IMPLEMENTED. Static label only.

**Backend Work Required:**
- Create `backend/app/ota_connectors/makemytrip.py`
- MMT uses REST JSON API (different from Booking.com XML)
- Implement: `push_rates()`, `push_inventory()`, `pull_bookings()`, `test_connection()`

**API Endpoints Required:**
- `POST /api/v1/ota/mmt/sync-rates`
- `POST /api/v1/ota/mmt/sync-inventory`
- `POST /api/v1/ota/mmt/reservations/inbound`
- `GET /api/v1/ota/mmt/connection-status`

**Integration Work Required:**
- Register as MMT/Goibibo API partner
- Goibibo is now part of MakeMyTrip — one integration covers both

**Dependencies:** BLK-001, BLK-002, BLK-003, BLK-004

---

### BLK-010: One-Click Rate & Inventory Synchronization
**Module:** Enterprise Channel Manager  
**Priority:** P0 | **Complexity:** HIGH | **Est. Time:** 2–3 days

**Description:**  
Single button in admin UI that pushes current rates and inventory from the PMS rate calendar to all active connected OTAs simultaneously.

**Current State:** UI toggle exists (handleToggleChannelItem) but only changes a local flag. No real OTA API call is made.

**Backend Work Required:**
- `POST /api/v1/sync/all` — trigger sync to all active OTAs
- `POST /api/v1/sync/{ota_code}` — sync to specific OTA
- `GET /api/v1/sync/status` — real-time sync progress
- Background task: run sync jobs asynchronously (use APScheduler or Celery)
- Write sync result to sync_jobs table

**Database Work Required:**
```python
class SyncJob(Base):
    __tablename__ = "sync_jobs"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    ota_id = Column(Integer, ForeignKey("ota_channels.id"))
    job_type = Column(String)                  # "RATE", "INVENTORY", "ALL"
    status = Column(String, default="PENDING") # "PENDING", "RUNNING", "SUCCESS", "FAILED"
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    rooms_synced = Column(Integer, default=0)
    rates_synced = Column(Integer, default=0)
    errors = Column(JSON)
    triggered_by = Column(Integer, ForeignKey("users.id"))
```

**Frontend Work Required:**
- "Sync All OTAs" button in admin channel tab
- Progress indicator: "Syncing Booking.com... Syncing MakeMyTrip..."
- Result summary: "Synced 24 rooms, 7 rate plans, 0 errors"

**Dependencies:** BLK-008, BLK-009

---

### BLK-011: Real-Time Reservation Sync (OTA Webhook Receiver)
**Module:** Enterprise Channel Manager  
**Priority:** P0 | **Complexity:** HIGH | **Est. Time:** 3–4 days

**Description:**  
When a guest books on Booking.com or MakeMyTrip, the OTA sends a webhook/push notification to this system. This endpoint must receive the booking, create a PMS reservation, update availability, and prevent overbooking.

**Current State:** NOT IMPLEMENTED. OTA bookings must be manually entered.

**Backend Work Required:**
- `POST /api/v1/reservations/ota/inbound` — universal OTA webhook receiver
- Parse booking from each OTA's format and normalize to internal Booking model
- Auto-create Guest + Booking records
- Decrement RoomAvailability for booked dates
- Send confirmation email/WhatsApp to guest
- Log to ReservationEvent table

**Database Work Required:**
```python
class ReservationEvent(Base):
    __tablename__ = "reservation_events"
    id = Column(Integer, primary_key=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"))
    ota_id = Column(Integer, ForeignKey("ota_channels.id"))
    ota_booking_ref = Column(String)           # OTA's booking ID
    event_type = Column(String)               # "NEW", "MODIFY", "CANCEL"
    raw_payload = Column(JSON)               # Full OTA webhook payload
    processed_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="PROCESSED")
```

**Frontend Work Required:**
- Reception PMS: Show OTA channel badge on each booking
- Reception: Filter bookings by OTA source

**Dependencies:** BLK-008, BLK-009, BLK-004

---

### BLK-012: Overbooking Protection
**Module:** Enterprise Channel Manager  
**Priority:** P1 | **Complexity:** HIGH | **Est. Time:** 2 days

**Description:**  
Prevent the same room/date from being sold simultaneously on multiple OTAs. Implement pessimistic inventory locking with an optional buffer (e.g., hold back 1 room as safety buffer).

**Current State:** NOT IMPLEMENTED. Local is_occupied flag only prevents double check-in for already checked-in guests, but does not protect against future booking conflicts across OTAs.

**Backend Work Required:**
- Inventory reservation lock: when booking received, immediately decrement availability and push stop-sell to all other OTAs if availability hits 0
- `POST /api/v1/inventory/stop-sell` — broadcast stop-sell to all connected OTAs
- Configurable buffer: hold 1 room back at all times as protection
- Conflict detection: if two bookings arrive simultaneously, accept first, reject second

**Dependencies:** BLK-010, BLK-011

---

### BLK-013: Stop Sell / Open Sell (with OTA Broadcast)
**Module:** Enterprise Channel Manager  
**Priority:** P1 | **Complexity:** MEDIUM | **Est. Time:** 1–2 days

**Description:**  
Admin can instantly stop selling on specific channels or room types, with the stop-sell command pushed to OTA APIs in real time.

**Current State:** UI ONLY. Toggle exists but does not call OTA APIs.

**Backend Work Required:**
- Update `handleToggleChannelItem` to call real OTA API
- `POST /api/v1/inventory/stop-sell` — set stop_sell=true and push to OTA
- `POST /api/v1/inventory/open-sell` — set stop_sell=false and push to OTA
- Write stop-sell action to audit_logs

**Frontend Work Required:**
- Per-channel stop-sell toggle with confirmation dialog
- Visual indicator: "SELLING" (green) / "STOPPED" (red)
- Per-room-type stop-sell granularity

**Dependencies:** BLK-010, BLK-011

---

### BLK-014: Sync Health Dashboard
**Module:** Enterprise Channel Manager  
**Priority:** P1 | **Complexity:** MEDIUM | **Est. Time:** 2 days

**Description:**  
Real-time dashboard showing: connection status per OTA, last successful sync time, success rate (%), pending jobs, and error count.

**Current State:** NOT IMPLEMENTED. Admin shows static channel list with fake data.

**Backend Work Required:**
- `GET /api/v1/sync/health` — return per-OTA sync health metrics
- Data: last_sync_at, success_count, failure_count, avg_latency_ms, pending_jobs

**Frontend Work Required:**
- Admin channel tab enhancement: health cards per OTA
- Color-coded status: CONNECTED (green), DEGRADED (yellow), DISCONNECTED (red)
- Last sync timestamp + success % badge
- "Retry Failed" button

**Dependencies:** BLK-010

---

### BLK-015: OTA Error Monitor + Retry Queue
**Module:** Enterprise Channel Manager  
**Priority:** P1 | **Complexity:** MEDIUM | **Est. Time:** 2 days

**Database Work Required:**
```python
class SyncError(Base):
    __tablename__ = "sync_errors"
    id = Column(Integer, primary_key=True)
    sync_job_id = Column(Integer, ForeignKey("sync_jobs.id"))
    ota_id = Column(Integer, ForeignKey("ota_channels.id"))
    error_code = Column(String)
    error_message = Column(Text)
    request_payload = Column(JSON)
    retry_count = Column(Integer, default=0)
    next_retry_at = Column(DateTime)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Backend Work Required:**
- Automatic retry: 3 attempts with 1min, 5min, 30min delays
- `GET /api/v1/sync/errors?resolved=false` — list active errors
- `POST /api/v1/sync/errors/{id}/retry` — manual retry trigger
- Alert admin via WhatsApp/email after 3 consecutive failures

**Frontend Work Required:**
- Admin: "Error Centre" panel showing failed sync jobs
- Table: OTA | Error Code | Message | Retry Count | Last Attempt | Actions
- "Retry" button per error
- "Mark Resolved" button

**Dependencies:** BLK-010, BLK-014

---

### BLK-016: Agoda API Connector
**Module:** Enterprise Channel Manager  
**Priority:** P1 | **Complexity:** HIGH | **Est. Time:** 4 days

**Description:** Real API connector to Agoda YCS (Yield Control System) API.

**Backend Work Required:**
- Create `backend/app/ota_connectors/agoda.py`
- Agoda uses REST JSON API via YCS partner portal
- `push_rates()`, `push_inventory()`, `pull_bookings()`, `test_connection()`

**Dependencies:** BLK-001 through BLK-004

---

### BLK-017: Expedia API Connector
**Module:** Enterprise Channel Manager  
**Priority:** P1 | **Complexity:** HIGH | **Est. Time:** 4 days

**Description:** Real API connector to Expedia EQC (Expedia QuickConnect) API.

**Backend Work Required:**
- Create `backend/app/ota_connectors/expedia.py`
- Expedia uses XML-based API (similar to Booking.com OTA spec)

**Dependencies:** BLK-001 through BLK-004

---

### BLK-018: Reservation Reconciliation
**Module:** Enterprise Channel Manager  
**Priority:** P1 | **Complexity:** HIGH | **Est. Time:** 3 days

**Description:**  
Compare OTA booking lists (pulled from each OTA's API) against PMS booking records and surface discrepancies — missing bookings, cancelled bookings not synced, modified bookings.

**Backend Work Required:**
- `GET /api/v1/reservations/reconcile?ota=&date_from=&date_to=` — run reconciliation
- Pull OTA bookings via API, compare to local Booking records
- Return: matched, missing in PMS, missing in OTA, status mismatches

**Frontend Work Required:**
- Reconciliation table: OTA Booking Ref | Guest | Dates | OTA Status | PMS Status | Action
- "Import Missing" button for bookings in OTA but not in PMS
- "Mark Cancelled" for bookings cancelled in OTA but active in PMS

**Dependencies:** BLK-008, BLK-009, BLK-011

---

### BLK-019: Booking Audit Trail
**Module:** Enterprise Channel Manager  
**Priority:** P1 | **Complexity:** MEDIUM | **Est. Time:** 1 day

**Description:**  
Track all booking state changes (Created, Modified, Cancelled, Checked-In, Checked-Out) with source (which OTA, which staff user, which device).

**Current State:** PARTIALLY IMPLEMENTED. Booking model has basic fields but no event log.

**Database Work Required:**
Uses ReservationEvent from BLK-011 — extend to cover all booking lifecycle events.

**Backend Work Required:**
- Write to reservation_events on every booking status change
- `GET /api/v1/bookings/{id}/history` — full audit trail per booking

**Dependencies:** BLK-011

---

### BLK-020: Restriction Manager
**Module:** Enterprise Channel Manager  
**Priority:** P1 | **Complexity:** HIGH | **Est. Time:** 3 days

**Description:**  
MinLOS (Minimum Length of Stay), MaxLOS (Maximum Length of Stay), CTA (Closed to Arrival), CTD (Closed to Departure) restrictions by date and room type.

**Current State:** NOT IMPLEMENTED.

**Database Work Required:**
```python
class Restriction(Base):
    __tablename__ = "restrictions"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    room_type_id = Column(Integer, ForeignKey("room_types.id"), nullable=True)  # null = all rooms
    date_from = Column(DateTime, nullable=False)
    date_to = Column(DateTime, nullable=False)
    min_los = Column(Integer, default=1)
    max_los = Column(Integer, nullable=True)
    closed_to_arrival = Column(Boolean, default=False)
    closed_to_departure = Column(Boolean, default=False)
    applies_to_otas = Column(JSON)             # ["BDC", "AGD"] or [] for all
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Backend Work Required:**
- `GET/POST/PUT/DELETE /api/v1/restrictions`
- Push restrictions to OTAs via their restriction update APIs
- Validate bookings against active restrictions

**Dependencies:** BLK-004, BLK-008, BLK-009

---

## PHASE 3 — Revenue Management

---

### BLK-021: Revenue Analytics (Channel Breakdown)
**Module:** Revenue Management  
**Priority:** P1 | **Complexity:** HIGH | **Est. Time:** 3–4 days

**Description:**  
Extend existing executive stats with per-channel revenue breakdown, OTA commission deduction, net revenue, and pick-up reports.

**Current State:** PARTIALLY IMPLEMENTED. Total RevPAR/ADR/revenue exist but no channel breakdown.

**Backend Work Required:**
- `GET /api/v1/revenue/analytics?period=&channel=` — channel-wise revenue
- Revenue metrics: gross revenue, OTA commission, net revenue per channel
- Pick-up report: bookings made in last 7/14/30 days for arrival in next 30/60/90 days
- Month-over-month, year-over-year comparison

**Database Work Required:**
```python
class RevenueMetric(Base):
    __tablename__ = "revenue_metrics"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    date = Column(DateTime, nullable=False, index=True)
    channel_code = Column(String)              # "BDC", "AGD", "DIRECT", etc.
    rooms_sold = Column(Integer, default=0)
    gross_revenue = Column(Float, default=0.0)
    commission_paid = Column(Float, default=0.0)
    net_revenue = Column(Float, default=0.0)
    adr = Column(Float)
    rev_par = Column(Float)
    occupancy_pct = Column(Float)
```

**Dependencies:** BLK-008, BLK-009, BLK-011

---

### BLK-022: Bulk Rate Update
**Module:** Enterprise Channel Manager  
**Priority:** P1 | **Complexity:** MEDIUM | **Est. Time:** 2 days

**Description:**  
Update rates for a date range and room type in one action and push to all connected OTAs.

**Current State:** NOT IMPLEMENTED.

**Backend Work Required:**
- `POST /api/v1/rates/bulk-update` — body: {room_type_id, rate_plan_id, date_from, date_to, amount, is_percentage_change}
- Update all RateCalendar rows in range
- Push to all active OTAs via sync engine

**Frontend Work Required:**
- Bulk Update form: Room Type | Rate Plan | Date From | Date To | New Rate or % Change | Apply to OTAs checkboxes
- Preview table: shows dates that will be updated
- Confirm and push

**Dependencies:** BLK-004, BLK-010

---

### BLK-023: Promotion Manager
**Module:** Enterprise Channel Manager  
**Priority:** P1 | **Complexity:** HIGH | **Est. Time:** 3 days

**Description:**  
Create, manage, and push promotional pricing to OTAs (e.g., "30% off for 3+ night stays booked 30 days in advance").

**Current State:** NOT IMPLEMENTED.

**Database Work Required:**
```python
class Promotion(Base):
    __tablename__ = "promotions"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    name = Column(String, nullable=False)
    promo_type = Column(String)               # "EarlyBird", "LastMinute", "LongStay"
    discount_type = Column(String)            # "PERCENTAGE", "FLAT"
    discount_value = Column(Float, nullable=False)
    min_los = Column(Integer, default=1)
    advance_booking_days = Column(Integer)    # Book X days before
    valid_from = Column(DateTime)
    valid_to = Column(DateTime)
    target_otas = Column(JSON)               # ["BDC", "AGD"] or all
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Backend Work Required:**
- CRUD `/api/v1/promotions`
- `POST /api/v1/promotions/{id}/push/{ota}` — push promo to specific OTA
- `POST /api/v1/promotions/{id}/push-all` — push to all target OTAs

**Dependencies:** BLK-008, BLK-009

---

### BLK-024: Competitor Rate Monitoring
**Module:** Revenue Management  
**Priority:** P2 | **Complexity:** VERY HIGH | **Est. Time:** 5–7 days

**Description:**  
Track competitor hotel rates on OTAs to inform dynamic pricing decisions.

**Current State:** NOT IMPLEMENTED.

**Database Work Required:**
```python
class CompetitorRate(Base):
    __tablename__ = "competitor_rates"
    id = Column(Integer, primary_key=True)
    property_id = Column(Integer, ForeignKey("properties.id"))
    competitor_name = Column(String)
    check_in_date = Column(DateTime)
    room_type = Column(String)
    our_rate = Column(Float)
    competitor_rate = Column(Float)
    ota_source = Column(String)
    recorded_at = Column(DateTime, default=datetime.utcnow)
```

**Integration Work Required:**
- Option A: Subscribe to OTA Insight or RateGain API (paid service)
- Option B: Scheduled web scraper (Playwright/Selenium) targeting OTA search pages
- Define 3–5 competitor hotels to monitor

**Backend Work Required:**
- `GET /api/v1/revenue/competitor-rates?date=&our_check_in=` — rate comparison
- Background job: fetch competitor rates every 6 hours

**Dependencies:** BLK-021

---

### BLK-025: Demand Forecasting
**Module:** Revenue Management  
**Priority:** P2 | **Complexity:** VERY HIGH | **Est. Time:** 5–7 days

**Description:**  
Forecast occupancy and booking demand for the next 30/60/90 days using historical booking data.

**Current State:** NOT IMPLEMENTED.

**Backend Work Required:**
- Collect minimum 3 months of booking history (this starts from Phase 1)
- ML model: Facebook Prophet (seasonal time-series) or scikit-learn LinearRegression
- Inputs: day_of_week, month, holidays, current_booking_pace, historical_occupancy
- Output: predicted occupancy % per day for next 90 days
- `GET /api/v1/revenue/forecast?days=30` — demand forecast endpoint
- `GET /api/v1/revenue/forecast/pickup` — booking pace pick-up report

**AI Work Required:**
- `pip install prophet scikit-learn pandas`
- Create `backend/app/ml/demand_forecaster.py`
- Train model weekly on latest booking data

**Dependencies:** Minimum 90 days of booking data from live system

---

### BLK-026: AI Dynamic Pricing (Real ML Model)
**Module:** Revenue Management / AI  
**Priority:** P2 | **Complexity:** VERY HIGH | **Est. Time:** 7–10 days

**Description:**  
Replace the current 3-line rule-based pricing suggestion with a genuine ML-powered dynamic pricing engine that recommends optimal rates based on multiple signals.

**Current State:** RULE-BASED. The executive.py has: `if occupancy > 80: recommend +15%`. This is NOT AI.

**Backend Work Required:**
- Create `backend/app/ml/pricing_engine.py`
- Features: occupancy_rate, booking_pace, day_of_week, days_to_arrival, seasonality, competitor_rates, historical_adr
- Model: Gradient Boosting Regressor (XGBoost or scikit-learn)
- Output: recommended_rate per room_type per date
- `GET /api/v1/revenue/pricing-suggestions?date_from=&date_to=` — AI rate recommendations
- Admin can approve/reject/apply suggestions

**AI Work Required:**
- `pip install xgboost scikit-learn`
- Weekly model retraining on latest data
- A/B test: compare AI-recommended vs manual rates on revenue outcome

**Dependencies:** BLK-025 (demand forecasting data), 90+ days booking history

---

### BLK-027: Webhook Management Console
**Module:** Integration  
**Priority:** P2 | **Complexity:** MEDIUM | **Est. Time:** 2 days

**Description:**  
UI to manage all incoming and outgoing webhooks — OTA reservation notifications, payment callbacks, WhatsApp events.

**Current State:** PARTIALLY IMPLEMENTED. WhatsApp webhook exists. No management console.

**Backend Work Required:**
- `GET /api/v1/webhooks` — list all registered webhooks
- `GET /api/v1/webhooks/logs?limit=100` — recent webhook events (success/failure)

**Frontend Work Required:**
- Admin integrations tab: "Webhook Management" section
- Table: Webhook Name | URL | Events | Last Received | Status
- Webhook event log with payload viewer

**Dependencies:** BLK-011

---

### BLK-028: Booking Engine Sync (Bi-directional)
**Module:** Integration  
**Priority:** P2 | **Complexity:** HIGH | **Est. Time:** 3 days

**Description:**  
When a guest books directly on the hotel website (Blue Bird Nest booking engine), automatically decrement inventory on all connected OTAs to prevent overbooking.

**Current State:** PARTIALLY IMPLEMENTED. Own booking engine works but does not push inventory updates to OTAs.

**Backend Work Required:**
- Hook into `public_booking.py` — after booking confirmed, call sync engine
- Decrement RoomAvailability for booked dates
- Push availability update to all active OTAs via `POST /api/v1/sync/{ota}`

**Dependencies:** BLK-010, BLK-011

---

## PHASE 4 — AI Intelligence

---

### BLK-029: AI Anomaly Detection
**Module:** AI  
**Priority:** P2 | **Complexity:** VERY HIGH | **Est. Time:** 7 days

**Description:**  
Automatically detect unusual booking patterns, rate spikes, inventory changes, and flag them for admin review.

**Current State:** NOT IMPLEMENTED.

**Types of anomalies to detect:**
- Booking anomaly: 10+ bookings from same IP in 1 hour
- Rate anomaly: Rate drops below floor price or exceeds ceiling
- Inventory anomaly: Availability drops to 0 on non-holiday dates unexpectedly
- Revenue anomaly: Daily revenue 40% below trailing 7-day average

**Backend Work Required:**
- `backend/app/ml/anomaly_detector.py`
- Statistical anomaly detection: Z-score and IQR-based outlier detection
- Run as background job every 30 minutes
- `GET /api/v1/anomalies` — list detected anomalies
- WhatsApp/email alert to GM when anomaly detected

**AI Work Required:**
- `pip install scikit-learn`
- Isolation Forest or Z-score for unsupervised anomaly detection

**Dependencies:** BLK-021, BLK-025

---

### BLK-030: Event & Holiday Pricing Rules
**Module:** Revenue Management  
**Priority:** P2 | **Complexity:** MEDIUM | **Est. Time:** 2 days

**Description:**  
Set automatic rate multipliers for specific dates, events, and public holidays.

**Current State:** NOT IMPLEMENTED.

**Backend Work Required:**
- Event calendar: store events with date + multiplier (e.g., Diwali = 1.5x rate)
- Apply multipliers to rate calendar during bulk update
- `GET/POST/PUT/DELETE /api/v1/events/pricing-rules`
- Pre-seeded: Indian public holidays for A&N Islands

**Dependencies:** BLK-004

---

## PHASE 5 — Multi-Property Enterprise

---

### BLK-031: Central Property Configuration
**Module:** Multi-Property  
**Priority:** P1 | **Complexity:** MEDIUM | **Est. Time:** 2 days

**Description:**  
Manage all hotel properties from one admin console — each with its own OTA connections, rates, and staff.

**Dependencies:** BLK-006 (multi-property foundation)

---

### BLK-032: Cross-Property Revenue Reporting
**Module:** Multi-Property  
**Priority:** P2 | **Complexity:** MEDIUM | **Est. Time:** 2 days

**Description:**  
Executive dashboard showing portfolio-level KPIs across all managed properties.

**Dependencies:** BLK-006, BLK-021

---

## PHASE 6 — Advanced Automation

---

### BLK-033: Airbnb Integration
**Module:** Enterprise Channel Manager  
**Priority:** P2 | **Complexity:** HIGH | **Est. Time:** 4 days

**Description:**  
Connect to Airbnb API for inventory and reservation sync. Airbnb uses a different model (iCal + API) and has stricter partner requirements.

**Integration Work Required:**
- Apply for Airbnb Software Partner program
- Implement iCal sync as minimum viable connector
- Implement Airbnb API for rate and availability push

**Dependencies:** BLK-001 through BLK-004

---

### BLK-034: Goibibo Dedicated Connector
**Module:** Enterprise Channel Manager  
**Priority:** P2 | **Complexity:** MEDIUM | **Est. Time:** 2 days

**Description:**  
Goibibo is merged with MakeMyTrip and uses the same API. BLK-009 covers both. This item is for any Goibibo-specific configuration or reporting needs.

**Dependencies:** BLK-009

---

### BLK-035: Rate Shopping via API
**Module:** Revenue Management  
**Priority:** P3 | **Complexity:** HIGH | **Est. Time:** 3 days

**Dependencies:** BLK-024

---

### BLK-036: AI Yield Management Auto-Apply
**Module:** AI  
**Priority:** P3 | **Complexity:** VERY HIGH | **Est. Time:** 5 days

**Description:**  
Allow the system to automatically apply AI-recommended rates to OTAs without manual approval, within configurable guardrails (floor price, ceiling price, maximum % change per day).

**Dependencies:** BLK-026, BLK-010

---

### BLK-037: OTA Intelligence Reporting
**Module:** Revenue Management  
**Priority:** P3 | **Complexity:** MEDIUM | **Est. Time:** 3 days

**Description:**  
Which OTA generates the most revenue? Highest ADR? Most cancellations? OTA performance scorecard.

**Dependencies:** BLK-021

---

### BLK-038: Central Rate Management — Mobile App
**Module:** Enterprise Channel Manager  
**Priority:** P3 | **Complexity:** VERY HIGH | **Est. Time:** 10+ days

**Description:**  
Mobile-optimized version of the rate calendar for hotel GMs to manage rates on the go.

**Dependencies:** BLK-004, BLK-010

---

### BLK-039: Automated Night Audit Enhancement
**Module:** Integration  
**Priority:** P2 | **Complexity:** MEDIUM | **Est. Time:** 2 days

**Description:**  
Enhance existing Night Audit to include: OTA commission deduction, per-channel revenue, next-day pickup forecast, and automatic rate recalibration.

**Current State:** PARTIALLY IMPLEMENTED. Basic night audit exists but no OTA data.

**Dependencies:** BLK-021, BLK-025

---

## Master Database Schema (All 19 New Models)

```sql
-- Run these as Alembic migrations

CREATE TABLE properties (id, name, code, address, city, state, country, timezone, currency_code, total_rooms, is_active, created_at);
CREATE TABLE room_types (id, property_id, name, code, total_units, base_rate, max_occupancy, description, is_active);
CREATE TABLE rate_plans (id, property_id, name, code, plan_type, is_refundable, cancellation_policy, includes_breakfast, is_active);
CREATE TABLE ota_channels (id, name, code, channel_type, api_type, api_base_url, webhook_url, commission_percent, is_active, logo_url, created_at);
CREATE TABLE ota_credentials (id, property_id, ota_id, hotel_id_on_ota, api_key_encrypted, api_secret_encrypted, username, is_connected, last_connection_test, connection_status, created_at, updated_at);
CREATE TABLE channel_mappings (id, property_id, room_type_id, ota_id, ota_room_type_code, ota_room_type_name, is_active, created_at);
CREATE TABLE rate_mappings (id, property_id, rate_plan_id, ota_id, ota_rate_plan_code, ota_rate_plan_name, is_active);
CREATE TABLE room_availability (id, property_id, room_type_id, date, total_rooms, rooms_available, rooms_booked, is_stop_sell, is_closed_to_arrival, is_closed_to_departure, updated_at);
CREATE TABLE rate_calendar (id, property_id, room_type_id, rate_plan_id, date, rate, min_los, max_los, updated_at, updated_by);
CREATE TABLE restrictions (id, property_id, room_type_id, date_from, date_to, min_los, max_los, closed_to_arrival, closed_to_departure, applies_to_otas, created_by, created_at);
CREATE TABLE reservation_events (id, booking_id, ota_id, ota_booking_ref, event_type, raw_payload, processed_at, status);
CREATE TABLE sync_jobs (id, property_id, ota_id, job_type, status, started_at, completed_at, rooms_synced, rates_synced, errors, triggered_by);
CREATE TABLE sync_errors (id, sync_job_id, ota_id, error_code, error_message, request_payload, retry_count, next_retry_at, resolved, created_at);
CREATE TABLE promotions (id, property_id, name, promo_type, discount_type, discount_value, min_los, advance_booking_days, valid_from, valid_to, target_otas, is_active, created_at);
CREATE TABLE competitor_rates (id, property_id, competitor_name, check_in_date, room_type, our_rate, competitor_rate, ota_source, recorded_at);
CREATE TABLE revenue_metrics (id, property_id, date, channel_code, rooms_sold, gross_revenue, commission_paid, net_revenue, adr, rev_par, occupancy_pct);
CREATE TABLE audit_logs (id, property_id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, created_at);
CREATE TABLE roles (id, name, description, is_system_role);
CREATE TABLE permissions (id, role, module, can_view, can_create, can_edit, can_delete, can_sync);
```

---

## Backlog Summary

| Phase | Items | Priority | Total Est. Time |
|-------|-------|----------|----------------|
| Phase 1 | BLK-001 to BLK-007 | P0 | 3–4 weeks |
| Phase 2 | BLK-008 to BLK-020 | P0/P1 | 4–6 weeks |
| Phase 3 | BLK-021 to BLK-028 | P1/P2 | 4–5 weeks |
| Phase 4 | BLK-029 to BLK-030 | P2 | 2–3 weeks |
| Phase 5 | BLK-031 to BLK-032 | P1/P2 | 1–2 weeks |
| Phase 6 | BLK-033 to BLK-039 | P2/P3 | 3–4 weeks |
| **TOTAL** | **39 Items** | — | **~17–24 weeks** |

---

*Generated by Antigravity AI Engineering Platform — 2026-09-01*  
*Zero source code files were modified during this audit.*
