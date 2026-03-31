import { useState } from "react";
import { X, Plus, Trash2, GripVertical, Edit2, Check } from "lucide-react";
import { type Category, type Submodule } from "@/lib/store";

interface Props {
  categories: Category[];
  onSave: (categories: Category[]) => void;
  onClose: () => void;
}

export default function ManageModulesModal({ categories: initial, onSave, onClose }: Props) {
  const [cats, setCats] = useState<Category[]>(JSON.parse(JSON.stringify(initial)));
  const [newCatName, setNewCatName] = useState("");
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [newSubNames, setNewSubNames] = useState<Record<string, string>>({});

  const addCategory = () => {
    if (!newCatName.trim()) return;
    setCats([...cats, {
      id: Date.now().toString(),
      name: newCatName.trim(),
      icon: "Database",
      submodules: [],
    }]);
    setNewCatName("");
  };

  const deleteCategory = (id: string) => setCats(cats.filter((c) => c.id !== id));

  const startEditCat = (cat: Category) => {
    setEditingCat(cat.id);
    setEditCatName(cat.name);
  };

  const saveEditCat = (id: string) => {
    setCats(cats.map((c) => c.id === id ? { ...c, name: editCatName } : c));
    setEditingCat(null);
  };

  const addSubmodule = (catId: string) => {
    const name = newSubNames[catId]?.trim();
    if (!name) return;
    setCats(cats.map((c) =>
      c.id === catId
        ? { ...c, submodules: [...c.submodules, { id: Date.now().toString(), name }] }
        : c
    ));
    setNewSubNames({ ...newSubNames, [catId]: "" });
  };

  const deleteSubmodule = (catId: string, subId: string) =>
    setCats(cats.map((c) =>
      c.id === catId
        ? { ...c, submodules: c.submodules.filter((s) => s.id !== subId) }
        : c
    ));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">⚙️ Manage Modules</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Add Category */}
          <div className="flex gap-2">
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
              placeholder="New category name..."
              className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={addCategory} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors">
              <Plus size={16} />
            </button>
          </div>

          {cats.map((cat) => (
            <div key={cat.id} className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-3 bg-muted/50">
                <GripVertical size={14} className="text-muted-foreground" />
                {editingCat === cat.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                      className="flex-1 px-2 py-1 rounded border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      autoFocus
                    />
                    <button onClick={() => saveEditCat(cat.id)} className="p-1 text-stat-passed"><Check size={16} /></button>
                  </div>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-semibold text-foreground">{cat.name}</span>
                    <span className="text-xs text-muted-foreground">{cat.submodules.length} items</span>
                    <button onClick={() => startEditCat(cat)} className="p-1 hover:bg-muted rounded text-muted-foreground"><Edit2 size={14} /></button>
                    <button onClick={() => deleteCategory(cat.id)} className="p-1 hover:bg-muted rounded text-destructive"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
              <div className="p-3 space-y-1.5">
                {cat.submodules.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    <span className="flex-1 text-sm text-foreground">{sub.name}</span>
                    <button
                      onClick={() => deleteSubmodule(cat.id, sub.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-muted rounded text-destructive transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <input
                    value={newSubNames[cat.id] || ""}
                    onChange={(e) => setNewSubNames({ ...newSubNames, [cat.id]: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addSubmodule(cat.id)}
                    placeholder="Add submodule..."
                    className="flex-1 px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button onClick={() => addSubmodule(cat.id)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
            Cancel
          </button>
          <button onClick={() => { onSave(cats); onClose(); }} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
