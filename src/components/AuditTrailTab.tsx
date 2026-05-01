import { History, Trash2 } from "lucide-react";
import { type AuditLogEntry } from "@/lib/store";

interface Props {
  log: AuditLogEntry[];
  onClear: () => void;
}

export default function AuditTrailTab({ log, onClear }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <History size={22} className="text-primary" />
            Audit Trail
          </h2>
          <p className="text-sm text-muted-foreground">Log aktivitas: siapa, melakukan apa, kapan.</p>
        </div>
        {log.length > 0 && (
          <button onClick={() => { if (confirm("Hapus seluruh log?")) onClear(); }}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted text-muted-foreground">
            <Trash2 size={14} /> Clear Log
          </button>
        )}
      </div>

      {log.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <History size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Belum ada aktivitas tercatat.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <ul className="divide-y divide-border">
            {log.map((e) => (
              <li key={e.id} className="px-4 py-3 flex items-center gap-3 text-sm hover:bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {e.who.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground">
                    <span className="font-medium">{e.who}</span>{" "}
                    <span className="text-muted-foreground">{e.action}</span>{" "}
                    <span className="font-medium">{e.target}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
