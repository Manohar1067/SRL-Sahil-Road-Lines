import { useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export interface CrudColumn<T> {
  key: keyof T;
  label: string;
  type?: "text" | "number";
  render?: (row: T) => React.ReactNode;
}

interface Props<T extends { id: string }> {
  title: string;
  rows: T[];
  setRows: (rows: T[]) => void;
  columns: CrudColumn<T>[];
  empty: Omit<T, "id">;
  addLabel: string;
}

export function CrudTable<T extends { id: string }>({ title, rows, setRows, columns, empty, addLabel }: Props<T>) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<T | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);

  const startAdd = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (row: T) => { setEditing(row); setForm({ ...row }); setOpen(true); };

  const onSave = () => {
    for (const c of columns) {
      if (!form[c.key] && c.type !== "number") { toast.error(`${c.label} is required`); return; }
    }
    if (editing) {
      setRows(rows.map((r) => r.id === editing.id ? { ...editing, ...form } : r));
      toast.success(`${title} updated`);
    } else {
      const id = Math.random().toString(36).slice(2, 10);
      setRows([{ ...(form as T), id }, ...rows]);
      toast.success(`${title} added`);
    }
    setOpen(false);
  };

  const onDelete = (row: T) => {
    setRows(rows.filter((r) => r.id !== row.id));
    toast.success(`${title} deleted`);
  };

  const needle = q.trim().toLowerCase();
  const filtered = rows.filter((r) =>
    !needle || columns.some((c) => String((r as any)[c.key] ?? "").toLowerCase().includes(needle))
  );

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`} className="pl-9" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={startAdd}><Plus className="mr-1.5 h-4 w-4" />{addLabel}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? `Edit ${title}` : addLabel}</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                {columns.map((c) => (
                  <div key={String(c.key)} className="space-y-1.5">
                    <Label className="text-xs uppercase text-muted-foreground">{c.label}</Label>
                    <Input
                      type={c.type || "text"}
                      value={form[c.key] ?? ""}
                      onChange={(e) => setForm({ ...form, [c.key]: c.type === "number" ? Number(e.target.value) : e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={onSave}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {columns.map((c) => <th key={String(c.key)} className="px-4 py-3">{c.label}</th>)}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y bg-card">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-muted/40">
                  {columns.map((c) => (
                    <td key={String(c.key)} className="px-4 py-3">{c.render ? c.render(row) : String((row as any)[c.key] ?? "")}</td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(row)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this {title.toLowerCase()}?</AlertDialogTitle>
                            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(row)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={columns.length + 1} className="px-4 py-12 text-center text-muted-foreground">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
