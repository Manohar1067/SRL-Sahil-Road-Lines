import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAllDispatches, useDrivers, useTrucks, useSettings, addAuditEntry } from "@/lib/store";
import type { Dispatch, Status } from "@/lib/types";
import { StatusBadge, STATUS_OPTIONS, formatINR } from "@/components/StatusBadge";
import {
  ArrowLeft, Download, Edit, ImageDown, Printer, Save,
  CheckCircle2, Circle, Truck as TruckIcon, PackageCheck, IndianRupee, FileCheck2,
  MessageCircle, Mail, Trash2, ShieldAlert, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { downloadMemoPDF, downloadMemoPNG, printMemo } from "@/lib/memo-render";
import { SrlLogo } from "@/components/SrlLogo";
import { DispatchForm } from "@/components/DispatchForm";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

function SectionCard({ title, children, accent }: { title: string; children: React.ReactNode; accent?: string }) {
  return (
    <Card className={cn("border-0 shadow-sm", accent && "border-l-4")} style={accent ? { borderLeftColor: accent } : {}}>
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-8 gap-y-0 p-5 md:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}

/** Visual status timeline */
function StatusTimeline({ dispatch }: { dispatch: Dispatch }) {
  const history = dispatch.statusHistory ?? [
    { status: dispatch.status, changedAt: dispatch.createdAt, changedBy: "Admin" },
  ];

  const allSteps: Status[] = ["Created", "Dispatched", "Shipped", "Delivered", "Payment Pending", "Completed"];

  // Build a map of which statuses happened and when
  const doneMap = new Map<Status, string>();
  history.forEach((h) => doneMap.set(h.status, h.changedAt));

  return (
    <ol className="relative space-y-0 pl-0">
      {allSteps.map((step, i) => {
        const isDone = doneMap.has(step);
        const ts = doneMap.get(step);
        const Icon = isDone ? CheckCircle2 : Circle;
        const isLast = i === allSteps.length - 1;
        return (
          <li key={step} className="relative flex gap-3 pb-5">
            {/* Connector line */}
            {!isLast && (
              <span
                className={cn(
                  "absolute left-[11px] top-6 bottom-0 w-px",
                  isDone ? "bg-primary/40" : "bg-border"
                )}
              />
            )}
            <Icon
              className={cn(
                "mt-0.5 h-6 w-6 shrink-0 transition-colors",
                isDone ? "text-primary" : "text-muted-foreground/30"
              )}
            />
            <div className="min-w-0 flex-1">
              <div className={cn("text-sm font-semibold", isDone ? "text-foreground" : "text-muted-foreground/50")}>
                {step}
              </div>
              {ts && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(ts).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DispatchDetails() {
  const { id } = Route.useParams();
  const [allDispatches, setAllDispatches] = useAllDispatches();
  const [trucks] = useTrucks();
  const [drivers] = useDrivers();
  const [settings] = useSettings();
  const navigate = useNavigate();
  const found = allDispatches.find((d) => d.id === id);
  const [editing, setEditing] = useState(false);
  const company = settings.company;

  useEffect(() => {
    if (editing) setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const balance = useMemo(() => {
    if (!found) return 0;
    return Number(found.netFreight || 0) - Number(found.advance || 0);
  }, [found]);

  const finalPayable = useMemo(() => {
    if (!found) return 0;
    return balance - Number(found.bargainAmount || 0);
  }, [found, balance]);

  if (!found) {
    return (
      <AppShell title="Dispatch Not Found">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">This dispatch could not be found.</p>
            <Button className="mt-4" onClick={() => navigate({ to: "/consignments" })}>
              Back to list
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const onSaveEdit = (updated: Dispatch) => {
    const old = found;
    setAllDispatches(allDispatches.map((d) => (d.id === id ? updated : d)));
    addAuditEntry({
      action: updated.status !== old.status ? "STATUS_CHANGE" : "UPDATE",
      entity: "dispatch",
      entityId: id,
      receiptNumber: updated.receiptNumber,
      oldValue: JSON.stringify(old),
      newValue: JSON.stringify(updated),
    });
    setEditing(false);
    toast.success("Dispatch updated");
  };

  const onSoftDelete = () => {
    const updated: Dispatch = { ...found, deletedAt: new Date().toISOString() };
    setAllDispatches(allDispatches.map((d) => (d.id === id ? updated : d)));
    addAuditEntry({
      action: "DELETE",
      entity: "dispatch",
      entityId: id,
      receiptNumber: found.receiptNumber,
      oldValue: JSON.stringify(found),
    });
    toast.success("Dispatch moved to Trash");
    navigate({ to: "/consignments" });
  };

  const onPrint = () => printMemo(found, company).catch(() => toast.error("Could not open print view"));
  const onDownloadPDF = () => downloadMemoPDF(found, company).catch(() => toast.error("Could not generate PDF"));
  const onDownloadImage = () => downloadMemoPNG(found, company).catch(() => toast.error("Could not generate image"));

  const onWhatsApp = () => {
    const msg = encodeURIComponent(
      `📦 *Dispatch Details — Sahil Road Lines*\n\n` +
        `Receipt: ${found.receiptNumber}\n` +
        `Date: ${found.date}\n` +
        `Truck: ${found.truckNumber}\n` +
        `Driver: ${found.driverName}\n` +
        `Route: ${found.from} → ${found.to}\n` +
        `Consignor: ${found.consignor}\n` +
        `Consignee: ${found.consignee}\n` +
        `Material: ${found.article} (${found.weight} T)\n` +
        `Total Freight: ${formatINR(found.netFreight)}\n` +
        `Advance: ${formatINR(found.advance)}\n` +
        `Balance: ${formatINR(found.balance)}\n` +
        `Status: ${found.status}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const onEmail = () => {
    const subject = encodeURIComponent(
      `Dispatch ${found.receiptNumber} — Sahil Road Lines`
    );
    const body = encodeURIComponent(
      `Dispatch Details — Sahil Road Lines\n\n` +
        `Receipt Number: ${found.receiptNumber}\n` +
        `Dispatch Date: ${found.date}\n` +
        `Truck Number: ${found.truckNumber}\n` +
        `Driver: ${found.driverName}\n` +
        `Route: ${found.from} to ${found.to}\n` +
        `Consignor: ${found.consignor}\n` +
        `Consignee: ${found.consignee}\n` +
        `Material: ${found.article}\n` +
        `Weight: ${found.weight} Tons\n` +
        `Total Freight: ${formatINR(found.netFreight)}\n` +
        `Advance Paid: ${formatINR(found.advance)}\n` +
        `Balance Due: ${formatINR(found.balance)}\n` +
        `Status: ${found.status}\n\n` +
        `-- Sahil Road Lines`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  const s: Status = found.status;
  const advancePaid = found.advance > 0;
  const delivered = requiresDelivery(s);
  const paidBalance = s === "Completed" || (delivered && found.balance <= 0);
  const completed = s === "Completed";

  if (editing) {
    return (
      <AppShell
        title={`Edit — ${found.receiptNumber}`}
        breadcrumb={["Home", "Consignments", found.receiptNumber, "Edit"]}
      >
        <DispatchForm
          mode="edit"
          initialData={found}
          dispatches={allDispatches.filter((d) => !d.deletedAt)}
          trucks={trucks}
          drivers={drivers}
          settings={settings}
          onSave={onSaveEdit}
          onCancel={() => setEditing(false)}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Dispatch ${found.receiptNumber}`}
      breadcrumb={["Home", "Consignments", found.receiptNumber]}
    >
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          <Button variant="outline" onClick={() => navigate({ to: "/consignments" })}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />Back
          </Button>
          <Button onClick={() => setEditing(true)}>
            <Edit className="mr-1.5 h-4 w-4" />Edit
          </Button>
          <Button variant="outline" onClick={onPrint}>
            <Printer className="mr-1.5 h-4 w-4" />Print
          </Button>
          <Button variant="outline" onClick={onDownloadPDF}>
            <Download className="mr-1.5 h-4 w-4" />PDF
          </Button>
          <Button variant="outline" onClick={onDownloadImage}>
            <ImageDown className="mr-1.5 h-4 w-4" />PNG
          </Button>
          <Button variant="outline" onClick={onWhatsApp} className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700">
            <MessageCircle className="mr-1.5 h-4 w-4" />WhatsApp
          </Button>
          <Button variant="outline" onClick={onEmail} className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700">
            <Mail className="mr-1.5 h-4 w-4" />Email
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <StatusBadge status={found.status} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dispatch {found.receiptNumber} will be moved to Trash. You can restore it later from Trash.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onSoftDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Move to Trash
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Memo preview */}
        <div className="print-area bg-white text-black">
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
              <span className="w-32 font-bold text-[#c0272d] text-base font-mono">{found.receiptNumber}</span>
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
                  <div className="text-xl font-bold text-gray-800 text-center tracking-widest">{found.truckNumber}</div>
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

        {/* Detail Sections */}
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

            {/* Internal Admin Section */}
            <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
              <CardHeader className="border-b pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-amber-600">
                  <ShieldAlert className="h-4 w-4" />
                  Internal Financial Details
                  <span className="ml-auto text-[10px] font-normal text-muted-foreground normal-case tracking-normal">
                    Admin only — not printed on memo
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-x-8 gap-y-0 p-5 md:grid-cols-3">
                <div className="flex flex-col gap-0.5 border-b py-2.5 last:border-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Balance</span>
                  <span className="text-sm font-medium">{formatINR(balance)}</span>
                </div>
                <div className="flex flex-col gap-0.5 border-b py-2.5 last:border-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bargain Amount</span>
                  <span className="text-sm font-medium">{formatINR(found.bargainAmount ?? 0)}</span>
                </div>
                <div className="flex flex-col gap-0.5 border-b py-2.5 last:border-0">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Final Payable to Driver</span>
                  <span className="text-base font-bold text-amber-700 dark:text-amber-400">{formatINR(finalPayable)}</span>
                </div>
              </CardContent>
            </Card>

            <SectionCard title="Remarks">
              <div className="md:col-span-2"><Row label="Remarks" value={found.remarks} /></div>
            </SectionCard>

            <SectionCard title="Dates &amp; Status">
              <Row label="Status" value={<StatusBadge status={found.status} />} />
              {found.status !== "Shipped" && (() => {
                const dateLabel =
                  found.status === "Created" ? "Created Date" :
                  found.status === "Dispatched" ? "Dispatch Date" :
                  found.status === "Delivered" ? "Delivered Date" :
                  found.status === "Payment Pending" ? "Payment Pending Date" :
                  "Completed Date";
                const dateValue =
                  found.status === "Created" ? (found.createdAt?.slice(0, 10) ?? found.date) :
                  found.status === "Dispatched" ? found.date :
                  found.deliveryDate || "—";
                return <Row label={dateLabel} value={dateValue} />;
              })()}
            </SectionCard>
          </div>

          <div className="lg:col-span-1 space-y-5">
            {/* Status Timeline */}
            <Card className="border-0 shadow-sm lg:sticky lg:top-20">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
                  Status Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <StatusTimeline dispatch={found} />
              </CardContent>
            </Card>

            {/* Status History Table */}
            {(found.statusHistory ?? []).length > 1 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="border-b pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
                    History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Changed At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(found.statusHistory ?? []).map((h, i) => (
                        <tr key={i} className="hover:bg-muted/40">
                          <td className="px-3 py-2 font-medium">
                            <StatusBadge status={h.status} />
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {new Date(h.changedAt).toLocaleString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
