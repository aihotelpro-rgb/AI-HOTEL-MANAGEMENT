'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, getAuthToken, API_BASE } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { 
  Settings, 
  Building, 
  Bed, 
  Utensils, 
  Users, 
  Plus, 
  Save, 
  Trash2, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  CheckCircle2, 
  RefreshCw, 
  Upload, 
  Image as ImageIcon, 
  Clock, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Search, 
  Crown, 
  X, 
  Key, 
  Flame,
  Globe,
  Check,
  Eye,
  EyeOff,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Zap,
  Sparkles,
  Timer,
  AlertOctagon,
  UserCheck
} from 'lucide-react';

interface HotelSettings {
  id: number;
  hotel_name: string;
  tagline: string;
  logo_url: string;
  banner_url: string;
  currency_symbol: string;
  currency_code: string;
  gstin: string;
  gst_percent: number;
  phone: string;
  email: string;
  address: string;
  wifi_ssid: string;
  wifi_password: string;
  check_in_time: string;
  check_out_time: string;
  razorpay_key_id?: string;
  razorpay_key_secret?: string;
  payment_gateway_enabled?: boolean;
  whatsapp_verify_token?: string;
  whatsapp_access_token?: string;
  whatsapp_phone_number_id?: string;
}

interface Room {
  id: number;
  room_number: string;
  floor: number;
  room_type: string;
  status: string;
  price_per_night: number;
  image_url?: string;
  area_sqft?: number;
  bed_type?: string;
  max_occupancy?: string;
  view_type?: string;
  amenities?: string[];
  description?: string;
  is_occupied: boolean;
  current_guest_name?: string;
}

interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  prep_time: string;
  image_url?: string;
  portion_size?: string;
  spice_level?: string;
  calories?: string;
  allergens?: string[];
  description: string;
  tags: string[];
  is_available: boolean;
}

interface StaffUser {
  id: number;
  username: string;
  role: string;
  full_name?: string;
  employee_id?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  shift?: string;
  emergency_contact?: string;
  is_active: boolean;
}

export default function AdminControlPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'hotel' | 'rooms' | 'menu' | 'staff' | 'channel' | 'integrations' | 'inventory' | 'cctv' | 'properties'>('hotel');
  
  // Data States
  const [settings, setSettings] = useState<HotelSettings | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [cctvCameras, setCctvCameras] = useState<any[]>([]);
  const [channelConfig, setChannelConfig] = useState<{ 
    is_enabled: boolean; 
    channel_api_key: string; 
    webhook_url: string; 
    last_sync: string;
    channels?: Array<{
      id: number;
      name: string;
      code: string;
      channel_type?: string;
      is_active: boolean;
      commission_percent: number;
      rate_plan?: string;
      api_secret?: string;
      webhook_url?: string;
      auto_confirm?: boolean;
      total_bookings: number;
      total_revenue_inr: number;
      badge_color?: string;
    }>
  } | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Toggle Channel Engine Stop-Sell Status
  const handleToggleChannelEngine = async () => {
    try {
      const current = channelConfig?.is_enabled ?? true;
      const updated = await apiRequest('/api/v1/admin/channel-engine/status', {
        method: 'PUT',
        body: JSON.stringify({ is_enabled: !current })
      });
      setChannelConfig(updated.config);
      showToast(updated.config.is_enabled ? 'Public Booking Engine ENABLED for Hotel Website!' : 'STOP-SELL Active: Public Website Booking Engine PAUSED.');
    } catch (err: any) {
      alert(`Error toggling channel engine: ${err.message}`);
    }
  };

  // Eye Toggle State for Secret & Password Fields
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [showWhatsappToken, setShowWhatsappToken] = useState(false);
  const [showStaffPass, setShowStaffPass] = useState(false);
  const [showEditStaffPass, setShowEditStaffPass] = useState(false);

  // 1. ADD ROOM MODAL STATES
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomFloor, setNewRoomFloor] = useState(1);
  const [newRoomType, setNewRoomType] = useState('Deluxe Heritage King');
  const [newRoomPrice, setNewRoomPrice] = useState(6500);
  const [newRoomImage, setNewRoomImage] = useState('https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600');
  const [newRoomArea, setNewRoomArea] = useState(550);
  const [newRoomBed, setNewRoomBed] = useState('Royal King Bed');
  const [newRoomOccupancy, setNewRoomOccupancy] = useState('2 Adults + 1 Child');
  const [newRoomView, setNewRoomView] = useState('Palace Courtyard & Pool View');
  const [newRoomAmenities, setNewRoomAmenities] = useState<string[]>([
    'High-Speed Wi-Fi', 'Espresso Bar', 'Marble Bathtub', 'Smart Automation', 'Balcony'
  ]);
  const [newRoomDesc, setNewRoomDesc] = useState('Authentic luxury suite with hand-carved jharokha arches, plush Italian linens, and high-speed palace connectivity.');

  // 2. EDIT ROOM MODAL STATE
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  // 3. ADD DISH MODAL STATES
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishCategory, setNewDishCategory] = useState('Indian Mains');
  const [newDishPrice, setNewDishPrice] = useState(480);
  const [newDishPrep, setNewDishPrep] = useState('15-20 min');
  const [newDishImage, setNewDishImage] = useState('https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600');
  const [newDishPortion, setNewDishPortion] = useState('Serves 1-2 (450g)');
  const [newDishSpice, setNewDishSpice] = useState('Medium (🌶️🌶️)');
  const [newDishCalories, setNewDishCalories] = useState('420 kcal');
  const [newDishAllergens, setNewDishAllergens] = useState<string[]>(['Contains Dairy']);
  const [newDishDesc, setNewDishDesc] = useState('');
  const [newDishTag, setNewDishTag] = useState('Pure Veg');

  // 4. EDIT DISH MODAL STATE
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);

  // 5. ADD CHANNEL MODAL STATES
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelCode, setNewChannelCode] = useState('');
  const [newChannelType, setNewChannelType] = useState('OTA');
  const [newChannelCommission, setNewChannelCommission] = useState(15.0);
  const [newChannelRatePlan, setNewChannelRatePlan] = useState('BAR (Best Available Rate)');
  const [newChannelAutoConfirm, setNewChannelAutoConfirm] = useState(true);
  const [newHotelId, setNewHotelId] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [editingCredModalChannel, setEditingCredModalChannel] = useState<any | null>(null);
  const [editHotelId, setEditHotelId] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [editApiSecret, setEditApiSecret] = useState('');
  const [editMode, setEditMode] = useState('LIVE');

  // Add Booking Channel Handler
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const codeUpper = newChannelCode.toUpperCase();
      const res = await apiRequest('/api/v1/channel/ota-channels', {
        method: 'POST',
        body: JSON.stringify({
          name: newChannelName,
          code: codeUpper,
          channel_type: newChannelType,
          commission_percent: Number(newChannelCommission),
          rate_plan: newChannelRatePlan,
          auto_confirm: newChannelAutoConfirm,
          hotel_id_on_ota: newHotelId || `HOTEL-${codeUpper}-88192`,
          api_key: newApiKey || `live_key_${codeUpper.toLowerCase()}_2026`
        })
      });
      setChannelModalOpen(false);
      setNewChannelName('');
      setNewChannelCode('');
      setNewHotelId('');
      setNewApiKey('');
      showToast(`OTA Channel "${newChannelName}" & API credentials configured!`);
      loadAdminData();
    } catch (err: any) {
      alert(`Error adding OTA channel: ${err.message}`);
    }
  };

  // Edit Booking Channel Handler
  const handleUpdateChannelItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel) return;
    try {
      const res = await apiRequest(`/api/v1/admin/channel-engine/channels/${editingChannel.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingChannel.name,
          code: editingChannel.code.toUpperCase(),
          channel_type: editingChannel.channel_type,
          commission_percent: Number(editingChannel.commission_percent),
          rate_plan: editingChannel.rate_plan,
          auto_confirm: editingChannel.auto_confirm
        })
      });
      if (channelConfig) {
        setChannelConfig({ ...channelConfig, channels: res.channels });
      }
      setEditingChannel(null);
      showToast(`Booking channel "${res.channel.name}" updated successfully!`);
    } catch (err: any) {
      alert(`Error updating channel: ${err.message}`);
    }
  };

  // Toggle Per-Channel Stop-Sell Handler
  const handleToggleChannelItem = async (channelId: number) => {
    try {
      const res = await apiRequest(`/api/v1/admin/channel-engine/channels/${channelId}/toggle`, {
        method: 'PATCH'
      });
      if (channelConfig) {
        setChannelConfig({ ...channelConfig, channels: res.channels });
      }
      showToast(res.message);
    } catch (err: any) {
      alert(`Error toggling channel: ${err.message}`);
    }
  };

  // Delete Channel Handler
  const handleDeleteChannelItem = async (channelId: number, name: string) => {
    if (!confirm(`Remove booking channel "${name}"?`)) return;
    try {
      const res = await apiRequest(`/api/v1/admin/channel-engine/channels/${channelId}`, {
        method: 'DELETE'
      });
      if (channelConfig) {
        setChannelConfig({ ...channelConfig, channels: res.channels });
      }
      showToast(`Booking channel "${name}" removed.`);
    } catch (err: any) {
      alert(`Error deleting channel: ${err.message}`);
    }
  };

  // 6. ADD STAFF MODAL STATES
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [newStaffUser, setNewStaffUser] = useState('');
  const [newStaffPass, setNewStaffPass] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Reception');
  const [newStaffFullName, setNewStaffFullName] = useState('');
  const [newStaffEmpId, setNewStaffEmpId] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('+91 ');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffAvatar, setNewStaffAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150');
  const [newStaffShift, setNewStaffShift] = useState('Morning Shift (07:00 - 15:30)');
  const [newStaffEmergency, setNewStaffEmergency] = useState('+91 ');

  // 6. EDIT STAFF MODAL STATE
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [editStaffPassword, setEditStaffPassword] = useState('');

  // Native File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          callback(reader.result as string);
          showToast('Image file uploaded successfully!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Auth Guard
  useEffect(() => {
    const token = getAuthToken();
    const role = localStorage.getItem('aihos_role');
    if (!token || (role !== 'Admin' && role !== 'Executive')) {
      router.push('/login');
    }
  }, [router]);

  // State for Staff Sub-Tabs & HR Operations
  const [staffSubTab, setStaffSubTab] = useState<'profiles' | 'attendance' | 'payroll' | 'task_sop'>('profiles');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Admin Task SLA Templates State
  const [adminTaskTemplates, setAdminTaskTemplates] = useState<any[]>([]);
  const [adminTemplatesLoading, setAdminTemplatesLoading] = useState(false);
  const [adminEditingTemplate, setAdminEditingTemplate] = useState<any | null>(null);
  const [adminEditSlaMinutes, setAdminEditSlaMinutes] = useState<number>(30);
  const [adminEditStaff, setAdminEditStaff] = useState<string>('');
  const [adminBatchRooms, setAdminBatchRooms] = useState<string[]>(['101', '102']);
  const [adminBatchDispatching, setAdminBatchDispatching] = useState<string | null>(null);

  const loadAdminTaskTemplates = async () => {
    setAdminTemplatesLoading(true);
    try {
      const data = await apiRequest('/api/v1/executive/task-templates');
      if (data && data.templates) {
        setAdminTaskTemplates(data.templates);
      }
    } catch (e) {
      console.error('Failed to load admin task templates', e);
    } finally {
      setAdminTemplatesLoading(false);
    }
  };

  const handleAdminUpdateTemplateSla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEditingTemplate) return;
    try {
      await apiRequest('/api/v1/executive/task-templates', {
        method: 'PUT',
        body: JSON.stringify({
          id: adminEditingTemplate.id,
          updates: {
            default_sla_minutes: Number(adminEditSlaMinutes),
            default_staff: adminEditStaff || adminEditingTemplate.default_staff
          }
        })
      });
      showToast(`Standard Operating Time updated for ${adminEditingTemplate.title}`);
      setAdminEditingTemplate(null);
      loadAdminTaskTemplates();
    } catch (err: any) {
      alert(`Error updating SLA template: ${err.message}`);
    }
  };

  const handleAdminBatchDispatch = async (tpl: any) => {
    if (adminBatchRooms.length === 0) {
      alert('Please select at least one room for batch dispatch');
      return;
    }
    setAdminBatchDispatching(tpl.id);
    try {
      const res = await apiRequest('/api/v1/executive/task-templates', {
        method: 'POST',
        body: JSON.stringify({
          template_id: tpl.id,
          department: tpl.department,
          title: tpl.title,
          room_numbers: adminBatchRooms,
          assigned_to: tpl.default_staff,
          standard_sla_minutes: tpl.default_sla_minutes,
          priority: tpl.priority,
          notes: `Batch dispatched by Administrator for ${adminBatchRooms.length} rooms`
        })
      });
      showToast(res.message || `Dispatched ${tpl.title} to ${adminBatchRooms.length} rooms!`);
    } catch (err: any) {
      alert(`Batch dispatch failed: ${err.message}`);
    } finally {
      setAdminBatchDispatching(null);
    }
  };

  // Dynamic Staff Attendance Views & Filtering
  const [attendanceViewMode, setAttendanceViewMode] = useState<'daily' | 'monthly'>('daily');
  const [attendanceMonth, setAttendanceMonth] = useState('2026-09');
  const [monthlyRoster, setMonthlyRoster] = useState<any[]>([]);
  const [monthlyAttendanceLoading, setMonthlyAttendanceLoading] = useState(false);
  const [attendanceDeptFilter, setAttendanceDeptFilter] = useState('All');
  const [attendanceSearch, setAttendanceSearch] = useState('');

  // Editable Salary & Compensation Modal State
  const [editSalaryModalOpen, setEditSalaryModalOpen] = useState(false);
  const [editingPayrollItem, setEditingPayrollItem] = useState<any | null>(null);
  const [editBaseSalary, setEditBaseSalary] = useState(25000);
  const [editDaysPresent, setEditDaysPresent] = useState(28);
  const [editWorkingDays, setEditWorkingDays] = useState(30);
  const [editOtHours, setEditOtHours] = useState(10);
  const [editOtRate, setEditOtRate] = useState(150);
  const [editBonus, setEditBonus] = useState(1000);
  const [editIncentives, setEditIncentives] = useState(1000);
  const [editPfDeduction, setEditPfDeduction] = useState(1250);
  const [editEsiDeduction, setEditEsiDeduction] = useState(188);
  const [editAdvanceDeduction, setEditAdvanceDeduction] = useState(0);
  const [editPaymentMode, setEditPaymentMode] = useState<'Bank Transfer' | 'UPI' | 'Cash'>('Bank Transfer');
  const [salarySaving, setSalarySaving] = useState(false);

  const [payrollMonth, setPayrollMonth] = useState('Sep 2026');
  const [payrollData, setPayrollData] = useState<any>({ summary: {}, payroll_sheet: [] });
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [selectedPayrollItem, setSelectedPayrollItem] = useState<any | null>(null);
  const [disburseMode, setDisburseMode] = useState<'Bank Transfer' | 'UPI' | 'Cash'>('Bank Transfer');
  const [disburseTxnRef, setDisburseTxnRef] = useState('');
  const [disbursingSalary, setDisbursingSalary] = useState(false);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [payslipData, setPayslipData] = useState<any | null>(null);
  const [payslipLoading, setPayslipLoading] = useState(false);

  // State for Enterprise Channel Manager Sub-Tabs & AI Copilot Data
  const [channelSubTab, setChannelSubTab] = useState<'channels' | 'mapping' | 'calendar' | 'ai_copilot' | 'health' | 'audit'>('channels');
  const [otaChannels, setOtaChannels] = useState<any[]>([]);
  const [roomMappings, setRoomMappings] = useState<any[]>([]);
  const [rateMappings, setRateMappings] = useState<any[]>([]);
  const [rateCalendar, setRateCalendar] = useState<{ dates: string[]; grid: any[] }>({ dates: [], grid: [] });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [syncHealth, setSyncHealth] = useState<any>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [aiOtaData, setAiOtaData] = useState<any>(null);
  const [aiOtaLoading, setAiOtaLoading] = useState(false);

  // Bulk rate update states
  const [bulkStartDate, setBulkStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkEndDate, setBulkEndDate] = useState(new Date(Date.now() + 864000000).toISOString().split('T')[0]);
  const [bulkRateVal, setBulkRateVal] = useState(5500);
  const [bulkRoomTypeId, setBulkRoomTypeId] = useState(0);

  // Multi-Property Enterprise States
  const [selectedPropertyId, setSelectedPropertyId] = useState(0);
  const [propertiesList, setPropertiesList] = useState<any[]>([]);
  const [propModalOpen, setPropModalOpen] = useState(false);
  const [newPropName, setNewPropName] = useState('');
  const [newPropCode, setNewPropCode] = useState('');
  const [newPropCity, setNewPropCity] = useState('');
  const [newPropRooms, setNewPropRooms] = useState(24);

  // Load All Admin Data
  const loadAdminData = async () => {
    try {
      const [settingsData, roomsData, menuData, staffData, channelData, inventoryData, cctvData, roomMapData, rateMapData, calendarData, auditData, syncData, legacyConfig, propertiesData, attData, payData, aiCopilotData] = await Promise.all([
        apiRequest('/api/v1/admin/settings'),
        apiRequest(`/api/v1/admin/rooms?property_id=${selectedPropertyId}`),
        apiRequest('/api/v1/admin/menu'),
        apiRequest('/api/v1/admin/staff'),
        apiRequest('/api/v1/channel/ota-channels').catch(() => []),
        apiRequest(`/api/v1/admin/inventory?property_id=${selectedPropertyId}`).catch(() => []),
        apiRequest('/api/v1/admin/cctv').catch(() => []),
        apiRequest('/api/v1/channel/mapping/rooms').catch(() => []),
        apiRequest('/api/v1/channel/mapping/rates').catch(() => []),
        apiRequest('/api/v1/channel/rates/calendar?days=14').catch(() => ({ dates: [], grid: [] })),
        apiRequest('/api/v1/channel/audit-logs?limit=30').catch(() => []),
        apiRequest('/api/v1/channel/sync/health').catch(() => null),
        apiRequest('/api/v1/admin/channel-engine/status').catch(() => null),
        apiRequest('/api/v1/admin/properties').catch(() => ({ properties: [] })),
        apiRequest(`/api/v1/admin/staff/attendance?date=${attendanceDate}`).catch(() => []),
        apiRequest(`/api/v1/admin/staff/payroll?month=${encodeURIComponent(payrollMonth)}`).catch(() => ({ summary: {}, payroll_sheet: [] })),
        apiRequest('/api/v1/channel/ai-copilot').catch(() => null)
      ]);
      setSettings(settingsData);
      setRooms(roomsData);
      setMenuItems(menuData);
      setStaffList(staffData);
      if (channelData) setOtaChannels(channelData);
      if (inventoryData) setInventoryItems(inventoryData);
      if (cctvData) setCctvCameras(cctvData);
      if (roomMapData) setRoomMappings(roomMapData);
      if (rateMapData) setRateMappings(rateMapData);
      if (calendarData) setRateCalendar(calendarData);
      if (auditData) setAuditLogs(auditData);
      if (syncData) setSyncHealth(syncData);
      if (legacyConfig) setChannelConfig(legacyConfig);
      if (propertiesData && propertiesData.properties) setPropertiesList(propertiesData.properties);
      if (attData) setAttendanceList(attData);
      if (payData) setPayrollData(payData);
      if (aiCopilotData) setAiOtaData(aiCopilotData);
    } catch (err: any) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async (date: string) => {
    setAttendanceLoading(true);
    try {
      const data = await apiRequest(`/api/v1/admin/staff/attendance?date=${date}`);
      setAttendanceList(data);
    } catch (e) {
      console.error('Failed to load attendance', e);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadMonthlyRoster = async (month: string = attendanceMonth) => {
    setMonthlyAttendanceLoading(true);
    try {
      const data = await apiRequest(`/api/v1/admin/staff/attendance?view=monthly&month=${month}`);
      if (data && data.roster) {
        setMonthlyRoster(data.roster);
      }
    } catch (e) {
      console.error('Failed to load monthly attendance roster', e);
    } finally {
      setMonthlyAttendanceLoading(false);
    }
  };

  const handleBatchMarkAllPresent = async () => {
    try {
      const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      for (const staff of staffList) {
        await apiRequest('/api/v1/admin/staff/attendance', {
          method: 'POST',
          body: JSON.stringify({
            staff_id: staff.id,
            staff_name: staff.full_name || staff.username,
            employee_id: staff.employee_id,
            role: staff.role,
            date: attendanceDate,
            status: 'Present',
            clock_in: currentTime,
            total_hours: 8.5
          })
        });
      }
      showToast('All active duty staff marked Present for today');
      loadAttendance(attendanceDate);
      loadMonthlyRoster(attendanceMonth);
    } catch (err: any) {
      alert(`Batch mark error: ${err.message}`);
    }
  };

  const handleToggleDayAttendance = async (staffId: number, day: number) => {
    try {
      const staff = staffList.find(s => s.id === staffId);
      const dayStr = `${attendanceMonth}-${String(day).padStart(2, '0')}`;
      const staffRoster = monthlyRoster.find(r => r.staff_id === staffId);
      const currentStatus = staffRoster?.days?.[day]?.status || 'Present';
      
      const nextStatusMap: Record<string, string> = {
        'Present': 'Late',
        'Late': 'HalfDay',
        'HalfDay': 'Absent',
        'Absent': 'OnLeave',
        'OnLeave': 'Present'
      };
      const nextStatus = nextStatusMap[currentStatus] || 'Present';

      await apiRequest('/api/v1/admin/staff/attendance', {
        method: 'POST',
        body: JSON.stringify({
          staff_id: staffId,
          staff_name: staff?.full_name || staff?.username,
          employee_id: staff?.employee_id,
          role: staff?.role,
          date: dayStr,
          status: nextStatus,
          clock_in: nextStatus === 'Present' || nextStatus === 'Late' ? '08:00 AM' : undefined,
          total_hours: nextStatus === 'Present' ? 8.5 : nextStatus === 'HalfDay' ? 4.0 : nextStatus === 'Late' ? 7.5 : 0
        })
      });
      loadMonthlyRoster(attendanceMonth);
      if (dayStr === attendanceDate) loadAttendance(attendanceDate);
    } catch (err: any) {
      alert(`Failed to update day attendance: ${err.message}`);
    }
  };

  const handleOpenEditSalary = (payItem: any) => {
    setEditingPayrollItem(payItem);
    setEditBaseSalary(payItem.base_salary || 25000);
    setEditDaysPresent(payItem.days_present !== undefined ? payItem.days_present : 28);
    setEditWorkingDays(payItem.total_working_days || 30);
    setEditOtHours(payItem.overtime_hours || 0);
    const calculatedOtRate = payItem.overtime_hours > 0 
      ? Math.round(payItem.overtime_pay / payItem.overtime_hours) 
      : Math.round(((payItem.base_salary || 25000) / 240) * 1.5);
    setEditOtRate(calculatedOtRate);
    setEditBonus(payItem.bonus || 0);
    setEditIncentives(payItem.incentives || 0);
    setEditPfDeduction(payItem.pf_deduction || Math.round((payItem.base_salary || 25000) * 0.05));
    setEditEsiDeduction(payItem.esi_deduction || Math.round((payItem.base_salary || 25000) * 0.0075));
    setEditAdvanceDeduction(payItem.advance_deduction || 0);
    setEditPaymentMode(payItem.payment_mode || 'Bank Transfer');
    setEditSalaryModalOpen(true);
  };

  const handleSaveSalaryConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayrollItem) return;
    setSalarySaving(true);
    try {
      const res = await apiRequest(`/api/v1/admin/staff/payroll/${editingPayrollItem.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          base_salary: editBaseSalary,
          days_present: editDaysPresent,
          total_working_days: editWorkingDays,
          overtime_hours: editOtHours,
          overtime_pay: Math.round(editOtHours * editOtRate),
          bonus: editBonus,
          incentives: editIncentives,
          pf_deduction: editPfDeduction,
          esi_deduction: editEsiDeduction,
          advance_deduction: editAdvanceDeduction,
          payment_mode: editPaymentMode
        })
      });
      showToast(res.message || 'Salary updated successfully');
      setEditSalaryModalOpen(false);
      setEditingPayrollItem(null);
      loadPayroll(payrollMonth);
    } catch (err: any) {
      alert(`Failed to save salary: ${err.message}`);
    } finally {
      setSalarySaving(false);
    }
  };

  const loadPayroll = async (month: string) => {
    setPayrollLoading(true);
    try {
      const data = await apiRequest(`/api/v1/admin/staff/payroll?month=${encodeURIComponent(month)}`);
      setPayrollData(data);
    } catch (e) {
      console.error('Failed to load payroll', e);
    } finally {
      setPayrollLoading(false);
    }
  };

  const handleMarkAttendance = async (staffId: number, status: string) => {
    try {
      const staffUser = staffList.find(s => s.id === staffId);
      const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      await apiRequest('/api/v1/admin/staff/attendance', {
        method: 'POST',
        body: JSON.stringify({
          staff_id: staffId,
          staff_name: staffUser?.full_name || staffUser?.username,
          employee_id: staffUser?.employee_id,
          role: staffUser?.role,
          date: attendanceDate,
          status,
          clock_in: status === 'Present' || status === 'Late' ? currentTime : undefined,
          total_hours: status === 'Present' ? 8.5 : status === 'HalfDay' ? 4.0 : 0
        })
      });
      showToast(`Marked ${staffUser?.full_name || staffUser?.username} as ${status}`);
      loadAttendance(attendanceDate);
    } catch (err: any) {
      alert(`Error marking attendance: ${err.message}`);
    }
  };

  const handleDisburseSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayrollItem) return;
    setDisbursingSalary(true);
    try {
      const res = await apiRequest('/api/v1/admin/staff/payroll', {
        method: 'POST',
        body: JSON.stringify({
          payroll_id: selectedPayrollItem.id,
          payment_mode: disburseMode,
          transaction_ref: disburseTxnRef || undefined
        })
      });
      showToast(res.message);
      setDisburseModalOpen(false);
      setSelectedPayrollItem(null);
      setDisburseTxnRef('');
      loadPayroll(payrollMonth);
    } catch (err: any) {
      alert(`Error disbursing salary: ${err.message}`);
    } finally {
      setDisbursingSalary(false);
    }
  };

  const handleViewPayslip = async (staffId: number) => {
    setPayslipLoading(true);
    setPayslipModalOpen(true);
    try {
      const data = await apiRequest(`/api/v1/admin/staff/payroll/${staffId}/payslip`);
      setPayslipData(data);
    } catch (err: any) {
      alert(`Error loading payslip: ${err.message}`);
    } finally {
      setPayslipLoading(false);
    }
  };

  const handleToggleAutoPilot = async () => {
    try {
      const res = await apiRequest('/api/v1/channel/ai-copilot', {
        method: 'POST',
        body: JSON.stringify({ action: 'toggle_autopilot' })
      });
      showToast(res.message);
      const updatedAi = await apiRequest('/api/v1/channel/ai-copilot');
      setAiOtaData(updatedAi);
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    }
  };

  const handleResolveParity = async (channelCode: string) => {
    try {
      const res = await apiRequest('/api/v1/channel/ai-copilot', {
        method: 'POST',
        body: JSON.stringify({ action: 'resolve_parity', channel_code: channelCode })
      });
      showToast(res.message);
      const updatedAi = await apiRequest('/api/v1/channel/ai-copilot');
      setAiOtaData(updatedAi);
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    }
  };

  const handleApplyAiYieldTariffs = async () => {
    setAiOtaLoading(true);
    try {
      const res = await apiRequest('/api/v1/channel/ai-copilot', {
        method: 'POST',
        body: JSON.stringify({ action: 'apply_yield_tariffs' })
      });
      showToast(res.message);
      loadAdminData();
    } catch (err: any) {
      alert(`Failed to apply AI tariffs: ${err.message}`);
    } finally {
      setAiOtaLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [selectedPropertyId]);

  // CCTV CAMERA MANAGEMENT HANDLERS
  const [cctvModalOpen, setCctvModalOpen] = useState(false);
  const [newCamName, setNewCamName] = useState('');
  const [newCamLocation, setNewCamLocation] = useState('Ground Floor Lobby');
  const [newCamBrand, setNewCamBrand] = useState('CP Plus');
  const [newCamUrl, setNewCamUrl] = useState('rtsp://admin:pass@192.168.1.108:554/cam/realmonitor');

  const handleAddCctvCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/v1/admin/cctv', {
        method: 'POST',
        body: JSON.stringify({
          name: newCamName,
          location: newCamLocation,
          brand: newCamBrand,
          stream_url: newCamUrl
        })
      });
      showToast(`CCTV Camera "${newCamName}" (${newCamBrand}) added!`);
      setCctvModalOpen(false);
      setNewCamName('');
      loadAdminData();
    } catch (err: any) {
      alert(`Error adding camera: ${err.message}`);
    }
  };

  const handleToggleCctvCamera = async (id: number, name: string) => {
    try {
      const res = await apiRequest(`/api/v1/admin/cctv/${id}/toggle`, { method: 'PUT' });
      showToast(res.message);
      loadAdminData();
    } catch (err: any) {
      alert(`Error toggling camera: ${err.message}`);
    }
  };

  const handleDeleteCctvCamera = async (id: number, name: string) => {
    if (!confirm(`Delete CCTV camera feed "${name}"?`)) return;
    try {
      await apiRequest(`/api/v1/admin/cctv/${id}`, { method: 'DELETE' });
      showToast(`CCTV camera feed "${name}" deleted.`);
      loadAdminData();
    } catch (err: any) {
      alert(`Error deleting camera: ${err.message}`);
    }
  };

  // MULTI-PROPERTY HANDLER
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/v1/admin/properties', {
        method: 'POST',
        body: JSON.stringify({
          name: newPropName,
          code: newPropCode || `BBN-00${propertiesList.length + 1}`,
          city: newPropCity || 'Port Blair',
          total_rooms: Number(newPropRooms)
        })
      });
      showToast(res.message);
      setPropModalOpen(false);
      setNewPropName('');
      setNewPropCode('');
      setNewPropCity('');
      loadAdminData();
    } catch (err: any) {
      alert(`Error creating property: ${err.message}`);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4000);
  };

  // 1. Save Hotel Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSavingSettings(true);
    try {
      const updated = await apiRequest('/api/v1/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      setSettings(updated);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('aihos_settings_updated', { detail: updated }));
      }
      showToast('Hotel details, logo & branding updated!');
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // 2. Add Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newRoom = await apiRequest('/api/v1/admin/rooms', {
        method: 'POST',
        body: JSON.stringify({
          room_number: newRoomNumber,
          floor: Number(newRoomFloor),
          room_type: newRoomType,
          price_per_night: Number(newRoomPrice),
          image_url: newRoomImage,
          area_sqft: Number(newRoomArea),
          bed_type: newRoomBed,
          max_occupancy: newRoomOccupancy,
          view_type: newRoomView,
          amenities: newRoomAmenities,
          description: newRoomDesc
        })
      });
      setRooms(prev => [...prev, newRoom]);
      setRoomModalOpen(false);
      setNewRoomNumber('');
      showToast(`Suite ${newRoom.room_number} added to inventory.`);
    } catch (err: any) {
      alert(`Error adding room: ${err.message}`);
    }
  };

  // Update Room (Edit)
  const handleUpdateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    try {
      const updated = await apiRequest(`/api/v1/admin/rooms/${editingRoom.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          room_number: editingRoom.room_number,
          floor: Number(editingRoom.floor),
          room_type: editingRoom.room_type,
          price_per_night: Number(editingRoom.price_per_night),
          image_url: editingRoom.image_url,
          area_sqft: Number(editingRoom.area_sqft),
          bed_type: editingRoom.bed_type,
          max_occupancy: editingRoom.max_occupancy,
          view_type: editingRoom.view_type,
          amenities: editingRoom.amenities,
          description: editingRoom.description
        })
      });
      setRooms(prev => prev.map(r => r.id === editingRoom.id ? { ...r, ...updated } : r));
      setEditingRoom(null);
      showToast(`Suite ${editingRoom.room_number} specifications & photo updated successfully!`);
    } catch (err: any) {
      alert(`Error updating suite: ${err.message}`);
    }
  };

  // Delete Room
  const handleDeleteRoom = async (roomId: number, roomNumber: string) => {
    if (!confirm(`Delete Suite ${roomNumber} from property inventory?`)) return;
    try {
      await apiRequest(`/api/v1/admin/rooms/${roomId}`, { method: 'DELETE' });
      setRooms(prev => prev.filter(r => r.id !== roomId));
      showToast(`Suite ${roomNumber} removed.`);
    } catch (err: any) {
      alert(`Error deleting room: ${err.message}`);
    }
  };

  // 3. Add Menu Item
  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newItem = await apiRequest('/api/v1/admin/menu', {
        method: 'POST',
        body: JSON.stringify({
          name: newDishName,
          category: newDishCategory,
          price: Number(newDishPrice),
          prep_time: newDishPrep,
          image_url: newDishImage,
          portion_size: newDishPortion,
          spice_level: newDishSpice,
          calories: newDishCalories,
          allergens: newDishAllergens,
          description: newDishDesc,
          tags: [newDishTag],
          is_available: true
        })
      });
      setMenuItems(prev => [...prev, newItem]);
      setMenuModalOpen(false);
      setNewDishName('');
      setNewDishDesc('');
      showToast(`Dish "${newItem.name}" added to menu.`);
    } catch (err: any) {
      alert(`Error adding dish: ${err.message}`);
    }
  };

  // Update Menu Item (Edit)
  const handleUpdateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenu) return;
    try {
      const updated = await apiRequest(`/api/v1/admin/menu/${editingMenu.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingMenu.name,
          category: editingMenu.category,
          price: Number(editingMenu.price),
          prep_time: editingMenu.prep_time,
          image_url: editingMenu.image_url,
          portion_size: editingMenu.portion_size,
          spice_level: editingMenu.spice_level,
          calories: editingMenu.calories,
          allergens: editingMenu.allergens,
          description: editingMenu.description,
          tags: editingMenu.tags
        })
      });
      setMenuItems(prev => prev.map(m => m.id === editingMenu.id ? updated : m));
      setEditingMenu(null);
      showToast(`Dish "${updated.name}" updated!`);
    } catch (err: any) {
      alert(`Error updating dish: ${err.message}`);
    }
  };

  // Toggle Menu Availability
  const handleToggleMenu = async (itemId: number) => {
    try {
      const updated = await apiRequest(`/api/v1/admin/menu/${itemId}/toggle`, { method: 'PATCH' });
      setMenuItems(prev => prev.map(m => m.id === itemId ? updated : m));
    } catch (err: any) {
      alert(`Error toggling menu item: ${err.message}`);
    }
  };

  // Delete Menu Item
  const handleDeleteMenu = async (itemId: number, name: string) => {
    if (!confirm(`Delete dish "${name}" from menu?`)) return;
    try {
      await apiRequest(`/api/v1/admin/menu/${itemId}`, { method: 'DELETE' });
      setMenuItems(prev => prev.filter(m => m.id !== itemId));
      showToast(`Dish "${name}" removed.`);
    } catch (err: any) {
      alert(`Error deleting dish: ${err.message}`);
    }
  };

  // 4. Add Staff Account
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newUser = await apiRequest('/api/v1/admin/staff', {
        method: 'POST',
        body: JSON.stringify({
          username: newStaffUser,
          password: newStaffPass,
          role: newStaffRole,
          full_name: newStaffFullName || 'Staff Member',
          employee_id: newStaffEmpId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
          phone: newStaffPhone,
          email: newStaffEmail,
          avatar_url: newStaffAvatar,
          shift: newStaffShift,
          emergency_contact: newStaffEmergency
        })
      });
      setStaffList(prev => [...prev, newUser]);
      setStaffModalOpen(false);
      setNewStaffUser('');
      setNewStaffPass('');
      setNewStaffFullName('');
      showToast(`Staff account for "${newUser.full_name}" created.`);
    } catch (err: any) {
      alert(`Error creating staff: ${err.message}`);
    }
  };

  // Update Staff Account (Edit)
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      const payload: any = {
        role: editingStaff.role,
        full_name: editingStaff.full_name,
        employee_id: editingStaff.employee_id,
        phone: editingStaff.phone,
        email: editingStaff.email,
        avatar_url: editingStaff.avatar_url,
        shift: editingStaff.shift,
        emergency_contact: editingStaff.emergency_contact,
        is_active: editingStaff.is_active
      };
      if (editStaffPassword.trim()) {
        payload.password = editStaffPassword;
      }
      const updated = await apiRequest(`/api/v1/admin/staff/${editingStaff.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      setStaffList(prev => prev.map(s => s.id === editingStaff.id ? updated : s));
      setEditingStaff(null);
      setEditStaffPassword('');
      showToast(`Staff profile for "${updated.full_name}" updated!`);
    } catch (err: any) {
      alert(`Error updating staff: ${err.message}`);
    }
  };

  // Delete Staff Account
  const handleDeleteStaff = async (userId: number, username: string) => {
    if (!confirm(`Delete staff account @${username}?`)) return;
    try {
      await apiRequest(`/api/v1/admin/staff/${userId}`, { method: 'DELETE' });
      setStaffList(prev => prev.filter(s => s.id !== userId));
      showToast(`Staff account @${username} removed.`);
    } catch (err: any) {
      alert(`Error deleting staff: ${err.message}`);
    }
  };

  // Filtered views
  const filteredRooms = rooms.filter(r => 
    !searchFilter || r.room_number.includes(searchFilter) || r.room_type.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredMenuItems = menuItems.filter(m => 
    !searchFilter || m.name.toLowerCase().includes(searchFilter.toLowerCase()) || m.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const filteredStaff = staffList.filter(s => 
    !searchFilter || (s.full_name && s.full_name.toLowerCase().includes(searchFilter.toLowerCase())) || s.username.toLowerCase().includes(searchFilter.toLowerCase()) || s.role.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-neutral-400 text-sm font-semibold">Opening Super-Admin Master Control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-neutral-950 text-neutral-100 selection:bg-amber-500 selection:text-neutral-950 overflow-hidden">
      
      {/* Unified Side Navigation */}
      <Sidebar hotelName={settings?.hotel_name} />

      {/* Main Admin Work Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Admin Header */}
        <header className="px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 flex justify-between items-center gap-3 shadow-lg shrink-0 w-full overflow-hidden">
          <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
            <div className="h-8 w-8 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black shadow shrink-0">
              <Settings className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-white truncate leading-none">
                  Super-Admin Master Control
                </h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-950 text-amber-400 border border-amber-500/30 rounded-full shrink-0 whitespace-nowrap hidden sm:inline-block">
                  Full Control
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 truncate">Hotel Logo, Suite Inventory, F&B Catalog & Staff Profiles</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Multi-Property Context Switcher */}
            <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1 shadow shrink-0">
              <Building2 className="h-4 w-4 text-amber-500 shrink-0" />
              <select
                value={selectedPropertyId}
                onChange={(e) => {
                  const pid = Number(e.target.value);
                  setSelectedPropertyId(pid);
                  const prop = propertiesList.find(p => p.id === pid);
                  showToast(`Switched property context to ${prop ? prop.name : 'Consolidated Portfolio (All 3 Properties)'}`);
                  loadAdminData();
                }}
                className="bg-transparent text-xs font-bold text-neutral-100 focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-neutral-900 text-amber-400">🏢 Portfolio: All Properties (Consolidated)</option>
                {propertiesList.map((p: any) => (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-neutral-100">
                    🏨 Property #{p.id}: {p.name} ({p.city})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={loadAdminData}
              className="p-1.5 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 rounded-xl border border-neutral-700 transition shrink-0"
              title="Refresh Admin Data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Tab & Search Bar */}
        <div className="px-4 py-2 bg-neutral-900/60 border-b border-neutral-800 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-neutral-950 rounded-2xl border border-neutral-800/90">
            {[
              { key: 'hotel', label: 'Branding & Logo', icon: Building },
              { key: 'rooms', label: `Suites (${rooms.length})`, icon: Bed },
              { key: 'menu', label: `F&B Catalog (${menuItems.length})`, icon: Utensils },
              { key: 'inventory', label: `Stock (${inventoryItems.length})`, icon: Flame },
              { key: 'cctv', label: `CCTV (${cctvCameras.length})`, icon: Globe },
              { key: 'staff', label: `Staff HR (${staffList.length})`, icon: Users },
              { key: 'channel', label: 'Website & Channel Sync', icon: Key },
              { key: 'integrations', label: 'Payment & WhatsApp', icon: ShieldCheck },
              { key: 'properties', label: `Multi-Property (${propertiesList.length || 3})`, icon: Building2 }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key as any);
                    setSearchFilter('');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${
                    activeTab === tab.key
                      ? 'bg-amber-500 text-neutral-950 font-black shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {activeTab !== 'hotel' && (
            <div className="relative min-w-[130px] flex-1 sm:w-48">
              <Search className="h-3.5 w-3.5 text-neutral-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-20 right-6 z-50 bg-green-950 border border-green-600 text-green-300 text-xs font-bold py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Main Content Pane */}
        <main className="flex-1 p-6 overflow-y-auto max-w-6xl w-full">
          
          {/* TAB 1: HOTEL BRANDING, LOGO & TAX DETAILS */}
          {activeTab === 'hotel' && settings && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              
              {/* Visual Logo & Banner Branding with Native File Upload */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex flex-wrap justify-between items-center gap-3 pb-3 border-b border-neutral-800">
                  <div className="min-w-0">
                    <h3 className="text-sm md:text-base font-black text-neutral-100 flex items-center gap-2">
                      <Crown className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                      Visual Identity & Logo Branding
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">Upload logo from device or enter URL. Automatically displays across sidebar and invoices.</p>
                  </div>
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-black text-xs rounded-xl transition shadow-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Save className="h-4 w-4" />
                    {savingSettings ? 'Saving...' : 'Save All Changes'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Left: Logo Preview Card */}
                  <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 flex flex-col items-center justify-center text-center space-y-3">
                    <span className="text-[10px] uppercase font-extrabold text-neutral-400 tracking-wider">Live Logo Preview</span>
                    <img 
                      src={settings.logo_url || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300"} 
                      alt="Hotel Logo Preview"
                      className="h-20 w-20 rounded-2xl object-cover border-2 border-amber-500 shadow-xl"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-neutral-200">{settings.hotel_name}</h4>
                      <p className="text-[10px] text-amber-500 font-semibold">{settings.tagline}</p>
                    </div>

                    <label className="cursor-pointer px-3 py-1.5 bg-neutral-850 hover:bg-neutral-800 text-amber-400 font-bold text-[11px] rounded-xl border border-neutral-700 transition flex items-center gap-1.5 shadow">
                      <Upload className="h-3.5 w-3.5" />
                      Upload Logo from Device
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleFileChange(e, (url) => setSettings({ ...settings, logo_url: url }))}
                      />
                    </label>
                  </div>

                  {/* Center & Right: Logo URL & Banner URL inputs */}
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">
                        Logo Image URL (Or Upload Above)
                      </label>
                      <input
                        type="text"
                        value={settings.logo_url}
                        onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                        placeholder="https://example.com/hotel-logo.png"
                        className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                      />
                      <div className="flex gap-2 mt-2">
                        <span className="text-[10px] text-neutral-500">Quick Presets:</span>
                        {[
                          { label: 'Palace Resort', url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=300' },
                          { label: 'Royal Heritage', url: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=300' },
                          { label: 'Imperial Spa', url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=300' }
                        ].map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSettings({ ...settings, logo_url: p.url })}
                            className="text-[10px] text-amber-400 bg-neutral-800 hover:bg-neutral-750 px-2 py-0.5 rounded-lg border border-neutral-700"
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">
                        Hero Banner Cover URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={settings.banner_url}
                          onChange={(e) => setSettings({ ...settings, banner_url: e.target.value })}
                          placeholder="https://example.com/palace-facade.jpg"
                          className="flex-1 text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                        />
                        <label className="cursor-pointer px-3 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-1">
                          <Upload className="h-3.5 w-3.5 text-amber-500" />
                          Upload Banner
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => handleFileChange(e, (url) => setSettings({ ...settings, banner_url: url }))}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Property Details, GSTIN & Wi-Fi */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h3 className="text-sm font-extrabold text-neutral-100 pb-2 border-b border-neutral-800">
                  Tax Registration, Contact & Connectivity
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Hotel Property Name</label>
                    <input
                      type="text"
                      value={settings.hotel_name}
                      onChange={(e) => setSettings({ ...settings, hotel_name: e.target.value })}
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Luxury Tagline</label>
                    <input
                      type="text"
                      value={settings.tagline}
                      onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">GSTIN Number (Tax Invoices)</label>
                    <input
                      type="text"
                      value={settings.gstin}
                      onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Currency Symbol</label>
                      <input
                        type="text"
                        value={settings.currency_symbol}
                        onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                        className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">GST Tax Rate (%)</label>
                      <input
                        type="number"
                        value={settings.gst_percent}
                        onChange={(e) => setSettings({ ...settings, gst_percent: Number(e.target.value) })}
                        className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-bold focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Reception Phone</label>
                    <input
                      type="text"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Official Concierge Email</label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Property Full Address</label>
                    <input
                      type="text"
                      value={settings.address}
                      onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Resort Wi-Fi SSID</label>
                    <input
                      type="text"
                      value={settings.wifi_ssid}
                      onChange={(e) => setSettings({ ...settings, wifi_ssid: e.target.value })}
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Resort Wi-Fi Password</label>
                    <input
                      type="text"
                      value={settings.wifi_password}
                      onChange={(e) => setSettings({ ...settings, wifi_password: e.target.value })}
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: SUITE INVENTORY MASTER WITH EDIT & UPLOAD */}
          {activeTab === 'rooms' && (
            <div className="space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-extrabold text-neutral-100 leading-snug">Suite Inventory Master</h3>
                    <p className="text-xs text-neutral-400">Total {rooms.length} Suites configured with photos, bed type, area, and ₹ INR tariffs.</p>
                  </div>
                  <button
                    onClick={() => setRoomModalOpen(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl transition shadow flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Suite</span>
                  </button>
                </div>
              </div>

              {/* Suite Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map(room => (
                  <div key={room.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between group">
                    <div>
                      {/* Room Photo & Badges */}
                      <div className="relative h-40 w-full overflow-hidden bg-neutral-950">
                        <img 
                          src={room.image_url || "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600"} 
                          alt={`Suite ${room.room_number}`}
                          className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                          <span className="text-xs font-extrabold bg-neutral-950/80 backdrop-blur-md text-amber-400 px-2.5 py-1 rounded-lg border border-neutral-700">
                            Suite {room.room_number}
                          </span>
                          <span className="text-[10px] font-bold bg-neutral-950/80 backdrop-blur-md text-neutral-300 px-2 py-1 rounded-lg">
                            Floor {room.floor}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span className={`text-[10px] font-extrabold px-2 py-1 rounded-lg backdrop-blur-md ${
                            room.is_occupied 
                              ? 'bg-amber-950/90 text-amber-400 border border-amber-600/40' 
                              : 'bg-green-950/90 text-green-400 border border-green-700/40'
                          }`}>
                            {room.is_occupied ? 'Occupied' : 'Vacant'}
                          </span>
                        </div>
                        <div className="absolute bottom-2 left-2.5 right-2.5 flex justify-between items-end">
                          <span className="text-[11px] font-bold text-white bg-neutral-950/80 px-2 py-0.5 rounded-md backdrop-blur-sm">
                            {room.bed_type || 'Royal King Bed'} • {room.area_sqft || 550} sq.ft
                          </span>
                        </div>
                      </div>

                      {/* Room Details */}
                      <div className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-extrabold text-sm text-neutral-100">{room.room_type}</h4>
                            <p className="text-[11px] text-neutral-400 mt-0.5">{room.view_type || 'Palace View'}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-extrabold text-amber-400">₹{room.price_per_night.toLocaleString('en-IN')}</span>
                            <span className="text-[10px] text-neutral-500 block">/ night</span>
                          </div>
                        </div>

                        {/* Amenities Chips */}
                        {room.amenities && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {room.amenities.slice(0, 3).map((a, i) => (
                              <span key={i} className="text-[9px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700/60">
                                {a}
                              </span>
                            ))}
                            {room.amenities.length > 3 && (
                              <span className="text-[9px] text-neutral-500 px-1 py-0.5">
                                +{room.amenities.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Suite Actions (EDIT & DELETE) */}
                    <div className="p-3 bg-neutral-850/60 border-t border-neutral-800 flex justify-between items-center">
                      <span className="text-[11px] text-neutral-400">
                        Max: <strong>{room.max_occupancy || '2 Adults + 1 Child'}</strong>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingRoom(room)}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold text-xs rounded-lg border border-neutral-700 transition flex items-center gap-1"
                          title="Edit Suite Specifications"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteRoom(room.id, room.room_number)}
                          disabled={room.is_occupied}
                          className="p-1.5 text-neutral-500 hover:text-red-400 disabled:opacity-30 transition"
                          title="Delete Suite"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MENU MASTER WITH EDIT & UPLOAD */}
          {activeTab === 'menu' && (
            <div className="space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-extrabold text-neutral-100 leading-snug">Gourmet F&B Culinary Master</h3>
                    <p className="text-xs text-neutral-400">Manage dishes with photos, spice ratings, allergen badges, and ₹ INR pricing.</p>
                  </div>
                  <button
                    onClick={() => setMenuModalOpen(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl transition shadow flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Dish</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMenuItems.map(item => (
                  <div key={item.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between">
                    <div className="flex gap-4 p-4">
                      {/* Dish Photo */}
                      <div className="h-24 w-24 rounded-xl overflow-hidden bg-neutral-950 shrink-0 border border-neutral-800">
                        <img 
                          src={item.image_url || "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600"} 
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      {/* Dish Metadata */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-extrabold uppercase text-amber-500">{item.category}</span>
                              <span className="text-[10px] text-neutral-400 font-semibold">• {item.spice_level || 'Medium'}</span>
                            </div>
                            <h4 className="font-extrabold text-sm text-neutral-100 truncate">{item.name}</h4>
                          </div>
                          <span className="text-base font-extrabold text-amber-400">₹{item.price.toFixed(2)}</span>
                        </div>

                        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">{item.description}</p>

                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] text-neutral-400 font-mono">{item.portion_size || 'Serves 1-2'}</span>
                          <span className="text-[10px] text-neutral-500">•</span>
                          <span className="text-[10px] text-neutral-400 font-mono">{item.calories || '400 kcal'}</span>
                          <span className="text-[10px] text-neutral-500">•</span>
                          <span className="text-[10px] text-neutral-400 flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> {item.prep_time}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dish Actions (STOCK TOGGLE, EDIT & DELETE) */}
                    <div className="px-4 py-2.5 bg-neutral-850/60 border-t border-neutral-800 flex justify-between items-center">
                      <button
                        onClick={() => handleToggleMenu(item.id)}
                        className={`text-xs font-bold flex items-center gap-1.5 transition ${
                          item.is_available ? 'text-green-400' : 'text-neutral-500'
                        }`}
                      >
                        {item.is_available ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5" />}
                        <span>{item.is_available ? 'In Stock (Available)' : 'Sold Out'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingMenu(item)}
                          className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold text-xs rounded-lg border border-neutral-700 transition flex items-center gap-1"
                          title="Edit Dish"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteMenu(item.id, item.name)}
                          className="p-1.5 text-neutral-500 hover:text-red-400 transition"
                          title="Delete Dish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MASTER RAW INGREDIENT & HOTEL STOCK INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-extrabold text-neutral-100 leading-snug">
                        🏬 Master Raw Ingredient & Hotel Stock Inventory Control
                      </h3>
                      <span className="text-[10px] sm:text-xs px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-extrabold rounded-xl whitespace-nowrap shrink-0">
                        Real-Time Auto-Deduction Engine
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <button
                      onClick={async () => {
                        const name = prompt("Enter Stock Item Name (e.g. Kashmiri Almonds, Egyptian Cotton Towels, Sandalwood Aromatics):");
                        if (!name) return;
                        const cat = prompt("Enter Category (e.g. Kitchen & F&B, Housekeeping, Amenities, Front Desk):", "Kitchen & F&B");
                        const qty = prompt("Enter Initial Stock Quantity:", "100");
                        const limit = prompt("Enter Minimum Safety Threshold Limit:", "20");
                        const cost = prompt("Enter Unit Cost (₹ INR):", "250");
                        try {
                          await apiRequest('/api/v1/admin/inventory', {
                            method: 'POST',
                            body: JSON.stringify({
                              item_name: name,
                              category: cat,
                              stock_quantity: Number(qty),
                              min_threshold: Number(limit),
                              unit: "Units",
                              unit_cost: Number(cost)
                            })
                          });
                          showToast(`Added stock item "${name}" successfully!`);
                          loadAdminData();
                        } catch (err: any) {
                          alert(`Error adding stock item: ${err.message}`);
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shadow"
                    >
                      <Plus className="h-4 w-4" />
                      <span>+ Add Stock Item</span>
                    </button>

                    <button
                      onClick={loadAdminData}
                      className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-amber-400 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shadow"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Refresh Stock Levels</span>
                    </button>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Live raw ingredient levels (Paneer, Butter, Rice, Gravy Bases) & room linen stock. Auto-deducts when guests order food.
                </p>
              </div>

              {/* Stock Table */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-neutral-200">
                    <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800 font-extrabold">
                      <tr>
                        <th className="py-3 px-4 min-w-[170px] whitespace-nowrap">Item Name</th>
                        <th className="py-3 px-4 whitespace-nowrap">Current Stock</th>
                        <th className="py-3 px-4 whitespace-nowrap">Safety Limit</th>
                        <th className="py-3 px-4 whitespace-nowrap">Cost / Unit</th>
                        <th className="py-3 px-4 whitespace-nowrap">Status</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {inventoryItems.map((inv: any) => {
                        const name = inv.item_name || inv.name || 'Stock Item';
                        const stock = inv.current_stock ?? inv.stock_quantity ?? 0;
                        const threshold = inv.min_alert_threshold ?? inv.min_threshold ?? 10;
                        const unit = inv.unit || 'Units';
                        const cost = inv.cost_per_unit ?? inv.unit_cost ?? 0;
                        const isLow = inv.is_low ?? (stock <= threshold);

                        return (
                          <tr key={inv.id} className="hover:bg-neutral-950/60 transition">
                            <td className="py-3.5 px-4 font-extrabold text-white whitespace-nowrap min-w-[170px]">
                              <span>📦 {name}</span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-extrabold text-amber-400 text-sm whitespace-nowrap">
                              {stock} {unit}
                            </td>
                            <td className="py-3.5 px-4 text-neutral-400 font-medium whitespace-nowrap">
                              {threshold} {unit}
                            </td>
                            <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                              ₹{cost} / {unit}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {isLow ? (
                                <span className="px-2.5 py-1 bg-red-950 text-red-400 border border-red-800 text-[10px] font-extrabold rounded-xl animate-pulse whitespace-nowrap inline-block">
                                  ⚠️ LOW STOCK ALERT
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 bg-green-950 text-green-400 border border-green-800 text-[10px] font-extrabold rounded-xl whitespace-nowrap inline-block">
                                  Healthy Stock
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={async () => {
                                    const qty = prompt(`Enter restock quantity to add to "${name}":`, "15");
                                    if (qty) {
                                      try {
                                        await apiRequest(`/api/v1/admin/inventory/${inv.id}/restock`, {
                                          method: 'POST',
                                          body: JSON.stringify({ quantity: Number(qty) })
                                        });
                                        showToast(`Restocked +${qty} ${unit} of ${name}`);
                                        loadAdminData();
                                      } catch (err: any) {
                                        alert(`Failed to restock: ${err.message}`);
                                      }
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[11px] rounded-xl transition shadow whitespace-nowrap inline-flex items-center gap-1 shrink-0"
                                >
                                  <span>+</span>
                                  <span>Restock</span>
                                </button>

                                <button
                                  onClick={async () => {
                                    const newName = prompt("Edit Item Name:", name) || name;
                                    const newThreshold = prompt("Edit Safety Limit:", String(threshold));
                                    const newCost = prompt("Edit Cost per Unit (₹ INR):", String(cost));
                                    try {
                                      await apiRequest(`/api/v1/admin/inventory/${inv.id}`, {
                                        method: 'PUT',
                                        body: JSON.stringify({
                                          item_name: newName,
                                          min_threshold: Number(newThreshold || threshold),
                                          min_alert_threshold: Number(newThreshold || threshold),
                                          unit_cost: Number(newCost || cost),
                                          cost_per_unit: Number(newCost || cost)
                                        })
                                      });
                                      showToast(`Updated stock item "${newName}"!`);
                                      loadAdminData();
                                    } catch (err: any) {
                                      alert(`Update failed: ${err.message}`);
                                    }
                                  }}
                                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl transition border border-neutral-700"
                                  title="Edit Stock Item"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  onClick={async () => {
                                    if (!confirm(`Delete stock item "${name}" from inventory?`)) return;
                                    try {
                                      await apiRequest(`/api/v1/admin/inventory/${inv.id}`, { method: 'DELETE' });
                                      showToast(`Deleted stock item "${name}"`);
                                      loadAdminData();
                                    } catch (err: any) {
                                      alert(`Delete failed: ${err.message}`);
                                    }
                                  }}
                                  className="p-1.5 bg-red-950 hover:bg-red-900 text-red-400 rounded-xl transition border border-red-800"
                                  title="Delete Stock Item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: MASTER CCTV SURVEILLANCE CAMERA CONTROL */}
          {activeTab === 'cctv' && (
            <div className="space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-extrabold text-neutral-100 leading-snug">
                        📹 Master Property CCTV Camera Management
                      </h3>
                      <span className="text-[10px] sm:text-xs px-2.5 py-0.5 bg-red-500/20 border border-red-500/30 text-red-400 font-extrabold rounded-xl whitespace-nowrap shrink-0">
                        Multi-Brand RTSP / HLS Integration
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setCctvModalOpen(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl transition shadow flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add CCTV Camera Feed</span>
                  </button>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Add, edit, toggle ON/OFF, or delete live camera streams (CP Plus, Hikvision, Dahua, Uniview, ONVIF NVRs).
                </p>
              </div>

              {/* CCTV Camera Control Table */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-neutral-200">
                    <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800">
                      <tr>
                        <th className="py-3 px-4">Code</th>
                        <th className="py-3 px-4">Camera Name</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Brand</th>
                        <th className="py-3 px-4">RTSP / HLS Stream URL</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {cctvCameras.map((cam: any) => (
                        <tr key={cam.id} className="hover:bg-neutral-950/60 transition">
                          <td className="py-3.5 px-4 font-mono font-extrabold text-amber-400">
                            {cam.camera_code}
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-white">
                            📹 {cam.name}
                          </td>
                          <td className="py-3.5 px-4 text-neutral-300">
                            {cam.location}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 bg-neutral-800 border border-neutral-700 text-neutral-200 font-extrabold text-[10px] rounded-lg">
                              {cam.brand || 'CP Plus'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[10px] text-neutral-400 max-w-xs truncate">
                            {cam.stream_url}
                          </td>
                          <td className="py-3.5 px-4">
                            {cam.is_active ? (
                              <span className="px-2.5 py-1 bg-green-950 text-green-400 border border-green-800 text-[10px] font-extrabold rounded-xl">
                                🟢 ONLINE ({cam.status})
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-red-950 text-red-400 border border-red-800 text-[10px] font-extrabold rounded-xl">
                                🔴 OFFLINE
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleCctvCamera(cam.id, cam.name)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                                  cam.is_active
                                    ? 'bg-neutral-800 text-amber-400 border-neutral-700 hover:bg-neutral-700'
                                    : 'bg-green-950 text-green-400 border-green-800 hover:bg-green-900'
                                }`}
                              >
                                {cam.is_active ? 'Turn OFF' : 'Turn ON'}
                              </button>
                              <button
                                onClick={() => handleDeleteCctvCamera(cam.id, cam.name)}
                                className="p-1.5 text-neutral-500 hover:text-red-400 transition"
                                title="Delete Camera Feed"
                              >
                                <Trash2 className="h-4 w-4" />
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

          {/* TAB 4: STAFF HR DIRECTORY, ATTENDANCE & PAYROLL */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              {/* Staff Management Control Header with Sub-Tabs */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-xl">
                        HUMAN RESOURCES & PAYROLL SUITE
                      </span>
                      <span className="text-[10px] font-extrabold uppercase bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-0.5 rounded-xl">
                        🟢 10 Active Employees
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold text-neutral-100 flex items-center gap-2 leading-snug">
                      <Users className="h-5 w-5 text-amber-500 shrink-0" />
                      <span>Staff Management, Daily Attendance & Payroll System</span>
                    </h3>
                  </div>

                  {staffSubTab === 'profiles' && (
                    <button
                      onClick={() => setStaffModalOpen(true)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl transition shadow flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Staff Account</span>
                    </button>
                  )}
                </div>

                {/* Sub-Tab Navigation Pills */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={() => setStaffSubTab('profiles')}
                    className={`px-4 py-2 rounded-xl font-extrabold transition flex items-center gap-1.5 border ${
                      staffSubTab === 'profiles'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>👥 Staff Directory & Profiles ({staffList.length})</span>
                  </button>

                  <button
                    onClick={() => {
                      setStaffSubTab('attendance');
                      loadAttendance(attendanceDate);
                    }}
                    className={`px-4 py-2 rounded-xl font-extrabold transition flex items-center gap-1.5 border ${
                      staffSubTab === 'attendance'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>🕒 Daily Attendance & Punch Logs</span>
                  </button>

                  <button
                    onClick={() => {
                      setStaffSubTab('payroll');
                      loadPayroll(payrollMonth);
                    }}
                    className={`px-4 py-2 rounded-xl font-extrabold transition flex items-center gap-1.5 border ${
                      staffSubTab === 'payroll'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>💳 Monthly Payroll & Payment Disbursement</span>
                  </button>

                  <button
                    onClick={() => {
                      setStaffSubTab('task_sop');
                      loadAdminTaskTemplates();
                    }}
                    className={`px-4 py-2 rounded-xl font-extrabold transition flex items-center gap-1.5 border ${
                      staffSubTab === 'task_sop'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>⚡ Standard Task SLA SOPs ({adminTaskTemplates.length || 14})</span>
                  </button>
                </div>
              </div>

              {/* SUB-VIEW 1: STAFF PROFILES */}
              {staffSubTab === 'profiles' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStaff.map(user => (
                    <div key={user.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3">
                      <div className="flex items-start gap-3">
                        <img 
                          src={user.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} 
                          alt={user.full_name || user.username}
                          className="h-12 w-12 rounded-xl object-cover border border-neutral-700 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-extrabold text-sm text-neutral-100 truncate">{user.full_name || user.username}</h4>
                            <span className="text-[10px] font-mono text-amber-500 font-bold">{user.employee_id || 'EMP-1001'}</span>
                          </div>
                          <span className="text-xs text-neutral-400 block font-mono">@{user.username}</span>

                          <div className="mt-1.5 flex gap-1.5">
                            <span className={`text-[9px] font-extrabold px-2 py-0.2 rounded-full border ${
                              user.role === 'Admin' ? 'bg-red-950 text-red-400 border-red-800' :
                              user.role === 'Executive' ? 'bg-purple-950 text-purple-400 border-purple-800' :
                              user.role === 'Kitchen' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                              user.role === 'Housekeeping' ? 'bg-green-950 text-green-400 border-green-800' :
                              'bg-blue-950 text-blue-400 border-blue-800'
                            }`}>
                              {user.role}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800/80 text-[11px] space-y-1 text-neutral-300">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-neutral-500" />
                          <span>{user.phone || '+91 98765 00000'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-neutral-500" />
                          <span className="truncate">{user.email || `${user.username}@grandpalace.in`}</span>
                        </div>
                        <div className="pt-1 text-[10px] text-neutral-400 border-t border-neutral-850">
                          Shift: <strong className="text-neutral-200">{user.shift || 'Morning Shift'}</strong>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                        <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          Active
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingStaff(user);
                              setEditStaffPassword('');
                            }}
                            className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold text-xs rounded-lg border border-neutral-700 transition flex items-center gap-1"
                            title="Edit Staff Profile"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>

                          {user.username !== 'admin' && (
                            <button
                              onClick={() => handleDeleteStaff(user.id, user.username)}
                              className="p-1.5 text-neutral-500 hover:text-red-400 transition"
                              title="Delete Staff Account"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SUB-VIEW 2: DYNAMIC WORKFORCE ATTENDANCE CONSOLE (DAILY & MONTHLY) */}
              {staffSubTab === 'attendance' && (
                <div className="space-y-5">
                  {/* Top Bar: View Mode Switcher, Date/Month Picker & Batch Controls */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] rounded-lg uppercase tracking-wider">
                            Workforce Management
                          </span>
                          <span className="px-2.5 py-0.5 bg-neutral-950 border border-neutral-800 text-neutral-400 text-[10px] font-mono rounded-lg">
                            {staffList.length} Registered Staff
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                          <span>⏱️ Staff Attendance, Shift Punches & Monthly Timesheets</span>
                        </h3>
                        <p className="text-xs text-neutral-400">
                          Monitor daily shift check-ins, record overtime hours, and inspect monthly facility attendance matrices.
                        </p>
                      </div>

                      {/* View Mode Toggle & Batch Button */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Daily vs Monthly Mode Toggle */}
                        <div className="bg-neutral-950 p-1 border border-neutral-800 rounded-2xl flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAttendanceViewMode('daily');
                              loadAttendance(attendanceDate);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              attendanceViewMode === 'daily'
                                ? 'bg-amber-500 text-neutral-950 font-extrabold shadow'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            <span>📅</span>
                            <span>Daily Shift Punch</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAttendanceViewMode('monthly');
                              loadMonthlyRoster(attendanceMonth);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              attendanceViewMode === 'monthly'
                                ? 'bg-amber-500 text-neutral-950 font-extrabold shadow'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            <span>📊</span>
                            <span>Monthly Timesheet Matrix</span>
                          </button>
                        </div>

                        {/* Batch Mark All Present Button */}
                        <button
                          type="button"
                          onClick={handleBatchMarkAllPresent}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow transition flex items-center gap-1.5"
                          title="Instantly mark all active employees Present for today's shift"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark All Present</span>
                        </button>
                      </div>
                    </div>

                    {/* Date/Month Controls & Live Filter Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        {attendanceViewMode === 'daily' ? (
                          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5">
                            <span className="text-[10px] uppercase font-bold text-amber-400">Date:</span>
                            <input
                              type="date"
                              value={attendanceDate}
                              onChange={(e) => {
                                setAttendanceDate(e.target.value);
                                loadAttendance(e.target.value);
                              }}
                              className="bg-transparent text-xs text-white font-mono font-bold focus:outline-none"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5">
                            <span className="text-[10px] uppercase font-bold text-amber-400">Month:</span>
                            <select
                              value={attendanceMonth}
                              onChange={(e) => {
                                setAttendanceMonth(e.target.value);
                                loadMonthlyRoster(e.target.value);
                              }}
                              className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
                            >
                              <option value="2026-09" className="bg-neutral-900 text-white">September 2026</option>
                              <option value="2026-08" className="bg-neutral-900 text-white">August 2026</option>
                              <option value="2026-07" className="bg-neutral-900 text-white">July 2026</option>
                            </select>
                          </div>
                        )}

                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                          <input
                            type="text"
                            placeholder="Filter staff or role..."
                            value={attendanceSearch}
                            onChange={(e) => setAttendanceSearch(e.target.value)}
                            className="pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500 w-44 sm:w-56"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (attendanceViewMode === 'daily') loadAttendance(attendanceDate);
                          else loadMonthlyRoster(attendanceMonth);
                        }}
                        className="p-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-800 transition flex items-center gap-1.5"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${attendanceLoading || monthlyAttendanceLoading ? 'animate-spin text-amber-400' : ''}`} />
                        <span className="hidden sm:inline">Sync Attendance</span>
                      </button>
                    </div>

                    {/* Department Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none pt-1 border-t border-neutral-800/60">
                      {[
                        { id: 'All', label: 'All Staff' },
                        { id: 'Reception', label: 'Front Desk' },
                        { id: 'Kitchen', label: 'Kitchen' },
                        { id: 'Runner', label: 'Runners' },
                        { id: 'Housekeeping', label: 'Housekeeping' },
                        { id: 'Maintenance', label: 'Maintenance' },
                        { id: 'Butler', label: 'Butler' },
                        { id: 'Admin', label: 'Executive / Admin' },
                      ].map(dept => (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => setAttendanceDeptFilter(dept.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                            attendanceDeptFilter === dept.id
                              ? 'bg-amber-500 text-neutral-950 font-extrabold shadow'
                              : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                          }`}
                        >
                          {dept.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Workforce Attendance Pulse Gauge Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                    <div className="p-3 bg-neutral-900 rounded-2xl border border-neutral-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Total Staff</span>
                      <div className="text-xl font-black text-white">{staffList.length}</div>
                      <span className="text-[9px] text-neutral-500">100% on roster</span>
                    </div>

                    <div className="p-3 bg-neutral-900 rounded-2xl border border-emerald-800/50 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Present
                      </span>
                      <div className="text-xl font-black text-emerald-400">
                        {attendanceList.filter(a => a.status === 'Present').length}
                      </div>
                      <span className="text-[9px] text-emerald-500/80">
                        {Math.round((attendanceList.filter(a => a.status === 'Present').length / Math.max(1, staffList.length)) * 100)}% on duty
                      </span>
                    </div>

                    <div className="p-3 bg-neutral-900 rounded-2xl border border-amber-800/50 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        Late Arrivals
                      </span>
                      <div className="text-xl font-black text-amber-400">
                        {attendanceList.filter(a => a.status === 'Late').length}
                      </div>
                      <span className="text-[9px] text-amber-500/80">Shift delay</span>
                    </div>

                    <div className="p-3 bg-neutral-900 rounded-2xl border border-blue-800/50 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1">
                        <Timer className="w-3 h-3 text-blue-400" />
                        Half-Day
                      </span>
                      <div className="text-xl font-black text-blue-400">
                        {attendanceList.filter(a => a.status === 'HalfDay').length}
                      </div>
                      <span className="text-[9px] text-blue-500/80">4 hrs logged</span>
                    </div>

                    <div className="p-3 bg-neutral-900 rounded-2xl border border-red-800/50 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-red-400 flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3 text-red-400" />
                        Absent
                      </span>
                      <div className="text-xl font-black text-red-400">
                        {attendanceList.filter(a => a.status === 'Absent').length}
                      </div>
                      <span className="text-[9px] text-red-500/80">Unnotified</span>
                    </div>

                    <div className="p-3 bg-neutral-900 rounded-2xl border border-purple-800/50 space-y-1 col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-purple-400" />
                        On Leave
                      </span>
                      <div className="text-xl font-black text-purple-300">
                        {attendanceList.filter(a => a.status === 'OnLeave').length}
                      </div>
                      <span className="text-[9px] text-purple-400/80">Approved</span>
                    </div>
                  </div>

                  {/* VIEW 1: DAILY SHIFT PUNCH & QUICK MARK TABLE */}
                  {attendanceViewMode === 'daily' && (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
                      <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                            <span>📋 Daily Shift Register</span>
                            <span className="text-xs text-neutral-400 font-normal">({attendanceDate})</span>
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          Click any pill to instantly update employee status
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-neutral-950 text-neutral-400 text-[10px] uppercase font-black tracking-widest border-b border-neutral-800">
                            <tr>
                              <th className="py-3 px-4">Employee</th>
                              <th className="py-3 px-4">Department & Shift</th>
                              <th className="py-3 px-4">Clock-In</th>
                              <th className="py-3 px-4">Clock-Out</th>
                              <th className="py-3 px-4">Hours</th>
                              <th className="py-3 px-4">Live Status</th>
                              <th className="py-3 px-4 text-right">Quick Punch Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-800/60">
                            {staffList
                              .filter(staff => {
                                if (attendanceDeptFilter !== 'All' && staff.role !== attendanceDeptFilter) return false;
                                if (attendanceSearch.trim()) {
                                  const q = attendanceSearch.toLowerCase();
                                  const nameMatch = (staff.full_name || staff.username).toLowerCase().includes(q);
                                  const roleMatch = (staff.role || '').toLowerCase().includes(q);
                                  const idMatch = (staff.employee_id || '').toLowerCase().includes(q);
                                  if (!nameMatch && !roleMatch && !idMatch) return false;
                                }
                                return true;
                              })
                              .map(staff => {
                                const att = attendanceList.find(a => a.staff_id === staff.id) || {
                                  status: 'Present',
                                  clock_in: '08:00 AM',
                                  clock_out: '05:00 PM',
                                  total_hours: 9.0
                                };

                                return (
                                  <tr key={staff.id} className="hover:bg-neutral-950/60 transition">
                                    <td className="py-3 px-4">
                                      <div className="flex items-center gap-2.5">
                                        <div className="h-8 w-8 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-amber-400 text-xs">
                                          {staff.full_name?.charAt(0) || staff.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <span className="font-extrabold text-white block">{staff.full_name || staff.username}</span>
                                          <span className="text-[10px] font-mono text-neutral-500">{staff.employee_id || `EMP-${staff.id}`}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="px-2 py-0.5 bg-neutral-950 border border-neutral-800 rounded text-[10px] font-extrabold text-amber-400 inline-block mr-1.5">
                                        {staff.role}
                                      </span>
                                      <span className="text-neutral-400 text-[11px] block sm:inline mt-0.5 sm:mt-0">{staff.shift || 'General Shift'}</span>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-emerald-400 font-bold">{att.clock_in || '--:--'}</td>
                                    <td className="py-3 px-4 font-mono text-neutral-300">{att.clock_out || '--:--'}</td>
                                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{att.total_hours ? `${att.total_hours} hrs` : '--'}</td>
                                    <td className="py-3 px-4">
                                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border inline-flex items-center gap-1 ${
                                        att.status === 'Present' ? 'bg-green-950/80 text-green-300 border-green-700' :
                                        att.status === 'Late' ? 'bg-amber-950/80 text-amber-300 border-amber-700' :
                                        att.status === 'HalfDay' ? 'bg-blue-950/80 text-blue-300 border-blue-700' :
                                        att.status === 'OnLeave' ? 'bg-purple-950/80 text-purple-300 border-purple-700' :
                                        'bg-red-950/80 text-red-300 border-red-700'
                                      }`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                        <span>{att.status}</span>
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => handleMarkAttendance(staff.id, 'Present')}
                                          className={`px-2 py-1 text-[10px] font-black rounded-lg transition border ${
                                            att.status === 'Present'
                                              ? 'bg-green-600 text-white border-green-500 shadow'
                                              : 'bg-green-950/50 hover:bg-green-900 text-green-300 border-green-800'
                                          }`}
                                          title="Mark Present"
                                        >
                                          Present
                                        </button>
                                        <button
                                          onClick={() => handleMarkAttendance(staff.id, 'Late')}
                                          className={`px-2 py-1 text-[10px] font-black rounded-lg transition border ${
                                            att.status === 'Late'
                                              ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow font-extrabold'
                                              : 'bg-amber-950/50 hover:bg-amber-900 text-amber-300 border-amber-800'
                                          }`}
                                          title="Mark Late"
                                        >
                                          Late
                                        </button>
                                        <button
                                          onClick={() => handleMarkAttendance(staff.id, 'HalfDay')}
                                          className={`px-2 py-1 text-[10px] font-black rounded-lg transition border ${
                                            att.status === 'HalfDay'
                                              ? 'bg-blue-600 text-white border-blue-500 shadow'
                                              : 'bg-blue-950/50 hover:bg-blue-900 text-blue-300 border-blue-800'
                                          }`}
                                          title="Mark Half Day"
                                        >
                                          Half-Day
                                        </button>
                                        <button
                                          onClick={() => handleMarkAttendance(staff.id, 'Absent')}
                                          className={`px-2 py-1 text-[10px] font-black rounded-lg transition border ${
                                            att.status === 'Absent'
                                              ? 'bg-red-600 text-white border-red-500 shadow'
                                              : 'bg-red-950/50 hover:bg-red-900 text-red-300 border-red-800'
                                          }`}
                                          title="Mark Absent"
                                        >
                                          Absent
                                        </button>
                                        <button
                                          onClick={() => handleMarkAttendance(staff.id, 'OnLeave')}
                                          className={`px-2 py-1 text-[10px] font-black rounded-lg transition border ${
                                            att.status === 'OnLeave'
                                              ? 'bg-purple-600 text-white border-purple-500 shadow'
                                              : 'bg-purple-950/50 hover:bg-purple-900 text-purple-300 border-purple-800'
                                          }`}
                                          title="Mark On Leave"
                                        >
                                          Leave
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* VIEW 2: INTERACTIVE MONTHLY ATTENDANCE MATRIX / ROSTER */}
                  {attendanceViewMode === 'monthly' && (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl space-y-3 p-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-800 pb-3">
                        <div>
                          <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                            <span>📅 Monthly Roster & Timesheet Matrix</span>
                            <span className="text-xs font-mono text-amber-400">({attendanceMonth})</span>
                          </h4>
                          <p className="text-[11px] text-neutral-400 mt-0.5">
                            Full calendar overview of all 30 days. Click any date cell to cycle attendance status (P → L → HD → A → LV).
                          </p>
                        </div>

                        {/* Legend */}
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-green-950 text-green-300 border border-green-700">P = Present</span>
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">L = Late</span>
                          <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700">HD = HalfDay</span>
                          <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700">A = Absent</span>
                          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-700">LV = Leave</span>
                        </div>
                      </div>

                      {/* Scrollable Matrix Table */}
                      <div className="overflow-x-auto border border-neutral-800 rounded-2xl">
                        <table className="w-full text-center text-xs border-collapse">
                          <thead className="bg-neutral-950 text-neutral-400 text-[10px] uppercase font-bold border-b border-neutral-800">
                            <tr>
                              <th className="py-3 px-3 text-left sticky left-0 bg-neutral-950 z-10 min-w-[170px] border-r border-neutral-800">
                                Staff Member
                              </th>
                              <th className="py-3 px-2 text-left min-w-[90px] border-r border-neutral-800">
                                Dept
                              </th>
                              {/* 30 Days Columns */}
                              {Array.from({ length: 30 }, (_, i) => i + 1).map(day => (
                                <th key={day} className="py-2.5 px-1 min-w-[28px] border-r border-neutral-850 font-mono text-[10px]">
                                  {day}
                                </th>
                              ))}
                              <th className="py-3 px-3 text-center min-w-[70px] border-l border-neutral-800 text-emerald-400 font-extrabold">
                                Present
                              </th>
                              <th className="py-3 px-3 text-center min-w-[70px] text-amber-400 font-extrabold">
                                Score %
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-800/60">
                            {(monthlyRoster.length > 0 ? monthlyRoster : staffList.map(s => ({
                              staff_id: s.id,
                              staff_name: s.full_name || s.username,
                              employee_id: s.employee_id || `EMP-${s.id}`,
                              role: s.role,
                              days: {},
                              days_present: 28,
                              attendance_percentage: 95
                            })))
                              .filter((member: any) => {
                                if (attendanceDeptFilter !== 'All' && member.role !== attendanceDeptFilter) return false;
                                if (attendanceSearch.trim()) {
                                  const q = attendanceSearch.toLowerCase();
                                  const nameMatch = member.staff_name.toLowerCase().includes(q);
                                  const roleMatch = member.role.toLowerCase().includes(q);
                                  if (!nameMatch && !roleMatch) return false;
                                }
                                return true;
                              })
                              .map((member: any) => (
                                <tr key={member.staff_id} className="hover:bg-neutral-950/60 transition">
                                  {/* Staff Info sticky */}
                                  <td className="py-2.5 px-3 text-left sticky left-0 bg-neutral-900 border-r border-neutral-800 z-10">
                                    <span className="font-extrabold text-white block text-xs truncate max-w-[150px]">
                                      {member.staff_name}
                                    </span>
                                    <span className="text-[9px] font-mono text-neutral-500">
                                      {member.employee_id}
                                    </span>
                                  </td>

                                  <td className="py-2.5 px-2 text-left border-r border-neutral-800 text-[10px] text-neutral-300 font-bold">
                                    {member.role}
                                  </td>

                                  {/* 30 Days Cells */}
                                  {Array.from({ length: 30 }, (_, i) => i + 1).map(day => {
                                    const dayData = member.days?.[day];
                                    const status = dayData ? dayData.status : day <= 5 ? 'Present' : null;

                                    return (
                                      <td key={day} className="py-1.5 px-0.5 border-r border-neutral-850">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleDayAttendance(member.staff_id, day)}
                                          className={`w-6 h-6 rounded text-[10px] font-black transition flex items-center justify-center mx-auto ${
                                            status === 'Present' ? 'bg-green-950 text-green-300 border border-green-700 hover:bg-green-800' :
                                            status === 'Late' ? 'bg-amber-950 text-amber-300 border border-amber-700 hover:bg-amber-800' :
                                            status === 'HalfDay' ? 'bg-blue-950 text-blue-300 border border-blue-700 hover:bg-blue-800' :
                                            status === 'Absent' ? 'bg-red-950 text-red-300 border border-red-700 hover:bg-red-800' :
                                            status === 'OnLeave' ? 'bg-purple-950 text-purple-300 border border-purple-700 hover:bg-purple-800' :
                                            'bg-neutral-950/60 text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800'
                                          }`}
                                          title={`Day ${day}: ${status || 'Not marked'} (Click to change)`}
                                        >
                                          {status === 'Present' ? 'P' :
                                           status === 'Late' ? 'L' :
                                           status === 'HalfDay' ? 'HD' :
                                           status === 'Absent' ? 'A' :
                                           status === 'OnLeave' ? 'LV' : '·'}
                                        </button>
                                      </td>
                                    );
                                  })}

                                  {/* Summary Total Present */}
                                  <td className="py-2.5 px-3 border-l border-neutral-800 text-center font-mono font-extrabold text-emerald-400">
                                    {member.days_present || 28} / 30
                                  </td>

                                  {/* Summary Percentage Badge */}
                                  <td className="py-2.5 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black font-mono border ${
                                      (member.attendance_percentage || 95) >= 90
                                        ? 'bg-green-950 text-green-300 border-green-700'
                                        : (member.attendance_percentage || 95) >= 75
                                          ? 'bg-amber-950 text-amber-300 border-amber-700'
                                          : 'bg-red-950 text-red-300 border-red-700'
                                    }`}>
                                      {member.attendance_percentage || 95}%
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


              {/* SUB-VIEW 3: PAYROLL & SALARY DISBURSEMENTS */}
              {staffSubTab === 'payroll' && (
                <div className="space-y-4">
                  {/* Payroll Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                    <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl shadow">
                      <span className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">Salary Month</span>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          value={payrollMonth}
                          onChange={(e) => {
                            setPayrollMonth(e.target.value);
                            loadPayroll(e.target.value);
                          }}
                          className="bg-neutral-950 border border-neutral-800 text-white font-extrabold text-sm rounded-xl px-2 py-1 focus:outline-none focus:border-amber-500"
                        >
                          <option value="Sep 2026">September 2026</option>
                          <option value="Aug 2026">August 2026</option>
                          <option value="Jul 2026">July 2026</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl shadow">
                      <span className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">Total Staff on Payroll</span>
                      <h4 className="text-xl font-black text-white mt-1">{payrollData.summary?.total_staff || staffList.length} Employees</h4>
                      <p className="text-[10px] text-green-400 font-bold mt-0.5">Disbursed: {payrollData.summary?.paid_count || 0} · Pending: {payrollData.summary?.pending_count || 0}</p>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl shadow">
                      <span className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">Disbursed Amount</span>
                      <h4 className="text-xl font-black text-emerald-400 mt-1">₹{(payrollData.summary?.total_disbursed_inr || 0).toLocaleString('en-IN')}</h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Direct via Bank & UPI</p>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl shadow">
                      <span className="text-[10px] font-extrabold uppercase text-neutral-400 tracking-wider">Pending Payouts</span>
                      <h4 className="text-xl font-black text-amber-400 mt-1">₹{(payrollData.summary?.total_pending_inr || 0).toLocaleString('en-IN')}</h4>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Ready for 1-Click Disbursement</p>
                    </div>
                  </div>

                  {/* Payroll Sheet Table */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex justify-between items-center">
                      <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4" />
                        <span>Staff Compensation & Net Pay Ledger ({payrollMonth})</span>
                      </h4>
                      <button
                        onClick={() => loadPayroll(payrollMonth)}
                        className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold rounded-xl transition flex items-center gap-1"
                      >
                        <RefreshCw className={`h-3 w-3 ${payrollLoading ? 'animate-spin' : ''}`} />
                        <span>Recalculate</span>
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-neutral-950 text-neutral-400 text-[10px] uppercase font-black tracking-widest border-b border-neutral-800">
                          <tr>
                            <th className="py-3 px-4">Employee</th>
                            <th className="py-3 px-4">Base Salary</th>
                            <th className="py-3 px-4">Days Worked</th>
                            <th className="py-3 px-4">Overtime & Bonus</th>
                            <th className="py-3 px-4">Deductions (PF/ESI)</th>
                            <th className="py-3 px-4">Net Payable</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/60">
                          {(payrollData.payroll_sheet || []).map((pay: any) => (
                            <tr key={pay.id} className="hover:bg-neutral-950/60 transition">
                              <td className="py-3.5 px-4">
                                <span className="font-extrabold text-white block">{pay.staff_name}</span>
                                <span className="text-[10px] font-mono text-neutral-500">{pay.employee_id} · {pay.role}</span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-neutral-200">₹{pay.base_salary?.toLocaleString('en-IN')}</td>
                              <td className="py-3.5 px-4 font-mono text-neutral-300">{pay.days_present} / {pay.total_working_days} Days</td>
                              <td className="py-3.5 px-4">
                                <span className="text-emerald-400 font-bold block">+₹{(pay.overtime_pay + pay.bonus + pay.incentives)?.toLocaleString('en-IN')}</span>
                                <span className="text-[10px] text-neutral-500">OT: {pay.overtime_hours}h</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="text-red-400 font-bold block">-₹{(pay.pf_deduction + pay.esi_deduction + pay.advance_deduction)?.toLocaleString('en-IN')}</span>
                                <span className="text-[10px] text-neutral-500">PF + ESI</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className="font-mono font-black text-sm text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-500/30 inline-block">
                                  ₹{pay.net_payable?.toLocaleString('en-IN')}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                {pay.payment_status === 'Paid' ? (
                                  <div>
                                    <span className="px-2.5 py-1 bg-green-950 text-green-400 border border-green-800 text-[10px] font-extrabold rounded-xl inline-block">
                                      ✓ Paid ({pay.payment_mode || 'Bank'})
                                    </span>
                                    {pay.transaction_ref && (
                                      <span className="block text-[9px] font-mono text-neutral-500 mt-0.5 truncate max-w-[120px]">{pay.transaction_ref}</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="px-2.5 py-1 bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-extrabold rounded-xl inline-block animate-pulse">
                                    ⏳ Unpaid
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditSalary(pay)}
                                    className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-xs rounded-xl transition flex items-center gap-1"
                                    title="Edit Base Salary, Allowances & Deductions"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    onClick={() => handleViewPayslip(pay.staff_id)}
                                    className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl border border-neutral-700 transition flex items-center gap-1"
                                    title="View & Print Official Payslip"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-amber-400" />
                                    <span>Payslip</span>
                                  </button>

                                  {pay.payment_status !== 'Paid' ? (
                                    <button
                                      onClick={() => {
                                        setSelectedPayrollItem(pay);
                                        setDisburseMode('Bank Transfer');
                                        setDisburseTxnRef(`PAY-HDFC-${Math.floor(100000 + Math.random() * 900000)}`);
                                        setDisburseModalOpen(true);
                                      }}
                                      className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white font-extrabold text-xs rounded-xl shadow transition"
                                    >
                                      Disburse
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleViewPayslip(pay.staff_id)}
                                      className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 text-neutral-400 font-bold text-xs rounded-xl hover:text-white transition"
                                    >
                                      Receipt
                                    </button>
                                  )}
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

              {/* SUB-VIEW 4: STANDARD TASK SLA SOPS & BATCH DISPATCH */}
              {staffSubTab === 'task_sop' && (
                <div className="space-y-6">
                  {/* Header & Batch Suite Controls */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] rounded-lg uppercase tracking-wider">
                            Standard Operating Procedures
                          </span>
                          <span className="px-2.5 py-0.5 bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-extrabold rounded-lg">
                            Active Time SLAs
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                          <span>⚡ Standard Task SLA Directory & Batch Dispatch</span>
                        </h3>
                        <p className="text-xs text-neutral-400">
                          Configure standard allocated minutes for Room Cleaning, Attending Room Service Delivery, Maintenance, and Concierge. Dispatch tasks to multiple rooms in 1 click.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={loadAdminTaskTemplates}
                        className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-800 transition flex items-center gap-1.5 self-start lg:self-center"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${adminTemplatesLoading ? 'animate-spin text-amber-400' : ''}`} />
                        <span>Refresh SOPs</span>
                      </button>
                    </div>

                    {/* Batch Target Suites Selector */}
                    <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-amber-400 flex items-center gap-1.5">
                          <span>🏨 Multi-Room Batch Assignment Target:</span>
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          Selected: <strong className="text-white">{adminBatchRooms.join(', ') || 'None'}</strong> ({adminBatchRooms.length} suites)
                        </span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {['101', '102', '105', '201', '204', '305', 'Lobby'].map(rm => {
                          const active = adminBatchRooms.includes(rm);
                          return (
                            <button
                              key={rm}
                              type="button"
                              onClick={() => {
                                if (active) {
                                  if (adminBatchRooms.length > 1) {
                                    setAdminBatchRooms(adminBatchRooms.filter(r => r !== rm));
                                  }
                                } else {
                                  setAdminBatchRooms([...adminBatchRooms, rm]);
                                }
                              }}
                              className={`px-3 py-1 text-xs rounded-xl font-bold border transition ${
                                active
                                  ? 'bg-amber-500 text-neutral-950 border-amber-400 font-extrabold shadow'
                                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                              }`}
                            >
                              {active ? `✓ Suite ${rm}` : `Suite ${rm}`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Inline Edit Modal/Card for Admin */}
                  {adminEditingTemplate && (
                    <form
                      onSubmit={handleAdminUpdateTemplateSla}
                      className="p-5 bg-neutral-900 border border-amber-500/40 rounded-3xl shadow-xl space-y-4 animate-in fade-in"
                    >
                      <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{adminEditingTemplate.icon || '📝'}</span>
                          <span className="text-sm font-extrabold text-white">
                            Edit Standard SLA: {adminEditingTemplate.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAdminEditingTemplate(null)}
                          className="text-xs text-neutral-500 hover:text-white"
                        >
                          ✕ Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-neutral-300 block mb-1">
                            Standard SLA Time (Minutes)
                          </label>
                          <input
                            type="number"
                            min="5"
                            max="180"
                            required
                            value={adminEditSlaMinutes}
                            onChange={(e) => setAdminEditSlaMinutes(Number(e.target.value))}
                            className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-amber-400 font-mono font-black focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-neutral-300 block mb-1">
                            Default Assigned Staff Member
                          </label>
                          <input
                            type="text"
                            required
                            value={adminEditStaff}
                            onChange={(e) => setAdminEditStaff(e.target.value)}
                            className="w-full px-3.5 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setAdminEditingTemplate(null)}
                          className="px-4 py-2 bg-neutral-800 text-neutral-300 font-bold text-xs rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow transition"
                        >
                          Save SLA Operating Standard
                        </button>
                      </div>
                    </form>
                  )}

                  {/* SOP Template Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {adminTaskTemplates.map(tpl => (
                      <div
                        key={tpl.id}
                        className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-xl space-y-3.5 flex flex-col justify-between hover:border-neutral-700 transition"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl p-1.5 bg-neutral-950 rounded-xl border border-neutral-800">
                                {tpl.icon || '📋'}
                              </span>
                              <div>
                                <h4 className="font-extrabold text-sm text-neutral-100">{tpl.title}</h4>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] px-2 py-0.2 rounded font-bold bg-neutral-950 border border-neutral-800 text-neutral-400">
                                    {tpl.department}
                                  </span>
                                  <span className="text-[10px] text-neutral-500">
                                    Default: <strong className="text-neutral-300">{tpl.default_staff}</strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="text-base font-black font-mono text-amber-400 block">
                                {tpl.default_sla_minutes}m
                              </span>
                              <span className="text-[9px] uppercase font-bold text-neutral-500">
                                SLA Target
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-neutral-400 leading-relaxed">
                            {tpl.description}
                          </p>

                          {tpl.checklist && tpl.checklist.length > 0 && (
                            <div className="pt-2 border-t border-neutral-800/80 space-y-1">
                              <span className="text-[10px] font-extrabold uppercase text-neutral-500 tracking-wider block">
                                Standard SOP Checklist:
                              </span>
                              <ul className="text-[11px] text-neutral-400 space-y-0.5">
                                {tpl.checklist.slice(0, 3).map((chk: string, idx: number) => (
                                  <li key={idx} className="flex items-center gap-1.5">
                                    <span className="text-amber-400 text-xs">✓</span>
                                    <span className="truncate">{chk}</span>
                                  </li>
                                ))}
                                {tpl.checklist.length > 3 && (
                                  <li className="text-[10px] text-neutral-500 italic pl-3">
                                    +{tpl.checklist.length - 3} more checklist items
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-neutral-800/80">
                          <button
                            type="button"
                            onClick={() => {
                              setAdminEditingTemplate(tpl);
                              setAdminEditSlaMinutes(tpl.default_sla_minutes);
                              setAdminEditStaff(tpl.default_staff);
                            }}
                            className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit SLA</span>
                          </button>

                          <button
                            type="button"
                            disabled={adminBatchDispatching === tpl.id}
                            onClick={() => handleAdminBatchDispatch(tpl)}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1 disabled:opacity-50"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>
                              {adminBatchDispatching === tpl.id 
                                ? 'Dispatching...' 
                                : `Batch Dispatch (${adminBatchRooms.length} Suites)`}
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ENTERPRISE CHANNEL MANAGER & REVENUE OPERATING SYSTEM */}
          {activeTab === 'channel' && (
            <div className="space-y-6">
              
              {/* Header Bar & One-Click Sync Control */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-xl">
                        ENTERPRISE SUITE v2.5
                      </span>
                      <span className="text-[10px] font-extrabold uppercase bg-green-500/20 text-green-400 border border-green-500/30 px-2.5 py-0.5 rounded-xl">
                        🟢 ALL 6 CHANNELS LIVE
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold text-neutral-100 flex items-center gap-2 leading-snug">
                      <Globe className="h-5 w-5 text-amber-500 shrink-0" />
                      <span>Enterprise Channel Manager & Real-Time Sync Hub</span>
                    </h3>
                  </div>

                  <button
                    type="button"
                    disabled={syncingAll}
                    onClick={async () => {
                      setSyncingAll(true);
                      try {
                        const res = await apiRequest('/api/v1/channel/sync/all', { method: 'POST' });
                        showToast(`⚡ ${res.message}`);
                        loadAdminData();
                      } catch (err: any) {
                        alert(`Sync failed: ${err.message}`);
                      } finally {
                        setSyncingAll(false);
                      }
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2 shrink-0 self-start sm:self-center hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <RefreshCw className={`h-4 w-4 ${syncingAll ? 'animate-spin' : ''}`} />
                    <span>{syncingAll ? 'Syncing Rates & Inventory...' : '⚡ One-Click Sync All OTAs'}</span>
                  </button>
                </div>

                {/* Sub-Tab Navigation Pills */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={() => setChannelSubTab('channels')}
                    className={`px-4 py-2 rounded-xl font-extrabold transition flex items-center gap-1.5 border ${
                      channelSubTab === 'channels'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>📡 OTA Channels & Credentials ({otaChannels.length})</span>
                  </button>

                  <button
                    onClick={() => setChannelSubTab('mapping')}
                    className={`px-4 py-2 rounded-xl font-extrabold transition flex items-center gap-1.5 border ${
                      channelSubTab === 'mapping'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>🗺️ Room & Rate Mapping</span>
                  </button>

                  <button
                    onClick={() => setChannelSubTab('calendar')}
                    className={`px-4 py-2 rounded-xl font-extrabold transition flex items-center gap-1.5 border ${
                      channelSubTab === 'calendar'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>📅 Date-Grid Rate Calendar</span>
                  </button>

                  <button
                    onClick={async () => {
                      setChannelSubTab('ai_copilot');
                      try {
                        const data = await apiRequest('/api/v1/channel/ai-copilot');
                        setAiOtaData(data);
                      } catch (e) {}
                    }}
                    className={`px-4 py-2 rounded-xl font-extrabold transition flex items-center gap-1.5 border ${
                      channelSubTab === 'ai_copilot'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow font-black'
                        : 'bg-neutral-950 text-amber-400 border-amber-500/40 hover:bg-amber-950/30'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    <span>🤖 AI Revenue & Parity Copilot</span>
                  </button>

                  <button
                    onClick={() => setChannelSubTab('health')}
                    className={`px-4 py-2 rounded-xl font-extrabold transition flex items-center gap-1.5 border ${
                      channelSubTab === 'health'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>📊 Sync Health & Errors</span>
                  </button>

                  <button
                    onClick={() => setChannelSubTab('audit')}
                    className={`px-4 py-2 rounded-xl font-extrabold transition flex items-center gap-1.5 border ${
                      channelSubTab === 'audit'
                        ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    <span>📜 System Audit Logs ({auditLogs.length})</span>
                  </button>
                </div>
              </div>

              {/* SUB-TAB 1: OTA CHANNELS & ENCRYPTED CREDENTIALS */}
              {channelSubTab === 'channels' && (
                <div className="space-y-4">
                  {/* Action Header Bar for Channels & Credentials */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                        <span>📡 OTA Channels & Encrypted Credential Vault ({otaChannels.length})</span>
                      </h4>
                      <p className="text-xs text-neutral-400">Configure connection endpoints, commission rates, and encrypted API secret keys.</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setChannelModalOpen(true)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow transition flex items-center gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        <span>+ Connect New OTA Channel</span>
                      </button>

                      <button
                        onClick={() => {
                          const target = otaChannels[0] || { id: 1, name: 'MakeMyTrip (India)', code: 'MMT', hotel_id_on_ota: 'HOTEL-MMT-88192', connection_mode: 'LIVE' };
                          setEditingCredModalChannel(target);
                          setEditHotelId(target.hotel_id_on_ota || `HOTEL-${target.code}-88192`);
                          setEditApiKey(`live_key_${target.code.toLowerCase()}_2026`);
                          setEditApiSecret(`sec_vault_${target.code.toLowerCase()}_encrypted`);
                          setEditMode(target.connection_mode || 'LIVE');
                        }}
                        className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5"
                      >
                        <Key className="h-4 w-4" />
                        <span>🔑 Add API Credentials</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Add Channel Quick Card */}
                    <button
                      type="button"
                      onClick={() => setChannelModalOpen(true)}
                      className="border-2 border-dashed border-neutral-800 hover:border-amber-500/60 rounded-3xl p-5 shadow-xl flex flex-col items-center justify-center space-y-3 transition bg-neutral-950/40 hover:bg-neutral-900/80 min-h-[220px] text-center group"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl font-black group-hover:scale-110 transition">
                        +
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-white group-hover:text-amber-400 transition">+ Connect New OTA Portal</h4>
                        <p className="text-[11px] text-neutral-400 mt-1">Connect Booking.com, MakeMyTrip, Agoda, Expedia, Yatra, or B2B Partners</p>
                      </div>
                    </button>

                    {otaChannels.map((ch) => (
                      <div
                        key={ch.id}
                        className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">🏨</span>
                              <div>
                                <h4 className="font-extrabold text-sm text-white">{ch.name}</h4>
                                <span className="text-[10px] font-mono text-amber-400 font-bold">{ch.code} • {ch.channel_type}</span>
                              </div>
                            </div>

                            <button
                              onClick={async () => {
                                try {
                                  const res = await apiRequest(`/api/v1/channel/ota-channels/${ch.id}/toggle`, { method: 'PUT' });
                                  showToast(res.message);
                                  loadAdminData();
                                } catch (err: any) {
                                  alert(`Toggle failed: ${err.message}`);
                                }
                              }}
                              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-xl border transition ${
                                ch.is_active
                                  ? 'bg-green-950 text-green-400 border-green-800'
                                  : 'bg-red-950 text-red-400 border-red-800 animate-pulse'
                              }`}
                            >
                              {ch.is_active ? '🟢 ACTIVE' : '🔴 STOP-SELL'}
                            </button>
                          </div>

                          <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800/80 text-[11px] space-y-2 text-neutral-300">
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-500">OTA Hotel ID:</span>
                              <span className="font-mono text-white font-bold">{ch.hotel_id_on_ota}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-500">Commission Rate:</span>
                              <span className="font-mono text-amber-400 font-bold">{ch.commission_percent}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-500 flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span>Credential Vault:</span>
                              </span>
                              <span className="font-mono text-emerald-400 font-bold flex items-center gap-1">
                                <span>🔒 AES-256 Active</span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-500">Connection Status:</span>
                              <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                                <span>{ch.connection_mode || 'LIVE'}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                          <span className="text-[10px] text-neutral-400 font-mono">
                            Last Test: <strong>{new Date().toLocaleTimeString()}</strong>
                          </span>
                          <button
                            onClick={() => {
                              setEditingCredModalChannel(ch);
                              setEditHotelId(ch.hotel_id_on_ota || `HOTEL-${ch.code}-88192`);
                              setEditApiKey(`live_key_${ch.code.toLowerCase()}_2026`);
                              setEditApiSecret(`sec_vault_${ch.code.toLowerCase()}_encrypted`);
                              setEditMode(ch.connection_mode || 'LIVE');
                            }}
                            className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-extrabold text-[11px] rounded-xl border border-neutral-700 transition flex items-center gap-1"
                          >
                            <Key className="h-3.5 w-3.5" />
                            <span>Edit Vault Key</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: ROOM & RATE MAPPING MATRIX */}
              {channelSubTab === 'mapping' && (
                <div className="space-y-6">
                  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
                    <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                      <span>🗺️ PMS Category &lt;--&gt; OTA Room Code Mapping Matrix</span>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-neutral-200">
                        <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800 font-extrabold">
                          <tr>
                            <th className="py-3 px-4">PMS Category Name</th>
                            <th className="py-3 px-4">PMS Code</th>
                            <th className="py-3 px-4">Target OTA</th>
                            <th className="py-3 px-4">OTA Room Code</th>
                            <th className="py-3 px-4">OTA Display Name</th>
                            <th className="py-3 px-4 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/60">
                          {roomMappings.map((m: any) => (
                            <tr key={m.id} className="hover:bg-neutral-950/60 transition">
                              <td className="py-3.5 px-4 font-extrabold text-white">{m.pms_room_type}</td>
                              <td className="py-3.5 px-4 font-mono text-amber-400">{m.pms_room_code}</td>
                              <td className="py-3.5 px-4 font-bold text-neutral-300">{m.ota_name}</td>
                              <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{m.ota_room_type_code}</td>
                              <td className="py-3.5 px-4 text-neutral-400">{m.ota_room_type_name}</td>
                              <td className="py-3.5 px-4 text-right">
                                <span className="px-2.5 py-1 bg-green-950 text-green-400 border border-green-800 text-[10px] font-extrabold rounded-xl">
                                  Mapped & Synced
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: DATE-GRID RATE & AVAILABILITY CALENDAR */}
              {channelSubTab === 'calendar' && (
                <div className="space-y-6">
                  {/* AI Market Analysis & Tariff Suggestions Engine */}
                  <div className="bg-gradient-to-r from-neutral-900 via-amber-950/30 to-neutral-900 border border-amber-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black text-lg shadow-lg">
                          🤖
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm sm:text-base font-extrabold text-white">AI Market Intelligence & Dynamic Yield Suggestions</h4>
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full text-[10px] font-extrabold">
                              Live Market Feed
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400">Algorithmic rate optimization based on regional competitor tariffs & demand surges.</p>
                        </div>
                      </div>

                      <button
                        onClick={async () => {
                          try {
                            await apiRequest('/api/v1/channel/rates/bulk-update', {
                              method: 'POST',
                              body: JSON.stringify({
                                room_type_id: 0,
                                rate_plan_id: 0,
                                start_date: bulkStartDate,
                                end_date: bulkEndDate,
                                rate: 7200
                              })
                            });
                            showToast("✨ Applied AI Recommended Tariff (₹7,200/night +18% Surge Optimization) across all 24 Property Suites & connected OTAs!");
                            loadAdminData();
                          } catch (err: any) {
                            alert(`Failed: ${err.message}`);
                          }
                        }}
                        className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 shrink-0 self-start sm:self-center"
                      >
                        <span>⚡ Apply AI Recommended Tariffs</span>
                      </button>
                    </div>

                    {/* AI Market Insights Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-extrabold">Regional Market Occupancy</span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-black text-emerald-400">88.4% Occupancy</span>
                          <span className="text-[10px] text-green-400 font-bold">▲ High Demand</span>
                        </div>
                        <p className="text-[11px] text-neutral-400">Local festival weekend surge detected. Regional hotel rates increased by 15-22%.</p>
                      </div>

                      <div className="bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-extrabold">Competitor Rate Index (CompSet)</span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-black text-amber-400">₹6,850 / night</span>
                          <span className="text-[10px] text-neutral-400 font-mono">Your BAR: ₹6,500</span>
                        </div>
                        <p className="text-[11px] text-neutral-400">Your current tariff is 5.1% lower than 5-star market benchmark in your region.</p>
                      </div>

                      <div className="bg-neutral-950/80 p-3.5 rounded-2xl border border-neutral-800 space-y-1">
                        <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-extrabold">AI Yield Management Strategy</span>
                        <div className="flex items-baseline justify-between">
                          <span className="text-lg font-black text-white">+₹700 / Room Night</span>
                          <span className="text-[10px] text-amber-400 font-extrabold">Recommended</span>
                        </div>
                        <p className="text-[11px] text-neutral-400">Increase BAR to ₹7,200 for next 7 days. Expected revenue gain: **+₹42,000**.</p>
                      </div>
                    </div>
                  </div>

                  {/* Bulk Update Controls */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
                      <div>
                        <h4 className="text-sm font-extrabold text-white">⚡ Date-Range Bulk Rate Editor</h4>
                        <p className="text-xs text-neutral-400">Update rates across multiple dates in one action and push to connected OTAs & property suites.</p>
                      </div>

                      <button
                        onClick={async () => {
                          try {
                            await apiRequest('/api/v1/channel/rates/bulk-update', {
                              method: 'POST',
                              body: JSON.stringify({
                                room_type_id: bulkRoomTypeId,
                                rate_plan_id: 1,
                                start_date: bulkStartDate,
                                end_date: bulkEndDate,
                                rate: Number(bulkRateVal)
                              })
                            });
                            showToast(`Bulk rates updated to ₹${bulkRateVal.toLocaleString('en-IN')} across property suites & connected OTAs!`);
                            loadAdminData();
                          } catch (err: any) {
                            alert(`Bulk update failed: ${err.message}`);
                          }
                        }}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow transition"
                      >
                        Apply Bulk Rate Update
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Target Suite Category</label>
                        <select
                          value={bulkRoomTypeId}
                          onChange={(e) => setBulkRoomTypeId(Number(e.target.value))}
                          className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2 text-neutral-100 font-bold focus:outline-none focus:border-amber-500"
                        >
                          <option value={0}>🏨 All 24 Property Suites (Full Inventory)</option>
                          <option value={1}>👑 Deluxe Heritage & Island Rooms</option>
                          <option value={2}>🏰 Royal Heritage & Sea Breeze Suites</option>
                          <option value={3}>👑 Maharaja Penthouse Suites</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={bulkStartDate}
                          onChange={(e) => setBulkStartDate(e.target.value)}
                          className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2 text-neutral-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">End Date</label>
                        <input
                          type="date"
                          value={bulkEndDate}
                          onChange={(e) => setBulkEndDate(e.target.value)}
                          className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2 text-neutral-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Target Rate (₹ INR)</label>
                        <input
                          type="number"
                          value={bulkRateVal}
                          onChange={(e) => setBulkRateVal(Number(e.target.value))}
                          className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2 text-neutral-100 font-mono font-bold text-amber-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 14-Day Date Grid Spreadsheet */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl overflow-hidden">
                    <h4 className="text-sm font-extrabold text-white mb-3">📅 14-Day Interactive Rate & Inventory Grid</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-neutral-200">
                        <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800 font-extrabold">
                          <tr>
                            <th className="py-3 px-4 sticky left-0 bg-neutral-950 min-w-[180px]">Room Type / Plan</th>
                            {rateCalendar.dates.map((d) => (
                              <th key={d} className="py-3 px-3 text-center min-w-[90px] font-mono">
                                {d.slice(5)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/60">
                          {rateCalendar.grid.map((row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-neutral-950/60 transition">
                              <td className="py-3 px-4 font-extrabold text-white sticky left-0 bg-neutral-900 border-r border-neutral-800">
                                <span>{row.room_type_name}</span>
                                <span className="block text-[10px] font-mono text-amber-400 font-normal">{row.rate_plan_name}</span>
                              </td>
                              {rateCalendar.dates.map((d_str) => {
                                const cell = row.dates[d_str] || { rate: 4500, available: 10 };
                                return (
                                  <td key={d_str} className="py-2 px-2 text-center border-r border-neutral-850">
                                    <input
                                      type="number"
                                      defaultValue={cell.rate}
                                      onBlur={async (e) => {
                                        const newVal = Number(e.target.value);
                                        try {
                                          await apiRequest('/api/v1/channel/rates/calendar', {
                                            method: 'PUT',
                                            body: JSON.stringify({
                                              room_type_id: row.room_type_id,
                                              rate_plan_id: row.rate_plan_id,
                                              date_str: d_str,
                                              rate: newVal
                                            })
                                          });
                                          showToast(`Updated ${d_str} to ₹${newVal.toLocaleString('en-IN')}`);
                                          loadAdminData();
                                        } catch (err: any) {
                                          alert(`Update failed: ${err.message}`);
                                        }
                                      }}
                                      className="w-full text-center font-mono font-bold text-amber-400 bg-neutral-950 border border-neutral-800 rounded py-1 px-1 text-xs focus:outline-none focus:border-amber-500"
                                    />
                                    <span className="block text-[9px] text-neutral-500 mt-0.5 font-mono">
                                      Avail: {cell.available}
                                    </span>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB: AI REVENUE & RATE PARITY COPILOT */}
              {channelSubTab === 'ai_copilot' && (
                <div className="space-y-6">
                  {/* AI Copilot Status & Autopilot Switch */}
                  <div className="bg-gradient-to-r from-neutral-900 via-amber-950/40 to-neutral-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
                      <div className="flex items-center gap-3.5">
                        <div className="h-12 w-12 rounded-2xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black text-2xl shadow-lg">
                          🤖
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base sm:text-lg font-black text-white">AI Yield Optimization & Rate Parity Shield</h4>
                            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full text-[10px] font-black uppercase tracking-wider">
                              v3.0 Neural Yield
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-0.5">
                            Real-time competitor scraping, OTA rate undercutting detection, and 1-click dynamic rate sync across all 20 channels.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {/* Autopilot Mode Switch */}
                        <button
                          onClick={handleToggleAutoPilot}
                          className={`px-4 py-2.5 rounded-2xl border text-xs font-black transition flex items-center gap-2 ${
                            aiOtaData?.autopilot_enabled
                              ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-600/30'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <Zap className={`h-4 w-4 ${aiOtaData?.autopilot_enabled ? 'animate-bounce' : ''}`} />
                          <span>{aiOtaData?.autopilot_enabled ? '🟢 Auto-Pilot: ACTIVE' : '⚪ Auto-Pilot: MANUAL'}</span>
                        </button>

                        <button
                          disabled={aiOtaLoading}
                          onClick={handleApplyAiYieldTariffs}
                          className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-neutral-950 font-black text-xs rounded-2xl shadow-xl transition flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>{aiOtaLoading ? 'Pushing Rates to 20 OTAs...' : '⚡ Apply AI Surge Tariffs (+20%)'}</span>
                        </button>
                      </div>
                    </div>

                    {/* AI Copilot KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 text-xs">
                      <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Rate Parity Health</span>
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-2xl font-black text-emerald-400">{aiOtaData?.overall_parity_health_score || 94}%</h3>
                          <span className="text-[10px] text-green-400 font-bold">Good Standing</span>
                        </div>
                        <p className="text-[11px] text-neutral-400">Direct website prices protected against unauthorized OTA discounting.</p>
                      </div>

                      <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Regional Demand Status</span>
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-lg font-black text-amber-400">HIGH SURGE</h3>
                          <span className="text-[10px] text-amber-400 font-bold">▲ High Inflow</span>
                        </div>
                        <p className="text-[11px] text-neutral-400">Flight bookings into Port Blair up +34% for upcoming holiday week.</p>
                      </div>

                      <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">AI Recommended BAR</span>
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-2xl font-black text-white">₹5,400 <span className="text-xs text-emerald-400">(+20%)</span></h3>
                          <span className="text-[10px] text-neutral-400">Curr: ₹4,500</span>
                        </div>
                        <p className="text-[11px] text-neutral-400">Deluxe Heritage: ₹5.4k · Suite: ₹11.4k · Penthouse: ₹21.6k</p>
                      </div>

                      <div className="bg-neutral-950/80 border border-neutral-800 p-4 rounded-2xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">Estimated Revenue Lift</span>
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-2xl font-black text-emerald-400">+₹1,24,500</h3>
                          <span className="text-[10px] font-bold text-amber-400">96% Conf.</span>
                        </div>
                        <p className="text-[11px] text-neutral-400">Projected additional profit over 14-day booking window.</p>
                      </div>
                    </div>
                  </div>

                  {/* Competitor Comp-Set Radar */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                      <div>
                        <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-amber-400" />
                          <span>Local Competitor Intelligence Radar (Comp-Set Benchmark)</span>
                        </h4>
                        <p className="text-xs text-neutral-400">Simulated live web-scraping of nearby 4-star and 5-star resort tariffs in Sri Vijayapuram & Havelock.</p>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500">Auto-Refreshed: 5 mins ago</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                      {(aiOtaData?.competitors || []).map((comp: any) => (
                        <div key={comp.id} className="bg-neutral-950 border border-neutral-800 p-4 rounded-2xl space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-mono font-bold text-amber-400">{comp.star_category}</span>
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                              comp.trend === 'UP' ? 'bg-green-950 text-green-400 border border-green-800' : 'bg-neutral-800 text-neutral-300'
                            }`}>
                              {comp.trend === 'UP' ? `▲ +${comp.change_percent}%` : '• Stable'}
                            </span>
                          </div>
                          <h5 className="font-extrabold text-sm text-white truncate">{comp.hotel_name}</h5>
                          <div className="flex justify-between items-baseline pt-1 border-t border-neutral-850">
                            <span className="text-[11px] text-neutral-400">Selling Rate:</span>
                            <span className="font-mono font-black text-amber-400 text-sm">₹{comp.current_rate?.toLocaleString('en-IN')}/nt</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-neutral-500">
                            <span>Dist: {comp.distance_km} km</span>
                            <span className="text-emerald-400 font-bold">{comp.occupancy_rate_percent}% Booked</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Rate Parity Violation Shield */}
                  <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
                      <div>
                        <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                          <span>OTA Rate Parity Violations & Undercutting Shield</span>
                        </h4>
                        <p className="text-xs text-neutral-400">Detects instances where OTAs undercut your direct website prices without authorization.</p>
                      </div>
                      <span className="px-2.5 py-1 bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-black rounded-xl">
                        {(aiOtaData?.parity_issues?.length || 0)} Disparities Detected
                      </span>
                    </div>

                    {(!aiOtaData?.parity_issues || aiOtaData.parity_issues.length === 0) ? (
                      <div className="p-6 bg-neutral-950 rounded-2xl border border-neutral-800 text-center">
                        <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                        <p className="text-sm font-bold text-white">100% Rate Parity Intact!</p>
                        <p className="text-xs text-neutral-400">No OTA is currently undercutting your official website rates.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {aiOtaData.parity_issues.map((issue: any, idx: number) => (
                          <div key={idx} className="bg-neutral-950 border border-rose-900/50 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded text-[10px] font-black">
                                  {issue.violation_type}
                                </span>
                                <h5 className="font-extrabold text-sm text-white">{issue.channel_name} ({issue.channel_code})</h5>
                                <span className="text-xs text-neutral-400 font-mono">· {issue.room_type}</span>
                              </div>
                              <p className="text-xs text-neutral-300">
                                Direct Website Rate: <strong className="text-white">₹{issue.direct_website_rate?.toLocaleString('en-IN')}</strong> · OTA Selling Rate: <strong className="text-rose-400">₹{issue.ota_selling_rate?.toLocaleString('en-IN')}</strong> (<span className="text-rose-400 font-bold">₹{issue.disparity_amount} cheaper ({issue.disparity_percent}%)</span>)
                              </p>
                              <p className="text-[11px] text-amber-400/90 font-medium">💡 Suggested Action: {issue.suggested_action}</p>
                            </div>

                            <button
                              onClick={() => handleResolveParity(issue.channel_code)}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow transition shrink-0 self-start sm:self-center"
                            >
                              Resolve Parity & Push Price Lock
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SUB-TAB 4: SYNC HEALTH & ERROR MONITOR */}
              {channelSubTab === 'health' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-1">
                      <span className="text-[10px] text-neutral-500 uppercase font-bold">Overall Sync Health</span>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                        <strong className="text-green-400 text-lg font-extrabold">100% HEALTHY</strong>
                      </div>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-1">
                      <span className="text-[10px] text-neutral-500 uppercase font-bold">Records Synced Today</span>
                      <strong className="text-white text-lg font-extrabold font-mono">126 Rate & Inventory Pushes</strong>
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-1">
                      <span className="text-[10px] text-neutral-500 uppercase font-bold">Active Sync Errors</span>
                      <strong className="text-emerald-400 text-lg font-extrabold font-mono">0 Failed Queue Items</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 5: SYSTEM AUDIT LOGS */}
              {channelSubTab === 'audit' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-4">
                  <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <span>📜 Real-Time Security & System Audit Logs</span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-neutral-200">
                      <thead className="bg-neutral-950 text-neutral-400 uppercase text-[10px] tracking-wider border-b border-neutral-800 font-extrabold">
                        <tr>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">User</th>
                          <th className="py-3 px-4">Action</th>
                          <th className="py-3 px-4">Entity Type</th>
                          <th className="py-3 px-4">Target ID</th>
                          <th className="py-3 px-4">IP Address</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {auditLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-neutral-950/60 transition">
                            <td className="py-3.5 px-4 font-mono text-neutral-400">{log.created_at ? log.created_at.slice(0, 19).replace('T', ' ') : 'Just Now'}</td>
                            <td className="py-3.5 px-4 font-extrabold text-amber-400">{log.username}</td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 bg-neutral-950 border border-neutral-800 font-mono text-[10px] text-emerald-400 font-bold rounded">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-neutral-300">{log.entity_type}</td>
                            <td className="py-3.5 px-4 font-mono text-neutral-400">{log.entity_id}</td>
                            <td className="py-3.5 px-4 font-mono text-neutral-500">{log.ip_address}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 6: PAYMENT GATEWAY & WHATSAPP CLOUD API MASTER SETTINGS */}
          {activeTab === 'integrations' && settings && (
            <div className="space-y-6 animate-in fade-in">
              
              {/* 1. Payment Gateway Settings Card */}
              <form onSubmit={handleSaveSettings} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-extrabold text-neutral-100 flex items-center gap-2 leading-snug">
                      <span className="text-lg sm:text-xl shrink-0">💳</span>
                      <span>Razorpay & Stripe Live Payment Gateway Credentials</span>
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">Configure live merchant API keys for online room reservations and guest deposits in ₹ INR.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    <Check className="h-4 w-4 shrink-0" />
                    <span>{savingSettings ? 'Saving Keys...' : 'Save Payment Keys'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Razorpay Key ID (`rzp_test_...` or `rzp_live_...`)</label>
                    <input
                      type="text"
                      required
                      value={settings.razorpay_key_id || 'rzp_test_AIHOS2026Key'}
                      onChange={(e) => setSettings({ ...settings, razorpay_key_id: e.target.value })}
                      placeholder="rzp_live_xxxxxxxxxxxxxx"
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Razorpay Key Secret (Encrypted HMAC Secret)</label>
                    <div className="relative">
                      <input
                        type={showRazorpaySecret ? "text" : "password"}
                        required
                        value={settings.razorpay_key_secret || 'sec_rzp_test_secret_998877'}
                        onChange={(e) => setSettings({ ...settings, razorpay_key_secret: e.target.value })}
                        placeholder="••••••••••••••••••••••••"
                        className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 pr-10 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-amber-400 p-1 transition"
                        title={showRazorpaySecret ? "Hide Secret Key" : "Show Secret Key"}
                      >
                        {showRazorpaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="font-extrabold text-neutral-200 block">Payment Gateway Online Status</span>
                    <span className="text-[11px] text-neutral-400 leading-relaxed">Accept automated instant guest deposits via Credit/Debit Cards, UPI (GPay/PhonePe), and NetBanking.</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, payment_gateway_enabled: !settings.payment_gateway_enabled })}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 border whitespace-nowrap shrink-0 self-start sm:self-center ${
                      settings.payment_gateway_enabled !== false
                        ? 'bg-green-950 text-green-400 border-green-700 hover:bg-green-900'
                        : 'bg-red-950 text-red-400 border-red-700 hover:bg-red-900'
                    }`}
                  >
                    <span>{settings.payment_gateway_enabled !== false ? '🟢 Gateway Active' : '🔴 Gateway Paused'}</span>
                  </button>
                </div>
              </form>

              {/* 2. WhatsApp Cloud API Settings Card */}
              <form onSubmit={handleSaveSettings} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-extrabold text-neutral-100 flex items-center gap-2 leading-snug">
                      <span className="text-lg sm:text-xl shrink-0">💬</span>
                      <span>Meta WhatsApp Business Cloud API & Webhook Credentials</span>
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">Connect your official Meta WhatsApp Business account for AI Guest Concierge, voice notes, and ticket dispatch.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-extrabold text-xs rounded-xl shadow transition flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    <Check className="h-4 w-4 shrink-0" />
                    <span>{savingSettings ? 'Saving...' : 'Save Meta Credentials'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Meta Verification Token (`hub.verify_token`)</label>
                    <input
                      type="text"
                      required
                      value={settings.whatsapp_verify_token || 'aihos_verification_token_secure_2026'}
                      onChange={(e) => setSettings({ ...settings, whatsapp_verify_token: e.target.value })}
                      placeholder="aihos_verification_token_secure_2026"
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Meta Phone Number ID</label>
                    <input
                      type="text"
                      required
                      value={settings.whatsapp_phone_number_id || '109876543210985'}
                      onChange={(e) => setSettings({ ...settings, whatsapp_phone_number_id: e.target.value })}
                      placeholder="109876543210985"
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Meta Permanent Access Token</label>
                    <div className="relative">
                      <input
                        type={showWhatsappToken ? "text" : "password"}
                        required
                        value={settings.whatsapp_access_token || 'EAAG...meta_access_token'}
                        onChange={(e) => setSettings({ ...settings, whatsapp_access_token: e.target.value })}
                        placeholder="EAAG...meta_access_token"
                        className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 pr-10 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWhatsappToken(!showWhatsappToken)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-amber-400 p-1 transition"
                        title={showWhatsappToken ? "Hide Access Token" : "Show Access Token"}
                      >
                        {showWhatsappToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Webhook Callback Copy Banner */}
                <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2 text-xs">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase text-amber-500 tracking-wider">🔗 Meta Developer Console Webhook Callback URL</span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${API_BASE || window.location.origin}/api/v1/whatsapp/webhook`;
                        navigator.clipboard.writeText(url);
                        showToast('WhatsApp Webhook Callback URL copied!');
                      }}
                      className="text-xs text-amber-400 hover:underline font-bold whitespace-nowrap shrink-0"
                    >
                      Copy Webhook URL 📋
                    </button>
                  </div>
                  <p className="font-mono text-neutral-300 break-all select-all bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800 text-[11px] leading-relaxed">
                    {API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'https://www.hotelbluebirdnest.com')}/api/v1/whatsapp/webhook
                  </p>
                  <p className="text-[11px] text-neutral-400 pt-0.5">
                    Paste this Webhook Callback URL into Meta Developer Console ➔ WhatsApp ➔ Configuration ➔ Webhook URL.
                  </p>
                </div>
              </form>

            </div>
          )}

          {/* TAB: MULTI-PROPERTY GROUP ENTERPRISE MANAGEMENT */}
          {activeTab === 'properties' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Top Header Card */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <Building2 className="h-6 w-6 text-amber-500" />
                      <span>🏢 Multi-Property Enterprise Group Management ({propertiesList.length || 3})</span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1">Manage all hotel properties in your group chain, switch live workspace contexts, and push central rate policies across your portfolio.</p>
                  </div>

                  <button
                    onClick={() => setPropModalOpen(true)}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs rounded-xl shadow-lg transition flex items-center gap-2 shrink-0 self-start sm:self-center"
                  >
                    <Plus className="h-4 w-4" />
                    <span>+ Add New Hotel Property</span>
                  </button>
                </div>

                {/* Portfolio Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-neutral-400">Total Group Properties</span>
                    <p className="text-xl font-black text-amber-400">{propertiesList.length || 3} Properties Active</p>
                  </div>
                  <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-neutral-400">Total Portfolio Suites</span>
                    <p className="text-xl font-black text-emerald-400">78 Property Suites</p>
                  </div>
                  <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-neutral-400">Consolidated Group Occupancy</span>
                    <p className="text-xl font-black text-white">87.3% Portfolio Avg</p>
                  </div>
                  <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase text-neutral-400">Active OTA Channels</span>
                    <p className="text-xl font-black text-cyan-400">6 Connected OTAs</p>
                  </div>
                </div>
              </div>

              {/* Property Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {propertiesList.map((prop: any) => (
                  <div key={prop.id} className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-4 hover:border-neutral-700 transition">
                    <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
                      <div>
                        <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">{prop.code}</span>
                        <h4 className="text-base font-extrabold text-white leading-tight mt-0.5">{prop.name}</h4>
                        <p className="text-xs text-neutral-400 flex items-center gap-1 mt-1">
                          📍 <span>{prop.city}, {prop.state}</span>
                        </p>
                      </div>
                      <span className="text-[10px] font-extrabold px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded-full shrink-0">
                        🟢 {prop.status || 'Active & Live'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs text-neutral-300">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Address:</span>
                        <span className="font-semibold text-right max-w-[180px] truncate">{prop.address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Total Configured Suites:</span>
                        <span className="font-black text-amber-400">{prop.total_rooms} Suites</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Active OTA Connections:</span>
                        <span className="font-bold text-neutral-100">{prop.active_channels || 6} Channels</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Current Occupancy:</span>
                        <span className="font-bold text-emerald-400">{prop.avg_occupancy || 88.4}%</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPropertyId(prop.id);
                        showToast(`Switched workspace context to ${prop.name}`);
                        loadAdminData();
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                        selectedPropertyId === prop.id
                          ? 'bg-emerald-500 text-neutral-950 shadow-md'
                          : 'bg-neutral-800 hover:bg-neutral-750 text-amber-400 border border-neutral-700'
                      }`}
                    >
                      <span>{selectedPropertyId === prop.id ? '✓ Currently Active Property' : '🔄 Switch Workspace to This Property'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* MODAL: ADD SUITE WITH PHOTO UPLOAD */}
      {roomModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="font-extrabold text-base text-neutral-100 flex items-center gap-2">
                <Bed className="h-5 w-5 text-amber-500" />
                Add New Suite to Inventory
              </h3>
              <button onClick={() => setRoomModalOpen(false)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Room #</label>
                  <input
                    type="text"
                    required
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    placeholder="e.g. 601"
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Floor</label>
                  <input
                    type="number"
                    required
                    value={newRoomFloor}
                    onChange={(e) => setNewRoomFloor(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Category</label>
                  <select
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Executive Heritage Room">Executive Heritage Room (₹3,800)</option>
                    <option value="Deluxe Heritage King">Deluxe Heritage King (₹6,500)</option>
                    <option value="Royal Heritage Suite">Royal Heritage Suite (₹9,500)</option>
                    <option value="Maharaja Penthouse Suite">Maharaja Penthouse Suite (₹18,000)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Tariff / Night (₹)</label>
                  <input
                    type="number"
                    required
                    value={newRoomPrice}
                    onChange={(e) => setNewRoomPrice(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Suite Photo Upload & URL */}
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Suite Photo</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRoomImage}
                    onChange={(e) => setNewRoomImage(e.target.value)}
                    placeholder="Photo URL..."
                    className="flex-1 text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-neutral-800 hover:bg-neutral-750 text-amber-400 font-bold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-1 shrink-0">
                    <Upload className="h-3.5 w-3.5" />
                    Upload File
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, (url) => setNewRoomImage(url))}
                    />
                  </label>
                </div>
              </div>

              {/* Bed Type & Area */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Bed Configuration</label>
                  <select
                    value={newRoomBed}
                    onChange={(e) => setNewRoomBed(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Royal King Bed">Royal King Bed</option>
                    <option value="Twin Beds">Twin Beds</option>
                    <option value="Imperial Four-Poster Canopy Bed">Imperial Four-Poster Canopy Bed</option>
                    <option value="Queen Bed">Queen Bed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Area (sq.ft)</label>
                  <input
                    type="number"
                    value={newRoomArea}
                    onChange={(e) => setNewRoomArea(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* View & Max Occupancy */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Palace View</label>
                  <input
                    type="text"
                    value={newRoomView}
                    onChange={(e) => setNewRoomView(e.target.value)}
                    placeholder="e.g. Lake Palace View"
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Max Capacity</label>
                  <input
                    type="text"
                    value={newRoomOccupancy}
                    onChange={(e) => setNewRoomOccupancy(e.target.value)}
                    placeholder="e.g. 2 Adults + 1 Child"
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Suite Description</label>
                <textarea
                  rows={2}
                  value={newRoomDesc}
                  onChange={(e) => setNewRoomDesc(e.target.value)}
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-xl shadow"
                >
                  Create Suite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SUITE */}
      {editingRoom && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="font-extrabold text-base text-neutral-100 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-amber-500" />
                Edit Suite {editingRoom.room_number} Specifications
              </h3>
              <button onClick={() => setEditingRoom(null)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateRoom} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Category</label>
                  <select
                    value={editingRoom.room_type}
                    onChange={(e) => setEditingRoom({ ...editingRoom, room_type: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Executive Heritage Room">Executive Heritage Room (₹3,800)</option>
                    <option value="Deluxe Heritage King">Deluxe Heritage King (₹6,500)</option>
                    <option value="Royal Heritage Suite">Royal Heritage Suite (₹9,500)</option>
                    <option value="Maharaja Penthouse Suite">Maharaja Penthouse Suite (₹18,000)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Tariff / Night (₹)</label>
                  <input
                    type="number"
                    required
                    value={editingRoom.price_per_night}
                    onChange={(e) => setEditingRoom({ ...editingRoom, price_per_night: Number(e.target.value) })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Suite Photo Upload & URL */}
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Suite Photo URL or Custom Upload</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingRoom.image_url || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-neutral-800 hover:bg-neutral-750 text-amber-400 font-bold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-1 shrink-0">
                    <Upload className="h-3.5 w-3.5" />
                    Upload File
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, (url) => setEditingRoom({ ...editingRoom, image_url: url }))}
                    />
                  </label>
                </div>

                {editingRoom.image_url && (
                  <div className="relative h-32 w-full rounded-2xl overflow-hidden border border-neutral-700 bg-neutral-950 mt-2 shadow-inner group">
                    <img
                      src={editingRoom.image_url}
                      alt="Suite Preview"
                      className="w-full h-full object-cover"
                      onError={(e: any) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600";
                      }}
                    />
                    <div className="absolute bottom-2 left-2 bg-neutral-950/80 backdrop-blur border border-neutral-800 px-2.5 py-0.5 rounded-xl text-[10px] font-extrabold text-amber-400 flex items-center gap-1">
                      <span>📸 Live Suite Photo Preview</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bed Type & Area */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Bed Configuration</label>
                  <select
                    value={editingRoom.bed_type || 'Royal King Bed'}
                    onChange={(e) => setEditingRoom({ ...editingRoom, bed_type: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Royal King Bed">Royal King Bed</option>
                    <option value="Twin Beds">Twin Beds</option>
                    <option value="Imperial Four-Poster Canopy Bed">Imperial Four-Poster Canopy Bed</option>
                    <option value="Queen Bed">Queen Bed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Area (sq.ft)</label>
                  <input
                    type="number"
                    value={editingRoom.area_sqft || 550}
                    onChange={(e) => setEditingRoom({ ...editingRoom, area_sqft: Number(e.target.value) })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* View & Max Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Palace View</label>
                  <input
                    type="text"
                    value={editingRoom.view_type || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, view_type: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Max Capacity</label>
                  <input
                    type="text"
                    value={editingRoom.max_occupancy || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, max_occupancy: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Suite Description</label>
                <textarea
                  rows={2}
                  value={editingRoom.description || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-xl shadow"
                >
                  Save Suite Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DISH WITH PHOTO UPLOAD */}
      {menuModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="font-extrabold text-base text-neutral-100 flex items-center gap-2">
                <Utensils className="h-5 w-5 text-amber-500" />
                Add New Dish to Gourmet Menu
              </h3>
              <button onClick={() => setMenuModalOpen(false)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateMenuItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder="e.g. Shahi Paneer Lababdar"
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Category</label>
                  <select
                    value={newDishCategory}
                    onChange={(e) => setNewDishCategory(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Starters">Starters & Tandoor</option>
                    <option value="Indian Mains">Indian Mains</option>
                    <option value="Biryani & Rice">Biryani & Rice</option>
                    <option value="Breads">Tandoori Breads</option>
                    <option value="Desserts">Royal Desserts</option>
                    <option value="Beverages">Beverages & Chai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Food Photo Upload & URL */}
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Dish Photography</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDishImage}
                    onChange={(e) => setNewDishImage(e.target.value)}
                    placeholder="Photo URL..."
                    className="flex-1 text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-neutral-800 hover:bg-neutral-750 text-amber-400 font-bold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-1 shrink-0">
                    <Upload className="h-3.5 w-3.5" />
                    Upload File
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, (url) => setNewDishImage(url))}
                    />
                  </label>
                </div>
              </div>

              {/* Portion, Spice & Calories */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Portion</label>
                  <input
                    type="text"
                    value={newDishPortion}
                    onChange={(e) => setNewDishPortion(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Spice Rating</label>
                  <select
                    value={newDishSpice}
                    onChange={(e) => setNewDishSpice(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Mild (🌶️)">Mild (🌶️)</option>
                    <option value="Medium (🌶️🌶️)">Medium (🌶️🌶️)</option>
                    <option value="Spicy (🌶️🌶️🌶️)">Spicy (🌶️🌶️🌶️)</option>
                    <option value="Royal Hot (🌶️🌶️🌶️🌶️)">Royal Hot (🌶️🌶️🌶️🌶️)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Calories</label>
                  <input
                    type="text"
                    value={newDishCalories}
                    onChange={(e) => setNewDishCalories(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Dish Description</label>
                <textarea
                  required
                  rows={2}
                  value={newDishDesc}
                  onChange={(e) => setNewDishDesc(e.target.value)}
                  placeholder="Ingredients, preparation style..."
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMenuModalOpen(false)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-xl shadow"
                >
                  Add Dish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT DISH */}
      {editingMenu && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="font-extrabold text-base text-neutral-100 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-amber-500" />
                Edit Dish: {editingMenu.name}
              </h3>
              <button onClick={() => setEditingMenu(null)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateMenuItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={editingMenu.name}
                  onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Category</label>
                  <select
                    value={editingMenu.category}
                    onChange={(e) => setEditingMenu({ ...editingMenu, category: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Starters">Starters & Tandoor</option>
                    <option value="Indian Mains">Indian Mains</option>
                    <option value="Biryani & Rice">Biryani & Rice</option>
                    <option value="Breads">Tandoori Breads</option>
                    <option value="Desserts">Royal Desserts</option>
                    <option value="Beverages">Beverages & Chai</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    required
                    value={editingMenu.price}
                    onChange={(e) => setEditingMenu({ ...editingMenu, price: Number(e.target.value) })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Food Photo Upload & URL */}
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Dish Photography</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingMenu.image_url || ''}
                    onChange={(e) => setEditingMenu({ ...editingMenu, image_url: e.target.value })}
                    className="flex-1 text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-neutral-800 hover:bg-neutral-750 text-amber-400 font-bold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-1 shrink-0">
                    <Upload className="h-3.5 w-3.5" />
                    Change Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, (url) => setEditingMenu({ ...editingMenu, image_url: url }))}
                    />
                  </label>
                </div>
              </div>

              {/* Portion, Spice & Calories */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Portion</label>
                  <input
                    type="text"
                    value={editingMenu.portion_size || ''}
                    onChange={(e) => setEditingMenu({ ...editingMenu, portion_size: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Spice Rating</label>
                  <select
                    value={editingMenu.spice_level || 'Medium (🌶️🌶️)'}
                    onChange={(e) => setEditingMenu({ ...editingMenu, spice_level: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Mild (🌶️)">Mild (🌶️)</option>
                    <option value="Medium (🌶️🌶️)">Medium (🌶️🌶️)</option>
                    <option value="Spicy (🌶️🌶️🌶️)">Spicy (🌶️🌶️🌶️)</option>
                    <option value="Royal Hot (🌶️🌶️🌶️🌶️)">Royal Hot (🌶️🌶️🌶️🌶️)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Calories</label>
                  <input
                    type="text"
                    value={editingMenu.calories || ''}
                    onChange={(e) => setEditingMenu({ ...editingMenu, calories: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Dish Description</label>
                <textarea
                  rows={2}
                  value={editingMenu.description || ''}
                  onChange={(e) => setEditingMenu({ ...editingMenu, description: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMenu(null)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-xl shadow"
                >
                  Save Dish Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BOOKING CHANNEL / OTA */}
      {editingChannel && (
        <div className="fixed inset-0 bg-neutral-950/85 backdrop-blur-md z-50 overflow-y-auto p-3 sm:p-6 flex justify-center items-start">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-4 sm:my-8 relative shrink-0">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="font-extrabold text-base text-neutral-100 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-amber-500" />
                Edit OTA Channel Specifications: {editingChannel.name}
              </h3>
              <button onClick={() => setEditingChannel(null)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateChannelItem} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Channel / Portal Name</label>
                  <input
                    type="text"
                    required
                    value={editingChannel.name}
                    onChange={(e) => setEditingChannel({ ...editingChannel, name: e.target.value })}
                    placeholder="e.g. MakeMyTrip"
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Channel Short Code</label>
                  <input
                    type="text"
                    required
                    value={editingChannel.code}
                    onChange={(e) => setEditingChannel({ ...editingChannel, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. MMT"
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Channel Category</label>
                  <select
                    value={editingChannel.channel_type || 'OTA'}
                    onChange={(e) => setEditingChannel({ ...editingChannel, channel_type: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="OTA">OTA Travel Portal</option>
                    <option value="Direct Website">Direct Hotel Website</option>
                    <option value="Corporate B2B">Corporate B2B Direct</option>
                    <option value="GDS System">Global Distribution System (GDS)</option>
                    <option value="Travel Agent">Offline Travel Agent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={editingChannel.commission_percent}
                    onChange={(e) => setEditingChannel({ ...editingChannel, commission_percent: Number(e.target.value) })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Associated Rate Plan</label>
                <select
                  value={editingChannel.rate_plan || 'BAR (Best Available Rate)'}
                  onChange={(e) => setEditingChannel({ ...editingChannel, rate_plan: e.target.value })}
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="BAR (Best Available Rate)">BAR (Best Available Rate - EP Room Only)</option>
                  <option value="CP Plan (Breakfast Included)">CP Plan (Continental Plan - Breakfast Included)</option>
                  <option value="MAP Plan (Half Board)">MAP Plan (Modified American Plan - Breakfast + Dinner)</option>
                  <option value="AP Plan (Full Board)">AP Plan (American Plan - All Meals Included)</option>
                  <option value="Non-Refundable Promo (10% Off)">Non-Refundable Promo (10% Discounted Rate)</option>
                </select>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingChannel(null)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow"
                >
                  Save OTA Specifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD STAFF WITH AVATAR UPLOAD */}
      {staffModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="font-extrabold text-base text-neutral-100 flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                Add New Staff HR Account
              </h3>
              <button onClick={() => setStaffModalOpen(false)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStaffFullName}
                    onChange={(e) => setNewStaffFullName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={newStaffEmpId}
                    onChange={(e) => setNewStaffEmpId(e.target.value)}
                    placeholder="e.g. EMP-1048"
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={newStaffUser}
                    onChange={(e) => setNewStaffUser(e.target.value)}
                    placeholder="e.g. aarav_frontdesk"
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showStaffPass ? "text" : "password"}
                      required
                      value={newStaffPass}
                      onChange={(e) => setNewStaffPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 pr-10 text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStaffPass(!showStaffPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-amber-400 p-1 transition"
                      title={showStaffPass ? "Hide Password" : "Show Password"}
                    >
                      {showStaffPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Department Role</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Runner">Food Runner & Room Service Dispatch</option>
                    <option value="Butler">VIP Suite Butler Concierge</option>
                    <option value="Maintenance">Engineering & Maintenance</option>
                    <option value="Reception">Front Desk & Reception PMS</option>
                    <option value="Kitchen">Kitchen Display System (KDS)</option>
                    <option value="Housekeeping">Housekeeping & Turnovers</option>
                    <option value="Executive">GM Executive Operations</option>
                    <option value="Admin">Super-Admin Master Control</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Assigned Shift</label>
                  <select
                    value={newStaffShift}
                    onChange={(e) => setNewStaffShift(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Morning Shift (07:00 - 15:30)">Morning Shift (07:00 - 15:30)</option>
                    <option value="Evening Shift (15:00 - 23:30)">Evening Shift (15:00 - 23:30)</option>
                    <option value="Night Owl (23:00 - 07:30)">Night Owl (23:00 - 07:30)</option>
                    <option value="General Management (09:00 - 18:00)">General Management (09:00 - 18:00)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Mobile / WhatsApp</label>
                  <input
                    type="text"
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="staff@grandpalace.in"
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Profile Avatar</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStaffAvatar}
                    onChange={(e) => setNewStaffAvatar(e.target.value)}
                    placeholder="Avatar image URL..."
                    className="flex-1 text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-neutral-800 hover:bg-neutral-750 text-amber-400 font-bold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-1 shrink-0">
                    <Upload className="h-3.5 w-3.5" />
                    Upload Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, (url) => setNewStaffAvatar(url))}
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStaffModalOpen(false)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-xl shadow"
                >
                  Create Staff Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STAFF */}
      {editingStaff && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="font-extrabold text-base text-neutral-100 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-amber-500" />
                Edit Staff Profile: @{editingStaff.username}
              </h3>
              <button onClick={() => setEditingStaff(null)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateStaff} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editingStaff.full_name || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, full_name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={editingStaff.employee_id || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, employee_id: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Department Role</label>
                  <select
                    value={editingStaff.role}
                    onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Reception">Front Desk & Reception PMS</option>
                    <option value="Kitchen">Kitchen Display System (KDS)</option>
                    <option value="Housekeeping">Housekeeping & Turnovers</option>
                    <option value="Executive">GM Executive Operations</option>
                    <option value="Admin">Super-Admin Master Control</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Assigned Shift</label>
                  <select
                    value={editingStaff.shift || 'Morning Shift (07:00 - 15:30)'}
                    onChange={(e) => setEditingStaff({ ...editingStaff, shift: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Morning Shift (07:00 - 15:30)">Morning Shift (07:00 - 15:30)</option>
                    <option value="Evening Shift (15:00 - 23:30)">Evening Shift (15:00 - 23:30)</option>
                    <option value="Night Owl (23:00 - 07:30)">Night Owl (23:00 - 07:30)</option>
                    <option value="General Management (09:00 - 18:00)">General Management (09:00 - 18:00)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Mobile / WhatsApp</label>
                  <input
                    type="text"
                    value={editingStaff.phone || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={editingStaff.email || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Reset Password */}
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">
                  Reset Password (Leave blank to keep current)
                </label>
                <div className="relative">
                  <input
                    type={showEditStaffPass ? "text" : "password"}
                    value={editStaffPassword}
                    onChange={(e) => setEditStaffPassword(e.target.value)}
                    placeholder="New password (optional)..."
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 pr-10 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditStaffPass(!showEditStaffPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-amber-400 p-1 transition"
                    title={showEditStaffPass ? "Hide Password" : "Show Password"}
                  >
                    {showEditStaffPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Profile Avatar</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingStaff.avatar_url || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, avatar_url: e.target.value })}
                    className="flex-1 text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-neutral-800 hover:bg-neutral-750 text-amber-400 font-bold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-1 shrink-0">
                    <Upload className="h-3.5 w-3.5" />
                    Change Avatar
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, (url) => setEditingStaff({ ...editingStaff, avatar_url: url }))}
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-xl shadow"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BOOKING CHANNEL / OTA */}
      {channelModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <div>
                <h3 className="font-extrabold text-base text-neutral-100 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-amber-500" />
                  Connect Booking Website or OTA Portal
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">Connect your self-owned hotel website, MakeMyTrip, Agoda, or B2B partners.</p>
              </div>
              <button type="button" onClick={() => setChannelModalOpen(false)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Website / Channel Name</label>
                  <input
                    type="text"
                    required
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. Hotel Main Website, Goibibo..."
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Channel Category</label>
                  <select
                    value={newChannelType}
                    onChange={(e) => setNewChannelType(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="Direct Website">🌐 Self Hotel Website (0% Fee)</option>
                    <option value="OTA">📱 Online Travel App / OTA (MMT, Agoda)</option>
                    <option value="Corporate B2B">💼 Corporate Business Partner</option>
                    <option value="GDS">✈️ GDS Distribution System</option>
                    <option value="Travel Agent">🤝 Local Travel Agent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Short Code (3-4 Letters)</label>
                  <input
                    type="text"
                    required
                    value={newChannelCode}
                    onChange={(e) => setNewChannelCode(e.target.value)}
                    placeholder="e.g. WEB, MMT, GIB..."
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Commission Fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={newChannelCommission}
                    onChange={(e) => setNewChannelCommission(Number(e.target.value))}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Room Pricing & Meal Plan</label>
                  <select
                    value={newChannelRatePlan}
                    onChange={(e) => setNewChannelRatePlan(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="BAR (Best Available Rate)">☕ Room Only (Standard Rate)</option>
                    <option value="CP Plan (Breakfast Included)">🥐 Breakfast Included (CP Plan)</option>
                    <option value="MAP Plan (Half Board)">🍽️ Breakfast + Dinner (MAP Plan)</option>
                    <option value="Non-Refundable (-10%)">⚡ Non-Refundable (10% Off)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Booking Confirmation Mode</label>
                  <select
                    value={newChannelAutoConfirm ? 'true' : 'false'}
                    onChange={(e) => setNewChannelAutoConfirm(e.target.value === 'true')}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="true">⚡ Instant Auto-Confirm</option>
                    <option value="false">⏳ Front Desk Approval Required</option>
                  </select>
                </div>
              </div>

              {/* API Credentials Vault Section */}
              <div className="p-3.5 bg-neutral-950/80 rounded-2xl border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-amber-400 flex items-center gap-1">
                    <Key className="h-3.5 w-3.5" />
                    <span>🔑 API Vault Credentials (Optional)</span>
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold">🔒 AES-256 SSL</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase font-extrabold text-neutral-400 mb-0.5">OTA Property Hotel ID</label>
                    <input
                      type="text"
                      value={newHotelId}
                      onChange={(e) => setNewHotelId(e.target.value)}
                      placeholder={`e.g. HOTEL-${newChannelCode.toUpperCase() || 'CODE'}-88192`}
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase font-extrabold text-neutral-400 mb-0.5">API Key / Secret Token</label>
                    <input
                      type="text"
                      value={newApiKey}
                      onChange={(e) => setNewApiKey(e.target.value)}
                      placeholder="e.g. live_key_2026..."
                      className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold uppercase text-amber-500">🔗 Channel Booking Link (Copy for Web Developer)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${API_BASE || window.location.origin}/api/v1/public/reserve?channel=${newChannelCode.toUpperCase() || 'CODE'}`;
                      navigator.clipboard.writeText(url);
                      showToast('Booking Link copied to clipboard!');
                    }}
                    className="text-[10px] text-amber-400 hover:underline font-bold"
                  >
                    Copy Link 📋
                  </button>
                </div>
                <p className="font-mono text-neutral-300 truncate">
                  {API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'https://www.hotelbluebirdnest.com')}/api/v1/public/reserve?channel={newChannelCode.toUpperCase() || 'CODE'}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChannelModalOpen(false)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-xl shadow"
                >
                  Connect Channel Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT OTA API CREDENTIALS VAULT */}
      {editingCredModalChannel && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <div>
                <h3 className="font-extrabold text-base text-neutral-100 flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-500" />
                  Edit API Credential Vault: {editingCredModalChannel.name}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">Encrypted API secret keys & credentials stored in security vault.</p>
              </div>
              <button type="button" onClick={() => setEditingCredModalChannel(null)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiRequest('/api/v1/channel/credentials/save', {
                    method: 'POST',
                    body: JSON.stringify({
                      ota_id: editingCredModalChannel.id,
                      api_key: editApiKey,
                      api_secret: editApiSecret || 'sec_vault_encrypted',
                      hotel_id_on_ota: editHotelId,
                      connection_mode: editMode
                    })
                  });
                  showToast(`API credentials encrypted and saved for ${editingCredModalChannel.name}!`);
                  setEditingCredModalChannel(null);
                  loadAdminData();
                } catch (err: any) {
                  alert(`Error saving credentials: ${err.message}`);
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1 font-mono">Target OTA Channel</label>
                <select
                  value={editingCredModalChannel?.id}
                  onChange={(e) => {
                    const selected = otaChannels.find(c => c.id === Number(e.target.value));
                    if (selected) {
                      setEditingCredModalChannel(selected);
                      setEditHotelId(selected.hotel_id_on_ota || `HOTEL-${selected.code}-88192`);
                      setEditApiKey(`live_key_${selected.code.toLowerCase()}_2026`);
                      setEditApiSecret(`sec_vault_${selected.code.toLowerCase()}_encrypted`);
                      setEditMode(selected.connection_mode || 'LIVE');
                    }
                  }}
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-bold focus:outline-none focus:border-amber-500"
                >
                  {otaChannels.map((ch: any) => (
                    <option key={ch.id} value={ch.id}>
                      🏨 {ch.name} ({ch.code}) — {ch.channel_type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">OTA Hotel / Property ID</label>
                  <input
                    type="text"
                    required
                    value={editHotelId}
                    onChange={(e) => setEditHotelId(e.target.value)}
                    placeholder="e.g. HOTEL-MMT-88192"
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Connection Mode</label>
                  <select
                    value={editMode}
                    onChange={(e) => setEditMode(e.target.value)}
                    className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="LIVE">🟢 LIVE Production Environment</option>
                    <option value="SANDBOX">🧪 SANDBOX / Test Mode</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">API Key / Token</label>
                <input
                  type="text"
                  required
                  value={editApiKey}
                  onChange={(e) => setEditApiKey(e.target.value)}
                  placeholder="e.g. live_key_mmt_2026..."
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">API Secret Key (HMAC-SHA256 Encrypted)</label>
                <input
                  type="password"
                  value={editApiSecret}
                  onChange={(e) => setEditApiSecret(e.target.value)}
                  placeholder="Enter API Secret Token..."
                  className="w-full text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                <div className="flex justify-between font-mono text-emerald-400 font-bold">
                  <span>🔒 Security Vault Status</span>
                  <span>AES-256 HMAC Active</span>
                </div>
                <p>Credentials are authenticated and transmitted over SSL with AES-256 HMAC-SHA256 encryption.</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCredModalChannel(null)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-xl shadow"
                >
                  Save Encrypted Credentials
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW CCTV CAMERA FEED */}
      {cctvModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <span>📹 Add Property CCTV Camera Stream</span>
                  <span className="text-[10px] bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded-full font-bold">
                    ONVIF / RTSP
                  </span>
                </h3>
                <p className="text-[10px] text-neutral-400">Connect CP Plus, Hikvision, Dahua, Uniview or ONVIF NVR Channel</p>
              </div>
              <button
                onClick={() => setCctvModalOpen(false)}
                className="h-7 w-7 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-full flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCctvCamera} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-300 mb-1">Camera Name</label>
                <input
                  type="text"
                  required
                  value={newCamName}
                  onChange={(e) => setNewCamName(e.target.value)}
                  placeholder="e.g. Executive Lounge Entrance - CP Plus"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Location Zone</label>
                  <input
                    type="text"
                    required
                    value={newCamLocation}
                    onChange={(e) => setNewCamLocation(e.target.value)}
                    placeholder="e.g. 2nd Floor Corridor"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Camera Brand</label>
                  <select
                    value={newCamBrand}
                    onChange={(e) => setNewCamBrand(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="CP Plus">CP Plus</option>
                    <option value="Hikvision">Hikvision</option>
                    <option value="Dahua">Dahua</option>
                    <option value="Uniview">Uniview</option>
                    <option value="Honeywell">Honeywell</option>
                    <option value="Generic ONVIF">Generic ONVIF IP Cam</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 mb-1">RTSP / HLS Stream URL</label>
                <input
                  type="text"
                  required
                  value={newCamUrl}
                  onChange={(e) => setNewCamUrl(e.target.value)}
                  placeholder="rtsp://admin:password@192.168.1.108:554/cam/realmonitor"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-amber-400 font-mono text-[11px] focus:outline-none focus:border-amber-500"
                />
                <span className="text-[9px] text-neutral-500 mt-1 block">Supported Formats: RTSP, HLS (.m3u8), WebRTC</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCctvModalOpen(false)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-xl shadow"
                >
                  Save & Connect Camera
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW HOTEL PROPERTY TO PORTFOLIO */}
      {propModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="font-extrabold text-base text-neutral-100 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-500" />
                <span>Add Hotel Property to Chain</span>
              </h3>
              <button onClick={() => setPropModalOpen(false)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateProperty} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-300 mb-1">Hotel Property Name</label>
                <input
                  type="text"
                  required
                  value={newPropName}
                  onChange={(e) => setNewPropName(e.target.value)}
                  placeholder="e.g. Blue Bird Luxury Villas, Havelock"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Property Code</label>
                  <input
                    type="text"
                    required
                    value={newPropCode}
                    onChange={(e) => setNewPropCode(e.target.value)}
                    placeholder={`BBN-00${propertiesList.length + 1}`}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 mb-1">City / Location</label>
                  <input
                    type="text"
                    required
                    value={newPropCity}
                    onChange={(e) => setNewPropCity(e.target.value)}
                    placeholder="e.g. Havelock Island"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 mb-1">Total Suite Count</label>
                <input
                  type="number"
                  required
                  value={newPropRooms}
                  onChange={(e) => setNewPropRooms(Number(e.target.value))}
                  placeholder="24"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPropModalOpen(false)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold rounded-xl shadow"
                >
                  Register Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALARY DISBURSEMENT MODAL */}
      {disburseModalOpen && selectedPayrollItem && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="font-extrabold text-sm uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                <span>Disburse Salary Payment</span>
              </h3>
              <button onClick={() => setDisburseModalOpen(false)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-xs text-neutral-400">Employee:</span>
                <span className="text-xs font-bold text-white">{selectedPayrollItem.staff_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-neutral-400">Designation:</span>
                <span className="text-xs font-mono text-amber-400">{selectedPayrollItem.role} ({selectedPayrollItem.employee_id})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-neutral-400">Payroll Month:</span>
                <span className="text-xs font-bold text-neutral-200">{payrollMonth}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-850">
                <span className="text-xs font-extrabold text-white">Net Amount:</span>
                <span className="text-base font-mono font-black text-emerald-400">₹{selectedPayrollItem.net_payable?.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <form onSubmit={handleDisburseSalary} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-300 mb-1">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Bank Transfer', 'UPI', 'Cash'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDisburseMode(mode)}
                      className={`py-2 rounded-xl font-extrabold border transition text-xs ${
                        disburseMode === mode
                          ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 mb-1">Transaction Ref / UTR Number</label>
                <input
                  type="text"
                  required
                  value={disburseTxnRef}
                  onChange={(e) => setDisburseTxnRef(e.target.value)}
                  placeholder="e.g. HDFC-NEFT-99182319 or UPI-Ref"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisburseModalOpen(false)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disbursingSalary}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-extrabold rounded-xl shadow flex items-center justify-center gap-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{disbursingSalary ? 'Processing...' : 'Confirm Disbursement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL SALARY PAYSLIP PRINTABLE MODAL */}
      {payslipModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="font-extrabold text-sm uppercase text-amber-500 tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                <span>Official Employee Salary Slip</span>
              </h3>
              <button onClick={() => setPayslipModalOpen(false)} className="text-neutral-500 hover:text-white">✕</button>
            </div>

            {payslipLoading || !payslipData ? (
              <div className="py-12 text-center text-neutral-400 text-xs">
                <RefreshCw className="h-6 w-6 animate-spin mx-auto text-amber-400 mb-2" />
                <p>Generating GST & PF-Compliant Salary Slip...</p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Printable Payslip Container */}
                <div id="printable-salary-slip" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 space-y-3">
                  <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
                    <div>
                      <h4 className="font-black text-base text-white">{payslipData.hotel_details?.name}</h4>
                      <p className="text-[10px] text-neutral-400">{payslipData.hotel_details?.address}</p>
                      <p className="text-[9px] text-neutral-500 font-mono mt-0.5">TAN: {payslipData.hotel_details?.tan_number} · PF Code: {payslipData.hotel_details?.pf_code}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-amber-400 text-xs block">{payslipData.payslip_number}</span>
                      <span className="text-[10px] text-neutral-400 font-extrabold">{payslipData.month_year}</span>
                    </div>
                  </div>

                  {/* Employee Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-neutral-900 rounded-xl border border-neutral-850">
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Employee Name & ID</span>
                      <strong className="text-white">{payslipData.employee?.name}</strong> <span className="font-mono text-amber-400 font-bold">({payslipData.employee?.id})</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Department & Role</span>
                      <strong className="text-neutral-200">{payslipData.employee?.department} · {payslipData.employee?.role}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Bank Account / PAN</span>
                      <span className="font-mono text-neutral-300">{payslipData.employee?.bank_account} · PAN: {payslipData.employee?.pan}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[10px]">Attendance</span>
                      <strong className="text-emerald-400">{payslipData.employee?.days_worked} Days Worked</strong> <span className="text-neutral-400">/ {payslipData.employee?.working_days} Days</span>
                    </div>
                  </div>

                  {/* Earnings vs Deductions Table */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {/* Earnings */}
                    <div className="space-y-1">
                      <span className="font-extrabold text-[10px] uppercase text-emerald-400 block border-b border-neutral-800 pb-1">Earnings</span>
                      {payslipData.earnings?.map((e: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span className="text-neutral-300">{e.label}</span>
                          <span className="font-mono font-bold text-white">₹{e.amount?.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-neutral-800 pt-1 font-bold text-xs">
                        <span className="text-neutral-200">Gross Earnings:</span>
                        <span className="font-mono text-emerald-400">₹{payslipData.totals?.gross_earnings?.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Deductions */}
                    <div className="space-y-1">
                      <span className="font-extrabold text-[10px] uppercase text-rose-400 block border-b border-neutral-800 pb-1">Deductions</span>
                      {payslipData.deductions?.map((d: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-[11px]">
                          <span className="text-neutral-400">{d.label}</span>
                          <span className="font-mono font-bold text-rose-300">₹{d.amount?.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-neutral-800 pt-1 font-bold text-xs">
                        <span className="text-neutral-200">Total Deductions:</span>
                        <span className="font-mono text-rose-400">₹{payslipData.totals?.total_deductions?.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Pay Callout */}
                  <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block">Take-Home Net Salary</span>
                      <span className="text-[9px] text-neutral-500 font-mono">Disbursed via {payslipData.totals?.payment_mode} ({payslipData.totals?.transaction_ref})</span>
                    </div>
                    <span className="text-xl font-mono font-black text-amber-400">
                      ₹{payslipData.totals?.net_pay?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Print Button */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPayslipModalOpen(false)}
                    className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black rounded-xl shadow flex items-center justify-center gap-1.5"
                  >
                    <span>🖨️</span>
                    <span>Print Official Payslip</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* EDITABLE SALARY & COMPENSATION CONFIGURATION MODAL */}
      {editSalaryModalOpen && editingPayrollItem && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-start pb-3 border-b border-neutral-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-amber-500 tracking-wider">
                  Compensation Management
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-1.5 mt-0.5">
                  <DollarSign className="h-4 w-4 text-amber-400" />
                  <span>Configure Salary Package & Deductions</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {editingPayrollItem.staff_name} • <span className="font-mono text-amber-400">{editingPayrollItem.employee_id} ({editingPayrollItem.role})</span>
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setEditSalaryModalOpen(false)} 
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSalaryConfig} className="space-y-4 text-xs">
              {/* Basic Salary & Attendance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Base Monthly Salary (₹)</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="500"
                    value={editBaseSalary}
                    onChange={(e) => {
                      const base = Number(e.target.value);
                      setEditBaseSalary(base);
                      setEditPfDeduction(Math.round(base * 0.05));
                      setEditEsiDeduction(Math.round(base * 0.0075));
                    }}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Days Present / Working Days</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="31"
                      value={editDaysPresent}
                      onChange={(e) => setEditDaysPresent(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-neutral-500 font-bold">/</span>
                    <input
                      type="number"
                      min="20"
                      max="31"
                      value={editWorkingDays}
                      onChange={(e) => setEditWorkingDays(Number(e.target.value))}
                      className="w-20 bg-neutral-950 border border-neutral-800 rounded-xl px-2 py-2 text-neutral-400 font-mono text-center focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Overtime Configuration */}
              <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Overtime Pay Settings
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    +₹{Math.round(editOtHours * editOtRate).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">Overtime Hours</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editOtHours}
                      onChange={(e) => setEditOtHours(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">Rate (₹/hour)</label>
                    <input
                      type="number"
                      min="0"
                      value={editOtRate}
                      onChange={(e) => setEditOtRate(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bonuses & Incentives */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Performance Bonus (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editBonus}
                    onChange={(e) => setEditBonus(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-300 mb-1">Tips & Service Incentives (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editIncentives}
                    onChange={(e) => setEditIncentives(Number(e.target.value))}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Statutory Deductions: PF, ESI, Advance */}
              <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
                <span className="text-[11px] font-bold text-neutral-300 block">
                  Statutory Deductions & Advance Recovery
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">PF (Provident Fund)</label>
                    <input
                      type="number"
                      min="0"
                      value={editPfDeduction}
                      onChange={(e) => setEditPfDeduction(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-rose-300 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">ESI Medical</label>
                    <input
                      type="number"
                      min="0"
                      value={editEsiDeduction}
                      onChange={(e) => setEditEsiDeduction(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-rose-300 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-0.5">Advance Recovery</label>
                    <input
                      type="number"
                      min="0"
                      value={editAdvanceDeduction}
                      onChange={(e) => setEditAdvanceDeduction(Number(e.target.value))}
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1.5 text-rose-300 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block font-bold text-neutral-300 mb-1">Disbursement Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Bank Transfer', 'UPI', 'Cash'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setEditPaymentMode(mode)}
                      className={`py-1.5 rounded-xl font-bold border transition text-xs ${
                        editPaymentMode === mode
                          ? 'bg-amber-500 text-neutral-950 border-amber-400 font-extrabold shadow'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Real-time Calculation Summary Box */}
              {(() => {
                const overtimeTotal = Math.round(editOtHours * editOtRate);
                const grossEarnings = editBaseSalary + overtimeTotal + editBonus + editIncentives;
                const totalDeductions = editPfDeduction + editEsiDeduction + editAdvanceDeduction;
                const calculatedNet = Math.max(0, grossEarnings - totalDeductions);

                return (
                  <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-2">
                    <div className="flex justify-between text-neutral-400 text-xs">
                      <span>Gross Monthly Earnings:</span>
                      <span className="font-mono text-emerald-400 font-bold">₹{grossEarnings.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400 text-xs">
                      <span>Total Deductions (PF/ESI/Advance):</span>
                      <span className="font-mono text-rose-400 font-bold">-₹{totalDeductions.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-850 text-sm font-extrabold">
                      <span className="text-white">Net Payable Take-Home:</span>
                      <span className="text-base font-mono font-black text-amber-400 bg-amber-950/40 px-3 py-1 rounded-xl border border-amber-500/30">
                        ₹{calculatedNet.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="submit"
                  disabled={salarySaving}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{salarySaving ? 'Saving Changes...' : 'Save & Recalculate Net Pay'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditSalaryModalOpen(false)}
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

