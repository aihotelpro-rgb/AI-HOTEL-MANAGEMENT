'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, CheckCircle2, ShieldCheck, Clock, User, Phone, Mail, FileText, CreditCard, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/api';

export default function PreCheckInPage() {
  const searchParams = useSearchParams();
  const bookingIdParam = searchParams.get('booking_id') || '1';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedPass, setCompletedPass] = useState<any>(null);

  // Form Fields
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [govtIdType, setGovtIdType] = useState('Aadhaar Card');
  const [govtIdNumber, setGovtIdNumber] = useState('');
  const [etaTime, setEtaTime] = useState('14:00');
  const [arrivingVia, setArrivingVia] = useState('Personal Vehicle');
  const [floorPreference, setFloorPreference] = useState('High Floor Suite');
  const [specialRequests, setSpecialRequests] = useState('');
  const [digitallySigned, setDigitallySigned] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        const data = await apiRequest(`/api/v1/public/pre-checkin/${bookingIdParam}`);
        setBookingDetails(data);
        setGuestName(data.guest_name || '');
        setGuestPhone(data.guest_phone || '');
        setGuestEmail(data.guest_email || '');
      } catch (err: any) {
        setError(err.message || 'Unable to fetch booking details');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [bookingIdParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!govtIdNumber) {
      alert('Please enter your Government ID number (Aadhaar / Passport / DL)');
      return;
    }
    if (!digitallySigned) {
      alert('Please accept terms & digital signature before submitting');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiRequest(`/api/v1/public/pre-checkin/${bookingIdParam}`, {
        method: 'POST',
        body: JSON.stringify({
          guest_name: guestName,
          guest_phone: guestPhone,
          guest_email: guestEmail,
          govt_id_type: govtIdType,
          govt_id_number: govtIdNumber,
          eta_time: etaTime,
          arriving_via: arrivingVia,
          floor_preference: floorPreference,
          special_requests: specialRequests,
          digital_signature: `Signed by ${guestName} at ${new Date().toISOString()}`
        })
      });
      setCompletedPass(res);
    } catch (err: any) {
      alert(err.message || 'Pre-check-in submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-amber-500 selection:text-neutral-950 pb-12">
      {/* Luxury Header Banner */}
      <header className="bg-neutral-900 border-b border-neutral-800 py-6 px-4 sticky top-0 z-40 backdrop-blur-md bg-neutral-900/90 shadow-2xl">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-widest block">The Grand Palace Resort</span>
            <h1 className="text-lg font-extrabold text-white flex items-center gap-2">
              <span>⚡ Express Pre-Check-In Registration</span>
            </h1>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs px-3 py-1 rounded-full font-bold">
            Zero Lobby Queue
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6">
        {completedPass ? (
          /* SUCCESS EXPRESS PASS CARD */
          <div className="bg-neutral-900 border border-green-800/60 rounded-3xl p-6 shadow-2xl space-y-6 text-center animate-in zoom-in-95">
            <div className="h-16 w-16 bg-green-500/20 text-green-400 border border-green-500/40 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <span className="text-xs font-bold text-green-400 uppercase tracking-widest">Pre-Arrival Verification Complete</span>
              <h2 className="text-2xl font-extrabold text-white mt-1">Express VIP Pass Active!</h2>
              <p className="text-xs text-neutral-400 mt-1">Namaste {completedPass.guest_name}! Your registration and identity details are 100% verified.</p>
            </div>

            <div className="bg-neutral-950 p-6 rounded-2xl border border-neutral-800 space-y-4">
              <div className="flex justify-between items-center text-xs pb-3 border-b border-neutral-800">
                <span className="text-neutral-400 font-medium">Assigned Suite:</span>
                <span className="text-lg font-extrabold text-amber-400">Suite {completedPass.room_number}</span>
              </div>

              <div className="flex justify-between items-center text-xs pb-3 border-b border-neutral-800">
                <span className="text-neutral-400 font-medium">Express Pass Code:</span>
                <span className="font-mono font-bold text-neutral-200">{completedPass.express_pass_code}</span>
              </div>

              {/* Express Pass QR */}
              <div className="bg-white p-4 rounded-2xl inline-block shadow-md">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(completedPass.express_pass_code)}`}
                  alt="VIP Express Pass QR"
                  className="h-40 w-40 mx-auto"
                />
              </div>

              <p className="text-[11px] text-neutral-400 leading-relaxed pt-2">
                Upon arrival at the hotel, show this **Express Pass QR** to Front Desk for instant 10-second room key collection!
              </p>
            </div>

            <button
              onClick={() => window.location.href = `/room-qr?room=${completedPass.room_number}`}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs rounded-2xl transition shadow-lg flex items-center justify-center gap-2"
            >
              <span>Explore Suite {completedPass.room_number} Digital Amenities</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* PRE CHECK-IN FORM */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Booking Summary Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Confirmed Reservation</span>
                  <h3 className="text-base font-extrabold text-neutral-100">{bookingDetails?.hotel_name}</h3>
                </div>
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-xl">
                  Suite {bookingDetails?.room_number}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 text-xs border-t border-neutral-800/80">
                <div>
                  <span className="text-neutral-500 font-medium block">Check-In:</span>
                  <span className="font-bold text-neutral-300">{new Date(bookingDetails?.check_in).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-medium block">Check-Out:</span>
                  <span className="font-bold text-neutral-300">{new Date(bookingDetails?.check_out).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Step 1: Personal & Contact */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-4 w-4" />
                1. Guest Personal Details
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 block mb-1">Full Primary Guest Name</label>
                  <input
                    type="text"
                    required
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 font-medium focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. Rohan Sharma"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-400 block mb-1">WhatsApp Phone</label>
                    <input
                      type="text"
                      required
                      value={guestPhone}
                      onChange={e => setGuestPhone(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 font-medium focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-400 block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={e => setGuestEmail(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 font-medium focus:border-amber-500 focus:outline-none"
                      placeholder="guest@example.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Identity Verification (Aadhaar / Passport) */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                2. Identity Verification (Govt ID)
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-400 block mb-1">Govt ID Document</label>
                    <select
                      value={govtIdType}
                      onChange={e => setGovtIdType(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 font-medium focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Aadhaar Card">Aadhaar Card (India)</option>
                      <option value="Passport">Passport (International)</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Voter ID">Voter ID</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-400 block mb-1">ID Number</label>
                    <input
                      type="text"
                      required
                      value={govtIdNumber}
                      onChange={e => setGovtIdNumber(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 font-medium focus:border-amber-500 focus:outline-none font-mono"
                      placeholder="e.g. XXXX-XXXX-4920"
                    />
                  </div>
                </div>

                {/* ID Upload Drag & Drop Preview */}
                <div className="relative border-2 border-dashed border-neutral-800 bg-neutral-950 rounded-2xl p-4 text-center cursor-pointer hover:border-amber-500/50 transition">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const previewEl = document.getElementById('id-preview-img') as HTMLImageElement;
                          if (previewEl && ev.target?.result) {
                            previewEl.src = ev.target.result as string;
                            previewEl.classList.remove('hidden');
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <FileText className="h-6 w-6 text-neutral-500 mx-auto mb-1" />
                  <p className="text-xs font-bold text-neutral-300">Tap to Capture or Upload {govtIdType} Photo</p>
                  <p className="text-[10px] text-neutral-500">Supports JPG, PNG, Passport Scan up to 10MB</p>
                  <img id="id-preview-img" alt="Uploaded Govt ID Preview" className="hidden mt-3 max-h-32 mx-auto rounded-xl border border-amber-500/40 shadow-lg object-contain" />
                </div>
              </div>
            </div>

            {/* Step 3: ETA & Stay Preferences */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                3. Expected Arrival & Suite Preferences
              </h3>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-400 block mb-1">Estimated Arrival Time (ETA)</label>
                    <select
                      value={etaTime}
                      onChange={e => setEtaTime(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 font-medium focus:border-amber-500 focus:outline-none"
                    >
                      <option value="12:00 Early Check-In">12:00 PM (Early Arrival)</option>
                      <option value="14:00 Standard">02:00 PM (Standard Check-In)</option>
                      <option value="17:00 Evening">05:00 PM (Evening)</option>
                      <option value="21:00 Late Arrival">09:00 PM (Late Night Arrival)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-400 block mb-1">Arriving Via</label>
                    <select
                      value={arrivingVia}
                      onChange={e => setArrivingVia(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 font-medium focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Personal Vehicle">Personal Vehicle (Valet Needed)</option>
                      <option value="Flight / Airport Taxi">Flight / Airport Taxi</option>
                      <option value="Railway Station Pickup">Railway Station</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-400 block mb-1">Floor & Room Preference</label>
                  <select
                    value={floorPreference}
                    onChange={e => setFloorPreference(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-neutral-100 font-medium focus:border-amber-500 focus:outline-none"
                  >
                    <option value="High Floor Suite">High Floor Suite (Quiet)</option>
                    <option value="Pool View Floor">Pool & Garden View Floor</option>
                    <option value="Near Elevator (Accessible)">Accessible / Near Elevator</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-400 block mb-1">Special Requests & Dietary Choices</label>
                  <textarea
                    rows={2}
                    value={specialRequests}
                    onChange={e => setSpecialRequests(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-neutral-100 font-medium focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. Extra feather pillows, Jain vegetarian food, Anniversary setup..."
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Touchscreen Signature & Declaration */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-4 w-4" />
                4. Digital Registration Signature Pad
              </h3>

              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-center space-y-3">
                <div className="relative bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-inner">
                  <canvas
                    id="signature-canvas"
                    width={400}
                    height={100}
                    className="w-full h-24 touch-none cursor-crosshair"
                    onMouseDown={(e) => {
                      const canvas = e.currentTarget;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.beginPath();
                        const rect = canvas.getBoundingClientRect();
                        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
                        (canvas as any).isDrawing = true;
                      }
                    }}
                    onMouseMove={(e) => {
                      const canvas = e.currentTarget;
                      if ((canvas as any).isDrawing) {
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                          ctx.strokeStyle = '#D97706';
                          ctx.lineWidth = 2.5;
                          ctx.lineCap = 'round';
                          const rect = canvas.getBoundingClientRect();
                          ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                          ctx.stroke();
                          setDigitallySigned(true);
                        }
                      }
                    }}
                    onMouseUp={(e) => {
                      (e.currentTarget as any).isDrawing = false;
                    }}
                  />
                  <span className="absolute bottom-1 right-2 text-[9px] text-neutral-500">Draw Finger/Mouse Signature</span>
                </div>

                <div className="flex justify-between items-center text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      const canvas = document.getElementById('signature-canvas') as HTMLCanvasElement;
                      if (canvas) {
                        const ctx = canvas.getContext('2d');
                        ctx?.clearRect(0, 0, canvas.width, canvas.height);
                        setDigitallySigned(false);
                      }
                    }}
                    className="text-neutral-400 hover:text-red-400 font-bold underline"
                  >
                    Clear Signature
                  </button>
                  <span className={digitallySigned ? "text-green-400 font-bold flex items-center gap-1" : "text-neutral-500"}>
                    {digitallySigned ? "✓ Signature Captured" : "Sign on canvas above"}
                  </span>
                </div>

                <label className="flex items-center gap-2 text-[11px] text-neutral-300 font-medium cursor-pointer pt-1 text-left">
                  <input
                    type="checkbox"
                    checked={digitallySigned}
                    onChange={e => setDigitallySigned(e.target.checked)}
                    className="rounded border-neutral-800 text-amber-500 focus:ring-amber-500 h-4 w-4"
                  />
                  <span>I declare that the details and Govt ID provided above are true & accept hotel policies.</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-extrabold text-xs rounded-2xl transition shadow-2xl flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              <span>{submitting ? 'Verifying Pre-Check-In...' : 'Complete Pre-Check-In & Get VIP Express Pass'}</span>
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
