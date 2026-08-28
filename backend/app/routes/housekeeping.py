from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from app.database import get_db
from app.models import Ticket, User, Booking, Room
from app.schemas import TicketResponse, TicketUpdate, TicketCreate, RoomResponse, RoomStatusUpdate
from app.auth import RoleChecker, get_current_user

router = APIRouter(prefix="/api/v1/housekeeping", tags=["Housekeeping & Room Turnovers"])

staff_role_guard = RoleChecker(["Admin", "Housekeeping", "Reception", "Executive"])

@router.get("/rooms", response_model=List[RoomResponse])
async def get_housekeeping_rooms(
    floor: Optional[int] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(staff_role_guard)
):
    """
    Get all 50 rooms with current cleaning & occupancy status.
    """
    query = select(Room)
    if floor:
        query = query.where(Room.floor == floor)
    if status_filter:
        query = query.where(Room.status == status_filter)
    query = query.order_by(Room.room_number.asc())
    result = await db.execute(query)
    return result.scalars().all()

@router.put("/rooms/{room_number}/status", response_model=RoomResponse)
async def update_room_cleaning_status(
    room_number: str,
    status_in: RoomStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(staff_role_guard)
):
    """
    Update room turnover status:
    Dirty -> Cleaning -> Clean -> Inspected
    """
    result = await db.execute(select(Room).where(Room.room_number == room_number))
    room = result.scalars().first()
    if not room:
        raise HTTPException(status_code=404, detail=f"Room {room_number} not found")
        
    room.status = status_in.status
    if status_in.is_occupied is not None:
        room.is_occupied = status_in.is_occupied
        
    await db.flush()
    return room

@router.get("/tickets", response_model=List[TicketResponse])
async def get_tickets(
    status_filter: Optional[str] = None,
    category_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(staff_role_guard)
):
    """
    Get all operational tickets (Housekeeping, Maintenance, Amenities).
    """
    query = select(Ticket)
    if status_filter:
        query = query.where(Ticket.status == status_filter)
    if category_filter and category_filter != "All":
        query = query.where(Ticket.category == category_filter)
    
    query = query.order_by(Ticket.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/tickets", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_in: TicketCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(staff_role_guard)
):
    """
    Create a new operational ticket.
    """
    ticket = Ticket(
        booking_id=ticket_in.booking_id,
        room_number=ticket_in.room_number,
        category=ticket_in.category,
        description=ticket_in.description,
        priority=ticket_in.priority,
        status="Pending"
    )
    db.add(ticket)
    await db.flush()
    return ticket

@router.put("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: int,
    ticket_update: TicketUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(staff_role_guard)
):
    """
    Update ticket status (Pending -> In Progress -> Cleaned) and digital inspection checklist.
    """
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if ticket_update.status is not None:
        ticket.status = ticket_update.status
    if ticket_update.assigned_to is not None:
        ticket.assigned_to = ticket_update.assigned_to
    if ticket_update.checklist is not None:
        ticket.checklist = ticket_update.checklist

    await db.flush()
    return ticket
