export type Status =
  | "Created"
  | "Dispatched"
  | "Shipped"
  | "Delivered"
  | "Payment Pending"
  | "Completed";

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
  date: string; // Dispatch Date
  documentationDate?: string;
  invoiceDate?: string;
  from: string;
  to: string;
  gcNumber: string; // legacy, kept for backwards compatibility
  article: string; // Material
  truckNumber: string;
  driverName: string;
  lorryOwnerName: string;
  consignor: string;
  consignee: string;
  description: string;
  weight: number;
  ratePerTon: number;
  netFreight: number; // Total Freight = weight × ratePerTon
  advance: number;
  balance: number; // netFreight - advance
  paidAt: string;
  commission: number;
  loadingCharges: number;
  totalExpenses: number; // commission + loadingCharges
  // Internal financial fields — NEVER shown on PDF/Print/PNG
  bargainAmount?: number; // Amount negotiated down with driver
  finalPayable?: number; // balance - bargainAmount
  remarks: string;
  status: Status;
  statusHistory?: StatusEvent[]; // complete status change audit trail
  deliveryDate?: string;
  locked?: boolean;
  deletedAt?: string; // soft delete timestamp; undefined = active
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
