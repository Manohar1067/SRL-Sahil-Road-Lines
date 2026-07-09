import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CrudTable } from "@/components/CrudTable";
import { useTrucks } from "@/lib/store";
import type { Truck } from "@/lib/types";

export const Route = createFileRoute("/trucks")({
  head: () => ({ meta: [{ title: "Trucks — Sahil Road Lines" }] }),
  component: TrucksPage,
});

function TrucksPage() {
  const [trucks, setTrucks] = useTrucks();
  return (
    <AppShell title="Truck Management" breadcrumb={["Home", "Trucks"]}>
      <CrudTable<Truck>
        title="Truck"
        addLabel="Add Truck"
        rows={trucks}
        setRows={setTrucks}
        empty={{ truckNumber: "", ownerName: "", driver: "", status: "Available" }}
        columns={[
          { key: "truckNumber", label: "Truck Number" },
          { key: "ownerName", label: "Owner Name" },
          { key: "driver", label: "Driver" },
          { key: "status", label: "Status" },
        ]}
      />
    </AppShell>
  );
}
