import { useEffect, useState } from "react";
import type { HealthStatus } from "./useUrlHealth";

export interface HealthLogEntry {
  id: string;
  url: string;
  label?: string;
  status: HealthStatus;
  message: string;
  checkedAt: string;
}

const KEY = "hms-qa-health-log";
const MAX = 200;

function load(): HealthLogEntry[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function save(l: HealthLogEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(l.slice(0, MAX)));
}

export function useHealthLog(): [HealthLogEntry[], () => void] {
  const [log, setLog] = useState<HealthLogEntry[]>(() => load());

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!d || !d.url) return;
      const entry: HealthLogEntry = {
        id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: d.url,
        status: d.status,
        message: d.message,
        checkedAt: d.checkedAt || new Date().toISOString(),
      };
      setLog((prev) => {
        const next = [entry, ...prev].slice(0, MAX);
        save(next);
        return next;
      });
    };
    window.addEventListener("hms-qa-health-result", handler);
    return () => window.removeEventListener("hms-qa-health-result", handler);
  }, []);

  const clear = () => { setLog([]); save([]); };
  return [log, clear];
}
