import { cn } from "@/lib/utils";
import type { Status } from "@/lib/types";

const map: Record<Status, string> = {
  Shipped: "bg-primary/10 text-primary border-primary/30",
  Dispatched: "bg-warning/15 text-warning-foreground border-warning/30",
  Delivered: "bg-accent text-accent-foreground border-accent",
  "Payment Pending": "bg-destructive/10 text-destructive border-destructive/30",
  Completed: "bg-success/15 text-success border-success/30",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", map[status])}>
      {status}
    </span>
  );
}

export const STATUS_OPTIONS: Status[] = ["Shipped", "Dispatched", "Delivered", "Payment Pending", "Completed"];

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
