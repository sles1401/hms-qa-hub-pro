import { useState, useMemo } from "react";
import { Plus, Edit2, Trash2, Code2, X, AlertCircle } from "lucide-react";
import { type DevReport } from "@/lib/store";

interface Props {
  reports: DevReport[];
  onUpdate: (next: DevReport[]) => void;
  onAudit?: (action: string, target: string) => void;
}

const STATUSES: DevReport["status"][] = ["Developing", "Ready for QA", "Verified"];

export default function DevControlCenterTab({ reports, onUpdate, onAudit }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<DevReport, "id" | "createdAt">>({
    featureName: "", rawReport: "", impactArea: "", status: "Developing",
  });
  const [filter, setFilter] = useState<"all" | DevReport["status"]>("all");

  const sorted = useMemo(
    () => [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reports]
  );
  const visible = filter === "all" ? sorted : sorted.filter((r) => r.status === filter);

  const errors = {
    feature: !draft.featureName.trim() ? "Wajib diisi" : draft.featureName.length > 120 ? "Maks 120 karakter" : null,
    raw: !draft.rawReport.trim() ? "Wajib diisi" : null,
  };
  const valid = !errors.feature && !errors.raw;

  const reset = () => { setDraft({ featureName: "", rawReport: "", impactArea: "", status: "Developing" }); setEditId(null); };

  const handleSave = () => {
    if (!valid) return;
    if (editId) {
      onUpdate(reports.map((r) => r.id === editId ? { ...r, ...draft } : r));
      onAudit?.("Update Dev Report", draft.featureName);
    } else {
      const entry: DevReport = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...draft };
      onUpdate([entry, ...reports]);
      onAudit?.("Create Dev Report", draft.featureName);
    }
    setShowModal(false); reset();
  };

  const handleEdit = (r: DevReport) => {
    setEditId(r.id);
    setDraft({ featureName: r.featureName, rawReport: r.rawReport, impactArea: r.impactArea, status: r.status });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (!confirm("Hapus laporan ini?")) return;
    onUpdate(reports.filter((r) => r.id !== id));
    onAudit?.("Delete Dev Report", id);
  };

  const statusColor = (s: DevReport["status"]) =>
    s === "Verified" ? "bg-emerald-100 text-emerald-700"
      : s === "Ready for QA" ? "bg-blue-100 text-blue-700"
      : "bg-amber-100 text-amber-700";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Code2 size={22} className="text-primary" /> Dev Control Center
          </h2>
          <p className="text-sm text-muted-foreground">Tampung laporan mentah dari Developer untuk diteruskan ke QA Journal.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}
            className="text-xs px-2 py-1.5 rounded border border-border bg-background">
            <option value="all">Semua Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => { reset(); setShowModal(true); }}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus size={14} /> New Report
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground text-sm">
          Belum ada laporan dari Developer.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="bg-card rounded-xl border border-border p-4 shadow-sm group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{r.featureName}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(r.status)}`}>{r.status}</span>
                    {r.importedToJournal && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Imported</span>
                    )}
                  </div>
                  {r.impactArea && (
                    <p className="text-xs text-muted-foreground mt-1"><span className="font-medium">Impact:</span> {r.impactArea}</p>
                  )}
                  <pre className="mt-2 text-xs text-foreground whitespace-pre-wrap bg-muted/40 rounded p-2 max-h-40 overflow-y-auto">{r.rawReport}</pre>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString("id-ID")}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(r)} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><Edit2 size={14}/></button>
                  <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded hover:bg-muted text-destructive"><Trash2 size={14}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowModal(false); reset(); }}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">{editId ? "Edit" : "New"} Dev Report</h2>
              <button onClick={() => { setShowModal(false); reset(); }} className="p-1.5 rounded hover:bg-muted"><X size={18}/></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Feature Name *</label>
                <input value={draft.featureName} maxLength={120} onChange={(e) => setDraft({ ...draft, featureName: e.target.value })}
                  className={`w-full px-3 py-2 mt-1 rounded border bg-background text-sm ${errors.feature ? "border-red-400" : "border-input"}`} />
                {errors.feature && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.feature}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Raw Dev Report *</label>
                <textarea value={draft.rawReport} rows={6} onChange={(e) => setDraft({ ...draft, rawReport: e.target.value })}
                  className={`w-full px-3 py-2 mt-1 rounded border bg-background text-sm font-mono ${errors.raw ? "border-red-400" : "border-input"}`} />
                {errors.raw && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={10}/>{errors.raw}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Impact Area (Regression)</label>
                <input value={draft.impactArea} onChange={(e) => setDraft({ ...draft, impactArea: e.target.value })}
                  placeholder="Modul / submodule yang perlu di-retest"
                  className="w-full px-3 py-2 mt-1 rounded border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as DevReport["status"] })}
                  className="w-full px-3 py-2 mt-1 rounded border border-input bg-background text-sm">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <button onClick={() => { setShowModal(false); reset(); }} className="px-4 py-2 text-sm rounded border border-border text-muted-foreground">Cancel</button>
              <button onClick={handleSave} disabled={!valid} className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
