import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload
from sqlalchemy import func, desc

from app.database import get_db
from app.models import TravelAgent, AgentLedgerTransaction, Booking, Guest, User
from app.schemas import (
    TravelAgentCreate, TravelAgentUpdate, TravelAgentResponse,
    AgentPaymentCreate, AgentLedgerTransactionResponse
)
from app.auth import get_current_user

router = APIRouter(prefix="/api/v1/agents", tags=["Travel Agent & B2B Ledger Management"])

# Guard for reception and management
def agent_guard(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["Admin", "Reception", "Executive", "SuperAdmin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Front Desk & Management"
        )
    return current_user


@router.get("/summary/stats")
async def get_agent_summary_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(agent_guard)
):
    """
    Returns executive B2B metrics: total agents, total credit exposure,
    total advances collected, and top active travel partners.
    """
    agents_result = await db.execute(select(TravelAgent))
    agents = agents_result.scalars().all()

    total_agents = len(agents)
    active_agents = sum(1 for a in agents if a.is_active)
    total_outstanding_debt = sum(max(0.0, a.current_balance) for a in agents)
    total_credit_limit = sum(a.credit_limit for a in agents if a.is_active)

    # Calculate total credit payments received across all agent ledgers
    credits_q = await db.execute(
        select(func.coalesce(func.sum(AgentLedgerTransaction.amount), 0.0))
        .where(AgentLedgerTransaction.transaction_type == "CREDIT_PAYMENT")
    )
    total_payments_collected = credits_q.scalar() or 0.0

    # Total B2B Bookings
    bookings_q = await db.execute(
        select(func.count(Booking.id)).where(Booking.travel_agent_id.isnot(None))
    )
    total_b2b_bookings = bookings_q.scalar() or 0

    return {
        "total_agents": total_agents,
        "active_agents": active_agents,
        "total_outstanding_debt_inr": round(total_outstanding_debt, 2),
        "total_credit_limit_inr": round(total_credit_limit, 2),
        "credit_utilization_percent": round((total_outstanding_debt / total_credit_limit * 100), 1) if total_credit_limit > 0 else 0.0,
        "total_payments_collected_inr": round(total_payments_collected, 2),
        "total_b2b_bookings": total_b2b_bookings
    }


@router.get("", response_model=List[dict])
async def list_travel_agents(
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(agent_guard)
):
    """
    List all travel agencies with their live outstanding balances,
    credit limits, and active booking counts.
    """
    query = select(TravelAgent).order_by(TravelAgent.agency_name)
    if is_active is not None:
        query = query.where(TravelAgent.is_active == is_active)
    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.where(
            (TravelAgent.agency_name.ilike(search_pattern)) |
            (TravelAgent.contact_person.ilike(search_pattern)) |
            (TravelAgent.phone.ilike(search_pattern)) |
            (TravelAgent.city.ilike(search_pattern))
        )

    result = await db.execute(query)
    agents = result.scalars().all()

    response = []
    for a in agents:
        # Count total bookings & active stays
        b_count_q = await db.execute(
            select(func.count(Booking.id)).where(Booking.travel_agent_id == a.id)
        )
        total_bookings = b_count_q.scalar() or 0

        active_b_q = await db.execute(
            select(func.count(Booking.id)).where(
                Booking.travel_agent_id == a.id,
                Booking.is_active == True
            )
        )
        active_bookings = active_b_q.scalar() or 0

        available_credit = max(0.0, a.credit_limit - a.current_balance)

        response.append({
            "id": a.id,
            "agency_name": a.agency_name,
            "contact_person": a.contact_person,
            "phone": a.phone,
            "email": a.email,
            "city": a.city,
            "address": a.address,
            "gstin": a.gstin,
            "pan_number": a.pan_number,
            "contract_type": a.contract_type,
            "commission_pct": a.commission_pct,
            "credit_limit": a.credit_limit,
            "credit_days": a.credit_days,
            "current_balance": round(a.current_balance, 2),
            "available_credit": round(available_credit, 2),
            "is_active": a.is_active,
            "notes": a.notes,
            "total_bookings": total_bookings,
            "active_bookings": active_bookings,
            "created_at": a.created_at.isoformat() if a.created_at else None
        })

    return response


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_travel_agent(
    payload: TravelAgentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(agent_guard)
):
    """
    Register a new travel agency / tour operator partner in the PMS.
    """
    agent = TravelAgent(
        agency_name=payload.agency_name.strip(),
        contact_person=payload.contact_person,
        phone=payload.phone.strip(),
        email=payload.email,
        city=payload.city or "Port Blair",
        address=payload.address,
        gstin=payload.gstin,
        pan_number=payload.pan_number,
        contract_type=payload.contract_type or "NET_RATE",
        commission_pct=payload.commission_pct or 0.0,
        credit_limit=payload.credit_limit or 100000.0,
        credit_days=payload.credit_days or 30,
        current_balance=0.0,
        is_active=True,
        notes=payload.notes
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return {
        "status": "success",
        "message": f"Travel agency '{agent.agency_name}' registered successfully",
        "agent": {
            "id": agent.id,
            "agency_name": agent.agency_name,
            "contact_person": agent.contact_person,
            "phone": agent.phone,
            "credit_limit": agent.credit_limit,
            "credit_days": agent.credit_days
        }
    }


@router.get("/{agent_id}")
async def get_travel_agent(
    agent_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(agent_guard)
):
    """
    Retrieve single travel agency profile with live credit health.
    """
    result = await db.execute(select(TravelAgent).where(TravelAgent.id == agent_id))
    agent = result.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Travel agency not found")

    available_credit = max(0.0, agent.credit_limit - agent.current_balance)

    return {
        "id": agent.id,
        "agency_name": agent.agency_name,
        "contact_person": agent.contact_person,
        "phone": agent.phone,
        "email": agent.email,
        "city": agent.city,
        "address": agent.address,
        "gstin": agent.gstin,
        "pan_number": agent.pan_number,
        "contract_type": agent.contract_type,
        "commission_pct": agent.commission_pct,
        "credit_limit": agent.credit_limit,
        "credit_days": agent.credit_days,
        "current_balance": round(agent.current_balance, 2),
        "available_credit": round(available_credit, 2),
        "is_active": agent.is_active,
        "notes": agent.notes,
        "created_at": agent.created_at.isoformat() if agent.created_at else None
    }


@router.put("/{agent_id}")
async def update_travel_agent(
    agent_id: int,
    payload: TravelAgentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(agent_guard)
):
    """
    Update travel agency profile, credit limits, or active status.
    """
    result = await db.execute(select(TravelAgent).where(TravelAgent.id == agent_id))
    agent = result.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Travel agency not found")

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            setattr(agent, key, value)

    await db.commit()
    await db.refresh(agent)
    return {
        "status": "updated",
        "message": f"Updated profile for '{agent.agency_name}'",
        "agent_id": agent.id
    }


@router.get("/{agent_id}/ledger")
async def get_agent_statement_of_account(
    agent_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(agent_guard)
):
    """
    Generates a full Statement of Account (SOA) for the travel agent.
    Lists all debits (guest stay invoices) and credits (advance / scheduled payments).
    """
    agent_res = await db.execute(select(TravelAgent).where(TravelAgent.id == agent_id))
    agent = agent_res.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Travel agency not found")

    query = select(AgentLedgerTransaction).where(AgentLedgerTransaction.agent_id == agent_id)
    if start_date:
        try:
            s_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d")
            query = query.where(AgentLedgerTransaction.created_at >= s_dt)
        except Exception:
            pass
    if end_date:
        try:
            e_dt = datetime.datetime.strptime(end_date, "%Y-%m-%d") + datetime.timedelta(days=1)
            query = query.where(AgentLedgerTransaction.created_at < e_dt)
        except Exception:
            pass

    query = query.order_by(desc(AgentLedgerTransaction.created_at))
    tx_result = await db.execute(query)
    transactions = tx_result.scalars().all()

    total_debits = sum(t.amount for t in transactions if t.transaction_type == "DEBIT_INVOICE")
    total_credits = sum(t.amount for t in transactions if t.transaction_type == "CREDIT_PAYMENT")

    return {
        "agency": {
            "id": agent.id,
            "agency_name": agent.agency_name,
            "contact_person": agent.contact_person,
            "phone": agent.phone,
            "gstin": agent.gstin,
            "credit_limit": agent.credit_limit,
            "credit_days": agent.credit_days,
            "current_balance": round(agent.current_balance, 2)
        },
        "statement_summary": {
            "total_transactions": len(transactions),
            "total_invoiced_debits_inr": round(total_debits, 2),
            "total_payments_credited_inr": round(total_credits, 2),
            "net_outstanding_balance_inr": round(agent.current_balance, 2)
        },
        "transactions": [
            {
                "id": t.id,
                "created_at": t.created_at.strftime("%Y-%m-%d %H:%M"),
                "transaction_type": t.transaction_type,
                "description": t.description,
                "reference_utr": t.reference_utr,
                "payment_mode": t.payment_mode,
                "amount": round(t.amount, 2),
                "balance_after": round(t.balance_after, 2),
                "booking_id": t.booking_id
            }
            for t in transactions
        ]
    }


@router.post("/{agent_id}/payments", status_code=status.HTTP_201_CREATED)
async def record_agent_payment(
    agent_id: int,
    payload: AgentPaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(agent_guard)
):
    """
    Record an advance payment, bank transfer (NEFT/RTGS), UPI, or cheque payment
    from the travel agent. Reduces their outstanding credit balance.
    """
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be greater than 0")

    result = await db.execute(select(TravelAgent).where(TravelAgent.id == agent_id))
    agent = result.scalars().first()
    if not agent:
        raise HTTPException(status_code=404, detail="Travel agency not found")

    new_balance = agent.current_balance - payload.amount
    agent.current_balance = new_balance

    description = f"Payment Received via {payload.payment_mode}"
    if payload.reference_utr:
        description += f" (Ref/UTR: {payload.reference_utr})"
    if payload.notes:
        description += f" - {payload.notes}"

    tx = AgentLedgerTransaction(
        agent_id=agent.id,
        booking_id=payload.booking_id,
        transaction_type="CREDIT_PAYMENT",
        payment_mode=payload.payment_mode,
        reference_utr=payload.reference_utr,
        amount=payload.amount,
        balance_after=new_balance,
        description=description,
        created_at=datetime.datetime.utcnow()
    )
    db.add(tx)
    await db.commit()
    await db.refresh(tx)

    return {
        "status": "success",
        "message": f"Successfully credited ₹{payload.amount:,.2f} to {agent.agency_name}'s ledger",
        "transaction_id": tx.id,
        "new_balance_due": round(new_balance, 2),
        "reference_utr": payload.reference_utr
    }


@router.get("/{agent_id}/bookings")
async def list_agent_bookings(
    agent_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(agent_guard)
):
    """
    List all bookings (past, active, upcoming) associated with this travel agency.
    """
    result = await db.execute(
        select(Booking)
        .options(joinedload(Booking.guest))
        .where(Booking.travel_agent_id == agent_id)
        .order_by(desc(Booking.check_in))
    )
    bookings = result.scalars().all()

    return [
        {
            "booking_id": b.id,
            "guest_name": b.guest.name if b.guest else "Unknown",
            "guest_phone": b.guest.phone if b.guest else "",
            "room_number": b.room_number,
            "check_in": b.check_in.strftime("%Y-%m-%d"),
            "check_out": b.check_out.strftime("%Y-%m-%d"),
            "total_nights": b.total_nights,
            "room_rate": b.room_rate,
            "voucher_number": b.voucher_number or "N/A",
            "billing_type": b.billing_type or "DIRECT_GUEST",
            "meal_plan": b.meal_plan or "EP",
            "agent_advance_paid": b.agent_advance_paid or 0.0,
            "is_active": b.is_active,
            "total_room_cost": round(b.room_rate * b.total_nights, 2)
        }
        for b in bookings
    ]
