'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, getAuthToken } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { 
  CheckCircle2, 
  Play, 
  RefreshCw, 
  Sparkles, 
  Layers, 
  ClipboardCheck, 
  Check,
  LayoutGrid,
  List,
  Volume2,
  VolumeX,
  Bell
} from 'lucide-react';
import NotificationToastContainer, { ToastMessage, playNotificationChime } from '@/components/NotificationToast';

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

interface Ticket {
  id: number;
  booking_id: number;
  room_number?: string;
  category: string; // Housekeeping, Maintenance, Amenity
  description: string;
  status: string; // Pending, In Progress, Cleaned
  priority: string; // Low, Medium, High, Emergency
  assigned_to?: number;
  checklist?: { [key: string]: boolean };
  created_at: string;
}

export default function HousekeepingDashboard() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Navigation
  const [mainView, setMainView] = useState<'turnover' | 'tickets'>('turnover');
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'In Progress' | 'Cleaned'>('Pending');
  const [roomFilter, setRoomFilter] = useState<string>('All');
  const [floorFilter, setFloorFilter] = useState<number | 'All'>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Inspection Checklist Modal State
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [checklist, setChecklist] = useState({
    bedMade: true,
    bathroomSanitized: true,
    towelsReplaced: true,
    minibarRestocked: true,
    acPreset: true
  });
  const [submittingInspection, setSubmittingInspection] = useState(false);

  // Audio & Real-Time Alert State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aihos_hk_sound');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  const [prevDirtyCount, setPrevDirtyCount] = useState<number>(0);
  const [prevTicketCount, setPrevTicketCount] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'info' | 'alert', title: string, message: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts(prev => [...prev, { id, type, title, description: message }]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('aihos_hk_sound', JSON.stringify(next));
      }
      return next;
    });
  };

  // Auth Guard
  useEffect(() => {
    const token = getAuthToken();
    const role = localStorage.getItem('aihos_role');
    if (!token || (role !== 'Housekeeping' && role !== 'Admin' && role !== 'Reception' && role !== 'Executive')) {
      router.push('/login');
    }
  }, [router]);

  // Load Data
  const loadHousekeepingData = async () => {
    try {
      const [roomsData, ticketsData] = await Promise.all([
        apiRequest('/api/v1/housekeeping/rooms'),
        apiRequest('/api/v1/housekeeping/tickets')
      ]);
      setRooms(roomsData);
      setTickets(ticketsData);

      // Check for new Dirty rooms (turnover needed)
      const currentDirty = roomsData.filter((r: Room) => r.status === 'Dirty').length;
      if (prevDirtyCount > 0 && currentDirty > prevDirtyCount) {
        if (soundEnabled) playNotificationChime();
        addToast('alert', '🧹 Turnover Alert Dispatched', `${currentDirty - prevDirtyCount} new suite(s) require housekeeping turnover inspection.`);
      }
      setPrevDirtyCount(currentDirty);

      // Check for new pending housekeeping tickets
      const currentPendingTickets = ticketsData.filter((t: Ticket) => t.status === 'Pending').length;
      if (prevTicketCount > 0 && currentPendingTickets > prevTicketCount) {
        if (soundEnabled) playNotificationChime();
        addToast('alert', '🚨 New Guest Request Alert', 'Guest submitted a new housekeeping/maintenance request ticket.');
      }
      setPrevTicketCount(currentPendingTickets);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch housekeeping data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHousekeepingData();
    const interval = setInterval(loadHousekeepingData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateRoomStatus = async (roomNumber: string, nextStatus: string) => {
    try {
      await apiRequest(`/api/v1/housekeeping/rooms/${roomNumber}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      setRooms(prev => prev.map(r => r.room_number === roomNumber ? { ...r, status: nextStatus } : r));
    } catch (err: any) {
      alert(`Error updating room: ${err.message}`);
    }
  };

  const handleCompleteTurnover = async () => {
    if (!selectedRoom) return;
    setSubmittingInspection(true);
    try {
      await handleUpdateRoomStatus(selectedRoom.room_number, 'Clean');
      setInspectModalOpen(false);
      setSelectedRoom(null);
      alert(`Suite ${selectedRoom.room_number} marked 100% Clean & Ready for Front Desk check-in.`);
    } catch (err: any) {
      alert(`Turnover error: ${err.message}`);
    } finally {
      setSubmittingInspection(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: number, nextStatus: string) => {
    try {
      await apiRequest(`/api/v1/housekeeping/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus })
      });
      setTickets(prev => prev.map(t => (t.id === ticketId ? { ...t, status: nextStatus } : t)));
    } catch (err: any) {
      alert(`Error updating ticket: ${err.message}`);
    }
  };

  const filteredRooms = rooms.filter(r => {
    const floorMatch = floorFilter === 'All' || r.floor === floorFilter;
    const statusMatch = roomFilter === 'All' || r.status === roomFilter;
    return floorMatch && statusMatch;
  });

  const dirtyCount = rooms.filter(r => r.status === 'Dirty').length;
  const cleaningCount = rooms.filter(r => r.status === 'Cleaning').length;
  const cleanCount = rooms.filter(r => r.status === 'Clean' || r.status === 'Inspected').length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-neutral-400 text-sm">Opening Housekeeping Dispatch Board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-neutral-950 text-neutral-100 selection:bg-amber-500 selection:text-neutral-950 overflow-hidden">
      
      {/* Unified Side Navigation */}
      <Sidebar />

      {/* Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header */}
        <header className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center gap-3 shadow-md shrink-0 w-full overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            <div className="h-8 w-8 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black shadow shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-white truncate leading-none">
                  Housekeeping & Turnover Operations
                </h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-neutral-800 text-amber-400 border border-neutral-700 rounded-full shrink-0 whitespace-nowrap hidden sm:inline-block">
                  50 Rooms
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 truncate">Turnover Inspection Checklists, Linen Supplies & Maintenance Dispatch</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-xl border text-[11px] font-bold transition flex items-center gap-1 shrink-0 ${
                soundEnabled ? 'bg-neutral-800 border-neutral-700 text-amber-400' : 'bg-neutral-900 border-neutral-800 text-neutral-500'
              }`}
              title="Toggle Audio Notifications"
            >
              {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Sound ON' : 'Sound OFF'}</span>
            </button>

            <button
              onClick={loadHousekeepingData}
              className="p-1.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-xl border border-neutral-700 transition shrink-0"
              title="Refresh Board"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* KPI & Tab Bar */}
        <div className="px-4 py-2 bg-neutral-900/60 border-b border-neutral-800 flex flex-wrap justify-between items-center gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              <span className="text-neutral-300">Turnover Needed: <strong className="text-red-400">{dirtyCount}</strong></span>
            </div>
            <div className="h-3 w-px bg-neutral-800"></div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
              <span className="text-neutral-300">Cleaning: <strong className="text-yellow-400">{cleaningCount}</strong></span>
            </div>
            <div className="h-3 w-px bg-neutral-800"></div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              <span className="text-neutral-300">Clean & Ready: <strong className="text-green-400">{cleanCount}</strong></span>
            </div>
          </div>

          <div className="flex gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              onClick={() => setMainView('turnover')}
              className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition ${mainView === 'turnover' ? 'bg-amber-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'}`}
            >
              50-Room Grid
            </button>
            <button
              onClick={() => setMainView('tickets')}
              className={`px-2.5 py-1 rounded-lg font-extrabold text-[11px] transition flex items-center gap-1 ${mainView === 'tickets' ? 'bg-amber-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-white'}`}
            >
              Repair Tickets ({tickets.filter(t => t.status !== 'Cleaned').length})
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-2 p-3 rounded-xl bg-red-950/40 border border-red-700/60 text-red-200 text-xs shrink-0">
            {error}
          </div>
        )}

        {/* Floating Notification Toasts */}
        <NotificationToastContainer toasts={toasts} onDismiss={dismissToast} />

        {/* Main Board View */}
        <main className="flex-1 p-4 max-w-7xl mx-auto w-full overflow-y-auto space-y-4">
          
          {/* 1. ROOM TURNOVER MATRIX */}
          {mainView === 'turnover' && (
            <div className="space-y-5">
              <div className="flex flex-wrap justify-between items-center gap-3 bg-neutral-900 border border-neutral-800 p-4 rounded-2xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-semibold flex items-center gap-1">
                    <Layers className="h-4 w-4 text-amber-500" />
                    Floor:
                  </span>
                  <div className="flex gap-1">
                    {['All', 1, 2, 3, 4, 5].map(fl => (
                      <button
                        key={fl}
                        onClick={() => setFloorFilter(fl as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${floorFilter === fl ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400 hover:text-white'}`}
                      >
                        {fl === 'All' ? 'All Floors' : `F${fl}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400 font-semibold">Status:</span>
                  <select
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value)}
                    className="bg-neutral-800 text-xs rounded-lg border border-neutral-700 py-1.5 px-3 text-neutral-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Dirty">Turnover Needed (Dirty)</option>
                    <option value="Cleaning">Cleaning in Progress</option>
                    <option value="Clean">Clean & Ready</option>
                  </select>

                  {/* Grid / List View Switcher */}
                  <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'grid' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'}`}
                      title="Grid Card View"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition ${viewMode === 'list' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'}`}
                      title="Compact List View"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Room Matrix Grid or List View */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                  {filteredRooms.map(room => (
                    <div
                      key={room.id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between shadow-lg transition-all ${
                        room.status === 'Dirty'
                          ? 'bg-neutral-900 border-red-700/80 ring-1 ring-red-700/30'
                          : room.status === 'Cleaning'
                          ? 'bg-neutral-900 border-yellow-600/80'
                          : 'bg-neutral-900 border-green-800/80 opacity-80'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-xl font-extrabold text-neutral-100">{room.room_number}</span>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            room.status === 'Dirty'
                              ? 'bg-red-950 text-red-400 border border-red-700/40'
                              : room.status === 'Cleaning'
                              ? 'bg-yellow-950 text-yellow-400 border border-yellow-700/40'
                              : 'bg-green-950 text-green-400 border border-green-700/40'
                          }`}>
                            {room.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-semibold block mt-0.5 truncate">{room.room_type}</span>
                        <span className="text-[11px] text-neutral-500 mt-2 block">
                          {room.is_occupied ? `Occupied: ${room.current_guest_name || 'Guest'}` : 'Vacant Room'}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-neutral-800/80">
                        {room.status === 'Dirty' ? (
                          <button
                            onClick={() => handleUpdateRoomStatus(room.room_number, 'Cleaning')}
                            className="w-full py-1.5 bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            Start Cleaning
                          </button>
                        ) : room.status === 'Cleaning' ? (
                          <button
                            onClick={() => {
                              setSelectedRoom(room);
                              setInspectModalOpen(true);
                            }}
                            className="w-full py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center gap-1"
                          >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            Complete & Inspect
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateRoomStatus(room.room_number, 'Dirty')}
                            className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-400 font-semibold text-[10px] rounded-xl transition"
                          >
                            Mark Dirty
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-neutral-900 border border-neutral-800/90 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-400 uppercase text-[10px] font-black tracking-widest border-b border-amber-500/30 sticky top-0 z-10 shadow-md">
                        <tr>
                          <th className="p-3.5 pl-4">Suite #</th>
                          <th className="p-3.5">Floor</th>
                          <th className="p-3.5">Suite Category</th>
                          <th className="p-3.5">Turnover Status</th>
                          <th className="p-3.5">Occupancy</th>
                          <th className="p-3.5 pr-4 text-right">Housekeeping Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {filteredRooms.map(room => (
                          <tr key={room.id} className="hover:bg-neutral-850/80 transition-all duration-200 group">
                            <td className="p-3.5 pl-4 whitespace-nowrap">
                              <span className="font-mono font-black text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs shadow-sm">
                                Suite {room.room_number}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-neutral-300 font-bold whitespace-nowrap">Floor {room.floor}</td>
                            <td className="p-3.5 text-neutral-200 font-semibold whitespace-nowrap">{room.room_type}</td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border shadow-sm ${
                                room.status === 'Dirty'
                                  ? 'bg-rose-950/90 text-rose-300 border-rose-500/40 shadow-rose-500/10'
                                  : room.status === 'Cleaning'
                                  ? 'bg-amber-950/90 text-amber-300 border-amber-500/40 shadow-amber-500/10'
                                  : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10'
                              }`}>
                                • {room.status}
                              </span>
                            </td>
                            <td className="p-3.5 whitespace-nowrap font-bold">
                              {room.is_occupied ? (
                                <span className="text-amber-400 flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse inline-block"></span>
                                  Occupied ({room.current_guest_name || 'Guest'})
                                </span>
                              ) : (
                                <span className="text-neutral-500 font-normal italic">-- Vacant --</span>
                              )}
                            </td>
                            <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                              {room.status === 'Dirty' && (
                                <button
                                  onClick={() => handleUpdateRoomStatus(room.room_number, 'Cleaning')}
                                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center gap-1"
                                >
                                  <Play className="h-3.5 w-3.5 fill-current" />
                                  <span>Start Cleaning</span>
                                </button>
                              )}
                              {room.status === 'Cleaning' && (
                                <button
                                  onClick={() => {
                                    setSelectedRoom(room);
                                    setInspectModalOpen(true);
                                  }}
                                  className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center gap-1"
                                >
                                  <ClipboardCheck className="h-3.5 w-3.5" />
                                  <span>Inspection Checklist</span>
                                </button>
                              )}
                              {room.status === 'Clean' && (
                                <button
                                  onClick={() => handleUpdateRoomStatus(room.room_number, 'Dirty')}
                                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-neutral-200 border border-neutral-700 font-bold text-[10px] rounded-xl transition-all shadow hover:scale-[1.02] active:scale-[0.98]"
                                >
                                  Mark Dirty
                                </button>
                              )}
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

          {/* 2. GUEST AMENITY & REPAIR TICKETS */}
          {mainView === 'tickets' && (
            <div className="space-y-4">
              <div className="flex gap-2 bg-neutral-900 border border-neutral-800 p-3 rounded-2xl">
                {(['Pending', 'In Progress', 'Cleaned'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setStatusFilter(tab)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition ${statusFilter === tab ? 'bg-amber-500 text-neutral-950 font-extrabold' : 'bg-neutral-800 text-neutral-400'}`}
                  >
                    {tab} ({tickets.filter(t => t.status === tab).length})
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tickets.filter(t => t.status === statusFilter).map(ticket => (
                  <div key={ticket.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            ticket.category === 'Maintenance' ? 'bg-red-950 text-red-400 border border-red-700/40' :
                            ticket.category === 'Amenity' ? 'bg-blue-950 text-blue-400 border border-blue-700/40' :
                            'bg-green-950 text-green-400 border border-green-700/40'
                          }`}>
                            {ticket.category}
                          </span>
                          <h4 className="font-extrabold text-sm text-neutral-100 mt-1">
                            Suite {ticket.room_number || `Booking #${ticket.booking_id}`}
                          </h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          ticket.priority === 'High' ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {ticket.priority} Priority
                        </span>
                      </div>

                      <p className="text-neutral-200 text-xs mt-2 leading-relaxed bg-neutral-950 p-3 rounded-xl border border-neutral-800/80">
                        {ticket.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-neutral-800 flex justify-between items-center">
                      <span className="text-[10px] text-neutral-500">Logged {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      
                      {ticket.status === 'Pending' ? (
                        <button
                          onClick={() => handleUpdateTicketStatus(ticket.id, 'In Progress')}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition flex items-center gap-1"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          Start Request
                        </button>
                      ) : ticket.status === 'In Progress' ? (
                        <button
                          onClick={() => handleUpdateTicketStatus(ticket.id, 'Cleaned')}
                          className="px-3.5 py-1.5 bg-green-600 hover:bg-green-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Delivered & Resolved
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-green-500 flex items-center gap-1">
                          <Check className="h-4 w-4" />
                          Resolved
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Turnover Inspection Checklist Modal */}
      {inspectModalOpen && selectedRoom && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-start pb-3 border-b border-neutral-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-amber-500">Suite {selectedRoom.room_number}</span>
                <h3 className="text-lg font-extrabold text-neutral-100">Turnover Inspection Checklist</h3>
                <p className="text-xs text-neutral-400">{selectedRoom.room_type}</p>
              </div>
              <button onClick={() => setInspectModalOpen(false)} className="text-neutral-500 hover:text-white font-bold text-sm">✕</button>
            </div>

            <div className="space-y-3">
              {[
                { key: 'bedMade', label: 'Beds dressed with fresh Egyptian cotton linens' },
                { key: 'bathroomSanitized', label: 'Bathroom sterilized & luxury toiletries replaced' },
                { key: 'towelsReplaced', label: 'Fresh bath sheets, hand towels, and bathmats' },
                { key: 'minibarRestocked', label: 'Minibar replenished & glassware polished' },
                { key: 'acPreset', label: 'Climate control preset to comfortable 22°C' }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800 cursor-pointer hover:border-neutral-700 transition">
                  <input
                    type="checkbox"
                    checked={(checklist as any)[item.key]}
                    onChange={(e) => setChecklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-neutral-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs font-semibold text-neutral-200">{item.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInspectModalOpen(false)}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingInspection || !Object.values(checklist).every(Boolean)}
                onClick={handleCompleteTurnover}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
              >
                <ClipboardCheck className="h-4 w-4" />
                {submittingInspection ? 'Updating...' : 'Pass & Release Room'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
