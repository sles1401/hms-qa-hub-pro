import { useMemo, useState } from "react";
import { X, CheckCircle2, AlertCircle, Upload, FileJson, FileSpreadsheet, ClipboardCheck } from "lucide-react";

export interface PreviewRow<T> {
  index: number;
  raw: string;
  parsed: T | null;
  errors: string[];
}

interface Props<T> {
  open: boolean;
  onClose: () => void;
  fileName: string;
  rows: PreviewRow<T>[];
  mode: "merge" | "overwrite";
  onConfirm: (validRows: T[]) => void;
  columns: { key: keyof T & string; label: string }[];
  /** Optional sample template payload — when provided, sample download buttons are rendered. */
  sample?: {
    jsonContent: string;
    csvContent: string;
    baseName: string;
  };
  /** Optional revalidator — enables a paste-and-validate panel that re-runs schema checks against pasted text. */
  revalidate?: (text: string, kind: "json" | "csv") => PreviewRow<T>[];
  /** Optional replacer — when provided alongside revalidate, the user can replace preview rows with pasted content. */
  onReplaceRows?: (rows: PreviewRow<T>[], fileName: string) => void;
}

function dlBlob(name: string, content: string, mime: string) {
  const u = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a"); a.href = u; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 500);
}

export default function ImportPreviewDialog<T extends Record<string, any>>({
  open, onClose, fileName, rows, mode, onConfirm, columns, sample, revalidate, onReplaceRows,
}: Props<T>) {
  const validCount = useMemo(() => rows.filter((r) => r.errors.length === 0).length, [rows]);
  const errorCount = rows.length - validCount;
  const [showAllErrors, setShowAllErrors] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteKind, setPasteKind] = useState<"json" | "csv">("json");
  const [pasteResult, setPasteResult] = useState<{ rows: PreviewRow<T>[]; valid: number; error: number } | null>(null);
  if (!open) return null;

  const confirm = () => {
    const valid = rows.filter((r) => r.errors.length === 0 && r.parsed).map((r) => r.parsed as T);
    if (valid.length === 0) return;
    onConfirm(valid);
    onClose();
  };

  const runValidate = () => {
    if (!revalidate) return;
    try {
      const parsed = revalidate(pasteText, pasteKind);
      const valid = parsed.filter((r) => r.errors.length === 0).length;
      setPasteResult({ rows: parsed, valid, error: parsed.length - valid });
    } catch (e: any) {
      setPasteResult({ rows: [], valid: 0, error: 1 });
    }
  };

  const errorRows = rows.filter((r) => r.errors.length > 0);
  const errorsShown = showAllErrors ? errorRows : errorRows.slice(0, 10);

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[88vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground">Preview Import — {fileName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Mode: <span className="font-medium uppercase">{mode}</span> ·{" "}
              <span className="text-emerald-600">{validCount} valid</span> ·{" "}
              <span className={errorCount > 0 ? "text-red-600" : "text-muted-foreground"}>{errorCount} error</span> ·{" "}
              total {rows.length} baris
            </p>
          </div>
          <div className="flex items-center gap-2">
            {sample && (
              <>
                <button
                  onClick={() => dlBlob(`${sample.baseName}-sample.json`, sample.jsonContent, "application/json")}
                  className="text-xs px-2 py-1.5 rounded border border-border hover:bg-muted inline-flex items-center gap-1"
                  title="Unduh contoh format JSON valid"
                >
                  <FileJson size={12} /> Sample JSON
                </button>
                <button
                  onClick={() => dlBlob(`${sample.baseName}-sample.csv`, sample.csvContent, "text/csv")}
                  className="text-xs px-2 py-1.5 rounded border border-border hover:bg-muted inline-flex items-center gap-1"
                  title="Unduh contoh format CSV valid"
                >
                  <FileSpreadsheet size={12} /> Sample CSV
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2 w-16">Status</th>
                {columns.map((c) => (
                  <th key={c.key} className="px-3 py-2">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const ok = r.errors.length === 0;
                return (
                  <tr key={r.index} className={ok ? "" : "bg-red-50 dark:bg-red-950/20"}>
                    <td className="px-3 py-2 text-muted-foreground">{r.index + 1}</td>
                    <td className="px-3 py-2">
                      {ok ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12}/>OK</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600" title={r.errors.join(", ")}>
                          <AlertCircle size={12}/>Error
                        </span>
                      )}
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} className="px-3 py-2 text-foreground max-w-[200px] truncate">
                        {String(r.parsed?.[c.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={columns.length + 2} className="px-3 py-8 text-center text-muted-foreground">Tidak ada baris terdeteksi.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {errorCount > 0 && (
          <div className="px-5 py-3 bg-red-50 dark:bg-red-950/20 border-t border-red-200 text-xs text-red-700 dark:text-red-300 max-h-44 overflow-auto">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold inline-flex items-center gap-1">
                <AlertCircle size={12}/> Ringkasan {errorCount} error validasi
              </p>
              {errorRows.length > 10 && (
                <button onClick={() => setShowAllErrors((v) => !v)} className="underline text-[11px]">
                  {showAllErrors ? "Sembunyikan" : `Lihat semua (${errorRows.length})`}
                </button>
              )}
            </div>
            <ul className="space-y-0.5">
              {errorsShown.map((r) => (
                <li key={r.index}>
                  <span className="font-mono">Baris {r.index + 1}:</span> {r.errors.join("; ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="p-4 border-t border-border flex justify-between items-center">
          <p className="text-xs text-muted-foreground">Hanya baris valid yang akan diimpor.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded border border-border text-muted-foreground">Batal</button>
            <button onClick={confirm} disabled={validCount === 0}
              className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground inline-flex items-center gap-1 disabled:opacity-40">
              <Upload size={14}/> Konfirmasi Import {validCount} baris
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
