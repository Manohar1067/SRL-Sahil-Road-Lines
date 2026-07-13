import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useDispatches } from "@/lib/store";
import { formatINR } from "@/components/StatusBadge";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useMemo, useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Sahil Road Lines" }] }),
  component: Reports,
});

const COLORS = ["#3b6ef0", "#22a06b", "#f59e0b", "#ef4444", "#8b5cf6"];

type InfoOption =
  | "today"
  | "yesterday"
  | "weekly"
  | "monthly"
  | "yearly"
  | "financial_year"
  | "custom";

const INFO_OPTIONS: { value: InfoOption; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "financial_year", label: "Financial Year" },
  { value: "custom", label: "Custom Date" },
];

/** Returns April 1 of `startYear` — March 31 of `startYear + 1` */
function fyBounds(startYear: number): [string, string] {
  return [`${startYear}-04-01`, `${startYear + 1}-03-31`];
}

function getCurrentFyStart(): number {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  return month >= 4 ? now.getFullYear() : now.getFullYear() - 1;
}

/** Given an InfoOption and optional custom date, return [from, to] date strings YYYY-MM-DD */
function getDateBounds(info: InfoOption, customDate: string): [string, string] {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  switch (info) {
    case "today":
      return [todayStr, todayStr];

    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const s = y.toISOString().slice(0, 10);
      return [s, s];
    }

    case "weekly": {
      const day = now.getDay(); // 0=Sun
      const mon = new Date(now);
      mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      return [mon.toISOString().slice(0, 10), todayStr];
    }

    case "monthly": {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      return [from, todayStr];
    }

    case "yearly": {
      const from = `${now.getFullYear()}-01-01`;
      const to = `${now.getFullYear()}-12-31`;
      return [from, to];
    }

    case "financial_year":
      return fyBounds(getCurrentFyStart());

    case "custom":
      return customDate ? [customDate, customDate] : [todayStr, todayStr];

    default:
      return ["2000-01-01", todayStr];
  }
}

/** Human readable label for the currently selected range */
function rangeLabel(info: InfoOption, customDate: string): string {
  const now = new Date();
  switch (info) {
    case "today": return `Today (${now.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`;
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return `Yesterday (${y.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`;
    }
    case "weekly": return "This Week";
    case "monthly":
      return now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    case "yearly": return `Year ${now.getFullYear()}`;
    case "financial_year": {
      const fy = getCurrentFyStart();
      return `FY ${fy}–${String(fy + 1).slice(-2)}`;
    }
    case "custom": return customDate || "Custom Date";
    default: return "";
  }
}

function Reports() {
  const [dispatches] = useDispatches();

  const [infoOption, setInfoOption] = useState<InfoOption>("financial_year");
  const [customDate, setCustomDate] = useState("");

  const [from, to] = useMemo(
    () => getDateBounds(infoOption, customDate),
    [infoOption, customDate]
  );

  const filtered = useMemo(
    () => dispatches.filter((d) => d.date >= from && d.date <= to),
    [dispatches, from, to]
  );

  const totalRev = filtered.reduce((s, d) => s + d.netFreight, 0);
  const totalExp = filtered.reduce((s, d) => s + d.totalExpenses, 0);
  const pendingPay = filtered.filter((d) => d.balance > 0).reduce((s, d) => s + d.balance, 0);
  const totalBargain = filtered.reduce((s, d) => s + (d.bargainAmount ?? 0), 0);
  const completedCount = filtered.filter((d) => d.status === "Completed" || d.status === "Delivered").length;

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    const map = new Map<string, { revenue: number; expenses: number; trips: number }>();
    filtered.forEach((d) => {
      const key = d.date.slice(0, 7); // YYYY-MM
      const cur = map.get(key) ?? { revenue: 0, expenses: 0, trips: 0 };
      map.set(key, {
        revenue: cur.revenue + d.netFreight,
        expenses: cur.expenses + d.totalExpenses,
        trips: cur.trips + 1,
      });
    });
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        month: new Date(`${key}-01`).toLocaleString("en-IN", { month: "short", year: "2-digit" }),
        ...val,
      }));
  }, [filtered]);

  const byTruck = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((d) => m.set(d.truckNumber, (m.get(d.truckNumber) || 0) + d.netFreight));
    return [...m.entries()].map(([truck, revenue]) => ({ truck, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filtered]);

  const byDriver = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((d) => m.set(d.driverName, (m.get(d.driverName) || 0) + 1));
    return [...m.entries()].map(([driver, trips]) => ({ driver, trips })).sort((a, b) => b.trips - a.trips).slice(0, 10);
  }, [filtered]);

  const expenseBreakdown = useMemo(() => {
    const sums = { Commission: 0, "Loading Charges": 0 };
    filtered.forEach((d) => {
      sums.Commission += d.commission;
      sums["Loading Charges"] += d.loadingCharges;
    });
    return Object.entries(sums).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const statusBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((d) => m.set(d.status, (m.get(d.status) || 0) + 1));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const Kpi = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );

  return (
    <AppShell title="Reports" breadcrumb={["Home", "Reports"]}>
      {/* Info Filter */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Info:</span>
          <Select value={infoOption} onValueChange={(v) => setInfoOption(v as InfoOption)}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INFO_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date picker shown only when Custom Date is selected */}
        {infoOption === "custom" && (
          <Input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="h-9 w-44"
          />
        )}

        <span className="text-xs text-muted-foreground">
          {rangeLabel(infoOption, customDate)} · {filtered.length} dispatches
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Total Revenue" value={formatINR(totalRev)} />
        <Kpi label="Total Expenses" value={formatINR(totalExp)} />
        <Kpi label="Net Profit" value={formatINR(totalRev - totalExp)} sub="Revenue − Expenses" />
        <Kpi label="Pending Payments" value={formatINR(pendingPay)} />
        <Kpi label="Bargain Savings" value={formatINR(totalBargain)} sub="Internal only" />
        <Kpi label="Completed Trips" value={String(completedCount)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Monthly Revenue vs Expenses */}
        {monthlyData.length > 1 && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Monthly Revenue vs Expenses</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={10} />
                  <YAxis fontSize={10} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => formatINR(Number(v))} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b6ef0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Monthly Trips */}
        {monthlyData.length > 1 && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Monthly Trips</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" fontSize={10} />
                  <YAxis fontSize={10} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="trips" name="Trips" stroke="#22a06b" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Truck Revenue */}
        {byTruck.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Truck Revenue</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTruck} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={10} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="truck" type="category" fontSize={10} width={110} />
                  <Tooltip formatter={(v: any) => formatINR(Number(v))} />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b6ef0" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Expense Breakdown */}
        {expenseBreakdown.some((e) => e.value > 0) && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Expense Breakdown</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {expenseBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v: any) => formatINR(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Driver Trips */}
        {byDriver.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Driver Trips</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDriver}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="driver" fontSize={10} />
                  <YAxis fontSize={10} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="trips" name="Trips" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Status Breakdown */}
        {statusBreakdown.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-base">Status Distribution</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="text-base font-medium">No data for the selected period</div>
            <div className="text-sm mt-1">Try selecting a different time range.</div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
