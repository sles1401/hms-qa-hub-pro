import { useState } from "react";
import { FileText, Table, ExternalLink, Edit2, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateItem {
  id: string;
  label: string;
  description: string;
  type: "docs" | "sheets";
}

const TEMPLATES: TemplateItem[] = [
  { id: "tpl-test-plan", label: "Test Plan", description: "Template dokumen strategi & perencanaan testing", type: "docs" },
  { id: "tpl-test-case", label: "Test Case", description: "Template spreadsheet daftar test case", type: "sheets" },
  { id: "tpl-bug-report", label: "Bug Report", description: "Template pelaporan bug / defect", type: "sheets" },
  { id: "tpl-uat", label: "UAT (User Acceptance Testing)", description: "Template dokumen UAT sign-off", type: "docs" },
  { id: "tpl-test-summary", label: "Test Summary Report", description: "Template laporan ringkasan hasil testing", type: "docs" },
];

interface Props {
  templateUrls: Record<string, string>;
  onUpdateUrl: (templateId: string, url: string) => void;
}

export default function TemplateLibraryTab({ templateUrls, onUpdateUrl }: Props) {
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const getEmbedUrl = (rawUrl: string, type: "docs" | "sheets") => {
    if (!rawUrl) return "";
    const match = rawUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) {
      const docId = match[1];
      return type === "docs"
        ? `https://docs.google.com/document/d/${docId}/preview`
        : `https://docs.google.com/spreadsheets/d/${docId}/preview`;
    }
    return rawUrl;
  };

  const handleSave = (templateId: string) => {
    onUpdateUrl(templateId, draft);
    setEditing(null);
  };

  const selected = TEMPLATES.find((t) => t.id === activeTemplate);
  const selectedUrl = selected ? templateUrls[selected.id] || "" : "";
  const selectedEmbedUrl = selected ? getEmbedUrl(selectedUrl, selected.type) : "";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Template Library</h2>
        <p className="text-sm text-muted-foreground">Kumpulan template QA — embed dari Google Docs/Sheets</p>
      </div>

      {/* Template list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((tpl) => {
          const hasUrl = !!templateUrls[tpl.id];
          const isActive = activeTemplate === tpl.id;
          const Icon = tpl.type === "docs" ? FileText : Table;
          return (
            <button
              key={tpl.id}
              onClick={() => setActiveTemplate(isActive ? null : tpl.id)}
              className={cn(
                "text-left p-4 rounded-xl border transition-all",
                isActive
                  ? "border-emerald-500 bg-emerald-500/10 shadow-md"
                  : "border-border bg-card hover:border-emerald-500/50 hover:shadow-sm"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  isActive ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{tpl.label}</span>
                    {hasUrl && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>
                </div>
                {isActive ? <ChevronDown size={14} className="text-emerald-500 mt-1" /> : <ChevronRight size={14} className="text-muted-foreground mt-1" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected template detail */}
      {selected && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">{selected.label}</h3>
            <button
              onClick={() => { setDraft(selectedUrl); setEditing(selected.id); }}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
            >
              <Edit2 size={14} />
              {selectedUrl ? "Update Link" : "Add Link"}
            </button>
          </div>

          {editing === selected.id && (
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
              <label className="text-sm font-medium text-foreground">
                Google {selected.type === "docs" ? "Docs" : "Sheets"} URL
              </label>
              <input
                type="url"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`https://docs.google.com/${selected.type === "docs" ? "document" : "spreadsheets"}/d/...`}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
                  Cancel
                </button>
                <button onClick={() => handleSave(selected.id)} className="px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Save
                </button>
              </div>
            </div>
          )}

          {selectedEmbedUrl ? (
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <iframe
                src={selectedEmbedUrl}
                className="w-full border-0"
                style={{ height: "calc(100vh - 380px)", minHeight: 400 }}
                title={selected.label}
                allowFullScreen
              />
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                {selected.type === "docs" ? <FileText size={24} className="text-muted-foreground" /> : <Table size={24} className="text-muted-foreground" />}
              </div>
              <h3 className="font-semibold text-foreground mb-1">Belum ada template</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Klik "Add Link" untuk embed template Google {selected.type === "docs" ? "Docs" : "Sheets"}.
              </p>
              <button
                onClick={() => { setDraft(""); setEditing(selected.id); }}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ExternalLink size={14} />
                Add Link
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
