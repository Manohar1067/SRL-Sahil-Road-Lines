import type { Dispatch } from "./types";
import type { CompanyInfo } from "./store";

const INR = (n: number) =>
  "Rs. " + new Intl.NumberFormat("en-IN").format(Math.round(Number(n) || 0));

// A4 portrait at ~150 DPI
const W = 1240;
const H = 1754;

// Brand colours matching the physical memo
const RED    = "#c0272d";
const NAVY   = "#1a2e5e";
const TEXT   = "#0b1220";
const MUTED  = "#5b6472";
const BORDER = "#9ca3af";  // gray-400

// ── Helpers ──────────────────────────────────────────────────────────────────

function drawTruncated(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number) {
  let s = String(text || "");
  while (ctx.measureText(s).width > maxW && s.length > 1) s = s.slice(0, -1);
  if (s !== String(text || "")) s = s.slice(0, -1) + "…";
  ctx.fillText(s, x, y);
}

/** Draw a single diamond (rotated square) at centre cx,cy, half-width hw, half-height hh */
function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  hw: number, hh: number,
  strokeW: number, color: string
) {
  ctx.beginPath();
  ctx.moveTo(cx,      cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx,      cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = strokeW;
  ctx.stroke();
}

/** Draw the SRL 3-diamond logo at top-left corner position (lx, ly) */
function drawSrlLogo(ctx: CanvasRenderingContext2D, lx: number, ly: number, scale: number) {
  // Three diamond centres in logo coordinate space, then scaled
  // S (top-centre): local (60, 30), R (bottom-left): (32, 68), L (bottom-right): (88, 68)
  // viewBox is 120 x 110, scale maps it to desired size
  const diamonds = [
    { cx: 60, cy: 30, letter: "S" },
    { cx: 32, cy: 68, letter: "R" },
    { cx: 88, cy: 68, letter: "L" },
  ];
  const HW = 26 * scale; // half-width
  const HH = 32 * scale; // half-height
  const INSET = 5 * scale;
  const NAVY_C = NAVY;

  // Draw white fill first for each, then outer border, then inner border, then letter
  ctx.save();
  ctx.translate(lx, ly);

  diamonds.forEach(({ cx, cy, letter }) => {
    const scx = cx * scale, scy = cy * scale;

    // White fill
    ctx.beginPath();
    ctx.moveTo(scx,       scy - HH);
    ctx.lineTo(scx + HW,  scy);
    ctx.lineTo(scx,       scy + HH);
    ctx.lineTo(scx - HW,  scy);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    // Outer border
    drawDiamond(ctx, scx, scy, HW, HH, 3 * scale, NAVY_C);

    // Inner inset border
    drawDiamond(ctx, scx, scy, HW - INSET, HH - INSET, 1.5 * scale, NAVY_C);

    // Letter
    ctx.fillStyle = NAVY_C;
    ctx.font = `700 ${Math.round(18 * scale)}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, scx, scy);
  });

  ctx.restore();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
}

// ── Horizontal divider line ───────────────────────────────────────────────────
function hline(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, color = BORDER, lw = 1.2) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function vline(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, color = BORDER, lw = 1.2) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/** Draw a labelled field — small label above, value below */
function field(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, maxW: number,
  label: string, value: string
) {
  ctx.fillStyle = MUTED;
  ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText(label, x, y);
  ctx.fillStyle = TEXT;
  ctx.font = "600 20px Inter, Arial, sans-serif";
  drawTruncated(ctx, value || "—", x, y + 22, maxW - 8);
}

// ── Main render ───────────────────────────────────────────────────────────────

export function renderMemoToCanvas(d: Dispatch, company: CompanyInfo): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "top";

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Outer thin black border
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth   = 2.5;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  const L = 50;          // left margin
  const FW = W - 100;   // full content width
  let y = 35;

  // ── TOP INFO BAR ─────────────────────────────────────────────────────────
  ctx.fillStyle = MUTED;
  ctx.font = "400 16px Inter, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("* Subject to Visakhapatnam Jurisdiction", L, y + 6);
  ctx.textAlign = "right";
  ctx.fillText(`Cell: ${company.phone || "93931 02969"}`, L + FW, y + 6);
  ctx.textAlign = "left";
  y += 32;

  hline(ctx, 30, y, W - 60, BORDER, 1);

  // ── HEADER — Logo left, company info right ────────────────────────────────
  const LOGO_AREA_W = 200;
  const HEADER_H    = 180;

  // Logo scale: logo viewBox 120px → LOGO_AREA_W ≈ 166px => scale ~1.4
  const logoScale = 1.6;
  const logoLX = L;
  const logoLY = y + 10;
  drawSrlLogo(ctx, logoLX, logoLY, logoScale);

  // Vertical divider between logo and company text
  vline(ctx, L + LOGO_AREA_W, y, HEADER_H, NAVY, 2.5);

  // Company text — right of logo
  const CX = L + LOGO_AREA_W + 24;
  ctx.fillStyle = RED;
  ctx.font = "800 46px Inter, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("SAHIL ROAD LINES", CX, y + 14);

  // Blue subtitle bar
  const subBarY = y + 66;
  ctx.fillStyle = NAVY;
  ctx.fillRect(CX, subBarY, FW - LOGO_AREA_W - 24, 34);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 17px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TRANSPORT CONTRACTORS & COMMISSION AGENTS", CX + (FW - LOGO_AREA_W - 24) / 2, subBarY + 9);
  ctx.textAlign = "left";

  ctx.fillStyle = TEXT;
  ctx.font = "400 16px Inter, Arial, sans-serif";
  ctx.fillText(
    company.address || "Plot No.5, N.H.-5 Road, Opp. Radio Station, Kurmannapalem, Visakhapatnam - 530 046.",
    CX, subBarY + 44
  );
  ctx.font = "400 15px Inter, Arial, sans-serif";
  ctx.fillStyle = MUTED;
  const gstLine = company.gst ? `GST: ${company.gst}` : "";
  ctx.fillText(gstLine, CX, subBarY + 68);

  y += HEADER_H;

  // Bottom border of header (navy thick)
  hline(ctx, 30, y, W - 60, NAVY, 3);
  y += 4;

  // ── MEMO NO. + DATE ROW ───────────────────────────────────────────────────
  const rowH = 52;
  hline(ctx, 30, y + rowH, W - 60);

  // "No."
  ctx.fillStyle = TEXT;
  ctx.font = "700 20px Inter, Arial, sans-serif";
  ctx.fillText("No.", L, y + 14);

  // Receipt number — red bold
  ctx.fillStyle = RED;
  ctx.font = "700 26px Inter, Courier New, monospace";
  ctx.fillText(d.receiptNumber, L + 52, y + 10);

  // Centre title
  ctx.fillStyle = RED;
  ctx.font = "800 26px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GOODS DESPATCH MEMO", W / 2, y + 13);
  ctx.textAlign = "left";

  // Date right
  ctx.fillStyle = TEXT;
  ctx.font = "600 20px Inter, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`Date: ${d.date}`, L + FW, y + 14);
  ctx.textAlign = "left";

  y += rowH + 4;

  // ── FROM / TO / GC / ARTICLE ROW ─────────────────────────────────────────
  hline(ctx, 30, y + rowH, W - 60);
  const col4 = FW / 4;
  ctx.fillStyle = MUTED;
  ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("From", L, y + 6);
  ctx.fillStyle = TEXT;
  ctx.font = "600 20px Inter, Arial, sans-serif";
  drawTruncated(ctx, `${d.from || "—"}`, L + 60, y + 8, col4 * 1.5 - 20);
  ctx.fillStyle = MUTED;
  ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("to", L + col4 * 1.5 + 10, y + 6);
  ctx.fillStyle = TEXT;
  ctx.font = "600 20px Inter, Arial, sans-serif";
  drawTruncated(ctx, d.to || "—", L + col4 * 1.5 + 40, y + 8, col4 - 20);

  vline(ctx, L + col4 * 2.5, y, rowH);
  ctx.fillStyle = MUTED; ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("G.C. No.", L + col4 * 2.5 + 10, y + 6);
  ctx.fillStyle = TEXT; ctx.font = "600 20px Inter, Arial, sans-serif";
  drawTruncated(ctx, d.gcNumber || "—", L + col4 * 2.5 + 10, y + 24, col4 - 20);

  vline(ctx, L + col4 * 3.3, y, rowH);
  ctx.fillStyle = MUTED; ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("Article", L + col4 * 3.3 + 10, y + 6);
  ctx.fillStyle = TEXT; ctx.font = "600 20px Inter, Arial, sans-serif";
  drawTruncated(ctx, d.article || "—", L + col4 * 3.3 + 10, y + 24, col4 * 0.7 - 20);

  y += rowH + 4;

  // ── LORRY OWNER / DRIVER ROW ──────────────────────────────────────────────
  hline(ctx, 30, y + rowH, W - 60);
  const halfW = FW / 2;
  ctx.fillStyle = MUTED; ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("Lorry Owner Name :", L, y + 6);
  ctx.fillStyle = TEXT; ctx.font = "600 20px Inter, Arial, sans-serif";
  drawTruncated(ctx, d.lorryOwnerName || "—", L + 210, y + 6, halfW - 220);

  vline(ctx, L + halfW, y, rowH);
  ctx.fillStyle = MUTED; ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("Driver Name :", L + halfW + 10, y + 6);
  ctx.fillStyle = TEXT; ctx.font = "600 20px Inter, Arial, sans-serif";
  drawTruncated(ctx, d.driverName || "—", L + halfW + 160, y + 6, halfW - 170);

  y += rowH + 4;

  // ── CONSIGNOR ROW ─────────────────────────────────────────────────────────
  hline(ctx, 30, y + rowH, W - 60);
  ctx.fillStyle = MUTED; ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("Consignor M/S", L, y + 6);
  ctx.fillStyle = TEXT; ctx.font = "600 22px Inter, Arial, sans-serif";
  drawTruncated(ctx, d.consignor || "—", L + 175, y + 6, FW - 185);

  y += rowH + 4;

  // ── CONSIGNEE ROW ─────────────────────────────────────────────────────────
  hline(ctx, 30, y + rowH, W - 60);
  ctx.fillStyle = MUTED; ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("Consignee M/S", L, y + 6);
  ctx.fillStyle = TEXT; ctx.font = "600 22px Inter, Arial, sans-serif";
  drawTruncated(ctx, d.consignee || "—", L + 175, y + 6, FW - 185);

  y += rowH + 4;

  // ── DESCRIPTION ROW ──────────────────────────────────────────────────────
  hline(ctx, 30, y + rowH, W - 60);
  ctx.fillStyle = MUTED; ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("Description", L, y + 6);
  ctx.fillStyle = TEXT; ctx.font = "500 20px Inter, Arial, sans-serif";
  drawTruncated(ctx, d.description || "—", L + 140, y + 6, FW - 150);

  y += rowH + 4;

  // ── PER TON / WEIGHT ROW ─────────────────────────────────────────────────
  hline(ctx, 30, y + rowH, W - 60);
  ctx.fillStyle = MUTED; ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("Per Ton Rs.", L, y + 6);
  ctx.fillStyle = TEXT; ctx.font = "700 22px Inter, Arial, sans-serif";
  ctx.fillText(String(d.ratePerTon || "—"), L + 148, y + 6);
  ctx.fillStyle = MUTED; ctx.font = "500 16px Inter, Arial, sans-serif";
  ctx.fillText("P.M.T.", L + 148 + 100, y + 10);

  vline(ctx, W / 2, y, rowH);
  ctx.fillStyle = MUTED; ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`Weight.  ${String(d.weight || "—")} Tons`, L + FW, y + 12);
  ctx.textAlign = "left";

  y += rowH + 4;

  // ── GR NOTICE ─────────────────────────────────────────────────────────────
  const noticeH = 46;
  hline(ctx, 30, y + noticeH, W - 60, BORDER, 2);
  ctx.fillStyle = RED;
  ctx.font = "700 22px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Goods Receipt should be arrived within 15 days", W / 2, y + 12);
  ctx.textAlign = "left";

  y += noticeH + 4;

  // ── THREE-COLUMN BOTTOM SECTION ───────────────────────────────────────────
  const BOTTOM_H = 360;
  const leftW    = Math.round(FW * 0.37);
  const midW     = Math.round(FW * 0.26);
  const rightW   = FW - leftW - midW;

  const colLX = L;
  const colMX = L + leftW;
  const colRX = L + leftW + midW;

  // Outer box
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(L, y, FW, BOTTOM_H);

  // Column dividers
  vline(ctx, colMX, y, BOTTOM_H);
  vline(ctx, colRX, y, BOTTOM_H);

  // LEFT COLUMN cells
  const cellH = 62;
  const cells = [
    { label: "Net Freight", value: INR(d.netFreight) },
    { label: "Advance", value: INR(d.advance) },
    { label: "Balance", value: INR(d.balance) },
    { label: "Paid at", value: d.paidAt || "—" },
  ];
  cells.forEach(({ label, value }, i) => {
    const cy2 = y + i * cellH;
    hline(ctx, colLX, cy2 + cellH, leftW, BORDER);
    field(ctx, colLX + 10, cy2 + 8, leftW, label, value);
  });

  // Small text in left bottom
  const termsY = y + cellH * 4 + 10;
  ctx.fillStyle = MUTED;
  ctx.font = "400 14px Inter, Arial, sans-serif";
  ctx.fillText("I agree with terms and conditions overleaf", colLX + 10, termsY);
  ctx.fillText("and abide by that Received the goods in", colLX + 10, termsY + 18);
  ctx.fillText("good condition.", colLX + 10, termsY + 36);

  // CENTRE COLUMN — Truck No.
  hline(ctx, colMX, y + 50, midW, BORDER);
  ctx.fillStyle = MUTED;
  ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Truck No.", colMX + midW / 2, y + 14);
  ctx.fillStyle = TEXT;
  ctx.font = "800 34px Inter, Courier New, monospace";
  ctx.fillText(d.truckNumber || "—", colMX + midW / 2, y + 70);
  ctx.textAlign = "left";

  // RIGHT COLUMN cells
  const rcells = [
    { label: "Commission", value: INR(d.commission) },
    { label: "Loading", value: INR(d.loadingCharges) },
    { label: "Total Expenses", value: INR(d.totalExpenses) },
  ];
  rcells.forEach(({ label, value }, i) => {
    const cy2 = y + i * cellH;
    hline(ctx, colRX, cy2 + cellH, rightW, BORDER);
    field(ctx, colRX + 10, cy2 + 8, rightW, label, value);
  });

  // Remarks in right column
  const remarksY = y + cellH * 3 + 8;
  ctx.fillStyle = MUTED;
  ctx.font = "600 16px Inter, Arial, sans-serif";
  ctx.fillText("Remarks", colRX + 10, remarksY);
  ctx.fillStyle = TEXT;
  ctx.font = "400 16px Inter, Arial, sans-serif";
  drawTruncated(ctx, d.remarks || "—", colRX + 10, remarksY + 20, rightW - 20);

  y += BOTTOM_H + 4;

  // ── SIGNATURES ────────────────────────────────────────────────────────────
  const sigH = 150;
  hline(ctx, 30, y + sigH, W - 60);
  vline(ctx, W / 2, y, sigH);

  const sigLineY = y + 100;

  // Left — Driver
  hline(ctx, L + 20, sigLineY, halfW - 60, "#374151", 1.2);
  ctx.fillStyle = MUTED;
  ctx.font = "500 17px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Signature of the Driver on behalf of the Owner.", L + halfW / 2, sigLineY + 12);
  ctx.textAlign = "left";

  // Right — Authorized
  ctx.fillStyle = TEXT;
  ctx.font = "600 18px Inter, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`For. SAHIL ROAD LINES`, L + FW, y + 10);
  ctx.textAlign = "left";

  hline(ctx, W / 2 + 20, sigLineY, halfW - 60, "#374151", 1.2);
  ctx.fillStyle = MUTED;
  ctx.font = "500 17px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Authorised Signature", W / 2 + halfW / 2, sigLineY + 12);
  ctx.textAlign = "left";

  y += sigH + 4;

  // ── FOOTER ────────────────────────────────────────────────────────────────
  ctx.fillStyle = RED;
  ctx.font = "700 20px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    "Return payment will not get without this Receipt and any other particulars",
    W / 2, y + 10
  );
  ctx.textAlign = "left";

  return canvas;
}

// ── Async (logo image support kept for legacy Settings logo) ─────────────────

export async function renderMemoAsync(d: Dispatch, company: CompanyInfo): Promise<HTMLCanvasElement> {
  // SRL logo is now drawn directly via canvas paths — no external image needed.
  return renderMemoToCanvas(d, company);
}

export async function downloadMemoPNG(d: Dispatch, company: CompanyInfo) {
  const canvas = await renderMemoAsync(d, company);
  const link = document.createElement("a");
  link.download = `${d.receiptNumber}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export async function downloadMemoPDF(d: Dispatch, company: CompanyInfo) {
  const canvas = await renderMemoAsync(d, company);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const img = canvas.toDataURL("image/png");
  pdf.addImage(img, "PNG", 0, 0, pageW, pageH);
  pdf.save(`${d.receiptNumber}.pdf`);
}

export async function printMemo(d: Dispatch, company: CompanyInfo) {
  const canvas = await renderMemoAsync(d, company);
  const dataUrl = canvas.toDataURL("image/png");
  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return;
  w.document.open();
  w.document.write(`<!doctype html><html><head><title>${d.receiptNumber}</title>
    <style>
      @page { size: A4 portrait; margin: 0; }
      html,body { margin:0; padding:0; background:#fff; }
      img { width:100%; height:auto; display:block; }
      @media print { img { width:100vw; height:100vh; object-fit:contain; } }
    </style></head><body>
    <img src="${dataUrl}" onload="setTimeout(()=>{window.focus();window.print();}, 150)" />
  </body></html>`);
  w.document.close();
}

