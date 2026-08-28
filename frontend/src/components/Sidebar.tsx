'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building, 
  ChefHat, 
  Sparkles, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  QrCode, 
  ShieldAlert, 
  User as UserIcon,
  Crown,
  Menu,
  X
} from 'lucide-react';
import { clearAuthToken, apiRequest } from '@/lib/api';

interface SidebarProps {
  hotelName?: string;
}

export default function Sidebar({ hotelName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>('Staff');
  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [name, setName] = useState<string>(hotelName || 'The Grand Palace Resort');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('aihos_role') || 'Staff';
      const user = localStorage.getItem('aihos_username') || '';
      setCurrentRole(role);
      setCurrentUsername(user);

      const fetchSettings = () => {
        apiRequest('/api/v1/admin/settings')
          .then(res => {
            if (res?.logo_url) setLogoUrl(res.logo_url);
            if (res?.hotel_name) setName(res.hotel_name);
          })
          .catch(() => {});
      };

      fetchSettings();

      const handleSettingsUpdate = (e: any) => {
        if (e.detail?.logo_url) setLogoUrl(e.detail.logo_url);
        if (e.detail?.hotel_name) setName(e.detail.hotel_name);
      };

      window.addEventListener('aihos_settings_updated', handleSettingsUpdate);
      return () => {
        window.removeEventListener('aihos_settings_updated', handleSettingsUpdate);
      };
    }
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  const navItems = [
    {
      label: 'Super-Admin Master',
      href: '/admin',
      icon: Settings,
      allowedRoles: ['Admin', 'Executive'],
      badge: 'Control',
      badgeColor: 'bg-red-950 text-red-400 border-red-800'
    },
    {
      label: 'Front Desk PMS',
      href: '/reception',
      icon: Building,
      allowedRoles: ['Reception', 'Admin', 'Executive'],
      badge: '50 Rooms',
      badgeColor: 'bg-blue-950 text-blue-400 border-blue-800'
    },
    {
      label: 'Kitchen KDS',
      href: '/kitchen',
      icon: ChefHat,
      allowedRoles: ['Kitchen', 'Admin', 'Executive'],
      badge: 'Live Queue',
      badgeColor: 'bg-amber-950 text-amber-400 border-amber-800'
    },
    {
      label: 'Housekeeping Hub',
      href: '/housekeeping',
      icon: Sparkles,
      allowedRoles: ['Housekeeping', 'Admin', 'Reception', 'Executive'],
      badge: 'Turnovers',
      badgeColor: 'bg-green-950 text-green-400 border-green-800'
    },
    {
      label: 'GM Executive AI',
      href: '/manager',
      icon: LayoutDashboard,
      allowedRoles: ['Executive', 'Admin'],
      badge: '07:30 AI',
      badgeColor: 'bg-purple-950 text-purple-400 border-purple-800'
    }
  ];

  return (
    <>
      {/* 1. STICKY MOBILE TOP BAR (< md screens) */}
      <header className="md:hidden sticky top-0 z-40 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between shadow-lg shrink-0">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt="Hotel Logo" 
              className="h-8 w-8 rounded-lg object-cover border border-amber-500/40 shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 text-neutral-950 flex items-center justify-center font-extrabold shadow-sm shrink-0">
              <Crown className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-xs font-extrabold text-neutral-100 truncate leading-none">
              {name}
            </h2>
            <span className="text-[9px] text-amber-500 font-extrabold uppercase tracking-widest block mt-0.5">
              {currentRole} Access
            </span>
          </div>
        </Link>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 transition shrink-0"
          aria-label="Toggle Navigation Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* 2. MOBILE OVERLAY & SLIDE-OVER DRAWER (< md screens) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />

          {/* Mobile Navigation Drawer */}
          <div className="relative w-4/5 max-w-xs bg-neutral-900 border-r border-neutral-800 h-full flex flex-col justify-between p-4 z-10 shadow-2xl overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-white truncate capitalize">{currentUsername || currentRole}</p>
                    <span className="text-[10px] text-amber-400 font-bold">Role: {currentRole}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mobile Nav Links */}
              <nav className="space-y-2 mt-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const hasAccess = item.allowedRoles.includes(currentRole);

                  return (
                    <Link
                      key={item.href}
                      href={hasAccess ? item.href : '#'}
                      onClick={(e) => {
                        if (!hasAccess) {
                          e.preventDefault();
                          alert(`Access restricted to ${item.allowedRoles.join(', ')} users.`);
                        } else {
                          setMobileOpen(false);
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition ${
                        isActive
                          ? 'bg-amber-500 text-neutral-950 shadow-md font-black'
                          : hasAccess
                          ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-850'
                          : 'text-neutral-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 ${isActive ? 'text-neutral-950' : 'text-neutral-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${
                          isActive ? 'bg-neutral-950 text-amber-400 border-neutral-900' : item.badgeColor
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Footer Actions */}
            <div className="pt-4 border-t border-neutral-800 space-y-2">
              <Link
                href="/room-qr?room=304"
                target="_blank"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-850 border border-neutral-700/80 text-amber-400 text-xs font-bold"
              >
                <QrCode className="h-4 w-4 shrink-0" />
                <span>Guest In-Room App ↗</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition text-xs font-bold"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DESKTOP SIDEBAR (hidden on mobile `< md`, flex on `md+`) */}
      <aside 
        className={`hidden md:flex h-screen bg-neutral-900 border-r border-neutral-800 flex-col justify-between transition-all duration-300 z-30 shrink-0 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header with Live Logo */}
        <div>
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 min-w-0">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Hotel Logo" 
                  className="h-10 w-10 rounded-xl object-cover border border-amber-500/40 shrink-0 shadow-md"
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-neutral-950 flex items-center justify-center font-extrabold shadow-md shrink-0">
                  <Crown className="h-5 w-5" />
                </div>
              )}

              {!collapsed && (
                <div className="min-w-0">
                  <h2 className="text-xs font-extrabold text-neutral-100 truncate leading-tight tracking-tight">
                    {name}
                  </h2>
                  <span className="text-[10px] text-amber-500 font-extrabold uppercase tracking-widest block mt-0.5">
                    AI-HOS Enterprise
                  </span>
                </div>
              )}
            </Link>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-white transition shrink-0"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          {/* Current User Role Identity */}
          <div className={`p-3.5 mx-3 mt-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3 ${collapsed ? 'justify-center mx-2 p-2' : ''}`}>
            <div className="h-8 w-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
              <UserIcon className="h-4 w-4" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-neutral-200 truncate capitalize">
                  {currentUsername || currentRole}
                </p>
                <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                  {currentRole} Access
                </span>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const hasAccess = item.allowedRoles.includes(currentRole);

              return (
                <Link
                  key={item.href}
                  href={hasAccess ? item.href : '#'}
                  onClick={(e) => {
                    if (!hasAccess) {
                      e.preventDefault();
                      alert(`Access restricted to ${item.allowedRoles.join(', ')} users.`);
                    }
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition ${
                    isActive
                      ? 'bg-amber-500 text-neutral-950 shadow-md font-extrabold'
                      : hasAccess
                      ? 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                      : 'text-neutral-600 cursor-not-allowed opacity-50'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-neutral-950' : 'text-neutral-400'}`} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </div>

                  {!collapsed && item.badge && (
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${
                      isActive ? 'bg-neutral-950 text-amber-400 border-neutral-900' : item.badgeColor
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Footer Actions */}
        <div className="p-3 border-t border-neutral-800 space-y-2">
          <Link
            href="/room-qr?room=304"
            target="_blank"
            className={`flex items-center gap-2 p-2 rounded-xl bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 text-amber-400 text-xs font-bold transition ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Open Guest In-Room App (Suite 304)"
          >
            <QrCode className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate">Guest In-Room App ↗</span>}
          </Link>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 p-2 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition text-xs font-bold ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Sign Out of Operations"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
