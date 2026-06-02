import { Shield, Eye } from "lucide-react";
import { useRole, type Role } from "@/hooks/useRole";

export default function RoleSwitcher() {
  const { role, setRole } = useRole();
  const opts: { v: Role; label: string; icon: React.ElementType }[] = [
    { v: "viewer", label: "Viewer", icon: Eye },
    { v: "admin", label: "Admin QA", icon: Shield },
  ];
  return (
    <div className="inline-flex items-center rounded-md border border-border bg-card overflow-hidden text-xs">
      {opts.map((o) => {
        const active = role === o.v;
        const Icon = o.icon;
        return (
          <button
            key={o.v}
            onClick={() => setRole(o.v)}
            title={`Switch to ${o.label}`}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 transition-colors ${
              active
                ? o.v === "admin"
                  ? "bg-emerald-600 text-white"
                  : "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon size={12} /> {o.label}
          </button>
        );
      })}
    </div>
  );
}
