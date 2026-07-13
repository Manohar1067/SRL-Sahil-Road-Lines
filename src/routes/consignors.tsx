import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CrudTable } from "@/components/CrudTable";
import { useConsignors } from "@/lib/store";
import type { Party } from "@/lib/types";

export const Route = createFileRoute("/consignors")({
  head: () => ({ meta: [{ title: "Consignors — Sahil Road Lines" }] }),
  component: ConsignorsPage,
});

function ConsignorsPage() {
  const [rows, setRows] = useConsignors();
  return (
    <AppShell title="Consignor Management" breadcrumb={["Home", "Consignors"]}>
      <CrudTable<Party>
        title="Consignor"
        addLabel="Add Consignor"
        entityName="consignor"
        rows={rows}
        setRows={setRows}
        empty={{ companyName: "", phone: "", gst: "", address: "" }}
        columns={[
          { key: "companyName", label: "Company Name" },
          { key: "phone", label: "Phone" },
          { key: "gst", label: "GST" },
          { key: "address", label: "Address" },
        ]}
      />
    </AppShell>
  );
}
