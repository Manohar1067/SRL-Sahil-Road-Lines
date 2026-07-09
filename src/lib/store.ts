import { useEffect, useState } from "react";
import type { Dispatch, Driver, Party, Truck } from "./types";

const KEYS = {
  dispatches: "srl_dispatches",
  trucks: "srl_trucks",
  drivers: "srl_drivers",
  consignors: "srl_consignors",
  consignees: "srl_consignees",
  settings: "srl_settings",
} as const;

const uid = () => Math.random().toString(36).slice(2, 10);

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("srl-store-change", { detail: { key } }));
}

// ---------- Seed ----------
const seedTrucks: Truck[] = [
  { id: uid(), truckNumber: "RJ14-GA-4521", ownerName: "Ramesh Kumar", driver: "Suresh Yadav", status: "On Trip" },
  { id: uid(), truckNumber: "MH12-DK-9087", ownerName: "Anil Sharma", driver: "Mahesh Patil", status: "Available" },
  { id: uid(), truckNumber: "GJ01-AB-7733", ownerName: "Sahil Road Lines", driver: "Rajesh Singh", status: "On Trip" },
  { id: uid(), truckNumber: "DL01-CD-1199", ownerName: "Pawan Verma", driver: "Vikram Chauhan", status: "Maintenance" },
  { id: uid(), truckNumber: "UP32-FG-5566", ownerName: "Sahil Road Lines", driver: "Deepak Tiwari", status: "Available" },
];

const seedDrivers: Driver[] = [
  { id: uid(), name: "Suresh Yadav", phone: "+91 98765 43210", licenseNumber: "RJ1420190001234", assignedTruck: "RJ14-GA-4521", status: "Active" },
  { id: uid(), name: "Mahesh Patil", phone: "+91 90876 12233", licenseNumber: "MH1220180009988", assignedTruck: "MH12-DK-9087", status: "Active" },
  { id: uid(), name: "Rajesh Singh", phone: "+91 88002 11122", licenseNumber: "GJ0120170005566", assignedTruck: "GJ01-AB-7733", status: "Active" },
  { id: uid(), name: "Vikram Chauhan", phone: "+91 99887 76655", licenseNumber: "DL0120160001122", assignedTruck: "DL01-CD-1199", status: "Inactive" },
  { id: uid(), name: "Deepak Tiwari", phone: "+91 70000 33445", licenseNumber: "UP3220210007890", assignedTruck: "UP32-FG-5566", status: "Active" },
];

const seedConsignors: Party[] = [
  { id: uid(), companyName: "Mahalaxmi Steel Industries", phone: "+91 22 4422 1100", gst: "27AABCM1234N1Z5", address: "Plot 22, MIDC Bhiwandi, Maharashtra" },
  { id: uid(), companyName: "Shree Cement Depot", phone: "+91 141 220 8800", gst: "08AAACS5678P1ZK", address: "Beawar Road, Ajmer, Rajasthan" },
  { id: uid(), companyName: "Patel Agro Foods Pvt Ltd", phone: "+91 79 2666 3344", gst: "24AACCP9988Q1ZJ", address: "GIDC Vatva, Ahmedabad, Gujarat" },
];

const seedConsignees: Party[] = [
  { id: uid(), companyName: "Delhi Hardware Mart", phone: "+91 11 4567 8900", gst: "07AAACD1122R1Z3", address: "Bhagirath Place, Chandni Chowk, Delhi" },
  { id: uid(), companyName: "Lucknow Construction Co.", phone: "+91 522 333 9911", gst: "09AABCL5544S1ZF", address: "Hazratganj, Lucknow, Uttar Pradesh" },
  { id: uid(), companyName: "Hyderabad Traders LLP", phone: "+91 40 4040 7070", gst: "36AAACH7766T1ZA", address: "Begum Bazaar, Hyderabad, Telangana" },
];

function makeSeedDispatches(): Dispatch[] {
  const today = new Date();
  const d = (offset: number) => {
    const x = new Date(today);
    x.setDate(x.getDate() - offset);
    return x.toISOString().slice(0, 10);
  };
  const mk = (i: number, partial: Partial<Dispatch>): Dispatch => {
    const base: Dispatch = {
      id: uid(),
      receiptNumber: `SRL-${String(i).padStart(4, "0")}`,
      date: d(0),
      documentationDate: d(0),
      invoiceDate: d(0),
      from: "Mumbai",
      to: "Delhi",
      gcNumber: `GC-${2000 + i}`,
      article: "General Goods",
      truckNumber: "RJ14-GA-4521",
      driverName: "Suresh Yadav",
      lorryOwnerName: "Ramesh Kumar",
      consignor: seedConsignors[0].companyName,
      consignee: seedConsignees[0].companyName,
      description: "Mixed cargo",
      weight: 15,
      ratePerTon: 1800,
      netFreight: 0,
      advance: 0,
      balance: 0,
      paidAt: "Mumbai Office",
      commission: 0,
      loadingCharges: 0,
      totalExpenses: 0,
      remarks: "",
      status: "Dispatched",
      deliveryDate: "",
      locked: true,
      createdAt: new Date().toISOString(),
      ...partial,
    };
    base.netFreight = base.weight * base.ratePerTon;
    if (!partial.advance) base.advance = Math.round(base.netFreight * 0.4);
    base.balance = base.netFreight - base.advance;
    base.totalExpenses = base.commission + base.loadingCharges;
    return base;
  };

  return [
    mk(1, { date: d(0), from: "Mumbai", to: "Delhi", consignor: "Mahalaxmi Steel Industries", consignee: "Delhi Hardware Mart", article: "TMT Steel Bars", weight: 22, ratePerTon: 2200, advance: 20000, commission: 1500, loadingCharges: 3000, status: "Shipped", truckNumber: "RJ14-GA-4521", driverName: "Suresh Yadav", lorryOwnerName: "Ramesh Kumar" }),
    mk(2, { date: d(0), from: "Ajmer", to: "Lucknow", consignor: "Shree Cement Depot", consignee: "Lucknow Construction Co.", article: "Cement Bags", weight: 28, ratePerTon: 1700, advance: 25000, commission: 1200, loadingCharges: 2500, status: "Dispatched", truckNumber: "GJ01-AB-7733", driverName: "Rajesh Singh", lorryOwnerName: "Sahil Road Lines" }),
    mk(3, { date: d(1), from: "Ahmedabad", to: "Hyderabad", consignor: "Patel Agro Foods Pvt Ltd", consignee: "Hyderabad Traders LLP", article: "Rice Bags", weight: 18, ratePerTon: 2400, advance: 18000, commission: 1000, loadingCharges: 2200, status: "Delivered", deliveryDate: d(0), truckNumber: "MH12-DK-9087", driverName: "Mahesh Patil", lorryOwnerName: "Anil Sharma" }),
    mk(4, { date: d(3), from: "Mumbai", to: "Delhi", consignor: "Mahalaxmi Steel Industries", consignee: "Delhi Hardware Mart", article: "Steel Coils", weight: 25, ratePerTon: 2100, advance: 22000, commission: 1500, loadingCharges: 3000, status: "Completed", deliveryDate: d(1), truckNumber: "UP32-FG-5566", driverName: "Deepak Tiwari", lorryOwnerName: "Sahil Road Lines" }),
    mk(5, { date: d(5), from: "Ajmer", to: "Lucknow", consignor: "Shree Cement Depot", consignee: "Lucknow Construction Co.", article: "Cement Bags", weight: 30, ratePerTon: 1650, advance: 25000, commission: 1200, loadingCharges: 2500, status: "Completed", deliveryDate: d(3), truckNumber: "GJ01-AB-7733", driverName: "Rajesh Singh", lorryOwnerName: "Sahil Road Lines" }),
    mk(6, { date: d(7), from: "Ahmedabad", to: "Hyderabad", consignor: "Patel Agro Foods Pvt Ltd", consignee: "Hyderabad Traders LLP", article: "Packaged Food", weight: 16, ratePerTon: 2500, advance: 16000, commission: 900, loadingCharges: 2000, status: "Payment Pending", deliveryDate: d(5), truckNumber: "MH12-DK-9087", driverName: "Mahesh Patil", lorryOwnerName: "Anil Sharma" }),
    mk(7, { date: d(10), from: "Mumbai", to: "Delhi", consignor: "Mahalaxmi Steel Industries", consignee: "Delhi Hardware Mart", article: "TMT Steel Bars", weight: 24, ratePerTon: 2200, advance: 22000, commission: 1500, loadingCharges: 3000, status: "Completed", deliveryDate: d(8), truckNumber: "RJ14-GA-4521", driverName: "Suresh Yadav", lorryOwnerName: "Ramesh Kumar" }),
    mk(8, { date: d(12), from: "Ajmer", to: "Delhi", consignor: "Shree Cement Depot", consignee: "Delhi Hardware Mart", article: "Cement Bags", weight: 27, ratePerTon: 1700, advance: 24000, commission: 1200, loadingCharges: 2500, status: "Dispatched", truckNumber: "UP32-FG-5566", driverName: "Deepak Tiwari", lorryOwnerName: "Sahil Road Lines" }),
  ];
}

const defaultCompany: CompanyInfo = {
  name: "SAHIL ROAD LINES",
  address: "Transport Nagar, Beawar, Ajmer, Rajasthan - 305901",
  phone: "+91 98765 43210",
  gst: "08ABCDE1234F1Z5",
  email: "info@sahilroadlines.com",
  logo: "",
};

export function ensureSeed() {
  if (typeof window === "undefined") return;
  if (!localStorage.getItem(KEYS.trucks)) write(KEYS.trucks, seedTrucks);
  if (!localStorage.getItem(KEYS.drivers)) write(KEYS.drivers, seedDrivers);
  if (!localStorage.getItem(KEYS.consignors)) write(KEYS.consignors, seedConsignors);
  if (!localStorage.getItem(KEYS.consignees)) write(KEYS.consignees, seedConsignees);
  if (!localStorage.getItem(KEYS.dispatches)) write(KEYS.dispatches, makeSeedDispatches());
  if (!localStorage.getItem(KEYS.settings)) write(KEYS.settings, {
    darkMode: false, company: defaultCompany, autoLockMinutes: 15,
  });
  try {
    const raw = localStorage.getItem(KEYS.settings);
    if (raw) {
      const s = JSON.parse(raw);
      if (!s.company) s.company = defaultCompany;
      if (!s.company.email) s.company.email = defaultCompany.email;
      if (typeof s.autoLockMinutes !== "number") s.autoLockMinutes = 15;
      delete s.isAdmin;
      localStorage.setItem(KEYS.settings, JSON.stringify(s));
    }
  } catch {}
  try {
    const raw = localStorage.getItem(KEYS.dispatches);
    if (raw) {
      const arr = JSON.parse(raw) as any[];
      let changed = false;
      const migrated = arr.map((d) => {
        const nd: any = { ...d };
        if (nd.status === "Pending") { nd.status = "Dispatched"; changed = true; }
        if (nd.status === "In Transit") { nd.status = "Shipped"; changed = true; }
        if (nd.status === "Cancelled") { nd.status = "Payment Pending"; changed = true; }
        if (typeof nd.receiptNumber === "string" && nd.receiptNumber.startsWith("DM-")) {
          const n = parseInt(nd.receiptNumber.replace(/[^0-9]/g, ""), 10) || 0;
          nd.receiptNumber = `SRL-${String(n).padStart(4, "0")}`;
          changed = true;
        }
        if (nd.deliveryDate === undefined) { nd.deliveryDate = ""; changed = true; }
        if (nd.documentationDate === undefined) { nd.documentationDate = nd.date || ""; changed = true; }
        if (nd.invoiceDate === undefined) { nd.invoiceDate = nd.date || ""; changed = true; }
        if (nd.tds !== undefined) { delete nd.tds; changed = true; }
        if (nd.officeMamuli !== undefined) { delete nd.officeMamuli; changed = true; }
        if (nd.localDriverGuide !== undefined) { delete nd.localDriverGuide; changed = true; }
        const newTotal = Number(nd.commission || 0) + Number(nd.loadingCharges || 0);
        if (nd.totalExpenses !== newTotal) { nd.totalExpenses = newTotal; changed = true; }
        return nd as Dispatch;
      });
      if (changed) localStorage.setItem(KEYS.dispatches, JSON.stringify(migrated));
    }
  } catch {}
}

function useStore<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(fallback);
  useEffect(() => {
    ensureSeed();
    setVal(read<T>(key, fallback));
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.key || detail.key === key) setVal(read<T>(key, fallback));
    };
    window.addEventListener("srl-store-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("srl-store-change", handler);
      window.removeEventListener("storage", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const setter = (v: T) => {
    write(key, v);
    setVal(v);
  };
  return [val, setter];
}

export const useDispatches = () => useStore<Dispatch[]>(KEYS.dispatches, []);
export const useTrucks = () => useStore<Truck[]>(KEYS.trucks, []);
export const useDrivers = () => useStore<Driver[]>(KEYS.drivers, []);
export const useConsignors = () => useStore<Party[]>(KEYS.consignors, []);
export const useConsignees = () => useStore<Party[]>(KEYS.consignees, []);

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  gst: string;
  email: string;
  logo: string;
}
export interface AppSettings {
  darkMode: boolean;
  company: CompanyInfo;
  adminPinHash?: string;
  autoLockMinutes?: number;
}

export const useSettings = () =>
  useStore<AppSettings>(KEYS.settings, { darkMode: false, company: defaultCompany, autoLockMinutes: 15 });

export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const STORAGE_KEYS = KEYS;

export function exportAllData(): string {
  const data: Record<string, any> = {};
  Object.values(KEYS).forEach((k) => {
    const v = localStorage.getItem(k);
    data[k] = v ? JSON.parse(v) : null;
  });
  return JSON.stringify({ exportedAt: new Date().toISOString(), version: 1, data }, null, 2);
}

export function importAllData(json: string) {
  const parsed = JSON.parse(json);
  const data = parsed?.data;
  if (!data || typeof data !== "object") throw new Error("Invalid backup file");
  Object.values(KEYS).forEach((k) => {
    if (data[k] !== undefined && data[k] !== null) {
      localStorage.setItem(k, JSON.stringify(data[k]));
    }
  });
  window.dispatchEvent(new CustomEvent("srl-store-change", { detail: {} }));
}

export function nextReceiptNumber(existing: Dispatch[]): string {
  const nums = existing
    .map((d) => parseInt(d.receiptNumber.replace(/[^0-9]/g, ""), 10))
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `SRL-${String(next).padStart(4, "0")}`;
}

export { uid };
