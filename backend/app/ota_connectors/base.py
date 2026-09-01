from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseOTAConnector(ABC):
    """
    Abstract Base Class for all OTA Channel Connectors
    (Booking.com, MakeMyTrip, Agoda, Expedia, Goibibo, Airbnb).
    """

    def __init__(self, channel_code: str, hotel_id: str, api_key: str, api_secret: str = ""):
        self.channel_code = channel_code
        self.hotel_id = hotel_id
        self.api_key = api_key
        self.api_secret = api_secret

    @abstractmethod
    async def push_rates(self, room_code: str, rate_plan_code: str, date_str: str, rate: float) -> Dict[str, Any]:
        """Pushes single rate update to OTA API."""
        pass

    @abstractmethod
    async def push_inventory(self, room_code: str, date_str: str, available_units: int, stop_sell: bool = False) -> Dict[str, Any]:
        """Pushes room availability & stop-sell state to OTA API."""
        pass

    @abstractmethod
    async def pull_reservations(self, start_date: str, end_date: str) -> List[Dict[str, Any]]:
        """Pulls recent bookings & modifications from OTA API."""
        pass

    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Verifies API credentials and connectivity with OTA server."""
        pass
