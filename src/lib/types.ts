export type Status =
  | "Created"
  | "Dispatched"
  | "Shipped"
  | "Delivered"
  | "Payment Pending"
  | "Completed"
  | "LR Received"
  | "LR Submitted";

export interface StatusEvent {
  status: Status;
  changedAt: string; // ISO timestamp
  changedBy: string; // "Admin" for now
  note?: string;
}

export interface AuditEntry {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "RESTORE";
  entity: "dispatch" | "truck" | "driver" | "consignor" | "consignee" | "settings";
  entityId: string;
  receiptNumber?: string;
  oldValue?: string; // JSON snapshot
  newValue?: string; // JSON snapshot
  changedBy: string;
  changedAt: string; // ISO timestamp
}

export interface Dispatch {
  id: string;
  receiptNumber: string; // Dispatch Memo Number, e.g. SRL-2026-000001
  date: string; // Dispatch Date — DD/MM/YYYY
  documentationDate?: string; // DD/MM/YYYY
  invoiceDate?: string;       // legacy, kept for compat
  from: string;
  to: string;
  gcNumber: string; // legacy, hidden from UI
  article: string; // Material
  truckNumber: string;
  driverName: string;
  lorryOwnerName: string;
  consignor: string;
  consignee: string;
  description: string;
  weight: number;
  ratePerTon: number;
  netFreight: number;      // Total Freight = weight × ratePerTon (editable)
  advance: number;
  balance: number;         // netFreight - advance
  paidAt: string;          // "Paid By" in UI (Sahil / Kamesh / custom)
  commission: number;
  loadingCharges: number;
  tds?: number;            // TDS
  goodsMamuli?: number;    // Goods Mamuli
  localDriverGuide?: number; // Local Driver Guide
  detentionCharges?: number; // Detention Charges
  totalExpenses: number;   // commission + loadingCharges + tds + goodsMamuli + localDriverGuide + detentionCharges (editable)
  bargainAmount?: number;  // legacy — kept for backward compat
  finalPayable?: number;   // balance − totalExpenses (editable)
  finalPaymentDate?: string; // DD/MM/YYYY
  remarks: string;
  status: Status;
  statusHistory?: StatusEvent[];
  deliveryDate?: string;   // DD/MM/YYYY
  unloadingDate?: string;  // DD/MM/YYYY
  locked?: boolean;
  deletedAt?: string;
  createdAt: string;
}

export interface Truck {
  id: string;
  truckNumber: string;
  ownerName: string;
  driver: string;
  status: "Available" | "On Trip" | "Maintenance";
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  assignedTruck: string;
  status: "Active" | "Inactive";
}

export interface Party {
  id: string;
  companyName: string;
  phone: string;
  gst: string;
  address: string;
}

