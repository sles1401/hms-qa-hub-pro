import { useState, useEffect } from "react";
import { Figma, ExternalLink, Save, AlertCircle } from "lucide-react";

interface Props {
  url: string;
  onUpdateUrl: (url: string) => void;
  canEdit?: boolean;
}

function validate(u: string): string | null {
  if (!u.trim()) return null;
  try {
    const url = new URL(u);
    if (url.protocol !== "https:") return "Harus HTTPS";
    if (!/figma\.com$/.test(url.hostname) && !url.hostname.endsWith(".figma.com")) return "Harus URL Figma";
    return null;
  } catch {
    return "Format URL tidak valid";
  }
}

export default function FigmaLinkTab({ url, onUpdateUrl, canEdit = true }: Props) {
  const [draft, setDraft] = useState(url);
  useEffect(() => setDraft(url), [url]);
  const err = validate(draft);
  const embed = url && !validate(url) ? url.replace("figma.com/file/", "figma.com/embed?embed_host=share&url=https://www.figma.com/file/").replace("figma.com/design/", "figma.com/embed?embed_host=share&url=https://www.figma.com/design/") : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Figma size={22} className="text-primary" /> Figma Link
          </h2>
          <p className="text-sm text-muted-foreground">Embed design Figma untuk referensi UI/UX testing.</p>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noreferrer"
            className="text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded border border-border hover:bg-muted text-muted-foreground">
            <ExternalLink size={12}/> Open in Figma
          </a>
        )}
      </div>

      {canEdit && (
        <div className="bg-card rounded-xl border border-border p-4">
          <label className="text-xs font-medium text-muted-foreground">Figma File URL</label>
          <div className="flex gap-2 mt-1">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="https://www.figma.com/file/..."
              className={`flex-1 px-3 py-2 rounded border bg-background text-sm ${err ? "border-red-400" : "border-input"}`} />
            <button onClick={() => onUpdateUrl(draft)} disabled={!!err || draft === url}
              className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-1">
              <Save size={14}/> Save
            </button>
          </div>
          {err && <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1"><AlertCircle size={10}/>{err}</p>}
        </div>
      )}

      {embed ? (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <iframe src={embed} className="w-full" style={{ height: "70vh" }} allowFullScreen title="Figma" />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          Belum ada URL Figma. Tambahkan untuk menampilkan preview di sini.
        </div>
      )}
    </div>
  );
}
