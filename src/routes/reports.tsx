import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

/** Returns April 1 of `startYear` — April 31 of `startYear + 1` */
function fyBounds(startYear: number): [string, string] {
  return [`${startYear}-04-01`, `${startYear + 1}-03-31`];
}

function getFinancialYears(): string[] {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-indexed
  // FY starts in April, so if we're Jan-Mar we're still in previous FY
  const currentFyStart = currentMonth >= 4 ? currentYear : currentYear - 1;
  const years: string[] = [];
  for (let y = currentFyStart; y >= currentFyStart - 3; y--) {
    years.push(`${y}-${String(y + 1).slice(-2)}`);
  }
  return years;
}

function parseFy(label: string): number {
  return parseInt(label.split("-")[0], 10);
}

function Reports() {
  const [dispatches] = useDispatches();

  const fyOptions = getFinancialYears();
  const [selectedFy, setSelectedFy] = useState(fyOptions[0]);
  const fyStart = parseFy(selectedFy);
  const [fyFrom, fyTo] = fyBounds(fyStart);

  const fyDispatches = useMemo(
    () => dispatches.filter((d) => d.date >= fyFrom && d.date <= fyTo),
    [dispatches, fyFrom, fyTo]
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayItems = dispatches.filter((d) => d.date === today);
  const totalRev = fyDispatches.reduce((s, d) => s + d.netFreight, 0);
  const totalExp = fyDispatches.reduce((s, d) => s + d.totalExpenses, 0);
  const pendingPay = fyDispatches.filter((d) => d.balance > 0).reduce((s, d) => s + d.balance, 0);
  const totalBargain = fyDispatches.reduce((s, d) => s + (d.bargainAmount ?? 0), 0);
  const completedCount = fyDispatches.filter((d) => d.status === "Completed" || d.status === "Delivered").length;

  // Monthly breakdown for FY
  const monthlyData = useMemo(() => {
    const months: { month: string; revenue: number; expenses: number; trips: number }[] = [];
    // 12 months from April of fyStart
    for (let m = 0; m < 12; m++) {
      const monthIdx = (3 + m) % 12; // 0-indexed: April=3
      const y = m < 9 ? fyStart : fyStart + 1; // Apr–Dec in fyStart, Jan–Mar in fyStart+1
      const key = `${y}-${String(monthIdx + 1).padStart(2, "0")}`;
      const label = new Date(`${key}-01`).toLocaleString("en-IN", { month: "short", year: "2-digit" });
      const items = fyDispatches.filter((d) => d.date.startsWith(key));
      months.push({
        month: label,
        revenue: items.reduce((s, d) => s + d.netFreight, 0),
        expenses: items.reduce((s, d) => s + d.totalExpenses, 0),
        trips: items.length,
      });
    }
    return months;
  }, [fyDispatches, fyStart]);

  const byTruck = useMemo(() => {
    const m = new Map<string, number>();
    fyDispatches.forEach((d) => m.set(d.truckNumber, (m.get(d.truckNumber) || 0) + d.netFreight));
    return [...m.entries()].map(([truck, revenue]) => ({ truck, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [fyDispatches]);

  const byDriver = useMemo(() => {
    const m = new Map<string, number>();
    fyDispatches.forEach((d) => m.set(d.driverName, (m.get(d.driverName) || 0) + 1));
    return [...m.entries()].map(([driver, trips]) => ({ driver, trips })).sort((a, b) => b.trips - a.trips).slice(0, 10);
  }, [fyDispatches]);

  const expenseBreakdown = useMemo(() => {
    const sums = { Commission: 0, "Loading Charges": 0 };
    fyDispatches.forEach((d) => {
      sums.Commission += d.commission;
      sums["Loading Charges"] += d.loadingCharges;
    });
    return Object.entries(sums).map(([name, value]) => ({ name, value }));
  }, [fyDispatches]);

  const statusBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    fyDispatches.forEach((d) => m.set(d.status, (m.get(d.status) || 0) + 1));
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [fyDispatches]);

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
      {/* Financial Year Selector */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Financial Year:</span>
          <Select value={selectedFy} onValueChange={setSelectedFy}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fyOptions.map((fy) => (
                <SelectItem key={fy} value={fy}>{fy}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground">
          Apr {fyStart} — Mar {fyStart + 1} · {fyDispatches.length} dispatches
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

        {/* Monthly Trips */}
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

        {/* Truck Revenue */}
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

        {/* Expense Breakdown */}
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

        {/* Driver Trips */}
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

        {/* Status Breakdown */}
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
      </div>
    </AppShell>
  );
}
