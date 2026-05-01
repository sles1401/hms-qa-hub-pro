import { useState } from "react";
import { CheckCircle2, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { type PassedWithNoteEntry } from "@/lib/store";

interface Props {
  entries: PassedWithNoteEntry[];
  onUpdate: (entries: PassedWithNoteEntry[]) => void;
  onAudit?: (action: string, target: string) => void;
}

const CATEGORIES: PassedWithNoteEntry["category"][] = ["UI/UX", "Optimization", "Suggestion", "Other"];
const CAT_COLOR: Record<string, string> = {
  "UI/UX": "bg-purple-100 text-purple-700",
  "Optimization": "bg-blue-100 text-blue-700",
  "Suggestion": "bg-amber-100 text-amber-700",
  "Other": "bg-gray-100 text-gray-700",
};

export default function PassedWithNotesTab({ entries, onUpdate, onAudit }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<PassedWithNoteEntry, "id" | "createdAt">>({
    module: "", testCase: "", note: "", category: "UI/UX",
  });

  const reset = () => {
    setDraft({ module: "", testCase: "", note: "", category: "UI/UX" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!draft.testCase.trim()) return;
    if (editingId) {
      onUpdate(entries.map((e) => (e.id === editingId ? { ...e, ...draft } : e)));
      onAudit?.("Edit Passed with Note", draft.testCase);
    } else {
      const entry: PassedWithNoteEntry = {
        id: `pwn-${Date.now()}`,
        ...draft,
        createdAt: new Date().toISOString(),
      };
      onUpdate([entry, ...entries]);
      onAudit?.("Add Passed with Note", draft.testCase);
    }
    reset();
  };

  const handleDelete = (id: string) => {
    const target = entries.find((e) => e.id === id);
    onUpdate(entries.filter((e) => e.id !== id));
    if (target) onAudit?.("Delete Passed with Note", target.testCase);
  };

  const handleEdit = (e: PassedWithNoteEntry) => {
    setDraft({ module: e.module, testCase: e.testCase, note: e.note, category: e.category });
    setEditingId(e.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 size={22} className="text-emerald-600" />
            Passed with Notes
          </h2>
          <p className="text-sm text-muted-foreground">Test case passed dengan catatan saran/optimasi</p>
        </div>
        <button
          onClick={() => { reset(); setShowForm(true); }}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} />
          Add Note
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={draft.module} onChange={(e) => setDraft({ ...draft, module: e.target.value })}
              placeholder="Module / Submodule"
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as PassedWithNoteEntry["category"] })}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <input value={draft.testCase} onChange={(e) => setDraft({ ...draft, testCase: e.target.value })}
            placeholder="Test Case Name *"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="Note / Saran perbaikan..." rows={3}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
          <div className="flex gap-2 justify-end">
            <button onClick={reset} className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted text-muted-foreground"><X size={14} /></button>
            <button onClick={handleSave} className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"><Save size={14} /> Save</button>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <CheckCircle2 size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Belum ada catatan. Tambah test case yang passed namun butuh perhatian.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CAT_COLOR[e.category]}`}>{e.category}</span>
                    {e.module && <span className="text-xs text-muted-foreground">· {e.module}</span>}
                    <span className="text-xs text-muted-foreground">· {new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-medium text-foreground text-sm">{e.testCase}</h3>
                  {e.note && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{e.note}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleEdit(e)} className="p-1.5 text-muted-foreground hover:text-primary"><Edit2 size={14} /></button>
                  <button onClick={() => handleDelete(e.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
