'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, getAuthToken } from '@/lib/api';
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
  EyeOff
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
  const [activeTab, setActiveTab] = useState<'hotel' | 'rooms' | 'menu' | 'staff' | 'channel' | 'integrations' | 'inventory' | 'cctv'>('hotel');
  
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
  const [editingChannel, setEditingChannel] = useState<any>(null);

  // Add Booking Channel Handler
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/v1/admin/channel-engine/channels', {
        method: 'POST',
        body: JSON.stringify({
          name: newChannelName,
          code: newChannelCode.toUpperCase(),
          channel_type: newChannelType,
          commission_percent: Number(newChannelCommission),
          rate_plan: newChannelRatePlan,
          auto_confirm: newChannelAutoConfirm
        })
      });
      if (channelConfig) {
        setChannelConfig({ ...channelConfig, channels: res.channels });
      }
      setChannelModalOpen(false);
      setNewChannelName('');
      setNewChannelCode('');
      showToast(`Booking channel "${res.channel.name}" added successfully!`);
    } catch (err: any) {
      alert(`Error adding booking channel: ${err.message}`);
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

  // Load All Admin Data
  const loadAdminData = async () => {
    try {
      const [settingsData, roomsData, menuData, staffData, channelData, inventoryData, cctvData] = await Promise.all([
        apiRequest('/api/v1/admin/settings'),
        apiRequest('/api/v1/admin/rooms'),
        apiRequest('/api/v1/admin/menu'),
        apiRequest('/api/v1/admin/staff'),
        apiRequest('/api/v1/admin/channel-engine/status').catch(() => null),
        apiRequest('/api/v1/admin/inventory').catch(() => []),
        apiRequest('/api/v1/admin/cctv').catch(() => [])
      ]);
      setSettings(settingsData);
      setRooms(roomsData);
      setMenuItems(menuData);
      setStaffList(staffData);
      if (channelData) setChannelConfig(channelData);
      if (inventoryData) setInventoryItems(inventoryData);
      if (cctvData) setCctvCameras(cctvData);
    } catch (err: any) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

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
      showToast(`Camera feed "${name}" deleted.`);
      loadAdminData();
    } catch (err: any) {
      alert(`Error deleting camera: ${err.message}`);
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
      setRooms(prev => prev.map(r => r.id === editingRoom.id ? updated : r));
      setEditingRoom(null);
      showToast(`Suite ${updated.room_number} specifications updated!`);
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
              { key: 'integrations', label: 'Payment & WhatsApp', icon: ShieldCheck }
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
                  <button
                    onClick={loadAdminData}
                    className="px-3.5 py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-amber-400 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow self-start sm:self-center"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Refresh Stock Levels</span>
                  </button>
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
                      {inventoryItems.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-neutral-950/60 transition">
                          <td className="py-3.5 px-4 font-extrabold text-white whitespace-nowrap min-w-[170px]">
                            <span>📦 {inv.item_name}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-extrabold text-amber-400 text-sm whitespace-nowrap">
                            {inv.current_stock} {inv.unit}
                          </td>
                          <td className="py-3.5 px-4 text-neutral-400 font-medium whitespace-nowrap">
                            {inv.min_alert_threshold} {inv.unit}
                          </td>
                          <td className="py-3.5 px-4 font-mono whitespace-nowrap">
                            ₹{inv.cost_per_unit} / {inv.unit}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {inv.is_low ? (
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
                            <button
                              onClick={async () => {
                                try {
                                  await apiRequest(`/api/v1/admin/inventory/${inv.id}/restock`, {
                                    method: 'PUT',
                                    body: JSON.stringify({ quantity: 15.0 })
                                  });
                                  showToast(`Restocked +15 ${inv.unit} of ${inv.item_name}`);
                                  loadAdminData();
                                } catch (err: any) {
                                  alert(`Failed to restock: ${err.message}`);
                                }
                              }}
                              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-[11px] rounded-xl transition shadow whitespace-nowrap inline-flex items-center gap-1 shrink-0"
                            >
                              <span>+</span>
                              <span>Restock Stock</span>
                            </button>
                          </td>
                        </tr>
                      ))}
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

          {/* TAB 4: STAFF HR PROFILES & RBAC DIRECTORY WITH EDIT */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-extrabold text-neutral-100 leading-snug">Staff HR Profiles & Access Directory</h3>
                    <p className="text-xs text-neutral-400">Manage employee IDs, contact phone/email, duty shifts, and departmental roles.</p>
                  </div>
                  <button
                    onClick={() => setStaffModalOpen(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl transition shadow flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start sm:self-center"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Staff Account</span>
                  </button>
                </div>
              </div>

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
            </div>
          )}

          {/* TAB 5: PUBLIC WEBSITE BOOKING ENGINE & CHANNEL SYNC */}
          {activeTab === 'channel' && (
            <div className="space-y-6">
              
              {/* Master Stop-Sell Switch */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase text-amber-500 tracking-wider block">
                      Master Engine Control Switch
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold text-neutral-100 flex items-center gap-2 leading-snug">
                      <Key className="h-5 w-5 text-amber-500 shrink-0" />
                      <span>Public Website Booking Engine & Stop-Sell Control</span>
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleChannelEngine}
                    className={`px-4 sm:px-5 py-2.5 rounded-2xl font-extrabold text-xs transition flex items-center gap-2 shadow-lg shrink-0 self-start sm:self-center ${
                      channelConfig?.is_enabled 
                        ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-950/40' 
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/40 animate-pulse'
                    }`}
                  >
                    {channelConfig?.is_enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    <span>{channelConfig?.is_enabled ? 'ONLINE (Bookings Allowed)' : 'PAUSED (Stop-Sell Active)'}</span>
                  </button>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  Controls direct website bookings and OTA channel sync. Toggling OFF activates House Stop-Sell.
                </p>
              </div>

                {/* Status KPI Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold">Public Engine Status</span>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${channelConfig?.is_enabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <strong className={`font-extrabold ${channelConfig?.is_enabled ? 'text-green-400' : 'text-red-400'}`}>
                        {channelConfig?.is_enabled ? 'Active & Accepting Bookings' : 'Stop-Sell Active (House Frozen)'}
                      </strong>
                    </div>
                  </div>

                  <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold">Live API Webhook Endpoint</span>
                    <p className="font-mono text-neutral-300 truncate">/api/v1/public/reserve</p>
                  </div>

                  <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1">
                    <span className="text-[10px] text-neutral-500 uppercase font-bold">Channel Security Secret</span>
                    <p className="font-mono text-amber-400 font-bold">{channelConfig?.channel_api_key || 'aihos_channel_secret_2026'}</p>
                  </div>
                </div>

              {/* Connected Booking Channels & OTA Manager */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex flex-wrap justify-between items-center pb-3 border-b border-neutral-800 gap-3">
                  <div>
                    <h3 className="text-base font-extrabold text-neutral-100 flex items-center gap-2">
                      <Globe className="h-5 w-5 text-amber-500" />
                      Connected Booking Channels & OTAs Manager
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Configure direct hotel booking websites, travel portals (MMT, Booking.com, Agoda), and toggle individual channel Stop-Sells.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setChannelModalOpen(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-xl shadow flex items-center gap-1.5 transition"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add New Booking Website / OTA</span>
                  </button>
                </div>

                {/* Channel Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {channelConfig?.channels?.map((ch) => (
                    <div
                      key={ch.id}
                      className={`p-4 rounded-2xl border transition space-y-3.5 relative flex flex-col justify-between ${
                        ch.is_active
                          ? 'bg-neutral-950 border-neutral-800/80 shadow-md'
                          : 'bg-red-950/20 border-red-900/50'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Header: Channel Name, Badges & Stop-Sell Toggle */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-neutral-850">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-extrabold text-sm text-white tracking-tight">{ch.name}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-extrabold bg-neutral-850 text-amber-300 border border-neutral-750 shrink-0">
                                {ch.code}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-950/80 text-amber-400 border border-amber-800/80 shrink-0">
                                {ch.channel_type || 'OTA'}
                              </span>
                            </div>
                            <span className="text-[10px] text-neutral-400 font-bold block mt-0.5">
                              {ch.commission_percent === 0 ? 'Direct Web (0% Commission)' : `${ch.commission_percent}% OTA Commission`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                            <button
                              type="button"
                              onClick={() => setEditingChannel({ ...ch })}
                              className="px-2.5 py-1 text-neutral-300 hover:text-amber-400 bg-neutral-900 hover:bg-neutral-800 transition rounded-xl flex items-center gap-1 border border-neutral-800 text-[11px] font-extrabold whitespace-nowrap shrink-0"
                              title="Edit OTA Channel Parameters"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleChannelItem(ch.id)}
                              className={`px-3 py-1 rounded-xl text-[11px] font-extrabold transition flex items-center gap-1 border whitespace-nowrap shrink-0 ${
                                ch.is_active
                                  ? 'bg-green-950/90 text-green-400 border-green-700 hover:bg-green-900'
                                  : 'bg-red-950/90 text-red-400 border-red-700 hover:bg-red-900 animate-pulse'
                              }`}
                              title="Toggle Channel Stop-Sell"
                            >
                              {ch.is_active ? <ToggleRight className="h-4 w-4 shrink-0" /> : <ToggleLeft className="h-4 w-4 shrink-0" />}
                              <span>{ch.is_active ? 'Active' : 'Stop-Sell'}</span>
                            </button>

                            {ch.id > 6 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteChannelItem(ch.id, ch.name)}
                                className="p-1.5 text-neutral-500 hover:text-red-400 transition rounded-lg hover:bg-neutral-900"
                                title="Delete Channel"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Rate Plan & Copy Link Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]">
                          <span className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-amber-300 font-bold leading-tight truncate">
                            🏷️ {ch.rate_plan || 'BAR Rate'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(`http://localhost:8000/api/v1/public/reserve?channel=${ch.code}`);
                              showToast(`Integration Link for ${ch.name} copied to clipboard!`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-amber-400 font-bold transition flex items-center gap-1 shrink-0 self-start sm:self-center whitespace-nowrap"
                            title="Copy Website Integration Link"
                          >
                            <span>Copy Link</span>
                            <span>📋</span>
                          </button>
                        </div>
                      </div>

                      {/* Performance KPIs Grid */}
                      <div className="grid grid-cols-2 gap-2 pt-2 text-xs border-t border-neutral-850">
                        <div className="p-2.5 bg-neutral-900/80 rounded-xl border border-neutral-800/60">
                          <span className="text-[9px] text-neutral-400 uppercase font-extrabold block tracking-wider">TOTAL BOOKINGS</span>
                          <strong className="text-white font-extrabold block text-xs mt-0.5">{ch.total_bookings} Reservations</strong>
                        </div>
                        <div className="p-2.5 bg-neutral-900/80 rounded-xl border border-neutral-800/60">
                          <span className="text-[9px] text-neutral-400 uppercase font-extrabold block tracking-wider">GROSS REVENUE</span>
                          <strong className="text-amber-400 font-extrabold block text-xs mt-0.5">₹{ch.total_revenue_inr.toLocaleString('en-IN')}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Website Integration & Developer Guide Card */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl space-y-4">
                <h4 className="text-sm font-extrabold text-neutral-100 pb-2 border-b border-neutral-800 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-500" />
                  Website Front-End Integration Blueprint
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Your public hotel website or OTA channel can submit direct reservations to AI-HOS using standard JSON POST requests. Every reservation automatically provisions the guest profile, allocates a clean room, posts room charges to folio, and alerts Front Desk reception.
                </p>

                <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 font-mono text-[11px] text-amber-300 space-y-2 overflow-x-auto">
                  <p className="text-neutral-500">// Example POST payload from hotel website or OTA channel:</p>
                  <pre>{`POST http://localhost:8000/api/v1/public/reserve
Content-Type: application/json

{
  "guest_name": "Rajesh Malhotra",
  "guest_phone": "+91 98765 12345",
  "guest_email": "rajesh@malhotra.in",
  "room_type": "Deluxe Heritage King",
  "check_in_date": "2026-09-01",
  "nights": 2,
  "payment_txn_id": "pay_RZP_10293847",
  "channel_name": "MakeMyTrip"  // Options: Self Website, MakeMyTrip, Booking.com, Agoda, Expedia, Corporate Direct
}`}</pre>
                </div>
              </div>

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
                        navigator.clipboard.writeText('http://localhost:8000/api/v1/whatsapp/webhook');
                        showToast('WhatsApp Webhook Callback URL copied!');
                      }}
                      className="text-xs text-amber-400 hover:underline font-bold whitespace-nowrap shrink-0"
                    >
                      Copy Webhook URL 📋
                    </button>
                  </div>
                  <p className="font-mono text-neutral-300 break-all select-all bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800 text-[11px] leading-relaxed">
                    http://localhost:8000/api/v1/whatsapp/webhook
                  </p>
                  <p className="text-[11px] text-neutral-400 pt-0.5">
                    Paste this Webhook Callback URL into Meta Developer Console ➔ WhatsApp ➔ Configuration ➔ Webhook URL.
                  </p>
                </div>
              </form>

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
                <label className="block text-[10px] uppercase font-extrabold text-neutral-400 mb-1">Suite Photo</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editingRoom.image_url || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, image_url: e.target.value })}
                    className="flex-1 text-xs rounded-xl border border-neutral-700 bg-neutral-800 p-2.5 text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                  <label className="cursor-pointer px-3 py-2 bg-neutral-800 hover:bg-neutral-750 text-amber-400 font-bold text-xs rounded-xl border border-neutral-700 transition flex items-center gap-1 shrink-0">
                    <Upload className="h-3.5 w-3.5" />
                    Change Photo
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileChange(e, (url) => setEditingRoom({ ...editingRoom, image_url: url }))}
                    />
                  </label>
                </div>
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

              <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold uppercase text-amber-500">🔗 Channel Booking Link (Copy for Web Developer)</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`http://localhost:8000/api/v1/public/reserve?channel=${newChannelCode.toUpperCase() || 'CODE'}`);
                      showToast('Booking Link copied to clipboard!');
                    }}
                    className="text-[10px] text-amber-400 hover:underline font-bold"
                  >
                    Copy Link 📋
                  </button>
                </div>
                <p className="font-mono text-neutral-300 truncate">http://localhost:8000/api/v1/public/reserve?channel={newChannelCode.toUpperCase() || 'CODE'}</p>
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

    </div>
  );
}
