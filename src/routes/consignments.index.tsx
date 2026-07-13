import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
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
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: search.q ? String(search.q) : undefined,
  }),
  component: ConsignmentList,
});

const ALL = "all";

type SortKey = keyof Pick<
  Dispatch,
  | "receiptNumber" | "date" | "truckNumber" | "driverName" | "consignor" | "consignee"
  | "to" | "status" | "weight" | "ratePerTon" | "netFreight" | "advance" | "balance"
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
  const { q: urlQ } = useSearch({ from: "/consignments/" });
  const [q, setQ] = useState(urlQ ?? "");
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Sync search term from URL when navigating here via global search bar
  useEffect(() => {
    if (urlQ) { setQ(urlQ); setPage(1); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQ]);

  const [memo, setMemo] = useState("");
  const [status, setStatus] = useState(ALL);
  const [dispatchDate, setDispatchDate] = useState("");
  const pageSize = 10;

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const memoNeedle = memo.trim().toLowerCase();

    let rows = dispatches.filter((d) => {
      if (memoNeedle && !d.receiptNumber.toLowerCase().includes(memoNeedle)) return false;
      if (status !== ALL && d.status !== status) return false;
      if (dispatchDate && d.date !== dispatchDate) return false;
      if (!needle) return true;
      return [
        d.receiptNumber, d.truckNumber, d.driverName, d.consignor, d.consignee,
        d.to, d.from, d.article, d.status, d.deliveryDate, d.date,
        d.documentationDate, d.lorryOwnerName, d.paidAt, d.remarks,
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
  }, [dispatches, q, memo, status, dispatchDate, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("desc"); }
    setPage(1);
  };

  const resetFilters = () => {
    setQ(""); setMemo("");
    setStatus(ALL);
    setDispatchDate("");
    setPage(1);
  };

  const activeFilters =
    (q ? 1 : 0) +
    (memo ? 1 : 0) +
    (status !== ALL ? 1 : 0) +
    (dispatchDate ? 1 : 0);

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
          {/* Row 1: Search + New Dispatch button */}
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
            <Button onClick={() => navigate({ to: "/dispatch/new" })}>
              <FilePlus2 className="mr-1.5 h-4 w-4" /> New Dispatch
            </Button>
          </div>

          {/* Row 2: Memo # + Status + Date filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Memo Number filter */}
            <Input
              value={memo}
              onChange={(e) => { setMemo(e.target.value); setPage(1); }}
              placeholder="Memo # (e.g. SRL-2026-000001)"
              className="font-mono"
            />

            {/* Status filter */}
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Statuses</SelectItem>
                {(STATUS_OPTIONS as string[]).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Dispatch Date filter */}
            <div>
              <Input
                type="date"
                value={dispatchDate}
                onChange={(e) => { setDispatchDate(e.target.value); setPage(1); }}
                title="Filter by Dispatch Date"
              />
            </div>
          </div>

          {/* Active filter count + clear */}
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
                  <Th label="Truck" sk="truckNumber" />
                  <Th label="Driver" sk="driverName" />
                  <Th label="Consignor" sk="consignor" />
                  <Th label="Consignee" sk="consignee" />
                  <th className="px-4 py-3">From</th>
                  <Th label="Destination" sk="to" />
                  <th className="px-4 py-3">Material</th>
                  <Th label="Weight" sk="weight" />
                  <Th label="Rate/Ton" sk="ratePerTon" />
                  <Th label="Total" sk="netFreight" />
                  <Th label="Advance" sk="advance" />
                  <Th label="Balance" sk="balance" />
                  <Th label="Status" sk="status" />
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

                    <td className="px-4 py-3 font-mono text-xs">{d.truckNumber}</td>
                    <td className="px-4 py-3">{d.driverName}</td>
                    <td className="px-4 py-3 max-w-[140px] truncate" title={d.consignor}>{d.consignor}</td>
                    <td className="px-4 py-3 max-w-[140px] truncate" title={d.consignee}>{d.consignee}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.from}</td>
                    <td className="px-4 py-3">{d.to}</td>
                    <td className="px-4 py-3">{d.article}</td>
                    <td className="px-4 py-3 text-right">{d.weight} T</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatINR(d.ratePerTon)}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatINR(d.netFreight)}</td>
                    <td className="px-4 py-3 text-right">{formatINR(d.advance)}</td>
                    <td className="px-4 py-3 text-right">{formatINR(d.balance)}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
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
