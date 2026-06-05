import { useState, useMemo, useRef } from "react";
import { History, Trash2, Download, Search, Upload, AlertCircle } from "lucide-react";
import { type AuditLogEntry } from "@/lib/store";

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

export default function AuditTrailTab({ log, onClear, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "overwrite">("merge");
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

  const exportJson = () => dl(`audit-${Date.now()}.json`, JSON.stringify(filtered, null, 2), "application/json");
  const exportCsv = () => {
    const lines = ["id,who,action,target,at", ...filtered.map((l) => [l.id, l.who, l.action, l.target, l.at].map(csvEsc).join(","))];
    dl(`audit-${Date.now()}.csv`, lines.join("\n"), "text/csv");
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
        <div className="flex gap-2">
          <button onClick={exportJson} disabled={filtered.length === 0}
            className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-border hover:bg-muted text-muted-foreground disabled:opacity-50">
            <Download size={12}/> JSON
          </button>
          <button onClick={exportCsv} disabled={filtered.length === 0}
            className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-border hover:bg-muted text-muted-foreground disabled:opacity-50">
            <Download size={12}/> CSV
          </button>
          {log.length > 0 && (
            <button onClick={() => { if (confirm("Hapus seluruh log?")) onClear(); }}
              className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-border hover:bg-muted text-muted-foreground">
              <Trash2 size={12}/> Clear
            </button>
          )}
        </div>
      </div>

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
    </div>
  );
}
