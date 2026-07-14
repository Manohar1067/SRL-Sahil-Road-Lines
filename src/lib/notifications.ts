import { useEffect, useState } from "react";
import type { Dispatch } from "./types";

const NOTIFICATIONS_KEY = "srl_notifications";
const MAX_NOTIFICATIONS = 500;

export type NotificationType =
  | "dispatch_created"
  | "dispatch_edited"
  | "dispatch_deleted"
  | "pending_payment"
  | "pending_delivery"
  | "lr_received"
  | "lr_submitted"
  | "backup_created"
  | "import_completed"
  | "export_completed"
  | "settings_changed";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  link: string;
  entityId?: string;
}

function readNotifications(): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function writeNotifications(items: AppNotification[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
  window.dispatchEvent(new CustomEvent("srl-store-change", { detail: { key: NOTIFICATIONS_KEY } }));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function addNotification(
  entry: Omit<AppNotification, "id" | "createdAt" | "read"> & { read?: boolean },
) {
  const notification: AppNotification = {
    ...entry,
    id: uid(),
    createdAt: new Date().toISOString(),
    read: entry.read ?? false,
  };
  const existing = readNotifications();
  writeNotifications([notification, ...existing]);
  return notification;
}

export function markNotificationRead(id: string) {
  const items = readNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
  writeNotifications(items);
}

export function markAllNotificationsRead() {
  const items = readNotifications().map((n) => ({ ...n, read: true }));
  writeNotifications(items);
}

export function getUnreadCount(): number {
  return readNotifications().filter((n) => !n.read).length;
}

/** Avoid duplicate summary alerts for the same type within 6 hours */
function hasRecentAlert(type: NotificationType, hours = 6): boolean {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return readNotifications().some(
    (n) => n.type === type && new Date(n.createdAt).getTime() > cutoff,
  );
}

export function syncDispatchAlerts(dispatches: Dispatch[]) {
  const pendingPayment = dispatches.filter((d) => d.balance > 0);
  if (pendingPayment.length > 0 && !hasRecentAlert("pending_payment")) {
    const total = pendingPayment.reduce((s, d) => s + d.balance, 0);
    addNotification({
      type: "pending_payment",
      title: "Pending Payments",
      description: `${pendingPayment.length} dispatch${pendingPayment.length > 1 ? "es" : ""} with outstanding balance of ₹${total.toLocaleString("en-IN")}`,
      link: "/consignments?filter=pending_payment",
    });
  }

  const pendingDelivery = dispatches.filter(
    (d) => d.status === "Dispatched" || d.status === "Shipped",
  );
  if (pendingDelivery.length > 0 && !hasRecentAlert("pending_delivery")) {
    addNotification({
      type: "pending_delivery",
      title: "Pending Deliveries",
      description: `${pendingDelivery.length} trip${pendingDelivery.length > 1 ? "s" : ""} awaiting delivery`,
      link: "/consignments?filter=pending_delivery",
    });
  }
}

export function notifyDispatchCreated(dispatch: Dispatch) {
  addNotification({
    type: "dispatch_created",
    title: "New Dispatch Created",
    description: `${dispatch.receiptNumber} — ${dispatch.from} to ${dispatch.to}`,
    link: `/consignments/${dispatch.id}`,
    entityId: dispatch.id,
  });
}

export function notifyDispatchEdited(dispatch: Dispatch) {
  addNotification({
    type: "dispatch_edited",
    title: "Dispatch Edited",
    description: `${dispatch.receiptNumber} was updated`,
    link: `/consignments/${dispatch.id}`,
    entityId: dispatch.id,
  });
}

export function notifyDispatchDeleted(dispatch: Dispatch) {
  addNotification({
    type: "dispatch_deleted",
    title: "Dispatch Deleted",
    description: `${dispatch.receiptNumber} moved to trash`,
    link: "/trash",
    entityId: dispatch.id,
  });
}

export function notifyStatusChange(dispatch: Dispatch, newStatus: string) {
  if (newStatus === "LR Received") {
    addNotification({
      type: "lr_received",
      title: "LR Received",
      description: `${dispatch.receiptNumber} — LR has been received`,
      link: `/consignments/${dispatch.id}`,
      entityId: dispatch.id,
    });
  } else if (newStatus === "LR Submitted") {
    addNotification({
      type: "lr_submitted",
      title: "LR Submitted",
      description: `${dispatch.receiptNumber} — LR has been submitted`,
      link: `/consignments/${dispatch.id}`,
      entityId: dispatch.id,
    });
  }
}

export function notifyBackupCreated() {
  addNotification({
    type: "backup_created",
    title: "Backup Created",
    description: "Application data backup was exported successfully",
    link: "/settings",
  });
}

export function notifyExportCompleted() {
  addNotification({
    type: "export_completed",
    title: "Export Completed",
    description: "Data exported to Excel successfully",
    link: "/settings",
  });
}

export function notifyImportCompleted(fileName?: string) {
  addNotification({
    type: "import_completed",
    title: "Import Completed",
    description: fileName ? `Data imported from ${fileName}` : "Data imported successfully",
    link: "/settings",
  });
}

export function notifySettingsChanged(detail: string) {
  addNotification({
    type: "settings_changed",
    title: "Settings Changed",
    description: detail,
    link: "/settings",
  });
}

export function useNotifications(): [AppNotification[], () => void] {
  const [items, setItems] = useState<AppNotification[]>([]);

  const refresh = () => setItems(readNotifications());

  useEffect(() => {
    refresh();
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail?.key || detail.key === NOTIFICATIONS_KEY) refresh();
    };
    window.addEventListener("srl-store-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("srl-store-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return [items, refresh];
}
