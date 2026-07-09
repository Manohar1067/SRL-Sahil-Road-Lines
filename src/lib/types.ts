export type Status = "Shipped" | "Dispatched" | "Delivered" | "Payment Pending" | "Completed";

export interface Dispatch {
  id: string;
  receiptNumber: string; // Dispatch Memo Number, e.g. SRL-0001
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
  netFreight: number; // Total Freight
  advance: number;
  balance: number;
  paidAt: string;
  commission: number;
  loadingCharges: number;
  totalExpenses: number;
  remarks: string;
  status: Status;
  deliveryDate?: string;
  locked?: boolean;
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
