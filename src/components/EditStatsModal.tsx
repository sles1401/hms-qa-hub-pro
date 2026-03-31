import { useState } from "react";
import { X } from "lucide-react";
import { type AppStats } from "@/lib/store";

interface Props {
  stats: AppStats;
  onSave: (stats: AppStats) => void;
  onClose: () => void;
}

export default function EditStatsModal({ stats: initial, onSave, onClose }: Props) {
  const [stats, setStats] = useState({ ...initial });

  const fields: { key: keyof AppStats; label: string }[] = [
    { key: "totalTC", label: "Total Test Cases" },
    { key: "passed", label: "Passed" },
    { key: "failed", label: "Failed" },
    { key: "pending", label: "Pending" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">📊 Edit Statistics</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-sm font-medium text-foreground mb-1 block">{f.label}</label>
              <input
                type="number"
                value={stats[f.key]}
                onChange={(e) => setStats({ ...stats, [f.key]: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
            Cancel
          </button>
          <button onClick={() => { onSave(stats); onClose(); }} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
