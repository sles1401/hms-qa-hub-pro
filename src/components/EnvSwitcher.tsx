import { Server, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Environment } from "@/lib/store";

interface Props {
  env: Environment;
  onChange: (env: Environment) => void;
}

export default function EnvSwitcher({ env, onChange }: Props) {
  return (
    <div className="inline-flex items-center bg-muted rounded-lg p-1 border border-border">
      <button
        onClick={() => onChange("staging")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
          env === "staging"
            ? "bg-amber-500 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Server size={12} />
        Staging
      </button>
      <button
        onClick={() => onChange("production")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
          env === "production"
            ? "bg-emerald-600 text-white shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Rocket size={12} />
        Production
      </button>
    </div>
  );
}
