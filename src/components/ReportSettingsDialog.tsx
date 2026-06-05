import { useEffect, useState } from "react";
import { X, Upload, Save, RotateCcw } from "lucide-react";
import { getReportSettings, setReportSettings, DEFAULT_REPORT_SETTINGS, type ReportTemplateSettings } from "@/lib/adminSettings";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function ReportSettingsDialog({ open, onClose, onSaved }: Props) {
  const [s, setS] = useState<ReportTemplateSettings>(getReportSettings);
  useEffect(() => { if (open) setS(getReportSettings()); }, [open]);
  if (!open) return null;

  const handleLogo = (file?: File) => {
    if (!file) return;
    if (file.size > 500_000) { alert("Logo maksimal 500KB"); return; }
    const r = new FileReader();
    r.onload = () => setS((p) => ({ ...p, logoDataUrl: String(r.result || "") }));
    r.readAsDataURL(file);
  };

  const save = () => { setReportSettings(s); onSaved?.(); onClose(); };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-bold text-foreground">Enterprise Report Template</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Logo (≤500KB)</label>
            <div className="mt-2 flex items-center gap-3">
              {s.logoDataUrl ? (
                <img src={s.logoDataUrl} alt="Logo" className="h-12 w-12 rounded bg-muted object-contain" />
              ) : (
                <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">QA</div>
              )}
              <label className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded border border-border hover:bg-muted cursor-pointer">
                <Upload size={12}/> Upload
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogo(e.target.files?.[0])} />
              </label>
              {s.logoDataUrl && (
                <button onClick={() => setS((p) => ({ ...p, logoDataUrl: "" }))} className="text-xs text-red-600">Hapus</button>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Heading</label>
            <input value={s.heading} onChange={(e) => setS((p) => ({ ...p, heading: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm rounded border border-input bg-background" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Footer Audit</label>
            <textarea value={s.footerText} onChange={(e) => setS((p) => ({ ...p, footerText: e.target.value }))}
              rows={2} className="mt-1 w-full px-3 py-2 text-sm rounded border border-input bg-background" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Tanggal Rilis</label>
            <input type="date" value={s.releaseDate} onChange={(e) => setS((p) => ({ ...p, releaseDate: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm rounded border border-input bg-background" />
          </div>
        </div>
        <div className="p-5 border-t border-border flex justify-between items-center">
          <button onClick={() => setS({ ...DEFAULT_REPORT_SETTINGS })}
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
