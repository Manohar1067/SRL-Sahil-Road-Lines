import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDispatches } from "@/lib/store";
import { StatusBadge, STATUS_OPTIONS, formatINR } from "@/components/StatusBadge";
import { Search, FilePlus2, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Dispatch } from "@/lib/types";

export const Route = createFileRoute("/consignments/")({
  head: () => ({ meta: [{ title: "Consignments — Sahil Road Lines" }] }),
  component: ConsignmentList,
});

const ALL = "all";

type SortKey = keyof Pick<
  Dispatch,
  | "receiptNumber" | "date" | "documentationDate" | "invoiceDate"
  | "truckNumber" | "driverName" | "consignor" | "consignee"
  | "to" | "status" | "netFreight" | "advance" | "balance"
  | "finalPayable" | "createdAt"
>;

function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="inline h-3 w-3 opacity-40" />;
  return dir === "asc"
    ? <ArrowUp className="inline h-3 w-3 text-primary" />
    : <ArrowDown className="inline h-3 w-3 text-primary" />;
}

function ConsignmentList() {
  const [dispatches] = useDispatches();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState(ALL);
  const [truck, setTruck] = useState(ALL);
  const [driver, setDriver] = useState(ALL);
  const [consignor, setConsignor] = useState(ALL);
  const [consignee, setConsignee] = useState(ALL);
  const [destination, setDestination] = useState(ALL);
  const [material, setMaterial] = useState(ALL);
  const [dispatchDate, setDispatchDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [docDate, setDocDate] = useState("");
  const [invDate, setInvDate] = useState("");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const unique = (key: keyof typeof dispatches[number]) =>
    Array.from(new Set(dispatches.map((d) => String(d[key] || "")).filter(Boolean))).sort();

  const trucks = unique("truckNumber");
  const drivers = unique("driverName");
  const consignors = unique("consignor");
  const consignees = unique("consignee");
  const destinations = unique("to");
  const materials = unique("article");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const memoNeedle = memo.trim().toLowerCase();
    const min = minAmt !== "" ? Number(minAmt) : null;
    const max = maxAmt !== "" ? Number(maxAmt) : null;

    let rows = dispatches.filter((d) => {
      if (memoNeedle && !d.receiptNumber.toLowerCase().includes(memoNeedle)) return false;
      if (status !== ALL && d.status !== status) return false;
      if (truck !== ALL && d.truckNumber !== truck) return false;
      if (driver !== ALL && d.driverName !== driver) return false;
      if (consignor !== ALL && d.consignor !== consignor) return false;
      if (consignee !== ALL && d.consignee !== consignee) return false;
      if (destination !== ALL && d.to !== destination) return false;
      if (material !== ALL && d.article !== material) return false;
      if (dispatchDate && d.date !== dispatchDate) return false;
      if (deliveryDate && d.deliveryDate !== deliveryDate) return false;
      if (docDate && d.documentationDate !== docDate) return false;
      if (invDate && d.invoiceDate !== invDate) return false;
      if (min !== null && d.netFreight < min) return false;
      if (max !== null && d.netFreight > max) return false;
      if (!needle) return true;
      return [
        d.receiptNumber, d.truckNumber, d.driverName, d.consignor, d.consignee,
        d.to, d.from, d.article, d.status, d.deliveryDate, d.date,
        d.documentationDate, d.invoiceDate, d.lorryOwnerName, d.paidAt, d.remarks,
        d.gcNumber,
      ].some((v) => (v ?? "").toString().toLowerCase().includes(needle));
    });

    rows = rows.sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [dispatches, q, memo, status, truck, driver, consignor, consignee, destination, material,
      dispatchDate, deliveryDate, docDate, invDate, minAmt, maxAmt, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
    setPage(1);
  };

  const resetFilters = () => {
    setQ(""); setMemo("");
    setStatus(ALL); setTruck(ALL); setDriver(ALL); setConsignor(ALL); setConsignee(ALL);
    setDestination(ALL); setMaterial(ALL);
    setDispatchDate(""); setDeliveryDate(""); setDocDate(""); setInvDate("");
    setMinAmt(""); setMaxAmt("");
    setPage(1);
  };

  const activeFilters =
    (memo ? 1 : 0) +
    (status !== ALL ? 1 : 0) + (truck !== ALL ? 1 : 0) + (driver !== ALL ? 1 : 0) +
    (consignor !== ALL ? 1 : 0) + (consignee !== ALL ? 1 : 0) +
    (destination !== ALL ? 1 : 0) + (material !== ALL ? 1 : 0) +
    (dispatchDate ? 1 : 0) + (deliveryDate ? 1 : 0) + (docDate ? 1 : 0) + (invDate ? 1 : 0) +
    (minAmt ? 1 : 0) + (maxAmt ? 1 : 0);

  const SelectFilter = ({
    value, onChange, label, options,
  }: { value: string; onChange: (v: string) => void; label: string; options: string[] }) => (
    <Select value={value} onValueChange={(v) => { onChange(v); setPage(1); }}>
      <SelectTrigger className="h-9"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {label}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const Th = ({ label, sk }: { label: string; sk: SortKey }) => (
    <th
      className="cursor-pointer select-none px-4 py-3 whitespace-nowrap hover:bg-muted/80 transition-colors"
      onClick={() => toggleSort(sk)}
    >
      {label}{" "}<SortIcon active={sortKey === sk} dir={sortDir} />
    </th>
  );

  return (
    <AppShell title="Consignment List" breadcrumb={["Home", "Consignments"]}>
      <Card className="border-0 shadow-sm">
        <CardContent className="space-y-4 p-5">
          {/* Search Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="Search across every field…"
                className="pl-9"
              />
            </div>
            <Input
              value={memo}
              onChange={(e) => { setMemo(e.target.value); setPage(1); }}
              placeholder="Memo # (e.g. SRL-2026-000001)"
              className="sm:max-w-[240px] font-mono"
            />
            <Button onClick={() => navigate({ to: "/dispatch/new" })}>
              <FilePlus2 className="mr-1.5 h-4 w-4" /> New Dispatch
            </Button>
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-7">
            <SelectFilter value={status} onChange={setStatus} label="Statuses" options={STATUS_OPTIONS as unknown as string[]} />
            <SelectFilter value={truck} onChange={setTruck} label="Trucks" options={trucks} />
            <SelectFilter value={driver} onChange={setDriver} label="Drivers" options={drivers} />
            <SelectFilter value={consignor} onChange={setConsignor} label="Consignors" options={consignors} />
            <SelectFilter value={consignee} onChange={setConsignee} label="Consignees" options={consignees} />
            <SelectFilter value={destination} onChange={setDestination} label="Destinations" options={destinations} />
            <SelectFilter value={material} onChange={setMaterial} label="Materials" options={materials} />
          </div>

          {/* Date Filters + Amount Range */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
            <div>
              <label className="text-[11px] font-medium uppercase text-muted-foreground">Dispatch Date</label>
              <Input type="date" value={dispatchDate} onChange={(e) => { setDispatchDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase text-muted-foreground">Documentation Date</label>
              <Input type="date" value={docDate} onChange={(e) => { setDocDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase text-muted-foreground">Invoice Date</label>
              <Input type="date" value={invDate} onChange={(e) => { setInvDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase text-muted-foreground">Delivery Date</label>
              <Input type="date" value={deliveryDate} onChange={(e) => { setDeliveryDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase text-muted-foreground">Min Freight (₹)</label>
              <Input type="number" min={0} value={minAmt} onChange={(e) => { setMinAmt(e.target.value); setPage(1); }} placeholder="0" />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase text-muted-foreground">Max Freight (₹)</label>
              <Input type="number" min={0} value={maxAmt} onChange={(e) => { setMaxAmt(e.target.value); setPage(1); }} placeholder="Any" />
            </div>
          </div>

          {activeFilters > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{activeFilters} filter{activeFilters > 1 ? "s" : ""} active — {filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
              <Button size="sm" variant="ghost" className="h-7" onClick={resetFilters}>
                <X className="mr-1 h-3 w-3" /> Clear All
              </Button>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <Th label="Memo #" sk="receiptNumber" />
                  <Th label="Date" sk="date" />
                  <Th label="Truck" sk="truckNumber" />
                  <Th label="Driver" sk="driverName" />
                  <Th label="Consignor" sk="consignor" />
                  <Th label="Consignee" sk="consignee" />
                  <Th label="Destination" sk="to" />
                  <th className="px-4 py-3">Material</th>
                  <th className="px-4 py-3 text-right">Weight</th>
                  <Th label="Total" sk="netFreight" />
                  <Th label="Advance" sk="advance" />
                  <Th label="Balance" sk="balance" />
                  <Th label="Status" sk="status" />
                  <th className="px-4 py-3">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-card">
                {pageRows.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/consignments/$id", params: { id: d.id } })}
                        className="font-mono text-primary hover:underline text-left"
                      >
                        {d.receiptNumber}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{d.date}</td>
                    <td className="px-4 py-3 font-mono text-xs">{d.truckNumber}</td>
                    <td className="px-4 py-3">{d.driverName}</td>
                    <td className="px-4 py-3 max-w-[140px] truncate" title={d.consignor}>{d.consignor}</td>
                    <td className="px-4 py-3 max-w-[140px] truncate" title={d.consignee}>{d.consignee}</td>
                    <td className="px-4 py-3">{d.to}</td>
                    <td className="px-4 py-3">{d.article}</td>
                    <td className="px-4 py-3 text-right">{d.weight} T</td>
                    <td className="px-4 py-3 text-right font-medium">{formatINR(d.netFreight)}</td>
                    <td className="px-4 py-3 text-right">{formatINR(d.advance)}</td>
                    <td className="px-4 py-3 text-right">{formatINR(d.balance)}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {d.deliveryDate
                        ? d.deliveryDate
                        : <span className="text-xs text-muted-foreground">Pending</span>}
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-4 py-16 text-center text-muted-foreground">
                      <div className="mx-auto max-w-sm space-y-2">
                        <div className="text-base font-medium">No consignments match your search</div>
                        <div className="text-sm">Try a different keyword or clear filters.</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="text-sm text-muted-foreground">
              Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Page {page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
