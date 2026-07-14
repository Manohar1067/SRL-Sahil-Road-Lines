import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useSettings, hashPin, addAuditEntry } from "@/lib/store";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { exportToExcel, importFile } from "@/lib/export-import";
import { notifyExportCompleted, notifyImportCompleted, notifyBackupCreated } from "@/lib/notifications";
import { savePersistentSettings } from "@/lib/settings-persistence";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Sahil Road Lines" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [settings, setSettings] = useSettings();
  const logoRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const c = settings.company;

  // Local draft for company info (save on button click)
  const [draft, setDraft] = useState(c);
  const setDraftField = (patch: Partial<typeof c>) => setDraft((d) => ({ ...d, ...patch }));

  // Paid By options management
  const [newPaidByOption, setNewPaidByOption] = useState("");
  const paidByOptions = settings.paidByOptions ?? ["Kurmannapalem", "Karnataka"];

  const addPaidByOption = () => {
    if (!newPaidByOption.trim()) return;
    const updated = [...paidByOptions, newPaidByOption.trim()];
    setSettings({ ...settings, paidByOptions: updated });
    setNewPaidByOption("");
    toast.success("Location added");
  };

  const removePaidByOption = (option: string) => {
    const updated = paidByOptions.filter((o) => o !== option);
    setSettings({ ...settings, paidByOptions: updated });
    toast.success("Location removed");
  };

  const saveCompany = async () => {
    const old = settings.company;
    const updated = { ...settings, company: draft };
    const persisted = await savePersistentSettings(updated);
    setSettings(persisted);
    addAuditEntry({
      action: "UPDATE",
      entity: "settings",
      entityId: "company",
      oldValue: JSON.stringify(old),
      newValue: JSON.stringify(draft),
    });
    toast.success("Company details saved");
  };

  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [autoLock, setAutoLock] = useState(String(settings.autoLockMinutes ?? 15));

  const onLogo = (f: File | null) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const logo = String(reader.result || "");
      setDraft((d) => ({ ...d, logo }));
      // Also save immediately
      const updated = { ...settings, company: { ...draft, logo } };
      setSettings(updated);
      addAuditEntry({
        action: "UPDATE",
        entity: "settings",
        entityId: "logo",
        oldValue: JSON.stringify({ logo: settings.company.logo ? "(previous logo)" : "" }),
        newValue: JSON.stringify({ logo: "(new logo uploaded)" }),
      });
    };
    reader.readAsDataURL(f);
  };

  const onSavePin = async () => {
    if (pin.length < 4) return toast.error("PIN must be at least 4 digits");
    if (pin !== pin2) return toast.error("PINs do not match");
    const h = await hashPin(pin);
    const updated = { ...settings, adminPinHash: h, autoLockMinutes: Math.max(1, Number(autoLock) || 15) };
    const persisted = await savePersistentSettings(updated);
    setSettings(persisted);
    addAuditEntry({
      action: "UPDATE",
      entity: "settings",
      entityId: "pin",
      newValue: JSON.stringify({ adminPinHash: "(updated)", autoLockMinutes: Math.max(1, Number(autoLock) || 15) }),
    });
    setPin(""); setPin2("");
    toast.success("Admin PIN updated");
  };

  const onSaveAutoLock = async () => {
    const mins = Math.max(1, Number(autoLock) || 15);
    const old = settings.autoLockMinutes;
    const updated = { ...settings, autoLockMinutes: mins };
    const persisted = await savePersistentSettings(updated);
    setSettings(persisted);
    addAuditEntry({
      action: "UPDATE",
      entity: "settings",
      entityId: "auto-lock",
      oldValue: JSON.stringify({ autoLockMinutes: old }),
      newValue: JSON.stringify({ autoLockMinutes: mins }),
    });
    toast.success(`Auto-lock set to ${mins} minutes`);
  };

  const onExport = () => {
    try {
      const blob = exportToExcel();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sahil-roadlines-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      addAuditEntry({
        action: "CREATE",
        entity: "settings",
        entityId: "backup",
        newValue: JSON.stringify({ action: "Excel export completed", date: new Date().toISOString() }),
      });
      notifyExportCompleted();
      toast.success("Excel export completed");
    } catch {
      toast.error("Could not export data");
    }
  };

  const onImport = async (f: File | null) => {
    if (!f) return;
    if (!confirm("This will OVERWRITE all existing data (dispatches, parties, trucks, drivers, settings). Continue?")) return;
    try {
      const result = await importFile(f);
      if (result.success) {
        addAuditEntry({
          action: "RESTORE",
          entity: "settings",
          entityId: "backup",
          newValue: JSON.stringify({ action: "Data imported", file: f.name, date: new Date().toISOString() }),
        });
        notifyImportCompleted(f.name);
        toast.success(result.message + ". Reloading…");
        setTimeout(() => location.reload(), 700);
      } else {
        toast.error(result.message);
      }
    } catch (e: any) {
      toast.error(e?.message || "Invalid file");
    }
  };

  const reset = () => {
    if (confirm("Reset all data to seed defaults? This clears your dispatches and edits.")) {
      ["srl_dispatches", "srl_trucks", "srl_drivers", "srl_consignors", "srl_consignees", "srl_settings"].forEach((k) => localStorage.removeItem(k));
      toast.success("Data reset. Reloading…");
      setTimeout(() => location.reload(), 600);
    }
  };

  return (
    <AppShell title="Settings" breadcrumb={["Home", "Settings"]}>
      <div className="mx-auto grid max-w-3xl gap-5">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Company Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs uppercase text-muted-foreground">Company Name</Label>
              <Input value={draft.name} onChange={(e) => setDraftField({ name: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs uppercase text-muted-foreground">Address</Label>
              <Textarea rows={2} value={draft.address} onChange={(e) => setDraftField({ address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Phone</Label>
              <Input value={draft.phone} onChange={(e) => setDraftField({ phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">GST Number</Label>
              <Input value={draft.gst} onChange={(e) => setDraftField({ gst: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs uppercase text-muted-foreground">Email</Label>
              <Input type="email" value={draft.email || ""} onChange={(e) => setDraftField({ email: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs uppercase text-muted-foreground">Logo</Label>
              <div className="flex items-center gap-3">
                {draft.logo ? (
                  <img src={draft.logo} alt="logo" className="h-14 w-14 rounded border object-contain bg-white" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">No logo</div>
                )}
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0] || null)} />
                <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}>Upload Logo</Button>
                {draft.logo && <Button variant="ghost" size="sm" onClick={() => setDraftField({ logo: "" })}>Remove</Button>}
              </div>
              <p className="text-xs text-muted-foreground">Used on sidebar, dispatch memo, PDF, PNG and print — updates everywhere automatically.</p>
            </div>
            <div className="md:col-span-2">
              <Button onClick={saveCompany}>Save Company Details</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Admin Security</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">New Admin PIN</Label>
              <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="At least 4 digits" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Confirm PIN</Label>
              <Input type="password" inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value)} placeholder="Re-enter PIN" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Auto Lock (minutes)</Label>
              <Input type="number" min={1} value={autoLock} onChange={(e) => setAutoLock(e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Locks the app after this many minutes of inactivity. Default 15.</p>
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={onSavePin} disabled={!pin || !pin2}>Update PIN</Button>
              <Button variant="outline" onClick={onSaveAutoLock}>Save Auto Lock</Button>
            </div>
            <p className="md:col-span-2 text-[11px] text-muted-foreground">
              PIN is stored as a SHA-256 hash in this browser only. It is never stored in plain text.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Paid By Locations</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newPaidByOption}
                onChange={(e) => setNewPaidByOption(e.target.value)}
                placeholder="Add new location (e.g., Hyderabad)"
                className="flex-1"
              />
              <Button onClick={addPaidByOption} disabled={!newPaidByOption.trim()}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {paidByOptions.map((option) => (
                <div key={option} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm">
                  <span>{option}</span>
                  <button
                    type="button"
                    onClick={() => removePaidByOption(option)}
                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              These locations appear in the "Paid By" dropdown when creating dispatches.
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Switch between light and dark themes.</p>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={(v) => {
                setSettings({ ...settings, darkMode: v });
                addAuditEntry({
                  action: "UPDATE",
                  entity: "settings",
                  entityId: "appearance",
                  oldValue: JSON.stringify({ darkMode: settings.darkMode }),
                  newValue: JSON.stringify({ darkMode: v }),
                });
              }}
            />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Export &amp; Import</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Label className="text-sm font-medium">Export Data</Label>
                <p className="text-xs text-muted-foreground">Export all data to Microsoft Excel (.xlsx) format.</p>
              </div>
              <Button onClick={onExport}>Export to Excel</Button>
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-3 block">Import Data</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input ref={importRef} type="file" accept=".xlsx,.xls,.csv,.json" className="hidden" onChange={(e) => onImport(e.target.files?.[0] || null)} />
                  <Button variant="outline" onClick={() => importRef.current?.click()}>
                    Import from Local Device
                  </Button>
                  <span className="text-xs text-muted-foreground">Supported: Excel (.xlsx), CSV, JSON</span>
                </div>
                <Button variant="outline" disabled className="w-fit opacity-50">
                  Import from Google Drive
                  <span className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded">Coming Soon</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Data</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Reset to sample data</Label>
              <p className="text-xs text-muted-foreground">Clears all dispatches, trucks, drivers, parties, and company details.</p>
            </div>
            <Button variant="destructive" onClick={reset}>Reset Data</Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
