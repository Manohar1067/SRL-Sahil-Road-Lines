import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { DispatchForm } from "@/components/DispatchForm";
import {
  useDispatches,
  useDrivers,
  useTrucks,
  useSettings,
  useConsignors,
  useConsignees,
  addAuditEntry,
} from "@/lib/store";
import type { Dispatch } from "@/lib/types";
import { notifyDispatchCreated } from "@/lib/notifications";

export const Route = createFileRoute("/dispatch/new")({
  head: () => ({ meta: [{ title: "New Dispatch — Sahil Road Lines" }] }),
  component: NewDispatch,
});

function NewDispatch() {
  const [dispatches, setDispatches] = useDispatches();
  const [trucks] = useTrucks();
  const [drivers] = useDrivers();
  const [settings] = useSettings();
  const [consignors] = useConsignors();
  const [consignees] = useConsignees();
  const navigate = useNavigate();

  const handleSave = (dispatch: Dispatch) => {
    setDispatches([dispatch, ...dispatches]);
    addAuditEntry({
      action: "CREATE",
      entity: "dispatch",
      entityId: dispatch.id,
      receiptNumber: dispatch.receiptNumber,
      newValue: JSON.stringify(dispatch),
    });
    notifyDispatchCreated(dispatch);
    toast.success(`Dispatch ${dispatch.receiptNumber} saved`);
    navigate({ to: "/consignments" });
  };

  return (
    <AppShell title="New Dispatch" breadcrumb={["Home", "Dispatches", "New"]}>
      <DispatchForm
        mode="create"
        dispatches={dispatches}
        trucks={trucks}
        drivers={drivers}
        consignors={consignors}
        consignees={consignees}
        settings={settings}
        onSave={handleSave}
        onCancel={() => navigate({ to: "/consignments" })}
      />
    </AppShell>
  );
}
