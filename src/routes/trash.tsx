import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllDispatches, addAuditEntry } from "@/lib/store";
import { StatusBadge, formatINR } from "@/components/StatusBadge";
import { Search, Trash2, RotateCcw } from "lucide-react";
import type { Dispatch } from "@/lib/types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/trash")({
  head: () => ({ meta: [{ title: "Trash — Sahil Road Lines" }] }),
  component: TrashPage,
});

function TrashPage() {
  const [allDispatches, setAllDispatches] = useAllDispatches();
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const deleted = allDispatches.filter((d) => !!d.deletedAt);

  const filtered = deleted.filter((d) => {
    if (!q.trim()) return true;
    const needle = q.toLowerCase();
    return [d.receiptNumber, d.truckNumber, d.driverName, d.consignor, d.consignee, d.to]
      .some((v) => (v ?? "").toLowerCase().includes(needle));
  });

  const onRestore = (d: Dispatch) => {
    const restored = { ...d, deletedAt: undefined };
    setAllDispatches(allDispatches.map((x) => (x.id === d.id ? restored : x)));
    addAuditEntry({
      action: "RESTORE",
      entity: "dispatch",
      entityId: d.id,
      receiptNumber: d.receiptNumber,
      oldValue: JSON.stringify(d),
      newValue: JSON.stringify(restored),
    });
    toast.success(`${d.receiptNumber} restored`);
  };

  const onPermanentDelete = (d: Dispatch) => {
    setAllDispatches(allDispatches.filter((x) => x.id !== d.id));
    addAuditEntry({
      action: "DELETE",
      entity: "dispatch",
      entityId: d.id,
      receiptNumber: d.receiptNumber,
      oldValue: JSON.stringify(d),
    });
    toast.success(`${d.receiptNumber} permanently deleted`);
  };

  return (
    <AppShell title="Trash" breadcrumb={["Home", "Trash"]}>
      <Card className="border-0 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search deleted dispatches…"
                className="pl-9"
              />
            </div>
            <span className="text-sm text-muted-foreground">{filtered.length} deleted record{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Memo #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Truck</th>
                  <th className="px-4 py-3">Consignor</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3 text-right">Freight</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Deleted At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-card">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/40 opacity-70">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground line-through">{d.receiptNumber}</td>
                    <td className="px-4 py-3">{d.date}</td>
                    <td className="px-4 py-3 font-mono text-xs">{d.truckNumber}</td>
                    <td className="px-4 py-3 max-w-[120px] truncate">{d.consignor}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.from} → {d.to}</td>
                    <td className="px-4 py-3 text-right">{formatINR(d.netFreight)}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {d.deletedAt
                        ? new Date(d.deletedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => onRestore(d)} className="gap-1 text-primary border-primary/30 hover:bg-primary/10">
                          <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete dispatch {d.receiptNumber}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onPermanentDelete(d)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Permanently Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground">
                      {deleted.length === 0
                        ? "Trash is empty. Deleted dispatches will appear here."
                        : "No deleted dispatches match your search."}
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
