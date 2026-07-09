import type { Dispatch } from "./types";
import type { CompanyInfo } from "./store";

const INR = (n: number) =>
  "Rs. " + new Intl.NumberFormat("en-IN").format(Math.round(Number(n) || 0));

// A4 portrait at ~150 DPI
const W = 1240;
const H = 1754;

const PRIMARY = "#1f4fc4";
const TEXT = "#0b1220";
const MUTED = "#5b6472";
const BORDER = "#b7c0d1";
const SOFT = "#eef2fb";

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number) {
  let display = text;
  while (ctx.measureText(display).width > maxW && display.length > 3) display = display.slice(0, -2);
  if (display !== text) display = display.slice(0, -1) + "…";
  ctx.fillText(display, x, y);
}

function drawSection(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  title: string
) {
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = SOFT;
  ctx.fillRect(x, y, w, 26);
  ctx.fillStyle = PRIMARY;
  ctx.font = "700 12px Inter, Arial, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText(title.toUpperCase(), x + 10, y + 13);
  ctx.textBaseline = "top";
}

function drawField(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  label: string, value: string
) {
  ctx.fillStyle = MUTED;
  ctx.font = "600 10px Inter, Arial, sans-serif";
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.fillStyle = TEXT;
  ctx.font = "600 13px Inter, Arial, sans-serif";
  drawText(ctx, value || "—", x, y + 14, w - 6);
}

export function renderMemoToCanvas(d: Dispatch, company: CompanyInfo): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "top";

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // Outer border
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, W - 60, H - 60);

  // ===== Header =====
  ctx.fillStyle = PRIMARY;
  ctx.fillRect(30, 30, W - 60, 130);

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "700 34px Inter, Arial, sans-serif";
  ctx.fillText(company.name || "SAHIL ROAD LINES", W / 2, 48);
  ctx.font = "600 14px Inter, Arial, sans-serif";
  ctx.fillText("TRANSPORT CONTRACTORS & COMMISSION AGENTS", W / 2, 86);
  ctx.font = "400 12px Inter, Arial, sans-serif";
  ctx.fillText(company.address || "", W / 2, 108);
  ctx.fillText(
    `Phone: ${company.phone || "-"}   |   GST: ${company.gst || "-"}${company.email ? `   |   Email: ${company.email}` : ""}`,
    W / 2, 126
  );
  ctx.textAlign = "left";

  // Title strip
  let y = 170;
  ctx.fillStyle = SOFT;
  ctx.fillRect(30, y, W - 60, 34);
  ctx.strokeStyle = BORDER;
  ctx.strokeRect(30, y, W - 60, 34);
  ctx.fillStyle = PRIMARY;
  ctx.font = "700 18px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GOODS DISPATCH MEMO", W / 2, y + 9);
  ctx.font = "600 12px Inter, Arial, sans-serif";
  ctx.fillStyle = TEXT;
  ctx.textAlign = "right";
  ctx.fillText(`Memo No: ${d.receiptNumber}`, W - 50, y + 12);
  ctx.textAlign = "left";
  y += 44;

  const LEFT = 50;
  const FULL_W = W - 100;
  const col = (n: 2 | 3 | 4) => (FULL_W - 20) / n;

  // ===== Dispatch Information =====
  {
    const secH = 90;
    drawSection(ctx, LEFT, y, FULL_W, secH, "Dispatch Information");
    const rowY = y + 40;
    const cw = col(4);
    drawField(ctx, LEFT + 10, rowY, cw, "Dispatch Memo #", d.receiptNumber);
    drawField(ctx, LEFT + 10 + cw, rowY, cw, "Dispatch Date", d.date);
    drawField(ctx, LEFT + 10 + cw * 2, rowY, cw, "Documentation Date", d.documentationDate || "—");
    drawField(ctx, LEFT + 10 + cw * 3, rowY, cw, "Invoice Date", d.invoiceDate || "—");
    y += secH + 10;
  }

  // ===== Transport =====
  {
    const secH = 90;
    drawSection(ctx, LEFT, y, FULL_W, secH, "Transport");
    const rowY = y + 40;
    const cw = col(4);
    drawField(ctx, LEFT + 10, rowY, cw, "Truck Number", d.truckNumber);
    drawField(ctx, LEFT + 10 + cw, rowY, cw, "Driver", d.driverName);
    drawField(ctx, LEFT + 10 + cw * 2, rowY, cw, "Lorry Owner", d.lorryOwnerName);
    drawField(ctx, LEFT + 10 + cw * 3, rowY, cw, "Route", `${d.from || "—"} → ${d.to || "—"}`);
    y += secH + 10;
  }

  // ===== Customer Information =====
  {
    const secH = 90;
    drawSection(ctx, LEFT, y, FULL_W, secH, "Customer Information");
    const rowY = y + 40;
    const cw = col(3);
    drawField(ctx, LEFT + 10, rowY, cw, "Consignor", d.consignor);
    drawField(ctx, LEFT + 10 + cw, rowY, cw, "Consignee", d.consignee);
    drawField(ctx, LEFT + 10 + cw * 2, rowY, cw, "Material", d.article);
    y += secH + 10;
  }

  // ===== Freight =====
  {
    const secH = 90;
    drawSection(ctx, LEFT, y, FULL_W, secH, "Freight");
    const rowY = y + 40;
    const cw = col(3);
    drawField(ctx, LEFT + 10, rowY, cw, "Weight (Tons)", String(d.weight));
    drawField(ctx, LEFT + 10 + cw, rowY, cw, "Rate Per Ton", INR(d.ratePerTon));
    drawField(ctx, LEFT + 10 + cw * 2, rowY, cw, "Total Freight", INR(d.netFreight));
    y += secH + 10;
  }

  // ===== Payment =====
  {
    const secH = 130;
    drawSection(ctx, LEFT, y, FULL_W, secH, "Payment");
    const cw = col(4);
    const r1 = y + 40;
    drawField(ctx, LEFT + 10, r1, cw, "Advance", INR(d.advance));
    drawField(ctx, LEFT + 10 + cw, r1, cw, "Balance", INR(d.balance));
    drawField(ctx, LEFT + 10 + cw * 2, r1, cw, "Commission", INR(d.commission));
    drawField(ctx, LEFT + 10 + cw * 3, r1, cw, "Loading Charges", INR(d.loadingCharges));
    const r2 = r1 + 46;
    const cw2 = col(2);
    drawField(ctx, LEFT + 10, r2, cw2, "Paid At", d.paidAt || "—");
    drawField(ctx, LEFT + 10 + cw2, r2, cw2, "Total Expenses", INR(d.totalExpenses));
    y += secH + 10;
  }

  // ===== Delivery =====
  {
    const secH = 80;
    drawSection(ctx, LEFT, y, FULL_W, secH, "Delivery");
    const rowY = y + 40;
    const cw = col(2);
    drawField(ctx, LEFT + 10, rowY, cw, "Status", d.status);
    drawField(ctx, LEFT + 10 + cw, rowY, cw, "Delivery Date", d.deliveryDate || "Pending");
    y += secH + 10;
  }

  // ===== Remarks =====
  {
    const secH = 90;
    drawSection(ctx, LEFT, y, FULL_W, secH, "Remarks");
    ctx.fillStyle = TEXT;
    ctx.font = "500 12px Inter, Arial, sans-serif";
    const remarks = d.remarks || "—";
    const words = remarks.split(/\s+/);
    let ln = "";
    let ry = y + 40;
    const maxW = FULL_W - 20;
    words.forEach((w) => {
      const test = ln ? ln + " " + w : w;
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(ln, LEFT + 10, ry);
        ry += 16;
        ln = w;
      } else ln = test;
    });
    if (ln) ctx.fillText(ln, LEFT + 10, ry);
    y += secH + 10;
  }

  // ===== Signatures =====
  const sigY = H - 150;
  const sigW = FULL_W / 3;
  ctx.strokeStyle = "#475569";
  ["Prepared By", "Driver Signature", "Authorized Signature"].forEach((lbl, i) => {
    const x = LEFT + i * sigW;
    ctx.beginPath();
    ctx.moveTo(x + 20, sigY + 50);
    ctx.lineTo(x + sigW - 30, sigY + 50);
    ctx.stroke();
    ctx.fillStyle = MUTED;
    ctx.font = "600 11px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(lbl.toUpperCase(), x + sigW / 2, sigY + 58);
    ctx.textAlign = "left";
  });

  // Footer
  ctx.fillStyle = MUTED;
  ctx.font = "400 10px Inter, Arial, sans-serif";
  ctx.fillText(
    `Generated: ${new Date().toLocaleString("en-IN")} — Computer-generated memo.`,
    50, H - 55
  );
  ctx.textAlign = "right";
  ctx.fillText(`For ${company.name || "SAHIL ROAD LINES"}`, W - 50, H - 55);
  ctx.textAlign = "left";

  return canvas;
}

export async function renderMemoAsync(d: Dispatch, company: CompanyInfo): Promise<HTMLCanvasElement> {
  const canvas = renderMemoToCanvas(d, company);
  if (company.logo) {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const ctx = canvas.getContext("2d")!;
        ctx.save();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(50, 45, 100, 100);
        const ratio = Math.min(90 / img.width, 90 / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, 50 + (100 - w) / 2, 45 + (100 - h) / 2, w, h);
        ctx.restore();
        resolve();
      };
      img.onerror = () => resolve();
      img.src = company.logo;
    });
  }
  return canvas;
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
