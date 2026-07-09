import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CrudTable } from "@/components/CrudTable";
import { useDrivers } from "@/lib/store";
import type { Driver } from "@/lib/types";

export const Route = createFileRoute("/drivers")({
  head: () => ({ meta: [{ title: "Drivers — Sahil Road Lines" }] }),
  component: DriversPage,
});

function DriversPage() {
  const [drivers, setDrivers] = useDrivers();
  return (
    <AppShell title="Driver Management" breadcrumb={["Home", "Drivers"]}>
      <CrudTable<Driver>
        title="Driver"
        addLabel="Add Driver"
        rows={drivers}
        setRows={setDrivers}
        empty={{ name: "", phone: "", licenseNumber: "", assignedTruck: "", status: "Active" }}
        columns={[
          { key: "name", label: "Driver Name" },
          { key: "phone", label: "Phone Number" },
          { key: "licenseNumber", label: "License Number" },
          { key: "assignedTruck", label: "Assigned Truck" },
          { key: "status", label: "Status" },
        ]}
      />
    </AppShell>
  );
}
