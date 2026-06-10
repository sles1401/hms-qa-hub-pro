import { useMemo } from "react";
import { X, FileJson, Download } from "lucide-react";
import { SEVERITY_BADGE, type Severity } from "@/lib/adminSettings";

interface Props<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  getSource: (item: T) => string;
  getSeverity: (item: T) => Severity;
  /** Optional scope/filters summary shown at top. */
  scope?: Record<string, string | undefined>;
  format?: string; // e.g. "human" | "raw"
  filename?: { json: string; csv: string };
  onDownloadJson: () => void;
  onDownloadCsv: () => void;
}

const SEV_ORDER: Severity[] = ["critical", "high", "warning"];

export default function ExportPreviewDialog<T>({
  open, onClose, title, items, getSource, getSeverity, scope, format, filename,
  onDownloadJson, onDownloadCsv,
}: Props<T>) {
  const summary = useMemo(() => {
    const bySource: Record<string, number> = {};
    const bySeverity: Record<Severity, number> = { critical: 0, high: 0, warning: 0 };
    for (const it of items) {
      const src = getSource(it) || "—";
      bySource[src] = (bySource[src] || 0) + 1;
      bySeverity[getSeverity(it)] += 1;
    }
    return { bySource, bySeverity };
  }, [items, getSource, getSeverity]);

  if (!open) return null;
  const scopeEntries = Object.entries(scope || {}).filter(([, v]) => v && String(v).trim().length > 0);

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Export Preview</p>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {items.length} record akan diekspor{format ? ` · skema ${format}` : ""}.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {scopeEntries.length > 0 && (
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Filter Aktif</p>
              <div className="flex flex-wrap gap-1.5">
                {scopeEntries.map(([k, v]) => (
                  <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-muted text-foreground">
                    <span className="text-muted-foreground">{k}:</span> {String(v)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Jumlah per Sumber</p>
            {Object.keys(summary.bySource).length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada record.</p>
            ) : (
              <div className="space-y-1">
                {Object.entries(summary.bySource)
                  .sort((a, b) => b[1] - a[1])
                  .map(([src, n]) => {
                    const pct = items.length > 0 ? (n / items.length) * 100 : 0;
                    return (
                      <div key={src} className="text-xs">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-foreground capitalize">{src}</span>
                          <span className="text-muted-foreground">{n} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-1.5 rounded bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Jumlah per Severity</p>
            <div className="grid grid-cols-3 gap-2">
              {SEV_ORDER.map((sev) => (
                <div key={sev} className={`rounded-lg px-2 py-2 text-center ${SEVERITY_BADGE[sev]}`}>
                  <p className="text-[9px] uppercase tracking-wider opacity-80">{sev}</p>
                  <p className="text-lg font-bold">{summary.bySeverity[sev]}</p>
                </div>
              ))}
            </div>
          </div>

          {filename && (
            <div className="text-[10px] text-muted-foreground space-y-0.5 break-all">
              <p><span className="uppercase tracking-wider">JSON:</span> {filename.json}</p>
              <p><span className="uppercase tracking-wider">CSV:</span> {filename.csv}</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button onClick={onClose}
            className="px-3 py-1.5 text-sm rounded border border-border text-muted-foreground hover:bg-muted">
            Batal
          </button>
          <button onClick={() => { onDownloadJson(); onClose(); }}
            disabled={items.length === 0}
            className="px-3 py-1.5 text-sm rounded border border-primary text-primary hover:bg-primary/10 inline-flex items-center gap-1 disabled:opacity-40">
            <FileJson size={12}/> Download JSON
          </button>
          <button onClick={() => { onDownloadCsv(); onClose(); }}
            disabled={items.length === 0}
            className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 disabled:opacity-40">
            <Download size={12}/> Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
