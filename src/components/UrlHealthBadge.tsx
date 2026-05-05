import { ShieldCheck, ShieldAlert, RefreshCw, Loader2, CircleSlash } from "lucide-react";
import { useUrlHealth } from "@/hooks/useUrlHealth";

interface Props {
  url: string;
  label?: string;
  className?: string;
  /** Override interval (ms). If omitted, uses global health settings. */
  intervalMs?: number;
}

export default function UrlHealthBadge({ url, label, className = "", intervalMs }: Props) {
  const { status, message, checkedAt, recheck } = useUrlHealth(url, intervalMs);

  const config = {
    idle: { icon: CircleSlash, cls: "text-muted-foreground bg-muted", txt: "Idle" },
    checking: { icon: Loader2, cls: "text-blue-600 bg-blue-50 dark:bg-blue-950/40", txt: "Mengecek..." },
    ok: { icon: ShieldCheck, cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40", txt: "Sehat" },
    warn: { icon: ShieldAlert, cls: "text-amber-600 bg-amber-50 dark:bg-amber-950/40", txt: "Peringatan" },
    error: { icon: ShieldAlert, cls: "text-red-600 bg-red-50 dark:bg-red-950/40", txt: "Bermasalah" },
  }[status];

  const Icon = config.icon;

  return (
    <div className={`inline-flex items-center gap-2 text-[11px] px-2 py-1 rounded-md ${config.cls} ${className}`}>
      <Icon size={12} className={status === "checking" ? "animate-spin" : ""} />
      <span className="font-medium">{label ?? "Link"}: {config.txt}</span>
      <span className="opacity-70">— {message}</span>
      {checkedAt && <span className="opacity-50">· {new Date(checkedAt).toLocaleTimeString("id-ID")}</span>}
      <button
        onClick={recheck}
        title="Cek ulang"
        className="ml-1 p-0.5 rounded hover:bg-background/40 transition-colors"
      >
        <RefreshCw size={11} />
      </button>
    </div>
  );
}
