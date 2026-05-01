import { useState } from "react";
import { Bug, Plus, Trash2, Edit2, Save, X, AlertTriangle } from "lucide-react";
import { type BugItem } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Props {
  bugs: BugItem[];
  onUpdate: (bugs: BugItem[]) => void;
  onAudit?: (action: string, target: string) => void;
}

const SEVERITIES: BugItem["severity"][] = ["Low", "Medium", "High", "Critical"];
const STATUSES: BugItem["status"][] = ["Open", "In Progress", "Fixed", "Closed"];
const SEV_COLOR: Record<string, string> = {
  Low: "bg-gray-100 text-gray-700", Medium: "bg-amber-100 text-amber-700",
  High: "bg-orange-100 text-orange-700", Critical: "bg-red-100 text-red-700",
};
const STATUS_COLOR: Record<string, string> = {
  Open: "bg-red-100 text-red-700", "In Progress": "bg-blue-100 text-blue-700",
  Fixed: "bg-emerald-100 text-emerald-700", Closed: "bg-gray-100 text-gray-700",
};

const SLA_DAYS = 3;
const isStale = (b: BugItem) => {
  if (b.status === "Fixed" || b.status === "Closed") return false;
  const days = (Date.now() - new Date(b.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return days >= SLA_DAYS;
};

export default function BugTrackerTab({ bugs, onUpdate, onAudit }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<BugItem, "id" | "createdAt" | "updatedAt">>({
    title: "", module: "", severity: "Medium", status: "Open", assignee: "",
  });

  const reset = () => {
    setDraft({ title: "", module: "", severity: "Medium", status: "Open", assignee: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!draft.title.trim()) return;
    const now = new Date().toISOString();
    if (editingId) {
      onUpdate(bugs.map((b) => (b.id === editingId ? { ...b, ...draft, updatedAt: now } : b)));
      onAudit?.("Update Bug", draft.title);
    } else {
      const bug: BugItem = { id: `bug-${Date.now()}`, ...draft, createdAt: now, updatedAt: now };
      onUpdate([bug, ...bugs]);
      onAudit?.("Create Bug", draft.title);
    }
    reset();
  };

  const handleStatusChange = (id: string, status: BugItem["status"]) => {
    const bug = bugs.find((b) => b.id === id);
    onUpdate(bugs.map((b) => (b.id === id ? { ...b, status, updatedAt: new Date().toISOString() } : b)));
    if (bug) onAudit?.(`Status → ${status}`, bug.title);
  };

  const handleDelete = (id: string) => {
    const bug = bugs.find((b) => b.id === id);
    onUpdate(bugs.filter((b) => b.id !== id));
    if (bug) onAudit?.("Delete Bug", bug.title);
  };

  const handleEdit = (b: BugItem) => {
    setDraft({ title: b.title, module: b.module, severity: b.severity, status: b.status, assignee: b.assignee });
    setEditingId(b.id);
    setShowForm(true);
  };

  const staleCount = bugs.filter(isStale).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bug size={22} className="text-destructive" />
            Bug Tracker (SLA-aware)
          </h2>
          <p className="text-sm text-muted-foreground">Bug yang stale &gt;{SLA_DAYS} hari otomatis ditandai merah.</p>
        </div>
        <div className="flex items-center gap-2">
          {staleCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium">
              <AlertTriangle size={14} /> {staleCount} SLA breach
            </div>
          )}
          <button onClick={() => { reset(); setShowForm(true); }}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus size={14} /> Add Bug
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Bug title *"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={draft.module} onChange={(e) => setDraft({ ...draft, module: e.target.value })}
              placeholder="Module" className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input value={draft.assignee} onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
              placeholder="Assignee" className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as BugItem["severity"] })}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as BugItem["status"] })}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={reset} className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground"><X size={14} /></button>
            <button onClick={handleSave} className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground flex items-center gap-1"><Save size={14} /> Save</button>
          </div>
        </div>
      )}

      {bugs.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Bug size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Belum ada bug tercatat.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Module</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {bugs.map((b) => {
                const stale = isStale(b);
                const days = Math.floor((Date.now() - new Date(b.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={b.id} className={cn(
                    "border-t border-border",
                    stale && "bg-red-50/60 hover:bg-red-50"
                  )}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {stale && <AlertTriangle size={12} className="inline text-red-600 mr-1" />}
                      {b.title}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{b.module || "-"}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${SEV_COLOR[b.severity]}`}>{b.severity}</span></td>
                    <td className="px-4 py-3">
                      <select value={b.status} onChange={(e) => handleStatusChange(b.id, e.target.value as BugItem["status"])}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium border-0 cursor-pointer ${STATUS_COLOR[b.status]}`}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{b.assignee || "-"}</td>
                    <td className={cn("px-4 py-3 text-xs", stale ? "text-red-600 font-medium" : "text-muted-foreground")}>
                      {days}d ago
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleEdit(b)} className="p-1 text-muted-foreground hover:text-primary"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(b.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
