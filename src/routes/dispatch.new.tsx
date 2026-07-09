import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useConsignees, useConsignors, useDispatches, useDrivers, useTrucks, nextReceiptNumber, uid } from "@/lib/store";
import type { Dispatch } from "@/lib/types";
import { formatINR } from "@/components/StatusBadge";

export const Route = createFileRoute("/dispatch/new")({
  head: () => ({ meta: [{ title: "New Dispatch — Sahil Road Lines" }] }),
  component: NewDispatch,
});

const today = () => new Date().toISOString().slice(0, 10);

const empty: Dispatch = {
  id: "",
  receiptNumber: "",
  date: today(),
  documentationDate: today(),
  invoiceDate: today(),
  from: "",
  to: "",
  gcNumber: "",
  article: "",
  truckNumber: "",
  driverName: "",
  lorryOwnerName: "",
  consignor: "",
  consignee: "",
  description: "",
  weight: 0,
  ratePerTon: 0,
  netFreight: 0,
  advance: 0,
  balance: 0,
  paidAt: "",
  commission: 0,
  loadingCharges: 0,
  totalExpenses: 0,
  remarks: "",
  status: "Dispatched",
  deliveryDate: "",
  locked: false,
  createdAt: "",
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-3">{children}</CardContent>
    </Card>
  );
}

function NewDispatch() {
  const [dispatches, setDispatches] = useDispatches();
  const [trucks] = useTrucks();
  const [drivers] = useDrivers();
  const [consignors] = useConsignors();
  const [consignees] = useConsignees();
  const navigate = useNavigate();

  const [form, setForm] = useState<Dispatch>(empty);

  useEffect(() => {
    setForm((f) => ({ ...f, receiptNumber: nextReceiptNumber(dispatches) }));
  }, [dispatches.length]);

  const update = <K extends keyof Dispatch>(k: K, v: Dispatch[K]) => setForm((f) => ({ ...f, [k]: v }));

  const total = useMemo(() => Number(form.weight || 0) * Number(form.ratePerTon || 0), [form.weight, form.ratePerTon]);
  const balance = useMemo(() => total - Number(form.advance || 0), [total, form.advance]);
  const totalExpenses = useMemo(
    () => Number(form.commission || 0) + Number(form.loadingCharges || 0),
    [form.commission, form.loadingCharges]
  );

  const onSave = () => {
    const required: [string, any][] = [
      ["Consignor", form.consignor], ["Consignee", form.consignee], ["Truck Number", form.truckNumber],
      ["Driver", form.driverName], ["Weight", form.weight], ["Rate Per Ton", form.ratePerTon], ["Dispatch Date", form.date],
      ["Material", form.article],
    ];
    const missing = required.filter(([, v]) => !v || (typeof v === "number" && v <= 0));
    if (missing.length) {
      toast.error(`Please fill required fields: ${missing.map(([k]) => k).join(", ")}`);
      return;
    }
    const dispatch: Dispatch = {
      ...form,
      id: uid(),
      netFreight: total,
      balance,
      totalExpenses,
      status: "Dispatched",
      deliveryDate: "",
      locked: true,
      createdAt: new Date().toISOString(),
    };
    setDispatches([dispatch, ...dispatches]);
    toast.success(`Dispatch ${dispatch.receiptNumber} saved successfully`);
    navigate({ to: "/consignments" });
  };

  return (
    <AppShell title="New Dispatch" breadcrumb={["Home", "Dispatches", "New"]}>
      <div className="mx-auto max-w-6xl space-y-5">
        <Section title="Dispatch Information">
          <Field label="Dispatch Memo Number"><Input value={form.receiptNumber} readOnly className="bg-muted font-mono" /></Field>
          <Field label="Dispatch Date" required><Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} /></Field>
          <Field label="Documentation Date"><Input type="date" value={form.documentationDate || ""} onChange={(e) => update("documentationDate", e.target.value)} /></Field>
          <Field label="Invoice Date"><Input type="date" value={form.invoiceDate || ""} onChange={(e) => update("invoiceDate", e.target.value)} /></Field>
          <Field label="From"><Input value={form.from} onChange={(e) => update("from", e.target.value)} placeholder="Origin city" /></Field>
          <Field label="To" required><Input value={form.to} onChange={(e) => update("to", e.target.value)} placeholder="Destination city" /></Field>
        </Section>

        <Section title="Vehicle Information">
          <Field label="Truck Number" required>
            <Select value={form.truckNumber} onValueChange={(v) => {
              const t = trucks.find((x) => x.truckNumber === v);
              update("truckNumber", v);
              if (t) { update("driverName", t.driver); update("lorryOwnerName", t.ownerName); }
            }}>
              <SelectTrigger><SelectValue placeholder="Select truck" /></SelectTrigger>
              <SelectContent>{trucks.map((t) => <SelectItem key={t.id} value={t.truckNumber}>{t.truckNumber}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Driver Name" required>
            <Select value={form.driverName} onValueChange={(v) => update("driverName", v)}>
              <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
              <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Lorry Owner Name"><Input value={form.lorryOwnerName} onChange={(e) => update("lorryOwnerName", e.target.value)} /></Field>
        </Section>

        <Section title="Customer Information">
          <Field label="Consignor" required>
            <Select value={form.consignor} onValueChange={(v) => update("consignor", v)}>
              <SelectTrigger><SelectValue placeholder="Select consignor" /></SelectTrigger>
              <SelectContent>{consignors.map((c) => <SelectItem key={c.id} value={c.companyName}>{c.companyName}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Consignee" required>
            <Select value={form.consignee} onValueChange={(v) => update("consignee", v)}>
              <SelectTrigger><SelectValue placeholder="Select consignee" /></SelectTrigger>
              <SelectContent>{consignees.map((c) => <SelectItem key={c.id} value={c.companyName}>{c.companyName}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </Section>

        <Section title="Goods Information">
          <Field label="Material" required>
            <Input value={form.article} onChange={(e) => update("article", e.target.value)} placeholder="e.g. Steel Bars, Cement, Rice Bags" />
          </Field>
          <Field label="Weight (Tons)" required><Input type="number" min={0} step="0.01" value={form.weight || ""} onChange={(e) => update("weight", Number(e.target.value))} /></Field>
          <Field label="Rate Per Ton (₹)" required><Input type="number" min={0} value={form.ratePerTon || ""} onChange={(e) => update("ratePerTon", Number(e.target.value))} /></Field>
          <Field label="Total Freight (Auto)">
            <Input value={formatINR(total)} readOnly className="bg-primary-soft font-semibold text-primary" />
          </Field>
          <div className="md:col-span-2 lg:col-span-3">
            <Field label="Additional Notes"><Input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Optional description" /></Field>
          </div>
        </Section>

        <Section title="Payment Information">
          <Field label="Total Freight (Auto)"><Input value={formatINR(total)} readOnly className="bg-primary-soft font-semibold text-primary" /></Field>
          <Field label="Advance"><Input type="number" min={0} value={form.advance || ""} onChange={(e) => update("advance", Number(e.target.value))} /></Field>
          <Field label="Balance (Auto)"><Input value={formatINR(balance)} readOnly className="bg-primary-soft font-semibold text-primary" /></Field>
          <Field label="Paid At"><Input value={form.paidAt} onChange={(e) => update("paidAt", e.target.value)} placeholder="e.g. Mumbai Office" /></Field>
          <Field label="Commission"><Input type="number" min={0} value={form.commission || ""} onChange={(e) => update("commission", Number(e.target.value))} /></Field>
          <Field label="Loading Charges"><Input type="number" min={0} value={form.loadingCharges || ""} onChange={(e) => update("loadingCharges", Number(e.target.value))} /></Field>
          <Field label="Total Expenses (Auto)"><Input value={formatINR(totalExpenses)} readOnly className="bg-primary-soft font-semibold text-primary" /></Field>
        </Section>

        <Section title="Remarks">
          <div className="md:col-span-2 lg:col-span-3">
            <Field label="Remarks"><Textarea value={form.remarks} onChange={(e) => update("remarks", e.target.value)} rows={3} /></Field>
          </div>
        </Section>

        <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t bg-card/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
          <Button variant="outline" onClick={() => navigate({ to: "/consignments" })}>Cancel</Button>
          <Button onClick={onSave} size="lg">Save Dispatch</Button>
        </div>
      </div>
    </AppShell>
  );
}
