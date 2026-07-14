import * as XLSX from "xlsx";
import { STORAGE_KEYS } from "./store";
import type { AuditEntry, Dispatch, Driver, Party, Truck } from "./types";
import type { AppSettings } from "./store";

export interface ExportPayload {
  exportedAt: string;
  version: 3;
  data: Record<string, unknown>;
}

function readKey<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function dispatchRows(dispatches: Dispatch[]) {
  return dispatches.map((d) => ({
    "Memo Number": d.receiptNumber,
    "Dispatch Date": d.date,
    "Documentation Date": d.documentationDate ?? "",
    "Invoice Date": d.invoiceDate ?? "",
    From: d.from,
    To: d.to,
    "Truck Number": d.truckNumber,
    "Driver Name": d.driverName,
    "Lorry Owner": d.lorryOwnerName,
    Consignor: d.consignor,
    Consignee: d.consignee,
    Material: d.article,
    Weight: d.weight,
    "Rate Per Ton": d.ratePerTon,
    "Total Freight": d.netFreight,
    Advance: d.advance,
    Balance: d.balance,
    "Paid By": d.paidAt,
    Commission: d.commission,
    "Loading Charges": d.loadingCharges,
    TDS: d.tds ?? 0,
    "Goods Mamuli": d.goodsMamuli ?? 0,
    "Local Driver Guide": d.localDriverGuide ?? 0,
    "Detention Charges": d.detentionCharges ?? 0,
    "Total Expenses": d.totalExpenses,
    "Final Payable": d.finalPayable ?? 0,
    "Final Payment Date": d.finalPaymentDate ?? "",
    Status: d.status,
    "Delivery Date": d.deliveryDate ?? "",
    "Unloading Date": d.unloadingDate ?? "",
    Remarks: d.remarks,
    "Created At": d.createdAt,
  }));
}

function reportRows(dispatches: Dispatch[]) {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthDispatches = dispatches.filter((d) => {
    const date = d.date.includes("/")
      ? d.date.split("/").reverse().join("-")
      : d.date.slice(0, 10);
    return date >= monthStart;
  });
  const totalRevenue = monthDispatches.reduce((s, d) => s + d.netFreight, 0);
  const totalExpenses = monthDispatches.reduce((s, d) => s + d.totalExpenses, 0);
  return [
    { Metric: "Monthly Dispatches", Value: monthDispatches.length },
    { Metric: "Monthly Revenue", Value: totalRevenue },
    { Metric: "Monthly Expenses", Value: totalExpenses },
    { Metric: "Monthly Profit", Value: totalRevenue - totalExpenses },
    { Metric: "Pending Payments", Value: dispatches.filter((d) => d.balance > 0).length },
    { Metric: "Running Trips", Value: dispatches.filter((d) => d.status === "Dispatched" || d.status === "Shipped").length },
  ];
}

function settingsRows(settings: AppSettings) {
  return [
    { Field: "Company Name", Value: settings.company.name },
    { Field: "Address", Value: settings.company.address },
    { Field: "Phone", Value: settings.company.phone },
    { Field: "GST", Value: settings.company.gst },
    { Field: "Email", Value: settings.company.email },
    { Field: "Logo", Value: settings.company.logo ? "(Set)" : "(Not set)" },
    { Field: "Auto Lock (minutes)", Value: settings.autoLockMinutes ?? 15 },
    { Field: "Admin PIN", Value: settings.adminPinHash ? "(Set)" : "(Default)" },
    { Field: "Paid By Options", Value: (settings.paidByOptions ?? []).join(", ") },
  ];
}

function auditRows(audit: AuditEntry[]) {
  return audit.map((a) => ({
    Date: new Date(a.changedAt).toLocaleDateString("en-IN"),
    Time: new Date(a.changedAt).toLocaleTimeString("en-IN"),
    User: a.changedBy,
    Module: a.entity,
    Action: a.action,
    "Receipt Number": a.receiptNumber ?? "",
    "Entity ID": a.entityId,
  }));
}

/** Export all data as an Excel workbook (.xlsx) */
export function exportToExcel(): Blob {
  const dispatches = readKey<Dispatch[]>(STORAGE_KEYS.dispatches, []);
  const trucks = readKey<Truck[]>(STORAGE_KEYS.trucks, []);
  const drivers = readKey<Driver[]>(STORAGE_KEYS.drivers, []);
  const consignors = readKey<Party[]>(STORAGE_KEYS.consignors, []);
  const consignees = readKey<Party[]>(STORAGE_KEYS.consignees, []);
  const settings = readKey<AppSettings>(STORAGE_KEYS.settings, { darkMode: false, company: { name: "", address: "", phone: "", gst: "", email: "", logo: "" } });
  const audit = readKey<AuditEntry[]>(STORAGE_KEYS.audit, []);

  const wb = XLSX.utils.book_new();

  const sheets: [string, Record<string, unknown>[]][] = [
    ["Dispatches", dispatchRows(dispatches.filter((d) => !d.deletedAt))],
    ["Drivers", drivers.map((d) => ({ Name: d.name, Phone: d.phone, License: d.licenseNumber, "Assigned Truck": d.assignedTruck, Status: d.status }))],
    ["Trucks", trucks.map((t) => ({ "Truck Number": t.truckNumber, Owner: t.ownerName, Driver: t.driver, Status: t.status }))],
    ["Consignors", consignors.map((p) => ({ Company: p.companyName, Phone: p.phone, GST: p.gst, Address: p.address }))],
    ["Consignees", consignees.map((p) => ({ Company: p.companyName, Phone: p.phone, GST: p.gst, Address: p.address }))],
    ["Reports", reportRows(dispatches.filter((d) => !d.deletedAt))],
    ["Settings", settingsRows(settings)],
    ["Audit Logs", auditRows(audit)],
  ];

  sheets.forEach(([name, rows]) => {
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: "No data" }]);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/** Export JSON backup (legacy support) */
export function exportToJson(): string {
  const data: Record<string, unknown> = {};
  Object.values(STORAGE_KEYS).forEach((k) => {
    const v = localStorage.getItem(k);
    data[k] = v ? JSON.parse(v) : null;
  });
  return JSON.stringify({ exportedAt: new Date().toISOString(), version: 3, data }, null, 2);
}

export interface ImportResult {
  success: boolean;
  message: string;
  sheetsImported?: string[];
}

function writeKey(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function dispatchFromRow(row: Record<string, unknown>, existing?: Dispatch): Dispatch {
  const base = existing ?? {
    id: Math.random().toString(36).slice(2, 10),
    receiptNumber: String(row["Memo Number"] || ""),
    date: String(row["Dispatch Date"] || ""),
    from: String(row.From || ""),
    to: String(row.To || ""),
    gcNumber: "",
    article: String(row.Material || ""),
    truckNumber: String(row["Truck Number"] || ""),
    driverName: String(row["Driver Name"] || ""),
    lorryOwnerName: String(row["Lorry Owner"] || ""),
    consignor: String(row.Consignor || ""),
    consignee: String(row.Consignee || ""),
    description: "",
    weight: Number(row.Weight || 0),
    ratePerTon: Number(row["Rate Per Ton"] || 0),
    netFreight: Number(row["Total Freight"] || 0),
    advance: Number(row.Advance || 0),
    balance: Number(row.Balance || 0),
    paidAt: String(row["Paid By"] || row["Paid At"] || ""),
    commission: Number(row.Commission || 0),
    loadingCharges: Number(row["Loading Charges"] || 0),
    totalExpenses: Number(row["Total Expenses"] || 0),
    remarks: String(row.Remarks || ""),
    status: (row.Status as Dispatch["status"]) || "Created",
    locked: true,
    createdAt: String(row["Created At"] || new Date().toISOString()),
  };
  return {
    ...base,
    documentationDate: String(row["Documentation Date"] || base.documentationDate || ""),
    invoiceDate: String(row["Invoice Date"] || base.invoiceDate || ""),
    deliveryDate: String(row["Delivery Date"] || base.deliveryDate || ""),
    unloadingDate: String(row["Unloading Date"] || base.unloadingDate || ""),
    finalPayable: Number(row["Final Payable"] ?? base.finalPayable ?? 0),
    finalPaymentDate: String(row["Final Payment Date"] || base.finalPaymentDate || ""),
  };
}

function validateDispatches(rows: Record<string, unknown>[]): { valid: Dispatch[]; errors: string[] } {
  const errors: string[] = [];
  const valid: Dispatch[] = [];
  rows.forEach((row, i) => {
    const memo = row["Memo Number"];
    if (!memo) {
      errors.push(`Row ${i + 2}: Missing Memo Number`);
      return;
    }
    valid.push(dispatchFromRow(row));
  });
  return { valid, errors };
}

/** Import from Excel (.xlsx) */
export function importFromExcel(buffer: ArrayBuffer): ImportResult {
  try {
    const wb = XLSX.read(buffer, { type: "array" });
    const sheetsImported: string[] = [];
    const errors: string[] = [];

    if (wb.SheetNames.includes("Dispatches")) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Dispatches);
      const { valid, errors: rowErrors } = validateDispatches(rows);
      errors.push(...rowErrors);
      if (valid.length) {
        const existing = readKey<Dispatch[]>(STORAGE_KEYS.dispatches, []);
        const map = new Map(existing.map((d) => [d.receiptNumber, d]));
        valid.forEach((d) => map.set(d.receiptNumber, { ...map.get(d.receiptNumber), ...d, id: map.get(d.receiptNumber)?.id ?? d.id }));
        writeKey(STORAGE_KEYS.dispatches, [...map.values()]);
        sheetsImported.push("Dispatches");
      }
    }

    const entitySheets: [string, string, (row: Record<string, unknown>) => unknown][] = [
      ["Trucks", STORAGE_KEYS.trucks, (r) => ({ id: Math.random().toString(36).slice(2, 10), truckNumber: String(r["Truck Number"] || ""), ownerName: String(r.Owner || ""), driver: String(r.Driver || ""), status: (r.Status as Truck["status"]) || "Available" })],
      ["Drivers", STORAGE_KEYS.drivers, (r) => ({ id: Math.random().toString(36).slice(2, 10), name: String(r.Name || ""), phone: String(r.Phone || ""), licenseNumber: String(r.License || ""), assignedTruck: String(r["Assigned Truck"] || ""), status: (r.Status as Driver["status"]) || "Active" })],
      ["Consignors", STORAGE_KEYS.consignors, (r) => ({ id: Math.random().toString(36).slice(2, 10), companyName: String(r.Company || ""), phone: String(r.Phone || ""), gst: String(r.GST || ""), address: String(r.Address || "") })],
      ["Consignees", STORAGE_KEYS.consignees, (r) => ({ id: Math.random().toString(36).slice(2, 10), companyName: String(r.Company || ""), phone: String(r.Phone || ""), gst: String(r.GST || ""), address: String(r.Address || "") })],
    ];

    entitySheets.forEach(([sheetName, key, mapper]) => {
      if (!wb.SheetNames.includes(sheetName)) return;
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]);
      const items = rows.filter((r) => Object.values(r).some((v) => v !== undefined && v !== "")).map(mapper);
      if (items.length) {
        writeKey(key, items);
        sheetsImported.push(sheetName);
      }
    });

    window.dispatchEvent(new CustomEvent("srl-store-change", { detail: {} }));

    if (errors.length && !sheetsImported.length) {
      return { success: false, message: errors.join("; ") };
    }
    return {
      success: true,
      message: errors.length
        ? `Imported with warnings: ${errors.join("; ")}`
        : `Successfully imported ${sheetsImported.join(", ")}`,
      sheetsImported,
    };
  } catch (e: unknown) {
    return { success: false, message: e instanceof Error ? e.message : "Invalid Excel file" };
  }
}

/** Import from CSV */
export function importFromCsv(text: string, entity: "dispatches" | "trucks" | "drivers" = "dispatches"): ImportResult {
  try {
    const wb = XLSX.read(text, { type: "string" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (entity === "dispatches") {
      const { valid, errors } = validateDispatches(rows);
      if (!valid.length) return { success: false, message: errors.join("; ") || "No valid rows found" };
      writeKey(STORAGE_KEYS.dispatches, valid);
      window.dispatchEvent(new CustomEvent("srl-store-change", { detail: {} }));
      return { success: true, message: `Imported ${valid.length} dispatches`, sheetsImported: ["Dispatches"] };
    }

    return { success: false, message: "CSV import for this entity is not supported yet" };
  } catch (e: unknown) {
    return { success: false, message: e instanceof Error ? e.message : "Invalid CSV file" };
  }
}

/** Import from JSON backup */
export function importFromJson(json: string): ImportResult {
  try {
    const parsed = JSON.parse(json);
    const data = parsed?.data;
    if (!data || typeof data !== "object") throw new Error("Invalid backup file — missing data object");

    Object.values(STORAGE_KEYS).forEach((k) => {
      if (data[k] !== undefined && data[k] !== null) {
        localStorage.setItem(k, JSON.stringify(data[k]));
      }
    });
    window.dispatchEvent(new CustomEvent("srl-store-change", { detail: {} }));
    return { success: true, message: "JSON backup restored successfully", sheetsImported: Object.keys(data) };
  } catch (e: unknown) {
    return { success: false, message: e instanceof Error ? e.message : "Invalid JSON file" };
  }
}

/** Detect file type and import */
export async function importFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".json")) {
    return importFromJson(await file.text());
  }
  if (name.endsWith(".csv")) {
    return importFromCsv(await file.text());
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return importFromExcel(await file.arrayBuffer());
  }
  return { success: false, message: "Unsupported file format. Use .xlsx, .csv, or .json" };
}
