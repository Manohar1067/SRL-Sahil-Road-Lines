import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSettings, hashPin } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { toast } from "sonner";

// Default first-run PIN so the demo is always accessible; the user is prompted to change it in Settings.
const DEFAULT_PIN = "1234";

export function AdminLock({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useSettings();
  const [locked, setLocked] = useState(true);
  const [wasAutoLocked, setWasAutoLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Ensure a PIN exists on first run (hashed default)
  useEffect(() => {
    if (!settings.adminPinHash) {
      hashPin(DEFAULT_PIN).then((h) => setSettings({ ...settings, adminPinHash: h }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetTimer = () => {
    if (locked) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    const mins = Math.max(1, Number(settings.autoLockMinutes) || 15);
    timerRef.current = window.setTimeout(() => {
      setLocked(true);
      setWasAutoLocked(true);
    }, mins * 60 * 1000);
  };

  useEffect(() => {
    if (locked) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      return;
    }
    resetTimer();
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, settings.autoLockMinutes]);

  const onUnlock = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!pin) return;
    setBusy(true);
    try {
      const h = await hashPin(pin);
      const expected = settings.adminPinHash || (await hashPin(DEFAULT_PIN));
      if (h === expected) {
        setLocked(false);
        setWasAutoLocked(false);
        setPin("");
      } else {
        toast.error("Incorrect PIN");
        setPin("");
      }
    } finally {
      setBusy(false);
    }
  };

  if (locked) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
        <Card className="w-full max-w-sm border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {settings.company?.name || "SAHIL ROAD LINES"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {wasAutoLocked ? "Session Locked" : "Enter Admin PIN"}
            </p>
            <form onSubmit={onUnlock} className="mt-6 space-y-3">
              <Input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="text-center text-lg tracking-[0.5em]"
                maxLength={12}
              />
              <Button type="submit" className="w-full" disabled={busy || !pin}>
                Unlock
              </Button>
            </form>
            {!settings.adminPinHash && (
              <p className="mt-4 text-[11px] text-muted-foreground">
                First run — default PIN is <span className="font-mono font-semibold">1234</span>. Change it in Settings.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
