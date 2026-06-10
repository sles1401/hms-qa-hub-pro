import { useState, useMemo, useRef, useEffect } from "react";
import { History, Trash2, Download, Search, Upload, AlertCircle, Bookmark, X, Eye } from "lucide-react";
import { type AuditLogEntry, type AuditSource } from "@/lib/store";
import ImportPreviewDialog, { type PreviewRow } from "@/components/ImportPreviewDialog";
import ExportPreviewDialog from "@/components/ExportPreviewDialog";
import { loadPresets, addPreset, deletePreset, type FilterPreset } from "@/lib/savedFilters";
import { buildExportFilename } from "@/lib/exportFilename";
import type { Severity } from "@/lib/adminSettings";

interface Props {
  log: AuditLogEntry[];
  onClear: () => void;
  onImport?: (entries: AuditLogEntry[], mode: "merge" | "overwrite") => void;
}

type AuditFilters = { user: string; target: string; from: string; to: string; q: string; source: string };
const FILTER_KEY = "hms-qa-audit-filters";
const PRESET_SCOPE = "audit";

function csvEsc(v: any) { return `"${String(v ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`; }
function dl(name: string, content: string, mime: string) {
  const u = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a"); a.href = u; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 500);
}

function validateEntry(p: any): { entry: AuditLogEntry | null; errors: string[] } {
  const errors: string[] = [];
  if (!p || typeof p !== "object") return { entry: null, errors: ["Bukan object valid"] };
  const who = String(p.who ?? "").trim();
  const action = String(p.action ?? "").trim();
  const target = String(p.target ?? "").trim();
  const atRaw = String(p.at ?? "").trim();
  if (!who) errors.push("kolom 'who' kosong");
  if (!action) errors.push("kolom 'action' kosong");
  if (!target) errors.push("kolom 'target' kosong");
  let atIso = atRaw;
  if (atRaw) {
    const d = new Date(atRaw);
    if (isNaN(d.getTime())) errors.push("kolom 'at' bukan tanggal valid");
    else atIso = d.toISOString();
  } else {
    atIso = new Date().toISOString();
  }
  if (errors.length > 0) return { entry: null, errors };
  return {
    entry: {
      id: String(p.id || `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      who, action, target, at: atIso,
    },
    errors: [],
  };
}

function parseCsvLine(ln: string): string[] {
  const cells: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < ln.length; i++) {
    const c = ln[i];
    if (c === '"') {
      if (inQ && ln[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
    } else if (c === "," && !inQ) { cells.push(cur); cur = ""; }
    else cur += c;
  }
  cells.push(cur);
  return cells;
}

const SAMPLE_JSON = JSON.stringify([
  { id: "a-sample-1", who: "Suryani", action: "updated", target: "Master Data > Customer", at: new Date().toISOString() },
  { id: "a-sample-2", who: "QA Bot", action: "imported", target: "Audit log", at: new Date().toISOString() },
], null, 2);
const SAMPLE_CSV = "id,who,action,target,at\n" +
  `"a-sample-1","Suryani","updated","Master Data > Customer","${new Date().toISOString()}"\n` +
  `"a-sample-2","QA Bot","imported","Audit log","${new Date().toISOString()}"`;

export default function AuditTrailTab({ log, onClear, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");
  const [exportFormat, setExportFormat] = useState<"raw" | "human">("human");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow<AuditLogEntry>[]>([]);
  const [previewName, setPreviewName] = useState("");

  // persisted filters
  const persisted: Partial<AuditFilters> = (() => {
    try { return JSON.parse(localStorage.getItem(FILTER_KEY) || "{}"); } catch { return {}; }
  })();
  const [user, setUser] = useState(persisted.user ?? "");
  const [target, setTarget] = useState(persisted.target ?? "");
  const [from, setFrom] = useState(persisted.from ?? "");
  const [to, setTo] = useState(persisted.to ?? "");
  const [q, setQ] = useState(persisted.q ?? "");
  const [source, setSource] = useState(persisted.source ?? "");

  useEffect(() => {
    localStorage.setItem(FILTER_KEY, JSON.stringify({ user, target, from, to, q, source }));
  }, [user, target, from, to, q, source]);

  // saved presets
  const [presets, setPresets] = useState<FilterPreset<AuditFilters>[]>(() => loadPresets(PRESET_SCOPE));
  useEffect(() => {
    const h = () => setPresets(loadPresets(PRESET_SCOPE));
    window.addEventListener(`hms-qa-filter-presets-change:${PRESET_SCOPE}`, h);
    return () => window.removeEventListener(`hms-qa-filter-presets-change:${PRESET_SCOPE}`, h);
  }, []);
  const handleSavePreset = () => {
    const name = window.prompt("Nama preset filter:", `Preset ${presets.length + 1}`);
    if (!name) return;
    addPreset<AuditFilters>(PRESET_SCOPE, name, { user, target, from, to, q, source });
  };
  const applyPreset = (id: string) => {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setUser(p.values.user || ""); setTarget(p.values.target || "");
    setFrom(p.values.from || ""); setTo(p.values.to || "");
    setQ(p.values.q || ""); setSource(p.values.source || "");
  };

  const users = useMemo(() => Array.from(new Set(log.map((l) => l.who))).sort(), [log]);

  /** Heuristic source for entries that pre-date the source field. */
  const deriveSource = (l: AuditLogEntry): AuditSource => {
    if (l.source) return l.source;
    const a = `${l.action} ${l.target}`.toLowerCase();
    if (/health|ping|uptime/.test(a)) return "healthcheck";
    if (/sync|promote|deploy/.test(a)) return "sync";
    if (/import/.test(a)) return "import";
    return "manual";
  };

  const filtered = useMemo(() => {
    return log.filter((l) => {
      if (user && l.who !== user) return false;
      if (target && !l.target.toLowerCase().includes(target.toLowerCase())) return false;
      if (source && deriveSource(l) !== source) return false;
      const t = new Date(l.at).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime() + 86400000) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!l.action.toLowerCase().includes(s) && !l.target.toLowerCase().includes(s) && !l.who.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [log, user, target, from, to, q, source]);

  const toExportShape = (l: AuditLogEntry) => {
    const src = deriveSource(l);
    if (exportFormat === "raw") {
      return { id: l.id, who: l.who, action: l.action, target: l.target, at: l.at, source: src };
    }
    return {
      id: l.id,
      user: l.who,
      activity: l.action,
      module: l.target,
      source: src,
      timestamp: new Date(l.at).toLocaleString("id-ID", {
        dateStyle: "medium", timeStyle: "medium",
      }),
      timestamp_iso: l.at,
    };
  };

  const exportScope = { user, target, q, source };
  const exportJsonName = buildExportFilename({ prefix: "audit", format: exportFormat, ext: "json", from, to, scope: exportScope });
  const exportCsvName = buildExportFilename({ prefix: "audit", format: exportFormat, ext: "csv", from, to, scope: exportScope });
  const exportJson = () => {
    const data = filtered.map(toExportShape);
    dl(exportJsonName, JSON.stringify(data, null, 2), "application/json");
  };
  const exportCsv = () => {
    const data = filtered.map(toExportShape);
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const lines = [headers.join(","), ...data.map((row) => headers.map((h) => csvEsc((row as any)[h])).join(","))];
    dl(exportCsvName, lines.join("\n"), "text/csv");
  };

  // Severity heuristic for audit entries (used in export preview summary).
  const auditSeverity = (l: AuditLogEntry): Severity => {
    const a = `${l.action} ${l.target}`.toLowerCase();
    if (/delete|hapus|clear|overwrite|reset|drop/.test(a)) return "critical";
    if (/update|edit|import|sync|promote|deploy|rollback/.test(a)) return "high";
    return "warning";
  };
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);

  // Shared parser used by file imports and the one-click paste validator.
  const parseRows = (txt: string, kind: "json" | "csv"): PreviewRow<AuditLogEntry>[] => {
    const rawRows: any[] = [];
    if (kind === "json") {
      const parsed = JSON.parse(txt);
      if (!Array.isArray(parsed)) throw new Error("JSON harus berupa array");
      parsed.forEach((p) => rawRows.push(p));
    } else {
      const lines = txt.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length === 0) throw new Error("CSV kosong");
      const header = lines[0].toLowerCase();
      const hasHeader = /id|who|action|target|at|user|module|activity|timestamp/.test(header);
      const headerCells = hasHeader ? parseCsvLine(lines[0]).map((c) => c.trim().toLowerCase()) : ["id","who","action","target","at"];
      const data = hasHeader ? lines.slice(1) : lines;
      const colMap: Record<string, string> = {
        user: "who", who: "who",
        activity: "action", action: "action",
        module: "target", target: "target",
        timestamp: "at", timestamp_iso: "at", at: "at",
        id: "id",
      };
      data.forEach((ln) => {
        const cells = parseCsvLine(ln);
        const obj: any = {};
        headerCells.forEach((h, i) => { const k = colMap[h] ?? h; obj[k] = cells[i]; });
        rawRows.push(obj);
      });
    }
    return rawRows.map((r, i) => {
      const { entry, errors } = validateEntry(r);
      return { index: i, raw: JSON.stringify(r), parsed: entry, errors };
    });
  };

  const handleImport = (file: File) => {
    setImportErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const txt = String(reader.result || "");
        const kind: "json" | "csv" = file.name.toLowerCase().endsWith(".json") ? "json" : "csv";
        const rows = parseRows(txt, kind);
        setPreviewName(file.name);
        setPreviewRows(rows);
        setPreviewOpen(true);
      } catch (e: any) {
        setImportErr(e?.message || "Gagal memparse file");
      }
    };
    reader.readAsText(file);
  };


  const confirmImport = (entries: AuditLogEntry[]) => {
    if (importMode === "overwrite" && !confirm(`Overwrite seluruh log dengan ${entries.length} entri?`)) return;
    onImport?.(entries, importMode);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <History size={22} className="text-primary" /> Audit Trail
          </h2>
          <p className="text-sm text-muted-foreground">{filtered.length} dari {log.length} aktivitas.</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)}
            title="Skema kolom ekspor"
            className="text-xs px-2 py-1.5 rounded border border-input bg-background">
            <option value="human">Human-readable</option>
            <option value="raw">Raw</option>
          </select>
          {onImport && (
            <>
              <select value={importMode} onChange={(e) => setImportMode(e.target.value as any)}
                className="text-xs px-2 py-1.5 rounded border border-input bg-background">
                <option value="merge">Merge</option>
                <option value="overwrite">Overwrite</option>
              </select>
              <input ref={fileRef} type="file" accept=".json,.csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }} />
              <button onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                <Upload size={12}/> Import JSON/CSV
              </button>
            </>
          )}
          <button onClick={() => setExportPreviewOpen(true)} disabled={filtered.length === 0}
            title={`Preview ringkasan ${filtered.length} entri sebelum download`}
            className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-primary text-primary hover:bg-primary/10 disabled:opacity-50">
            <Eye size={12}/> Preview & Export ({filtered.length})
          </button>
          {log.length > 0 && (
            <button onClick={() => { if (confirm("Hapus seluruh log?")) onClear(); }}
              className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-border hover:bg-muted text-muted-foreground">
              <Trash2 size={12}/> Clear
            </button>
          )}
        </div>
      </div>
      {importErr && (
        <div className="text-xs text-red-600 inline-flex items-center gap-1"><AlertCircle size={12}/>{importErr}</div>
      )}

      <div className="bg-card rounded-xl border border-border p-3 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          <select value={user} onChange={(e) => setUser(e.target.value)} className="text-xs px-2 py-1.5 rounded border border-input bg-background">
            <option value="">Semua User</option>
            {users.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)}
            title="Filter berdasarkan sumber aktivitas"
            className="text-xs px-2 py-1.5 rounded border border-input bg-background">
            <option value="">Semua Sumber</option>
            <option value="manual">Manual</option>
            <option value="sync">Sync</option>
            <option value="healthcheck">Healthcheck</option>
            <option value="import">Import</option>
            <option value="system">System</option>
          </select>
          <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Modul / target..."
            className="text-xs px-2 py-1.5 rounded border border-input bg-background" />
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-xs px-2 py-1.5 rounded border border-input bg-background" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-xs px-2 py-1.5 rounded border border-input bg-background" />
          <div className="relative">
            <Search size={12} className="absolute left-2 top-2.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari..."
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded border border-input bg-background" />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Bookmark size={11}/>Preset:</span>
          <select onChange={(e) => { if (e.target.value) { applyPreset(e.target.value); e.target.value = ""; } }}
            className="text-xs px-2 py-1 rounded border border-input bg-background">
            <option value="">— Pilih preset —</option>
            {presets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={handleSavePreset}
            className="text-xs px-2 py-1 rounded border border-primary text-primary hover:bg-primary/10 inline-flex items-center gap-1">
            <Bookmark size={11}/> Save Filter
          </button>
          {presets.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {presets.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                  {p.name}
                  <button onClick={() => deletePreset(PRESET_SCOPE, p.id)} className="hover:text-red-600" title="Hapus preset">
                    <X size={9}/>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <History size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Tidak ada aktivitas cocok dengan filter.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <ul className="divide-y divide-border max-h-[60vh] overflow-y-auto">
            {filtered.map((e) => (
              <li key={e.id} className="px-4 py-3 flex items-center gap-3 text-sm hover:bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {e.who.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground">
                    <span className="font-medium">{e.who}</span>{" "}
                    <span className="text-muted-foreground">{e.action}</span>{" "}
                    <span className="font-medium">{e.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString("id-ID")}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ImportPreviewDialog<AuditLogEntry>
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fileName={previewName}
        rows={previewRows}
        mode={importMode}
        onConfirm={confirmImport}
        sample={{ jsonContent: SAMPLE_JSON, csvContent: SAMPLE_CSV, baseName: "audit-trail" }}
        revalidate={(text, kind) => parseRows(text, kind)}
        onReplaceRows={(rows, name) => { setPreviewRows(rows); setPreviewName(name); }}
        columns={[
          { key: "who", label: "User" },
          { key: "action", label: "Action" },
          { key: "target", label: "Target" },
          { key: "at", label: "At" },
        ]}
      />
    </div>
  );
}
