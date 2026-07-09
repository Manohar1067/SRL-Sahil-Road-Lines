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
import { useDispatches, useSettings } from "@/lib/store";
import type { Dispatch, Status } from "@/lib/types";
import { StatusBadge, STATUS_OPTIONS, formatINR } from "@/components/StatusBadge";
import {
  ArrowLeft, Download, Edit, ImageDown, Printer, Save,
  CheckCircle2, Circle, Truck as TruckIcon, PackageCheck, IndianRupee, FileCheck2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadMemoPDF, downloadMemoPNG, printMemo } from "@/lib/memo-render";
import { SrlLogo } from "@/components/SrlLogo";

export const Route = createFileRoute("/consignments/$id")({
  head: () => ({ meta: [{ title: "Dispatch Details — Sahil Road Lines" }] }),
  component: DispatchDetails,
});

const DELIVERY_STATUSES: Status[] = ["Delivered", "Payment Pending", "Completed"];
const requiresDelivery = (s: Status) => DELIVERY_STATUSES.includes(s);

function Row({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-b py-2.5 last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-sm" : "text-sm font-medium"}>
        {value === 0 || value ? value : "—"}
      </span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-8 gap-y-0 p-5 md:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}

interface TimelineStep {
  label: string;
  done: boolean;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
}

function Timeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="relative space-y-4 pl-4">
      {steps.map((s, i) => {
        const Icon = s.done ? CheckCircle2 : Circle;
        const StageIcon = s.icon;
        return (
          <li key={i} className="relative flex items-start gap-3">
            {i !== steps.length - 1 && (
              <span
                className={cn(
                  "absolute left-[11px] top-6 h-full w-px",
                  s.done ? "bg-primary/40" : "bg-border"
                )}
              />
            )}
            <Icon className={cn("mt-0.5 h-6 w-6 shrink-0", s.done ? "text-primary" : "text-muted-foreground")} />
            <div className="min-w-0 flex-1 pb-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <StageIcon className="h-4 w-4 text-muted-foreground" />
                <span>{s.label}</span>
              </div>
              {s.hint && <div className="mt-0.5 text-xs text-muted-foreground">{s.hint}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DispatchDetails() {
  const { id } = Route.useParams();
  const [dispatches, setDispatches] = useDispatches();
  const [settings] = useSettings();
  const navigate = useNavigate();
  const found = dispatches.find((d) => d.id === id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Dispatch | null>(found ?? null);
  const company = settings.company;

  useEffect(() => { setForm(found ?? null); }, [found?.id]);

  const totalExpenses = useMemo(() => {
    if (!form) return 0;
    return Number(form.commission || 0) + Number(form.loadingCharges || 0);
  }, [form]);

  const balance = useMemo(() => {
    if (!form) return 0;
    return Number(form.netFreight || 0) - Number(form.advance || 0);
  }, [form]);

  if (!found || !form) {
    return (
      <AppShell title="Dispatch Not Found">
        <Card><CardContent className="p-8 text-center">
          <p className="text-muted-foreground">This dispatch could not be found.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/consignments" })}>Back to list</Button>
        </CardContent></Card>
      </AppShell>
    );
  }

  const update = <K extends keyof Dispatch>(k: K, v: Dispatch[K]) => setForm((f) => f ? { ...f, [k]: v } : f);

  const onSave = () => {
    if (!form) return;
    if (requiresDelivery(form.status) && !form.deliveryDate) {
      toast.error("Delivery Date is required when status is Delivered, Payment Pending or Completed");
      return;
    }
    const updated: Dispatch = { ...form, balance, totalExpenses };
    setDispatches(dispatches.map((d) => (d.id === id ? updated : d)));
    setEditing(false);
    toast.success("Dispatch updated");
  };

  const onCancelEdit = () => {
    setForm(found);
    setEditing(false);
  };

  const onPrint = () => printMemo(found, company).catch(() => toast.error("Could not open print view"));
  const onDownloadPDF = () => downloadMemoPDF(found, company).catch(() => toast.error("Could not generate PDF"));
  const onDownloadImage = () => downloadMemoPNG(found, company).catch(() => toast.error("Could not generate image"));

  const s: Status = found.status;
  const advancePaid = found.advance > 0;
  const delivered = requiresDelivery(s);
  const paidBalance = s === "Completed" || (delivered && found.balance <= 0);
  const completed = s === "Completed";
  const steps: TimelineStep[] = [
    { label: "Dispatch Created", icon: FileCheck2, done: true, hint: found.createdAt ? new Date(found.createdAt).toLocaleString("en-IN") : found.date },
    { label: "Advance Paid", icon: IndianRupee, done: advancePaid, hint: advancePaid ? formatINR(found.advance) : "Not yet" },
    { label: "Dispatched", icon: TruckIcon, done: true, hint: `${found.from || "—"} → ${found.to || "—"}` },
    { label: "Delivered", icon: PackageCheck, done: delivered, hint: found.deliveryDate || (delivered ? "Delivered" : "Pending") },
    { label: "Remaining Amount Received", icon: IndianRupee, done: paidBalance, hint: paidBalance ? "Balance settled" : `Balance ${formatINR(found.balance)}` },
    { label: "Completed", icon: CheckCircle2, done: completed, hint: completed ? "Closed" : "Pending" },
  ];

  return (
    <AppShell title={`Dispatch ${found.receiptNumber}`} breadcrumb={["Home", "Consignments", found.receiptNumber]}>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center gap-2 no-print">
          <Button variant="outline" onClick={() => navigate({ to: "/consignments" })}><ArrowLeft className="mr-1.5 h-4 w-4" />Back</Button>
          {!editing && <Button onClick={() => setEditing(true)}><Edit className="mr-1.5 h-4 w-4" />Edit</Button>}
          {editing && <>
            <Button onClick={onSave}><Save className="mr-1.5 h-4 w-4" />Save</Button>
            <Button variant="outline" onClick={onCancelEdit}>Cancel</Button>
          </>}
          {!editing && <>
            <Button variant="outline" onClick={onPrint}><Printer className="mr-1.5 h-4 w-4" />Print</Button>
            <Button variant="outline" onClick={onDownloadPDF}><Download className="mr-1.5 h-4 w-4" />Download PDF</Button>
            <Button variant="outline" onClick={onDownloadImage}><ImageDown className="mr-1.5 h-4 w-4" />Download PNG</Button>
          </>}
          <div className="ml-auto"><StatusBadge status={form.status} /></div>
        </div>

        {editing ? (
          <div className="space-y-5">
            <Card className="border-0 shadow-sm">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">Edit Dispatch</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
                {/* Permanently locked fields */}
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Dispatch Memo # (locked)</Label>
                  <Input value={form.receiptNumber} readOnly className="bg-muted font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Truck Number (locked)</Label>
                  <Input value={form.truckNumber} readOnly className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Consignor (locked)</Label>
                  <Input value={form.consignor} readOnly className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Consignee (locked)</Label>
                  <Input value={form.consignee} readOnly className="bg-muted" />
                </div>

                {/* Dates */}
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Dispatch Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Documentation Date (locked)</Label>
                  <Input type="date" value={form.documentationDate || ""} readOnly className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Invoice Date (locked)</Label>
                  <Input type="date" value={form.invoiceDate || ""} readOnly className="bg-muted" />
                </div>

                {/* Status & Delivery */}
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Status</Label>
                  <Select value={form.status} onValueChange={(v) => update("status", v as Status)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">
                    Delivery Date {requiresDelivery(form.status) && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    type="date"
                    value={form.deliveryDate || ""}
                    onChange={(e) => update("deliveryDate", e.target.value)}
                  />
                </div>

                {/* Route */}
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">From</Label>
                  <Input value={form.from} onChange={(e) => update("from", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">To</Label>
                  <Input value={form.to} onChange={(e) => update("to", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Driver Name</Label>
                  <Input value={form.driverName} onChange={(e) => update("driverName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Lorry Owner</Label>
                  <Input value={form.lorryOwnerName} onChange={(e) => update("lorryOwnerName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Material</Label>
                  <Input value={form.article} onChange={(e) => update("article", e.target.value)} />
                </div>

                {/* Payment */}
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Advance</Label>
                  <Input type="number" min={0} value={form.advance || ""} onChange={(e) => update("advance", Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Paid At</Label>
                  <Input value={form.paidAt} onChange={(e) => update("paidAt", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Commission</Label>
                  <Input type="number" min={0} value={form.commission || ""} onChange={(e) => update("commission", Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">Loading Charges</Label>
                  <Input type="number" min={0} value={form.loadingCharges || ""} onChange={(e) => update("loadingCharges", Number(e.target.value))} />
                </div>
                <div className="space-y-1.5 md:col-span-3">
                  <Label className="text-xs uppercase text-muted-foreground">Remarks</Label>
                  <Textarea value={form.remarks} onChange={(e) => update("remarks", e.target.value)} rows={3} />
                </div>
                <div className="md:col-span-3 grid grid-cols-2 gap-4 border-t pt-4 md:grid-cols-3">
                  <div><Label className="text-xs uppercase text-muted-foreground">Total Freight</Label><div className="mt-1 font-semibold text-primary">{formatINR(form.netFreight)}</div></div>
                  <div><Label className="text-xs uppercase text-muted-foreground">Balance</Label><div className="mt-1 font-semibold text-primary">{formatINR(balance)}</div></div>
                  <div><Label className="text-xs uppercase text-muted-foreground">Total Expenses</Label><div className="mt-1 font-semibold text-primary">{formatINR(totalExpenses)}</div></div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <div className="print-area bg-white text-black">
              {/* A4 paper memo replica */}
              <div className="mx-auto max-w-[780px] bg-white border border-gray-300 font-sans text-[13px]">

                {/* TOP INFO BAR */}
                <div className="flex items-center justify-between border-b border-gray-300 px-4 py-1 text-[10px] text-gray-500">
                  <span>* Subject to Visakhapatnam Jurisdiction</span>
                  <span>Cell: {company.phone || ""}</span>
                </div>

                {/* HEADER */}
                <div className="flex items-stretch border-b-2 border-blue-700">
                  <div className="flex items-center justify-center border-r-2 border-blue-700 px-4 py-3">
                    <SrlLogo size={72} />
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
                    <div className="text-2xl font-extrabold tracking-widest text-[#c0272d] leading-tight">SAHIL ROAD LINES</div>
                    <div className="mt-0.5 bg-[#1a2e5e] text-white text-[10px] font-bold tracking-widest px-3 py-0.5 uppercase">
                      Transport Contractors &amp; Commission Agents
                    </div>
                    <div className="mt-1 text-[10px] text-gray-600 leading-tight">{company.address || "Plot No.5, N.H.-5 Road, Opp. Radio Station, Kurmannapalem, Visakhapatnam - 530 046."}</div>
                    {company.gst && <div className="mt-0.5 text-[10px] text-gray-600">GST: {company.gst}</div>}
                  </div>
                </div>

                {/* MEMO NUMBER + DATE */}
                <div className="flex items-center border-b border-gray-400 px-3 py-1 gap-2">
                  <span className="text-sm font-semibold text-gray-700">No.</span>
                  <span className="w-24 font-bold text-[#c0272d] text-base font-mono">{found.receiptNumber}</span>
                  <div className="flex-1 text-center font-bold text-[#c0272d] text-sm uppercase tracking-wider">Goods Despatch Memo</div>
                  <span className="text-sm text-gray-700">Date: {found.date}</span>
                </div>

                {/* ROUTE */}
                <div className="flex border-b border-gray-400">
                  <div className="flex flex-1 items-center gap-1 border-r border-gray-400 px-3 py-1">
                    <span className="text-xs text-gray-600 whitespace-nowrap">From</span>
                    <span className="flex-1 font-medium">{found.from}</span>
                    <span className="text-xs text-gray-600 whitespace-nowrap">to</span>
                    <span className="flex-1 font-medium">{found.to}</span>
                  </div>
                  <div className="flex items-center gap-1 border-r border-gray-400 px-3 py-1 w-32">
                    <span className="text-xs text-gray-600 whitespace-nowrap">G.C. No.</span>
                    <span>{found.gcNumber}</span>
                  </div>
                  <div className="flex items-center gap-1 px-3 py-1 w-36">
                    <span className="text-xs text-gray-600 whitespace-nowrap">Article</span>
                    <span>{found.article}</span>
                  </div>
                </div>

                {/* LORRY OWNER / DRIVER */}
                <div className="flex border-b border-gray-400">
                  <div className="flex flex-1 items-center gap-1 border-r border-gray-400 px-3 py-1">
                    <span className="text-xs text-gray-600 whitespace-nowrap">Lorry Owner Name :</span>
                    <span className="flex-1 font-medium">{found.lorryOwnerName}</span>
                  </div>
                  <div className="flex flex-1 items-center gap-1 px-3 py-1">
                    <span className="text-xs text-gray-600 whitespace-nowrap">Driver Name :</span>
                    <span className="flex-1 font-medium">{found.driverName}</span>
                  </div>
                </div>

                {/* CONSIGNOR */}
                <div className="flex border-b border-gray-400 px-3 py-1 items-center gap-2">
                  <span className="text-xs text-gray-600 whitespace-nowrap">Consignor M/S</span>
                  <span className="flex-1 font-medium">{found.consignor}</span>
                </div>

                {/* CONSIGNEE */}
                <div className="flex border-b border-gray-400 px-3 py-1 items-center gap-2">
                  <span className="text-xs text-gray-600 whitespace-nowrap">Consignee M/S</span>
                  <span className="flex-1 font-medium">{found.consignee}</span>
                </div>

                {/* DESCRIPTION */}
                <div className="flex border-b border-gray-400 px-3 py-1 items-center gap-2">
                  <span className="text-xs text-gray-600 whitespace-nowrap">Description</span>
                  <span className="flex-1">{found.description}</span>
                </div>

                {/* PER TON / WEIGHT */}
                <div className="flex border-b border-gray-400">
                  <div className="flex flex-1 items-center gap-2 border-r border-gray-400 px-3 py-1">
                    <span className="text-xs text-gray-600 whitespace-nowrap">Per Ton Rs.</span>
                    <span className="font-medium">{found.ratePerTon}</span>
                    <span className="text-xs text-gray-500">P.M.T.</span>
                  </div>
                  <div className="flex flex-1 items-center gap-2 px-3 py-1">
                    <span className="text-xs text-gray-600 whitespace-nowrap">Weight.</span>
                    <span className="font-medium">{found.weight}</span>
                    <span className="text-xs text-gray-500">Tons</span>
                  </div>
                </div>

                {/* GR NOTICE */}
                <div className="border-b-2 border-gray-400 px-3 py-1.5 text-center">
                  <span className="font-bold text-[#c0272d] text-xs tracking-wide">Goods Receipt should be arrived within 15 days</span>
                </div>

                {/* THREE-COLUMN BOTTOM */}
                <div className="flex border-b border-gray-400">
                  {/* LEFT — Freight */}
                  <div className="flex-1 border-r border-gray-400">
                    <div className="border border-gray-400 px-2 py-1">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">Net Freight</div>
                      <div className="text-sm font-bold">{formatINR(found.netFreight)}</div>
                    </div>
                    <div className="border border-gray-400 px-2 py-1">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">Advance</div>
                      <div className="text-sm font-medium">{formatINR(found.advance)}</div>
                    </div>
                    <div className="border border-gray-400 px-2 py-1">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">Balance</div>
                      <div className="text-sm font-bold">{formatINR(found.balance)}</div>
                    </div>
                    <div className="border border-gray-400 px-2 py-1">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">Paid at</div>
                      <div className="text-sm">{found.paidAt}</div>
                    </div>
                    <div className="px-2 py-1 text-[9px] text-gray-500 leading-tight">
                      I agree with terms and conditions overleaf and abide by that Received the goods in good condition.
                    </div>
                  </div>

                  {/* CENTER — Truck */}
                  <div className="w-36 border-r border-gray-400 flex flex-col items-center">
                    <div className="border-b border-gray-400 w-full text-center py-1">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">Truck No.</div>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-2">
                      <div className="text-xl font-bold text-gray-800 text-center tracking-widest">
                        {found.truckNumber}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT — Expenses */}
                  <div className="flex-1">
                    <div className="border border-gray-400 px-2 py-1">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">Commission</div>
                      <div className="text-sm">{formatINR(found.commission)}</div>
                    </div>
                    <div className="border border-gray-400 px-2 py-1">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">Loading</div>
                      <div className="text-sm">{formatINR(found.loadingCharges)}</div>
                    </div>
                    <div className="border border-gray-400 px-2 py-1">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">Total Expenses</div>
                      <div className="text-sm font-bold">{formatINR(found.totalExpenses)}</div>
                    </div>
                    {found.remarks && (
                      <div className="border border-gray-400 px-2 py-1">
                        <div className="text-[10px] text-gray-500 font-semibold uppercase">Remarks</div>
                        <div className="text-xs">{found.remarks}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SIGNATURES */}
                <div className="flex border-b border-gray-400">
                  <div className="flex-1 border-r border-gray-400 px-3 py-4">
                    <div className="mt-8 border-t border-gray-500" />
                    <div className="mt-1 text-[10px] text-gray-500 text-center">Signature of the Driver on behalf of the Owner.</div>
                  </div>
                  <div className="flex-1 px-3 py-4 flex flex-col justify-end">
                    <div className="text-right text-xs text-gray-600 mb-1">For. <span className="font-bold text-[#c0272d]">SAHIL ROAD LINES</span></div>
                    <div className="mt-6 border-t border-gray-500" />
                    <div className="mt-1 text-[10px] text-gray-500 text-center">Authorised Signature</div>
                  </div>
                </div>

                {/* FOOTER */}
                <div className="px-3 py-1.5 text-center">
                  <span className="text-[11px] font-bold text-[#c0272d]">Return payment will not get without this Receipt and any other particulars</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 no-print">
              <div className="lg:col-span-2 space-y-5">
                <SectionCard title="Dispatch Information">
                  <Row label="Dispatch Memo #" value={found.receiptNumber} mono />
                  <Row label="Dispatch Date" value={found.date} />
                  <Row label="Documentation Date" value={found.documentationDate || "—"} />
                  <Row label="Invoice Date" value={found.invoiceDate || "—"} />
                  <Row label="From" value={found.from} />
                  <Row label="To" value={found.to} />
                </SectionCard>

                <SectionCard title="Vehicle Information">
                  <Row label="Truck Number" value={found.truckNumber} mono />
                  <Row label="Driver Name" value={found.driverName} />
                  <Row label="Lorry Owner" value={found.lorryOwnerName} />
                </SectionCard>

                <SectionCard title="Customer Information">
                  <Row label="Consignor" value={found.consignor} />
                  <Row label="Consignee" value={found.consignee} />
                </SectionCard>

                <SectionCard title="Goods Information">
                  <Row label="Material" value={found.article} />
                  <Row label="Weight (Tons)" value={found.weight} />
                  <Row label="Rate Per Ton" value={formatINR(found.ratePerTon)} />
                  <Row label="Total Freight" value={formatINR(found.netFreight)} />
                  <Row label="Additional Notes" value={found.description} />
                </SectionCard>

                <SectionCard title="Payment Information">
                  <Row label="Total Freight" value={formatINR(found.netFreight)} />
                  <Row label="Advance" value={formatINR(found.advance)} />
                  <Row label="Balance" value={formatINR(found.balance)} />
                  <Row label="Paid At" value={found.paidAt} />
                  <Row label="Commission" value={formatINR(found.commission)} />
                  <Row label="Loading Charges" value={formatINR(found.loadingCharges)} />
                  <Row label="Total Expenses" value={formatINR(found.totalExpenses)} />
                </SectionCard>

                <SectionCard title="Remarks">
                  <div className="md:col-span-2"><Row label="Remarks" value={found.remarks} /></div>
                </SectionCard>

                <SectionCard title="Delivery Information">
                  <Row label="Status" value={<StatusBadge status={found.status} />} />
                  <Row label="Delivery Date" value={found.deliveryDate || "Pending"} />
                </SectionCard>
              </div>

              <div className="lg:col-span-1">
                <Card className="border-0 shadow-sm lg:sticky lg:top-20">
                  <CardHeader className="border-b pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <Timeline steps={steps} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
