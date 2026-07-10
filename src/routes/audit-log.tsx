import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuditLog } from "@/lib/store";
import { Search } from "lucide-react";
import type { AuditEntry } from "@/lib/types";

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

function AuditLogPage() {
  const [log] = useAuditLog();
  const [q, setQ] = useState("");

  const filtered = log.filter((entry) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return [entry.action, entry.entity, entry.receiptNumber, entry.changedBy, entry.entityId]
      .some((v) => (v ?? "").toLowerCase().includes(needle));
  });

  return (
    <AppShell title="Audit Log" breadcrumb={["Home", "Audit Log"]}>
      <Card className="border-0 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by action, entity, receipt…"
                className="pl-9"
              />
            </div>
            <span className="text-sm text-muted-foreground">{filtered.length} entries</span>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3">Changed By</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-card">
                {filtered.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-semibold uppercase ${ACTION_COLORS[entry.action]}`}
                      >
                        {entry.action.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{entry.entity}</td>
                    <td className="px-4 py-3 font-mono text-xs text-primary">{entry.receiptNumber || "—"}</td>
                    <td className="px-4 py-3">{entry.changedBy}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(entry.changedAt).toLocaleString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      {entry.newValue && (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-primary hover:underline">View changes</summary>
                          <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-[10px] text-muted-foreground whitespace-pre-wrap">
                            {(() => {
                              try {
                                const n = JSON.parse(entry.newValue);
                                const o = entry.oldValue ? JSON.parse(entry.oldValue) : {};
                                const changes: string[] = [];
                                Object.keys(n).forEach((k) => {
                                  if (JSON.stringify(n[k]) !== JSON.stringify(o[k])) {
                                    changes.push(`${k}: ${JSON.stringify(o[k])} → ${JSON.stringify(n[k])}`);
                                  }
                                });
                                return changes.length ? changes.join("\n") : "New record created";
                              } catch {
                                return entry.newValue;
                              }
                            })()}
                          </pre>
                        </details>
                      )}
                      {!entry.newValue && entry.oldValue && (
                        <span className="text-xs text-muted-foreground italic">Record deleted</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                      {log.length === 0 ? "No audit entries yet. Create, edit or delete a dispatch to see entries here." : "No entries match your search."}
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
