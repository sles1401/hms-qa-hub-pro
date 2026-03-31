import { TrendingUp, CheckCircle, XCircle, Clock, BarChart3, Edit2 } from "lucide-react";
import { type AppStats } from "@/lib/store";

interface Props {
  stats: AppStats;
  onEditStats: () => void;
}

export default function DashboardTab({ stats, onEditStats }: Props) {
  const passRate = stats.totalTC > 0 ? ((stats.passed / stats.totalTC) * 100).toFixed(1) : "0";

  const cards = [
    { label: "Total Test Cases", value: stats.totalTC, icon: BarChart3, color: "text-stat-total", bg: "bg-blue-50" },
    { label: "Passed", value: stats.passed, icon: CheckCircle, color: "text-stat-passed", bg: "bg-emerald-50" },
    { label: "Failed", value: stats.failed, icon: XCircle, color: "text-stat-failed", bg: "bg-red-50" },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-stat-pending", bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Overview of QA test execution</p>
        </div>
        <button
          onClick={onEditStats}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
        >
          <Edit2 size={14} />
          Edit Stats
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</span>
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon size={18} className={card.color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Execution Summary */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-primary" />
          <h3 className="font-semibold text-foreground">Execution Summary</h3>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Pass Rate</span>
              <span className="font-semibold text-stat-passed">{passRate}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-stat-passed rounded-full transition-all duration-500"
                style={{ width: `${passRate}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <p className="text-lg font-bold text-stat-passed">{stats.passed.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Passed</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-lg font-bold text-stat-failed">{stats.failed.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Failed</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-lg font-bold text-stat-pending">{stats.pending.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
