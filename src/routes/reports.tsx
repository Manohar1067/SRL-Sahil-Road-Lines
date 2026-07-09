import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDispatches } from "@/lib/store";
import { formatINR } from "@/components/StatusBadge";
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell,
} from "recharts";
import { useMemo } from "react";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Sahil Road Lines" }] }),
  component: Reports,
});

const COLORS = ["#3b6ef0", "#22a06b", "#f59e0b", "#ef4444", "#8b5cf6"];

function Reports() {
  const [dispatches] = useDispatches();

  const today = new Date().toISOString().slice(0, 10);
  const todayItems = dispatches.filter((d) => d.date === today);
  const totalRev = dispatches.reduce((s, d) => s + d.netFreight, 0);
  const totalExp = dispatches.reduce((s, d) => s + d.totalExpenses, 0);
  const pendingPay = dispatches.filter((d) => d.balance > 0).reduce((s, d) => s + d.balance, 0);

  const last30 = useMemo(() => {
    const days: { date: string; revenue: number; trips: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      const items = dispatches.filter((d) => d.date === key);
      days.push({ date: key.slice(5), revenue: items.reduce((s, d) => s + d.netFreight, 0), trips: items.length });
    }
    return days;
  }, [dispatches]);

  const byTruck = useMemo(() => {
    const m = new Map<string, number>();
    dispatches.forEach((d) => m.set(d.truckNumber, (m.get(d.truckNumber) || 0) + d.netFreight));
    return [...m.entries()].map(([truck, revenue]) => ({ truck, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [dispatches]);

  const byDriver = useMemo(() => {
    const m = new Map<string, number>();
    dispatches.forEach((d) => m.set(d.driverName, (m.get(d.driverName) || 0) + 1));
    return [...m.entries()].map(([driver, trips]) => ({ driver, trips })).sort((a, b) => b.trips - a.trips);
  }, [dispatches]);

  const expenseBreakdown = useMemo(() => {
    const sums = { Commission: 0, "Loading Charges": 0 };
    dispatches.forEach((d) => {
      sums.Commission += d.commission;
      sums["Loading Charges"] += d.loadingCharges;
    });
    return Object.entries(sums).map(([name, value]) => ({ name, value }));
  }, [dispatches]);

  const Kpi = ({ label, value }: { label: string; value: string }) => (
    <Card className="border-0 shadow-sm"><CardContent className="p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </CardContent></Card>
  );

  return (
    <AppShell title="Reports" breadcrumb={["Home", "Reports"]}>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Today Trips" value={String(todayItems.length)} />
        <Kpi label="Total Revenue" value={formatINR(totalRev)} />
        <Kpi label="Total Expenses" value={formatINR(totalExp)} />
        <Kpi label="Pending Payments" value={formatINR(pendingPay)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Monthly Revenue (Last 30 days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last30}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip formatter={(v: any) => formatINR(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="#3b6ef0" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Daily Trips (Last 30 days)</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last30}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="trips" fill="#22a06b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Truck Revenue</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byTruck} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="truck" type="category" fontSize={11} width={110} />
                <Tooltip formatter={(v: any) => formatINR(Number(v))} />
                <Bar dataKey="revenue" fill="#3b6ef0" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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

        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Driver Trips</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDriver}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="driver" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="trips" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
