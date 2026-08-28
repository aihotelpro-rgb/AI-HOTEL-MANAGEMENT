import sys, os, datetime, asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from app.models import Guest, Booking

async def seed_demo():
    async with AsyncSessionLocal() as session:
        now = datetime.datetime.utcnow()
        today = datetime.datetime(now.year, now.month, now.day)

        # 1. Past Guests & Completed Stays
        p_guest1 = Guest(name="Lord Alistair Crawford", phone="+447911123456", email="alistair@crawford-manor.uk", vip_status=True, nationality="Foreigner", id_type="Passport", id_number="UK98765432")
        p_guest2 = Guest(name="Dr. Ananya Roy", phone="+919876543210", email="ananya.roy@aiims.edu.in", vip_status=False, nationality="Indian", id_type="Aadhaar Card", id_number="9876-5432-1098")
        p_guest3 = Guest(name="Siddharth Verma", phone="+919811223344", email="siddharth@verma-tech.in", vip_status=False, nationality="Indian", id_type="Driving License", id_number="DL-142011009876")

        # 2. Today's Expected Arrivals
        a_guest1 = Guest(name="Rajesh Patel", phone="+919822334455", email="rajesh.patel@gujarat-trading.com", vip_status=False, nationality="Indian", id_type="Aadhaar Card", id_number="4567-8901-2345")
        a_guest2 = Guest(name="Emily Watson", phone="+14155552671", email="emily.watson@sf-ventures.io", vip_status=True, nationality="Foreigner", id_type="Passport", id_number="US99887766")

        # 3. Future Upcoming Reservations
        f_guest1 = Guest(name="Karan Johar & Family", phone="+919833445566", email="karan@dharma-films.in", vip_status=True, nationality="Indian", id_type="Aadhaar Card", id_number="1234-5678-9012")
        f_guest2 = Guest(name="Dr. Marcus Vance", phone="+49301234567", email="marcus@vance-medical.de", vip_status=True, nationality="Foreigner", id_type="Passport", id_number="DE55443322")
        f_guest3 = Guest(name="Sunita Agarwal", phone="+919844556677", email="sunita@agarwal-jewellers.in", vip_status=False, nationality="Indian", id_type="Voter ID", id_number="WB9876543")

        session.add_all([p_guest1, p_guest2, p_guest3, a_guest1, a_guest2, f_guest1, f_guest2, f_guest3])
        await session.flush()

        # Seed Past Bookings (Completed)
        pb1 = Booking(guest_id=p_guest1.id, room_number="508", check_in=today - datetime.timedelta(days=15), check_out=today - datetime.timedelta(days=10), is_active=False, total_nights=5, room_rate=18000.0, channel="Booking.com")
        pb2 = Booking(guest_id=p_guest2.id, room_number="205", check_in=today - datetime.timedelta(days=20), check_out=today - datetime.timedelta(days=16), is_active=False, total_nights=4, room_rate=5500.0, channel="Agoda")
        pb3 = Booking(guest_id=p_guest3.id, room_number="401", check_in=today - datetime.timedelta(days=8), check_out=today - datetime.timedelta(days=3), is_active=False, total_nights=5, room_rate=9500.0, channel="MakeMyTrip")

        # Seed Today's Expected Arrivals
        ab1 = Booking(guest_id=a_guest1.id, room_number="201", check_in=today, check_out=today + datetime.timedelta(days=3), is_active=False, total_nights=3, room_rate=5500.0, channel="Agoda")
        ab2 = Booking(guest_id=a_guest2.id, room_number="405", check_in=today, check_out=today + datetime.timedelta(days=5), is_active=False, total_nights=5, room_rate=9500.0, channel="MakeMyTrip")

        # Seed Future Upcoming Reservations
        fb1 = Booking(guest_id=f_guest1.id, room_number="502", check_in=today + datetime.timedelta(days=2), check_out=today + datetime.timedelta(days=6), is_active=False, total_nights=4, room_rate=12000.0, channel="Direct Website")
        fb2 = Booking(guest_id=f_guest2.id, room_number="310", check_in=today + datetime.timedelta(days=5), check_out=today + datetime.timedelta(days=9), is_active=False, total_nights=4, room_rate=9500.0, channel="Booking.com")
        fb3 = Booking(guest_id=f_guest3.id, room_number="104", check_in=today + datetime.timedelta(days=10), check_out=today + datetime.timedelta(days=14), is_active=False, total_nights=4, room_rate=3800.0, channel="Agoda")

        session.add_all([pb1, pb2, pb3, ab1, ab2, fb1, fb2, fb3])
        await session.flush()
        await session.commit()
        print("Successfully seeded Past, Today's Arrival, and Future Demo Bookings!")

if __name__ == "__main__":
    asyncio.run(seed_demo())
