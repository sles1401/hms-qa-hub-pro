import { useState } from "react";
import { Plus, Calendar, Edit2, Trash2, X, BookOpen } from "lucide-react";
import { type JournalEntry } from "@/lib/store";

interface Props {
  entries: JournalEntry[];
  onUpdate: (entries: JournalEntry[]) => void;
}

export default function DailyJournalTab({ entries, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [taskCompleted, setTaskCompleted] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextPlan, setNextPlan] = useState("");

  const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const resetForm = () => {
    setDate(new Date().toISOString().split("T")[0]);
    setTaskCompleted("");
    setBlockers("");
    setNextPlan("");
    setEditId(null);
  };

  const handleSave = () => {
    if (!taskCompleted.trim()) return;
    if (editId) {
      onUpdate(entries.map((e) =>
        e.id === editId ? { ...e, date, taskCompleted, blockers, nextPlan } : e
      ));
    } else {
      const newEntry: JournalEntry = {
        id: crypto.randomUUID(),
        date,
        taskCompleted,
        blockers,
        nextPlan,
        createdAt: new Date().toISOString(),
      };
      onUpdate([...entries, newEntry]);
    }
    setShowModal(false);
    resetForm();
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditId(entry.id);
    setDate(entry.date);
    setTaskCompleted(entry.taskCompleted);
    setBlockers(entry.blockers);
    setNextPlan(entry.nextPlan);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    onUpdate(entries.filter((e) => e.id !== id));
  };

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <BookOpen size={22} className="text-primary" />
            Daily Journal
          </h2>
          <p className="text-sm text-muted-foreground">Activity log & daily progress tracker</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus size={14} />
          New Entry
        </button>
      </div>

      {/* Motivational Quote */}
      <div className="text-right">
        <p className="text-xs italic text-muted-foreground">"Consistency leads to Quality."</p>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center">
          <Calendar className="mx-auto mb-4 text-muted-foreground" size={48} />
          <p className="text-muted-foreground text-lg font-medium">Belum ada journal entry.</p>
          <p className="text-muted-foreground text-sm mt-1">
            Klik <span className="font-semibold text-primary">'New Entry'</span> untuk mencatat aktivitas hari ini.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {sorted.map((entry) => (
              <div key={entry.id} className="relative pl-14">
                {/* Timeline dot */}
                <div className="absolute left-4 top-5 w-4 h-4 rounded-full bg-primary border-2 border-card z-10" />

                <div className="bg-card rounded-xl border border-border p-5 shadow-sm group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar size={14} />
                      {formatDate(entry.date)}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(entry)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(entry.id)} className="p-1.5 rounded-lg hover:bg-muted text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">✅ Task Completed</p>
                      <p className="text-sm text-foreground whitespace-pre-line">{entry.taskCompleted}</p>
                    </div>
                    {entry.blockers && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-destructive mb-1">🚧 Blockers</p>
                        <p className="text-sm text-foreground whitespace-pre-line">{entry.blockers}</p>
                      </div>
                    )}
                    {entry.nextPlan && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-stat-total mb-1">📋 Next Plan</p>
                        <p className="text-sm text-foreground whitespace-pre-line">{entry.nextPlan}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">📝 {editId ? "Edit Entry" : "New Journal Entry"}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">✅ Task Completed *</label>
                <textarea
                  value={taskCompleted}
                  onChange={(e) => setTaskCompleted(e.target.value)}
                  placeholder="What did you accomplish today?"
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">🚧 Blockers</label>
                <textarea
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="Any blockers or challenges?"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">📋 Next Plan</label>
                <textarea
                  value={nextPlan}
                  onChange={(e) => setNextPlan(e.target.value)}
                  placeholder="What's planned for tomorrow?"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <button onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!taskCompleted.trim()} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
