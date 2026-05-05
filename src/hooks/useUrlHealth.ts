import { useEffect, useState, useCallback } from "react";

export type HealthStatus = "idle" | "checking" | "ok" | "warn" | "error";

export interface HealthResult {
  status: HealthStatus;
  message: string;
  checkedAt?: string;
}

const SETTINGS_KEY = "hms-qa-health-settings";
const RECHECK_EVENT = "hms-qa-health-recheck-all";
const SETTINGS_EVENT = "hms-qa-health-settings-changed";

export interface HealthSettings {
  enabled: boolean;
  intervalMs: number; // 0 = disabled
}

export const HEALTH_INTERVAL_OPTIONS: { label: string; value: number }[] = [
  { label: "Nonaktif", value: 0 },
  { label: "30 detik", value: 30_000 },
  { label: "1 menit", value: 60_000 },
  { label: "5 menit", value: 5 * 60_000 },
  { label: "15 menit", value: 15 * 60_000 },
  { label: "1 jam", value: 60 * 60_000 },
];

export function loadHealthSettings(): HealthSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return {
        enabled: typeof p.enabled === "boolean" ? p.enabled : true,
        intervalMs: typeof p.intervalMs === "number" ? p.intervalMs : 5 * 60_000,
      };
    }
  } catch {}
  return { enabled: true, intervalMs: 5 * 60_000 };
}

export function saveHealthSettings(s: HealthSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: s }));
}

export function triggerRecheckAll() {
  window.dispatchEvent(new CustomEvent(RECHECK_EVENT));
}

export function useHealthSettings(): [HealthSettings, (s: HealthSettings) => void] {
  const [s, setS] = useState<HealthSettings>(() => loadHealthSettings());
  useEffect(() => {
    const handler = (e: Event) => setS((e as CustomEvent).detail || loadHealthSettings());
    window.addEventListener(SETTINGS_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_EVENT, handler);
  }, []);
  const setter = (next: HealthSettings) => { saveHealthSettings(next); setS(next); };
  return [s, setter];
}

/**
 * Lightweight URL healthcheck.
 *  - Validates URL syntax
 *  - Probes with no-cors fetch to detect DNS / network issues
 *  - Reads interval from shared settings (localStorage), prop overrides if provided
 *  - Listens to global 'recheck all' event
 */
export function useUrlHealth(url: string, intervalMsOverride?: number): HealthResult & { recheck: () => void } {
  const [result, setResult] = useState<HealthResult>({ status: "idle", message: "Belum dicek" });
  const [settings, setSettings] = useState<HealthSettings>(() => loadHealthSettings());

  useEffect(() => {
    const handler = (e: Event) => setSettings((e as CustomEvent).detail || loadHealthSettings());
    window.addEventListener(SETTINGS_EVENT, handler);
    return () => window.removeEventListener(SETTINGS_EVENT, handler);
  }, []);

  const check = useCallback(async () => {
    if (!url || !url.trim()) {
      setResult({ status: "warn", message: "URL kosong" });
      return;
    }
    let parsed: URL;
    try { parsed = new URL(url.trim()); } catch {
      setResult({ status: "error", message: "Format URL invalid" });
      return;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      setResult({ status: "error", message: "Protokol harus http/https" });
      return;
    }
    setResult((p) => ({ ...p, status: "checking", message: "Mengecek..." }));
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 7000);
      await fetch(parsed.toString(), { method: "HEAD", mode: "no-cors", signal: ctrl.signal });
      clearTimeout(t);
      setResult({ status: "ok", message: "Tautan dapat dijangkau", checkedAt: new Date().toISOString() });
    } catch (e: any) {
      const msg = e?.name === "AbortError" ? "Timeout (>7s)" : "Tautan tidak dapat dijangkau";
      setResult({ status: "error", message: msg, checkedAt: new Date().toISOString() });
    }
  }, [url]);

  useEffect(() => { check(); }, [check]);

  // Global recheck event
  useEffect(() => {
    const h = () => check();
    window.addEventListener(RECHECK_EVENT, h);
    return () => window.removeEventListener(RECHECK_EVENT, h);
  }, [check]);

  // Periodic interval (override > settings)
  useEffect(() => {
    const ms = intervalMsOverride !== undefined ? intervalMsOverride : (settings.enabled ? settings.intervalMs : 0);
    if (!ms || ms <= 0) return;
    const i = setInterval(check, ms);
    return () => clearInterval(i);
  }, [check, intervalMsOverride, settings.enabled, settings.intervalMs]);

  return { ...result, recheck: check };
}
