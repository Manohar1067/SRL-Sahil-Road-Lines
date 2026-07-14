import { formatINR } from "@/components/StatusBadge";

const FIELD_LABELS: Record<string, string> = {
  receiptNumber: "Memo Number",
  date: "Dispatch Date",
  documentationDate: "Documentation Date",
  invoiceDate: "Invoice Date",
  from: "From",
  to: "To",
  gcNumber: "GC Number",
  article: "Material",
  truckNumber: "Truck Number",
  driverName: "Driver Name",
  lorryOwnerName: "Lorry Owner",
  consignor: "Consignor",
  consignee: "Consignee",
  description: "Description",
  weight: "Weight (Tons)",
  ratePerTon: "Rate Per Ton",
  netFreight: "Total Freight",
  advance: "Advance",
  balance: "Balance",
  paidAt: "Paid By",
  commission: "Commission",
  loadingCharges: "Loading Charges",
  tds: "TDS",
  goodsMamuli: "Goods Mamuli",
  localDriverGuide: "Local Driver Guide",
  detentionCharges: "Detention Charges",
  totalExpenses: "Total Expenses",
  bargainAmount: "Bargain Amount",
  finalPayable: "Final Payable",
  finalPaymentDate: "Final Payment Date",
  remarks: "Remarks",
  status: "Status",
  deliveryDate: "Delivery Date",
  unloadingDate: "Unloading Date",
  locked: "Locked",
  name: "Company Name",
  address: "Address",
  phone: "Phone",
  gst: "GST Number",
  email: "Email",
  logo: "Logo",
  darkMode: "Dark Mode",
  autoLockMinutes: "Auto Lock (minutes)",
  adminPinHash: "Admin PIN",
  truckNumber_entity: "Truck Number",
  ownerName: "Owner Name",
  driver: "Driver",
  companyName: "Company Name",
  licenseNumber: "License Number",
  assignedTruck: "Assigned Truck",
};

const MONEY_FIELDS = new Set([
  "netFreight", "advance", "balance", "ratePerTon", "commission",
  "loadingCharges", "tds", "goodsMamuli", "localDriverGuide",
  "detentionCharges", "totalExpenses", "bargainAmount", "finalPayable",
]);

const SKIP_FIELDS = new Set([
  "id", "createdAt", "deletedAt", "statusHistory", "locked",
]);

export interface FieldChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
}

function formatValue(key: string, value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && MONEY_FIELDS.has(key)) return formatINR(value);
  if (typeof value === "number") return String(value);
  if (key === "logo") return value ? "(Logo set)" : "—";
  if (key === "adminPinHash") return "(PIN updated)";
  if (typeof value === "object") return "(Updated)";
  return String(value);
}

function flattenObject(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

export function buildFieldChanges(
  oldValue: string | undefined,
  newValue: string | undefined,
): FieldChange[] {
  if (!oldValue && !newValue) return [];

  try {
    const n = newValue ? JSON.parse(newValue) : null;
    const o = oldValue ? JSON.parse(oldValue) : null;

    if (!n && !o) return [];
    if (!n && o) return [{ field: "record", label: "Record", oldValue: "Existed", newValue: "Deleted" }];
    if (n && !o) return [{ field: "record", label: "Record", oldValue: "—", newValue: "Created" }];

    const flatOld = flattenObject(o || {});
    const flatNew = flattenObject(n || {});
    const allKeys = new Set([...Object.keys(flatOld), ...Object.keys(flatNew)]);
    const changes: FieldChange[] = [];

    allKeys.forEach((key) => {
      const baseKey = key.includes(".") ? key.split(".").pop()! : key;
      if (SKIP_FIELDS.has(baseKey) || SKIP_FIELDS.has(key)) return;

      const ov = flatOld[key];
      const nv = flatNew[key];
      if (JSON.stringify(ov) === JSON.stringify(nv)) return;

      changes.push({
        field: key,
        label: FIELD_LABELS[baseKey] || FIELD_LABELS[key] || baseKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        oldValue: formatValue(baseKey, ov),
        newValue: formatValue(baseKey, nv),
      });
    });

    return changes;
  } catch {
    return [];
  }
}

export function formatChangesSummary(changes: FieldChange[]): string {
  if (changes.length === 0) return "No changes";
  return changes.map((c) => `${c.label}: ${c.oldValue} → ${c.newValue}`).join(", ");
}
