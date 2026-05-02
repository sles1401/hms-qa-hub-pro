import { AlertTriangle, X } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel",
  variant = "default", onConfirm, onCancel,
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 p-5 border-b border-border">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${variant === "danger" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>
        <div className="flex justify-end gap-2 p-4">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted">{cancelLabel}</button>
          <button onClick={onConfirm}
            className={`px-4 py-1.5 text-sm rounded-lg text-primary-foreground ${variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-primary hover:bg-primary/90"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
