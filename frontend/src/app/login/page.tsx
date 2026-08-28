'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setAuthToken } from '@/lib/api';
import { Building, Lock, User as UserIcon, Settings, Sparkles, ChefHat, LayoutDashboard, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeQuickRole, setActiveQuickRole] = useState<string | null>(null);

  const performLogin = async (user: string, pass: string) => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: user, password: pass }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ detail: 'Incorrect username or password' }));
        throw new Error(data.detail || 'Login failed');
      }

      const data = await response.json();
      setAuthToken(data.access_token, data.role, data.username);

      // Role-based destination routing
      if (data.role === 'Admin') {
        router.push('/admin');
      } else if (data.role === 'Reception') {
        router.push('/reception');
      } else if (data.role === 'Kitchen') {
        router.push('/kitchen');
      } else if (data.role === 'Housekeeping') {
        router.push('/housekeeping');
      } else if (data.role === 'Executive') {
        router.push('/manager');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to backend server on http://localhost:8000. Please ensure the backend is running.');
    } finally {
      setLoading(false);
      setActiveQuickRole(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLogin(username, password);
  };

  const handleQuickLogin = (u: string, p: string, roleName: string) => {
    setUsername(u);
    setPassword(p);
    setActiveQuickRole(roleName);
    performLogin(u, p);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-8 selection:bg-amber-500 selection:text-neutral-950">
      
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[130px] rounded-full pointer-events-none -z-0"></div>

      <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/90 p-8 shadow-2xl backdrop-blur-xl space-y-6 relative z-10">
        
        <div className="text-center space-y-1.5">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-amber-500 text-neutral-950 items-center justify-center font-extrabold shadow-lg mb-1">
            <Building className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-neutral-100">Staff Portal Sign-In</h2>
          <p className="text-xs text-neutral-400">The Grand Palace Resort & Heritage Spa (₹ INR Edition)</p>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-950/70 border border-red-700/70 p-3.5 text-xs text-red-200 leading-relaxed space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <span>⚠️ Connection Alert:</span>
            </p>
            <p>{error}</p>
            <p className="text-[11px] text-red-300 pt-1 border-t border-red-800">
              💡 Tip: Start the backend via <code className="bg-neutral-900 px-1.5 py-0.5 rounded text-amber-300">start_backend.bat</code> on port 8000.
            </p>
          </div>
        )}

        {/* 1-Click Instant Login Matrix */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500">
              ⚡ 1-Click Instant Access (Auto-Sign In)
            </span>
            <span className="text-[10px] text-neutral-500">Select Role</span>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs">
            
            {/* Super Admin */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleQuickLogin('admin', 'adminpassword', 'Super-Admin')}
              className="p-3 bg-neutral-800 hover:bg-neutral-750 disabled:opacity-50 text-neutral-200 font-bold rounded-2xl border border-neutral-700 hover:border-amber-500/60 transition flex items-center justify-between group"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-red-950 text-red-400 border border-red-800 flex items-center justify-center">
                  <Settings className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="font-extrabold text-neutral-100 block group-hover:text-amber-400">Super-Admin Master</span>
                  <span className="text-[10px] text-neutral-400 font-normal">admin / adminpassword</span>
                </div>
              </div>
              <span className="text-[10px] font-extrabold text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-1 rounded-lg flex items-center gap-1">
                {activeQuickRole === 'Super-Admin' ? 'Entering...' : 'Launch →'}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              {/* Reception */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('reception', 'receptionpassword', 'Reception')}
                className="p-2.5 bg-neutral-800 hover:bg-neutral-750 disabled:opacity-50 text-neutral-200 font-bold rounded-2xl border border-neutral-700 hover:border-blue-500/60 transition text-left space-y-1 group"
              >
                <div className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-blue-400" />
                  <span className="font-extrabold text-neutral-100 group-hover:text-blue-400 text-[11px]">Reception PMS</span>
                </div>
                <span className="text-[10px] text-neutral-400 block font-normal truncate">50-Room Matrix</span>
              </button>

              {/* Kitchen */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('kitchen', 'kitchenpassword', 'Kitchen')}
                className="p-2.5 bg-neutral-800 hover:bg-neutral-750 disabled:opacity-50 text-neutral-200 font-bold rounded-2xl border border-neutral-700 hover:border-amber-500/60 transition text-left space-y-1 group"
              >
                <div className="flex items-center gap-1.5">
                  <ChefHat className="h-3.5 w-3.5 text-amber-400" />
                  <span className="font-extrabold text-neutral-100 group-hover:text-amber-400 text-[11px]">Kitchen KDS</span>
                </div>
                <span className="text-[10px] text-neutral-400 block font-normal truncate">Live 5-Stage Queue</span>
              </button>

              {/* Housekeeping */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('housekeeping', 'housekeepingpassword', 'Housekeeping')}
                className="p-2.5 bg-neutral-800 hover:bg-neutral-750 disabled:opacity-50 text-neutral-200 font-bold rounded-2xl border border-neutral-700 hover:border-green-500/60 transition text-left space-y-1 group"
              >
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-green-400" />
                  <span className="font-extrabold text-neutral-100 group-hover:text-green-400 text-[11px]">Housekeeping</span>
                </div>
                <span className="text-[10px] text-neutral-400 block font-normal truncate">Turnover Matrix</span>
              </button>

              {/* GM Executive */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('manager', 'managerpassword', 'Executive')}
                className="p-2.5 bg-neutral-800 hover:bg-neutral-750 disabled:opacity-50 text-neutral-200 font-bold rounded-2xl border border-neutral-700 hover:border-purple-500/60 transition text-left space-y-1 group"
              >
                <div className="flex items-center gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5 text-purple-400" />
                  <span className="font-extrabold text-neutral-100 group-hover:text-purple-400 text-[11px]">GM Executive</span>
                </div>
                <span className="text-[10px] text-neutral-400 block font-normal truncate">RevPAR & AI Yield</span>
              </button>
            </div>

          </div>
        </div>

        {/* Manual Credentials Form */}
        <form onSubmit={handleFormSubmit} className="space-y-3 pt-3 border-t border-neutral-800">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-500 text-center">Or Sign In Manually</p>
          
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 mb-1">Username</label>
            <div className="relative">
              <UserIcon className="h-4 w-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-xl border border-neutral-700 bg-neutral-800 pl-9 pr-3 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                placeholder="admin, reception, kitchen, housekeeping, manager"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border border-neutral-700 bg-neutral-800 pl-9 pr-3 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-3 text-center font-extrabold text-xs text-neutral-950 transition shadow-lg disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In with Credentials →'}
          </button>
        </form>

        <div className="text-center pt-1">
          <a
            href="/room-qr?room=304"
            className="text-[11px] text-amber-500 hover:underline font-bold"
          >
            Looking for Guest In-Room App (Suite 304)? Click Here →
          </a>
        </div>

      </div>
    </div>
  );
}
