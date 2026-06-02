import { X, Upload } from "lucide-react";
import { loadConfig, type SubmoduleStats, type Category } from "@/lib/store";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  projectId: string;
  categories: Category[];
  stagingStats: Record<string, SubmoduleStats>;
}

export default function SyncDiffDialog({ open, onClose, onConfirm, projectId, categories, stagingStats }: Props) {
  if (!open) return null;
  const prod = loadConfig(projectId, "production");
  const allSubs = categories.flatMap((c) => c.submodules.map((s) => ({ ...s, cat: c.name })));
  const diffs = allSubs
    .map((s) => {
      const a = stagingStats[s.id];
      const b = prod.submoduleStats[s.id];
      if (!a || a.passed <= 0) return null;
      const passedBefore = b?.passed ?? 0;
      const passedAfter = a.passed;
      const totalBefore = b?.totalTC ?? 0;
      const totalAfter = a.totalTC;
      const changed = passedBefore !== passedAfter || totalBefore !== totalAfter;
      return changed ? { name: s.name, cat: s.cat, passedBefore, passedAfter, totalBefore, totalAfter } : null;
    })
    .filter(Boolean) as Array<{ name: string; cat: string; passedBefore: number; passedAfter: number; totalBefore: number; totalAfter: number }>;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground flex items-center gap-2"><Upload size={16} className="text-blue-600" /> Preview Sync ke Production</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{diffs.length} submodule akan berubah</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {diffs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Tidak ada perubahan untuk disinkron.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-2">Submodule</th>
                  <th className="py-2">Passed (Prod → Staging)</th>
                  <th className="py-2">Total (Prod → Staging)</th>
                </tr>
              </thead>
              <tbody>
                {diffs.map((d) => (
                  <tr key={d.name} className="border-b border-border/50">
                    <td className="py-2">
                      <p className="text-foreground font-medium">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">{d.cat}</p>
                    </td>
                    <td className="py-2 font-mono">
                      <span className="text-muted-foreground">{d.passedBefore}</span>
                      <span className="mx-1.5 text-emerald-600">→</span>
                      <span className="text-emerald-700 font-semibold">{d.passedAfter}</span>
                    </td>
                    <td className="py-2 font-mono">
                      <span className="text-muted-foreground">{d.totalBefore}</span>
                      <span className="mx-1.5">→</span>
                      <span className="text-foreground">{d.totalAfter}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-5 border-t border-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded border border-border text-muted-foreground">Batal</button>
          <button onClick={() => { onConfirm(); onClose(); }} disabled={diffs.length === 0}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            Konfirmasi Sync
          </button>
        </div>
      </div>
    </div>
  );
}
