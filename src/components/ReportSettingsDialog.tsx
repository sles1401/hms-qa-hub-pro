import { useEffect, useRef, useState } from "react";
import { X, Upload, Save, RotateCcw, ZoomIn } from "lucide-react";
import { getReportSettings, setReportSettings, DEFAULT_REPORT_SETTINGS, type ReportTemplateSettings } from "@/lib/adminSettings";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

/** Re-encodes the original image at the given scale (1.0 = source size). */
function rescale(dataUrl: string, scale: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = Math.max(16, Math.round(img.width * scale));
      const h = Math.max(16, Math.round(img.height * scale));
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) return reject(new Error("canvas unsupported"));
      ctx.drawImage(img, 0, 0, w, h);
      try { resolve(c.toDataURL("image/png")); } catch (e) { reject(e); }
    };
    img.onerror = () => reject(new Error("invalid image"));
    img.src = dataUrl;
  });
}

export default function ReportSettingsDialog({ open, onClose, onSaved }: Props) {
  const [s, setS] = useState<ReportTemplateSettings>(getReportSettings);
  const [originalLogo, setOriginalLogo] = useState<string>("");
  const [scale, setScale] = useState(1);
  const [working, setWorking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const cur = getReportSettings();
      setS(cur);
      setOriginalLogo(cur.logoDataUrl || "");
      setScale(1);
    }
  }, [open]);

  if (!open) return null;

  const handleLogo = (file?: File) => {
    if (!file) return;
    if (file.size > 500_000) { alert("Logo maksimal 500KB"); return; }
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = String(r.result || "");
      setOriginalLogo(dataUrl);
      setS((p) => ({ ...p, logoDataUrl: dataUrl }));
      setScale(1);
    };
    r.readAsDataURL(file);
  };

  const removeLogo = () => {
    setOriginalLogo("");
    setS((p) => ({ ...p, logoDataUrl: "" }));
    setScale(1);
  };

  const save = async () => {
    let toSave = s;
    if (originalLogo && scale !== 1) {
      try {
        setWorking(true);
        const resized = await rescale(originalLogo, scale);
        toSave = { ...s, logoDataUrl: resized };
      } catch {
        alert("Gagal memproses logo, menyimpan ukuran asli.");
      } finally { setWorking(false); }
    } else if (originalLogo && scale === 1) {
      toSave = { ...s, logoDataUrl: originalLogo };
    }
    setReportSettings(toSave);
    onSaved?.(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-bold text-foreground">Enterprise Report Template</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase">Logo (≤500KB)</label>
            <div className="mt-2 rounded-lg border border-dashed border-border bg-muted/30 p-3">
              <div className="flex items-center justify-center bg-white rounded h-40 overflow-hidden">
                {originalLogo ? (
                  <img src={originalLogo} alt="Preview logo"
                    style={{ transform: `scale(${scale})`, transformOrigin: "center", transition: "transform 120ms" }}
                    className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-xs text-muted-foreground">Belum ada logo. Upload untuk pratinjau.</div>
                )}
              </div>
              {originalLogo && (
                <div className="mt-3 flex items-center gap-2">
                  <ZoomIn size={12} className="text-muted-foreground" />
                  <input type="range" min={0.25} max={2} step={0.05}
                    value={scale} onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="flex-1" />
                  <span className="text-[11px] font-mono w-12 text-right text-muted-foreground">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(1)}
                    className="text-[11px] text-muted-foreground hover:text-foreground">Reset</button>
                </div>
              )}
              <div className="mt-3 flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleLogo(e.target.files?.[0])} />
                <button onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded border border-border hover:bg-muted">
                  <Upload size={12}/> {originalLogo ? "Ganti" : "Upload"}
                </button>
                {originalLogo && (
                  <button onClick={removeLogo} className="text-xs text-red-600 hover:underline">Hapus</button>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  Skala disimpan saat Simpan ditekan
                </span>
              </div>
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
          <button onClick={() => { setS({ ...DEFAULT_REPORT_SETTINGS }); setOriginalLogo(""); setScale(1); }}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <RotateCcw size={12}/> Reset
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded border border-border text-muted-foreground">Cancel</button>
            <button onClick={save} disabled={working}
              className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground inline-flex items-center gap-1 disabled:opacity-60">
              <Save size={14}/> {working ? "Memproses..." : "Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
