import { useState, useMemo, useRef } from "react";
import { History, Trash2, Download, Search, Upload, AlertCircle } from "lucide-react";
import { type AuditLogEntry } from "@/lib/store";
import ImportPreviewDialog, { type PreviewRow } from "@/components/ImportPreviewDialog";

interface Props {
  log: AuditLogEntry[];
  onClear: () => void;
  onImport?: (entries: AuditLogEntry[], mode: "merge" | "overwrite") => void;
}

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

export default function AuditTrailTab({ log, onClear, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow<AuditLogEntry>[]>([]);
  const [previewName, setPreviewName] = useState("");
  const [user, setUser] = useState("");
  const [target, setTarget] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  const users = useMemo(() => Array.from(new Set(log.map((l) => l.who))).sort(), [log]);

  const filtered = useMemo(() => {
    return log.filter((l) => {
      if (user && l.who !== user) return false;
      if (target && !l.target.toLowerCase().includes(target.toLowerCase())) return false;
      const t = new Date(l.at).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime() + 86400000) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!l.action.toLowerCase().includes(s) && !l.target.toLowerCase().includes(s) && !l.who.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [log, user, target, from, to, q]);

  const exportJson = () => dl(`audit-filtered-${Date.now()}.json`, JSON.stringify(filtered, null, 2), "application/json");
  const exportCsv = () => {
    const lines = ["id,who,action,target,at", ...filtered.map((l) => [l.id, l.who, l.action, l.target, l.at].map(csvEsc).join(","))];
    dl(`audit-filtered-${Date.now()}.csv`, lines.join("\n"), "text/csv");
  };

  const handleImport = (file: File) => {
    setImportErr(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const txt = String(reader.result || "");
        const rawRows: any[] = [];
        if (file.name.toLowerCase().endsWith(".json")) {
          const parsed = JSON.parse(txt);
          if (!Array.isArray(parsed)) throw new Error("JSON harus berupa array");
          parsed.forEach((p) => rawRows.push(p));
        } else {
          const lines = txt.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length === 0) throw new Error("CSV kosong");
          const header = lines[0].toLowerCase();
          const hasHeader = /id|who|action|target|at/.test(header);
          const data = hasHeader ? lines.slice(1) : lines;
          data.forEach((ln) => {
            const cells = parseCsvLine(ln);
            rawRows.push({ id: cells[0], who: cells[1], action: cells[2], target: cells[3], at: cells[4] });
          });
        }
        const rows: PreviewRow<AuditLogEntry>[] = rawRows.map((r, i) => {
          const { entry, errors } = validateEntry(r);
          return { index: i, raw: JSON.stringify(r), parsed: entry, errors };
        });
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
          <button onClick={exportJson} disabled={filtered.length === 0}
            title={`Export ${filtered.length} entri (hasil filter)`}
            className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-border hover:bg-muted text-muted-foreground disabled:opacity-50">
            <Download size={12}/> Filtered JSON ({filtered.length})
          </button>
          <button onClick={exportCsv} disabled={filtered.length === 0}
            title={`Export ${filtered.length} entri (hasil filter)`}
            className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-border hover:bg-muted text-muted-foreground disabled:opacity-50">
            <Download size={12}/> Filtered CSV ({filtered.length})
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

      <div className="bg-card rounded-xl border border-border p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        <select value={user} onChange={(e) => setUser(e.target.value)} className="text-xs px-2 py-1.5 rounded border border-input bg-background">
          <option value="">Semua User</option>
          {users.map((u) => <option key={u} value={u}>{u}</option>)}
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
