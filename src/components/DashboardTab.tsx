import { useState } from "react";
import { TrendingUp, CheckCircle, XCircle, Clock, BarChart3, Edit2, Lightbulb, ExternalLink, Save, X } from "lucide-react";
import { type AppStats } from "@/lib/store";

interface Props {
  stats: AppStats;
  onEditStats: () => void;
  insightText: string;
  onUpdateInsight: (text: string) => void;
}

export default function DashboardTab({ stats, onEditStats, insightText, onUpdateInsight }: Props) {
  const [editMode, setEditMode] = useState(false);
  const [editInsight, setEditInsight] = useState(insightText);
  const passRate = stats.totalTC > 0 ? ((stats.passed / stats.totalTC) * 100).toFixed(1) : "0";

  const cards = [
    { label: "Total Test Cases", value: stats.totalTC, icon: BarChart3, color: "text-stat-total", bg: "bg-blue-50", glow: false },
    { label: "Passed", value: stats.passed, icon: CheckCircle, color: "text-stat-passed", bg: "bg-emerald-50", glow: false },
    { label: "Failed", value: stats.failed, icon: XCircle, color: "text-stat-failed", bg: "bg-red-50", glow: stats.failed > 0 },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-stat-pending", bg: "bg-amber-50", glow: false },
  ];

  const handleSaveInsight = () => {
    onUpdateInsight(editInsight);
    setEditMode(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Overview of QA test execution</p>
        </div>
        <button
          onClick={() => { setEditMode(!editMode); if (!editMode) { onEditStats(); } }}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
            editMode ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted text-muted-foreground"
          }`}
        >
          <Edit2 size={14} />
          {editMode ? "Editing..." : "Edit Stats"}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`bg-card rounded-xl border border-border p-5 shadow-sm transition-shadow ${
              card.glow ? "shadow-red-200 ring-1 ring-red-200 animate-pulse" : ""
            }`}
          >
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

      {/* Middle Row: Analytics + Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Analytics */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">Live Analytics</h3>
          </div>
          <div className="text-center mb-4">
            <p className="text-5xl font-extrabold text-primary">{passRate}%</p>
            <p className="text-sm text-muted-foreground mt-1">Pass Rate</p>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${passRate}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
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

        {/* QA Insight of the Day */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={18} className="text-amber-500" />
            <h3 className="font-semibold text-foreground">QA Insight of the Day</h3>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {editMode ? (
              <div className="w-full space-y-3">
                <textarea
                  value={editInsight}
                  onChange={(e) => setEditInsight(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={4}
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditMode(false)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                    <X size={16} />
                  </button>
                  <button onClick={handleSaveInsight} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">
                    <Save size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <blockquote className="text-center italic text-muted-foreground text-base leading-relaxed px-4">
                "{insightText}"
              </blockquote>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <a
              href="https://www.istqb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink size={14} />
              Learn More — ISTQB Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
