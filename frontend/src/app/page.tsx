import Link from 'next/link';
import { Sparkles, Utensils, Building, ChefHat, LayoutDashboard, Key, ShieldCheck, Settings, Crown, PhoneCall } from 'lucide-react';

export default function Home() {
  const roomsFloor1 = Array.from({ length: 12 }, (_, i) => `1${(i + 1).toString().padStart(2, '0')}`);
  const roomsFloor2 = Array.from({ length: 12 }, (_, i) => `2${(i + 1).toString().padStart(2, '0')}`);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 px-4 py-12 text-center selection:bg-amber-500 selection:text-neutral-950">
      
      {/* Glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none -z-0"></div>

      <div className="max-w-2xl w-full bg-neutral-900/90 border border-neutral-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-7">
        
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-950/60 border border-amber-500/40 rounded-full text-[11px] font-extrabold uppercase text-amber-400 tracking-widest mb-3">
            <Crown className="h-3.5 w-3.5" />
            Luxury Island Hospitality & AI Systems
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 tracking-tight">
            Hotel Blue Bird Inn
          </h1>
          <p className="text-amber-400/90 text-xs font-semibold mt-1">
            Garacharma, Sri Vijayapuram, Andaman & Nicobar Islands
          </p>
          <p className="text-neutral-400 text-xs mt-2 max-w-lg mx-auto leading-relaxed">
            24 Luxury Island Rooms across 2 Floors • Live Intercom Calling • 5-Stage Gourmet Island Dining (₹ INR) • Front Desk PMS & GM Executive Yield AI.
          </p>
        </div>

        {/* 24-Room Direct Access Pass Grid */}
        <div className="p-4 bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 rounded-2xl text-left space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-400">Guest Experience Web App</span>
            <span className="text-[10px] text-green-400 font-bold bg-green-950/60 px-2 py-0.5 rounded-full border border-green-700/40">App-Free QR (₹ INR)</span>
          </div>

          <div className="flex justify-between items-center border-b border-neutral-800/60 pb-2">
            <h3 className="font-extrabold text-neutral-100 text-xs sm:text-sm">Select Your Room Number (24 Island Suites):</h3>
            <Link
              href="/room-qr?room=204"
              className="text-[10px] text-amber-400 hover:underline font-extrabold"
            >
              Open Default Room 204 →
            </Link>
          </div>

          {/* Floor 1 Buttons */}
          <div className="space-y-1">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-neutral-500 block">Floor 1 Suites (Rooms 101 – 112):</span>
            <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5">
              {roomsFloor1.map(room => (
                <Link
                  key={room}
                  href={`/room-qr?room=${room}`}
                  className="py-2 bg-neutral-950 hover:bg-amber-500 hover:text-neutral-950 border border-neutral-800 text-white font-extrabold text-xs rounded-xl text-center transition shadow-sm"
                >
                  {room}
                </Link>
              ))}
            </div>
          </div>

          {/* Floor 2 Buttons */}
          <div className="space-y-1 pt-1">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-500/80 block">Floor 2 Royal Suites (Rooms 201 – 212):</span>
            <div className="grid grid-cols-6 sm:grid-cols-6 gap-1.5">
              {roomsFloor2.map(room => (
                <Link
                  key={room}
                  href={`/room-qr?room=${room}`}
                  className={`py-2 border font-extrabold text-xs rounded-xl text-center transition shadow-sm ${room === '204' ? 'bg-amber-500 text-neutral-950 border-amber-400 ring-2 ring-amber-500/50' : 'bg-neutral-950 hover:bg-amber-500 hover:text-neutral-950 border-neutral-800 text-white'}`}
                >
                  {room}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Staff Operations Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-extrabold">Staff Operations Portals</span>
            <Link href="/login" className="text-[10px] text-amber-500 hover:underline font-bold">Staff Login Portal →</Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-left">
            <Link
              href="/reception"
              className="p-3.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 rounded-xl transition group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-blue-950 text-blue-400 border border-blue-800/40 shrink-0 mt-0.5">
                <Building className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-100 group-hover:text-amber-400">Front Desk PMS & Intercom</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5">24-room matrix, 1-click check-in/out, Call History & GST folio.</p>
              </div>
            </Link>

            <Link
              href="/kitchen"
              className="p-3.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 rounded-xl transition group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-amber-950 text-amber-400 border border-amber-800/40 shrink-0 mt-0.5">
                <ChefHat className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-100 group-hover:text-amber-400">Kitchen KDS</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5">5-stage prep timers, audio chimes & runner call.</p>
              </div>
            </Link>

            <Link
              href="/housekeeping"
              className="p-3.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 rounded-xl transition group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-green-950 text-green-400 border border-green-800/40 shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-100 group-hover:text-amber-400">Housekeeping Hub</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5">Turnover room matrix & inspection checklists.</p>
              </div>
            </Link>

            <Link
              href="/manager"
              className="p-3.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 rounded-xl transition group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-purple-950 text-purple-400 border border-purple-800/40 shrink-0 mt-0.5">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-100 group-hover:text-amber-400">GM Executive AI</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5">RevPAR (₹), ADR, Sentiment Radar & 07:30 Briefing.</p>
              </div>
            </Link>

            <Link
              href="/admin"
              className="p-3.5 bg-neutral-850 hover:bg-neutral-800 border border-neutral-700/80 rounded-xl transition group flex items-start gap-3 sm:col-span-2 lg:col-span-2"
            >
              <div className="p-2 rounded-lg bg-red-950 text-red-400 border border-red-800/40 shrink-0 mt-0.5">
                <Settings className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-100 group-hover:text-amber-400">Super-Admin Master Control</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5">Configure Hotel Blue Bird Inn Settings, 24 Rooms, Menu & Staff Roles.</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-neutral-500 flex items-center justify-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
          <span>Garacharma, Sri Vijayapuram • Hotel Blue Bird Inn AI Suite • ₹ INR Currency</span>
        </div>

      </div>
    </div>
  );
}
