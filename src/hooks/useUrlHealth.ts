import { useEffect, useState, useCallback } from "react";

export type HealthStatus = "idle" | "checking" | "ok" | "warn" | "error";

export interface HealthResult {
  status: HealthStatus;
  message: string;
  checkedAt?: string;
}

/**
 * Lightweight URL healthcheck.
 *  - Validates URL syntax
 *  - Probes with no-cors fetch to detect DNS / network issues
 *  - Cannot read HTTP status (CORS); treat reachable as "ok"
 */
export function useUrlHealth(url: string, intervalMs = 0): HealthResult & { recheck: () => void } {
  const [result, setResult] = useState<HealthResult>({ status: "idle", message: "Belum dicek" });

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
  useEffect(() => {
    if (!intervalMs) return;
    const i = setInterval(check, intervalMs);
    return () => clearInterval(i);
  }, [check, intervalMs]);

  return { ...result, recheck: check };
}
