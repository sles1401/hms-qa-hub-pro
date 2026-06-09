import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, X, Activity } from "lucide-react";
import { toast } from "sonner";
import { loadAlertStatuses, setAlertStatus, clearAlertStatus, fingerprint } from "@/lib/alertStatus";

interface HealthEventDetail {
  url: string;
  status: "idle" | "checking" | "ok" | "warn" | "error";
  message: string;
  checkedAt: string;
  label?: string;
}

interface DownEntry {
  url: string;
  label: string;
  message: string;
  at: string;
  /** consecutive error count since last ok */
  streak: number;
}

const STREAK_KEY = "hms-qa-health-streak";
const DOWN_KEY = "hms-qa-health-down";
const DEFAULT_THRESHOLD = 2; // consecutive errors before raising

function loadDown(): Record<string, DownEntry> {
  try { return JSON.parse(localStorage.getItem(DOWN_KEY) || "{}"); } catch { return {}; }
}
function saveDown(m: Record<string, DownEntry>) {
  localStorage.setItem(DOWN_KEY, JSON.stringify(m));
}
function loadStreak(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY) || "{}"); } catch { return {}; }
}
function saveStreak(m: Record<string, number>) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(m));
}

/** Listens to health-check events from useUrlHealth and surfaces an auto-alert
 * banner whenever any URL fails ≥ threshold checks in a row. Includes
 * acknowledge / resolve actions persisted via lib/alertStatus. */
export default function HealthAlertMonitor() {
  const [down, setDown] = useState<Record<string, DownEntry>>(() => loadDown());
  const [statusVersion, setStatusVersion] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as HealthEventDetail;
      if (!d?.url) return;
      const streaks = loadStreak();
      const cur = streaks[d.url] || 0;
      if (d.status === "error") {
        const next = cur + 1;
        streaks[d.url] = next; saveStreak(streaks);
        if (next >= DEFAULT_THRESHOLD) {
          setDown((prev) => {
            const wasNew = !prev[d.url];
            const m = { ...prev, [d.url]: {
              url: d.url, label: d.label || new URL(d.url).hostname,
              message: d.message, at: d.checkedAt, streak: next,
            }};
            saveDown(m);
            if (wasNew) {
              toast.error(`Healthcheck Alert: URL down`, {
                description: `${m[d.url].label} — ${d.message}`,
                duration: 7000,
              });
            }
            return m;
          });
        }
      } else if (d.status === "ok") {
        if (cur > 0) { delete streaks[d.url]; saveStreak(streaks); }
        // do not auto-clear from "down" list — admin acks/resolves explicitly
      }
    };
    window.addEventListener("hms-qa-health-result", handler);
    const sh = () => setStatusVersion((v) => v + 1);
    window.addEventListener("hms-qa-alert-status-change", sh);
    return () => {
      window.removeEventListener("hms-qa-health-result", handler);
      window.removeEventListener("hms-qa-alert-status-change", sh);
    };
  }, []);

  const statuses = useMemo(() => loadAlertStatuses(), [statusVersion, down]);
  const items = Object.values(down).sort((a, b) => b.at.localeCompare(a.at));
  if (items.length === 0) return null;

  const keyFor = (url: string) => `health:${url}`;
  const ack = (url: string) => setAlertStatus(keyFor(url), { state: "ack", at: new Date().toISOString(), before: 1, after: 0 });
  const resolve = (url: string) => {
    clearAlertStatus(keyFor(url));
    setDown((prev) => { const m = { ...prev }; delete m[url]; saveDown(m); return m; });
    const s = loadStreak(); delete s[url]; saveStreak(s);
  };
  const unack = (url: string) => clearAlertStatus(keyFor(url));
  const ackAll = () => items.forEach((i) => ack(i.url));
  const resolveAll = () => items.forEach((i) => resolve(i.url));

  return (
    <div className="rounded-xl border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950/30 p-4 flex items-start gap-3">
      <ShieldAlert className="text-orange-600 shrink-0 mt-0.5" size={20} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
          Auto Alert — Healthcheck mendeteksi {items.length} URL bermasalah
        </p>
        <ul className="text-xs text-orange-700 dark:text-orange-200 mt-1.5 space-y-1">
          {items.map((it) => {
            const st = statuses[keyFor(it.url)];
            const acked = st && st.state === "ack";
            return (
              <li key={it.url} className="flex items-center gap-2 flex-wrap">
                <Activity size={11} className="shrink-0" />
                <span className="font-medium truncate max-w-[140px]" title={it.url}>{it.label}</span>
                <span className="text-[11px]">{it.message}</span>
                <span className="text-[10px] opacity-70">(×{it.streak})</span>
                {acked && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 uppercase">ack</span>
                )}
                <span className="ml-auto inline-flex gap-1">
                  {acked ? (
                    <button onClick={() => unack(it.url)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-orange-300 hover:bg-orange-100">Undo</button>
                  ) : (
                    <button onClick={() => ack(it.url)}
                      className="text-[10px] px-1.5 py-0.5 rounded border border-orange-300 hover:bg-orange-100">Ack</button>
                  )}
                  <button onClick={() => resolve(it.url)}
                    className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-100">Resolve</button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex flex-col gap-1 shrink-0">
        <button onClick={ackAll} className="text-xs px-3 py-1.5 rounded border border-orange-300 text-orange-700 hover:bg-orange-100">Ack All</button>
        <button onClick={resolveAll} className="text-xs px-3 py-1.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-100">Resolve All</button>
      </div>
    </div>
  );
}
