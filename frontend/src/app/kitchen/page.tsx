'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, getAuthToken, API_BASE } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import ThemeDatePicker from '@/components/ThemeDatePicker';
import { 
  Clock, 
  CheckCircle, 
  Flame, 
  Bike, 
  Volume2, 
  VolumeX, 
  ChefHat, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Printer, 
  Sparkles, 
  Utensils, 
  Search, 
  TrendingUp, 
  X, 
  Check, 
  AlertTriangle, 
  UserCheck,
  Crown,
  LayoutGrid,
  List,
  XCircle,
  Ban
} from 'lucide-react';

import NotificationToastContainer, { ToastMessage, playNotificationChime } from '@/components/NotificationToast';
import { 
  mergeOrdersWithHierarchy, 
  getCachedOrders, 
  saveCachedOrders, 
  markOrderDeliveredLocally, 
  KDS_ORDERS_STORAGE_KEY 
} from '@/lib/orderSync';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  category?: string;
}

interface Order {
  id: number;
  booking_id: number;
  room_number?: string;
  guest_name?: string;
  items: OrderItem[];
  total_price: number;
  status: string; // Pending, Preparing, Ready, OutForDelivery, Delivered, Cancelled
  runner_name?: string;
  estimated_minutes?: number;
  special_instructions?: string;
  created_at: string;
  delivered_at?: string;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
}

export const PREFILLED_CANCELLATION_REASONS = [
  {
    id: '86_item',
    label: "Item 86'd / Out of Stock",
    icon: '🚫',
    badge: 'Inventory / 86',
    defaultText: "Key ingredients depleted; station 86'd this dish for tonight's dinner service.",
  },
  {
    id: 'guest_request',
    label: 'Guest Requested Cancellation',
    icon: '🛎️',
    badge: 'Guest Request',
    defaultText: 'Resident phoned room service / front desk requesting to cancel the order.',
  },
  {
    id: 'allergy_conflict',
    label: 'Unfulfillable Dietary / Allergy',
    icon: '⚠️',
    badge: 'Health & Safety',
    defaultText: 'Kitchen brigade cannot safely prepare the requested dish without allergen cross-contamination risk.',
  },
  {
    id: 'duplicate_order',
    label: 'Duplicate Ticket Placed',
    icon: '👥',
    badge: 'System Duplicate',
    defaultText: 'Duplicate order submitted accidentally for this suite. Voiding redundant KOT.',
  },
  {
    id: 'kitchen_cutoff',
    label: 'Past Dining Service Cutoff',
    icon: '⏰',
    badge: 'Service Hours',
    defaultText: 'Order submitted after kitchen closing hours / last-order curfew.',
  },
  {
    id: 'equipment_failure',
    label: 'Kitchen Station Breakdown',
    icon: '🔥',
    badge: 'Maintenance',
    defaultText: 'Station equipment (oven / tandoor bhatti / fryer) temporarily non-operational.',
  },
  {
    id: 'suite_vacant',
    label: 'Suite Vacant / Checked Out',
    icon: '🚪',
    badge: 'Front Desk Sync',
    defaultText: 'Suite is unoccupied or guest has already settled account and checked out.',
  },
  {
    id: 'custom',
    label: 'Other / Custom Chef Remark',
    icon: '✍️',
    badge: 'Custom Note',
    defaultText: '',
  },
];

export default function KitchenKDSPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(() => getCachedOrders<Order>());
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(() => getCachedOrders<Order>().length === 0);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // AI Chef Prep Forecast Modal state
  const [showAiPrepForecast, setShowAiPrepForecast] = useState(false);

  // Real-time Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, description: string, type: 'success' | 'alert' | 'info' = 'info') => {
    const newToast: ToastMessage = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      title,
      description,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    playNotificationChime(type);
    setToasts(prev => [newToast, ...prev.slice(0, 4)]);
  };

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  // Filtering states
  const [activeStatusFilter, setActiveStatusFilter] = useState<'All' | 'Pending' | 'Preparing' | 'Ready' | 'OutForDelivery' | 'Delivered' | 'Cancelled'>('All');
  const [activeStation, setActiveStation] = useState<string>('All Stations');
  const [searchQuery, setSearchQuery] = useState('');
  const [kdsViewMode, setKdsViewMode] = useState<'grid' | 'list'>('grid');

  // Order Cancellation Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [selectedReasonId, setSelectedReasonId] = useState<string>('86_item');
  const [cancellationReasonText, setCancellationReasonText] = useState<string>(
    "Key ingredients depleted; station 86'd this dish for tonight's dinner service."
  );
  const [voidChargesOnFolio, setVoidChargesOnFolio] = useState(true);

  const openCancelModal = (order: Order) => {
    setOrderToCancel(order);
    setSelectedReasonId('86_item');
    setCancellationReasonText("Key ingredients depleted; station 86'd this dish for tonight's dinner service.");
    setVoidChargesOnFolio(true);
    setCancelModalOpen(true);
  };

  const handleSelectReason = (reasonId: string) => {
    setSelectedReasonId(reasonId);
    const found = PREFILLED_CANCELLATION_REASONS.find(r => r.id === reasonId);
    if (found && reasonId !== 'custom') {
      setCancellationReasonText(found.defaultText);
    } else if (reasonId === 'custom') {
      setCancellationReasonText('');
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    const orderId = orderToCancel.id;
    const finalReason = cancellationReasonText.trim() || 'Cancelled by Kitchen Chef';
    const nowIso = new Date().toISOString();

    // 1. Instant Optimistic Local State & Cache Update
    setOrders(prev => {
      const next = prev.map(o => (o.id === orderId ? {
        ...o,
        status: 'Cancelled',
        cancellation_reason: finalReason,
        cancelled_at: nowIso,
        estimated_minutes: 0,
      } : o));
      saveCachedOrders(next);
      return next;
    });

    playNotificationChime('alert');
    addToast(
      `🚫 Order #${orderId} Voided & Cancelled`,
      `Reason: ${finalReason} • Room Folio void applied.`,
      'alert'
    );

    // 2. Persist to API
    try {
      await apiRequest(`/api/v1/qr_menu/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'Cancelled',
          cancellation_reason: finalReason,
        }),
      });
    } catch (err: any) {
      console.warn('Backend sync delayed; cancellation saved locally:', err.message);
    }

    setCancelModalOpen(false);
    setOrderToCancel(null);
  };
  
  // Audio & Alerts
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aihos_kds_sound');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  // BUG 4 FIX: use useRef instead of useState so comparison doesn't trigger useEffect re-subscribe
  const previousOrderCountRef = useRef(0);

  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('aihos_kds_sound', JSON.stringify(next));
      }
      return next;
    });
  };

  // Interactive Item Checkoff State (orderId-itemIndex: boolean)
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

  // KOT Thermal Receipt Modal State
  const [selectedOrderForKOT, setSelectedOrderForKOT] = useState<Order | null>(null);

  // Runner Assignment Modal State
  const [runnerModalOpen, setRunnerModalOpen] = useState(false);
  const [orderForRunner, setOrderForRunner] = useState<Order | null>(null);
  const [selectedRunner, setSelectedRunner] = useState('Runner Vikram');
  const [runnerETA, setRunnerETA] = useState(10);

  // Kitchen Sales History Modal State
  const [salesHistoryModalOpen, setSalesHistoryModalOpen] = useState(false);
  const [salesHistoryData, setSalesHistoryData] = useState<any>(null);
  const [salesDateFilter, setSalesDateFilter] = useState('yesterday');
  const [customSalesDate, setCustomSalesDate] = useState('');
  const [expandedHistoryOrderId, setExpandedHistoryOrderId] = useState<number | null>(null);
  const [salesHistoryLoading, setSalesHistoryLoading] = useState(false);

  const fetchSalesHistory = async (filter: string = salesDateFilter) => {
    setSalesHistoryLoading(true);
    try {
      const data = await apiRequest(`/api/v1/qr_menu/sales-history?date_filter=${filter}`);
      setSalesHistoryData(data);
    } catch (err: any) {
      console.error('Error fetching kitchen sales history:', err);
    } finally {
      setSalesHistoryLoading(false);
    }
  };

  // Auth Guard
  useEffect(() => {
    const token = getAuthToken();
    const role = localStorage.getItem('aihos_role');
    if (!token || (role !== 'Kitchen' && role !== 'Admin' && role !== 'Executive')) {
      router.push('/login');
    }
  }, [router]);

  // Fetch Kitchen Orders with Monotonic Hierarchy Merge
  const fetchKitchenOrders = async () => {
    try {
      const data: Order[] = await apiRequest('/api/v1/qr_menu/orders');
      const incoming: Order[] = Array.isArray(data) ? data : [];

      setOrders(prev => {
        const merged = mergeOrdersWithHierarchy(incoming, prev);
        saveCachedOrders(merged);

        const pendingOrders = merged.filter(o => o.status === 'Pending');
        const pendingCount = pendingOrders.length;
        if (pendingCount > previousOrderCountRef.current && previousOrderCountRef.current !== 0) {
          const latest = pendingOrders[0];
          addToast(
            '🔔 New In-Room Dining Order!',
            `Order #${latest ? latest.id : ''} for Suite ${latest?.room_number || latest?.booking_id || ''} received.`,
            'alert'
          );
        }
        previousOrderCountRef.current = pendingCount;

        return merged;
      });
    } catch (err: any) {
      console.warn('Kitchen poll failed, preserving local cached orders:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cross-Tab Instant Sync with Runner and QR Menu
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === KDS_ORDERS_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setOrders(prev => mergeOrdersWithHierarchy(parsed, prev));
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    fetchKitchenOrders();
    apiRequest('/api/v1/admin/staff')
      .then(st => { if (Array.isArray(st)) setStaffList(st); })
      .catch(() => {});
    const interval = setInterval(fetchKitchenOrders, 4000);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedSeconds = (createdTimeStr: string) => {
    const created = new Date(createdTimeStr);
    return Math.floor((currentTime.getTime() - created.getTime()) / 1000);
  };

  const formatElapsed = (createdTimeStr: string) => {
    const totalSecs = getElapsedSeconds(createdTimeStr);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  // Toggle Dish Checkoff
  const toggleItemCheck = (orderId: number, itemIdx: number) => {
    const key = `${orderId}-${itemIdx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Update Status API with LocalStorage optimistic sync
  const handleUpdateStatus = async (orderId: number, nextStatus: string, runnerName?: string, eta?: number) => {
    const nowIso = new Date().toISOString();
    if (nextStatus === 'Delivered') {
      markOrderDeliveredLocally(orderId);
    }

    setOrders(prev => {
      const next = prev.map(o => (o.id === orderId ? { 
        ...o, 
        status: nextStatus, 
        runner_name: runnerName || o.runner_name,
        estimated_minutes: nextStatus === 'Delivered' ? 0 : (eta ?? o.estimated_minutes),
        delivered_at: nextStatus === 'Delivered' ? (o.delivered_at || nowIso) : o.delivered_at,
      } : o));
      saveCachedOrders(next);
      return next;
    });

    try {
      await apiRequest(`/api/v1/qr_menu/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: nextStatus,
          runner_name: runnerName,
          estimated_minutes: nextStatus === 'Delivered' ? 0 : eta
        }),
      });
    } catch (err: any) {
      console.warn('Backend sync delayed, status updated locally:', err.message);
    }
  };

  // Confirm Runner Dispatch
  const confirmRunnerDispatch = async () => {
    if (!orderForRunner) return;
    const targetStatus = orderForRunner.status === 'Ready' ? 'OutForDelivery' : orderForRunner.status;
    await handleUpdateStatus(orderForRunner.id, targetStatus, selectedRunner, runnerETA);
    setRunnerModalOpen(false);
    setOrderForRunner(null);
  };

  // Station Categorization Helper
  const getDishStation = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('tikka') || n.includes('kebab') || n.includes('naan') || n.includes('roti') || n.includes('paratha') || n.includes('bread')) {
      return 'Tandoor & Breads';
    }
    if (n.includes('butter chicken') || n.includes('makhani') || n.includes('paneer') || n.includes('curry') || n.includes('gravy') || n.includes('dal') || n.includes('shahi')) {
      return 'Curries & Gravies';
    }
    if (n.includes('biryani') || n.includes('rice') || n.includes('pulao') || n.includes('gosht')) {
      return 'Biryani & Rice';
    }
    return 'Pantry & Desserts';
  };

  // Helper to parse dietary and allergen alerts from special instructions or tags
  const parseDietaryBadges = (instruction?: string) => {
    if (!instruction) return [];
    const lower = instruction.toLowerCase();
    const badges: { label: string; color: string; icon: string }[] = [];

    if (lower.includes('nut') || lower.includes('peanut') || lower.includes('cashew') || lower.includes('almond')) {
      badges.push({ label: 'NUT ALLERGY ALERT', color: 'bg-red-950 text-red-300 border-red-700 ring-1 ring-red-500/50', icon: '🚫' });
    }
    if (lower.includes('lactose') || lower.includes('dairy free') || lower.includes('no milk') || lower.includes('no butter')) {
      badges.push({ label: 'LACTOSE / DAIRY FREE', color: 'bg-orange-950 text-orange-300 border-orange-700', icon: '🥛' });
    }
    if (lower.includes('gluten') || lower.includes('celiac') || lower.includes('no wheat')) {
      badges.push({ label: 'GLUTEN FREE', color: 'bg-amber-950 text-amber-300 border-amber-700', icon: '🌾' });
    }
    if (lower.includes('jain') || lower.includes('no onion') || lower.includes('no garlic')) {
      badges.push({ label: 'STRICT JAIN PREPARATION', color: 'bg-green-950 text-green-300 border-green-700 font-extrabold', icon: '🌿' });
    }
    if (lower.includes('pure veg') || lower.includes('vegetarian')) {
      badges.push({ label: 'PURE VEG', color: 'bg-emerald-950 text-emerald-300 border-emerald-700', icon: '🟢' });
    }
    if (lower.includes('mild') || lower.includes('less spicy') || lower.includes('kids')) {
      badges.push({ label: 'MILD SPICE (LESS SPICY)', color: 'bg-blue-950 text-blue-300 border-blue-700', icon: '🥣' });
    }
    if (lower.includes('extra hot') || lower.includes('extra spicy') || lower.includes('very spicy')) {
      badges.push({ label: 'EXTRA HOT & SPICY', color: 'bg-rose-950 text-rose-300 border-rose-700', icon: '🌶️' });
    }
    return badges;
  };

  // Filter Pipeline
  const filteredOrders = orders.filter(o => {
    // Status Filter
    const matchesStatus = activeStatusFilter === 'All' 
      ? (o.status !== 'Delivered' && o.status !== 'Cancelled')
      : o.status === activeStatusFilter;

    // Station Filter
    const matchesStation = activeStation === 'All Stations' || 
      o.items.some(item => getDishStation(item.name) === activeStation);

    // Search Query
    const matchesSearch = !searchQuery || 
      `Order #${o.id}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `Booking #${o.booking_id}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.special_instructions && o.special_instructions.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.cancellation_reason && o.cancellation_reason.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesStation && matchesSearch;
  });

  // KPI Calculations
  const pendingCount = orders.filter(o => o.status === 'Pending').length;
  const preparingCount = orders.filter(o => o.status === 'Preparing').length;
  const readyCount = orders.filter(o => o.status === 'Ready').length;
  const outCount = orders.filter(o => o.status === 'OutForDelivery').length;
  const deliveredCount = orders.filter(o => o.status === 'Delivered').length;
  const cancelledCount = orders.filter(o => o.status === 'Cancelled').length;
  const activePipelineCount = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  const totalValueCooked = orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total_price, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-neutral-400 text-sm font-semibold">Opening Kitchen Display System (KDS)...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-neutral-950 text-neutral-100 selection:bg-amber-500 selection:text-neutral-950 overflow-hidden">
      
      {/* Unified Side Navigation */}
      <Sidebar />

      {/* Main KDS Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top KDS Command Bar */}
        <header className="px-4 py-2 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center gap-3 shadow-lg shrink-0 w-full overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            <div className="h-8 w-8 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black shadow shrink-0">
              <ChefHat className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-white truncate leading-none">
                  Kitchen Display System (KDS)
                </h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-green-950 text-green-400 border border-green-700/60 rounded-full shrink-0 whitespace-nowrap hidden sm:inline-block">
                  LIVE PIPELINE
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 truncate">Station Routing, Dietary Safety Alerts & Delivery Handoff</p>
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
              onClick={() => {
                setSalesHistoryModalOpen(true);
                fetchSalesHistory(salesDateFilter);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 shrink-0"
              title="Inspect Daily Sales & Dish Breakdown History"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Daily Sales & Dish History</span>
            </button>

            <button
              onClick={fetchKitchenOrders}
              className="p-1.5 bg-neutral-850 hover:bg-neutral-800 rounded-xl border border-neutral-700 text-neutral-300 transition shrink-0"
              title="Refresh Kitchen Orders"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-neutral-800 shrink-0"></div>

            <div className="text-right px-2 py-1 bg-neutral-950 rounded-xl border border-neutral-800 shrink-0">
              <span className="text-[11px] font-black text-amber-400 block leading-none font-mono whitespace-nowrap">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        {/* Real-Time Kitchen Velocity & KPI Ribbon */}
        <div className="px-4 py-1.5 bg-neutral-950 border-b border-neutral-800/80 flex flex-wrap justify-between items-center gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-neutral-500 uppercase text-[9px] tracking-wider">Active Orders:</span>
              <span className="text-amber-400 font-black text-xs">{pendingCount + preparingCount + readyCount + outCount}</span>
            </div>
            <div className="h-3 w-px bg-neutral-800"></div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-blue-400" />
              <span className="text-neutral-300 text-[11px]">Avg Prep: <strong className="text-white">14.5m</strong></span>
            </div>
            <div className="h-3 w-px bg-neutral-800"></div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-green-400" />
              <span className="text-neutral-300 text-[11px]">SLA Target: <strong className="text-green-400">97.4%</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500 uppercase text-[9px] tracking-wider">Total Culinary Value:</span>
              <span className="text-amber-400 font-bold font-mono">₹{totalValueCooked.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAiPrepForecast(true)}
              className="text-[10px] font-extrabold px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 rounded-xl transition shadow flex items-center gap-1.5"
            >
              <Sparkles className="h-3 w-3" />
              <span>👨‍🍳 AI Chef Prep Forecast</span>
            </button>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-500/40 rounded-full flex items-center gap-1">
              <Flame className="h-3 w-3" />
              Peak Dining Velocity
            </span>
          </div>
        </div>

        {/* Station Tabs & Search Header */}
        <div className="px-6 py-3 bg-neutral-900/80 border-b border-neutral-800 flex flex-wrap justify-between items-center gap-3 shrink-0">
          
          {/* Station Selector */}
          <div className="flex gap-1.5 overflow-x-auto">
            {[
              'All Stations',
              'Tandoor & Breads',
              'Curries & Gravies',
              'Biryani & Rice',
              'Pantry & Desserts'
            ].map(station => (
              <button
                key={station}
                onClick={() => setActiveStation(station)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                  activeStation === station
                    ? 'bg-amber-500 text-neutral-950 border-amber-500 shadow-md font-extrabold'
                    : 'bg-neutral-850 hover:bg-neutral-800 text-neutral-400 border-neutral-750'
                }`}
              >
                {station}
              </button>
            ))}
          </div>

          {/* Search Filter & View Switcher */}
          <div className="flex items-center gap-2">
            <div className="relative w-44 sm:w-48">
              <Search className="h-3.5 w-3.5 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Order / Dish..."
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0">
              <button
                type="button"
                onClick={() => setKdsViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${kdsViewMode === 'grid' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'}`}
                title="Grid Card View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setKdsViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-bold transition ${kdsViewMode === 'list' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'}`}
                title="Compact List View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Pipeline Stage Selector Tabs */}
        <div className="px-6 py-2.5 bg-neutral-900/40 border-b border-neutral-800 flex items-center gap-2 overflow-x-auto shrink-0">
          {[
            { key: 'All', label: 'All Active Pipeline', count: activePipelineCount, color: 'text-neutral-200' },
            { key: 'Pending', label: '1. New / Pending', count: pendingCount, color: 'text-red-400' },
            { key: 'Preparing', label: '2. Cooking on Fire', count: preparingCount, color: 'text-yellow-400' },
            { key: 'Ready', label: '3. Plated & Ready', count: readyCount, color: 'text-blue-400' },
            { key: 'OutForDelivery', label: '4. Out for Delivery', count: outCount, color: 'text-purple-400' },
            { key: 'Delivered', label: '5. Delivered (History)', count: deliveredCount, color: 'text-green-400' },
            { key: 'Cancelled', label: '6. Cancelled / 86 Void', count: cancelledCount, color: 'text-rose-400' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveStatusFilter(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                activeStatusFilter === tab.key 
                  ? 'bg-neutral-800 text-amber-400 border-amber-500 font-extrabold shadow-sm' 
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeStatusFilter === tab.key ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 ' + tab.color
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {error && (
          <div className="m-6 p-4 rounded-xl bg-red-950/40 border border-red-700/60 text-red-200 text-xs shrink-0">
            {error}
          </div>
        )}

        {/* Main Order Pipeline Grid or List */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {filteredOrders.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-neutral-500 py-24 border border-dashed border-neutral-800 rounded-3xl bg-neutral-900/20">
              <CheckCircle2 className="h-16 w-16 text-neutral-700 mb-3" />
              <h3 className="text-base font-bold text-neutral-300">Kitchen Brigade Queue Clear</h3>
              <p className="text-xs text-neutral-500 mt-1">No orders matching the current filter: "{activeStation}" • "{activeStatusFilter}".</p>
            </div>
          ) : kdsViewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredOrders.map(order => {
                const elapsedSecs = getElapsedSeconds(order.created_at);
                const timerColor = 
                  order.status === 'Cancelled' ? 'text-rose-400 bg-rose-950/60 border-rose-700' :
                  order.status === 'Delivered' ? 'text-green-500' :
                  elapsedSecs > 1200 ? 'text-red-400 bg-red-950/60 border-red-700 animate-pulse' :
                  elapsedSecs > 600 ? 'text-yellow-400 bg-yellow-950/60 border-yellow-700' :
                  'text-green-400 bg-green-950/60 border-green-700';

                const dietaryBadges = parseDietaryBadges(order.special_instructions);
                const completedItemsCount = order.items.filter((_, idx) => checkedItems[`${order.id}-${idx}`]).length;

                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border bg-neutral-900 flex flex-col justify-between shadow-xl overflow-hidden transition-all ${
                      order.status === 'Pending' ? 'border-red-600 ring-2 ring-red-600/30' :
                      order.status === 'Preparing' ? 'border-yellow-600/80' :
                      order.status === 'Ready' ? 'border-blue-600/80' :
                      order.status === 'OutForDelivery' ? 'border-purple-600/80' :
                      order.status === 'Cancelled' ? 'border-rose-700/80 bg-rose-950/20' :
                      'border-neutral-800 opacity-70'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="p-4 bg-neutral-850/90 border-b border-neutral-800 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-base font-extrabold text-neutral-100">Order #{order.id}</span>
                          <span className="text-xs font-black text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded-md shadow-sm">
                            Suite {order.room_number || (order.booking_id === 1 ? '101' : order.booking_id === 4 ? '204' : order.booking_id === 8 ? '302' : `${order.booking_id + 100}`)}
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-300 font-semibold block mt-1">
                          Resident: <strong className="text-white font-extrabold">{order.guest_name || (order.booking_id === 1 ? 'Pooja Sharma' : order.booking_id === 4 ? 'Maharaja Raghavendra' : order.booking_id === 8 ? 'Captain Vikram' : 'Resident Guest')}</strong> • {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • <strong>₹{order.total_price.toFixed(2)}</strong>
                        </span>
                      </div>

                      {/* Timer & KOT Print Button */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => window.open(`${API_BASE}/api/v1/qr_menu/orders/${order.id}/kitchen-ticket`, '_blank')}
                          className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                          title="Print Thermal Kitchen Ticket (ESC/POS KOT)"
                        >
                          <span>🖨️</span>
                          <span>KOT</span>
                        </button>
                        <div className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 ${timerColor}`}>
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatElapsed(order.created_at)}</span>
                        </div>

                        <button
                          onClick={() => setSelectedOrderForKOT(order)}
                          className="p-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-white rounded-lg border border-neutral-700 transition"
                          title="Generate Thermal Kitchen Order Ticket (KOT)"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* CANCELLED ORDER VOID BANNER */}
                    {order.status === 'Cancelled' && (
                      <div className="p-3 bg-rose-950/80 border-b border-rose-800/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                            <Ban className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                            <span>Order Voided & Cancelled</span>
                          </span>
                          {order.cancelled_at && (
                            <span className="text-[10px] text-rose-400 font-mono">
                              {new Date(order.cancelled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-rose-200 font-medium italic">
                          "{order.cancellation_reason || 'Cancelled by Kitchen Chef'}"
                        </p>
                      </div>
                    )}

                    {/* HIGH-VISIBILITY DIETARY & ALLERGEN WARNING BADGES */}
                    {dietaryBadges.length > 0 && (
                      <div className="p-2.5 bg-neutral-950 border-b border-neutral-800 space-y-1.5">
                        <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-neutral-400">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          <span>Dietary & Allergen Instructions:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dietaryBadges.map((b, i) => (
                            <span key={i} className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${b.color}`}>
                              <span>{b.icon}</span>
                              <span>{b.label}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Special Instructions Note */}
                    {order.special_instructions && (
                      <div className="mx-4 mt-3 p-2.5 bg-amber-950/30 border border-amber-600/40 rounded-xl text-[11px] text-amber-300 font-semibold flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                        <span>Chef Note: "{order.special_instructions}"</span>
                      </div>
                    )}

                    {/* Interactive Item Checklist */}
                    <div className="p-4 flex-1 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] uppercase font-extrabold tracking-wider text-neutral-500">
                          Plating Checklist ({completedItemsCount}/{order.items.length})
                        </p>
                        <span className="text-[10px] text-neutral-400">
                          {getDishStation(order.items[0]?.name || '')}
                        </span>
                      </div>

                      <ul className="space-y-2">
                        {order.items.map((item, idx) => {
                          const isDone = checkedItems[`${order.id}-${idx}`];
                          return (
                            <li 
                              key={idx} 
                              onClick={() => toggleItemCheck(order.id, idx)}
                              className={`flex justify-between items-center p-2 rounded-xl border transition cursor-pointer ${
                                isDone 
                                  ? 'bg-neutral-950 border-green-800/80 line-through opacity-60 text-neutral-400' 
                                  : 'bg-neutral-850/70 border-neutral-750 hover:border-amber-500/50 text-neutral-200'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition ${
                                  isDone ? 'bg-green-600 border-green-500 text-white' : 'border-neutral-600 bg-neutral-800'
                                }`}>
                                  {isDone && <Check className="h-3.5 w-3.5" />}
                                </div>
                                <span className="h-5 w-5 rounded bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-amber-400 text-xs">
                                  {item.quantity}
                                </span>
                                <span className="font-semibold text-xs">{item.name}</span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* Runner Assignment & Delivery Destination Details */}
                    <div className="px-4 py-2 bg-neutral-950/80 border-t border-neutral-800 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Bike className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                        <span className="text-neutral-300 truncate">
                          Assigned Delivery: <strong className="text-amber-400 font-extrabold">{order.runner_name || 'Runner Vikram (Default)'}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOrderForRunner(order);
                          setSelectedRunner(order.runner_name || 'Runner Vikram');
                          setRunnerModalOpen(true);
                        }}
                        className="text-[10px] font-extrabold text-amber-400 hover:text-amber-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 px-2 py-0.5 rounded-lg transition shrink-0 ml-1"
                      >
                        {order.runner_name ? 'Change Runner' : 'Assign Runner'}
                      </button>
                    </div>

                    {/* Lifecycle Action Buttons */}
                    <div className="p-3.5 bg-neutral-850/60 border-t border-neutral-800 flex gap-2">
                      {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                        <button
                          type="button"
                          onClick={() => openCancelModal(order)}
                          className="py-2.5 px-3 bg-rose-950/50 hover:bg-rose-900/80 border border-rose-800/80 text-rose-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1 shrink-0 shadow-sm"
                          title="Cancel Order / 86 Item"
                        >
                          <Ban className="h-4 w-4 text-rose-400" />
                          <span className="hidden sm:inline">Cancel</span>
                        </button>
                      )}

                      {order.status === 'Pending' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'Preparing')}
                          className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
                        >
                          <Flame className="h-4 w-4" />
                          Accept & Start Cooking
                        </button>
                      )}

                      {order.status === 'Preparing' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'Ready')}
                          className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-neutral-950 font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Plated • Ready for Runner
                        </button>
                      )}

                      {order.status === 'Ready' && (
                        <button
                          onClick={() => {
                            setOrderForRunner(order);
                            setRunnerModalOpen(true);
                          }}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
                        >
                          <Bike className="h-4 w-4" />
                          Assign Runner & Dispatch
                        </button>
                      )}

                      {order.status === 'OutForDelivery' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'Delivered')}
                          className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white font-extrabold text-xs rounded-xl transition shadow-lg flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Confirm Room Delivered
                        </button>
                      )}

                      {order.status === 'Delivered' && (
                        <div className="w-full py-2 text-center text-xs font-bold text-green-400 flex items-center justify-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Delivered & Billed to Folio
                        </div>
                      )}

                      {order.status === 'Cancelled' && (
                        <div className="w-full py-2.5 text-center text-xs font-bold text-rose-400 flex items-center justify-center gap-1.5 bg-rose-950/40 border border-rose-900/60 rounded-xl">
                          <Ban className="h-4 w-4 text-rose-400" />
                          <span>Order Cancelled & Charges Voided</span>
                        </div>
                      )}
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
                      <th className="p-3.5 pl-4">Order ID</th>
                      <th className="p-3.5">Suite & Destination</th>
                      <th className="p-3.5">Items Summary</th>
                      <th className="p-3.5">Assigned Delivery Runner</th>
                      <th className="p-3.5">Elapsed Time</th>
                      <th className="p-3.5">Total Value</th>
                      <th className="p-3.5 pr-4 text-right">Stage Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-neutral-850/80 transition-all duration-200 group">
                        <td className="p-3.5 pl-4 whitespace-nowrap">
                          <span className="font-mono font-black text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-500/30 text-xs shadow-sm">
                            #{order.id}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-amber-300 font-extrabold text-xs rounded-xl inline-block shadow-sm w-fit">
                              Suite {order.room_number || (order.booking_id === 1 ? '101' : order.booking_id === 4 ? '204' : order.booking_id === 8 ? '302' : `${order.booking_id + 100}`)}
                            </span>
                            <span className="text-[11px] text-neutral-300 font-semibold mt-0.5">
                              {order.guest_name || (order.booking_id === 1 ? 'Pooja Sharma' : order.booking_id === 4 ? 'Maharaja Raghavendra' : order.booking_id === 8 ? 'Captain Vikram' : 'Resident Guest')}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 text-neutral-200 font-semibold">
                          {order.items?.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setOrderForRunner(order);
                              setSelectedRunner(order.runner_name || 'Runner Vikram');
                              setRunnerModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-300 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
                            title="Click to assign or change runner"
                          >
                            <Bike className="h-3.5 w-3.5 text-purple-400" />
                            <span>{order.runner_name || 'Assign Runner'}</span>
                          </button>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-neutral-950 text-amber-400 rounded-lg border border-neutral-800 font-mono font-bold text-xs shadow-sm">
                            ⏱️ {formatElapsed(order.created_at)}
                          </span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="font-mono font-black text-emerald-400 text-xs bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                            ₹{order.total_price.toFixed(2)}
                          </span>
                        </td>
                        <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                              <button
                                type="button"
                                onClick={() => openCancelModal(order)}
                                className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-sm"
                                title="Cancel / Void Order"
                              >
                                <Ban className="h-3.5 w-3.5 text-rose-400" />
                                <span>Cancel</span>
                              </button>
                            )}

                            {order.status === 'Pending' && (
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'Preparing')}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                              >
                                🔥 Fire Order
                              </button>
                            )}
                            {order.status === 'Preparing' && (
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'Ready')}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-neutral-950 font-black text-xs rounded-xl shadow-md shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                              >
                                🔔 Mark Ready
                              </button>
                            )}
                            {order.status === 'Ready' && (
                              <button
                                onClick={() => {
                                  setOrderForRunner(order);
                                  setRunnerModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-black text-xs rounded-xl shadow-md shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                              >
                                🚲 Dispatch Runner
                              </button>
                            )}
                            {order.status === 'OutForDelivery' && (
                              <button
                                onClick={() => handleUpdateStatus(order.id, 'Delivered')}
                                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-black text-xs rounded-xl shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                              >
                                ✅ Mark Delivered
                              </button>
                            )}
                            {order.status === 'Cancelled' && (
                              <span className="px-2.5 py-1 bg-rose-950 text-rose-300 border border-rose-800 rounded-xl text-[11px] font-bold inline-flex items-center gap-1">
                                <Ban className="h-3.5 w-3.5 text-rose-400" />
                                <span>Voided</span>
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
        </main>
      </div>

      {/* MODAL: FOOD RUNNER DISPATCHER */}
      {runnerModalOpen && orderForRunner && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-neutral-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-amber-500">Order #{orderForRunner.id}</span>
                <h3 className="text-base font-extrabold text-neutral-100">Assign Food Delivery Runner</h3>
              </div>
              <button onClick={() => setRunnerModalOpen(false)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Select Delivery Runner</label>
                <select
                  value={selectedRunner}
                  onChange={(e) => setSelectedRunner(e.target.value)}
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500 font-bold"
                >
                  {staffList.filter(s => s.role === 'Runner' || s.role === 'Butler' || s.role === 'Kitchen').map(s => (
                    <option key={s.id} value={s.full_name}>
                      🏃 {s.full_name} ({s.shift || s.employee_id || s.role})
                    </option>
                  ))}
                  {staffList.filter(s => s.role === 'Runner' || s.role === 'Butler' || s.role === 'Kitchen').length === 0 && (
                    <>
                      <option value="Runner Vikram">🏃 Runner Vikram (Floor 3-5 Specialist)</option>
                      <option value="Runner Amit">🏃 Runner Amit (Floor 1-2 Specialist)</option>
                      <option value="Runner Priya">🏃 Runner Priya (VIP Suite Concierge)</option>
                      <option value="Executive Butler Rahul">👑 Executive Butler Rahul (Penthouse)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">
                  Estimated Room Delivery Time ({runnerETA} mins)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 10, 15, 20].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setRunnerETA(mins)}
                      className={`py-2 rounded-xl font-bold border transition text-center ${
                        runnerETA === mins ? 'bg-amber-500 text-neutral-950 border-amber-500' : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                      }`}
                    >
                      {mins} mins
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                <div className="flex justify-between">
                  <span>Destination:</span>
                  <strong className="text-neutral-200">Booking #{orderForRunner.booking_id}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total Items to Carry:</span>
                  <strong className="text-amber-400">{orderForRunner.items.length} Dishes</strong>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRunnerModalOpen(false)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRunnerDispatch}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-1"
                >
                  <Bike className="h-4 w-4" />
                  Dispatch Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ORDER CANCELLATION & 86 VOID */}
      {cancelModalOpen && orderToCancel && (
        <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-neutral-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-rose-950 border border-rose-800 flex items-center justify-center text-rose-400 shrink-0">
                  <Ban className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Order Cancellation</span>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-md">
                      #{orderToCancel.id}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-0.5">
                    Cancel & Void Kitchen Ticket
                  </h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setCancelModalOpen(false);
                  setOrderToCancel(null);
                }}
                className="text-neutral-500 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Target Order Summary */}
            <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 font-medium">Suite Destination:</span>
                <span className="font-extrabold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded-lg">
                  Suite {orderToCancel.room_number || (orderToCancel.booking_id === 1 ? '101' : orderToCancel.booking_id === 4 ? '204' : orderToCancel.booking_id === 8 ? '302' : `${orderToCancel.booking_id + 100}`)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 font-medium">Resident:</span>
                <span className="font-bold text-neutral-200">
                  {orderToCancel.guest_name || 'Resident Guest'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400 font-medium">Order Value:</span>
                <span className="font-mono font-bold text-emerald-400">
                  ₹{orderToCancel.total_price.toFixed(2)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-neutral-850 text-[11px] text-neutral-400 line-clamp-2">
                <span className="font-semibold text-neutral-300">Dishes: </span>
                {orderToCancel.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
              </div>
            </div>

            {/* Pre-filled Selectable Reasons */}
            <div className="space-y-2">
              <label className="block text-[11px] uppercase font-black text-neutral-300 tracking-wider">
                Select Pre-Filled Cancellation Reason:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PREFILLED_CANCELLATION_REASONS.map(reason => {
                  const isSelected = selectedReasonId === reason.id;
                  return (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => handleSelectReason(reason.id)}
                      className={`p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-rose-950/70 border-rose-600 text-rose-100 ring-1 ring-rose-500/50 shadow-md'
                          : 'bg-neutral-850/60 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800'
                      }`}
                    >
                      <span className="text-base shrink-0 mt-0.5">{reason.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold truncate block">{reason.label}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-semibold block mt-0.5 truncate">
                          {reason.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Editable Reason Details Textarea */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] uppercase font-black text-neutral-300 tracking-wider">
                  Chef Remark & Guest Notice:
                </label>
                <span className="text-[10px] text-neutral-500 font-semibold">Editable by Chef</span>
              </div>
              <textarea
                rows={3}
                value={cancellationReasonText}
                onChange={(e) => setCancellationReasonText(e.target.value)}
                placeholder="Enter specific details for cancellation, e.g. which ingredients ran out or alternate dishes offered..."
                className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-neutral-100 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-medium leading-relaxed"
              />
            </div>

            {/* Room Folio Void Option */}
            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">💳</span>
                <div>
                  <span className="text-xs font-bold text-neutral-200 block">Void Room Folio Charges</span>
                  <span className="text-[10px] text-neutral-400 block">Automatically reverses ₹{orderToCancel.total_price.toFixed(2)} from guest folio</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={voidChargesOnFolio}
                onChange={(e) => setVoidChargesOnFolio(e.target.checked)}
                className="h-4 w-4 rounded bg-neutral-800 border-neutral-700 text-rose-600 focus:ring-rose-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancelModalOpen(false);
                  setOrderToCancel(null);
                }}
                className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-xl text-xs transition"
              >
                Keep Order (Back)
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="flex-1 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-rose-900/30 transition flex items-center justify-center gap-1.5"
              >
                <Ban className="h-4 w-4" />
                Confirm Void & Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THERMAL KOT (KITCHEN ORDER TICKET) SIMULATOR */}
      {selectedOrderForKOT && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <span className="text-xs font-extrabold text-neutral-300">Kitchen Order Ticket (KOT)</span>
              <button onClick={() => setSelectedOrderForKOT(null)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            {/* Thermal Receipt Paper Layout */}
            <div className="p-4 bg-amber-50 text-neutral-900 font-mono text-xs rounded-xl shadow-inner border border-amber-200 space-y-2">
              <div className="text-center border-b border-dashed border-neutral-400 pb-2">
                <h4 className="font-extrabold text-sm uppercase tracking-wider">THE GRAND PALACE RESORT</h4>
                <p className="text-[10px] text-neutral-700">ROYAL CULINARY BRIGADE • KDS</p>
                <p className="text-[10px] mt-1 font-bold">KOT #{selectedOrderForKOT.id} • Booking #{selectedOrderForKOT.booking_id}</p>
                <p className="text-[10px] text-neutral-600">{new Date(selectedOrderForKOT.created_at).toLocaleString()}</p>
              </div>

              {/* Allergen alert on KOT */}
              {selectedOrderForKOT.special_instructions && (
                <div className="p-2 bg-neutral-900 text-amber-300 rounded font-bold text-[10px] uppercase">
                  ⚠️ NOTE: {selectedOrderForKOT.special_instructions}
                </div>
              )}

              {/* Items Table */}
              <div className="py-2 border-b border-dashed border-neutral-400 space-y-1">
                <div className="flex justify-between font-bold text-[10px] uppercase pb-1">
                  <span>Qty & Item</span>
                  <span>Price</span>
                </div>
                {selectedOrderForKOT.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-xs font-semibold">
                    <span>{it.quantity}x {it.name}</span>
                    <span>₹{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between font-bold text-xs pt-1">
                <span>TOTAL VALUE:</span>
                <span>₹{selectedOrderForKOT.total_price.toFixed(2)}</span>
              </div>

              <div className="text-center pt-2 text-[9px] text-neutral-600 uppercase border-t border-dashed border-neutral-400">
                KDS Automated Routing Slip
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedOrderForKOT(null)}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs rounded-xl"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow flex items-center justify-center gap-1"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chef Daily Prep & Demand Forecast Modal */}
      {showAiPrepForecast && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-amber-500 text-neutral-950 rounded-full flex items-center justify-center font-bold">
                  👨‍🍳
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">AI Chef Ingredient Prep & Demand Forecast</h3>
                  <p className="text-[10px] text-neutral-400">Target Inventory Prep based on Occupancy & Guest Diets</p>
                </div>
              </div>
              <button
                onClick={() => setShowAiPrepForecast(false)}
                className="h-7 w-7 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 text-xs">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="font-bold text-white block">Royal Makhani Gravy Base</span>
                  <span className="text-[10px] text-neutral-400">Target Servings: 35 Orders</span>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 font-extrabold rounded-xl border border-amber-500/30">
                  14.5 Liters
                </span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="font-bold text-white block">Fresh A-Grade Paneer Cubes</span>
                  <span className="text-[10px] text-neutral-400">Target Servings: 22 Orders</span>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 font-extrabold rounded-xl border border-amber-500/30">
                  12.0 kg
                </span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="font-bold text-white block">Aromatic Basmati Rice Base</span>
                  <span className="text-[10px] text-neutral-400">Target Servings: 40 Servings</span>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 font-extrabold rounded-xl border border-amber-500/30">
                  18.5 kg
                </span>
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="font-bold text-white block">Tandoori Naan & Roti Dough</span>
                  <span className="text-[10px] text-neutral-400">Target Orders: 45 Baskets</span>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 font-extrabold rounded-xl border border-amber-500/30">
                  120 Dough Balls
                </span>
              </div>

              <div className="p-3 bg-green-950/40 border border-green-800/60 rounded-2xl">
                <span className="font-bold text-green-300 text-[11px] block flex items-center gap-1">
                  <span>🌿 Special Diet Advisory:</span>
                </span>
                <p className="text-[10px] text-neutral-300 mt-0.5">
                  4 booked in-house guests requested <strong>Strict Jain Preparation (No Garlic / Onion)</strong>. Ensure dedicated Jain cookware station is operational.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAiPrepForecast(false)}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow transition"
            >
              Acknowledge AI Prep Targets
            </button>
          </div>
        </div>
      )}

      {/* Floating Notification Toasts */}
      <NotificationToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* MODAL: KITCHEN SALES & DISH BREAKDOWN HISTORY */}
      {salesHistoryModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md z-50 overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-3xl w-full shadow-2xl space-y-4 my-4 sm:my-8 relative shrink-0">
            <div className="flex flex-wrap justify-between items-center pb-3 border-b border-neutral-800 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black">
                  📊
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Daily Kitchen Sales & Dish History Register</h3>
                  <p className="text-xs text-neutral-400">Chef & Executive Culinary Revenue Log</p>
                </div>
              </div>

              {/* Date Filter Bar */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={salesDateFilter}
                  onChange={(e) => {
                    setSalesDateFilter(e.target.value);
                    if (e.target.value !== 'custom') {
                      fetchSalesHistory(e.target.value);
                    }
                  }}
                  className="bg-neutral-950 border border-neutral-800 text-amber-400 font-extrabold text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="today">Today's Kitchen Record</option>
                  <option value="yesterday">Yesterday's Sales & Dishes</option>
                  <option value="7days">Last 7 Days Summary</option>
                  <option value="all_time">All-Time Kitchen History</option>
                  <option value="custom">📅 Select Specific Date...</option>
                </select>

                {salesDateFilter === 'custom' && (
                  <ThemeDatePicker
                    value={customSalesDate}
                    onChange={(d) => {
                      setCustomSalesDate(d);
                      if (d) {
                        fetchSalesHistory(d);
                      }
                    }}
                  />
                )}

                <button
                  onClick={() => setSalesHistoryModalOpen(false)}
                  className="h-8 w-8 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full flex items-center justify-center font-bold text-xs"
                >
                  ✕
                </button>
              </div>
            </div>

            {salesHistoryLoading ? (
              <div className="py-12 text-center text-xs text-neutral-400">
                <div className="h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Retrieving Kitchen History Records...
              </div>
            ) : salesHistoryData ? (
              <div className="space-y-4 text-xs">
                {/* Executive KPI Summary Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl">
                    <span className="text-[10px] text-neutral-400 uppercase font-extrabold block">Total Culinary Sales</span>
                    <strong className="text-amber-400 font-extrabold text-base block mt-0.5">
                      ₹{salesHistoryData.total_sales_inr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl">
                    <span className="text-[10px] text-neutral-400 uppercase font-extrabold block">Orders Handled</span>
                    <strong className="text-white font-extrabold text-base block mt-0.5">
                      {salesHistoryData.total_orders} Orders
                    </strong>
                  </div>
                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl">
                    <span className="text-[10px] text-neutral-400 uppercase font-extrabold block">Delivered & Fulfilled</span>
                    <strong className="text-green-400 font-extrabold text-base block mt-0.5">
                      {salesHistoryData.delivered_count} Completed
                    </strong>
                  </div>
                  <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl">
                    <span className="text-[10px] text-neutral-400 uppercase font-extrabold block">Active / Pending</span>
                    <strong className="text-amber-300 font-extrabold text-base block mt-0.5">
                      {salesHistoryData.pending_count} Pending
                    </strong>
                  </div>
                </div>

                {/* Top Sold Dishes Breakdown */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
                  <h4 className="font-extrabold text-white text-xs uppercase tracking-wider text-amber-500">
                    🍲 Dish Sales & Volume Breakdown ({salesHistoryData.top_dishes?.length || 0} Unique Items)
                  </h4>
                  {salesHistoryData.top_dishes?.length === 0 ? (
                    <p className="text-neutral-500 italic text-center py-4">No dish sales recorded for this selected time window.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="border-b border-neutral-850 text-neutral-400 uppercase text-[10px]">
                          <tr>
                            <th className="pb-2">Dish Name</th>
                            <th className="pb-2">Category</th>
                            <th className="pb-2 text-center">Portions Sold</th>
                            <th className="pb-2 text-right">Total Revenue (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-850">
                          {salesHistoryData.top_dishes.map((dish: any, idx: number) => (
                            <tr key={idx} className="hover:bg-neutral-900/50 transition">
                              <td className="py-2.5 font-bold text-white flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-neutral-850 text-amber-400 flex items-center justify-center font-mono text-[10px]">
                                  #{idx + 1}
                                </span>
                                {dish.name}
                              </td>
                              <td className="py-2.5">
                                <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg text-[10px] font-bold">
                                  {dish.category}
                                </span>
                              </td>
                              <td className="py-2.5 text-center font-extrabold text-amber-400 font-mono">
                                {dish.quantity}x
                              </td>
                              <td className="py-2.5 text-right font-extrabold text-green-400 font-mono">
                                ₹{dish.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Orders History List with Openable Details */}
                <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-extrabold text-white text-xs uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                      <span>📜 Historical Orders Log ({salesHistoryData.recent_orders?.length || 0} Orders)</span>
                    </h4>
                    <span className="text-[10px] text-neutral-500 font-medium hidden sm:inline">💡 Click any order row to view full itemized breakdown</span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-neutral-850 pr-1">
                    {salesHistoryData.recent_orders?.map((ord: any) => {
                      const isExpanded = expandedHistoryOrderId === ord.order_id;
                      const createdDate = ord.created_at ? new Date(ord.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
                      const deliveredDate = ord.delivered_at ? new Date(ord.delivered_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : null;

                      return (
                        <div key={ord.order_id} className="py-2 transition">
                          <div
                            onClick={() => setExpandedHistoryOrderId(isExpanded ? null : ord.order_id)}
                            className="flex flex-wrap justify-between items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-neutral-900/80 transition"
                          >
                            <div className="flex-1 min-w-[200px]">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-amber-400 font-extrabold text-xs">Order #{ord.order_id}</span>
                                <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 text-amber-300 font-bold text-[10px] rounded-lg">
                                  Suite {ord.suite_number}
                                </span>
                                <span className="text-white font-bold text-xs">{ord.guest_name}</span>
                                <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                                  📅 {createdDate}
                                </span>
                              </div>
                              <p className="text-[11px] text-neutral-400 mt-1 truncate">
                                {ord.items?.map((it: any) => `${it.quantity}x ${it.name}`).join(', ')}
                              </p>
                            </div>

                            <div className="text-right flex items-center gap-3">
                              <div>
                                <span className="font-extrabold text-amber-400 block font-mono text-xs">₹{ord.total_price.toFixed(2)}</span>
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border inline-block mt-0.5 ${
                                  ord.status === 'Delivered' ? 'bg-green-950 text-green-400 border-green-800' : 'bg-amber-950 text-amber-400 border-amber-800'
                                }`}>
                                  {ord.status}
                                </span>
                              </div>
                              <span className="text-neutral-500 font-bold text-xs">{isExpanded ? '▲' : '▼'}</span>
                            </div>
                          </div>

                          {/* Expandable Itemized Order Details Drawer */}
                          {isExpanded && (
                            <div className="mt-2 p-3 bg-neutral-900 border border-neutral-800 rounded-2xl space-y-3 animate-fadeIn text-xs">
                              <div className="flex justify-between items-start border-b border-neutral-800 pb-2">
                                <div>
                                  <span className="text-[10px] text-amber-500 uppercase font-extrabold tracking-wider block">Full Itemized Order Breakdown</span>
                                  <span className="text-white font-bold">Suite {ord.suite_number} • Resident: {ord.guest_name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrderForKOT({
                                      id: ord.order_id,
                                      booking_id: ord.booking_id,
                                      status: ord.status,
                                      created_at: ord.created_at,
                                      items: ord.items,
                                      special_instructions: ord.special_instructions,
                                      total_price: ord.total_price
                                    });
                                  }}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[10px] rounded-xl transition flex items-center gap-1 shadow"
                                >
                                  <Printer className="h-3 w-3" />
                                  Print KOT Ticket
                                </button>
                              </div>

                              {/* Itemized Table */}
                              <div className="space-y-1 bg-neutral-950 p-2.5 rounded-xl border border-neutral-850">
                                <div className="flex justify-between font-bold text-[10px] text-neutral-400 uppercase border-b border-neutral-850 pb-1">
                                  <span>Portion & Dish</span>
                                  <span>Unit Price</span>
                                  <span className="text-right">Subtotal</span>
                                </div>
                                {ord.items?.map((it: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center text-xs">
                                    <span className="text-white font-semibold">{it.quantity}x {it.name}</span>
                                    <span className="text-neutral-400 font-mono">₹{it.price?.toFixed(2) || '0.00'}</span>
                                    <span className="text-amber-400 font-mono font-bold text-right">₹{((it.price || 0) * (it.quantity || 1)).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Special Instructions & Timestamps */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                {ord.special_instructions && (
                                  <div className="p-2 bg-neutral-950 rounded-xl border border-neutral-800">
                                    <span className="text-neutral-500 font-bold uppercase text-[9px] block">Chef Note / Special Instructions:</span>
                                    <span className="text-amber-300 font-medium">{ord.special_instructions}</span>
                                  </div>
                                )}
                                <div className="p-2 bg-neutral-950 rounded-xl border border-neutral-800 space-y-0.5">
                                  <div className="flex justify-between">
                                    <span className="text-neutral-500 font-bold text-[10px]">Ordered At:</span>
                                    <span className="text-neutral-300 font-mono">{createdDate}</span>
                                  </div>
                                  {deliveredDate && (
                                    <div className="flex justify-between">
                                      <span className="text-neutral-500 font-bold text-[10px]">Delivered At:</span>
                                      <span className="text-green-400 font-mono">{deliveredDate}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
