import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { nextReceiptNumber, uid } from "@/lib/store";
import type { AppSettings } from "@/lib/store";
import type { Dispatch, Driver, Status, Truck } from "@/lib/types";
import { formatINR, STATUS_OPTIONS } from "@/components/StatusBadge";
import { ShieldAlert, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- helpers ----------
const todayDMY = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

/** Validate & normalise a DD/MM/YYYY string; return as-is or empty */
function validateDMY(v: string): string {
  return v.trim();
}

// ---------- Searchable combobox ----------
interface ComboboxProps {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  allowCustom?: boolean;
  className?: string;
  id?: string;
}

function Combobox({ value, onChange, options, placeholder, allowCustom, className, id }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  // Keep query in sync with external value changes
  useEffect(() => { setQuery(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  const select = (v: string) => {
    onChange(v);
    setQuery(v);
    setOpen(false);
  };

  const handleBlur = () => {
    if (allowCustom && query && !options.includes(query)) {
      onChange(query);
    }
    setTimeout(() => setOpen(false), 150);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="relative">
        <Input
          id={id}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(""); }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="pr-8"
        />
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {filtered.length === 0 && allowCustom && query ? (
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={() => select(query)}
            >
              Use "{query}"
            </button>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No options</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o}
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={() => select(o)}
              >
                {value === o && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                <span className={cn(value === o && "font-medium")}>{o}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---------- EMPTY template ----------
const EMPTY: Dispatch = {
  id: "",
  receiptNumber: "",
  date: "",
  documentationDate: "",
  invoiceDate: "",
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
  tds: 0,
  goodsMamuli: 0,
  localDriverGuide: 0,
  detentionCharges: 0,
  totalExpenses: 0,
  bargainAmount: 0,
  finalPayable: 0,
  finalPaymentDate: "",
  remarks: "",
  status: "Dispatched",
  deliveryDate: "",
  unloadingDate: "",
  locked: false,
  createdAt: "",
};

export interface DispatchFormProps {
  mode: "create" | "edit";
  initialData?: Dispatch;
  dispatches: Dispatch[];
  trucks: Truck[];
  drivers: Driver[];
  consignors?: { id: string; companyName: string }[];
  consignees?: { id: string; companyName: string }[];
  settings: AppSettings;
  onSave: (d: Dispatch) => void;
  onCancel: () => void;
}

const PAID_BY_OPTIONS = ["Sahil", "Kamesh"];

// Which fields the user has manually overridden (won't be auto-recalculated)
type ManualFields = Set<"netFreight" | "totalExpenses" | "finalPayable">;

export function DispatchForm({
  mode,
  initialData,
  dispatches,
  trucks,
  drivers,
  consignors,
  consignees,
  onSave,
  onCancel,
}: DispatchFormProps) {
  const [form, setForm] = useState<Dispatch>(() => {
    if (mode === "edit" && initialData) return { ...initialData };
    return { ...EMPTY, date: todayDMY(), documentationDate: todayDMY(), receiptNumber: nextReceiptNumber(dispatches) };
  });

  // Track which calculated fields user has manually touched
  const [manual, setManual] = useState<ManualFields>(new Set());

  useEffect(() => {
    if (mode === "create") {
      setForm((f) => ({ ...f, receiptNumber: nextReceiptNumber(dispatches) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatches.length, mode]);

  const update = <K extends keyof Dispatch>(k: K, v: Dispatch[K]) => {
    setForm((f) => {
      const next = { ...f, [k]: v };

      // Auto-calc netFreight unless manually overridden
      if ((k === "weight" || k === "ratePerTon") && !manual.has("netFreight")) {
        next.netFreight = Number(next.weight || 0) * Number(next.ratePerTon || 0);
      }

      // Auto-calc balance (always derived)
      next.balance = Number(next.netFreight || 0) - Number(next.advance || 0);

      // Auto-calc totalExpenses unless manually overridden
      if (
        ["commission", "loadingCharges", "tds", "goodsMamuli", "localDriverGuide", "detentionCharges"].includes(k as string)
        && !manual.has("totalExpenses")
      ) {
        next.totalExpenses =
          Number(next.commission || 0) + Number(next.loadingCharges || 0)
          + Number(next.tds || 0) + Number(next.goodsMamuli || 0)
          + Number(next.localDriverGuide || 0) + Number(next.detentionCharges || 0);
      }

      // Auto-calc finalPayable unless manually overridden
      if (
        (k === "netFreight" || k === "advance" || k === "totalExpenses" || k === "weight" || k === "ratePerTon"
          || ["commission", "loadingCharges", "tds", "goodsMamuli", "localDriverGuide", "detentionCharges"].includes(k as string))
        && !manual.has("finalPayable")
      ) {
        next.finalPayable = Number(next.balance || 0) - Number(next.totalExpenses || 0);
      }

      return next;
    });
  };

  const updateManual = <K extends keyof Dispatch>(k: K, v: Dispatch[K]) => {
    if (k === "netFreight") setManual((m) => new Set([...m, "netFreight"]));
    if (k === "totalExpenses") setManual((m) => new Set([...m, "totalExpenses"]));
    if (k === "finalPayable") setManual((m) => new Set([...m, "finalPayable"]));
    setForm((f) => {
      const next = { ...f, [k]: v };
      // Re-derive balance and finalPayable from manual netFreight
      if (k === "netFreight") {
        next.balance = Number(v) - Number(next.advance || 0);
        if (!manual.has("finalPayable")) {
          next.finalPayable = next.balance - Number(next.totalExpenses || 0);
        }
      }
      if (k === "totalExpenses" && !manual.has("finalPayable")) {
        next.finalPayable = Number(next.balance || 0) - Number(v);
      }
      return next;
    });
  };

  const handleSave = () => {
    const required: [string, any][] = [
      ["Consignor", form.consignor],
      ["Consignee", form.consignee],
      ["Truck Number", form.truckNumber],
      ["Driver", form.driverName],
      ["Weight", form.weight],
      ["Rate Per Ton", form.ratePerTon],
      ["Dispatch Date", form.date],
    ];
    const missing = required.filter(([, v]) => !v || (typeof v === "number" && v <= 0));
    if (missing.length) {
      toast.error(`Please fill: ${missing.map(([k]) => k).join(", ")}`);
      return;
    }

    const now = new Date().toISOString();
    let statusHistory = form.statusHistory ?? [];
    if (mode === "create") {
      statusHistory = [{ status: form.status, changedAt: now, changedBy: "Admin" }];
    } else if (initialData && form.status !== initialData.status) {
      statusHistory = [
        ...(initialData.statusHistory ?? [{ status: initialData.status, changedAt: initialData.createdAt, changedBy: "Admin" }]),
        { status: form.status, changedAt: now, changedBy: "Admin" },
      ];
    }

    const dispatch: Dispatch = {
      ...form,
      id: mode === "create" ? uid() : form.id,
      balance: Number(form.netFreight || 0) - Number(form.advance || 0),
      statusHistory,
      locked: true,
      createdAt: mode === "create" ? now : form.createdAt,
    };
    onSave(dispatch);
  };

  const truckOptions = trucks.map((t) => t.truckNumber);
  const driverOptions = drivers.map((d) => d.name);
  const consignorOptions = (consignors ?? []).map((c) => c.companyName);
  const consigneeOptions = (consignees ?? []).map((c) => c.companyName);

  const F = ({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase text-muted-foreground">
        {label} {req && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5">

      {/* ── Card 1: Dispatch Information ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Dispatch Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <F label="Memo # (auto)">
            <Input value={form.receiptNumber} readOnly className="bg-muted font-mono font-bold" />
          </F>
          <F label="Dispatch Date" req>
            <Input
              value={form.date}
              onChange={(e) => update("date", e.target.value)}
              placeholder="DD/MM/YYYY"
              maxLength={10}
            />
          </F>
          <F label="From">
            <Input value={form.from} onChange={(e) => update("from", e.target.value)} placeholder="Origin" />
          </F>
          <F label="To">
            <Input value={form.to} onChange={(e) => update("to", e.target.value)} placeholder="Destination" />
          </F>
        </CardContent>
      </Card>

      {/* ── Card 2: Vehicle Information ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Vehicle Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <F label="Truck Number" req>
            <Combobox
              value={form.truckNumber}
              onChange={(v) => {
                const t = trucks.find((x) => x.truckNumber === v);
                update("truckNumber", v);
                if (t) {
                  setForm((f) => ({ ...f, truckNumber: v, driverName: t.driver, lorryOwnerName: t.ownerName }));
                }
              }}
              options={truckOptions}
              placeholder="Select or type truck"
            />
          </F>
          <F label="Driver Name" req>
            <Combobox
              value={form.driverName}
              onChange={(v) => update("driverName", v)}
              options={driverOptions}
              placeholder="Select or type driver"
            />
          </F>
          <F label="Lorry Owner Name">
            <Input value={form.lorryOwnerName} onChange={(e) => update("lorryOwnerName", e.target.value)} placeholder="Owner name" />
          </F>
        </CardContent>
      </Card>

      {/* ── Card 3: Customer Information ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <F label="Consignor M/S" req>
            <Combobox
              value={form.consignor}
              onChange={(v) => update("consignor", v)}
              options={consignorOptions}
              placeholder="Enter or select consignor"
              allowCustom
            />
          </F>
          <F label="Consignee M/S" req>
            <Combobox
              value={form.consignee}
              onChange={(v) => update("consignee", v)}
              options={consigneeOptions}
              placeholder="Enter or select consignee"
              allowCustom
            />
          </F>
        </CardContent>
      </Card>

      {/* ── Card 4: Goods Information ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Goods Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <F label="Material / Article">
            <Input value={form.article} onChange={(e) => update("article", e.target.value)} placeholder="Material name" />
          </F>
          <F label="Weight (Tons)" req>
            <Input
              type="number"
              min={0}
              value={form.weight || ""}
              onChange={(e) => update("weight", Number(e.target.value))}
              placeholder="0"
            />
          </F>
          <F label="Rate Per Ton (Rs.)" req>
            <Input
              type="number"
              min={0}
              value={form.ratePerTon || ""}
              onChange={(e) => update("ratePerTon", Number(e.target.value))}
              placeholder="0"
            />
          </F>
          <F label="Documentation Date">
            <Input
              value={form.documentationDate || ""}
              onChange={(e) => update("documentationDate", e.target.value)}
              placeholder="DD/MM/YYYY"
              maxLength={10}
            />
          </F>
          <F label="Delivery Date">
            <Input
              value={form.deliveryDate || ""}
              onChange={(e) => update("deliveryDate", e.target.value)}
              placeholder="DD/MM/YYYY"
              maxLength={10}
            />
          </F>
          <F label="Unloading Date">
            <Input
              value={form.unloadingDate || ""}
              onChange={(e) => update("unloadingDate", e.target.value)}
              placeholder="DD/MM/YYYY"
              maxLength={10}
            />
          </F>
          <F label="Description">
            <Input value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Description of goods" />
          </F>
        </CardContent>
      </Card>

      {/* ── Card 5: Payment Information ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Payment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          {/* Total Freight — editable, auto from Weight × Rate */}
          <F label="Total Freight (auto)">
            <Input
              type="number"
              min={0}
              value={form.netFreight || ""}
              onChange={(e) => updateManual("netFreight", Number(e.target.value))}
              placeholder="0"
              className={manual.has("netFreight") ? "border-amber-400" : ""}
            />
            {manual.has("netFreight") && (
              <p className="text-[10px] text-amber-600 cursor-pointer" onClick={() => {
                setManual((m) => { const n = new Set(m); n.delete("netFreight"); return n; });
                update("weight", form.weight); // retrigger auto-calc
              }}>Manual override — click to reset auto</p>
            )}
          </F>
          <F label="Advance">
            <Input
              type="number"
              min={0}
              value={form.advance || ""}
              onChange={(e) => update("advance", Number(e.target.value))}
              placeholder="0"
            />
          </F>
          <F label="Balance (auto)">
            <div className="flex h-10 items-center rounded-md border bg-muted px-3 font-semibold text-primary">
              {formatINR(Number(form.netFreight || 0) - Number(form.advance || 0))}
            </div>
          </F>
          <F label="Commission">
            <Input type="number" min={0} value={form.commission || ""} onChange={(e) => update("commission", Number(e.target.value))} placeholder="0" />
          </F>
          <F label="Loading Charges">
            <Input type="number" min={0} value={form.loadingCharges || ""} onChange={(e) => update("loadingCharges", Number(e.target.value))} placeholder="0" />
          </F>
          <F label="TDS">
            <Input type="number" min={0} value={form.tds || ""} onChange={(e) => update("tds", Number(e.target.value))} placeholder="0" />
          </F>
          <F label="Goods Mamuli">
            <Input type="number" min={0} value={form.goodsMamuli || ""} onChange={(e) => update("goodsMamuli", Number(e.target.value))} placeholder="0" />
          </F>
          <F label="Local Driver Guide">
            <Input type="number" min={0} value={form.localDriverGuide || ""} onChange={(e) => update("localDriverGuide", Number(e.target.value))} placeholder="0" />
          </F>
          <F label="Detention Charges">
            <Input type="number" min={0} value={form.detentionCharges || ""} onChange={(e) => update("detentionCharges", Number(e.target.value))} placeholder="0" />
          </F>
          {/* Total Expenses — editable, auto-sum of 6 components */}
          <F label="Total Expenses (auto)">
            <Input
              type="number"
              min={0}
              value={form.totalExpenses || ""}
              onChange={(e) => updateManual("totalExpenses", Number(e.target.value))}
              placeholder="0"
              className={manual.has("totalExpenses") ? "border-amber-400" : ""}
            />
            {manual.has("totalExpenses") && (
              <p className="text-[10px] text-amber-600 cursor-pointer" onClick={() => {
                setManual((m) => { const n = new Set(m); n.delete("totalExpenses"); return n; });
                update("commission", form.commission); // retrigger
              }}>Manual override — click to reset auto</p>
            )}
          </F>
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-xs uppercase text-muted-foreground">Remarks</Label>
            <Textarea value={form.remarks} onChange={(e) => update("remarks", e.target.value)} rows={3} placeholder="Optional remarks" />
          </div>
          {/* Paid By — searchable combobox — LAST field in Payment Information */}
          <F label="Paid By">
            <Combobox
              value={form.paidAt}
              onChange={(v) => update("paidAt", v)}
              options={PAID_BY_OPTIONS}
              placeholder="Sahil / Kamesh / custom"
              allowCustom
            />
          </F>
        </CardContent>
      </Card>

      {/* ── Card 6: Status ── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-primary">
            Status
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <F label="Dispatch Status">
            <Combobox
              value={form.status}
              onChange={(v) => update("status", v as Status)}
              options={STATUS_OPTIONS as string[]}
              placeholder="Select status"
            />
          </F>
        </CardContent>
      </Card>

      {/* ── Card 7: Internal Financial Details ── */}
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
          {/* Final Payable — editable, auto = balance - totalExpenses */}
          <F label="Final Payable (auto)">
            <Input
              type="number"
              min={0}
              value={form.finalPayable ?? ""}
              onChange={(e) => updateManual("finalPayable", Number(e.target.value))}
              placeholder="0"
              className={cn("font-bold", manual.has("finalPayable") ? "border-amber-400" : "bg-amber-50 text-amber-800 dark:bg-amber-950/30")}
            />
            {manual.has("finalPayable") && (
              <p className="text-[10px] text-amber-600 cursor-pointer" onClick={() => {
                setManual((m) => { const n = new Set(m); n.delete("finalPayable"); return n; });
                update("advance", form.advance); // retrigger
              }}>Manual override — click to reset auto</p>
            )}
            <p className="text-[11px] text-muted-foreground">Balance − Total Expenses</p>
          </F>
          <F label="Final Payment Date">
            <Input
              value={form.finalPaymentDate || ""}
              onChange={(e) => update("finalPaymentDate", e.target.value)}
              placeholder="DD/MM/YYYY"
              maxLength={10}
            />
          </F>
        </CardContent>
      </Card>

      {/* ── Action Buttons ── */}
      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} className="bg-[#c0272d] hover:bg-[#a01f23] text-white px-8">
          {mode === "edit" ? "Save Changes" : "Save Dispatch"}
        </Button>
      </div>
    </div>
  );
}
