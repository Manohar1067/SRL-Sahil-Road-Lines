import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { nextReceiptNumber, uid } from "@/lib/store";
import type { AppSettings } from "@/lib/store";
import type { Dispatch, Driver, Status, Truck } from "@/lib/types";
import { formatINR, STATUS_OPTIONS } from "@/components/StatusBadge";
import { ShieldAlert } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY: Dispatch = {
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
  bargainAmount: 0,
  finalPayable: 0,
  remarks: "",
  status: "Created",
  deliveryDate: "",
  locked: false,
  createdAt: "",
};

export interface DispatchFormProps {
  mode: "create" | "edit";
  initialData?: Dispatch;
  dispatches: Dispatch[];
  trucks: Truck[];
  drivers: Driver[];
  settings: AppSettings;
  onSave: (d: Dispatch) => void;
  onCancel: () => void;
}

const DELIVERY_STATUSES: Status[] = ["Delivered", "Payment Pending", "Completed"];
const requiresDelivery = (s: Status) => DELIVERY_STATUSES.includes(s);

export function DispatchForm({
  mode,
  initialData,
  dispatches,
  trucks,
  drivers,
  onSave,
  onCancel,
}: DispatchFormProps) {
  const [form, setForm] = useState<Dispatch>(() => {
    if (mode === "edit" && initialData) return { ...initialData };
    return { ...EMPTY, receiptNumber: nextReceiptNumber(dispatches) };
  });

  // Update receipt number when dispatches change (only in create mode)
  useEffect(() => {
    if (mode === "create") {
      setForm((f) => ({ ...f, receiptNumber: nextReceiptNumber(dispatches) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatches.length, mode]);

  const update = <K extends keyof Dispatch>(k: K, v: Dispatch[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const total = useMemo(
    () => Number(form.weight || 0) * Number(form.ratePerTon || 0),
    [form.weight, form.ratePerTon]
  );
  const balance = useMemo(() => total - Number(form.advance || 0), [total, form.advance]);
  const totalExpenses = useMemo(
    () => Number(form.commission || 0) + Number(form.loadingCharges || 0),
    [form.commission, form.loadingCharges]
  );
  const finalPayable = useMemo(
    () => balance - Number(form.bargainAmount || 0),
    [balance, form.bargainAmount]
  );

  const handleSave = () => {
    const required: [string, any][] = [
      ["Consignor", form.consignor],
      ["Consignee", form.consignee],
      ["Truck Number", form.truckNumber],
      ["Driver", form.driverName],
      ["Weight", form.weight],
      ["Rate Per Ton", form.ratePerTon],
      ["Dispatch Date", form.date],
      ["Material", form.article],
    ];
    const missing = required.filter(([, v]) => !v || (typeof v === "number" && v <= 0));
    if (missing.length) {
      toast.error(`Please fill: ${missing.map(([k]) => k).join(", ")}`);
      return;
    }
    if (requiresDelivery(form.status) && !form.deliveryDate) {
      toast.error("Delivery Date is required when status is Delivered, Payment Pending or Completed");
      return;
    }
    const now = new Date().toISOString();

    // Build status history
    let statusHistory = form.statusHistory ?? [];
    if (mode === "create") {
      statusHistory = [{ status: "Created", changedAt: now, changedBy: "Admin" }];
    } else if (initialData && form.status !== initialData.status) {
      statusHistory = [
        ...(initialData.statusHistory ?? [{ status: initialData.status, changedAt: initialData.createdAt, changedBy: "Admin" }]),
        { status: form.status, changedAt: now, changedBy: "Admin" },
      ];
    }

    const dispatch: Dispatch = {
      ...form,
      id: mode === "create" ? uid() : form.id,
      netFreight: total,
      balance,
      totalExpenses,
      bargainAmount: Number(form.bargainAmount || 0),
      finalPayable,
      statusHistory,
      locked: true,
      createdAt: mode === "create" ? now : form.createdAt,
    };
    onSave(dispatch);
  };

  const truckOptions = trucks.map((t) => ({ value: t.truckNumber, label: t.truckNumber }));
  const driverOptions = drivers.map((d) => ({ value: d.name, label: d.name }));

  const isEdit = mode === "edit";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* DISPATCH INFO */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Dispatch Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Memo # (auto)</Label>
            <Input value={form.receiptNumber} readOnly className="bg-muted font-mono font-bold" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">
              Dispatch Date <span className="text-destructive">*</span>
            </Label>
            <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Documentation Date</Label>
            <Input
              type="date"
              value={form.documentationDate || ""}
              onChange={(e) => update("documentationDate", e.target.value)}
              readOnly={isEdit}
              className={isEdit ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Invoice Date</Label>
            <Input
              type="date"
              value={form.invoiceDate || ""}
              onChange={(e) => update("invoiceDate", e.target.value)}
              readOnly={isEdit}
              className={isEdit ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">G.C. Number</Label>
            <Input
              value={form.gcNumber}
              onChange={(e) => update("gcNumber", e.target.value)}
              placeholder="GC number"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">From</Label>
            <Input value={form.from} onChange={(e) => update("from", e.target.value)} placeholder="Origin" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">To</Label>
            <Input value={form.to} onChange={(e) => update("to", e.target.value)} placeholder="Destination" />
          </div>
        </CardContent>
      </Card>

      {/* VEHICLE INFO */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">
              Truck Number {!isEdit && <span className="text-destructive">*</span>}
            </Label>
            {isEdit ? (
              <Input value={form.truckNumber} readOnly className="bg-muted" />
            ) : (
              <Select
                value={form.truckNumber}
                onValueChange={(v) => {
                  const t = trucks.find((x) => x.truckNumber === v);
                  update("truckNumber", v);
                  if (t) {
                    update("driverName", t.driver);
                    update("lorryOwnerName", t.ownerName);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select truck" />
                </SelectTrigger>
                <SelectContent>
                  {truckOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">
              Driver Name {!isEdit && <span className="text-destructive">*</span>}
            </Label>
            {isEdit ? (
              <Input value={form.driverName} onChange={(e) => update("driverName", e.target.value)} />
            ) : (
              <Select value={form.driverName} onValueChange={(v) => update("driverName", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select driver" />
                </SelectTrigger>
                <SelectContent>
                  {driverOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Lorry Owner Name</Label>
            <Input
              value={form.lorryOwnerName}
              onChange={(e) => update("lorryOwnerName", e.target.value)}
              placeholder="Owner name"
            />
          </div>
        </CardContent>
      </Card>

      {/* CUSTOMER INFO */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">
              Consignor M/S {!isEdit && <span className="text-destructive">*</span>}
            </Label>
            <Input
              value={form.consignor}
              onChange={(e) => update("consignor", e.target.value)}
              placeholder="Enter consignor name"
              readOnly={isEdit}
              className={isEdit ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">
              Consignee M/S {!isEdit && <span className="text-destructive">*</span>}
            </Label>
            <Input
              value={form.consignee}
              onChange={(e) => update("consignee", e.target.value)}
              placeholder="Enter consignee name"
              readOnly={isEdit}
              className={isEdit ? "bg-muted" : ""}
            />
          </div>
        </CardContent>
      </Card>

      {/* GOODS INFO */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Goods Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">
              Material / Article <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.article}
              onChange={(e) => update("article", e.target.value)}
              placeholder="Material name"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">
              Weight (Tons) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              value={form.weight || ""}
              onChange={(e) => update("weight", Number(e.target.value))}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">
              Rate Per Ton (Rs.) <span className="text-destructive">*</span>
            </Label>
            <Input
              type="number"
              min={0}
              value={form.ratePerTon || ""}
              onChange={(e) => update("ratePerTon", Number(e.target.value))}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-xs uppercase text-muted-foreground">Description</Label>
            <Input
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Description of goods"
            />
          </div>
        </CardContent>
      </Card>

      {/* PAYMENT INFO */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Net Freight (auto)</Label>
            <div className="flex h-10 items-center rounded-md border bg-muted px-3 font-semibold text-primary">
              {formatINR(total)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Advance</Label>
            <Input
              type="number"
              min={0}
              value={form.advance || ""}
              onChange={(e) => update("advance", Number(e.target.value))}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Balance (auto)</Label>
            <div className="flex h-10 items-center rounded-md border bg-muted px-3 font-semibold text-primary">
              {formatINR(balance)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Paid At</Label>
            <Input
              value={form.paidAt}
              onChange={(e) => update("paidAt", e.target.value)}
              placeholder="Location"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Commission</Label>
            <Input
              type="number"
              min={0}
              value={form.commission || ""}
              onChange={(e) => update("commission", Number(e.target.value))}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Loading Charges</Label>
            <Input
              type="number"
              min={0}
              value={form.loadingCharges || ""}
              onChange={(e) => update("loadingCharges", Number(e.target.value))}
              placeholder="0"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Total Expenses (auto)</Label>
            <div className="flex h-10 items-center rounded-md border bg-muted px-3 font-semibold text-primary">
              {formatINR(totalExpenses)}
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-xs uppercase text-muted-foreground">Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) => update("remarks", e.target.value)}
              rows={3}
              placeholder="Optional remarks"
            />
          </div>
        </CardContent>
      </Card>

      {/* STATUS — edit only */}
      {isEdit && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
              Delivery Status
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((st) => (
                    <SelectItem key={st} value={st}>
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">
                Delivery Date{" "}
                {requiresDelivery(form.status) && <span className="text-destructive">*</span>}
              </Label>
              <Input
                type="date"
                value={form.deliveryDate || ""}
                onChange={(e) => update("deliveryDate", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* INTERNAL FIELDS — Admin Only */}
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
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Balance (auto)</Label>
            <div className="flex h-10 items-center rounded-md border bg-muted px-3 font-semibold text-primary">
              {formatINR(balance)}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Bargain Amount</Label>
            <Input
              type="number"
              min={0}
              value={form.bargainAmount || ""}
              onChange={(e) => update("bargainAmount", Number(e.target.value))}
              placeholder="0"
            />
            <p className="text-[11px] text-muted-foreground">
              Amount negotiated down with driver after delivery
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase text-muted-foreground">Final Payable (auto)</Label>
            <div className="flex h-10 items-center rounded-md border bg-amber-50 px-3 font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
              {formatINR(finalPayable)}
            </div>
            <p className="text-[11px] text-muted-foreground">Balance − Bargain Amount</p>
          </div>
        </CardContent>
      </Card>

      {/* ACTION BUTTONS */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} className="bg-[#c0272d] hover:bg-[#a01f23] text-white px-8">
          {isEdit ? "Save Changes" : "Save Dispatch"}
        </Button>
      </div>
    </div>
  );
}
