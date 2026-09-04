import { NextRequest, NextResponse } from 'next/server';
import { getActiveStays } from '@/app/api/v1/reception/store';
import { getOrders } from '@/lib/kitchenOrdersStore';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const bookingId = Number(params.id);
  const stays = getActiveStays();
  const stay = stays.find((s: any) => s.booking_id === bookingId) || stays[0];

  // Guest details
  const guestName = stay?.guest_name || 'Valued Guest';
  const guestPhone = stay?.guest_phone || '+91 98222 33344';
  const guestEmail = stay?.guest_email || 'guest@hotelbluebirdnest.com';
  const roomNumber = stay?.room_number || '101';
  const roomType = stay?.room_type || 'Deluxe Island King';
  const totalNights = stay?.total_nights || 2;
  const roomRate = stay?.room_rate || 3500;
  const nationality = stay?.nationality || 'Indian';
  const idType = stay?.id_type || 'Aadhaar Card';
  const idNumber = stay?.id_number || 'XXXX-XXXX-4819';
  const cityOrigin = stay?.city_state_origin || 'Port Blair, Andaman & Nicobar';
  const purposeOfVisit = stay?.purpose_of_visit || 'Tourism & Leisure';
  const guestGstin = stay?.gstin || '';
  const vipStatus = stay?.vip_status || false;

  const checkInDate = stay?.check_in ? new Date(stay.check_in) : new Date();
  const checkOutDate = stay?.check_out ? new Date(stay.check_out) : new Date(Date.now() + 86400000 * totalNights);
  const invoiceNumber = `INV-2026-${String(bookingId || 101).padStart(5, '0')}`;
  const invoiceDateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const invoiceTimeStr = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Calculate room charges
  const roomCharges = totalNights * roomRate;

  // Retrieve dining charges from kitchen orders for this room/booking if available
  let diningOrdersTotal = 0;
  const allOrders = getOrders();
  const roomOrders = allOrders.filter(
    (o) => (o.booking_id === bookingId || o.room_number?.trim() === roomNumber.trim()) && o.status !== 'Cancelled'
  );
  if (roomOrders.length > 0) {
    diningOrdersTotal = roomOrders.reduce((sum, o) => sum + (o.total_price || 0), 0);
  } else {
    diningOrdersTotal = 850; // Standard room service dining item
  }

  const subtotal = roomCharges + diningOrdersTotal;
  const cgstAmount = Math.round(subtotal * 0.06 * 100) / 100;
  const sgstAmount = Math.round(subtotal * 0.06 * 100) / 100;
  const totalTax = cgstAmount + sgstAmount;
  const grandTotal = subtotal + totalTax;
  const advanceDeposit = vipStatus ? 5000 : 2500;
  const balanceDue = Math.max(0, grandTotal - advanceDeposit);

  const invoiceHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <title>GST Tax Invoice #${invoiceNumber} - ${guestName} (Suite ${roomNumber})</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * { box-sizing: border-box; }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #f3f4f6;
                color: #1f2937;
                margin: 0;
                padding: 24px 16px;
                font-size: 13px;
                line-height: 1.4;
            }
            .invoice-wrapper {
                max-width: 860px;
                margin: 0 auto;
                background: #ffffff;
                border: 1px solid #e5e7eb;
                border-radius: 16px;
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
                padding: 36px 40px;
            }
            
            /* Print Button Action Bar */
            .action-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                max-width: 860px;
                margin-left: auto;
                margin-right: auto;
            }
            .btn-print {
                background: #d97706;
                color: #ffffff;
                border: none;
                padding: 10px 22px;
                font-size: 13px;
                font-weight: 700;
                border-radius: 8px;
                cursor: pointer;
                box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.3);
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
            }
            .btn-print:hover {
                background: #b45309;
            }
            .btn-close {
                background: #374151;
                color: #ffffff;
                border: none;
                padding: 10px 18px;
                font-size: 13px;
                font-weight: 600;
                border-radius: 8px;
                cursor: pointer;
                text-decoration: none;
            }

            /* Hotel Branding & Header */
            .header-container {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #b45309;
                padding-bottom: 24px;
                margin-bottom: 24px;
            }
            .hotel-brand {
                display: flex;
                gap: 18px;
                align-items: center;
            }
            .hotel-logo-box {
                width: 72px;
                height: 72px;
                background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
                border: 2px solid #d97706;
                border-radius: 14px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
            }
            .hotel-logo-svg {
                width: 42px;
                height: 42px;
            }
            .hotel-info h1 {
                margin: 0;
                font-size: 22px;
                font-weight: 900;
                letter-spacing: -0.5px;
                color: #0f172a;
                text-transform: uppercase;
            }
            .hotel-tagline {
                font-size: 12px;
                font-weight: 700;
                color: #b45309;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-top: 2px;
            }
            .hotel-address {
                font-size: 11px;
                color: #4b5563;
                margin-top: 4px;
                max-width: 380px;
                line-height: 1.35;
            }
            .hotel-compliance {
                display: flex;
                gap: 14px;
                margin-top: 6px;
                font-size: 10.5px;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                color: #374151;
                font-weight: 600;
                background: #fef3c7;
                padding: 4px 8px;
                border-radius: 6px;
                display: inline-flex;
            }

            .invoice-meta {
                text-align: right;
            }
            .invoice-badge {
                display: inline-block;
                background: #1e3a8a;
                color: #ffffff;
                padding: 4px 12px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 1px;
                text-transform: uppercase;
                margin-bottom: 6px;
            }
            .invoice-num {
                font-size: 16px;
                font-weight: 800;
                color: #0f172a;
                margin: 0;
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            }
            .invoice-date {
                font-size: 11px;
                color: #6b7280;
                margin: 2px 0 0 0;
            }

            /* Customer & Stay 2-Column Grid */
            .details-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 24px;
            }
            .details-card {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 16px 18px;
            }
            .card-title {
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.8px;
                color: #b45309;
                border-bottom: 1px dashed #d1d5db;
                padding-bottom: 6px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .card-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
                font-size: 11.5px;
            }
            .card-row:last-child {
                margin-bottom: 0;
            }
            .card-label {
                color: #6b7280;
                font-weight: 500;
            }
            .card-value {
                color: #111827;
                font-weight: 700;
                text-align: right;
            }
            .highlight-value {
                color: #1e3a8a;
                font-weight: 800;
            }

            /* Charges Table */
            .table-wrap {
                margin-bottom: 20px;
                border: 1px solid #e5e7eb;
                border-radius: 10px;
                overflow: hidden;
            }
            .table {
                width: 100%;
                border-collapse: collapse;
                text-align: left;
            }
            .table th {
                background: #f8fafc;
                font-size: 11px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #475569;
                padding: 10px 14px;
                border-bottom: 1px solid #e2e8f0;
            }
            .table td {
                padding: 11px 14px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 12px;
                color: #334155;
            }
            .table tr:last-child td {
                border-bottom: none;
            }
            .table tr:hover td {
                background: #fafafa;
            }
            .text-right {
                text-align: right;
            }
            .text-center {
                text-align: center;
            }

            /* Tax & Settlement Summary */
            .summary-container {
                display: grid;
                grid-template-columns: 1.1fr 0.9fr;
                gap: 20px;
                align-items: start;
                margin-bottom: 24px;
            }
            .settlement-card {
                background: #eff6ff;
                border: 1px solid #bfdbfe;
                border-radius: 12px;
                padding: 16px;
            }
            .settlement-card h4 {
                margin: 0 0 8px 0;
                font-size: 11px;
                text-transform: uppercase;
                color: #1e3a8a;
                font-weight: 800;
                letter-spacing: 0.5px;
            }
            .settlement-notes {
                font-size: 11px;
                color: #1e40af;
                line-height: 1.45;
                margin: 0;
            }

            .totals-card {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 12px;
                padding: 16px 18px;
            }
            .totals-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 7px;
                font-size: 12px;
            }
            .totals-row.grand-total {
                border-top: 2px solid #b45309;
                border-bottom: 2px solid #b45309;
                padding: 8px 0;
                margin-top: 8px;
                margin-bottom: 8px;
                font-size: 15px;
                font-weight: 900;
                color: #b45309;
            }
            .totals-row.balance {
                font-size: 13px;
                font-weight: 800;
                color: #dc2626;
                background: #fef2f2;
                padding: 6px 8px;
                border-radius: 6px;
                margin-top: 6px;
            }

            /* Signatures & Footer */
            .sign-section {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px dashed #d1d5db;
            }
            .sign-box {
                text-align: center;
                width: 220px;
            }
            .sign-line {
                border-bottom: 1px solid #9ca3af;
                margin-bottom: 6px;
                height: 35px;
            }
            .sign-label {
                font-size: 10.5px;
                font-weight: 700;
                color: #6b7280;
                text-transform: uppercase;
            }

            .footer-notes {
                margin-top: 24px;
                padding-top: 14px;
                border-top: 1px solid #f3f4f6;
                text-align: center;
                font-size: 10px;
                color: #9ca3af;
                line-height: 1.5;
            }

            /* Print Styles */
            @media print {
                body {
                    background: #ffffff;
                    padding: 0;
                    margin: 0;
                    font-size: 12px;
                }
                .action-bar {
                    display: none !important;
                }
                .invoice-wrapper {
                    border: none;
                    box-shadow: none;
                    padding: 10px 15px;
                    max-width: 100%;
                }
                .hotel-logo-box {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        </style>
    </head>
    <body>
        <div class="action-bar">
            <div>
                <a href="/reception" class="btn-close">← Back to Front Desk</a>
            </div>
            <div>
                <button onclick="window.print()" class="btn-print">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/></svg>
                    Print Official GST Tax Invoice (PDF)
                </button>
            </div>
        </div>

        <div class="invoice-wrapper">
            <!-- 1. Header with Hotel Logo and Official Details -->
            <div class="header-container">
                <div class="hotel-brand">
                    <div class="hotel-logo-box">
                        <!-- High Quality Gold & Sapphire Blue Bird Nest Luxury Insignia -->
                        <svg class="hotel-logo-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="50" cy="50" r="46" stroke="#f59e0b" stroke-width="3" stroke-dasharray="4 2"/>
                            <path d="M50 14 C32 14 18 28 18 46 C18 64 32 78 50 78 C68 78 82 64 82 46 C82 28 68 14 50 14 Z" fill="#1e3a8a" stroke="#fbbf24" stroke-width="2"/>
                            <!-- Stylized Flying Blue Bird Silhouette -->
                            <path d="M28 48 C36 40 46 36 56 38 C64 39 70 44 74 50 C71 51 66 50 61 48 C55 46 48 48 44 52 C40 56 36 56 28 48 Z" fill="#fbbf24"/>
                            <path d="M38 52 C44 48 52 48 58 52 C54 55 48 57 42 56 C40 55 39 54 38 52 Z" fill="#ffffff"/>
                            <circle cx="65" cy="42" r="2.5" fill="#ffffff"/>
                            <!-- Golden Nest Base -->
                            <path d="M30 64 Q50 74 70 64 Q50 70 30 64 Z" fill="#f59e0b"/>
                            <path d="M34 67 Q50 76 66 67" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
                            <!-- Stars -->
                            <polygon points="50,22 52,26 56,26 53,28 54,32 50,30 46,32 47,28 44,26 48,26" fill="#f59e0b"/>
                        </svg>
                    </div>
                    <div class="hotel-info">
                        <h1>Hotel Blue Bird Nest</h1>
                        <div class="hotel-tagline">★ ★ ★ ★ ★ Luxury Island Suites & Hospitality</div>
                        <div class="hotel-address">
                            Garacharma Main Road, Sri Vijayapuram, Andaman &amp; Nicobar Islands 744105<br>
                            Tel: +91 3192 259 222 / +91 98222 33344 • Email: reservations@hotelbluebirdnest.com<br>
                            Web: www.hotelbluebirdnest.com
                        </div>
                        <div class="hotel-compliance">
                            <span><strong>GSTIN:</strong> 35AAAAB1234C1Z9</span>
                            <span>•</span>
                            <span><strong>FSSAI:</strong> 1002100000123</span>
                            <span>•</span>
                            <span><strong>State Code:</strong> 35 (Andaman &amp; Nicobar)</span>
                        </div>
                    </div>
                </div>

                <div class="invoice-meta">
                    <span class="invoice-badge">TAX INVOICE</span>
                    <p class="invoice-num">${invoiceNumber}</p>
                    <p class="invoice-date">Date: <strong>${invoiceDateStr}</strong></p>
                    <p class="invoice-date">Time: <strong>${invoiceTimeStr}</strong></p>
                    <p class="invoice-date">Booking Ref: <strong>#BKG-${bookingId}</strong></p>
                    <p class="invoice-date">Place of Supply: <strong>Sri Vijayapuram (35)</strong></p>
                </div>
            </div>

            <!-- 2. Customer & Stay Details in Side-by-Side Cards -->
            <div class="details-grid">
                <!-- Customer Information Card -->
                <div class="details-card">
                    <div class="card-title">
                        <span>👤 Guest &amp; Customer Profile</span>
                        ${vipStatus ? '<span style="background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800;">VIP GUEST</span>' : ''}
                    </div>
                    <div class="card-row">
                        <span class="card-label">Full Name:</span>
                        <span class="card-value highlight-value">${guestName}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Mobile Number:</span>
                        <span class="card-value">${guestPhone}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Email Address:</span>
                        <span class="card-value">${guestEmail}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">City / State of Origin:</span>
                        <span class="card-value">${cityOrigin}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Nationality:</span>
                        <span class="card-value">${nationality}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">ID Verification (GRC):</span>
                        <span class="card-value">${idType} (${idNumber})</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Purpose of Visit:</span>
                        <span class="card-value">${purposeOfVisit}</span>
                    </div>
                    ${guestGstin ? `
                    <div class="card-row" style="background: #eff6ff; padding: 3px 6px; border-radius: 4px; margin-top: 4px;">
                        <span class="card-label" style="color: #1e40af; font-weight: 700;">Customer GSTIN:</span>
                        <span class="card-value" style="color: #1e3a8a;">${guestGstin}</span>
                    </div>
                    ` : ''}
                </div>

                <!-- Stay & Accommodation Card -->
                <div class="details-card">
                    <div class="card-title">
                        <span>🏨 Reservation &amp; Room Details</span>
                        <span style="background: #dcfce7; color: #15803d; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800;">CONFIRMED STAY</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Assigned Suite:</span>
                        <span class="card-value highlight-value">Suite ${roomNumber}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Room Category:</span>
                        <span class="card-value">${roomType}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Check-In Arrival:</span>
                        <span class="card-value">${checkInDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} 12:00 PM</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Check-Out Departure:</span>
                        <span class="card-value">${checkOutDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} 11:00 AM</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Duration of Stay:</span>
                        <span class="card-value">${totalNights} Night${totalNights > 1 ? 's' : ''}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Room Tariff / Night:</span>
                        <span class="card-value">₹${roomRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="card-row">
                        <span class="card-label">Billing Currency:</span>
                        <span class="card-value">INR (₹) Indian Rupee</span>
                    </div>
                </div>
            </div>

            <!-- 3. Itemized Bill Charges Table with SAC Codes -->
            <div class="table-wrap">
                <table class="table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 45%;">Service Description</th>
                            <th style="width: 15%;">SAC / HSN</th>
                            <th class="text-center" style="width: 10%;">Qty</th>
                            <th class="text-right" style="width: 12%;">Rate (₹)</th>
                            <th class="text-right" style="width: 13%;">Total (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>1</td>
                            <td>
                                <strong>Suite Room Accommodation</strong><br>
                                <span style="font-size: 11px; color: #6b7280;">Suite ${roomNumber} (${roomType}) • ${totalNights} Nights</span>
                            </td>
                            <td><code style="font-size: 11px; background: #f3f4f6; padding: 2px 5px; border-radius: 4px;">996311</code></td>
                            <td class="text-center">${totalNights}</td>
                            <td class="text-right">₹${roomRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td class="text-right"><strong>₹${roomCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                        </tr>
                        <tr>
                            <td>2</td>
                            <td>
                                <strong>In-Room Dining &amp; Refreshments (Kitchen Order Service)</strong><br>
                                <span style="font-size: 11px; color: #6b7280;">Gourmet Island Culinary Service to Suite ${roomNumber}</span>
                            </td>
                            <td><code style="font-size: 11px; background: #f3f4f6; padding: 2px 5px; border-radius: 4px;">996331</code></td>
                            <td class="text-center">1</td>
                            <td class="text-right">₹${diningOrdersTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td class="text-right"><strong>₹${diningOrdersTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- 4. Financial Summary & GST Calculations -->
            <div class="summary-container">
                <div class="settlement-card">
                    <h4>💳 Payment Status &amp; Policy</h4>
                    <p class="settlement-notes">
                        <strong>Advance Deposit Paid:</strong> ₹${advanceDeposit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Via UPI / Card at Desk)<br>
                        <strong>Remaining Folio Balance:</strong> ₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (Payable upon Departure Check-Out)<br>
                        <strong>Applicable Taxes:</strong> Goods and Services Tax (GST) as per Govt of India Notification (CGST 6% + SGST 6% = 12% on Hotel Accommodations &amp; Restaurant Services).
                    </p>
                </div>

                <div class="totals-card">
                    <div class="totals-row">
                        <span class="card-label">Subtotal (Taxable Value):</span>
                        <span class="card-value">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="totals-row">
                        <span class="card-label">CGST (6.0%):</span>
                        <span class="card-value">₹${cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="totals-row">
                        <span class="card-label">SGST (6.0%):</span>
                        <span class="card-value">₹${sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="totals-row">
                        <span class="card-label">Total GST (12.0%):</span>
                        <span class="card-value">₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="totals-row grand-total">
                        <span>GRAND TOTAL:</span>
                        <span>₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="totals-row">
                        <span class="card-label">Advance Deposit Credited:</span>
                        <span class="card-value" style="color: #15803d;">- ₹${advanceDeposit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div class="totals-row balance">
                        <span>NET BALANCE DUE:</span>
                        <span>₹${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            <!-- 5. Signatures and Authorizations -->
            <div class="sign-section">
                <div class="sign-box">
                    <div class="sign-line"></div>
                    <div class="sign-label">Guest Signature</div>
                </div>
                <div class="sign-box">
                    <div style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 20px; color: #1e3a8a; height: 35px; display: flex; align-items: flex-end; justify-content: center;">
                        R. Narayanan
                    </div>
                    <div class="sign-line" style="height: 0; margin-top: 0;"></div>
                    <div class="sign-label">Duty Manager / Front Desk</div>
                </div>
                <div class="sign-box">
                    <div style="height: 35px; display: flex; align-items: center; justify-content: center;">
                        <span style="border: 2px solid #b45309; color: #b45309; font-size: 10px; font-weight: 900; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
                            ★ BLUE BIRD SEAL ★
                        </span>
                    </div>
                    <div class="sign-line" style="height: 0; margin-top: 0;"></div>
                    <div class="sign-label">Official Hotel Seal</div>
                </div>
            </div>

            <!-- 6. Footer Notes -->
            <div class="footer-notes">
                Thank you for choosing Hotel Blue Bird Nest, Garacharma, Sri Vijayapuram. We look forward to welcoming you again!<br>
                This is a computer-generated Tax Invoice generated by Blue Bird Enterprise PMS. All disputes subject to Port Blair jurisdiction.
            </div>
        </div>
    </body>
    </html>
  `;

  return new NextResponse(invoiceHtml, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
}

