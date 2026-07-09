import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDispatches, useTrucks, useDrivers } from "@/lib/store";
import { StatusBadge, formatINR } from "@/components/StatusBadge";
import {
  Truck, Users, IndianRupee, PackageCheck, PackageSearch,
  Clock, Wallet, FilePlus2,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Sahil Road Lines TMS" }] }),
  component: Dashboard,
});

function Kpi({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent: string }) {
  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${accent}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-0.5 truncate text-2xl font-bold tracking-tight">{value}</div>
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
  const todays = dispatches.filter((d) => d.date === today);
  const todayRevenue = todays.reduce((s, d) => s + d.netFreight, 0);
  const pending = dispatches.filter((d) => d.status === "Dispatched" || d.status === "Shipped").length;
  const completed = dispatches.filter((d) => d.status === "Completed" || d.status === "Delivered").length;
  const pendingPayments = dispatches
    .filter((d) => d.balance > 0)
    .reduce((s, d) => s + d.balance, 0);

  const recent = [...dispatches].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  return (
    <AppShell title="Dashboard" breadcrumb={["Home", "Dashboard"]}>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        <Kpi label="Today's Dispatches" value={String(todays.length)} icon={PackageSearch} accent="bg-primary/10 text-primary" />
        <Kpi label="Today's Revenue" value={formatINR(todayRevenue)} icon={IndianRupee} accent="bg-success/15 text-success" />
        <Kpi label="Pending Deliveries" value={String(pending)} icon={Clock} accent="bg-warning/20 text-warning-foreground" />
        <Kpi label="Completed Deliveries" value={String(completed)} icon={PackageCheck} accent="bg-success/15 text-success" />
        <Kpi label="Pending Payments" value={formatINR(pendingPayments)} icon={Wallet} accent="bg-destructive/10 text-destructive" />
        <Kpi label="Total Trucks" value={String(trucks.length)} icon={Truck} accent="bg-primary/10 text-primary" />
        <Kpi label="Total Drivers" value={String(drivers.length)} icon={Users} accent="bg-accent text-accent-foreground" />
        <Card className="border-dashed bg-primary-soft/40">
          <CardContent className="flex h-full flex-col justify-center gap-2 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">Quick Actions</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate({ to: "/dispatch/new" })}>
                <FilePlus2 className="mr-1.5 h-4 w-4" /> New Dispatch
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate({ to: "/consignments" })}>
                View Consignments
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Dispatches</CardTitle>
          <Link to="/consignments" className="text-sm font-medium text-primary hover:underline">View all →</Link>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Truck</th>
                <th className="px-4 py-3">Consignor</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3 text-right">Freight</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recent.map((d) => (
                <tr key={d.id} className="cursor-pointer hover:bg-muted/40" onClick={() => navigate({ to: "/consignments/$id", params: { id: d.id } })}>
                  <td className="px-4 py-3 font-medium text-primary">{d.receiptNumber}</td>
                  <td className="px-4 py-3">{d.date}</td>
                  <td className="px-4 py-3">{d.truckNumber}</td>
                  <td className="px-4 py-3">{d.consignor}</td>
                  <td className="px-4 py-3">{d.to}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatINR(d.netFreight)}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No dispatches yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
