import { useState } from "react";
import { ArrowLeft, Edit2, BarChart3, CheckCircle, XCircle, Clock, TrendingUp, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { type SubmoduleStats, DEFAULT_SUBMODULE_STATS } from "@/lib/store";

const CLASSIFICATION_LABELS: { key: keyof SubmoduleStats["classification"]; label: string; color: string }[] = [
  { key: "positive", label: "Positive", color: "hsl(142, 70%, 45%)" },
  { key: "negative", label: "Negative", color: "hsl(0, 72%, 51%)" },
  { key: "edgeCase", label: "Edge Case", color: "hsl(45, 90%, 50%)" },
  { key: "integrationTest", label: "Integration Test", color: "hsl(210, 70%, 50%)" },
  { key: "uiUxCheck", label: "UI/UX Check", color: "hsl(280, 60%, 55%)" },
  { key: "securityRole", label: "Security/Role", color: "hsl(0, 0%, 45%)" },
  { key: "regression", label: "Regression", color: "hsl(25, 90%, 55%)" },
];

interface Props {
  submoduleId: string;
  submoduleName: string;
  stats: SubmoduleStats;
  onUpdateStats: (stats: SubmoduleStats) => void;
  onBack: () => void;
}

export default function SubmoduleDetailTab({ submoduleName, stats, onUpdateStats, onBack }: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [editStats, setEditStats] = useState(stats);

  const s = stats || DEFAULT_SUBMODULE_STATS;
  const passRate = s.totalTC > 0 ? ((s.passed / s.totalTC) * 100).toFixed(1) : "0";

  const pieData = CLASSIFICATION_LABELS.map((c) => ({
    name: c.label,
    value: s.classification[c.key],
    color: c.color,
  })).filter((d) => d.value > 0);

  const hasClassification = pieData.length > 0;

  const statCards = [
    { label: "Total Test Cases", value: s.totalTC, icon: BarChart3, color: "text-stat-total", bg: "bg-blue-50" },
    { label: "Passed", value: s.passed, icon: CheckCircle, color: "text-stat-passed", bg: "bg-emerald-50" },
    { label: "Failed", value: s.failed, icon: XCircle, color: "text-stat-failed", bg: "bg-red-50" },
    { label: "Pending", value: s.pending, icon: Clock, color: "text-stat-pending", bg: "bg-amber-50" },
  ];

  const handleSave = () => {
    onUpdateStats(editStats);
    setShowEdit(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-foreground">{submoduleName}</h2>
            <p className="text-sm text-muted-foreground">Submodule test execution detail</p>
          </div>
        </div>
        <button
          onClick={() => { setEditStats({ ...s }); setShowEdit(true); }}
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground"
        >
          <Edit2 size={14} />
          Edit Stats
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
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

      {/* Pass Rate */}
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
              <p className="text-lg font-bold text-stat-passed">{s.passed.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Passed</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-lg font-bold text-stat-failed">{s.failed.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Failed</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-lg font-bold text-stat-pending">{s.pending.toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pie Chart - Test Classification */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4">📊 Test Classification</h3>
        {hasClassification ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Belum ada data klasifikasi. Klik <strong>Edit Stats</strong> untuk menambahkan.
          </div>
        )}

        {/* Legend badges */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {CLASSIFICATION_LABELS.map((c) => (
            <span
              key={c.key}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: c.color }}
            >
              {c.label}
            </span>
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEdit(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">📊 Edit Submodule Stats</h2>
              <button onClick={() => setShowEdit(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Test Cases</p>
              {([
                { key: "totalTC" as const, label: "Total Test Cases" },
                { key: "passed" as const, label: "Passed" },
                { key: "failed" as const, label: "Failed" },
                { key: "pending" as const, label: "Pending" },
              ]).map((f) => (
                <div key={f.key}>
                  <label className="text-sm font-medium text-foreground mb-1 block">{f.label}</label>
                  <input
                    type="number"
                    value={editStats[f.key]}
                    onChange={(e) => setEditStats({ ...editStats, [f.key]: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}

              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-2">Test Classification</p>
              {CLASSIFICATION_LABELS.map((c) => (
                <div key={c.key}>
                  <label className="text-sm font-medium text-foreground mb-1 block">{c.label}</label>
                  <input
                    type="number"
                    value={editStats.classification[c.key]}
                    onChange={(e) =>
                      setEditStats({
                        ...editStats,
                        classification: {
                          ...editStats.classification,
                          [c.key]: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-border">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
