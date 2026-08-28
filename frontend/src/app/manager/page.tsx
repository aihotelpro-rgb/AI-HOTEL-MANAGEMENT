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
  ShieldAlert 
} from 'lucide-react';

interface Stats {
  total_rooms: number;
  occupied_rooms: number;
  clean_rooms: number;
  dirty_rooms: number;
  occupancy_rate: number;
  rev_par: number;
  adr: number;
  currency: string;
  room_revenue: number;
  dining_revenue: number;
  total_revenue: number;
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
    const interval = setInterval(loadStats, 8000);
    return () => clearInterval(interval);
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
                    <h3 className="text-2xl font-extrabold text-neutral-100 mt-1">{stats.occupancy_rate}%</h3>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                    <span>{stats.occupied_rooms}/{stats.total_rooms} Rooms</span>
                    <div className="h-2 w-12 rounded-full bg-neutral-800 overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: `${stats.occupancy_rate}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* 2. RevPAR (₹ INR) */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider">RevPAR</span>
                    <h3 className="text-2xl font-extrabold text-amber-400 mt-1">₹{stats.rev_par.toLocaleString('en-IN')}</h3>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-3">Revenue / Avail. Room</span>
                </div>

                {/* 3. ADR (₹ INR) */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider">ADR (Avg Daily Rate)</span>
                    <h3 className="text-2xl font-extrabold text-blue-400 mt-1">₹{stats.adr.toLocaleString('en-IN')}</h3>
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-3">Avg Rate / Occupied Room</span>
                </div>

                {/* 4. Total Daily Turnover (₹ INR) */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-extrabold text-neutral-500 tracking-wider">Daily Projected Turnover</span>
                    <h3 className="text-2xl font-extrabold text-green-400 mt-1">₹{stats.total_revenue.toLocaleString('en-IN')}</h3>
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
                        <span className="text-neutral-100">₹{stats.room_revenue.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${stats.total_revenue > 0 ? (stats.room_revenue / stats.total_revenue) * 100 : 80}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-neutral-300">Food & Beverage (In-Room KDS)</span>
                        <span className="text-amber-400">₹{stats.dining_revenue.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${stats.total_revenue > 0 ? (stats.dining_revenue / stats.total_revenue) * 100 : 20}%` }}
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

            {/* General Manager Task Master Inspector Grid */}
            {stats && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-amber-500 tracking-wider">
                      Staff Task Control
                    </span>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2 mt-0.5">
                      <span>📋 Live Hotel Service Requests & Staff Tasks</span>
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 text-neutral-300 text-xs font-bold rounded-xl">
                    {stats.recent_tickets?.length || 0} Open Service Tasks
                  </span>
                </div>

                {/* Tasks List */}
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {stats.recent_tickets && stats.recent_tickets.length > 0 ? (
                    stats.recent_tickets.map((task: any) => (
                      <div
                        key={task.id}
                        className="p-3.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] rounded-lg">
                              Suite {task.room_number || '304'}
                            </span>
                            <span className={`px-2 py-0.5 border text-[10px] font-extrabold rounded-lg ${
                              task.category === 'Maintenance' 
                                ? 'bg-red-950/60 border-red-800 text-red-300' 
                                : task.category === 'Housekeeping' 
                                  ? 'bg-blue-950/60 border-blue-800 text-blue-300'
                                  : 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                            }`}>
                              {task.category}
                            </span>
                            {task.sla_breached && (
                              <span className="px-2 py-0.5 bg-red-600 text-white font-extrabold text-[9px] rounded-lg animate-pulse">
                                🚨 SLA BREACH (&gt;15m)
                              </span>
                            )}
                            <span className={`text-[10px] font-bold ${task.priority === 'High' ? 'text-red-400' : 'text-neutral-400'}`}>
                              Priority: {task.priority}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-200 font-medium line-clamp-1">{task.description}</p>
                          <span className="text-[9px] text-neutral-500 block">
                            Logged: {task.created_at ? new Date(task.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-xl border ${
                            task.status === 'Resolved' || task.status === 'Cleaned'
                              ? 'bg-green-950 text-green-400 border-green-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            {task.status}
                          </span>
                          {task.status !== 'Resolved' && task.status !== 'Cleaned' && (
                            <button
                              onClick={async () => {
                                try {
                                  await apiRequest(`/api/v1/executive/ticket/${task.id}`, {
                                    method: 'PUT',
                                    body: JSON.stringify({ status: 'Resolved' })
                                  });
                                  loadStats();
                                } catch (err: any) {
                                  alert(`Failed to update task: ${err.message}`);
                                }
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-[10px] rounded-xl transition shadow"
                            >
                              Mark Resolved
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-neutral-500 text-xs">
                      All guest service tasks are currently resolved.
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  {renderBriefingText(briefing.briefing_text)}
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

    </div>
  );
}
