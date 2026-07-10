import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDispatches, useTrucks, useDrivers } from "@/lib/store";
import { StatusBadge, formatINR } from "@/components/StatusBadge";
import {
  Truck, Users, IndianRupee, PackageCheck, PackageSearch,
  Clock, Wallet, FilePlus2, TrendingUp, TrendingDown,
  AlertCircle, Star, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Sahil Road Lines TMS" }] }),
  component: Dashboard,
});

function Kpi({
  label, value, icon: Icon, accent, badge, sub,
}: {
  label: string; value: string; icon: any; accent: string; badge?: number; sub?: string;
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-xl ${accent}`}>
          <Icon className="h-6 w-6" />
          {badge !== undefined && badge > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-0.5 truncate text-2xl font-bold tracking-tight">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [dispatches] = useDispatches();
  const [trucks] = useTrucks();
  const [drivers] = useDrivers();
  const navigate = useNavigate();

  const today = new Date().toISOString().slice(0, 10);

  // Current month bounds
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const stats = useMemo(() => {
    const todays = dispatches.filter((d) => d.date === today);
    const todayRevenue = todays.reduce((s, d) => s + d.netFreight, 0);
    const todayExpenses = todays.reduce((s, d) => s + d.totalExpenses, 0);
    const todayProfit = todayRevenue - todayExpenses;

    const running = dispatches.filter((d) => d.status === "Dispatched" || d.status === "Shipped");
    const pendingDelivery = dispatches.filter((d) => d.status === "Dispatched" || d.status === "Shipped");
    const pendingPayment = dispatches.filter((d) => d.balance > 0);
    const pendingPaymentTotal = pendingPayment.reduce((s, d) => s + d.balance, 0);
    const collectionAmount = dispatches.filter((d) => d.status === "Payment Pending").reduce((s, d) => s + d.balance, 0);

    const completed = dispatches.filter((d) => d.status === "Completed" || d.status === "Delivered");

    // This month
    const monthDispatches = dispatches.filter((d) => d.date >= monthStart);
    const monthRevenue = monthDispatches.reduce((s, d) => s + d.netFreight, 0);

    // Top truck by dispatch count this month
    const truckMap = new Map<string, number>();
    monthDispatches.forEach((d) => truckMap.set(d.truckNumber, (truckMap.get(d.truckNumber) || 0) + 1));
    const topTruck = [...truckMap.entries()].sort((a, b) => b[1] - a[1])[0];

    // Top driver by dispatch count this month
    const driverMap = new Map<string, number>();
    monthDispatches.forEach((d) => driverMap.set(d.driverName, (driverMap.get(d.driverName) || 0) + 1));
    const topDriver = [...driverMap.entries()].sort((a, b) => b[1] - a[1])[0];

    return {
      todays, todayRevenue, todayExpenses, todayProfit,
      running, pendingDelivery, pendingPayment, pendingPaymentTotal,
      collectionAmount, completed, monthRevenue,
      topTruck, topDriver,
    };
  }, [dispatches, today, monthStart]);

  const recent = useMemo(
    () => [...dispatches].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [dispatches]
  );

  return (
    <AppShell title="Dashboard" breadcrumb={["Home", "Dashboard"]}>
      {/* Notification Banner */}
      {(stats.pendingPayment.length > 0 || stats.pendingDelivery.length > 0) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {stats.pendingPayment.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span><strong>{stats.pendingPayment.length}</strong> dispatch{stats.pendingPayment.length > 1 ? "es" : ""} with pending payment — {formatINR(stats.pendingPaymentTotal)} outstanding</span>
            </div>
          )}
          {stats.pendingDelivery.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
              <Clock className="h-4 w-4 shrink-0" />
              <span><strong>{stats.pendingDelivery.length}</strong> trip{stats.pendingDelivery.length > 1 ? "s" : ""} running — awaiting delivery</span>
            </div>
          )}
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Kpi label="Today's Dispatches" value={String(stats.todays.length)} icon={PackageSearch} accent="bg-primary/10 text-primary" />
        <Kpi label="Today's Revenue" value={formatINR(stats.todayRevenue)} icon={IndianRupee} accent="bg-success/15 text-success" />
        <Kpi label="Today's Expenses" value={formatINR(stats.todayExpenses)} icon={TrendingDown} accent="bg-destructive/10 text-destructive" />
        <Kpi
          label="Today's Profit"
          value={formatINR(stats.todayProfit)}
          icon={TrendingUp}
          accent={stats.todayProfit >= 0 ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}
          sub="Revenue − Expenses"
        />
        <Kpi
          label="Running Trips"
          value={String(stats.running.length)}
          icon={Truck}
          accent="bg-amber-100 text-amber-600 dark:bg-amber-950/30"
          badge={stats.running.length}
        />
        <Kpi label="Completed Trips" value={String(stats.completed.length)} icon={PackageCheck} accent="bg-success/15 text-success" />
        <Kpi
          label="Pending Deliveries"
          value={String(stats.pendingDelivery.length)}
          icon={Clock}
          accent="bg-warning/20 text-warning-foreground"
          badge={stats.pendingDelivery.length}
        />
        <Kpi
          label="Pending Payments"
          value={String(stats.pendingPayment.length)}
          icon={AlertCircle}
          accent="bg-destructive/10 text-destructive"
          badge={stats.pendingPayment.length}
          sub={formatINR(stats.pendingPaymentTotal)}
        />
        <Kpi label="Collection Due" value={formatINR(stats.collectionAmount)} icon={Wallet} accent="bg-purple-100 text-purple-600 dark:bg-purple-950/30" />
        <Kpi label="Monthly Revenue" value={formatINR(stats.monthRevenue)} icon={IndianRupee} accent="bg-primary/10 text-primary" />
        <Kpi label="Total Trucks" value={String(trucks.length)} icon={Truck} accent="bg-primary/10 text-primary" />
        <Kpi label="Total Drivers" value={String(drivers.length)} icon={Users} accent="bg-accent text-accent-foreground" />
      </div>

      {/* Top Performer Row */}
      {(stats.topTruck || stats.topDriver) && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {stats.topTruck && (
            <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top Truck This Month</div>
                  <div className="font-mono text-base font-bold">{stats.topTruck[0]}</div>
                  <div className="text-xs text-muted-foreground">{stats.topTruck[1]} dispatch{stats.topTruck[1] > 1 ? "es" : ""}</div>
                </div>
              </CardContent>
            </Card>
          )}
          {stats.topDriver && (
            <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top Driver This Month</div>
                  <div className="text-base font-bold">{stats.topDriver[0]}</div>
                  <div className="text-xs text-muted-foreground">{stats.topDriver[1]} dispatch{stats.topDriver[1] > 1 ? "es" : ""}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="mt-4 border-dashed bg-primary-soft/40">
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-primary mr-2">Quick Actions</div>
          <Button size="sm" onClick={() => navigate({ to: "/dispatch/new" })}>
            <FilePlus2 className="mr-1.5 h-4 w-4" /> New Dispatch
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/consignments" })}>
            View Consignments
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate({ to: "/reports" })}>
            Reports
          </Button>
        </CardContent>
      </Card>

      {/* Recent Dispatches */}
      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Dispatches</CardTitle>
          <Link to="/consignments" className="text-sm font-medium text-primary hover:underline">
            View all →
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Truck</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Consignor</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3 text-right">Freight</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recent.map((d) => (
                <tr
                  key={d.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => navigate({ to: "/consignments/$id", params: { id: d.id } })}
                >
                  <td className="px-4 py-3 font-medium text-primary font-mono">{d.receiptNumber}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{d.date}</td>
                  <td className="px-4 py-3 font-mono text-xs">{d.truckNumber}</td>
                  <td className="px-4 py-3">{d.driverName}</td>
                  <td className="px-4 py-3 max-w-[120px] truncate" title={d.consignor}>{d.consignor}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{d.from} → {d.to}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatINR(d.netFreight)}</td>
                  <td className={cn("px-4 py-3 text-right", d.balance > 0 ? "text-destructive font-semibold" : "text-muted-foreground")}>
                    {formatINR(d.balance)}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No dispatches yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
