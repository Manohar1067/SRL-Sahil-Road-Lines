/**
 * Persistent settings layer — structured for future Supabase synchronization.
 * Logo, Admin PIN, and Company Details are stored in localStorage today
 * and can be synced to Supabase via the adapter functions below.
 */

import type { AppSettings, CompanyInfo } from "./store";

/** Settings that must survive refresh, logout, restart, and redeployment */
export interface PersistentSettings {
  company: CompanyInfo;
  adminPinHash?: string;
  autoLockMinutes?: number;
  paidByOptions?: string[];
  /** Reserved for future Supabase row id */
  remoteId?: string;
  /** ISO timestamp of last local save */
  updatedAt: string;
  /** ISO timestamp of last successful cloud sync (future) */
  lastSyncedAt?: string;
}

export interface SettingsSyncAdapter {
  push(settings: PersistentSettings): Promise<void>;
  pull(): Promise<PersistentSettings | null>;
}

/** Placeholder — wire to Supabase when ready */
export const supabaseSettingsAdapter: SettingsSyncAdapter = {
  async push(_settings: PersistentSettings) {
    // Future: await supabase.from('settings').upsert(...)
  },
  async pull() {
    // Future: await supabase.from('settings').select().single()
    return null;
  },
};

export function extractPersistentSettings(settings: AppSettings): PersistentSettings {
  return {
    company: settings.company,
    adminPinHash: settings.adminPinHash,
    autoLockMinutes: settings.autoLockMinutes,
    paidByOptions: settings.paidByOptions,
    updatedAt: new Date().toISOString(),
    lastSyncedAt: settings.lastSyncedAt,
    remoteId: settings.remoteId,
  };
}

export function mergePersistentIntoSettings(
  current: AppSettings,
  persistent: Partial<PersistentSettings>,
): AppSettings {
  return {
    ...current,
    company: persistent.company ?? current.company,
    adminPinHash: persistent.adminPinHash ?? current.adminPinHash,
    autoLockMinutes: persistent.autoLockMinutes ?? current.autoLockMinutes,
    paidByOptions: persistent.paidByOptions ?? current.paidByOptions,
    lastSyncedAt: persistent.lastSyncedAt ?? current.lastSyncedAt,
    remoteId: persistent.remoteId ?? current.remoteId,
  };
}

/** Save persistent settings locally and optionally queue cloud sync */
export async function savePersistentSettings(
  settings: AppSettings,
  adapter: SettingsSyncAdapter = supabaseSettingsAdapter,
): Promise<AppSettings> {
  const persistent = extractPersistentSettings(settings);
  const merged = mergePersistentIntoSettings(settings, persistent);

  try {
    await adapter.push(persistent);
    merged.lastSyncedAt = new Date().toISOString();
  } catch {
    // Cloud sync not available yet — local save still succeeds
  }

  return merged;
}
