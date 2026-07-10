import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CrudTable } from "@/components/CrudTable";
import { useTrucks, useDrivers } from "@/lib/store";
import type { Truck, Driver } from "@/lib/types";
import { Truck as TruckIcon, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/trucks")({
  head: () => ({ meta: [{ title: "Fleet Management — Sahil Road Lines" }] }),
  component: FleetManagementPage,
});

const TABS = ["Trucks", "Drivers"] as const;
type Tab = typeof TABS[number];

function FleetManagementPage() {
  const [trucks, setTrucks] = useTrucks();
  const [drivers, setDrivers] = useDrivers();
  const [activeTab, setActiveTab] = useState<Tab>("Trucks");

  return (
    <AppShell title="Fleet Management" breadcrumb={["Home", "Fleet Management"]}>
      {/* Tab Bar */}
      <div className="mb-5 flex gap-1 rounded-xl border bg-muted/50 p-1 w-fit">
        {TABS.map((tab) => {
          const Icon = tab === "Trucks" ? TruckIcon : Users;
          const count = tab === "Trucks" ? trucks.length : drivers.length;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                activeTab === tab
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab}
              <span
                className={cn(
                  "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                  activeTab === tab
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "Trucks" ? (
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
      ) : (
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
      )}
    </AppShell>
  );
}
