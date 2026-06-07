import { useState, useEffect, useMemo, useRef } from "react";
import { TrendingUp, CheckCircle, XCircle, Clock, BarChart3, Edit2, Lightbulb, ExternalLink, Save, Calendar, Sparkles, Check, Undo2, History, RotateCcw, AlertCircle, FileJson, FileSpreadsheet, ShieldCheck, ShieldAlert, Ban, Upload, RefreshCw, Zap, Hand, AlertTriangle, Lock, Bookmark, X, Eye } from "lucide-react";
import { toast } from "sonner";
import { type AppStats, type SubmoduleStats, type JournalEntry, type Category, DASHBOARD_DEFAULTS, isValidGoogleDriveUrl, validateDeadlineStrict, type DashboardHistoryEntry, type HistorySource } from "@/lib/store";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import ConfirmDialog from "@/components/ConfirmDialog";
import UrlHealthBadge from "@/components/UrlHealthBadge";
import { useHealthSettings, triggerRecheckAll, HEALTH_INTERVAL_OPTIONS } from "@/hooks/useUrlHealth";
import { useHealthLog } from "@/hooks/useHealthLog";
import { useRole } from "@/hooks/useRole";
import ReportDialog from "@/components/ReportDialog";
import SyncDiffDialog from "@/components/SyncDiffDialog";
import RegressionSettingsDialog from "@/components/RegressionSettingsDialog";
import { getRegressionSettings } from "@/lib/adminSettings";
import { loadAlertStatuses, setAlertStatus, clearAlertStatus, fingerprint } from "@/lib/alertStatus";
import { loadPresets, addPreset, deletePreset, type FilterPreset } from "@/lib/savedFilters";
import { buildExportFilename } from "@/lib/exportFilename";

// Field-level validators
function validateTitle(v: string): string | null {
  const t = v.trim();
  if (!t) return "Judul tidak boleh kosong";
  if (t.length < 3) return "Minimal 3 karakter";
  if (v.length > 80) return "Maksimal 80 karakter";
  return null;
}
function validateLabel(v: string): string | null {
  const t = v.trim();
  if (!t) return "Label tidak boleh kosong";
  if (t.length < 2) return "Minimal 2 karakter";
  if (v.length > 40) return "Maksimal 40 karakter";
  return null;
}
function validateInsight(v: string): string | null {
  const t = v.trim();
  if (!t) return "Insight tidak boleh kosong";
  if (t.length < 5) return "Minimal 5 karakter";
  if (v.length > 500) return "Maksimal 500 karakter";
  return null;
}
function validateDeadline(v: string): string | null {
  const r = validateDeadlineStrict(v);
  return r.ok ? null : (r.reason || "Tanggal tidak valid");
}
function validateName(v: string): string | null {
  const t = v.trim();
  if (!t) return "Nama tidak boleh kosong";
  if (t.length > 50) return "Maksimal 50 karakter";
  return null;
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
function csvEscape(v: string) {
  return `"${(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}

interface Props {
  stats: AppStats;
  onEditStats: () => void;
  insightText: string;
  onUpdateInsight: (text: string) => void;
  userName: string;
  onUpdateUserName: (name: string) => void;
  releaseDeadline: string;
  onUpdateDeadline: (iso: string) => void;
  submoduleStats: Record<string, SubmoduleStats>;
  categories: Category[];
  journalEntries: JournalEntry[];
  globalEditMode?: boolean;
  learnMoreUrl: string;
  onUpdateLearnMoreUrl: (url: string) => void;
  insightTitle: string;
  onUpdateInsightTitle: (t: string) => void;
  learnMoreLabel: string;
  onUpdateLearnMoreLabel: (t: string) => void;
  /** Optional: full app config snapshot for export, and importer for restore */
  exportFullConfig?: () => any;
  importFullConfig?: (data: any) => void;
  /** Current environment & sync handler */
  env?: "staging" | "production";
  onSyncToProduction?: () => { copied: number };
  projectId?: string;
  projectTitle?: string;
}

type FieldKey = "insightText" | "insightTitle" | "learnMoreLabel" | "learnMoreUrl";

const HISTORY_KEY = "hms-qa-dashboard-history";
const AUTOSAVE_KEY = "hms-qa-dashboard-autosave";
const HISTORY_MAX = 30;

function loadHistory(): DashboardHistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveHistory(h: DashboardHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, HISTORY_MAX)));
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

function useCountdown(target: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (isNaN(diff)) return null;
  const past = diff < 0;
  const ms = Math.abs(diff);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { d, h, m, s, past };
}

const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#a855f7", "#06b6d4"];

const REGRESSION_SNAPSHOT_KEY = "hms-qa-regression-snapshot";

interface AlertItem { id: string; name: string; before: number; after: number; total: number; regressionTC: number; subs: { id: string; name: string; passed: number; total: number; rate: number }[]; }

function RegressionSubsList({ subs }: { subs: AlertItem["subs"] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"rateAsc" | "rateDesc" | "name" | "failDesc">("rateAsc");
  const display = useMemo(() => {
    const filtered = subs.filter((s) => !q.trim() || s.name.toLowerCase().includes(q.toLowerCase()));
    const arr = [...filtered];
    if (sort === "rateAsc") arr.sort((a, b) => a.rate - b.rate);
    else if (sort === "rateDesc") arr.sort((a, b) => b.rate - a.rate);
    else if (sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === "failDesc") arr.sort((a, b) => (b.total - b.passed) - (a.total - a.passed));
    return arr;
  }, [subs, q, sort]);
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-foreground">Submodule pemicu ({display.length}/{subs.length})</p>
        <select value={sort} onChange={(e) => setSort(e.target.value as any)}
          className="text-[11px] px-1.5 py-1 rounded border border-input bg-background">
          <option value="rateAsc">Rate ↑ (terendah dulu)</option>
          <option value="rateDesc">Rate ↓ (tertinggi dulu)</option>
          <option value="failDesc">Failed terbanyak</option>
          <option value="name">Nama (A–Z)</option>
        </select>
      </div>
      <div className="relative mb-2">
        <Search size={11} className="absolute left-2 top-2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari submodule / trigger case..."
          className="w-full pl-7 pr-2 py-1.5 text-xs rounded border border-input bg-background" />
      </div>
      <ul className="space-y-1.5">
        {display.length === 0 && <li className="text-xs text-muted-foreground">Tidak ada submodule cocok.</li>}
        {display.map((s) => (
          <li key={s.id} className="text-xs p-2 rounded border border-border flex items-center justify-between gap-2">
            <span className="truncate flex-1 text-foreground">{s.name}</span>
            <span className="text-muted-foreground">{s.passed}/{s.total}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${s.rate < 50 ? "bg-red-100 text-red-700" : s.rate < 80 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
              {s.rate.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RegressionAlert({ categories, submoduleStats, env }: { categories: Category[]; submoduleStats: Record<string, SubmoduleStats>; env: string }) {
  const [settingsVersion, setSettingsVersion] = useState(0);
  const [statusVersion, setStatusVersion] = useState(0);
  useEffect(() => {
    const h = () => setSettingsVersion((v) => v + 1);
    const hs = () => setStatusVersion((v) => v + 1);
    window.addEventListener("storage", h);
    window.addEventListener("hms-qa-regression-settings-change", h);
    window.addEventListener("hms-qa-alert-status-change", hs);
    return () => {
      window.removeEventListener("storage", h);
      window.removeEventListener("hms-qa-regression-settings-change", h);
      window.removeEventListener("hms-qa-alert-status-change", hs);
    };
  }, []);
  const regSettings = useMemo(() => getRegressionSettings(), [settingsVersion]);
  const statuses = useMemo(() => loadAlertStatuses(), [statusVersion]);

  const targets = useMemo(() => {
    if (regSettings.watchedCategoryIds.length > 0) {
      return categories.filter((c) => regSettings.watchedCategoryIds.includes(c.id));
    }
    return categories.filter((c) => /inventory|hauling/i.test(c.name) || /inventory|hauling/i.test(c.id));
  }, [categories, regSettings]);

  const rates = useMemo(() => {
    const out: Record<string, AlertItem & { name: string; rate: number }> = {} as any;
    for (const cat of targets) {
      let passed = 0, total = 0, regTC = 0;
      const subs: AlertItem["subs"] = [];
      for (const sub of cat.submodules) {
        const s = submoduleStats[sub.id];
        if (!s) continue;
        passed += s.passed; total += s.totalTC;
        regTC += s.classification?.regression ?? 0;
        subs.push({ id: sub.id, name: sub.name, passed: s.passed, total: s.totalTC, rate: s.totalTC > 0 ? (s.passed / s.totalTC) * 100 : 0 });
      }
      (out as any)[cat.id] = { id: cat.id, name: cat.name, rate: total > 0 ? (passed / total) * 100 : 0, total, regressionTC: regTC, subs, before: 0, after: 0 };
    }
    return out;
  }, [targets, submoduleStats]);

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [detail, setDetail] = useState<AlertItem | null>(null);
  const lastNotifiedRef = useRef<string>("");

  useEffect(() => {
    let snap: Record<string, number> = {};
    try { snap = JSON.parse(localStorage.getItem(REGRESSION_SNAPSHOT_KEY) || "{}"); } catch {}
    const out: AlertItem[] = [];
    const threshold = regSettings.thresholdPct;
    for (const [id, info] of Object.entries(rates)) {
      const key = `${env}:${id}`;
      const prev = snap[key];
      if (typeof prev === "number" && info.total > 0 && info.rate < prev - threshold) {
        out.push({ id, name: info.name, before: prev, after: info.rate, total: info.total, regressionTC: info.regressionTC, subs: info.subs });
      }
    }
    setAlerts(out);
    const sig = out.map((o) => `${o.id}:${o.after.toFixed(1)}`).join("|");
    if (out.length > 0 && sig !== lastNotifiedRef.current) {
      lastNotifiedRef.current = sig;
      toast.error(`Regression Alert: ${out.length} modul turun > ${threshold}%`, {
        description: out.map((o) => `${o.name}: ${o.before.toFixed(1)}% → ${o.after.toFixed(1)}%`).join(" · "),
        duration: 8000,
      });
    } else if (out.length === 0) {
      lastNotifiedRef.current = "";
    }
  }, [rates, env, regSettings.thresholdPct]);

  const ackAll = () => {
    alerts.forEach((a) => setAlertStatus(`${env}:${a.id}`, { state: "ack", at: new Date().toISOString(), before: a.before, after: a.after, by: "current" }));
  };
  const resolveAll = () => {
    let snap: Record<string, number> = {};
    try { snap = JSON.parse(localStorage.getItem(REGRESSION_SNAPSHOT_KEY) || "{}"); } catch {}
    for (const a of alerts) {
      snap[`${env}:${a.id}`] = a.after;
      setAlertStatus(`${env}:${a.id}`, { state: "resolved", at: new Date().toISOString(), before: a.before, after: a.after, by: "current" });
    }
    localStorage.setItem(REGRESSION_SNAPSHOT_KEY, JSON.stringify(snap));
    setAlerts([]);
  };
  const ackOne = (a: AlertItem) => setAlertStatus(`${env}:${a.id}`, { state: "ack", at: new Date().toISOString(), before: a.before, after: a.after });
  const resolveOne = (a: AlertItem) => {
    let snap: Record<string, number> = {};
    try { snap = JSON.parse(localStorage.getItem(REGRESSION_SNAPSHOT_KEY) || "{}"); } catch {}
    snap[`${env}:${a.id}`] = a.after;
    localStorage.setItem(REGRESSION_SNAPSHOT_KEY, JSON.stringify(snap));
    setAlertStatus(`${env}:${a.id}`, { state: "resolved", at: new Date().toISOString(), before: a.before, after: a.after });
    setAlerts((arr) => arr.filter((x) => x.id !== a.id));
  };
  const unack = (a: AlertItem) => clearAlertStatus(`${env}:${a.id}`);

  useEffect(() => {
    const raw = localStorage.getItem(REGRESSION_SNAPSHOT_KEY);
    if (!raw && Object.keys(rates).length > 0) {
      const snap: Record<string, number> = {};
      for (const [id, info] of Object.entries(rates)) snap[`${env}:${id}`] = info.rate;
      localStorage.setItem(REGRESSION_SNAPSHOT_KEY, JSON.stringify(snap));
    }
  }, [rates, env]);

  if (alerts.length === 0) return null;

  const severityOf = (delta: number) => delta <= -10 ? { label: "Critical", color: "bg-red-600" } : delta <= -5 ? { label: "High", color: "bg-orange-500" } : { label: "Warning", color: "bg-yellow-500" };

  return (
    <>
      <div className="rounded-xl border-l-4 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 flex items-start gap-3">
        <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Auto Alert — Pass Rate menurun ({alerts.length} modul, threshold {regSettings.thresholdPct}%)
          </p>
          <ul className="text-xs text-red-700 dark:text-red-200 mt-1.5 space-y-1">
            {alerts.map((a) => {
              const delta = a.after - a.before;
              const sev = severityOf(delta);
              const key = `${env}:${a.id}`;
              const st = statuses[key];
              const fpMatch = st && fingerprint(st.before, st.after) === fingerprint(a.before, a.after);
              return (
                <li key={a.id} className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setDetail(a)} title="Lihat detail penurunan"
                    className={`text-[10px] text-white px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${sev.color} hover:opacity-90`}>
                    <Eye size={9}/> {sev.label}
                  </button>
                  <span className="font-medium">{a.name}</span>
                  <span>{a.before.toFixed(1)}% → {a.after.toFixed(1)}% ({delta.toFixed(1)}%)</span>
                  {fpMatch && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 uppercase">
                      {st.state}
                    </span>
                  )}
                  <span className="ml-auto inline-flex gap-1">
                    {fpMatch ? (
                      <button onClick={() => unack(a)} className="text-[10px] px-1.5 py-0.5 rounded border border-red-300 hover:bg-red-100">Undo</button>
                    ) : (
                      <button onClick={() => ackOne(a)} className="text-[10px] px-1.5 py-0.5 rounded border border-red-300 hover:bg-red-100">Ack</button>
                    )}
                    <button onClick={() => resolveOne(a)} className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-100">Resolve</button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button onClick={ackAll} className="text-xs px-3 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-100">
            Ack All
          </button>
          <button onClick={resolveAll} className="text-xs px-3 py-1.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-100">
            Resolve All
          </button>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-stretch justify-end" onClick={() => setDetail(null)}>
          <div className="bg-card w-full max-w-md h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Detail Penurunan Pass Rate</p>
                <h3 className="font-bold text-foreground text-lg truncate">{detail.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Environment: <span className="font-medium">{env}</span></p>
              </div>
              <button onClick={() => setDetail(null)} className="p-1.5 rounded hover:bg-muted"><X size={16}/></button>
            </div>
            <div className="p-5 space-y-4">
              {(() => {
                const delta = detail.after - detail.before;
                const sev = severityOf(delta);
                return (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-[10px] text-muted-foreground uppercase">Baseline</p>
                      <p className="text-xl font-bold text-foreground">{detail.before.toFixed(1)}%</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <p className="text-[10px] text-muted-foreground uppercase">Current</p>
                      <p className="text-xl font-bold text-foreground">{detail.after.toFixed(1)}%</p>
                    </div>
                    <div className={`p-3 rounded-lg text-white ${sev.color}`}>
                      <p className="text-[10px] uppercase opacity-90">Delta · {sev.label}</p>
                      <p className="text-xl font-bold">{delta.toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded border border-border">
                  <p className="text-muted-foreground">Total TC</p>
                  <p className="font-semibold text-foreground">{detail.total}</p>
                </div>
                <div className="p-2 rounded border border-border">
                  <p className="text-muted-foreground">Regression TC</p>
                  <p className="font-semibold text-foreground">{detail.regressionTC}</p>
                </div>
              </div>
              <RegressionSubsList subs={detail.subs} />

              <div className="pt-3 border-t border-border flex gap-2">
                <button onClick={() => { ackOne(detail); setDetail(null); }}
                  className="flex-1 text-xs px-3 py-2 rounded border border-red-300 text-red-700 hover:bg-red-50">
                  Acknowledge
                </button>
                <button onClick={() => { resolveOne(detail); setDetail(null); }}
                  className="flex-1 text-xs px-3 py-2 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  Resolve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


const FIELD_LABELS: Record<FieldKey, string> = {
  insightText: "Insight Text",
  insightTitle: "Insight Title",
  learnMoreLabel: "CTA Label",
  learnMoreUrl: "Learn More URL",
};

export default function DashboardTab({
  stats, onEditStats, insightText, onUpdateInsight,
  userName, onUpdateUserName, releaseDeadline, onUpdateDeadline,
  submoduleStats, categories, journalEntries,
  globalEditMode = false, learnMoreUrl, onUpdateLearnMoreUrl,
  insightTitle, onUpdateInsightTitle, learnMoreLabel, onUpdateLearnMoreLabel,
  exportFullConfig, importFullConfig,
  env = "staging", onSyncToProduction, projectId = "", projectTitle = "",
}: Props) {
  const { isAdmin } = useRole();
  const [showReport, setShowReport] = useState(false);
  const [showSyncDiff, setShowSyncDiff] = useState(false);
  const [showRegressionSettings, setShowRegressionSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName);
  const [deadlineDraft, setDeadlineDraft] = useState(releaseDeadline);

  // Drafts (decoupled from saved value when autoSave OFF)
  const [editInsight, setEditInsight] = useState(insightText);
  const [urlDraft, setUrlDraft] = useState(learnMoreUrl);
  const [titleDraft, setTitleDraft] = useState(insightTitle);
  const [labelDraft, setLabelDraft] = useState(learnMoreLabel);

  // Auto-save toggle (persisted)
  const [autoSave, setAutoSave] = useState<boolean>(() => {
    const v = localStorage.getItem(AUTOSAVE_KEY);
    return v === null ? true : v === "true";
  });
  useEffect(() => { localStorage.setItem(AUTOSAVE_KEY, String(autoSave)); }, [autoSave]);

  // History (persisted)
  const [history, setHistory] = useState<DashboardHistoryEntry[]>(() => loadHistory());
  const [showHistory, setShowHistory] = useState(false);

  // History filters (persisted)
  const FILTER_KEY = "hms-qa-history-filters";
  const persistedFilters = (() => {
    try { return JSON.parse(localStorage.getItem(FILTER_KEY) || "{}"); } catch { return {}; }
  })();
  const [filterField, setFilterField] = useState<"all" | FieldKey>(persistedFilters.field ?? "all");
  const [filterSource, setFilterSource] = useState<"all" | HistorySource>(persistedFilters.source ?? "all");
  const [filterFrom, setFilterFrom] = useState<string>(persistedFilters.from ?? "");
  const [filterTo, setFilterTo] = useState<string>(persistedFilters.to ?? "");
  const [filterQuery, setFilterQuery] = useState<string>(persistedFilters.query ?? "");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">(persistedFilters.sort ?? "newest");
  const [pageSize, setPageSize] = useState<number>(persistedFilters.pageSize ?? 10);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    localStorage.setItem(FILTER_KEY, JSON.stringify({
      field: filterField, source: filterSource, from: filterFrom, to: filterTo,
      query: filterQuery, sort: sortOrder, pageSize,
    }));
    setPage(1);
  }, [filterField, filterSource, filterFrom, filterTo, filterQuery, sortOrder, pageSize]);

  // Health settings (interval/enable for all URL badges)
  const [healthSettings, setHealthSettings] = useHealthSettings();

  // Import mode (merge | overwrite) — persisted
  const IMPORT_MODE_KEY = "hms-qa-import-mode";
  const [importMode, setImportMode] = useState<"merge" | "overwrite">(
    () => (localStorage.getItem(IMPORT_MODE_KEY) as any) === "overwrite" ? "overwrite" : "merge"
  );
  useEffect(() => { localStorage.setItem(IMPORT_MODE_KEY, importMode); }, [importMode]);

  // Health log
  const [healthLog, clearHealthLog] = useHealthLog();
  const [showHealthLog, setShowHealthLog] = useState(false);

  // Snapshot of last saved values for Undo
  const lastSnapshot = useRef<Partial<Record<FieldKey, string>>>({});

  const [confirm, setConfirm] = useState<null | { kind: FieldKey | "reset"; value?: string }>(null);
  const [rollbackConfirm, setRollbackConfirm] = useState<DashboardHistoryEntry | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const flashSaved = (key: string) => { setSavedFlash(key); setTimeout(() => setSavedFlash((k) => k === key ? null : k), 1400); };

  // Sync drafts when props change (project switch / external update)
  useEffect(() => { setEditInsight(insightText); }, [insightText]);
  useEffect(() => { setUrlDraft(learnMoreUrl); }, [learnMoreUrl]);
  useEffect(() => { setTitleDraft(insightTitle); }, [insightTitle]);
  useEffect(() => { setLabelDraft(learnMoreLabel); }, [learnMoreLabel]);

  const recordHistory = (field: FieldKey, oldValue: string, newValue: string, source: HistorySource = "manual") => {
    if (oldValue === newValue) return;
    const entry: DashboardHistoryEntry = {
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      field, oldValue, newValue, at: new Date().toISOString(), source,
    };
    const next = [entry, ...history].slice(0, HISTORY_MAX);
    setHistory(next); saveHistory(next);
  };

  const commitField = (field: FieldKey, newValue: string, source: HistorySource = "manual") => {
    const current = { insightText, insightTitle, learnMoreLabel, learnMoreUrl }[field];
    if (current === newValue) return;
    lastSnapshot.current[field] = current;
    recordHistory(field, current, newValue, source);
    if (field === "insightText") onUpdateInsight(newValue);
    if (field === "insightTitle") onUpdateInsightTitle(newValue);
    if (field === "learnMoreLabel") onUpdateLearnMoreLabel(newValue);
    if (field === "learnMoreUrl") onUpdateLearnMoreUrl(newValue);
    flashSaved(field);
  };

  // Debounced auto-save (only when autoSave ON & value valid) — tagged as "auto"
  const debInsight = useDebouncedCallback((v: string) => { if (!validateInsight(v)) commitField("insightText", v, "auto"); }, 600);
  const debTitle = useDebouncedCallback((v: string) => { if (!validateTitle(v)) commitField("insightTitle", v, "auto"); }, 600);
  const debLabel = useDebouncedCallback((v: string) => { if (!validateLabel(v)) commitField("learnMoreLabel", v, "auto"); }, 600);
  const debUrl = useDebouncedCallback((v: string) => {
    const check = isValidGoogleDriveUrl(v);
    if (!check.ok) { setUrlError(check.reason || "URL tidak valid"); return; }
    setUrlError(null);
    commitField("learnMoreUrl", v, "auto");
  }, 700);

  // Per-field validation (live)
  const titleError = useMemo(() => validateTitle(titleDraft), [titleDraft]);
  const labelError = useMemo(() => validateLabel(labelDraft), [labelDraft]);
  const insightError = useMemo(() => validateInsight(editInsight), [editInsight]);
  const urlValidation = useMemo(() => isValidGoogleDriveUrl(urlDraft), [urlDraft]);
  const liveUrlError = urlValidation.ok ? null : (urlValidation.reason || "URL tidak valid");

  // Saved Learn More URL validity (controls the Learn More button itself)
  const savedUrlValid = useMemo(() => isValidGoogleDriveUrl(learnMoreUrl).ok, [learnMoreUrl]);

  // Field-level state for autosave/manual + sync error display
  const handleUrlChange = (v: string) => {
    setUrlDraft(v);
    const check = isValidGoogleDriveUrl(v);
    setUrlError(check.ok ? null : (check.reason || "URL tidak valid"));
    if (autoSave && check.ok) debUrl(v);
  };

  const handleConfirmSaveUrl = () => {
    const check = isValidGoogleDriveUrl(urlDraft);
    if (!check.ok) { setUrlError(check.reason || "URL tidak valid"); return; }
    setConfirm({ kind: "learnMoreUrl", value: urlDraft });
  };

  const [historyExportFormat, setHistoryExportFormat] = useState<"raw" | "human">(
    () => (localStorage.getItem("hms-qa-history-export-format") as any) === "raw" ? "raw" : "human"
  );
  useEffect(() => { localStorage.setItem("hms-qa-history-export-format", historyExportFormat); }, [historyExportFormat]);

  // Saved filter presets for history
  const HISTORY_PRESET_SCOPE = "dashboard-history";
  const [historyPresets, setHistoryPresets] = useState<FilterPreset[]>(() => loadPresets(HISTORY_PRESET_SCOPE));
  useEffect(() => {
    const h = () => setHistoryPresets(loadPresets(HISTORY_PRESET_SCOPE));
    window.addEventListener(`hms-qa-filter-presets-change:${HISTORY_PRESET_SCOPE}`, h);
    return () => window.removeEventListener(`hms-qa-filter-presets-change:${HISTORY_PRESET_SCOPE}`, h);
  }, []);
  const saveCurrentHistoryFilter = () => {
    const name = window.prompt("Nama preset filter:", `Preset ${historyPresets.length + 1}`);
    if (!name) return;
    addPreset(HISTORY_PRESET_SCOPE, name, {
      field: filterField, source: filterSource, from: filterFrom, to: filterTo,
      query: filterQuery, sort: sortOrder, pageSize,
    });
  };
  const applyHistoryPreset = (id: string) => {
    const p = historyPresets.find((x) => x.id === id);
    if (!p) return;
    const v = p.values as any;
    setFilterField(v.field ?? "all"); setFilterSource(v.source ?? "all");
    setFilterFrom(v.from ?? ""); setFilterTo(v.to ?? "");
    setFilterQuery(v.query ?? ""); setSortOrder(v.sort ?? "newest");
    setPageSize(v.pageSize ?? 10);
  };

  const historyToShape = (h: DashboardHistoryEntry) => {
    if (historyExportFormat === "raw") return h;
    return {
      id: h.id,
      field_label: FIELD_LABELS[h.field],
      field_key: h.field,
      old_value: h.oldValue,
      new_value: h.newValue,
      changed_at: new Date(h.at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" }),
      changed_at_iso: h.at,
      source: h.source ?? "manual",
    };
  };

  // Multi-level Undo — pop most recent and restore old value
  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[0];
    const current = { insightText, insightTitle, learnMoreLabel, learnMoreUrl }[last.field];
    if (last.field === "insightText") onUpdateInsight(last.oldValue);
    if (last.field === "insightTitle") onUpdateInsightTitle(last.oldValue);
    if (last.field === "learnMoreLabel") onUpdateLearnMoreLabel(last.oldValue);
    if (last.field === "learnMoreUrl") onUpdateLearnMoreUrl(last.oldValue);
    const undoEntry: DashboardHistoryEntry = {
      id: `h-${Date.now()}-undo`, field: last.field, oldValue: current, newValue: last.oldValue,
      at: new Date().toISOString(), source: "undo",
    };
    const next = [undoEntry, ...history.slice(1)].slice(0, HISTORY_MAX);
    setHistory(next); saveHistory(next);
    flashSaved("undo");
  };

  // Rollback to a specific entry (restore its oldValue)
  const handleRollback = (entryId: string) => {
    const target = history.find((h) => h.id === entryId);
    if (!target) return;
    const current = { insightText, insightTitle, learnMoreLabel, learnMoreUrl }[target.field];
    if (target.field === "insightText") { onUpdateInsight(target.oldValue); setEditInsight(target.oldValue); }
    if (target.field === "insightTitle") { onUpdateInsightTitle(target.oldValue); setTitleDraft(target.oldValue); }
    if (target.field === "learnMoreLabel") { onUpdateLearnMoreLabel(target.oldValue); setLabelDraft(target.oldValue); }
    if (target.field === "learnMoreUrl") { onUpdateLearnMoreUrl(target.oldValue); setUrlDraft(target.oldValue); setUrlError(null); }
    const rollbackEntry: DashboardHistoryEntry = {
      id: `h-${Date.now()}-rb`, field: target.field, oldValue: current, newValue: target.oldValue,
      at: new Date().toISOString(), source: "rollback",
    };
    const next = [rollbackEntry, ...history].slice(0, HISTORY_MAX);
    setHistory(next); saveHistory(next);
    flashSaved("rollback");
  };

  const handleResetDefaults = () => {
    commitField("insightText", DASHBOARD_DEFAULTS.insightText, "reset");
    commitField("insightTitle", DASHBOARD_DEFAULTS.insightTitle, "reset");
    commitField("learnMoreLabel", DASHBOARD_DEFAULTS.learnMoreLabel, "reset");
    commitField("learnMoreUrl", DASHBOARD_DEFAULTS.learnMoreUrl, "reset");
    setEditInsight(DASHBOARD_DEFAULTS.insightText);
    setTitleDraft(DASHBOARD_DEFAULTS.insightTitle);
    setLabelDraft(DASHBOARD_DEFAULTS.learnMoreLabel);
    setUrlDraft(DASHBOARD_DEFAULTS.learnMoreUrl);
    setUrlError(null);
  };

  // Export history (uses currently filtered view + selected format)
  const buildHistoryExportName = (ext: "json" | "csv") => buildExportFilename({
    prefix: "dashboard-history",
    format: historyExportFormat,
    ext,
    from: filterFrom,
    to: filterTo,
    scope: { field: filterField, source: filterSource, q: filterQuery },
  });
  const exportHistoryJSON = () => {
    if (filteredHistory.length === 0) return;
    const data = filteredHistory.map(historyToShape);
    downloadFile(buildHistoryExportName("json"), JSON.stringify(data, null, 2), "application/json");
  };
  const exportHistoryCSV = () => {
    if (filteredHistory.length === 0) return;
    const data = filteredHistory.map(historyToShape);
    const headers = Object.keys(data[0]);
    const rows = data.map((row) => headers.map((h) => csvEscape(String((row as any)[h] ?? ""))).join(","));
    downloadFile(buildHistoryExportName("csv"), [headers.join(","), ...rows].join("\n"), "text/csv");
  };


  // Import history (JSON/CSV) with strict schema validation
  const VALID_FIELDS: FieldKey[] = ["insightText", "insightTitle", "learnMoreLabel", "learnMoreUrl"];
  const VALID_SOURCES: HistorySource[] = ["auto", "manual", "reset", "rollback", "undo", "import"];
  const validateEntry = (e: any): DashboardHistoryEntry | null => {
    if (!e || typeof e !== "object") return null;
    if (!VALID_FIELDS.includes(e.field)) return null;
    if (typeof e.oldValue !== "string" || typeof e.newValue !== "string") return null;
    if (typeof e.at !== "string" || isNaN(new Date(e.at).getTime())) return null;
    return {
      id: typeof e.id === "string" && e.id ? e.id : `h-imp-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      field: e.field, oldValue: e.oldValue, newValue: e.newValue, at: e.at,
      source: (VALID_SOURCES.includes(e.source) ? e.source : "import") as HistorySource,
    };
  };
  const parseCSV = (text: string): any[] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const fields: string[] = []; let cur = ""; let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (inQ) {
          if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
          else if (c === '"') { inQ = false; }
          else cur += c;
        } else {
          if (c === '"') inQ = true;
          else if (c === ",") { fields.push(cur); cur = ""; }
          else cur += c;
        }
      }
      fields.push(cur);
      const obj: any = {};
      headers.forEach((h, i) => obj[h] = fields[i] ?? "");
      return obj;
    });
  };
  const handleImportHistory = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv,application/json,text/csv";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const text = ev.target?.result as string;
          const raw: any[] = file.name.toLowerCase().endsWith(".csv") ? parseCSV(text) : JSON.parse(text);
          if (!Array.isArray(raw)) throw new Error("Format harus array");
          const valid = raw.map(validateEntry).filter((x): x is DashboardHistoryEntry => !!x);
          if (valid.length === 0) { alert("Tidak ada entry valid di file ini."); return; }
          let next: DashboardHistoryEntry[];
          if (importMode === "overwrite") {
            if (!window.confirm(`Mode OVERWRITE: ${history.length} riwayat saat ini akan dihapus dan diganti dengan ${valid.length} entry. Lanjutkan?`)) return;
            next = valid.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, HISTORY_MAX);
          } else {
            const map = new Map<string, DashboardHistoryEntry>();
            [...valid, ...history].forEach((h) => map.set(h.id, h));
            next = Array.from(map.values())
              .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
              .slice(0, HISTORY_MAX);
          }
          setHistory(next); saveHistory(next);
          alert(`Berhasil mengimpor ${valid.length} entry (${importMode}). Total riwayat: ${next.length}.`);
        } catch (err: any) {
          alert(`Gagal mengimpor: ${err?.message || "format tidak valid"}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Filtered + sorted history view
  const filteredHistory = useMemo(() => {
    const fromTs = filterFrom ? new Date(filterFrom).getTime() : -Infinity;
    const toTs = filterTo ? new Date(filterTo).getTime() + 86400000 : Infinity;
    const q = filterQuery.trim().toLowerCase();
    const list = history.filter((h) => {
      if (filterField !== "all" && h.field !== filterField) return false;
      const src = h.source ?? "manual";
      if (filterSource !== "all" && src !== filterSource) return false;
      const t = new Date(h.at).getTime();
      if (isNaN(t) || t < fromTs || t > toTs) return false;
      if (q && !((h.oldValue || "").toLowerCase().includes(q) || (h.newValue || "").toLowerCase().includes(q))) return false;
      return true;
    });
    list.sort((a, b) => {
      const da = new Date(a.at).getTime(), db = new Date(b.at).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
    return list;
  }, [history, filterField, filterSource, filterFrom, filterTo, filterQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedHistory = useMemo(
    () => filteredHistory.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredHistory, safePage, pageSize]
  );

  const resetFilters = () => {
    setFilterField("all"); setFilterSource("all");
    setFilterFrom(""); setFilterTo(""); setFilterQuery("");
    setSortOrder("newest"); setPageSize(10);
  };

  // Export full Admin Mode settings as a single JSON file
  const exportAllSettings = () => {
    const cfg = exportFullConfig ? exportFullConfig() : {
      insightText, insightTitle, learnMoreLabel, learnMoreUrl,
      stats, submoduleStats, categories, userName, releaseDeadline,
    };
    const payload = {
      schema: "hms-qa-hub-admin-settings",
      version: 1,
      exportedAt: new Date().toISOString(),
      config: cfg,
      history,
    };
    downloadFile(
      `hms-qa-admin-settings-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  };

  const importAllSettings = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (!data || data.schema !== "hms-qa-hub-admin-settings") {
            alert("File tidak dikenali (schema bukan hms-qa-hub-admin-settings).");
            return;
          }
          const modeLabel = importMode === "overwrite" ? "OVERWRITE (ganti total)" : "MERGE (gabung)";
          if (!window.confirm(`Impor pengaturan Admin Mode dengan mode ${modeLabel}?`)) return;
          if (Array.isArray(data.history)) {
            const valid = data.history.map(validateEntry).filter((x: any): x is DashboardHistoryEntry => !!x);
            let nextHist: DashboardHistoryEntry[];
            if (importMode === "overwrite") {
              nextHist = valid.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, HISTORY_MAX);
            } else {
              const map = new Map<string, DashboardHistoryEntry>();
              [...valid, ...history].forEach((h) => map.set(h.id, h));
              nextHist = Array.from(map.values())
                .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
                .slice(0, HISTORY_MAX);
            }
            setHistory(nextHist); saveHistory(nextHist);
          }
          if (data.config) {
            const c = data.config;
            if (importMode === "overwrite" && importFullConfig) {
              importFullConfig(c);
            } else {
              // Merge: shallow-merge known fields only
              if (typeof c.insightText === "string") onUpdateInsight(c.insightText);
              if (typeof c.insightTitle === "string") onUpdateInsightTitle(c.insightTitle);
              if (typeof c.learnMoreLabel === "string") onUpdateLearnMoreLabel(c.learnMoreLabel);
              if (typeof c.learnMoreUrl === "string") onUpdateLearnMoreUrl(c.learnMoreUrl);
              if (typeof c.userName === "string") onUpdateUserName(c.userName);
              if (typeof c.releaseDeadline === "string") onUpdateDeadline(c.releaseDeadline);
              if (importFullConfig) importFullConfig({
                ...(typeof c.insightText === "string" ? { insightText: c.insightText } : {}),
                ...(typeof c.insightTitle === "string" ? { insightTitle: c.insightTitle } : {}),
                ...(typeof c.learnMoreLabel === "string" ? { learnMoreLabel: c.learnMoreLabel } : {}),
                ...(typeof c.learnMoreUrl === "string" ? { learnMoreUrl: c.learnMoreUrl } : {}),
              });
            }
          }
          alert(`Impor selesai (${importMode}).`);
        } catch (err: any) {
          alert(`Gagal impor: ${err?.message || "format tidak valid"}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const insightEditing = editMode || globalEditMode;

  const passRate = stats.totalTC > 0 ? ((stats.passed / stats.totalTC) * 100).toFixed(1) : "0";
  const countdown = useCountdown(releaseDeadline);
  const greeting = getGreeting();
  const pendingCount = stats.pending;

  const cards = [
    { label: "Total Test Cases", value: stats.totalTC, icon: BarChart3, color: "text-stat-total", bg: "bg-blue-50", glow: false },
    { label: "Passed", value: stats.passed, icon: CheckCircle, color: "text-stat-passed", bg: "bg-emerald-50", glow: false },
    { label: "Failed", value: stats.failed, icon: XCircle, color: "text-stat-failed", bg: "bg-red-50", glow: stats.failed > 0 },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-stat-pending", bg: "bg-amber-50", glow: false },
  ];

  const pieData = useMemo(() => {
    const result: { name: string; value: number }[] = [];
    for (const cat of categories) {
      let total = 0;
      for (const sub of cat.submodules) {
        const s = submoduleStats[sub.id];
        if (s) total += s.totalTC;
      }
      if (total > 0) result.push({ name: cat.name, value: total });
    }
    return result;
  }, [categories, submoduleStats]);

  const lineData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of journalEntries) {
      const d = j.date || j.createdAt.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, count]) => ({ date: date.slice(5), entries: count }));
  }, [journalEntries]);

  const nameError = useMemo(() => validateName(nameDraft), [nameDraft]);
  const deadlineError = useMemo(() => validateDeadline(deadlineDraft), [deadlineDraft]);
  const profileValid = !nameError && !deadlineError;

  const handleSaveProfile = () => {
    if (!profileValid) return;
    onUpdateUserName(nameDraft.trim());
    onUpdateDeadline(deadlineDraft);
    setEditingProfile(false);
  };

  // Generate Summary Report (CSV download — Excel-compatible)
  const generateReport = () => {
    const passRate = stats.totalTC > 0 ? ((stats.passed / stats.totalTC) * 100).toFixed(1) : "0";
    const lines: string[] = [];
    lines.push(`HMS QA HUB - Summary Report`);
    lines.push(`Environment,${env}`);
    lines.push(`Generated At,${new Date().toLocaleString("id-ID")}`);
    lines.push(``);
    lines.push(`Metric,Value`);
    lines.push(`Total Test Cases,${stats.totalTC}`);
    lines.push(`Passed,${stats.passed}`);
    lines.push(`Failed,${stats.failed}`);
    lines.push(`Pending,${stats.pending}`);
    lines.push(`Pass Rate,${passRate}%`);
    lines.push(``);
    lines.push(`Submodule,Total,Passed,Failed,Pending`);
    for (const cat of categories) {
      for (const sub of cat.submodules) {
        const s = submoduleStats[sub.id];
        if (!s) continue;
        lines.push([sub.name, s.totalTC, s.passed, s.failed, s.pending].map((x) => csvEscape(String(x))).join(","));
      }
    }
    downloadFile(`qa-summary-${env}-${new Date().toISOString().slice(0,10)}.csv`, lines.join("\n"), "text/csv");
  };

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-emerald-50 to-blue-50 dark:from-primary/20 dark:via-emerald-900/20 dark:to-blue-900/20 rounded-2xl border border-border p-6 relative">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Sparkles size={12} /> {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {greeting}, {userName}! 👋
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {pendingCount > 0
                ? <>Ada <span className="font-semibold text-amber-600">{pendingCount} test case pending</span> yang menunggu verifikasimu hari ini.</>
                : stats.failed > 0
                ? <>Ada <span className="font-semibold text-red-600">{stats.failed} test case failed</span> yang perlu di-retest.</>
                : stats.totalTC > 0
                ? <>Semua test case dalam kondisi baik. Pertahankan kualitasnya! 🎉</>
                : <>Mulai catat test case pertamamu untuk membangun confidence rilis.</>}
            </p>
          </div>
          <button onClick={() => { setNameDraft(userName); setDeadlineDraft(releaseDeadline); setEditingProfile(true); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Edit2 size={12} /> Edit Profile
          </button>
        </div>

        {editingProfile && (
          <div className="mt-4 p-3 bg-card rounded-lg border border-border space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Nama Panggilan</label>
                <input value={nameDraft} maxLength={50} onChange={(e) => setNameDraft(e.target.value)}
                  className={`w-full px-2 py-1.5 rounded border bg-background text-sm mt-1 ${nameError ? "border-red-400" : "border-input"}`} />
                {nameError && <p className="text-[10px] text-red-600 mt-1 inline-flex items-center gap-1"><AlertCircle size={10}/>{nameError}</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Deadline Rilis</label>
                <input type="datetime-local" value={deadlineDraft} onChange={(e) => setDeadlineDraft(e.target.value)}
                  className={`w-full px-2 py-1.5 rounded border bg-background text-sm mt-1 ${deadlineError ? "border-red-400" : "border-input"}`} />
                {deadlineError && <p className="text-[10px] text-red-600 mt-1 inline-flex items-center gap-1"><AlertCircle size={10}/>{deadlineError}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingProfile(false)} className="px-3 py-1 text-xs rounded border border-border text-muted-foreground">Cancel</button>
              <button onClick={handleSaveProfile} disabled={!profileValid} className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground disabled:opacity-50">Save</button>
            </div>
          </div>
        )}

        {countdown && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar size={12} />
              {countdown.past ? "Lewat dari deadline:" : "Menuju rilis:"}
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { v: countdown.d, l: "Hari" },
                { v: countdown.h, l: "Jam" },
                { v: countdown.m, l: "Min" },
                { v: countdown.s, l: "Det" },
              ].map((c) => (
                <div key={c.l} className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${countdown.past ? "bg-red-100 text-red-700" : "bg-card text-foreground border border-border"}`}>
                  {String(c.v).padStart(2, "0")}<span className="ml-1 text-[9px] font-normal opacity-60">{c.l}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <RegressionAlert categories={categories} submoduleStats={submoduleStats} env={env} />



      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Overview of QA test execution</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {globalEditMode && (
            <>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground border border-border rounded-md px-2 py-1.5 bg-card">
                <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} className="accent-primary" />
                Auto-save
              </label>
              <button onClick={handleUndo} disabled={history.length === 0}
                className="text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 inline-flex items-center gap-1">
                <Undo2 size={12} /> Undo
              </button>
              <button onClick={() => setShowHistory(true)}
                className="text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted inline-flex items-center gap-1">
                <History size={12} /> History ({history.length})
              </button>
              <button onClick={() => setShowHealthLog(true)}
                className="text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted inline-flex items-center gap-1">
                <ShieldCheck size={12} /> Health Log ({healthLog.length})
              </button>
              <button onClick={() => setConfirm({ kind: "reset" })}
                className="text-xs px-2.5 py-1.5 rounded-md border border-amber-300 text-amber-700 hover:bg-amber-50 inline-flex items-center gap-1">
                <RotateCcw size={12} /> Reset Defaults
              </button>
              <button onClick={() => triggerRecheckAll()}
                className="text-xs px-2.5 py-1.5 rounded-md border border-border text-muted-foreground hover:bg-muted inline-flex items-center gap-1"
                title="Re-check semua URL Learn More & embed Docs/Sheets sekarang">
                <RefreshCw size={12} /> Run Healthcheck Now
              </button>
            </>
          )}
          {isAdmin && (
            <button onClick={() => setShowRegressionSettings(true)}
              className="text-xs px-2.5 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50 inline-flex items-center gap-1"
              title="Atur threshold regression">
              <AlertTriangle size={12} /> Regression Settings
            </button>
          )}
          <button
            onClick={() => setShowReport(true)}
            disabled={!isAdmin}
            title={isAdmin ? "Generate report" : "Hanya Admin QA yang dapat generate report"}
            className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-40 disabled:cursor-not-allowed">
            {isAdmin ? <FileSpreadsheet size={14} /> : <Lock size={14} />} Generate Report
          </button>
          {env === "staging" && onSyncToProduction && (
            <button
              onClick={() => setShowSyncDiff(true)}
              disabled={!isAdmin}
              title={isAdmin ? "Preview & sync to production" : "Hanya Admin QA yang dapat sync"}
              className="flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 disabled:opacity-40 disabled:cursor-not-allowed">
              {isAdmin ? <Upload size={14} /> : <Lock size={14} />} Sync to Production
            </button>
          )}
          <button
            onClick={() => { if (!isAdmin) return; setEditMode(!editMode); if (!editMode) onEditStats(); }}
            disabled={!isAdmin}
            title={isAdmin ? "Edit stats" : "Hanya Admin QA yang dapat mengubah stats"}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${editMode ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted text-muted-foreground"}`}>
            {isAdmin ? <Edit2 size={14} /> : <Lock size={14} />} {editMode ? "Editing..." : "Edit Stats"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label}
            className={`bg-card rounded-xl border border-border p-5 shadow-sm transition-shadow ${card.glow ? "shadow-red-200 ring-1 ring-red-200 animate-pulse" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</span>
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon size={18} className={card.color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{Number(card.value ?? 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Distribution per Category</h3>
          {pieData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
              Belum ada data submodule. Isi statistik per submodule untuk melihat chart.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Daily Execution Trend (Journal)</h3>
          {lineData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
              Belum ada entry jurnal. Tambahkan Daily Journal untuk lihat tren.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="entries" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Analytics */}
        <div className="bg-gradient-to-br from-emerald-50 via-card to-card dark:from-emerald-950/30 rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">Live Analytics — Auto Pass Rate</h3>
          </div>
          <div className="text-center mb-5">
            <p className="text-6xl font-extrabold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
              {passRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
              {Number(stats.passed ?? 0)} of {Number(stats.totalTC ?? 0)} test cases passed
            </p>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden mb-5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(6,78,59,0.5)]"
              style={{ width: `${Math.min(Number(passRate), 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
              <p className="text-lg font-bold text-stat-passed">{Number(stats.passed ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Passed</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950/40 rounded-lg">
              <p className="text-lg font-bold text-stat-failed">{Number(stats.failed ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Failed</p>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
              <p className="text-lg font-bold text-stat-pending">{Number(stats.pending ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>

        {/* QA Insight */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Lightbulb size={18} className="text-amber-500 shrink-0" />
              {globalEditMode ? (
                <input
                  value={titleDraft}
                  maxLength={80}
                  onChange={(e) => { setTitleDraft(e.target.value); if (autoSave) debTitle(e.target.value); }}
                  className={`font-semibold text-foreground bg-transparent border-b border-dashed focus:outline-none focus:border-primary text-sm flex-1 min-w-0 ${titleError ? "border-red-400" : "border-border"}`}
                  placeholder="Card title..."
                />
              ) : (
                <h3 className="font-semibold text-foreground truncate">{insightTitle}</h3>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {savedFlash === "insightTitle" && <span className="text-[10px] text-emerald-600 inline-flex items-center gap-0.5"><Check size={10}/>Saved</span>}
              {globalEditMode && !autoSave && titleDraft !== insightTitle && (
                <button onClick={() => setConfirm({ kind: "insightTitle", value: titleDraft })}
                  disabled={!!titleError}
                  className="text-[10px] px-2 py-0.5 rounded border border-border text-primary hover:bg-muted disabled:opacity-40">Save</button>
              )}
              {globalEditMode && (
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Admin</span>
              )}
            </div>
          </div>
          {globalEditMode && titleError && (
            <p className="text-[10px] text-red-600 -mt-2 mb-2 inline-flex items-center gap-1"><AlertCircle size={10}/>{titleError}</p>
          )}
          <div className="flex-1 flex items-center justify-center">
            {insightEditing ? (
              <div className="w-full space-y-2">
                <textarea
                  value={editInsight}
                  maxLength={500}
                  onChange={(e) => { setEditInsight(e.target.value); if (autoSave) debInsight(e.target.value); }}
                  className={`w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none ${insightError ? "border-red-400" : "border-input"}`}
                  rows={4}
                  placeholder="Tulis insight QA hari ini..."
                />
                {insightError && (
                  <p className="text-[10px] text-red-600 inline-flex items-center gap-1"><AlertCircle size={10}/>{insightError}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {savedFlash === "insightText" ? <span className="text-emerald-600 inline-flex items-center gap-0.5"><Check size={10}/>Saved</span>
                      : autoSave ? "Auto-save aktif (debounce 600ms)" : "Auto-save OFF — klik Save untuk simpan"}
                    <span className="ml-2 opacity-60">{editInsight.length}/500</span>
                  </span>
                  <button
                    onClick={() => setConfirm({ kind: "insightText", value: editInsight })}
                    disabled={editInsight === insightText || !!insightError}
                    className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted inline-flex items-center gap-1 disabled:opacity-40"
                  >
                    <Save size={11} /> Save now
                  </button>
                </div>
              </div>
            ) : (
              <blockquote className="text-center italic text-muted-foreground text-base leading-relaxed px-4">"{insightText}"</blockquote>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {globalEditMode && (
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide w-16 shrink-0 mt-1.5">CTA Text</label>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        value={labelDraft}
                        maxLength={40}
                        onChange={(e) => { setLabelDraft(e.target.value); if (autoSave) debLabel(e.target.value); }}
                        placeholder="Button label..."
                        className={`flex-1 px-2 py-1 rounded border bg-background text-xs ${labelError ? "border-red-400" : "border-input"}`}
                      />
                      {savedFlash === "learnMoreLabel" && <Check size={12} className="text-emerald-600" />}
                      {!autoSave && labelDraft !== learnMoreLabel && (
                        <button onClick={() => setConfirm({ kind: "learnMoreLabel", value: labelDraft })}
                          disabled={!!labelError}
                          className="text-[10px] px-2 py-1 rounded border border-border text-primary hover:bg-muted disabled:opacity-40">Save</button>
                      )}
                    </div>
                    {labelError && (
                      <p className="text-[10px] text-red-600 inline-flex items-center gap-1"><AlertCircle size={10}/>{labelError}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide w-16 shrink-0 mt-1.5">URL</label>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <input
                        value={urlDraft}
                        maxLength={500}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className={`flex-1 px-2 py-1 rounded border bg-background text-xs ${liveUrlError ? "border-red-400" : urlDraft ? "border-emerald-400" : "border-input"}`}
                      />
                      {savedFlash === "learnMoreUrl" && <Check size={12} className="text-emerald-600" />}
                      <button
                        onClick={handleConfirmSaveUrl}
                        disabled={!!liveUrlError || urlDraft === learnMoreUrl}
                        className="text-[10px] px-2 py-1 rounded border border-border text-primary hover:bg-muted disabled:opacity-40"
                        title={liveUrlError || "Validasi & Konfirmasi simpan URL"}
                      >
                        Confirm
                      </button>
                    </div>
                    {liveUrlError ? (
                      <p className="text-[10px] text-red-600 inline-flex items-center gap-1">
                        <ShieldAlert size={11}/> {liveUrlError}
                      </p>
                    ) : urlDraft ? (
                      <p className="text-[10px] text-emerald-600 inline-flex items-center gap-1">
                        <ShieldCheck size={11}/> URL valid (Google Drive/Docs/Sheets)
                        {urlDraft !== learnMoreUrl && <span className="ml-1 text-amber-600">— belum disimpan, klik Confirm</span>}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Masukkan URL Google Drive/Docs/Sheets</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              {savedUrlValid ? (
                <a href={learnMoreUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  <ExternalLink size={12} /> {learnMoreLabel || "Learn More"}
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="URL Learn More tidak valid — perbaiki di Admin Mode"
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                >
                  <Ban size={12} /> {learnMoreLabel || "Learn More"} (URL invalid)
                </button>
              )}
              {globalEditMode && (
                <span className="text-[10px] text-muted-foreground">{autoSave ? "Auto-save aktif" : "Manual save"}</span>
              )}
            </div>
            {savedUrlValid && learnMoreUrl && (
              <div className="mt-2">
                <UrlHealthBadge url={learnMoreUrl} label="Learn More" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <History size={16} className="text-primary" />
                <h3 className="font-semibold text-foreground">Riwayat Perubahan Dashboard</h3>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-xs text-muted-foreground hover:text-foreground">Tutup</button>
            </div>
            {/* Filters */}
            <div className="p-3 border-b border-border bg-muted/30 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select value={filterField} onChange={(e) => setFilterField(e.target.value as any)}
                  className="text-xs px-2 py-1 rounded border border-input bg-background">
                  <option value="all">Semua field</option>
                  <option value="insightText">Insight Text</option>
                  <option value="insightTitle">Insight Title</option>
                  <option value="learnMoreLabel">CTA Label</option>
                  <option value="learnMoreUrl">Learn More URL</option>
                </select>
                <select value={filterSource} onChange={(e) => setFilterSource(e.target.value as any)}
                  className="text-xs px-2 py-1 rounded border border-input bg-background">
                  <option value="all">Semua sumber</option>
                  <option value="auto">Auto</option>
                  <option value="manual">Manual</option>
                  <option value="rollback">Rollback</option>
                  <option value="undo">Undo</option>
                  <option value="reset">Reset</option>
                  <option value="import">Import</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-input bg-background" placeholder="Dari" />
                <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-input bg-background" placeholder="Sampai" />
              </div>
              <div className="flex gap-2">
                <input type="text" value={filterQuery} onChange={(e) => setFilterQuery(e.target.value)}
                  placeholder="Cari di old/new value..."
                  className="flex-1 text-xs px-2 py-1 rounded border border-input bg-background" />
                <button onClick={resetFilters}
                  className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted">
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)}
                  className="text-xs px-2 py-1 rounded border border-input bg-background">
                  <option value="newest">Terbaru dulu</option>
                  <option value="oldest">Terlama dulu</option>
                </select>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                  className="text-xs px-2 py-1 rounded border border-input bg-background">
                  {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n} / halaman</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1"><Bookmark size={10}/>Preset:</span>
                <select onChange={(e) => { if (e.target.value) { applyHistoryPreset(e.target.value); e.target.value = ""; } }}
                  className="text-[11px] px-1.5 py-0.5 rounded border border-input bg-background">
                  <option value="">— Pilih preset —</option>
                  {historyPresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={saveCurrentHistoryFilter}
                  className="text-[11px] px-2 py-0.5 rounded border border-primary text-primary hover:bg-primary/10 inline-flex items-center gap-1">
                  <Bookmark size={10}/> Save Filter
                </button>
                {historyPresets.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {historyPresets.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {p.name}
                        <button onClick={() => deletePreset(HISTORY_PRESET_SCOPE, p.id)} className="hover:text-red-600" title="Hapus preset">
                          <X size={9}/>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-muted-foreground">Format ekspor:</span>
                <select value={historyExportFormat} onChange={(e) => setHistoryExportFormat(e.target.value as any)}
                  className="text-[11px] px-1.5 py-0.5 rounded border border-input bg-background">
                  <option value="human">Human-readable</option>
                  <option value="raw">Raw</option>
                </select>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Menampilkan {pagedHistory.length} dari {filteredHistory.length} (total {history.length}) · Halaman {safePage}/{totalPages}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada perubahan tersimpan.</p>
              ) : filteredHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Tidak ada entry yang cocok dengan filter.</p>
              ) : pagedHistory.map((h) => {
                const src = h.source ?? "manual";
                const srcStyle = src === "auto" ? "bg-blue-100 text-blue-700" :
                  src === "manual" ? "bg-emerald-100 text-emerald-700" :
                  src === "rollback" ? "bg-purple-100 text-purple-700" :
                  src === "undo" ? "bg-amber-100 text-amber-700" :
                  src === "reset" ? "bg-red-100 text-red-700" :
                  "bg-muted text-muted-foreground";
                const SrcIcon = src === "auto" ? Zap : src === "manual" ? Hand : src === "rollback" ? RotateCcw : src === "undo" ? Undo2 : src === "reset" ? RefreshCw : Upload;
                return (
                  <div key={h.id} className="border border-border rounded-lg p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{FIELD_LABELS[h.field]}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${srcStyle}`}>
                          <SrcIcon size={9} /> {src.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{new Date(h.at).toLocaleString("id-ID")}</span>
                    </div>
                    <div className="text-muted-foreground">
                      <span className="line-through opacity-60 break-all">{h.oldValue || "(kosong)"}</span>
                      <span className="mx-1">→</span>
                      <span className="text-foreground break-all">{h.newValue || "(kosong)"}</span>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => setRollbackConfirm(h)}
                        title="Kembalikan ke nilai sebelum perubahan ini"
                        className="text-[10px] px-2 py-0.5 rounded border border-border text-purple-700 hover:bg-purple-50 inline-flex items-center gap-1"
                      >
                        <RotateCcw size={10} /> Rollback ke titik ini
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Pagination */}
            <div className="px-3 py-2 border-t border-border flex items-center justify-between gap-2 text-xs">
              <button onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage <= 1}
                className="px-2 py-1 rounded border border-border disabled:opacity-40">‹ Prev</button>
              <span className="text-muted-foreground">Halaman {safePage} dari {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages}
                className="px-2 py-1 rounded border border-border disabled:opacity-40">Next ›</button>
            </div>
            {/* Import mode + Healthcheck controls */}
            <div className="px-3 py-2 border-t border-border space-y-2 bg-muted/20">
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="text-muted-foreground font-medium">Mode Import:</span>
                <label className="inline-flex items-center gap-1">
                  <input type="radio" name="importMode" checked={importMode === "merge"} onChange={() => setImportMode("merge")} />
                  Merge (gabung)
                </label>
                <label className="inline-flex items-center gap-1">
                  <input type="radio" name="importMode" checked={importMode === "overwrite"} onChange={() => setImportMode("overwrite")} />
                  Overwrite (timpa)
                </label>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                <span className="text-muted-foreground font-medium">Healthcheck:</span>
                <label className="inline-flex items-center gap-1">
                  <input type="checkbox" checked={healthSettings.enabled}
                    onChange={(e) => setHealthSettings({ ...healthSettings, enabled: e.target.checked })} />
                  Auto
                </label>
                <select value={healthSettings.intervalMs} disabled={!healthSettings.enabled}
                  onChange={(e) => setHealthSettings({ ...healthSettings, intervalMs: Number(e.target.value) })}
                  className="text-[11px] px-1.5 py-0.5 rounded border border-input bg-background disabled:opacity-50">
                  {HEALTH_INTERVAL_OPTIONS.filter((o) => o.value > 0).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button onClick={() => triggerRecheckAll()}
                  className="px-2 py-0.5 rounded border border-primary text-primary hover:bg-primary/10 inline-flex items-center gap-1">
                  <RefreshCw size={11} /> Run Healthcheck Now
                </button>
              </div>
            </div>
            <div className="p-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={exportHistoryJSON} disabled={filteredHistory.length === 0}
                  title={`Export ${filteredHistory.length} entri (hasil filter)`}
                  className="text-xs px-3 py-1.5 rounded border border-border text-foreground hover:bg-muted inline-flex items-center gap-1 disabled:opacity-40">
                  <FileJson size={12} /> Export Filtered JSON ({filteredHistory.length})
                </button>
                <button onClick={exportHistoryCSV} disabled={filteredHistory.length === 0}
                  title={`Export ${filteredHistory.length} entri (hasil filter)`}
                  className="text-xs px-3 py-1.5 rounded border border-border text-foreground hover:bg-muted inline-flex items-center gap-1 disabled:opacity-40">
                  <FileSpreadsheet size={12} /> Export Filtered CSV ({filteredHistory.length})
                </button>
                <button onClick={handleImportHistory}
                  className="text-xs px-3 py-1.5 rounded border border-border text-foreground hover:bg-muted inline-flex items-center gap-1">
                  <Upload size={12} /> Import History
                </button>
                <button onClick={exportAllSettings}
                  className="text-xs px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary/10 inline-flex items-center gap-1">
                  <FileJson size={12} /> Export Semua Pengaturan
                </button>
                <button onClick={importAllSettings}
                  className="text-xs px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary/10 inline-flex items-center gap-1">
                  <Upload size={12} /> Import Semua Pengaturan
                </button>
                <button onClick={handleUndo} disabled={history.length === 0}
                  className="text-xs px-3 py-1.5 rounded border border-border text-foreground hover:bg-muted inline-flex items-center gap-1 disabled:opacity-40">
                  <Undo2 size={12} /> Undo Last
                </button>
              </div>
              <button onClick={() => { if (window.confirm("Hapus semua riwayat perubahan?")) { setHistory([]); saveHistory([]); } }}
                disabled={history.length === 0}
                className="text-xs px-3 py-1.5 rounded border border-border text-red-600 hover:bg-red-50 disabled:opacity-40">
                Hapus Riwayat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Health Log Panel */}
      {showHealthLog && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowHealthLog(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-primary" />
                <h3 className="font-semibold text-foreground">Healthcheck Log per URL</h3>
              </div>
              <button onClick={() => setShowHealthLog(false)} className="text-xs text-muted-foreground hover:text-foreground">Tutup</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {healthLog.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada hasil healthcheck.</p>
              ) : healthLog.map((h) => (
                <div key={h.id} className="border border-border rounded-lg p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                      h.status === "ok" ? "bg-emerald-100 text-emerald-700" :
                      h.status === "error" ? "bg-red-100 text-red-700" :
                      h.status === "warn" ? "bg-amber-100 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>{h.status.toUpperCase()}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(h.checkedAt).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="text-foreground break-all">{h.url}</div>
                  <div className="text-muted-foreground">{h.message}</div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => downloadFile(`health-log-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(healthLog, null, 2), "application/json")}
                  disabled={healthLog.length === 0}
                  className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted inline-flex items-center gap-1 disabled:opacity-40">
                  <FileJson size={12} /> Export JSON
                </button>
                <button onClick={() => {
                  const header = "id,url,status,message,checkedAt";
                  const rows = healthLog.map((h) => [h.id, h.url, h.status, h.message, h.checkedAt].map(csvEscape).join(","));
                  downloadFile(`health-log-${new Date().toISOString().slice(0,10)}.csv`, [header, ...rows].join("\n"), "text/csv");
                }} disabled={healthLog.length === 0}
                  className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted inline-flex items-center gap-1 disabled:opacity-40">
                  <FileSpreadsheet size={12} /> Export CSV
                </button>
                <button onClick={() => triggerRecheckAll()}
                  className="text-xs px-3 py-1.5 rounded border border-primary text-primary hover:bg-primary/10 inline-flex items-center gap-1">
                  <RefreshCw size={12} /> Run All Now
                </button>
              </div>
              <button onClick={() => { if (window.confirm("Hapus seluruh log healthcheck?")) clearHealthLog(); }}
                disabled={healthLog.length === 0}
                className="text-xs px-3 py-1.5 rounded border border-border text-red-600 hover:bg-red-50 disabled:opacity-40">
                Hapus Log
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === "reset" ? "Reset ke Default" : "Konfirmasi Simpan Perubahan"}
        description={
          confirm?.kind === "reset"
            ? "Insight, judul, CTA label, dan URL akan dikembalikan ke nilai default. Lanjutkan?"
            : confirm?.kind === "learnMoreUrl"
            ? `Simpan URL Learn More menjadi: ${confirm.value || "(kosong)"}?`
            : confirm?.kind === "insightText"
            ? "Simpan teks insight saat ini?"
            : confirm?.kind === "insightTitle"
            ? `Simpan judul kartu menjadi: "${confirm.value}"?`
            : confirm?.kind === "learnMoreLabel"
            ? `Simpan CTA label menjadi: "${confirm.value}"?`
            : "Simpan perubahan?"
        }
        variant={confirm?.kind === "reset" ? "danger" : "default"}
        confirmLabel={confirm?.kind === "reset" ? "Ya, Reset" : "Ya, Simpan"}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "reset") handleResetDefaults();
          else commitField(confirm.kind, confirm.value ?? "");
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={!!rollbackConfirm}
        title="Konfirmasi Rollback"
        description={
          rollbackConfirm
            ? `Kembalikan field "${FIELD_LABELS[rollbackConfirm.field]}" ke nilai sebelum perubahan pada ${new Date(rollbackConfirm.at).toLocaleString("id-ID")}? Nilai akan menjadi: "${rollbackConfirm.oldValue || "(kosong)"}"`
            : ""
        }
        variant="danger"
        confirmLabel="Ya, Rollback"
        onConfirm={() => {
          if (rollbackConfirm) handleRollback(rollbackConfirm.id);
          setRollbackConfirm(null);
        }}
        onCancel={() => setRollbackConfirm(null)}
      />

      <ReportDialog
        open={showReport}
        onClose={() => setShowReport(false)}
        input={{
          projectTitle: projectTitle || "HMS QA HUB",
          env,
          stats,
          categories,
          submoduleStats,
        }}
      />

      <SyncDiffDialog
        open={showSyncDiff}
        onClose={() => setShowSyncDiff(false)}
        projectId={projectId}
        categories={categories}
        stagingStats={submoduleStats}
        onConfirm={() => {
          const r = onSyncToProduction?.();
          if (r) alert(`Sync selesai. ${r.copied} submodule disalin ke Production.`);
        }}
      />

      <RegressionSettingsDialog
        open={showRegressionSettings}
        onClose={() => setShowRegressionSettings(false)}
        categories={categories}
        onSaved={() => window.dispatchEvent(new CustomEvent("hms-qa-regression-settings-change"))}
      />
    </div>
  );
}
