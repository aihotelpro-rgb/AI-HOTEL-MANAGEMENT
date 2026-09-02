'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, getAuthToken, clearAuthToken, API_BASE } from '@/lib/api';
import { IntercomAudioSession } from '@/lib/webrtc';
import Sidebar from '@/components/Sidebar';
import ThemeDatePicker from '@/components/ThemeDatePicker';
import { 
  Building, 
  UserCheck, 
  Receipt, 
  MessageSquare, 
  RefreshCw, 
  Search, 
  Key, 
  Sparkles, 
  Layers, 
  CreditCard,
  Calendar,
  LayoutGrid,
  List
} from 'lucide-react';

interface Room {
  id: number;
  room_number: string;
  floor: number;
  room_type: string;
  status: string; // Clean, Dirty, Cleaning, Inspected, OutOfOrder
  price_per_night: number;
  is_occupied: boolean;
  current_guest_name?: string;
}

interface ActiveStay {
  booking_id: number;
  room_number: string;
  guest_name: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  room_rate: number;
  vip_status: boolean;
}

interface WhatsAppLog {
  id: number;
  from_phone: string;
  guest_name?: string;
  message_text: string;
  ai_reply?: string;
  intent: string;
  created_at: string;
}

export default function ReceptionPMSPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeStays, setActiveStays] = useState<ActiveStay[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [selectedFloor, setSelectedFloor] = useState<number | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [roomViewMode, setRoomViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'grid' | 'stays' | 'whatsapp' | 'daily'>('grid');
  const [dailyBookings, setDailyBookings] = useState<any>({
    today_arrivals: [],
    today_departures: [],
    upcoming_reservations: [],
    past_history: [],
    all_bookings: []
  });

  // Advance 360° Stayview Calendar Controls
  const [calendarStartDate, setCalendarStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [calendarEndDate, setCalendarEndDate] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [calendarSearch, setCalendarSearch] = useState<string>('');
  const [calendarSubView, setCalendarSubView] = useState<'matrix' | 'arrivals' | 'departures' | 'history'>('matrix');

  // Intercom Call Console State
  const [intercomCallModalOpen, setIntercomCallModalOpen] = useState(false);
  const [activeIntercomRoom, setActiveIntercomRoom] = useState('204');
  const [intercomCallActive, setIntercomCallActive] = useState(false);
  const [intercomCallSeconds, setIntercomCallSeconds] = useState(0);
  const [intercomTab, setIntercomTab] = useState<'console' | 'history'>('console');
  const [intercomCallLogs, setIntercomCallLogs] = useState<any[]>([]);
  const [outboundCallId, setOutboundCallId] = useState<string | null>(null);
  const [outboundCallStartedAt, setOutboundCallStartedAt] = useState<string | null>(null);

  // Incoming call notification state (live polling)
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [incomingCallVisible, setIncomingCallVisible] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const activeWebRtcRef = useRef<IntercomAudioSession | null>(null);

  const loadIntercomHistory = async () => {
    try {
      const logs = await apiRequest('/api/v1/intercom/history');
      setIntercomCallLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error('Failed to load intercom logs', err);
    }
  };

  // Play a distinct incoming ring chime (different from outbound ringback)
  const playIncomingRingTone = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      // Three-beep incoming ring pattern: 880Hz → 660Hz → 880Hz
      const beep = (startAt: number, freq: number, dur: number) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
        g.gain.setValueAtTime(0, ctx.currentTime + startAt);
        g.gain.linearRampToValueAtTime(0.22, ctx.currentTime + startAt + 0.02);
        g.gain.linearRampToValueAtTime(0, ctx.currentTime + startAt + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime + startAt);
        osc.stop(ctx.currentTime + startAt + dur + 0.05);
      };

      beep(0,    880, 0.18);
      beep(0.25, 660, 0.18);
      beep(0.50, 880, 0.18);
      beep(0.80, 660, 0.18);
      beep(1.05, 880, 0.25);

      setTimeout(() => { try { ctx.close(); } catch(e){} }, 1800);
    } catch (err) {
      console.warn('Incoming ring tone skipped', err);
    }
  };

  // Poll server every 3 seconds for incoming calls from guest rooms
  const pollForIncomingCalls = async () => {
    try {
      const queue: any[] = await apiRequest('/api/v1/intercom/call');
      if (!Array.isArray(queue)) return;
      // Find first ringing call not already being handled
      const ringing = queue.find(c => c.status === 'ringing');
      if (ringing && incomingCall?.call_id !== ringing.call_id) {
        setIncomingCall(ringing);
        setIncomingCallVisible(true);
        playIncomingRingTone();
      }
      // If our active call was answered/completed on server side, update UI
      if (!ringing && incomingCall && incomingCall.status === 'ringing') {
        // Call expired or was declined from another tab — clear it
        setIncomingCall(null);
        setIncomingCallVisible(false);
      }
    } catch (err) {
      // silently fail — polling should not crash the page
    }
  };

  const answerIncomingCall = async (call: any) => {
    try {
      await apiRequest('/api/v1/intercom/answer', {
        method: 'POST',
        body: JSON.stringify({ call_id: call.call_id, action: 'answer' })
      });
      setActiveIntercomRoom(call.from_room);
      setActiveCallId(call.call_id);
      setIntercomCallActive(true);
      setIntercomCallModalOpen(true);
      setIntercomTab('console');
      setIncomingCallVisible(false);
      setIncomingCall(null);

      // Start WebRTC audio session as receiver
      if (activeWebRtcRef.current) activeWebRtcRef.current.stop();
      activeWebRtcRef.current = new IntercomAudioSession(call.call_id, 'receiver');
      activeWebRtcRef.current.start();
    } catch (err) {
      console.warn('Answer call failed', err);
    }
  };

  const declineIncomingCall = async (call: any) => {
    try {
      await apiRequest('/api/v1/intercom/answer', {
        method: 'POST',
        body: JSON.stringify({ call_id: call.call_id, action: 'decline' })
      });
    } catch (err) {}
    setIncomingCallVisible(false);
    setIncomingCall(null);
    loadIntercomHistory();
  };

  const playReceptionRingbackChime = () => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(440, ctx.currentTime);
      osc2.frequency.setValueAtTime(480, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      setTimeout(() => {
        try {
          osc1.stop();
          osc2.stop();
          ctx.close();
        } catch (e) {}
      }, 1800);
    } catch (err) {
      console.warn('Audio ringback tone skipped', err);
    }
  };

  const executeReceptionCall = async (targetRoom: string) => {
    playReceptionRingbackChime();
    const now = new Date().toISOString();
    setIntercomCallActive(true);
    setOutboundCallStartedAt(now);
    try {
      const result = await apiRequest('/api/v1/intercom/outbound', {
        method: 'POST',
        body: JSON.stringify({ target_room: targetRoom, from_extension: '100', room_number: targetRoom })
      });
      if (result?.call_id) {
        setOutboundCallId(result.call_id);
        // Start WebRTC audio session as caller
        if (activeWebRtcRef.current) activeWebRtcRef.current.stop();
        activeWebRtcRef.current = new IntercomAudioSession(result.call_id, 'caller');
        activeWebRtcRef.current.start();
      }
      loadIntercomHistory();
    } catch (err) {
      console.warn('Reception outbound call logged', err);
    }
  };

  const endReceptionCall = async () => {
    if (activeWebRtcRef.current) {
      activeWebRtcRef.current.stop();
      activeWebRtcRef.current = null;
    }
    const targetCallId = activeCallId || outboundCallId;
    if (targetCallId) {
      const durSecs = intercomCallSeconds;
      try {
        await apiRequest('/api/v1/intercom/answer', {
          method: 'POST',
          body: JSON.stringify({
            call_id: targetCallId,
            action: 'end',
            duration_seconds: durSecs
          })
        });
      } catch (err) {
        console.warn('End reception call failed', err);
      }
    }
    setIntercomCallActive(false);
    setIntercomCallSeconds(0);
    setActiveCallId(null);
    setOutboundCallId(null);
    setOutboundCallStartedAt(null);
    loadIntercomHistory();
  };

  useEffect(() => {
    if (intercomCallModalOpen) {
      loadIntercomHistory();
    }
  }, [intercomCallModalOpen]);

  useEffect(() => {
    let timer: any = null;
    if (intercomCallActive) {
      timer = setInterval(() => setIntercomCallSeconds(s => s + 1), 1000);
    } else {
      setIntercomCallSeconds(0);
    }
    return () => clearInterval(timer);
  }, [intercomCallActive]);

  // Start polling for incoming calls as soon as reception page loads
  useEffect(() => {
    const poll = setInterval(pollForIncomingCalls, 3000);
    // Also poll once immediately
    pollForIncomingCalls();
    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Modal States
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkInRoomNumber, setCheckInRoomNumber] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('+91 ');
  const [guestEmail, setGuestEmail] = useState('');
  const [nights, setNights] = useState(2);
  const [isVip, setIsVip] = useState(false);
  const [checkInLoading, setCheckInLoading] = useState(false);

  // Ministry of Tourism & Police C-Form Compliance States
  const [nationality, setNationality] = useState('Indian');
  const [idType, setIdType] = useState('Aadhaar Card');
  const [idNumber, setIdNumber] = useState('');
  const [cityStateOrigin, setCityStateOrigin] = useState('');
  const [purposeOfVisit, setPurposeOfVisit] = useState('Tourism & Leisure');
  const [gstin, setGstin] = useState('');

  // Check Out Folio Modal State
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [folioData, setFolioData] = useState<any>(null);
  const [checkOutLoading, setCheckOutLoading] = useState(false);

  // Bedside Room QR Standee Modal State
  const [selectedQrRoom, setSelectedQrRoom] = useState<string | null>(null);

  // New Direct Reservation / Walk-In Modal State
  const [reservationModalOpen, setReservationModalOpen] = useState(false);
  const [resGuestName, setResGuestName] = useState('');
  const [resGuestPhone, setResGuestPhone] = useState('+91 ');
  const [resGuestEmail, setResGuestEmail] = useState('');
  const [resRoomNumber, setResRoomNumber] = useState('101');
  const [resCheckInDate, setResCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [resCheckOutDate, setResCheckOutDate] = useState(new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]);
  const [resRate, setResRate] = useState(4500);
  const [resChannel, setResChannel] = useState('Direct Walk-In');
  const [resVip, setResVip] = useState(false);
  const [resInstantCheckIn, setResInstantCheckIn] = useState(false);
  const [resNationality, setResNationality] = useState('Indian');
  const [resIdType, setResIdType] = useState('Aadhaar Card');
  const [resIdNumber, setResIdNumber] = useState('');
  const [resCityStateOrigin, setResCityStateOrigin] = useState('');
  const [resPurposeOfVisit, setResPurposeOfVisit] = useState('Tourism & Leisure');
  const [resGstin, setResGstin] = useState('');
  const [resLoading, setResLoading] = useState(false);

  // Booking View & Details Modal State
  const [viewBookingModalOpen, setViewBookingModalOpen] = useState(false);
  const [viewBookingData, setViewBookingData] = useState<any>(null);
  const [addChargeType, setAddChargeType] = useState('Amenity');
  const [addChargeDesc, setAddChargeDesc] = useState('');
  const [addChargeAmount, setAddChargeAmount] = useState(500);
  const [addChargeLoading, setAddChargeLoading] = useState(false);

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    setResLoading(true);
    try {
      if (resInstantCheckIn) {
        const startDate = new Date(resCheckInDate);
        const endDate = new Date(resCheckOutDate);
        const computedNights = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));

        await apiRequest('/api/v1/reception/check-in', {
          method: 'POST',
          body: JSON.stringify({
            guest_name: resGuestName,
            guest_phone: resGuestPhone,
            guest_email: resGuestEmail || undefined,
            room_number: resRoomNumber,
            nights: computedNights,
            room_rate: resRate,
            vip_status: resVip,
            nationality: resNationality,
            id_type: resIdType,
            id_number: resIdNumber || undefined,
            city_state_origin: resCityStateOrigin || undefined,
            purpose_of_visit: resPurposeOfVisit,
            gstin: resGstin || undefined
          })
        });
        alert(`⚡ Instant Walk-In Check-In Successful! Guest ${resGuestName} checked into Suite ${resRoomNumber}.`);
      } else {
        await apiRequest('/api/v1/reception/reservations', {
          method: 'POST',
          body: JSON.stringify({
            guest_name: resGuestName,
            guest_phone: resGuestPhone,
            guest_email: resGuestEmail,
            room_number: resRoomNumber,
            check_in_date: resCheckInDate,
            check_out_date: resCheckOutDate,
            room_rate: resRate,
            channel: resChannel,
            vip_status: resVip
          })
        });
        alert(`Advance Reservation created successfully for ${resGuestName}!`);
      }
      setReservationModalOpen(false);
      setResGuestName('');
      setResGuestPhone('+91 ');
      loadPMSData();
    } catch (err: any) {
      alert(`Operation Failed: ${err.message}`);
    } finally {
      setResLoading(false);
    }
  };

  const handleCancelReservation = async (bookingId: number) => {
    if (!confirm(`Are you sure you want to cancel Reservation #${bookingId}?`)) return;
    try {
      await apiRequest(`/api/v1/reception/bookings/${bookingId}/cancel`, { method: 'DELETE' });
      alert(`Reservation #${bookingId} has been cancelled.`);
      setViewBookingModalOpen(false);
      loadPMSData();
    } catch (err: any) {
      alert(`Cancel Failed: ${err.message}`);
    }
  };

  const handleAddCharge = async (bookingId: number) => {
    if (!addChargeDesc || !addChargeAmount) return;
    setAddChargeLoading(true);
    try {
      await apiRequest(`/api/v1/reception/bookings/${bookingId}/add-charge?charge_type=${encodeURIComponent(addChargeType)}&description=${encodeURIComponent(addChargeDesc)}&amount=${addChargeAmount}`, {
        method: 'POST'
      });
      alert(`Added charge ₹${addChargeAmount} to Guest Bill #${bookingId}!`);
      openBookingDetailsModal(bookingId);
    } catch (err: any) {
      alert(`Failed to add charge: ${err.message}`);
    } finally {
      setAddChargeLoading(false);
    }
  };

  const openBookingDetailsModal = async (bookingId: number) => {
    try {
      const data = await apiRequest(`/api/v1/reception/bookings/${bookingId}/invoice-data`);
      setViewBookingData(data);
      setViewBookingModalOpen(true);
    } catch (err: any) {
      alert(`Failed to load booking details: ${err.message}`);
    }
  };

  // 1. Auth Guard
  useEffect(() => {
    const token = getAuthToken();
    const role = localStorage.getItem('aihos_role');
    if (!token || (role !== 'Reception' && role !== 'Admin' && role !== 'Executive')) {
      router.push('/login');
    }
  }, [router]);

  // 2. Fetch Data
  const fetchDailyBookings = async (overrideStart?: string, overrideEnd?: string, overrideSearch?: string) => {
    try {
      const sDate = overrideStart !== undefined ? overrideStart : calendarStartDate;
      const eDate = overrideEnd !== undefined ? overrideEnd : calendarEndDate;
      const qSearch = overrideSearch !== undefined ? overrideSearch : calendarSearch;

      const params = new URLSearchParams();
      if (sDate) params.append('start_date', sDate);
      if (eDate) params.append('end_date', eDate);
      if (qSearch) params.append('search', qSearch);

      const bookingsData = await apiRequest(`/api/v1/reception/daily-bookings?${params.toString()}`);
      setDailyBookings(bookingsData);
    } catch (err: any) {
      console.error('Error fetching calendar bookings:', err);
    }
  };

  const loadPMSData = async () => {
    try {
      const [roomsData, staysData, logsData] = await Promise.all([
        apiRequest('/api/v1/reception/rooms'),
        apiRequest('/api/v1/reception/active-stays'),
        apiRequest('/api/v1/reception/whatsapp-feed')
      ]);
      setRooms(roomsData);
      setActiveStays(staysData);
      setWhatsappLogs(logsData);
      await fetchDailyBookings();
    } catch (err: any) {
      setError(err.message || 'Failed to load Front Desk PMS data');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch calendar data whenever date pickers or search changes
  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyBookings();
    }
  }, [calendarStartDate, calendarEndDate, calendarSearch, activeTab]);

  const handleConvertBookingToCheckIn = async (bookingId: number) => {
    try {
      await apiRequest(`/api/v1/reception/convert-booking-checkin/${bookingId}`, { method: 'POST' });
      loadPMSData();
    } catch (err: any) {
      alert(err.message || 'Failed to convert booking to check-in');
    }
  };

  useEffect(() => {
    loadPMSData();
    const interval = setInterval(loadPMSData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Handle Check-In
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckInLoading(true);
    try {
      await apiRequest('/api/v1/reception/check-in', {
        method: 'POST',
        body: JSON.stringify({
          guest_name: guestName,
          guest_phone: guestPhone,
          guest_email: guestEmail || undefined,
          room_number: checkInRoomNumber,
          nights: Number(nights),
          vip_status: isVip,
          nationality,
          id_type: idType,
          id_number: idNumber || undefined,
          city_state_origin: cityStateOrigin || undefined,
          purpose_of_visit: purposeOfVisit,
          gstin: gstin || undefined
        })
      });
      alert(`Success! Checked in ${guestName} into Suite ${checkInRoomNumber}. Digital Pass generated.`);
      setCheckInModalOpen(false);
      setGuestName('');
      setGuestPhone('+91 ');
      loadPMSData();
    } catch (err: any) {
      alert(`Check-in error: ${err.message}`);
    } finally {
      setCheckInLoading(false);
    }
  };

  // Open Check Out Modal & Fetch Folio
  const openCheckOutModal = async (bookingId: number) => {
    setSelectedBookingId(bookingId);
    setCheckOutModalOpen(true);
    try {
      const data = await apiRequest(`/api/v1/qr_menu/folio/${bookingId}`);
      setFolioData(data);
    } catch (err: any) {
      alert(`Error loading folio: ${err.message}`);
    }
  };

  // Perform Check Out
  const handleCheckOut = async () => {
    if (!selectedBookingId) return;
    setCheckOutLoading(true);
    try {
      const result = await apiRequest(`/api/v1/reception/check-out/${selectedBookingId}`, {
        method: 'POST'
      });
      alert(`Invoice Settled! Total paid: ₹${result.grand_total.toLocaleString('en-IN')}. Suite marked Dirty for Housekeeping turnover.`);
      setCheckOutModalOpen(false);
      setFolioData(null);
      loadPMSData();
    } catch (err: any) {
      alert(`Check-out error: ${err.message}`);
    } finally {
      setCheckOutLoading(false);
    }
  };

  // Filtered rooms
  const filteredRooms = rooms.filter(r => {
    const floorMatch = selectedFloor === 'All' || r.floor === selectedFloor;
    const statusMatch = selectedStatus === 'All' || 
      (selectedStatus === 'Occupied' && r.is_occupied) ||
      (selectedStatus === 'Vacant' && !r.is_occupied) ||
      (selectedStatus === 'Dirty' && r.status === 'Dirty') ||
      (selectedStatus === 'Clean' && r.status === 'Clean');
    const searchMatch = !searchQuery || r.room_number.includes(searchQuery) || (r.current_guest_name && r.current_guest_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return floorMatch && statusMatch && searchMatch;
  });

  const occupiedCount = rooms.filter(r => r.is_occupied).length;
  const vacantCount = rooms.filter(r => !r.is_occupied).length;
  const dirtyCount = rooms.filter(r => r.status === 'Dirty').length;
  const cleanCount = rooms.filter(r => r.status === 'Clean').length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-neutral-400 text-sm">Opening Front Desk PMS Suite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-neutral-950 text-neutral-100 selection:bg-amber-500 selection:text-neutral-950 overflow-hidden">
      
      {/* ═══ INCOMING CALL ALERT ─ TOP-LEFT CORNER (DESKTOP) ═══ */}
      {incomingCallVisible && incomingCall && (
        <div className="fixed top-4 left-4 z-[9999] w-80 max-w-[calc(100vw-2rem)]">
          <div className="relative bg-neutral-900 border-2 border-green-500 rounded-2xl shadow-2xl overflow-hidden">
            {/* Animated top accent bar */}
            <div className="h-1 w-full bg-green-500 animate-pulse" />

            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Pulsing phone icon */}
                <div className="relative shrink-0">
                  <div className="h-12 w-12 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center animate-pulse">
                    <span className="text-2xl animate-bounce">📞</span>
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center animate-ping">
                    <div className="h-2 w-2 bg-red-400 rounded-full" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[9px] uppercase font-extrabold tracking-widest text-green-400">🔔 Incoming Intercom Call</p>
                  <h3 className="text-base font-black text-white leading-tight">Room {incomingCall.from_room}</h3>
                  <p className="text-xs text-neutral-300 truncate">{incomingCall.caller_name}</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Ext {incomingCall.from_extension} → Ext 100 · {new Date(incomingCall.started_at).toLocaleTimeString()}</p>
                </div>

                <button
                  onClick={() => declineIncomingCall(incomingCall)}
                  className="shrink-0 h-6 w-6 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-xs font-bold"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => answerIncomingCall(incomingCall)}
                  className="flex-1 py-2 bg-green-500 hover:bg-green-400 text-neutral-950 font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
                >
                  <span>📞</span> Answer
                </button>
                <button
                  onClick={() => declineIncomingCall(incomingCall)}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
                >
                  <span>🔴</span> Decline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified Left Side Navigation Bar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Front Desk Command Header */}
        <header className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center gap-3 shadow-lg shrink-0 w-full overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            <div className="h-8 w-8 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black shadow shrink-0">
              <Building className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-white truncate leading-none">
                  Front Desk · Hotel Blue Bird Inn
                </h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-neutral-800 text-amber-400 border border-neutral-700 rounded-full shrink-0 whitespace-nowrap hidden sm:inline-block">
                  24 Rooms
                </span>
                {incomingCall && incomingCallVisible && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-green-950 text-green-400 border border-green-700 rounded-full shrink-0 whitespace-nowrap animate-pulse hidden sm:inline-block">
                    📞 Room {incomingCall.from_room} Calling...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 truncate">Garacharma, Sri Vijayapuram · 24 Rooms · 2 Floors · Live Intercom Active</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setReservationModalOpen(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[11px] rounded-xl transition flex items-center gap-1.5 shadow whitespace-nowrap shrink-0"
            >
              <span>➕</span>
              <span>New Booking</span>
            </button>

            <button
              type="button"
              onClick={() => setIntercomCallModalOpen(true)}
              className={`px-3 py-1.5 font-extrabold text-[11px] rounded-xl transition flex items-center gap-1.5 shadow whitespace-nowrap shrink-0 border ${incomingCall && incomingCallVisible ? 'bg-green-500 text-neutral-950 border-green-400 animate-pulse' : 'bg-green-950/80 hover:bg-green-900 border-green-700 text-green-300'}`}
            >
              <span>📞</span>
              <span className="hidden sm:inline">{incomingCall && incomingCallVisible ? `Room ${incomingCall.from_room} Calling!` : 'Intercom Console'}</span>
            </button>
            <button
              onClick={loadPMSData}
              className="p-1.5 bg-neutral-850 hover:bg-neutral-800 rounded-xl border border-neutral-700 text-neutral-300 transition shrink-0"
              title="Refresh PMS"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* KPI Stats Bar */}
        <div className="px-4 py-2 bg-neutral-900/60 border-b border-neutral-800 flex flex-wrap justify-between items-center gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-neutral-500 uppercase text-[9px] tracking-wider">Occupancy:</span>
              <span className="text-amber-400 font-black text-xs">{((occupiedCount / (rooms.length || 50)) * 100).toFixed(1)}%</span>
              <span className="text-neutral-400 font-mono text-[10px]">({occupiedCount}/{rooms.length})</span>
            </div>
            <div className="h-3 w-px bg-neutral-800"></div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              <span className="text-neutral-300 text-[11px]">Vacant: <strong className="text-white">{vacantCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              <span className="text-neutral-300 text-[11px]">Turnover: <strong className="text-white">{dirtyCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              <span className="text-neutral-300 text-[11px]">Clean: <strong className="text-white">{cleanCount}</strong></span>
            </div>
          </div>

          {/* PMS Navigation Tabs */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-2xl border border-neutral-800/90 overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveTab('grid')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${activeTab === 'grid' ? 'bg-amber-500 text-neutral-950 shadow-sm font-black' : 'text-neutral-400 hover:text-white'}`}
            >
              50-Room Grid
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${activeTab === 'daily' ? 'bg-amber-500 text-neutral-950 shadow-sm font-black' : 'text-neutral-400 hover:text-white'}`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Stayview ({dailyBookings.total_bookings_count || dailyBookings.all_bookings?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('stays')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${activeTab === 'stays' ? 'bg-amber-500 text-neutral-950 shadow-sm font-black' : 'text-neutral-400 hover:text-white'}`}
            >
              Active Stays ({activeStays.length})
            </button>
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${activeTab === 'whatsapp' ? 'bg-amber-500 text-neutral-950 shadow-sm font-black' : 'text-neutral-400 hover:text-white'}`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              WhatsApp ({whatsappLogs.length})
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-2 p-3 rounded-xl bg-red-950/40 border border-red-700/60 text-red-200 text-xs shrink-0">
            {error}
          </div>
        )}

        {/* Main PMS Scrollable Content */}
        <main className="flex-1 p-4 max-w-7xl mx-auto w-full overflow-y-auto space-y-4">
          
          {/* 1. ROOM GRID MAP */}
          {activeTab === 'grid' && (
            <div className="space-y-5">
              {/* Filter Bar */}
              <div className="flex flex-wrap justify-between items-center gap-3 bg-neutral-900 border border-neutral-800 p-3 rounded-2xl shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-neutral-400 font-extrabold flex items-center gap-1 shrink-0">
                    <Layers className="h-3.5 w-3.5 text-amber-500" />
                    Floor:
                  </span>
                  <div className="flex items-center gap-1 overflow-x-auto p-0.5 bg-neutral-950 rounded-xl border border-neutral-800/80">
                    {['All', 1, 2, 3, 4, 5].map(fl => (
                      <button
                        key={fl}
                        onClick={() => setSelectedFloor(fl as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold whitespace-nowrap transition shrink-0 ${
                          selectedFloor === fl 
                            ? 'bg-amber-500 text-neutral-950 shadow-sm font-black' 
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {fl === 'All' ? 'All Floors' : `F${fl}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap flex-1 sm:flex-none justify-end min-w-0">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-neutral-400 font-semibold hidden sm:inline">Status:</span>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="bg-neutral-950 text-xs rounded-xl border border-neutral-800 py-1.5 px-2.5 text-neutral-200 focus:outline-none focus:border-amber-500 font-bold shrink-0"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Occupied">Occupied</option>
                      <option value="Vacant">Vacant</option>
                      <option value="Dirty">Turnover</option>
                      <option value="Clean">Clean</option>
                    </select>
                  </div>

                  <div className="relative min-w-[130px] flex-1 sm:w-44">
                    <Search className="h-3.5 w-3.5 text-neutral-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search Suite..."
                      className="w-full bg-neutral-950 text-xs rounded-xl border border-neutral-800 pl-8 pr-3 py-1.5 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-medium"
                    />
                  </div>

                  {/* Grid / List View Switcher */}
                  <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRoomViewMode('grid')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition ${roomViewMode === 'grid' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'}`}
                      title="Grid Card View"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomViewMode('list')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition ${roomViewMode === 'list' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'}`}
                      title="Compact List View"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 50-Room Map (Grid or List View) */}
              {roomViewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                  {filteredRooms.map(room => {
                    const stay = activeStays.find(s => s.room_number === room.room_number);

                    return (
                      <div
                        key={room.id}
                        className={`rounded-2xl border p-4 flex flex-col justify-between shadow-lg transition-all ${
                          room.is_occupied 
                            ? 'bg-neutral-900 border-amber-500/60 ring-1 ring-amber-500/30' 
                            : room.status === 'Dirty'
                            ? 'bg-neutral-900 border-red-800/80'
                            : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-xl font-extrabold text-neutral-100">{room.room_number}</span>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              room.is_occupied 
                                ? 'bg-amber-950 text-amber-400 border border-amber-600/40' 
                                : room.status === 'Dirty'
                                ? 'bg-red-950 text-red-400 border border-red-700/40'
                                : 'bg-green-950 text-green-400 border border-green-700/40'
                            }`}>
                              {room.is_occupied ? 'Occupied' : room.status}
                            </span>
                          </div>

                          <span className="text-[10px] text-neutral-400 font-semibold block mt-0.5 truncate">{room.room_type}</span>

                          {room.is_occupied && room.current_guest_name ? (
                            <div className="mt-3 p-2 bg-neutral-950/70 border border-neutral-800 rounded-xl">
                              <p className="text-[10px] text-neutral-500 uppercase font-bold">Resident</p>
                              <p className="text-xs font-bold text-neutral-200 truncate">{room.current_guest_name}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-neutral-500 mt-3 font-mono font-bold">₹{room.price_per_night.toLocaleString('en-IN')}/night</p>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex gap-1.5">
                          {room.is_occupied && stay ? (
                            <button
                              onClick={() => openCheckOutModal(stay.booking_id)}
                              className="flex-1 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 font-bold text-[11px] rounded-xl transition flex items-center justify-center gap-1"
                            >
                              <Receipt className="h-3 w-3" />
                              Bill
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setCheckInRoomNumber(room.room_number);
                                setCheckInModalOpen(true);
                              }}
                              className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-[11px] rounded-xl transition shadow flex items-center justify-center gap-1"
                            >
                              <UserCheck className="h-3 w-3" />
                              Check In
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedQrRoom(room.room_number)}
                            className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 font-bold text-[11px] rounded-xl transition"
                            title="Print Room Bedside Standee QR Code"
                          >
                            📱 QR
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-neutral-900 border border-neutral-800/90 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-400 uppercase text-[10px] font-black tracking-widest border-b border-amber-500/30 sticky top-0 z-10 shadow-md">
                        <tr>
                          <th className="p-3.5 pl-4">Suite #</th>
                          <th className="p-3.5">Suite Category</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5">Resident Guest</th>
                          <th className="p-3.5">Rate / Night</th>
                          <th className="p-3.5 pr-4 text-right">Quick Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {filteredRooms.map(room => {
                          const stay = activeStays.find(s => s.room_number === room.room_number);
                          return (
                            <tr key={room.id} className="hover:bg-neutral-850/80 transition-all duration-200 group">
                              <td className="p-3.5 pl-4 whitespace-nowrap">
                                <span className="font-mono font-extrabold text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs shadow-sm inline-block">
                                  Suite {room.room_number}
                                </span>
                              </td>
                              <td className="p-3.5 text-neutral-200 font-semibold whitespace-nowrap">{room.room_type}</td>
                              <td className="p-3.5 whitespace-nowrap">
                                <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border shadow-sm ${
                                  room.is_occupied 
                                    ? 'bg-amber-950/90 text-amber-300 border-amber-500/40 shadow-amber-500/10' 
                                    : room.status === 'Dirty'
                                    ? 'bg-rose-950/90 text-rose-300 border-rose-500/40 shadow-rose-500/10'
                                    : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
                                }`}>
                                  {room.is_occupied ? '• Occupied' : `• ${room.status}`}
                                </span>
                              </td>
                              <td className="p-3.5 font-bold text-white whitespace-nowrap">
                                {room.is_occupied ? (
                                  <span className="flex items-center gap-1.5">
                                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse inline-block"></span>
                                    {room.current_guest_name || stay?.guest_name || 'Guest Resident'}
                                  </span>
                                ) : (
                                  <span className="text-neutral-500 font-normal italic">-- Vacant Ready --</span>
                                )}
                              </td>
                              <td className="p-3.5 whitespace-nowrap">
                                <span className="font-mono font-black text-emerald-400 text-xs bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-500/20 inline-block">
                                  ₹{room.price_per_night.toLocaleString('en-IN')}<span className="text-[10px] text-neutral-400 font-normal">/nt</span>
                                </span>
                              </td>
                              <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                                {room.is_occupied && stay ? (
                                  <button
                                    type="button"
                                    onClick={() => openCheckOutModal(stay.booking_id)}
                                    className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 hover:border-amber-500/40 font-bold text-[11px] rounded-xl transition-all shadow hover:scale-[1.02] active:scale-[0.98]"
                                  >
                                    Guest Bill
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCheckInRoomNumber(room.room_number);
                                      setCheckInModalOpen(true);
                                    }}
                                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-[11px] rounded-xl transition-all shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
                                  >
                                    ⚡ 1-Click Check-In
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. ACTIVE STAYS VIEW */}
          {activeTab === 'stays' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-extrabold text-neutral-200 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block"></span>
                  Current In-House Resident Guest Reservations
                </h2>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-500/30">
                  {activeStays.length} In-House Stays
                </span>
              </div>
              <div className="bg-neutral-900 border border-neutral-800/90 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-400 text-[10px] uppercase font-black tracking-widest border-b border-amber-500/30 sticky top-0 z-10 shadow-md">
                      <tr>
                        <th className="p-4 pl-4">Suite</th>
                        <th className="p-4">Guest Name</th>
                        <th className="p-4">Phone</th>
                        <th className="p-4">Check-In</th>
                        <th className="p-4">Departure</th>
                        <th className="p-4">Tariff / Night</th>
                        <th className="p-4 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {activeStays.map(stay => (
                        <tr key={stay.booking_id} className="hover:bg-neutral-850/80 transition-all duration-200 group">
                          <td className="p-4 pl-4 whitespace-nowrap">
                            <span className="font-mono font-black text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs shadow-sm">
                              Suite {stay.room_number}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-neutral-100 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{stay.guest_name}</span>
                              {stay.vip_status && (
                                <span className="text-[9px] bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 px-2 py-0.5 rounded font-black shadow-sm tracking-wider">
                                  👑 VIP
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-neutral-400 font-mono text-xs whitespace-nowrap">{stay.guest_phone}</td>
                          <td className="p-4 text-neutral-300 font-medium whitespace-nowrap">📅 {new Date(stay.check_in).toLocaleDateString()}</td>
                          <td className="p-4 text-neutral-300 font-medium whitespace-nowrap">🚪 {new Date(stay.check_out).toLocaleDateString()}</td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="font-mono font-black text-emerald-400 text-xs bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                              ₹{stay.room_rate.toLocaleString('en-IN')}
                            </span>
                          </td>
                          <td className="p-4 pr-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => window.open(`${API_BASE}/api/v1/reception/bookings/${stay.booking_id}/invoice`, '_blank')}
                                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
                                title="Print Official GST Tax Invoice"
                              >
                                <span>🖨️</span>
                                <span>GST Invoice</span>
                              </button>
                              <button
                                onClick={() => openCheckOutModal(stay.booking_id)}
                                className="px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 hover:border-amber-500/40 rounded-xl text-xs font-bold transition-all shadow hover:scale-[1.02] active:scale-[0.98]"
                              >
                                Manage Bill
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. WHATSAPP FEED VIEW */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-neutral-200 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-green-500" />
                  Live WhatsApp Guest Messaging Feed
                </h2>
                <p className="text-neutral-400 text-xs">Real-time incoming guest messages with automatic AI categorization and responses.</p>
              </div>

              <div className="space-y-3">
                {whatsappLogs.map(log => (
                  <div key={log.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-200">{log.guest_name || log.from_phone}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">{new Date(log.created_at).toLocaleTimeString()}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 bg-neutral-800 text-amber-400 border border-neutral-700 rounded">
                          Intent: {log.intent}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 font-medium bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/80">
                        "{log.message_text}"
                      </p>
                    </div>

                    {log.ai_reply && (
                      <div className="md:w-1/2 bg-green-950/20 border border-green-800/40 p-3 rounded-xl text-xs space-y-1">
                        <span className="text-[10px] font-extrabold uppercase text-green-400 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          AI Auto-Response
                        </span>
                        <p className="text-neutral-300">{log.ai_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ADVANCE 360° STAYVIEW CALENDAR & BOOKING HISTORY ENGINE VIEW */}
          {activeTab === 'daily' && (
            <div className="space-y-6">
              {/* Top KPI Stat Cards Header */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Total Bookings</span>
                      <h3 className="text-2xl font-black text-white mt-1">{dailyBookings.total_bookings_count || 0}</h3>
                    </div>
                    <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                      <Calendar className="h-5 w-5" />
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-2 block font-medium">Across selected date window</span>
                </div>

                <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-green-500/40 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Today's Arrivals</span>
                      <h3 className="text-2xl font-black text-green-400 mt-1">{dailyBookings.arrivals_count || 0}</h3>
                    </div>
                    <span className="p-2 bg-green-500/10 text-green-400 rounded-xl border border-green-500/20">
                      📥
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-2 block font-medium">Ready for 1-Click Check-In</span>
                </div>

                <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Active In-House Stays</span>
                      <h3 className="text-2xl font-black text-blue-400 mt-1">{dailyBookings.active_stays?.length || occupiedCount || 0}</h3>
                    </div>
                    <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                      🏨
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-2 block font-medium">Currently occupying suites</span>
                </div>

                <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-2xl shadow-lg relative overflow-hidden group hover:border-purple-500/40 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Past Stay History</span>
                      <h3 className="text-2xl font-black text-purple-400 mt-1">{dailyBookings.past_history?.length || 0}</h3>
                    </div>
                    <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                      📜
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-2 block font-medium">Completed & checked-out guest bills</span>
                </div>
              </div>

              {/* Date Controls & Quick Presets Bar */}
              <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 p-5 rounded-3xl space-y-4 shadow-2xl">
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-neutral-100 flex items-center gap-2 tracking-wide">
                      <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                      Advance 360° Stayview Calendar & Booking Engine
                    </h2>
                    <p className="text-neutral-400 text-xs mt-0.5 font-medium">Interactive timeline stayview matrix connecting past guest bills, live check-ins, and OTA reservations.</p>
                  </div>

                  {/* Preset Quick Date Jump Pills */}
                  <div className="flex flex-wrap gap-2 text-xs font-bold">
                    <button
                      onClick={() => {
                        const past = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
                        const today = new Date().toISOString().split('T')[0];
                        setCalendarStartDate(past);
                        setCalendarEndDate(today);
                        setCalendarSubView('history');
                        fetchDailyBookings(past, today);
                      }}
                      className={`px-3.5 py-2 rounded-xl border transition flex items-center gap-1.5 ${calendarSubView === 'history' ? 'bg-amber-500 text-neutral-950 border-amber-400 font-black shadow-lg scale-105' : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-amber-500/40'}`}
                    >
                      <span>⏮️</span> Past 30 Days History ({dailyBookings.past_history?.length || 0})
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setCalendarStartDate(today);
                        setCalendarEndDate(today);
                        setCalendarSubView('arrivals');
                        fetchDailyBookings(today, today);
                      }}
                      className={`px-3.5 py-2 rounded-xl border transition flex items-center gap-1.5 ${calendarSubView === 'arrivals' ? 'bg-amber-500 text-neutral-950 border-amber-400 font-black shadow-lg scale-105' : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-amber-500/40'}`}
                    >
                      <span>📍</span> Today's Arrivals ({dailyBookings.arrivals_count || 0})
                    </button>
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        const next7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
                        setCalendarStartDate(today);
                        setCalendarEndDate(next7);
                        setCalendarSubView('matrix');
                        fetchDailyBookings(today, next7);
                      }}
                      className={`px-3.5 py-2 rounded-xl border transition flex items-center gap-1.5 ${calendarSubView === 'matrix' ? 'bg-amber-500 text-neutral-950 border-amber-400 font-black shadow-lg scale-105' : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-amber-500/40'}`}
                    >
                      <span>🗓️</span> Next 7 Days Stayview ({dailyBookings.total_bookings_count || dailyBookings.all_bookings?.length || 0})
                    </button>
                  </div>
                </div>

                {/* Date Inputs & Kardex Search Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-neutral-800/80">
                  <div>
                    <ThemeDatePicker
                      label="📅 Start Date Range"
                      value={calendarStartDate}
                      onChange={(d) => {
                        setCalendarStartDate(d);
                        fetchDailyBookings(d, calendarEndDate);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <ThemeDatePicker
                      label="📅 End Date Range"
                      value={calendarEndDate}
                      onChange={(d) => {
                        setCalendarEndDate(d);
                        fetchDailyBookings(calendarStartDate, d);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-black text-amber-400/90 mb-1 tracking-wider">🔍 Search Kardex Ledger</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                      <input
                        type="text"
                        placeholder="Search guest name, phone, or suite..."
                        value={calendarSearch}
                        onChange={(e) => setCalendarSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 shadow-inner font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-View Navigation Tabs */}
              <div className="flex items-center gap-1.5 bg-neutral-950 p-1 rounded-2xl border border-neutral-800/90 overflow-x-auto shrink-0">
                <button
                  onClick={() => setCalendarSubView('matrix')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${calendarSubView === 'matrix' ? 'bg-amber-500 text-neutral-950 shadow-sm font-black' : 'text-neutral-400 hover:text-white'}`}
                >
                  <span>🗓️</span> Stayview ({dailyBookings.all_bookings?.length || 0})
                </button>
                <button
                  onClick={() => setCalendarSubView('arrivals')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${calendarSubView === 'arrivals' ? 'bg-amber-500 text-neutral-950 shadow-sm font-black' : 'text-neutral-400 hover:text-white'}`}
                >
                  <span>📥</span> Arrivals ({dailyBookings.arrivals_count || 0})
                </button>
                <button
                  onClick={() => setCalendarSubView('departures')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${calendarSubView === 'departures' ? 'bg-amber-500 text-neutral-950 shadow-sm font-black' : 'text-neutral-400 hover:text-white'}`}
                >
                  <span>📤</span> Departures ({dailyBookings.departures_count || 0})
                </button>
                <button
                  onClick={() => setCalendarSubView('history')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition flex items-center gap-1.5 ${calendarSubView === 'history' ? 'bg-amber-500 text-neutral-950 shadow-sm font-black' : 'text-neutral-400 hover:text-white'}`}
                >
                  <span>📜</span> History ({dailyBookings.past_history?.length || 0})
                </button>
              </div>

              {/* SUB-VIEW 1: STAYVIEW MATRIX GRID */}
              {calendarSubView === 'matrix' && (
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="p-3 bg-neutral-950 border-b border-neutral-800 flex justify-between items-center text-xs">
                    <span className="font-black text-neutral-200 uppercase tracking-wider text-[10px] flex items-center gap-1.5 whitespace-nowrap">
                      <Layers className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      Suite vs Stay Status Matrix Grid
                    </span>
                    <div className="flex items-center gap-3 font-bold text-[10px] whitespace-nowrap">
                      <span className="flex items-center gap-1 text-green-400"><span className="h-2 w-2 rounded-full bg-green-500"></span> Checked-In (Active)</span>
                      <span className="flex items-center gap-1 text-amber-400"><span className="h-2 w-2 rounded-full bg-amber-500"></span> Expected Arrival</span>
                      <span className="flex items-center gap-1 text-neutral-400"><span className="h-2 w-2 rounded-full bg-neutral-600"></span> Completed Stay</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800 font-extrabold">
                        <tr>
                          <th className="p-3.5">Suite</th>
                          <th className="p-3.5">Guest Name & Phone</th>
                          <th className="p-3.5">Channel</th>
                          <th className="p-3.5">Check-In</th>
                          <th className="p-3.5">Check-Out</th>
                          <th className="p-3.5">Rate / Night</th>
                          <th className="p-3.5 text-right">Status & Quick Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/80">
                        {dailyBookings.all_bookings
                          ?.filter((b: any) => !calendarSearch || b.guest_name.toLowerCase().includes(calendarSearch.toLowerCase()) || b.room_number.includes(calendarSearch))
                          .map((b: any) => (
                            <tr key={b.booking_id} className="hover:bg-neutral-850/60 transition group">
                              <td className="p-3 font-black text-amber-400 group-hover:text-amber-300 whitespace-nowrap">
                                <span className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded-xl text-amber-400 font-extrabold font-mono text-xs inline-block whitespace-nowrap shadow-sm">
                                  Suite {b.room_number}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className="font-extrabold text-white block group-hover:text-amber-300 transition text-xs">{b.guest_name}</span>
                                <span className="text-[11px] text-neutral-400 font-mono block">📞 {b.guest_phone}</span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border whitespace-nowrap inline-block ${
                                  b.channel === 'Agoda' ? 'bg-orange-950/80 text-orange-300 border-orange-700' :
                                  b.channel === 'Booking.com' ? 'bg-blue-950/80 text-blue-300 border-blue-700' :
                                  b.channel === 'MakeMyTrip' ? 'bg-red-950/80 text-red-300 border-red-700' :
                                  'bg-green-950/80 text-green-300 border-green-700'
                                }`}>
                                  {b.channel}
                                </span>
                              </td>
                              <td className="p-3 text-neutral-300 font-mono font-bold text-xs whitespace-nowrap">{b.check_in}</td>
                              <td className="p-3 text-neutral-300 font-mono font-bold text-xs whitespace-nowrap">{b.check_out} <span className="text-[10px] text-neutral-500">({b.total_nights}N)</span></td>
                              <td className="p-3 font-extrabold text-amber-400 whitespace-nowrap">₹{b.room_rate?.toLocaleString('en-IN')}</td>
                              <td className="p-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => openBookingDetailsModal(b.booking_id)}
                                    className="px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-extrabold text-[11px] rounded-xl transition shadow whitespace-nowrap inline-flex items-center gap-1"
                                    title="View Guest Bill & GST Tax Invoice"
                                  >
                                    <span>👁️</span>
                                    <span>Bill</span>
                                  </button>

                                  {b.status === 'Expected Arrival' ? (
                                    <button
                                      onClick={() => handleConvertBookingToCheckIn(b.booking_id)}
                                      className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow transition transform active:scale-95 whitespace-nowrap inline-flex items-center justify-center"
                                    >
                                      1-Click Check-In
                                    </button>
                                  ) : b.is_active ? (
                                    <button
                                      onClick={() => openCheckOutModal(b.booking_id)}
                                      className="px-3.5 py-1.5 bg-red-950 border border-red-700 text-red-300 font-extrabold text-xs rounded-xl hover:bg-red-900 transition shadow whitespace-nowrap inline-flex items-center justify-center"
                                    >
                                      Check-Out
                                    </button>
                                  ) : (
                                    <span className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-neutral-400 rounded-xl text-[10px] font-extrabold whitespace-nowrap inline-block">
                                      Completed Stay
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SUB-VIEW 2: TODAY'S ARRIVALS */}
              {calendarSubView === 'arrivals' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dailyBookings.today_arrivals?.map((b: any) => (
                    <div key={b.booking_id} className="bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 p-4.5 rounded-2xl space-y-3 shadow-lg transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-neutral-950 text-amber-400 border border-neutral-800 rounded-md">
                            Suite {b.room_number}
                          </span>
                          <h4 className="text-sm font-extrabold text-white mt-1">{b.guest_name}</h4>
                          <p className="text-[11px] text-neutral-400">📞 {b.guest_phone}</p>
                        </div>
                        <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded border border-neutral-700">
                          {b.channel}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                        <div>
                          <span className="text-[10px] text-neutral-500 block">Rate / Night</span>
                          <span className="font-extrabold text-amber-400">₹{b.room_rate?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-500 block">Stay Duration</span>
                          <span className="font-bold text-neutral-300">{b.total_nights} Nights</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleConvertBookingToCheckIn(b.booking_id)}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow transition"
                      >
                        1-Click Convert to Check-In
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* SUB-VIEW 3: TODAY'S DEPARTURES */}
              {calendarSubView === 'departures' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dailyBookings.today_departures?.map((b: any) => (
                    <div key={b.booking_id} className="bg-neutral-900 border border-neutral-800 p-4.5 rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-neutral-950 text-blue-400 border border-neutral-800 rounded-md">
                            Suite {b.room_number}
                          </span>
                          <h4 className="text-sm font-extrabold text-white mt-1">{b.guest_name}</h4>
                          <p className="text-[11px] text-neutral-400">📞 {b.guest_phone}</p>
                        </div>
                        <button
                          onClick={() => openCheckOutModal(b.booking_id)}
                          className="px-3.5 py-1.5 bg-red-950/80 border border-red-700 text-red-300 font-extrabold text-xs rounded-xl hover:bg-red-900 transition"
                        >
                          Check-Out
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SUB-VIEW 4: PAST STAY HISTORY */}
              {calendarSubView === 'history' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="p-4 bg-neutral-950 border-b border-neutral-800">
                    <h3 className="text-xs font-extrabold uppercase text-neutral-300 tracking-wider">
                      📜 Past Guest Stay History Kardex ({dailyBookings.past_history?.length || 0} Records)
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-3.5">Booking ID</th>
                          <th className="p-3.5">Suite</th>
                          <th className="p-3.5">Guest Name</th>
                          <th className="p-3.5">Check-In</th>
                          <th className="p-3.5">Check-Out</th>
                          <th className="p-3.5">Total Paid</th>
                          <th className="p-3.5 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800">
                        {dailyBookings.past_history?.map((b: any) => (
                          <tr key={b.booking_id} className="hover:bg-neutral-850/50 transition">
                            <td className="p-3.5 font-mono text-neutral-400 whitespace-nowrap">#{b.booking_id}</td>
                            <td className="p-3.5 font-extrabold text-amber-400 whitespace-nowrap">
                              <span className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded-xl text-amber-400 font-mono text-xs inline-block whitespace-nowrap">
                                Suite {b.room_number}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-white whitespace-nowrap">{b.guest_name} <span className="text-neutral-400 font-normal">({b.guest_phone})</span></td>
                            <td className="p-3.5 text-neutral-400 font-mono whitespace-nowrap">{b.check_in}</td>
                            <td className="p-3.5 text-neutral-400 font-mono whitespace-nowrap">{b.check_out}</td>
                            <td className="p-3.5 font-bold text-green-400 whitespace-nowrap">₹{(b.room_rate * b.total_nights).toLocaleString('en-IN')}</td>
                            <td className="p-3.5 text-right whitespace-nowrap">
                              <span className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-neutral-400 rounded-xl text-[10px] font-extrabold whitespace-nowrap inline-block">
                                Settled & Checked Out
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </main>
      </div>

      {/* 1-Click Check-In Modal */}
      {checkInModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-extrabold uppercase text-amber-500">Suite {checkInRoomNumber}</span>
                <h3 className="text-lg font-extrabold text-neutral-100">1-Click Guest Check-In</h3>
              </div>
              <button onClick={() => setCheckInModalOpen(false)} className="text-neutral-500 hover:text-white font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCheckIn} className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Guest Full Name</label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. Maharaja Raghavendra Singh"
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">WhatsApp Mobile</label>
                  <input
                    type="text"
                    required
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Stay Duration</label>
                  <select
                    value={nights}
                    onChange={(e) => setNights(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    {[1, 2, 3, 4, 5, 7, 14].map(n => (
                      <option key={n} value={n}>{n} Night{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="guest@royalpalace.in"
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* INDIAN TOURISM & POLICE C-FORM COMPLIANCE */}
              <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800 space-y-2.5">
                <span className="text-[9px] font-extrabold uppercase text-amber-400 tracking-wider block">
                  🇮🇳 Indian Tourism & Police C-Form Register
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Nationality</label>
                    <select
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 focus:border-amber-500"
                    >
                      <option value="Indian">Indian Resident</option>
                      <option value="Foreigner">Foreigner / NRI (C-Form)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Govt ID Type</label>
                    <select
                      value={idType}
                      onChange={(e) => setIdType(e.target.value)}
                      className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 focus:border-amber-500"
                    >
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Voter ID">Voter ID</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Govt ID Number</label>
                    <input
                      type="text"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="e.g. XXXX-XXXX-4920"
                      className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 font-mono focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-neutral-400 mb-0.5">City & State of Origin</label>
                    <input
                      type="text"
                      value={cityStateOrigin}
                      onChange={(e) => setCityStateOrigin(e.target.value)}
                      placeholder="e.g. Mumbai, MH"
                      className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Purpose of Visit</label>
                    <select
                      value={purposeOfVisit}
                      onChange={(e) => setPurposeOfVisit(e.target.value)}
                      className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 focus:border-amber-500"
                    >
                      <option value="Tourism & Leisure">Tourism & Leisure</option>
                      <option value="Business">Business / Corporate</option>
                      <option value="Medical">Medical Tourism</option>
                      <option value="Official">Official / Govt Work</option>
                      <option value="Pilgrimage">Pilgrimage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Corporate GSTIN (Optional)</label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      placeholder="27AAAAA0000A1Z5"
                      className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 font-mono uppercase focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="vip"
                  checked={isVip}
                  onChange={(e) => setIsVip(e.target.checked)}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="vip" className="text-xs text-neutral-300 font-semibold cursor-pointer">
                  VIP Priority Guest (Flag for GM Briefing & Royal Welcome)
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckInModalOpen(false)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={checkInLoading}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-1"
                >
                  <Key className="h-3.5 w-3.5" />
                  {checkInLoading ? 'Issuing Pass...' : 'Confirm Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Check Out & Folio Settlement Modal with GST */}
      {checkOutModalOpen && folioData && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-neutral-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-amber-500">Suite {folioData.room_number}</span>
                <h3 className="text-lg font-extrabold text-neutral-100">Tax Invoice & Settlement</h3>
                <p className="text-xs text-neutral-400">Guest: <strong>{folioData.guest_name}</strong></p>
              </div>
              <button onClick={() => setCheckOutModalOpen(false)} className="text-neutral-500 hover:text-white font-bold text-sm">✕</button>
            </div>

            {/* Charges Breakdown */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                <div>
                  <span className="text-neutral-500 text-[10px] uppercase font-bold block">Room Charges</span>
                  <span className="font-extrabold text-sm text-neutral-200">₹{folioData.total_room_charges.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] uppercase font-bold block">In-Room Dining Tab</span>
                  <span className="font-extrabold text-sm text-amber-400">₹{folioData.total_dining_charges.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="max-h-40 overflow-y-auto divide-y divide-neutral-800 text-xs pr-1">
                {folioData.charges.map((c: any) => (
                  <div key={c.id} className="py-2 flex justify-between items-center">
                    <div>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded mr-1.5 ${
                        c.charge_type === 'Room' ? 'bg-blue-950 text-blue-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        {c.charge_type}
                      </span>
                      <span className="text-neutral-300">{c.description}</span>
                    </div>
                    <span className="font-extrabold text-neutral-100">₹{c.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Tax & Grand Total */}
              <div className="p-3 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs text-neutral-300">
                  <span>Subtotal</span>
                  <span>₹{(folioData.subtotal || (folioData.total_room_charges + folioData.total_dining_charges)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-neutral-400">
                  <span>12% GST (CGST + SGST)</span>
                  <span>₹{(folioData.gst_charges || (folioData.grand_total * 0.12)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-amber-500/30">
                  <span className="font-extrabold text-xs text-amber-300 uppercase tracking-wider">Grand Total Balance</span>
                  <span className="text-xl font-extrabold text-amber-400">₹{folioData.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => window.open(`${API_BASE}/api/v1/reception/bookings/${selectedBookingId}/invoice`, '_blank')}
                className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-750 text-amber-400 border border-neutral-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
                title="Print Official GST Tax Invoice"
              >
                <span>🖨️</span>
                <span>Print GST Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setCheckOutModalOpen(false)}
                className="py-2.5 px-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={checkOutLoading}
                onClick={handleCheckOut}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
              >
                <CreditCard className="h-4 w-4" />
                {checkOutLoading ? 'Settling Ledger...' : 'Settle Bill & Check Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bedside Room QR Standee Printable Modal */}
      {selectedQrRoom && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="font-extrabold text-xs uppercase text-amber-500 tracking-wider">
                Bedside Acrylic Standee QR Code
              </h3>
              <button type="button" onClick={() => setSelectedQrRoom(null)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            {/* Printable Bedside Standee Preview */}
            <div id="printable-qr-standee" className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-3 flex flex-col items-center">
              <span className="text-[11px] font-extrabold uppercase text-amber-400 tracking-widest">Hotel Blue Bird Inn</span>
              <h2 className="text-2xl font-extrabold text-white">ROOM {selectedQrRoom}</h2>
              <div className="bg-white p-3 rounded-2xl shadow-md border border-neutral-700">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`https://www.hotelbluebirdnest.com/room-qr?room=${selectedQrRoom}`)}`} 
                  alt={`QR Code Room ${selectedQrRoom}`}
                  className="h-44 w-44"
                />
              </div>
              <p className="text-[10px] text-neutral-400 leading-tight pt-1">
                Scan with Phone Camera for Gourmet Dining, Guest Bill, Intercom & 24/7 AI Concierge
              </p>
              <div className="flex gap-1 text-[9px] font-bold text-neutral-500">
                <span>EN</span> • <span>HI</span> • <span>GU</span> • <span>FR</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedQrRoom(null)}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const printWin = window.open('', '_blank');
                  if (printWin) {
                    printWin.document.write(`
                      <html>
                        <head>
                          <title>Bedside Standee QR - Room ${selectedQrRoom}</title>
                          <style>
                            body { font-family: 'Helvetica Neue', Arial, sans-serif; text-align: center; padding: 40px; background: #000; color: #fff; }
                            .card { border: 2px solid #d97706; padding: 30px; border-radius: 20px; max-width: 300px; margin: 0 auto; background: #111; }
                            h1 { font-size: 28px; margin: 10px 0; color: #fbbf24; }
                            p { font-size: 12px; color: #aaa; margin-top: 15px; }
                            img { width: 200px; height: 200px; border-radius: 12px; }
                          </style>
                        </head>
                        <body>
                          <div class="card">
                            <h2 style="font-size: 14px; text-transform: uppercase; color: #d97706;">Hotel Blue Bird Inn</h2>
                            <h1>ROOM ${selectedQrRoom}</h1>
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`https://www.hotelbluebirdnest.com/room-qr?room=${selectedQrRoom}`)}" />
                            <p>Scan with Phone Camera for Gourmet Dining, Guest Bill, Intercom & AI Concierge</p>
                          </div>
                          <script>window.print();</script>
                        </body>
                      </html>
                    `);
                    printWin.document.close();
                  }
                }}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow"
              >
                🖨️ Print Standee
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Intercom Direct Calling Console Modal */}
      {intercomCallModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-green-500 text-neutral-950 rounded-full flex items-center justify-center font-bold text-sm">
                  📞
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Hotel Blue Bird Inn Intercom Console</h3>
                  <p className="text-[10px] text-neutral-400">Front Desk VoIP Ext 100 • 24 Island Suites</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIntercomCallActive(false);
                  setIntercomCallModalOpen(false);
                }}
                className="h-7 w-7 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-neutral-950 p-1 rounded-2xl border border-neutral-800 gap-1 text-xs">
              <button
                type="button"
                onClick={() => setIntercomTab('console')}
                className={`flex-1 py-1.5 rounded-xl font-extrabold transition ${intercomTab === 'console' ? 'bg-amber-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'}`}
              >
                📞 Speed-Dial Console
              </button>
              <button
                type="button"
                onClick={() => {
                  setIntercomTab('history');
                  loadIntercomHistory();
                }}
                className={`flex-1 py-1.5 rounded-xl font-extrabold transition ${intercomTab === 'history' ? 'bg-amber-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'}`}
              >
                📋 Call History ({intercomCallLogs.length})
              </button>
            </div>

            {intercomTab === 'console' ? (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="font-extrabold text-white text-sm block">Suite Ext {activeIntercomRoom}</span>
                    <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-ping" />
                      {intercomCallActive ? `Call Active: ${Math.floor(intercomCallSeconds / 60).toString().padStart(2, '0')}:${(intercomCallSeconds % 60).toString().padStart(2, '0')}` : 'VoIP Extension Registered'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!intercomCallActive ? (
                      <button
                        onClick={() => executeReceptionCall(activeIntercomRoom)}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow"
                      >
                        📞 Dial Room
                      </button>
                    ) : (
                      <button
                        onClick={endReceptionCall}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow animate-pulse"
                      >
                        End Call 🔴
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block">Speed-Dial Room Extension (101 – 212)</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={activeIntercomRoom}
                      onChange={(e) => setActiveIntercomRoom(e.target.value)}
                      placeholder="Enter Room # (e.g. 204)"
                      className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      onClick={() => executeReceptionCall(activeIntercomRoom)}
                      className="px-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl transition"
                    >
                      Dial Suite
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                <div className="flex justify-between items-center text-[10px] font-extrabold uppercase text-neutral-400 pb-1 border-b border-neutral-800">
                  <span>Intercom Audio Call Logs</span>
                  <button onClick={loadIntercomHistory} className="text-amber-400 hover:underline">🔄 Refresh</button>
                </div>
                {intercomCallLogs.length === 0 ? (
                  <p className="text-xs text-neutral-500 text-center py-6">No call logs recorded yet.</p>
                ) : (
                  intercomCallLogs.map((log: any, idx: number) => {
                    // Support both old field names (from dummy data) and new store field names
                    const callId = log.call_id || log.id || idx;
                    const callerName = log.caller_name || `Ext ${log.from_extension || log.from_room}`;
                    const targetName = log.target_extension === '100' || log.target_name?.includes('Front Desk')
                      ? 'Front Desk (Ext 100)'
                      : `Room ${log.target_extension || log.target_room || '?'}`;
                    const callType = log.from_extension === '100' || log.from_room === '100' ? 'Outbound' : 'Incoming';
                    const statusRaw: string = (log.status || 'completed');
                    const statusLabel = statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1);
                    const statusColor = statusRaw === 'completed' || statusRaw === 'active'
                      ? 'text-green-400'
                      : statusRaw === 'missed'
                      ? 'text-red-400'
                      : statusRaw === 'declined'
                      ? 'text-orange-400'
                      : 'text-neutral-400';
                    const durationSecs = log.duration_seconds ?? 0;
                    const durLabel = log.duration ||
                      `${Math.floor(durationSecs / 60).toString().padStart(2, '0')}:${(durationSecs % 60).toString().padStart(2, '0')}`;
                    const timeLabel = log.started_at || log.timestamp
                      ? new Date(log.started_at || log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '--:--';
                    const dialTarget = (log.from_extension === '100' || log.from_room === '100')
                      ? (log.target_extension || log.target_room || '204')
                      : (log.from_extension || log.from_room || '204');

                    return (
                      <div key={callId} className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-center text-xs gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold shrink-0 ${
                              callType === 'Incoming' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {callType === 'Incoming' ? '↙ IN' : '↗ OUT'}
                            </span>
                            <span className="font-extrabold text-white truncate">{callerName}</span>
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
                            ➡ {targetName} · <span className="text-neutral-500">{timeLabel}</span>
                          </p>
                        </div>
                        <div className="text-right flex items-center gap-2 shrink-0">
                          <div>
                            <span className={`text-[10px] font-bold block ${statusColor}`}>
                              {statusLabel}
                            </span>
                            <span className="text-[9px] text-neutral-500 font-mono">{durLabel}</span>
                          </div>
                          <button
                            onClick={() => {
                              setActiveIntercomRoom(String(dialTarget));
                              setIntercomTab('console');
                            }}
                            className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 rounded-lg text-[10px] font-bold whitespace-nowrap"
                            title="Redial Extension"
                          >
                            📞 Redial
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            <button
              onClick={async () => {
                if (intercomCallActive) await endReceptionCall();
                setIntercomCallModalOpen(false);
              }}
              className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-extrabold text-xs rounded-xl transition"
            >
              Close Intercom Console
            </button>
          </div>
        </div>
      )}

      {/* 1. New Reservation / Walk-In Modal */}
      {reservationModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md z-50 overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-4 sm:my-8 relative shrink-0">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-amber-500 text-neutral-950 rounded-xl flex items-center justify-center font-bold text-sm">
                  ➕
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Create New Reservation / Walk-In</h3>
                  <p className="text-[10px] text-neutral-400">Direct Front Desk Booking Entry</p>
                </div>
              </div>
              <button
                onClick={() => setReservationModalOpen(false)}
                className="h-7 w-7 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReservation} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Guest Full Name *</label>
                  <input
                    type="text"
                    required
                    value={resGuestName}
                    onChange={(e) => setResGuestName(e.target.value)}
                    placeholder="e.g. Vikramaditya Singh"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Guest Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={resGuestPhone}
                    onChange={(e) => setResGuestPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Guest Email (Optional)</label>
                  <input
                    type="email"
                    value={resGuestEmail}
                    onChange={(e) => setResGuestEmail(e.target.value)}
                    placeholder="guest@domain.com"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Suite Number *</label>
                  <select
                    value={resRoomNumber}
                    onChange={(e) => setResRoomNumber(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-extrabold focus:outline-none focus:border-amber-500"
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.room_number}>
                        Suite {r.room_number} ({r.room_type} - ₹{r.price_per_night}/nt)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <ThemeDatePicker
                    label="Check-In Date *"
                    value={resCheckInDate}
                    onChange={(d) => setResCheckInDate(d)}
                    className="w-full"
                  />
                </div>
                <div>
                  <ThemeDatePicker
                    label="Check-Out Date *"
                    value={resCheckOutDate}
                    onChange={(d) => setResCheckOutDate(d)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Room Rate per Night (₹) *</label>
                  <input
                    type="number"
                    required
                    value={resRate}
                    onChange={(e) => setResRate(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-amber-400 font-extrabold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Booking Source / OTA Channel</label>
                  <select
                    value={resChannel}
                    onChange={(e) => setResChannel(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="Direct Walk-In">Direct Walk-In</option>
                    <option value="Front Desk Phone">Front Desk Phone</option>
                    <option value="Direct Website">Direct Website</option>
                    <option value="Agoda">Agoda</option>
                    <option value="Booking.com">Booking.com</option>
                    <option value="MakeMyTrip">MakeMyTrip</option>
                    <option value="Expedia">Expedia</option>
                  </select>
                </div>
              </div>

              {/* Toggle Instant Check-In Mode */}
              <div className="p-3.5 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-white text-xs block">⚡ Immediate Desk Check-In Mode</span>
                    <span className="text-[10px] text-neutral-400">Enable if guest is standing at the front desk right now for instant check-in</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={resInstantCheckIn}
                    onChange={(e) => setResInstantCheckIn(e.target.checked)}
                    className="h-4 w-4 accent-amber-500 rounded cursor-pointer shrink-0"
                  />
                </div>

                {/* Expanded Police C-Form Fields for Instant Check-In */}
                {resInstantCheckIn && (
                  <div className="pt-2 border-t border-neutral-850 space-y-2.5 animate-in fade-in">
                    <span className="text-[9px] font-extrabold uppercase text-amber-400 tracking-wider block">
                      🇮🇳 Police C-Form & Guest Verification
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Nationality</label>
                        <select
                          value={resNationality}
                          onChange={(e) => setResNationality(e.target.value)}
                          className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 focus:border-amber-500"
                        >
                          <option value="Indian">Indian Resident</option>
                          <option value="Foreigner">Foreigner / NRI (C-Form)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Govt ID Type</label>
                        <select
                          value={resIdType}
                          onChange={(e) => setResIdType(e.target.value)}
                          className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 focus:border-amber-500"
                        >
                          <option value="Aadhaar Card">Aadhaar Card</option>
                          <option value="Passport">Passport</option>
                          <option value="Driving License">Driving License</option>
                          <option value="Voter ID">Voter ID</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Govt ID Number</label>
                        <input
                          type="text"
                          value={resIdNumber}
                          onChange={(e) => setResIdNumber(e.target.value)}
                          placeholder="e.g. XXXX-XXXX-4920"
                          className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 font-mono focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-neutral-400 mb-0.5">City & State of Origin</label>
                        <input
                          type="text"
                          value={resCityStateOrigin}
                          onChange={(e) => setResCityStateOrigin(e.target.value)}
                          placeholder="e.g. Mumbai, MH"
                          className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 focus:border-amber-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Purpose of Visit</label>
                        <select
                          value={resPurposeOfVisit}
                          onChange={(e) => setResPurposeOfVisit(e.target.value)}
                          className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 focus:border-amber-500"
                        >
                          <option value="Tourism & Leisure">Tourism & Leisure</option>
                          <option value="Business">Business / Corporate</option>
                          <option value="Medical">Medical Tourism</option>
                          <option value="Official">Official / Govt Work</option>
                          <option value="Pilgrimage">Pilgrimage</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] uppercase font-bold text-neutral-400 mb-0.5">Corporate GSTIN (Optional)</label>
                        <input
                          type="text"
                          value={resGstin}
                          onChange={(e) => setResGstin(e.target.value)}
                          placeholder="27AAAAA0000A1Z5"
                          className="w-full text-xs rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 font-mono uppercase focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-amber-400 block">👑 Flag VIP Guest Record</span>
                  <span className="text-[10px] text-neutral-400">Triggers priority butler dispatch & VIP amenities</span>
                </div>
                <input
                  type="checkbox"
                  checked={resVip}
                  onChange={(e) => setResVip(e.target.checked)}
                  className="h-4 w-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={resLoading}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow transition transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span>{resLoading ? 'Processing...' : (resInstantCheckIn ? '⚡ Confirm & Complete Instant Desk Check-In' : 'Confirm & Create Advance Reservation')}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. View Booking Details & Folio Management Modal */}
      {viewBookingModalOpen && viewBookingData && (
        <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md z-50 overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 my-4 sm:my-8 relative shrink-0">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-amber-500 text-neutral-950 rounded-xl flex items-center justify-center font-bold text-sm">
                  📋
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Booking #{viewBookingData.stay_details.booking_id} Details</h3>
                  <p className="text-[10px] text-neutral-400">Suite {viewBookingData.stay_details.room_number} • {viewBookingData.financial_summary.payment_status}</p>
                </div>
              </div>
              <button
                onClick={() => setViewBookingModalOpen(false)}
                className="h-7 w-7 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Guest & Stay Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider block">Guest Info</span>
                  <p className="font-extrabold text-white text-sm">{viewBookingData.guest_details.name}</p>
                  <p className="text-neutral-400 font-mono">📞 {viewBookingData.guest_details.phone}</p>
                  <p className="text-neutral-400">✉️ {viewBookingData.guest_details.email}</p>
                </div>
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-wider block">Stay Details</span>
                  <p className="font-extrabold text-amber-400">Suite {viewBookingData.stay_details.room_number}</p>
                  <p className="text-neutral-300">Check-In: <strong>{viewBookingData.stay_details.check_in}</strong></p>
                  <p className="text-neutral-300">Check-Out: <strong>{viewBookingData.stay_details.check_out}</strong> ({viewBookingData.stay_details.total_nights} Nights)</p>
                </div>
              </div>

              {/* Bill Charges Table */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3 space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 block">Itemized Guest Bill Charges</span>
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] text-neutral-500 border-b border-neutral-800 uppercase font-bold">
                    <tr>
                      <th className="py-1">Type</th>
                      <th className="py-1">Description</th>
                      <th className="py-1 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {viewBookingData.itemized_charges.map((c: any, i: number) => (
                      <tr key={i}>
                        <td className="py-1.5 font-bold text-amber-400">{c.type}</td>
                        <td className="py-1.5 text-neutral-300">{c.description}</td>
                        <td className="py-1.5 text-right font-bold text-white">₹{c.amount?.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-neutral-800 pt-2 text-right space-y-1">
                  <p className="text-neutral-400">Subtotal: ₹{viewBookingData.financial_summary.subtotal?.toLocaleString('en-IN')}</p>
                  <p className="text-neutral-400">GST (12.0%): ₹{viewBookingData.financial_summary.total_gst?.toLocaleString('en-IN')}</p>
                  <p className="text-sm font-black text-amber-400">Grand Total: ₹{viewBookingData.financial_summary.grand_total?.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Add Custom Bill Charge Box */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block">➕ Add Charge to Bill (MiniBar, Laundry, Spa, Extra Bed)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={addChargeType}
                    onChange={(e) => setAddChargeType(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Amenity">Amenity</option>
                    <option value="Dining">In-Room Dining</option>
                    <option value="MiniBar">MiniBar</option>
                    <option value="Laundry">Laundry</option>
                    <option value="Spa">Spa & Wellness</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Description (e.g. Dry Cleaning)"
                    value={addChargeDesc}
                    onChange={(e) => setAddChargeDesc(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Amount ₹"
                      value={addChargeAmount}
                      onChange={(e) => setAddChargeAmount(Number(e.target.value))}
                      className="w-24 bg-neutral-900 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-amber-400 font-bold focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={addChargeLoading}
                      onClick={() => handleAddCharge(viewBookingData.stay_details.booking_id)}
                      className="px-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow shrink-0"
                    >
                      Add to Bill
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => window.open(`/api/v1/reception/bookings/${viewBookingData.stay_details.booking_id}/invoice`, '_blank')}
                  className="flex-1 py-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <span>🖨️</span> Print Official GST Invoice
                </button>
                <button
                  onClick={() => handleCancelReservation(viewBookingData.stay_details.booking_id)}
                  className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-red-700 text-red-300 font-bold text-xs rounded-xl transition"
                >
                  🚫 Cancel Reservation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
