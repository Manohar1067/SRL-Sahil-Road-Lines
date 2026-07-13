import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CrudTable } from "@/components/CrudTable";
import { useConsignees } from "@/lib/store";
import type { Party } from "@/lib/types";

export const Route = createFileRoute("/consignees")({
  head: () => ({ meta: [{ title: "Consignees — Sahil Road Lines" }] }),
  component: ConsigneesPage,
});

function ConsigneesPage() {
  const [rows, setRows] = useConsignees();
  return (
    <AppShell title="Consignee Management" breadcrumb={["Home", "Consignees"]}>
      <CrudTable<Party>
        title="Consignee"
        addLabel="Add Consignee"
        entityName="consignee"
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
