import { format, parseISO } from "date-fns";
import { formatPHP } from "./format";

interface ReceiptBooking {
  id: string;
  booking_date: string;
  start_hour: number;
  end_hour: number;
  total_price: number;
  status: string;
  payment_ref?: string | null;
  paid_at?: string | null;
  owner_notes?: string | null;
  facilities: { name?: string; sport_type?: string; location?: string } | null;
}

export function downloadReceipt(b: ReceiptBooking, customerName?: string) {
  const issued = b.paid_at ? format(parseISO(b.paid_at), "PPpp") : format(new Date(), "PPpp");
  const dateStr = format(parseISO(b.booking_date), "PPP");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Receipt ${b.id.slice(0,8).toUpperCase()}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:'Helvetica Neue',Arial,sans-serif;color:#0c2340;margin:0;padding:40px;background:#f5f5f5}
  .card{max-width:680px;margin:0 auto;background:#fff;padding:48px;border-radius:16px;box-shadow:0 10px 40px rgba(12,35,64,.1)}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0c2340;padding-bottom:24px;margin-bottom:32px}
  .brand{font-size:32px;font-weight:900;letter-spacing:4px;color:#0c2340}
  .badge{display:inline-block;background:#2d8a9e;color:#fff;padding:6px 14px;border-radius:999px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700}
  h2{font-size:14px;letter-spacing:3px;text-transform:uppercase;color:#5cbdb9;margin:0 0 8px}
  .row{display:flex;justify-content:space-between;padding:14px 0;border-bottom:1px solid #eef2f6}
  .row span:first-child{color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:1px}
  .row span:last-child{font-weight:600;color:#0c2340}
  .total{display:flex;justify-content:space-between;align-items:center;margin-top:24px;padding:20px;background:linear-gradient(135deg,#0c2340,#1a4a6e);border-radius:12px;color:#fff}
  .total .label{font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.8}
  .total .amount{font-size:36px;font-weight:900}
  .foot{margin-top:32px;text-align:center;font-size:12px;color:#94a3b8}
  .actions{margin:24px auto;max-width:680px;text-align:center}
  .actions button{background:#0c2340;color:#fff;border:0;padding:12px 28px;border-radius:8px;font-weight:700;letter-spacing:1px;cursor:pointer;margin:0 4px}
  @media print{.actions{display:none}body{background:#fff;padding:0}.card{box-shadow:none;border-radius:0}}
</style></head>
<body>
  <div class="actions">
    <button onclick="window.print()">Print / Save as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
  <div class="card">
    <div class="head">
      <div>
        <div class="brand">COURTSIDE</div>
        <div style="font-size:12px;color:#6b7280;letter-spacing:2px;margin-top:4px">BUTUAN CITY · PH</div>
      </div>
      <div style="text-align:right">
        <div class="badge">Paid</div>
        <div style="font-size:12px;color:#6b7280;margin-top:8px">Receipt #${b.id.slice(0,8).toUpperCase()}</div>
        <div style="font-size:12px;color:#6b7280">Issued ${issued}</div>
      </div>
    </div>

    <h2>Customer</h2>
    <div class="row"><span>Name</span><span>${escapeHtml(customerName || "—")}</span></div>

    <h2 style="margin-top:28px">Booking</h2>
    <div class="row"><span>Facility</span><span>${escapeHtml(b.facilities?.name || "—")}</span></div>
    <div class="row"><span>Sport</span><span style="text-transform:capitalize">${escapeHtml(b.facilities?.sport_type || "—")}</span></div>
    <div class="row"><span>Location</span><span>${escapeHtml(b.facilities?.location || "—")}</span></div>
    <div class="row"><span>Date</span><span>${dateStr}</span></div>
    <div class="row"><span>Time</span><span>${b.start_hour}:00 – ${b.end_hour}:00 (${b.end_hour - b.start_hour} hr)</span></div>
    <div class="row"><span>Payment ref</span><span style="font-family:monospace">${escapeHtml(b.payment_ref || "—")}</span></div>

    <div class="total">
      <div>
        <div class="label">Total paid</div>
        <div style="font-size:11px;opacity:.7;margin-top:2px">VAT inclusive</div>
      </div>
      <div class="amount">${formatPHP(b.total_price)}</div>
    </div>

    <div class="foot">
      Thank you for booking with Courtside.<br/>
      This is a system-generated receipt and does not require a signature.
    </div>
  </div>
</body></html>`;

  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
