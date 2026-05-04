import { ExternalLink, Edit2, FileText, Table } from "lucide-react";
import { useState } from "react";
import UrlHealthBadge from "@/components/UrlHealthBadge";

interface Props {
  title: string;
  description: string;
  url: string;
  onUpdateUrl: (url: string) => void;
  type: "docs" | "sheets";
}

export default function EmbedTab({ title, description, url, onUpdateUrl, type }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url);

  const handleSave = () => {
    onUpdateUrl(draft);
    setEditing(false);
  };

  const Icon = type === "docs" ? FileText : Table;

  // Convert Google Drive URL to embeddable preview format
  const getEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return "";
    // Extract document ID and build preview URL
    const match = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      const docId = match[1];
      if (type === "docs") {
        return `https://docs.google.com/document/d/${docId}/preview`;
      }
      return `https://docs.google.com/spreadsheets/d/${docId}/preview`;
    }
    // Fallback: if already a preview/pub URL, use as-is
    return rawUrl;
  };

  const embedUrl = getEmbedUrl(url);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {url && <UrlHealthBadge url={url} label={type === "docs" ? "Docs" : "Sheets"} />}
          <button
            onClick={() => { setDraft(url); setEditing(true); }}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
          >
            <Edit2 size={14} />
            Update Link
          </button>
        </div>
      </div>

      {editing && (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
          <label className="text-sm font-medium text-foreground">Google {type === "docs" ? "Docs" : "Sheets"} URL</label>
          <input
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`https://docs.google.com/${type === "docs" ? "document" : "spreadsheets"}/d/...`}
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
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
            title={title}
            allowFullScreen
          />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border p-16 flex flex-col items-center justify-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Icon size={28} className="text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">No {type === "docs" ? "Document" : "Spreadsheet"} Linked</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click "Update Link" to embed your Google {type === "docs" ? "Docs" : "Sheets"} here.
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
