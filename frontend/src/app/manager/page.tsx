'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, getAuthToken } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import CCTVMonitor from '@/components/CCTVMonitor';
import { 
  LayoutDashboard, 
  TrendingUp, 
  RefreshCw, 
  DollarSign, 
  Sparkles, 
  HeartHandshake, 
  Sliders, 
  FileText, 
  ShieldAlert,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Timer,
  UserCheck,
  Plus,
  Search,
  Zap,
  Check,
  Activity,
  Filter,
  X
} from 'lucide-react';

export interface LiveTaskItem {
  id: string;
  department: 'Housekeeping' | 'Maintenance' | 'Kitchen' | 'Runner' | 'FrontDesk';
  task_type: string;
  title: string;
  room_number: string;
  assigned_to: string;
  staff_role: string;
  priority: 'Normal' | 'High' | 'Emergency';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Escalated';
  standard_sla_minutes: number;
  started_at: string;
  completed_at?: string | null;
  notes?: string;
  escalated: boolean;
  escalated_at?: string | null;
  escalated_by?: string | null;
  elapsed_minutes: number;
  remaining_minutes: number;
  sla_progress_percent: number;
  sla_status: 'ON_TIME' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';
}

export interface LiveTaskSummary {
  total: number;
  active: number;
  on_time: number;
  due_soon: number;
  overdue: number;
  completed: number;
  department_breakdown: Record<string, { total: number; active: number; overdue: number }>;
}


interface Stats {
  total_rooms: number;
  occupied_rooms: number;
  clean_rooms: number;
  dirty_rooms: number;
  occupancy_rate: number;
  occupancy_percentage?: number;
  rev_par: number;
  revpar?: number;
  adr: number;
  currency: string;
  room_revenue: number;
  room_revenue_inr?: number;
  dining_revenue: number;
  dining_revenue_inr?: number;
  total_revenue: number;
  total_revenue_inr?: number;
  open_tickets_count: number;
  active_orders_count: number;
  sentiment_score: number;
  sentiment_summary: string;
  pricing_recommendation: string;
  recent_tickets?: Array<{
    id: number;
    room_number?: string;
    category?: string;
    description: string;
    priority?: string;
    status: string;
    created_at?: string;
  }>;
  recent_orders?: Array<{
    id: number;
    booking_id: number;
    items: any[];
    total_price: number;
    status: string;
    created_at?: string;
  }>;
  low_stock_count?: number;
  inventory_items?: Array<{
    id: number;
    item_name: string;
    unit: string;
    current_stock: number;
    min_alert_threshold: number;
    is_low: boolean;
  }>;
}

interface Briefing {
  date: string;
  occupancy_rate: number;
  rev_par: number;
  adr: number;
  total_revenue: number;
  room_revenue: number;
  dining_revenue: number;
  open_tickets_count: number;
  active_orders_count: number;
  briefing_text: string;
  briefing_summary?: string;
  sentiment_score: number;
  sentiment_summary: string;
  pricing_recommendation: string;
}

export default function ManagerDashboard() {
  const router = useRouter();
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingBriefing, setLoadingBriefing] = useState(true);
  const [refreshingBriefing, setRefreshingBriefing] = useState(false);
  const [error, setError] = useState('');

  // Executive Revenue Simulator State
  const [simOccupancy, setSimOccupancy] = useState(75);
  const [simRate, setSimRate] = useState(4800);

  // Live Operations & Multi-Department Time SLA State
  const [liveTasks, setLiveTasks] = useState<LiveTaskItem[]>([]);
  const [liveTaskSummary, setLiveTaskSummary] = useState<LiveTaskSummary | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskDeptFilter, setTaskDeptFilter] = useState<string>('All');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('Active');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(Date.now());
  const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null);

  // Dispatch New Live Task Modal State
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [newTaskDept, setNewTaskDept] = useState<'Housekeeping' | 'Maintenance' | 'Kitchen' | 'Runner' | 'FrontDesk'>('Housekeeping');
  const [newTaskType, setNewTaskType] = useState('Room Turnover');
  const [newTaskRoom, setNewTaskRoom] = useState('101');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskStaff, setNewTaskStaff] = useState('Sunita Rawat');
  const [newTaskSla, setNewTaskSla] = useState(25);
  const [newTaskPriority, setNewTaskPriority] = useState<'Normal' | 'High' | 'Emergency'>('Normal');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [dispatchLoading, setDispatchLoading] = useState(false);

  const handleDepartmentChange = (dept: 'Housekeeping' | 'Maintenance' | 'Kitchen' | 'Runner' | 'FrontDesk') => {
    setNewTaskDept(dept);
    if (dept === 'Housekeeping') {
      setNewTaskType('Turnover Cleaning');
      setNewTaskStaff('Sunita Rawat');
      setNewTaskSla(25);
    } else if (dept === 'Maintenance') {
      setNewTaskType('HVAC / Plumbing Repair');
      setNewTaskStaff('Ramesh Kumar (Chief Tech)');
      setNewTaskSla(30);
    } else if (dept === 'Kitchen') {
      setNewTaskType('Hot Kitchen Prep');
      setNewTaskStaff('Executive Chef Ranveer Brar');
      setNewTaskSla(20);
    } else if (dept === 'Runner') {
      setNewTaskType('F&B Suite Delivery');
      setNewTaskStaff('Runner Vikram Rathore');
      setNewTaskSla(10);
    } else if (dept === 'FrontDesk') {
      setNewTaskType('Luggage & Concierge Escort');
      setNewTaskStaff('Aarav Sharma');
      setNewTaskSla(15);
    }
  };

  const loadLiveTasks = async () => {
    try {
      const data = await apiRequest('/api/v1/executive/live-tasks');
      if (data && data.tasks) {
        setLiveTasks(data.tasks);
        setLiveTaskSummary(data.summary);
      }
    } catch (err: any) {
      console.error('Failed to load live operations tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleEscalateTask = async (taskId: string) => {
    setTaskActionLoading(taskId);
    try {
      await apiRequest(`/api/v1/executive/live-tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'escalate' })
      });
      await loadLiveTasks();
      loadStats();
    } catch (err: any) {
      alert(`Escalation error: ${err.message}`);
    } finally {
      setTaskActionLoading(null);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setTaskActionLoading(taskId);
    try {
      await apiRequest(`/api/v1/executive/live-tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ action: 'complete' })
      });
      await loadLiveTasks();
      loadStats();
    } catch (err: any) {
      alert(`Task completion error: ${err.message}`);
    } finally {
      setTaskActionLoading(null);
    }
  };

  const handleDispatchTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      alert('Please enter a task title or description.');
      return;
    }
    setDispatchLoading(true);
    try {
      await apiRequest('/api/v1/executive/live-tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: newTaskTitle,
          department: newTaskDept,
          task_type: newTaskType,
          room_number: newTaskRoom,
          assigned_to: newTaskStaff,
          standard_sla_minutes: newTaskSla,
          priority: newTaskPriority,
          notes: newTaskNotes
        })
      });
      setDispatchModalOpen(false);
      setNewTaskTitle('');
      setNewTaskNotes('');
      await loadLiveTasks();
      loadStats();
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    } finally {
      setDispatchLoading(false);
    }
  };

  // Night Audit Modal & CSV Export States
  const [nightAuditModalOpen, setNightAuditModalOpen] = useState(false);
  const [nightAuditData, setNightAuditData] = useState<any>(null);
  const [nightAuditLoading, setNightAuditLoading] = useState(false);

  const handleExportCsv = async () => {
    try {
      const token = getAuthToken();
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE}/api/v1/executive/export-ledger-excel?token=${encodeURIComponent(token || '')}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI-HOS_Executive_Financial_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Excel Export Error: ${err.message || 'Failed to download Excel Workbook'}`);
    }
  };

  const handleExecuteNightAudit = async () => {
    setNightAuditLoading(true);
    try {
      const data = await apiRequest('/api/v1/executive/night-audit', { method: 'POST' });
      setNightAuditData(data);
      setNightAuditModalOpen(true);
      loadStats();
    } catch (err: any) {
      alert(`Night Audit Execution Error: ${err.message || 'Audit failed'}`);
    } finally {
      setNightAuditLoading(false);
    }
  };

  // 1. Auth Guard
  useEffect(() => {
    const token = getAuthToken();
    const role = localStorage.getItem('aihos_role');
    if (!token || (role !== 'Executive' && role !== 'Admin')) {
      router.push('/login');
    }
  }, [router]);

  // 2. Fetch Stats & AI Briefing
  const loadStats = async () => {
    try {
      const data = await apiRequest('/api/v1/executive/stats');
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load manager statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const loadBriefing = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshingBriefing(true);
    try {
      const data = await apiRequest('/api/v1/executive/briefing');
      setBriefing(data);
    } catch (err: any) {
      console.error('Failed to load daily briefing', err);
    } finally {
      setLoadingBriefing(false);
      setRefreshingBriefing(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadBriefing();
    loadLiveTasks();
    const statsInterval = setInterval(loadStats, 8000);
    const tasksInterval = setInterval(loadLiveTasks, 6000);
    const clockInterval = setInterval(() => setCurrentTimeSec(Date.now()), 2000);
    return () => {
      clearInterval(statsInterval);
      clearInterval(tasksInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const renderBriefingText = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-xl font-extrabold text-amber-400 mt-4 mb-2">{line.substring(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-lg font-bold text-neutral-100 mt-4 mb-2 border-b border-neutral-800 pb-1">{line.substring(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-sm font-bold text-amber-300 mt-3 mb-1">{line.substring(4)}</h3>;
      }
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const cleaned = line.replace(/^[\s*-]+/, '').trim();
        const parts = cleaned.split('**');
        return (
          <li key={index} className="ml-4 list-disc text-neutral-300 text-xs mb-1 leading-relaxed">
            {parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-amber-400 font-semibold">{part}</strong> : part)}
          </li>
        );
      }
      if (line.trim()) {
        const parts = line.split('**');
        return (
          <p key={index} className="text-neutral-300 text-xs mb-2 leading-relaxed">
            {parts.map((part, idx) => idx % 2 === 1 ? <strong key={idx} className="text-white font-semibold">{part}</strong> : part)}
          </p>
        );
      }
      return <div key={index} className="h-1"></div>;
    });
  };

  if (loadingStats || loadingBriefing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-neutral-400 text-sm font-semibold">Synthesizing Executive Intelligence Suite...</p>
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
        <header className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center gap-3 shadow-lg shrink-0 w-full overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            <div className="h-8 w-8 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black shadow shrink-0">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-neutral-100 truncate leading-none">
                GM Executive AI Operations
              </h1>
              <p className="text-[11px] text-neutral-400 mt-0.5 truncate">Yield Management, RevPAR Metrics & AI Directives</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={nightAuditLoading}
              onClick={handleExecuteNightAudit}
              className="px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 disabled:opacity-50 text-indigo-300 border border-indigo-700/60 font-bold text-[11px] rounded-xl transition flex items-center gap-1.5 shadow whitespace-nowrap shrink-0"
              title="Execute 00:00 Daily Financial Ledger Close"
            >
              <span>🌙</span>
              <span>{nightAuditLoading ? 'Auditing...' : 'Night Audit'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[11px] rounded-xl transition flex items-center gap-1.5 shadow whitespace-nowrap shrink-0"
              title="Export CFO-Grade Daily Financial Ledger for Tally Prime & Zoho Books (.xlsx)"
            >
              <span>📊</span>
              <span className="hidden sm:inline">Excel Export</span>
            </button>

            <button
              onClick={loadStats}
              className="p-1.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 rounded-xl border border-neutral-700 transition shrink-0"
              title="Refresh KPIs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {error && (
          <div className="mx-4 mt-2 p-3 rounded-xl bg-red-950/40 border border-red-700/60 text-red-200 text-xs shrink-0">
            {error}
          </div>
        )}

        {/* Main Command Grid */}
        <main className="flex-1 p-4 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-y-auto">
          
          {/* Left 2 Columns: KPI Metrics & AI Radars */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Top 4 Key Metric Cards in ₹ INR */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                
                {/* 1. Occupancy Rate */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider">Occupancy Rate</span>
                    <h3 className="text-2xl font-extrabold text-neutral-100 mt-1">{(stats?.occupancy_rate ?? stats?.occupancy_percentage ?? 0)}%</h3>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                    <span>{(stats?.occupied_rooms ?? 47)}/{(stats?.total_rooms ?? 50)} Rooms</span>
                    <div className="h-2 w-12 rounded-full bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${(stats?.occupancy_rate ?? stats?.occupancy_percentage ?? 0)}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* 2. RevPAR (₹ INR) */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider">RevPAR</span>
                    <h3 className="text-2xl font-extrabold text-amber-400 mt-1">₹{(stats?.rev_par ?? stats?.revpar ?? 0).toLocaleString('en-IN')}</h3>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-3">Revenue / Avail. Room</span>
                </div>

                {/* 3. ADR (₹ INR) */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider">ADR (Avg Daily Rate)</span>
                    <h3 className="text-2xl font-extrabold text-blue-400 mt-1">₹{(stats?.adr ?? 0).toLocaleString('en-IN')}</h3>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-3">Avg Rate / Occupied Room</span>
                </div>

                {/* 4. Total Daily Turnover (₹ INR) */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider">Daily Projected Turnover</span>
                    <h3 className="text-2xl font-extrabold text-green-400 mt-1">₹{(stats?.total_revenue ?? stats?.total_revenue_inr ?? 0).toLocaleString('en-IN')}</h3>
                  </div>
                  <span className="text-[10px] text-green-500 font-semibold mt-3 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Rooms + In-Room Dining
                  </span>
                </div>

              </div>
            )}

            {/* Revenue Breakdown & Department Velocity */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Revenue Channels */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-extrabold uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-amber-500" />
                      Revenue Channels Breakdown
                    </h3>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-neutral-300">Room Accommodation</span>
                        <span className="text-neutral-100">₹{(stats?.room_revenue ?? stats?.room_revenue_inr ?? 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${(stats?.total_revenue ?? 1) > 0 ? ((stats?.room_revenue ?? stats?.room_revenue_inr ?? 0) / (stats?.total_revenue ?? 1)) * 100 : 80}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-neutral-300">Food & Beverage (In-Room KDS)</span>
                        <span className="text-amber-400">₹{(stats?.dining_revenue ?? stats?.dining_revenue_inr ?? 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${(stats?.total_revenue ?? 1) > 0 ? ((stats?.dining_revenue ?? stats?.dining_revenue_inr ?? 0) / (stats?.total_revenue ?? 1)) * 100 : 20}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Velocity */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-3">
                  <h3 className="text-xs font-extrabold uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-amber-500" />
                    Live Operational Velocity
                  </h3>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 font-bold uppercase block">Kitchen KDS Queue</span>
                      <span className="text-xl font-extrabold text-amber-400 mt-0.5 block">{stats.active_orders_count} Orders</span>
                      <span className="text-[10px] text-neutral-400">Avg Prep: 16 mins</span>
                    </div>

                    <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                      <span className="text-[10px] text-neutral-500 font-bold uppercase block">Open Staff Tickets</span>
                      <span className={`text-xl font-extrabold mt-0.5 block ${stats.open_tickets_count > 3 ? 'text-red-400' : 'text-green-400'}`}>
                        {stats.open_tickets_count} Tasks
                      </span>
                      <span className="text-[10px] text-neutral-400">Avg Turnover: 22 mins</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* AI Sentiment Radar & Dynamic Pricing Box */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Sentiment Radar */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-2.5">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-extrabold uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                      <HeartHandshake className="h-4 w-4 text-green-400" />
                      AI Guest Sentiment Radar
                    </h3>
                    <span className="text-xs font-extrabold px-2 py-0.5 bg-green-950 text-green-400 border border-green-700/40 rounded-full">
                      {stats.sentiment_score}% Positive
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                    {stats.sentiment_summary}
                  </p>
                </div>

                {/* Dynamic Pricing AI */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-2.5">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-extrabold uppercase text-neutral-400 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-amber-400" />
                      AI Dynamic Yield Optimization
                    </h3>
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed bg-amber-950/30 p-3 rounded-xl border border-amber-500/30">
                    {stats.pricing_recommendation}
                  </p>
                </div>

                {/* Executive AI Revenue & Occupancy Scenario Simulator */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
                  <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                    <h3 className="text-xs font-extrabold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                      <span>🔮 Executive Revenue & RevPAR Simulator</span>
                    </h3>
                    <span className="text-[10px] bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800 text-neutral-400">
                      50 Suite Hotel
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-neutral-300">
                        <span>Target Occupancy:</span>
                        <span className="text-amber-400 font-extrabold">{simOccupancy}%</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={simOccupancy}
                        onChange={(e) => setSimOccupancy(Number(e.target.value))}
                        className="w-full accent-amber-500 bg-neutral-950 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold text-neutral-300">
                        <span>Target ADR Rate:</span>
                        <span className="text-amber-400 font-extrabold">₹{simRate.toLocaleString('en-IN')}/night</span>
                      </div>
                      <input
                        type="range"
                        min="3000"
                        max="12000"
                        step="200"
                        value={simRate}
                        onChange={(e) => setSimRate(Number(e.target.value))}
                        className="w-full accent-amber-500 bg-neutral-950 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
                      <span className="text-[9px] uppercase tracking-wider text-neutral-400 block">Projected Monthly Revenue</span>
                      <span className="text-sm font-extrabold text-green-400">
                        ₹{Math.round((50 * (simOccupancy / 100)) * simRate * 30).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
                      <span className="text-[9px] uppercase tracking-wider text-neutral-400 block">Simulated RevPAR</span>
                      <span className="text-sm font-extrabold text-amber-400">
                        ₹{Math.round((simOccupancy / 100) * simRate).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* General Manager Live Ongoing Operations & Time SLA Command Console */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
              {/* Header & Live Clock Bar */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-neutral-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] rounded-lg tracking-wider uppercase">
                      Live Operations Control
                    </span>
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-neutral-950 border border-neutral-800 rounded-lg">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        {new Date(currentTimeSec).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className="text-[9px] text-neutral-500 hidden sm:inline">• 6s Auto-Sync</span>
                    </div>
                  </div>
                  <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                    <span>⏱️ Multi-Department Live Tasks & SLA Inspector</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Real-time monitoring of Housekeeping turnovers, Maintenance repairs, Kitchen KDS orders, and Runner deliveries.
                  </p>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 self-stretch sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      loadLiveTasks();
                      loadStats();
                    }}
                    className="p-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
                    title="Refresh Operations"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingTasks ? 'animate-spin text-amber-400' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDispatchModalOpen(true)}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl transition shadow flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Dispatch Task</span>
                  </button>
                </div>
              </div>

              {/* KPI Health Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    Active Tasks
                  </span>
                  <div className="text-xl font-extrabold text-white">
                    {liveTasks.filter(t => t.status !== 'Completed').length}
                  </div>
                  <span className="text-[9px] text-neutral-500 block">Across 5 departments</span>
                </div>

                <div className="p-3 bg-neutral-950 rounded-2xl border border-emerald-900/50 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    On Schedule
                  </span>
                  <div className="text-xl font-extrabold text-emerald-400">
                    {liveTasks.filter(t => {
                      if (t.status === 'Completed') return false;
                      const elapsed = Math.max(0, Math.floor((currentTimeSec - new Date(t.started_at).getTime()) / 60000));
                      const rem = t.standard_sla_minutes - elapsed;
                      const pct = Math.round((elapsed / Math.max(1, t.standard_sla_minutes)) * 100);
                      return elapsed <= t.standard_sla_minutes && rem > 5 && pct < 75;
                    }).length}
                  </div>
                  <span className="text-[9px] text-neutral-500 block">Healthy SLA pace</span>
                </div>

                <div className="p-3 bg-neutral-950 rounded-2xl border border-amber-900/50 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Timer className="w-3 h-3 text-amber-400" />
                    Due Soon
                  </span>
                  <div className="text-xl font-extrabold text-amber-400">
                    {liveTasks.filter(t => {
                      if (t.status === 'Completed') return false;
                      const elapsed = Math.max(0, Math.floor((currentTimeSec - new Date(t.started_at).getTime()) / 60000));
                      const rem = t.standard_sla_minutes - elapsed;
                      const pct = Math.round((elapsed / Math.max(1, t.standard_sla_minutes)) * 100);
                      return elapsed <= t.standard_sla_minutes && (rem <= 5 || pct >= 75);
                    }).length}
                  </div>
                  <span className="text-[9px] text-amber-500/80 block">&lt;5m or &gt;75% SLA</span>
                </div>

                <div className={`p-3 bg-neutral-950 rounded-2xl border space-y-1 ${
                  liveTasks.filter(t => {
                    if (t.status === 'Completed') return false;
                    const elapsed = Math.max(0, Math.floor((currentTimeSec - new Date(t.started_at).getTime()) / 60000));
                    return elapsed > t.standard_sla_minutes;
                  }).length > 0
                    ? 'border-red-700/80 ring-1 ring-red-500/40'
                    : 'border-neutral-800'
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1">
                    <AlertOctagon className="w-3 h-3 text-red-400" />
                    SLA Breached
                  </span>
                  <div className={`text-xl font-extrabold ${
                    liveTasks.filter(t => {
                      if (t.status === 'Completed') return false;
                      const elapsed = Math.max(0, Math.floor((currentTimeSec - new Date(t.started_at).getTime()) / 60000));
                      return elapsed > t.standard_sla_minutes;
                    }).length > 0 ? 'text-red-400 animate-pulse' : 'text-neutral-400'
                  }`}>
                    {liveTasks.filter(t => {
                      if (t.status === 'Completed') return false;
                      const elapsed = Math.max(0, Math.floor((currentTimeSec - new Date(t.started_at).getTime()) / 60000));
                      return elapsed > t.standard_sla_minutes;
                    }).length}
                  </div>
                  <span className="text-[9px] text-red-400/80 block">Requires GM attention</span>
                </div>

                <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-400" />
                    Resolved
                  </span>
                  <div className="text-xl font-extrabold text-neutral-300">
                    {liveTasks.filter(t => t.status === 'Completed').length}
                  </div>
                  <span className="text-[9px] text-neutral-500 block">Completed tasks</span>
                </div>
              </div>

              {/* Interactive Department & Status Filters */}
              <div className="space-y-3 pt-1">
                {/* Department Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
                  {[
                    { id: 'All', label: 'All Depts', icon: '🏨' },
                    { id: 'Housekeeping', label: 'Housekeeping', icon: '🧹' },
                    { id: 'Maintenance', label: 'Maintenance', icon: '🔧' },
                    { id: 'Kitchen', label: 'Kitchen KDS', icon: '🍳' },
                    { id: 'Runner', label: 'Runners', icon: '🏃' },
                    { id: 'FrontDesk', label: 'Front Desk', icon: '🛎️' },
                  ].map(tab => {
                    const count = tab.id === 'All' 
                      ? liveTasks.length 
                      : liveTasks.filter(t => t.department === tab.id).length;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTaskDeptFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition flex items-center gap-1.5 ${
                          taskDeptFilter === tab.id
                            ? 'bg-amber-500 text-neutral-950 border-amber-400 font-extrabold shadow'
                            : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
                        }`}
                      >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                        <span className={`px-1.5 py-0.2 text-[10px] rounded-md ${
                          taskDeptFilter === tab.id ? 'bg-neutral-950/20 text-neutral-900' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sub-toolbar: Status filter + Search */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
                  <div className="flex items-center gap-1 text-xs">
                    {[
                      { id: 'Active', label: 'Active Ongoing' },
                      { id: 'Overdue', label: '🚨 Overdue Only' },
                      { id: 'Completed', label: '✓ Completed' },
                      { id: 'All', label: 'Show All' },
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setTaskStatusFilter(st.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                          taskStatusFilter === st.id
                            ? 'bg-neutral-200 text-neutral-950'
                            : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      placeholder="Search suite, staff, or task..."
                      value={taskSearchQuery}
                      onChange={(e) => setTaskSearchQuery(e.target.value)}
                      className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Tasks Grid */}
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {liveTasks
                  .filter(task => {
                    if (taskDeptFilter !== 'All' && task.department !== taskDeptFilter) return false;
                    if (taskStatusFilter === 'Active' && task.status === 'Completed') return false;
                    if (taskStatusFilter === 'Completed' && task.status !== 'Completed') return false;
                    if (taskStatusFilter === 'Overdue') {
                      if (task.status === 'Completed') return false;
                      const elapsed = Math.max(0, Math.floor((currentTimeSec - new Date(task.started_at).getTime()) / 60000));
                      if (elapsed <= task.standard_sla_minutes) return false;
                    }
                    if (taskSearchQuery.trim()) {
                      const q = taskSearchQuery.toLowerCase();
                      const matchRoom = (task.room_number || '').toLowerCase().includes(q);
                      const matchTitle = (task.title || '').toLowerCase().includes(q);
                      const matchStaff = (task.assigned_to || '').toLowerCase().includes(q);
                      const matchType = (task.task_type || '').toLowerCase().includes(q);
                      if (!matchRoom && !matchTitle && !matchStaff && !matchType) return false;
                    }
                    return true;
                  })
                  .map((task) => {
                    // Compute live elapsed time using currentTimeSec ticker
                    const isCompleted = task.status === 'Completed';
                    const elapsed = isCompleted && task.completed_at
                      ? Math.max(0, Math.floor((new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 60000))
                      : Math.max(0, Math.floor((currentTimeSec - new Date(task.started_at).getTime()) / 60000));
                    
                    const slaTarget = task.standard_sla_minutes || 20;
                    const remaining = slaTarget - elapsed;
                    const progress = Math.min(100, Math.round((elapsed / Math.max(1, slaTarget)) * 100));

                    const isBreached = !isCompleted && elapsed > slaTarget;
                    const isDueSoon = !isCompleted && !isBreached && (remaining <= 5 || progress >= 75);

                    // Department visual badge theme
                    const deptTheme = {
                      Housekeeping: 'bg-indigo-950/70 border-indigo-700/60 text-indigo-300',
                      Maintenance: 'bg-orange-950/70 border-orange-700/60 text-orange-300',
                      Kitchen: 'bg-amber-950/70 border-amber-700/60 text-amber-300',
                      Runner: 'bg-purple-950/70 border-purple-700/60 text-purple-300',
                      FrontDesk: 'bg-cyan-950/70 border-cyan-700/60 text-cyan-300',
                    }[task.department] || 'bg-neutral-900 border-neutral-800 text-neutral-300';

                    return (
                      <div
                        key={task.id}
                        className={`p-4 bg-neutral-950 rounded-2xl border transition shadow-lg space-y-3 ${
                          isBreached
                            ? 'border-red-700/80 ring-1 ring-red-500/40 bg-red-950/10'
                            : isDueSoon
                              ? 'border-amber-700/60 bg-amber-950/10'
                              : 'border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        {/* Top Meta Line: Suite + Dept + SLA Pill + Priority */}
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-extrabold text-xs rounded-lg">
                              Suite {task.room_number || 'General'}
                            </span>

                            <span className={`px-2 py-0.5 border text-[10px] font-extrabold rounded-lg ${deptTheme}`}>
                              {task.department} • {task.task_type}
                            </span>

                            {task.priority === 'High' && (
                              <span className="px-2 py-0.5 bg-red-950/60 border border-red-800 text-red-300 font-extrabold text-[10px] rounded-lg">
                                ⚡ High Priority
                              </span>
                            )}

                            {task.priority === 'Emergency' && (
                              <span className="px-2 py-0.5 bg-red-600 text-white font-extrabold text-[10px] rounded-lg animate-pulse">
                                🚨 Emergency
                              </span>
                            )}

                            {task.escalated && (
                              <span className="px-2 py-0.5 bg-orange-950 border border-orange-700 text-orange-300 font-extrabold text-[9px] rounded-lg">
                                📢 GM Escalated
                              </span>
                            )}
                          </div>

                          {/* SLA Health Indicator */}
                          <div>
                            {isCompleted ? (
                              <span className="px-2.5 py-1 bg-green-950/80 border border-green-800 text-green-300 text-[10px] font-bold rounded-xl flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                <span>Completed ({elapsed}m total)</span>
                              </span>
                            ) : isBreached ? (
                              <span className="px-2.5 py-1 bg-red-950 border border-red-700 text-red-300 text-[10px] font-extrabold rounded-xl flex items-center gap-1 animate-pulse shadow-md shadow-red-950/50">
                                <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                                <span>🚨 OVERDUE (+{elapsed - slaTarget}m past SLA)</span>
                              </span>
                            ) : isDueSoon ? (
                              <span className="px-2.5 py-1 bg-amber-950/80 border border-amber-700 text-amber-300 text-[10px] font-extrabold rounded-xl flex items-center gap-1">
                                <Timer className="w-3.5 h-3.5 text-amber-400" />
                                <span>⚠️ DUE SOON ({remaining}m left)</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-bold rounded-xl flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                <span>⏱️ {remaining}m left of {slaTarget}m SLA</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="text-sm font-extrabold text-white">{task.title}</h4>
                          {task.notes && (
                            <p className="text-xs text-neutral-300 mt-0.5 leading-relaxed">
                              {task.notes}
                            </p>
                          )}
                        </div>

                        {/* Live SLA Progress Bar */}
                        <div className="space-y-1 bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-neutral-400 flex items-center gap-1">
                              <Timer className="w-3 h-3 text-neutral-500" />
                              Time Budget: <strong className="text-neutral-200">{slaTarget}m SLA</strong>
                            </span>
                            <span className={
                              isBreached 
                                ? 'text-red-400 font-extrabold' 
                                : isDueSoon 
                                  ? 'text-amber-400 font-extrabold' 
                                  : 'text-neutral-300'
                            }>
                              {elapsed} mins elapsed {isBreached ? `(${elapsed - slaTarget}m overdue!)` : `(${progress}% used)`}
                            </span>
                          </div>

                          {/* Progress fill */}
                          <div className="w-full bg-neutral-950 rounded-full h-2 overflow-hidden border border-neutral-800">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCompleted
                                  ? 'bg-green-500'
                                  : isBreached
                                    ? 'bg-red-500 animate-pulse'
                                    : isDueSoon
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                            />
                          </div>
                        </div>

                        {/* Footer: Assigned Staff & GM Actions */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-1 border-t border-neutral-800/80 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-amber-400">
                              {task.assigned_to ? task.assigned_to[0] : 'S'}
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-neutral-200 block">
                                {task.assigned_to}
                              </span>
                              <span className="text-[9px] text-neutral-500 block">
                                {task.staff_role || 'Duty Staff'} • Dispatched: {task.started_at ? new Date(task.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                              </span>
                            </div>
                          </div>

                          {/* GM Controls */}
                          {!isCompleted ? (
                            <div className="flex items-center gap-2 self-end sm:self-center">
                              {!task.escalated && (
                                <button
                                  type="button"
                                  disabled={taskActionLoading === task.id}
                                  onClick={() => handleEscalateTask(task.id)}
                                  className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-700/60 hover:border-red-500 font-extrabold text-[10px] rounded-xl transition flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Zap className="w-3 h-3 text-red-400" />
                                  <span>⚡ Escalate Priority</span>
                                </button>
                              )}

                              <button
                                type="button"
                                disabled={taskActionLoading === task.id}
                                onClick={() => handleCompleteTask(task.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-xl transition shadow flex items-center gap-1 disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                                <span>✓ Mark Completed</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-400 font-bold bg-neutral-900 px-2.5 py-1 rounded-lg border border-neutral-800">
                              Resolved at {task.completed_at ? new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {liveTasks.length === 0 && (
                  <div className="py-12 text-center text-neutral-500 text-xs bg-neutral-950 rounded-2xl border border-neutral-800">
                    No active tasks found in the selected filter.
                  </div>
                )}
              </div>
            </div>


            {/* Real-Time Hotel & F&B Stock Inventory Monitor for GM */}
            {stats && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-amber-500 tracking-wider">
                      Inventory Control
                    </span>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mt-0.5">
                      <span>📦 Real-Time Raw Ingredient & Linen Stock Monitor</span>
                    </h3>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-extrabold rounded-xl border ${
                    (stats.low_stock_count || 0) > 0
                      ? 'bg-red-950 text-red-400 border-red-800 animate-pulse'
                      : 'bg-green-950 text-green-400 border-green-800'
                  }`}>
                    {stats.low_stock_count || 0} Low Stock Alerts
                  </span>
                </div>

                {/* Inventory Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.inventory_items?.map((item: any) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border flex justify-between items-center transition ${
                        item.is_low
                          ? 'bg-red-950/30 border-red-800/80 ring-1 ring-red-500/40'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-bold text-neutral-100 block">{item.item_name}</span>
                        <span className="text-[10px] text-neutral-400">Safety Limit: {item.min_alert_threshold} {item.unit}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-extrabold font-mono block ${item.is_low ? 'text-red-400' : 'text-amber-400'}`}>
                          {item.current_stock} {item.unit}
                        </span>
                        {item.is_low && (
                          <span className="text-[9px] font-extrabold text-red-400 uppercase tracking-wider block">Low Stock</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live CCTV Security Surveillance Wall */}
            <CCTVMonitor />

          </div>

          {/* Right Column: AI GM 07:30 AM Stand-Up Briefing */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-amber-500" />
                Daily Morning Hotel Summary Report
              </h2>

              <button
                onClick={() => loadBriefing(true)}
                disabled={refreshingBriefing}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-extrabold text-xs rounded-xl transition shadow flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${refreshingBriefing ? 'animate-spin' : ''}`} />
                {refreshingBriefing ? 'Generating...' : 'Regenerate'}
              </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl min-h-[520px] overflow-y-auto">
              {briefing ? (
                <div className="prose prose-invert max-w-none">
                  {renderBriefingText(briefing.briefing_text || briefing.briefing_summary || '')}
                </div>
              ) : (
                <div className="py-24 text-center text-neutral-500">
                  <ShieldAlert className="h-10 w-10 text-neutral-700 mx-auto mb-2" />
                  <p className="text-xs">No briefing synthesized yet.</p>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>

      {/* 00:00 Night Audit Financial Close Summary Modal */}
      {nightAuditModalOpen && nightAuditData && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-neutral-900 border border-indigo-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider">
                  00:00 Daily Financial Ledger Close
                </span>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>🌙 Night Audit Complete</span>
                </h3>
              </div>
              <button 
                onClick={() => setNightAuditModalOpen(false)}
                className="text-neutral-500 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-3 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Audit Date:</span>
                <span className="font-bold text-neutral-200">{nightAuditData.night_audit_date}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Timestamp:</span>
                <span className="font-mono text-neutral-400">{nightAuditData.audit_timestamp}</span>
              </div>

              <div className="pt-2 border-t border-neutral-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Room Revenue:</span>
                  <span className="font-bold text-neutral-200">₹{nightAuditData.financial_summary.room_revenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Dining & F&B Revenue:</span>
                  <span className="font-bold text-neutral-200">₹{nightAuditData.financial_summary.dining_revenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-neutral-800 font-bold">
                  <span className="text-neutral-300">Subtotal:</span>
                  <span className="text-neutral-100">₹{nightAuditData.financial_summary.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-neutral-400 text-[11px]">
                  <span>CGST (6%) + SGST (6%):</span>
                  <span>₹{nightAuditData.financial_summary.total_gst_12pct.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral-800 text-sm font-extrabold">
                  <span className="text-amber-400">Grand Total Settled:</span>
                  <span className="text-amber-400">₹{nightAuditData.financial_summary.grand_total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="bg-green-950/30 border border-green-800/40 p-2.5 rounded-xl text-[11px] text-green-400 font-bold text-center mt-2">
                🔒 {nightAuditData.ledger_status}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow flex items-center justify-center gap-1"
              >
                <span>📊</span>
                <span>Download Tally/Zoho CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setNightAuditModalOpen(false)}
                className="py-2.5 px-4 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs rounded-xl"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Dispatch New Live Task & SLA Modal */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-amber-500 tracking-wider">
                  Hotel Operations Dispatch
                </span>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2 mt-0.5">
                  <span>➕ Dispatch Task & Assign Time SLA</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDispatchModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchTask} className="space-y-4">
              {/* Department Selection */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                  Department
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-[11px] font-bold">
                  {[
                    { id: 'Housekeeping', label: 'Housekeeping', icon: '🧹' },
                    { id: 'Maintenance', label: 'Maintenance', icon: '🔧' },
                    { id: 'Kitchen', label: 'Kitchen', icon: '🍳' },
                    { id: 'Runner', label: 'Runner', icon: '🏃' },
                    { id: 'FrontDesk', label: 'Front Desk', icon: '🛎️' },
                  ].map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleDepartmentChange(d.id as any)}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        newTaskDept === d.id
                          ? 'bg-amber-500 text-neutral-950 border-amber-400 font-extrabold shadow'
                          : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      <span className="text-base">{d.icon}</span>
                      <span className="text-[10px] truncate">{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Room & Staff */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Room / Suite Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newTaskRoom}
                    onChange={(e) => setNewTaskRoom(e.target.value)}
                    placeholder="e.g. 102, 204, Lobby"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {['101', '102', '105', '201', '204', '305', 'Lobby'].map(rm => (
                      <button
                        key={rm}
                        type="button"
                        onClick={() => setNewTaskRoom(rm)}
                        className={`px-2 py-0.5 text-[10px] rounded-md border ${
                          newTaskRoom === rm ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                        }`}
                      >
                        {rm}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Assigned Staff Member
                  </label>
                  <input
                    type="text"
                    required
                    value={newTaskStaff}
                    onChange={(e) => setNewTaskStaff(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {newTaskDept === 'Runner' && (
                      ['Runner Vikram Rathore', 'Runner Amit Verma', 'Runner Priya Sundaram'].map(st => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setNewTaskStaff(st)}
                          className={`px-1.5 py-0.5 text-[9px] rounded-md border truncate max-w-[120px] ${
                            newTaskStaff === st ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold' : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                          }`}
                        >
                          {st.split(' ')[1]}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Task Title */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Task Title / Service Requirement
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Inspect bathroom shower pressure & replace seal"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Target SLA Time Window & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Target Time SLA (Minutes)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="5"
                      max="180"
                      required
                      value={newTaskSla}
                      onChange={(e) => setNewTaskSla(Number(e.target.value))}
                      className="w-24 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {[10, 15, 20, 25, 30, 45].map(mins => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => setNewTaskSla(mins)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg border ${
                            newTaskSla === mins
                              ? 'bg-amber-500 text-neutral-950 border-amber-400 font-extrabold'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                          }`}
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1">
                    Priority Level
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['Normal', 'High', 'Emergency'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewTaskPriority(p)}
                        className={`py-2 text-[11px] font-bold rounded-xl border text-center transition ${
                          newTaskPriority === p
                            ? p === 'Emergency'
                              ? 'bg-red-600 text-white border-red-500'
                              : p === 'High'
                                ? 'bg-amber-500 text-neutral-950 border-amber-400 font-extrabold'
                                : 'bg-neutral-200 text-neutral-950 border-neutral-100 font-bold'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Special Instructions / Notes */}
              <div>
                <label className="text-xs font-bold text-neutral-300 block mb-1">
                  Instructions / Dispatch Notes
                </label>
                <textarea
                  rows={2}
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder="e.g. VIP guest requesting prompt turn-around before 11:30 AM."
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="submit"
                  disabled={dispatchLoading}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{dispatchLoading ? 'Dispatching...' : `Dispatch Task (${newTaskSla}m SLA)`}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

