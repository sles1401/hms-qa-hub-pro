import { useState } from "react";
import { X, FileSpreadsheet, FileText, FileDown, Settings } from "lucide-react";
import { generateReport, type ReportFormat, type ReportTemplate, type ReportInput } from "@/lib/reports";
import ReportSettingsDialog from "@/components/ReportSettingsDialog";
import { useRole } from "@/hooks/useRole";

interface Props {
  open: boolean;
  onClose: () => void;
  input: ReportInput;
  onGenerated?: (fmt: ReportFormat, tpl: ReportTemplate) => void;
}

export default function ReportDialog({ open, onClose, input, onGenerated }: Props) {
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [template, setTemplate] = useState<ReportTemplate>("ringkas");
  const [showSettings, setShowSettings] = useState(false);
  const { isAdmin } = useRole();
  if (!open) return null;

  const handleRun = () => {
    generateReport(input, format, template);
    onGenerated?.(format, template);
    onClose();
  };

  const formats: { v: ReportFormat; label: string; icon: React.ElementType }[] = [
    { v: "pdf", label: "PDF", icon: FileText },
    { v: "xlsx", label: "Excel (XLSX)", icon: FileSpreadsheet },
    { v: "csv", label: "CSV", icon: FileDown },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-bold text-foreground">Generate Report</h3>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Format</p>
            <div className="grid grid-cols-3 gap-2">
              {formats.map((f) => {
                const Icon = f.icon;
                const active = format === f.v;
                return (
                  <button key={f.v} onClick={() => setFormat(f.v)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-colors ${
                      active ? "border-primary bg-primary/10 text-primary font-medium" : "border-border text-muted-foreground hover:bg-muted"
                    }`}>
                    <Icon size={18} />
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">Template</p>
            <div className="grid grid-cols-2 gap-2">
              {(["ringkas", "enterprise"] as ReportTemplate[]).map((t) => {
                const active = template === t;
                return (
                  <button key={t} onClick={() => setTemplate(t)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      active ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    }`}>
                    <p className="text-sm font-medium text-foreground capitalize">{t}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t === "ringkas" ? "Ringkasan singkat per submodule." : "Detail lengkap + footer audit."}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-border flex justify-between items-center gap-2">
          {template === "enterprise" && isAdmin ? (
            <button onClick={() => setShowSettings(true)}
              className="text-xs inline-flex items-center gap-1 px-3 py-2 rounded border border-border text-muted-foreground hover:bg-muted">
              <Settings size={12}/> Edit Template
            </button>
          ) : <span/>}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded border border-border text-muted-foreground">Cancel</button>
            <button onClick={handleRun} className="px-4 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90">
              Generate
            </button>
          </div>
        </div>
      </div>
      <ReportSettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
