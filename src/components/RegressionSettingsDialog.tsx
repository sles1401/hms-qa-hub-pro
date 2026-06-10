import { useEffect, useState } from "react";
import { X, Save, RotateCcw, AlertTriangle } from "lucide-react";
import { getRegressionSettings, setRegressionSettings, DEFAULT_REGRESSION_SETTINGS, type RegressionSettings } from "@/lib/adminSettings";
import type { Category } from "@/lib/store";

interface Props {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onSaved?: () => void;
}

export default function RegressionSettingsDialog({ open, onClose, categories, onSaved }: Props) {
  const [s, setS] = useState<RegressionSettings>(getRegressionSettings);
  useEffect(() => { if (open) setS(getRegressionSettings()); }, [open]);
  if (!open) return null;

  const toggleCat = (id: string) => {
    setS((p) => ({
      ...p,
      watchedCategoryIds: p.watchedCategoryIds.includes(id)
        ? p.watchedCategoryIds.filter((x) => x !== id)
        : [...p.watchedCategoryIds, id],
    }));
  };

  const save = () => {
    const v = Math.max(0.1, Math.min(50, Number(s.thresholdPct) || 3));
    setRegressionSettings({ ...s, thresholdPct: v });
    onSaved?.(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-bold text-foreground flex items-center gap-2"><AlertTriangle size={16} className="text-red-600"/>Regression Settings</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Threshold Penurunan Pass Rate (%)</label>
            <input type="number" min={0.1} max={50} step={0.1} value={s.thresholdPct}
              onChange={(e) => setS((p) => ({ ...p, thresholdPct: Number(e.target.value) }))}
              className="mt-1 w-full px-3 py-2 text-sm rounded border border-input bg-background" />
            <p className="text-[11px] text-muted-foreground mt-1">Alert muncul jika Pass Rate turun lebih dari nilai ini dibanding snapshot terakhir.</p>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Mapping Severity — Pass Rate Delta</p>
            <p className="text-[11px] text-muted-foreground">Delta negatif (mis. -10 = turun 10%). Critical ≤ High ≤ Warning.</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-muted-foreground">
                Critical Δ ≤
                <input type="number" step={0.5} value={s.severityCriticalDelta}
                  onChange={(e) => setS((p) => ({ ...p, severityCriticalDelta: Number(e.target.value) }))}
                  className="mt-0.5 w-full px-2 py-1 text-sm rounded border border-input bg-background" />
              </label>
              <label className="text-[11px] text-muted-foreground">
                High Δ ≤
                <input type="number" step={0.5} value={s.severityHighDelta}
                  onChange={(e) => setS((p) => ({ ...p, severityHighDelta: Number(e.target.value) }))}
                  className="mt-0.5 w-full px-2 py-1 text-sm rounded border border-input bg-background" />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground">Healthcheck Auto Alert</p>
            <p className="text-[11px] text-muted-foreground">Streak = jumlah pengecekan gagal berturut-turut sebelum alert dinaikkan.</p>
            <div className="grid grid-cols-3 gap-2">
              <label className="text-[11px] text-muted-foreground">
                Threshold
                <input type="number" min={1} step={1} value={s.healthStreakThreshold}
                  onChange={(e) => setS((p) => ({ ...p, healthStreakThreshold: Math.max(1, Number(e.target.value) || 1) }))}
                  className="mt-0.5 w-full px-2 py-1 text-sm rounded border border-input bg-background" />
              </label>
              <label className="text-[11px] text-muted-foreground">
                High ≥
                <input type="number" min={1} step={1} value={s.healthStreakHigh}
                  onChange={(e) => setS((p) => ({ ...p, healthStreakHigh: Math.max(1, Number(e.target.value) || 1) }))}
                  className="mt-0.5 w-full px-2 py-1 text-sm rounded border border-input bg-background" />
              </label>
              <label className="text-[11px] text-muted-foreground">
                Critical ≥
                <input type="number" min={1} step={1} value={s.healthStreakCritical}
                  onChange={(e) => setS((p) => ({ ...p, healthStreakCritical: Math.max(1, Number(e.target.value) || 1) }))}
                  className="mt-0.5 w-full px-2 py-1 text-sm rounded border border-input bg-background" />
              </label>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase">Kategori / Modul Dipantau</p>
            <p className="text-[11px] text-muted-foreground">Kosong = auto (semua yang namanya mengandung "Inventory" / "Hauling").</p>
            <div className="mt-2 max-h-40 overflow-y-auto rounded border border-border divide-y divide-border">
              {categories.length === 0 && <p className="p-3 text-xs text-muted-foreground">Belum ada modul.</p>}
              {categories.map((c) => {
                const checked = s.watchedCategoryIds.includes(c.id);
                return (
                  <label key={c.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/30">
                    <input type="checkbox" checked={checked} onChange={() => toggleCat(c.id)} className="accent-primary"/>
                    <span className="text-foreground">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{c.submodules.length} sub</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border flex justify-between items-center">
          <button onClick={() => setS({ ...DEFAULT_REGRESSION_SETTINGS })}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <RotateCcw size={12}/> Reset
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded border border-border text-muted-foreground">Cancel</button>
            <button onClick={save} className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground inline-flex items-center gap-1">
              <Save size={14}/> Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
