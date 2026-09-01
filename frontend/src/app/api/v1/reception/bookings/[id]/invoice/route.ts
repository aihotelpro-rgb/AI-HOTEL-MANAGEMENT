import { NextRequest, NextResponse } from 'next/server';

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
  
  const invoiceHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>GST Tax Invoice - Booking #${bookingId}</title>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 20px auto; padding: 30px; background: #fff; color: #111; border: 1px solid #ddd; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-radius: 12px; }
            .invoice-header { display: flex; justify-content: space-between; border-bottom: 2px solid #b45309; padding-bottom: 20px; margin-bottom: 20px; }
            .hotel-name { font-size: 24px; font-weight: 900; color: #b45309; text-transform: uppercase; }
            .gst-number { font-size: 11px; color: #666; font-family: monospace; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
            .table th { background: #fffbe0; font-size: 11px; text-transform: uppercase; color: #78350f; }
            .total-row { font-weight: bold; font-size: 16px; color: #b45309; }
            @media print {
                body { border: none; box-shadow: none; margin: 0; padding: 0; }
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="no-print" style="text-align: right; margin-bottom: 15px;">
            <button onclick="window.print()" style="background: #b45309; color: #fff; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; border-radius: 8px;">🖨️ Print GST Tax Invoice</button>
        </div>

        <div class="invoice-header">
            <div>
                <div class="hotel-name">THE GRAND PALACE RESORT</div>
                <div style="font-size: 12px; color: #555;">Luxury Hotel & Spa • Garacharma, Sri Vijayapuram</div>
                <div class="gst-number">GSTIN: 35AAAAA0000A1Z5 | FSSAI: 1002100000123</div>
            </div>
            <div style="text-align: right;">
                <h3 style="margin: 0; color: #111;">OFFICIAL GST TAX INVOICE</h3>
                <p style="margin: 5px 0; font-size: 12px; font-weight: bold;">Invoice #${1000 + bookingId}</p>
                <p style="margin: 0; font-size: 12px; color: #666;">Date: ${new Date().toLocaleDateString()}</p>
            </div>
        </div>

        <table class="table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Amount (INR)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Suite Room Tariff (Nights Occupancy)</td>
                    <td>Accommodation</td>
                    <td>₹9,000.00</td>
                </tr>
                <tr>
                    <td>In-Room Gourmet Culinary Dining</td>
                    <td>Food & Beverage</td>
                    <td>₹1,920.00</td>
                </tr>
                <tr>
                    <td>Luxury Spa & Wellness Package</td>
                    <td>Services</td>
                    <td>₹2,400.00</td>
                </tr>
                <tr>
                    <td colspan="2" style="text-align: right; font-weight: bold;">Subtotal:</td>
                    <td>₹13,320.00</td>
                </tr>
                <tr>
                    <td colspan="2" style="text-align: right; font-weight: bold;">GST @ 12%:</td>
                    <td>₹1,598.40</td>
                </tr>
                <tr class="total-row">
                    <td colspan="2" style="text-align: right;">GRAND TOTAL PAID:</td>
                    <td>₹14,918.40</td>
                </tr>
            </tbody>
        </table>

        <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px; text-align: center; font-size: 11px; color: #777;">
            Thank you for staying with The Grand Palace Resort! Computer Generated Official GST Invoice.
        </div>
    </body>
    </html>
  `;

  return new NextResponse(invoiceHtml, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
  });
}
