import { cn } from "@/lib/utils";
import type { Status } from "@/lib/types";

const map: Record<string, string> = {
  Created: "bg-gray-100 text-gray-600 border-gray-300",
  Dispatched: "bg-blue-100 text-blue-700 border-blue-300",
  Delivered: "bg-green-100 text-green-700 border-green-300",
  "Payment Pending": "bg-orange-100 text-orange-700 border-orange-300",
  Completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  // legacy fallback — old records stored as "Shipped"
  Shipped: "bg-gray-100 text-gray-500 border-gray-200",
};

export function StatusBadge({ status }: { status: Status | string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", map[status] ?? "bg-gray-100 text-gray-500 border-gray-200")}>
      {status}
    </span>
  );
}

export const STATUS_OPTIONS: Status[] = ["Created", "Dispatched", "Delivered", "Payment Pending", "Completed"];

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

