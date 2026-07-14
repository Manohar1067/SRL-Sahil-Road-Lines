import { cn } from "@/lib/utils";
import type { Status } from "@/lib/types";

const map: Record<string, string> = {
  Created: "bg-gray-100 text-gray-600 border-gray-300",
  Dispatched: "bg-blue-100 text-blue-700 border-blue-300",
  Shipped: "bg-indigo-100 text-indigo-700 border-indigo-300",
  Delivered: "bg-green-100 text-green-700 border-green-300",
  "Payment Pending": "bg-orange-100 text-orange-700 border-orange-300",
  Completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  "LR Received": "bg-cyan-100 text-cyan-700 border-cyan-300",
  "LR Submitted": "bg-violet-100 text-violet-700 border-violet-300",
};

export function StatusBadge({ status }: { status: Status | string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", map[status] ?? "bg-gray-100 text-gray-500 border-gray-200")}>
      {status}
    </span>
  );
}

/** Active statuses shown in dropdowns/filters — includes all available statuses */
export const STATUS_OPTIONS: Status[] = [
  "Created",
  "Dispatched",
  "Delivered",
  "LR Received",
  "LR Submitted",
  "Payment Pending",
  "Completed",
];

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

/** Format a date string (DD/MM/YYYY or YYYY-MM-DD or ISO) to DD/MM/YYYY for display */
export function fmtDate(v: string | undefined | null): string {
  if (!v) return "\u2014";
  // Already DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) return v;
  // ISO / YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10).split("-").reverse().join("/");
  return v;
}

/** Parse a DD/MM/YYYY text input value to a simple string for storage.
 *  Validates format; returns the raw string (storage is DD/MM/YYYY). */
export function parseDate(v: string): string {
  return v.trim();
}


