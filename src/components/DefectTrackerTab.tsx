import { useState } from "react";
import { Bug, ExternalLink, Edit2, Link2 } from "lucide-react";

interface Props {
  url: string;
  onUpdateUrl: (url: string) => void;
}

export default function DefectTrackerTab({ url, onUpdateUrl }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url);

  const handleSave = () => {
    onUpdateUrl(draft);
    setEditing(false);
  };

  const getEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return "";
    // Auto-convert /edit to /preview
    let cleaned = rawUrl.replace(/\/edit(\?.*)?$/, "/preview");
    // If it's a Google Sheets URL without /preview, add it
    if (cleaned.includes("docs.google.com/spreadsheets") && !cleaned.includes("/preview")) {
      const match = cleaned.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        return `https://docs.google.com/spreadsheets/d/${match[1]}/preview`;
      }
    }
    return cleaned;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Bug size={22} className="text-destructive" />
            Defect Tracker
          </h2>
          <p className="text-sm text-muted-foreground">Track and monitor bug lifecycle</p>
        </div>
        <button
          onClick={() => { setDraft(url); setEditing(true); }}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
        >
          <Link2 size={14} />
          Link Spreadsheet
        </button>
      </div>

      {editing && (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
          <label className="text-sm font-medium text-foreground">Google Sheets URL</label>
          <input
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">URL otomatis dikonversi ke mode preview (tanpa toolbar Google).</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Save
            </button>
          </div>
        </div>
      )}

      {embedUrl ? (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <iframe
            src={embedUrl}
            className="w-full border-0"
            style={{ height: "calc(100vh - 240px)", minHeight: 500 }}
            title="Defect Tracker"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <Bug size={28} className="text-destructive" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No Defect Tracker Linked</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Klik "Link Spreadsheet" untuk menghubungkan Google Sheets defect tracker Anda.
          </p>
          <button
            onClick={() => { setDraft(""); setEditing(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ExternalLink size={14} />
            Add Link
          </button>
        </div>
      )}
    </div>
  );
}
