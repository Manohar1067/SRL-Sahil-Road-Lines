import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useSettings, hashPin, exportAllData, importAllData } from "@/lib/store";
import { toast } from "sonner";
import { useRef, useState } from "react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Sahil Road Lines" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [settings, setSettings] = useSettings();
  const logoRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const c = settings.company;
  const setCompany = (patch: Partial<typeof c>) =>
    setSettings({ ...settings, company: { ...c, ...patch } });

  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [autoLock, setAutoLock] = useState(String(settings.autoLockMinutes ?? 15));

  const onLogo = (f: File | null) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCompany({ logo: String(reader.result || "") });
    reader.readAsDataURL(f);
  };

  const onSavePin = async () => {
    if (pin.length < 4) return toast.error("PIN must be at least 4 digits");
    if (pin !== pin2) return toast.error("PINs do not match");
    const h = await hashPin(pin);
    setSettings({ ...settings, adminPinHash: h, autoLockMinutes: Math.max(1, Number(autoLock) || 15) });
    setPin(""); setPin2("");
    toast.success("Admin PIN updated");
  };

  const onSaveAutoLock = () => {
    const mins = Math.max(1, Number(autoLock) || 15);
    setSettings({ ...settings, autoLockMinutes: mins });
    toast.success(`Auto-lock set to ${mins} minutes`);
  };

  const onExport = () => {
    try {
      const json = exportAllData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sahil-roadlines-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup exported");
    } catch {
      toast.error("Could not export backup");
    }
  };

  const onImport = async (f: File | null) => {
    if (!f) return;
    if (!confirm("This will OVERWRITE all existing data (dispatches, parties, trucks, drivers, settings). Continue?")) return;
    try {
      const text = await f.text();
      importAllData(text);
      toast.success("Backup restored. Reloading…");
      setTimeout(() => location.reload(), 700);
    } catch (e: any) {
      toast.error(e?.message || "Invalid backup file");
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
              <Input value={c.name} onChange={(e) => setCompany({ name: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs uppercase text-muted-foreground">Address</Label>
              <Textarea rows={2} value={c.address} onChange={(e) => setCompany({ address: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Phone</Label>
              <Input value={c.phone} onChange={(e) => setCompany({ phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">GST Number</Label>
              <Input value={c.gst} onChange={(e) => setCompany({ gst: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs uppercase text-muted-foreground">Email</Label>
              <Input type="email" value={c.email || ""} onChange={(e) => setCompany({ email: e.target.value })} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs uppercase text-muted-foreground">Logo</Label>
              <div className="flex items-center gap-3">
                {c.logo ? (
                  <img src={c.logo} alt="logo" className="h-14 w-14 rounded border object-contain bg-white" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">No logo</div>
                )}
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0] || null)} />
                <Button variant="outline" size="sm" onClick={() => logoRef.current?.click()}>Upload Logo</Button>
                {c.logo && <Button variant="ghost" size="sm" onClick={() => setCompany({ logo: "" })}>Remove</Button>}
              </div>
              <p className="text-xs text-muted-foreground">Used on sidebar, dispatch memo, PDF, PNG and print — updates everywhere automatically.</p>
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
          <CardHeader><CardTitle className="text-base">Appearance</CardTitle></CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Switch between light and dark themes.</p>
            </div>
            <Switch checked={settings.darkMode} onCheckedChange={(v) => setSettings({ ...settings, darkMode: v })} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-base">Backup &amp; Restore</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="text-sm font-medium">All application data</Label>
              <p className="text-xs text-muted-foreground">Dispatches, drivers, trucks, consignors, consignees, company settings, application settings.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={onExport}>Export Backup</Button>
              <input ref={importRef} type="file" accept="application/json" className="hidden" onChange={(e) => onImport(e.target.files?.[0] || null)} />
              <Button variant="outline" onClick={() => importRef.current?.click()}>Import Backup</Button>
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
