import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuditLog } from "@/lib/store";
import { Search, X } from "lucide-react";
import type { AuditEntry } from "@/lib/types";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/audit-log")({
  head: () => ({ meta: [{ title: "Audit Log — Sahil Road Lines" }] }),
  component: AuditLogPage,
});

const ACTION_COLORS: Record<AuditEntry["action"], string> = {
  CREATE: "bg-success/15 text-success border-success/30",
  UPDATE: "bg-primary/10 text-primary border-primary/30",
  DELETE: "bg-destructive/10 text-destructive border-destructive/30",
  STATUS_CHANGE: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400",
  RESTORE: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/30 dark:text-purple-400",
};

const ACTION_LABELS: Record<AuditEntry["action"], string> = {
  CREATE: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
  STATUS_CHANGE: "Status Changed",
  RESTORE: "Restored",
};

const MODULE_LABELS: Record<AuditEntry["entity"], string> = {
  dispatch: "Dispatch",
  truck: "Truck",
  driver: "Driver",
  consignor: "Consignor",
  consignee: "Consignee",
  settings: "Settings",
};

const ALL = "all";

/** Parse JSON safely and return a formatted diff string */
function buildDiff(oldValue: string | undefined, newValue: string | undefined): { prev: string; next: string } {
  if (!oldValue && !newValue) return { prev: "—", next: "—" };

  try {
    const n = newValue ? JSON.parse(newValue) : null;
    const o = oldValue ? JSON.parse(oldValue) : null;

    if (!n && o) return { prev: JSON.stringify(o, null, 2), next: "— (deleted)" };
    if (n && !o) return { prev: "— (new record)", next: JSON.stringify(n, null, 2) };

    // Compute field-level changes
    const changes: string[] = [];
    const allKeys = new Set([...Object.keys(n || {}), ...Object.keys(o || {})]);
    allKeys.forEach((k) => {
      const ov = JSON.stringify((o as any)?.[k]);
      const nv = JSON.stringify((n as any)?.[k]);
      if (ov !== nv) {
        changes.push(`${k}: ${ov ?? "—"} → ${nv ?? "—"}`);
      }
    });

    if (changes.length === 0) return { prev: "—", next: "No changes" };
    return { prev: changes.map((c) => `− ${c.split(" → ")[0]}`).join("\n"), next: changes.map((c) => `+ ${c.split(" → ")[1]}`).join("\n") };
  } catch {
    return { prev: oldValue ?? "—", next: newValue ?? "—" };
  }
}

function AuditLogPage() {
  const [log] = useAuditLog();
  const [q, setQ] = useState("");
  const [moduleFilter, setModuleFilter] = useState(ALL);
  const [actionFilter, setActionFilter] = useState(ALL);

  const filtered = log.filter((entry) => {
    if (moduleFilter !== ALL && entry.entity !== moduleFilter) return false;
    if (actionFilter !== ALL && entry.action !== actionFilter) return false;
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return [entry.action, entry.entity, entry.receiptNumber, entry.changedBy, entry.entityId, entry.newValue, entry.oldValue]
      .some((v) => (v ?? "").toLowerCase().includes(needle));
  });

  const activeFilters = (q ? 1 : 0) + (moduleFilter !== ALL ? 1 : 0) + (actionFilter !== ALL ? 1 : 0);

  const resetFilters = () => { setQ(""); setModuleFilter(ALL); setActionFilter(ALL); };

  return (
    <AppShell title="Audit Log" breadcrumb={["Home", "Audit Log"]}>
      <Card className="border-0 shadow-sm">
        <CardContent className="space-y-4 p-5">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by action, module, receipt, value…"
                className="pl-9"
              />
            </div>

            {/* Module filter */}
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Modules</SelectItem>
                {Object.entries(MODULE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Action filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Actions</SelectItem>
                {Object.entries(ACTION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground">{filtered.length} entries</span>

            {activeFilters > 0 && (
              <Button size="sm" variant="ghost" className="h-9" onClick={resetFilters}>
                <X className="mr-1 h-3 w-3" /> Clear
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 whitespace-nowrap">Time</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3 w-64">Previous Value</th>
                  <th className="px-4 py-3 w-64">New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-card">
                {filtered.map((entry) => {
                  const dt = new Date(entry.changedAt);
                  const date = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                  const time = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                  const { prev, next } = buildDiff(entry.oldValue, entry.newValue);

                  return (
                    <tr key={entry.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">{date}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">{time}</td>
                      <td className="px-4 py-3 font-medium">{entry.changedBy}</td>
                      <td className="px-4 py-3 capitalize">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                          {MODULE_LABELS[entry.entity] ?? entry.entity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-semibold uppercase ${ACTION_COLORS[entry.action]}`}
                        >
                          {ACTION_LABELS[entry.action] ?? entry.action.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-primary">{entry.receiptNumber || "—"}</td>

                      {/* Previous Value */}
                      <td className="px-4 py-3 max-w-[256px]">
                        {entry.oldValue ? (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-muted-foreground hover:text-foreground select-none">
                              View previous
                            </summary>
                            <pre className="mt-1 max-h-36 overflow-auto rounded bg-muted p-2 text-[10px] text-muted-foreground whitespace-pre-wrap">
                              {prev}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </td>

                      {/* New Value */}
                      <td className="px-4 py-3 max-w-[256px]">
                        {entry.newValue ? (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-primary hover:underline select-none">
                              View changes
                            </summary>
                            <pre className="mt-1 max-h-36 overflow-auto rounded bg-muted p-2 text-[10px] text-muted-foreground whitespace-pre-wrap">
                              {next}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            {entry.oldValue ? "Record deleted" : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-muted-foreground">
                      {log.length === 0
                        ? "No audit entries yet. Create, edit or delete a record to see entries here."
                        : "No entries match your filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
