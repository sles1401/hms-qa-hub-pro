import { useState, useEffect, useMemo } from "react";
import { TrendingUp, CheckCircle, XCircle, Clock, BarChart3, Edit2, Lightbulb, ExternalLink, Save, X, Calendar, Sparkles, Check } from "lucide-react";
import { type AppStats, type SubmoduleStats, type JournalEntry, type Category } from "@/lib/store";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Props {
  stats: AppStats;
  onEditStats: () => void;
  insightText: string;
  onUpdateInsight: (text: string) => void;
  userName: string;
  onUpdateUserName: (name: string) => void;
  releaseDeadline: string;
  onUpdateDeadline: (iso: string) => void;
  submoduleStats: Record<string, SubmoduleStats>;
  categories: Category[];
  journalEntries: JournalEntry[];
  globalEditMode?: boolean;
  learnMoreUrl: string;
  onUpdateLearnMoreUrl: (url: string) => void;
  insightTitle: string;
  onUpdateInsightTitle: (t: string) => void;
  learnMoreLabel: string;
  onUpdateLearnMoreLabel: (t: string) => void;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

function useCountdown(target: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (isNaN(diff)) return null;
  const past = diff < 0;
  const ms = Math.abs(diff);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { d, h, m, s, past };
}

const PIE_COLORS = ["#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#a855f7", "#06b6d4"];

export default function DashboardTab({
  stats, onEditStats, insightText, onUpdateInsight,
  userName, onUpdateUserName, releaseDeadline, onUpdateDeadline,
  submoduleStats, categories, journalEntries,
  globalEditMode = false, learnMoreUrl, onUpdateLearnMoreUrl,
  insightTitle, onUpdateInsightTitle, learnMoreLabel, onUpdateLearnMoreLabel,
}: Props) {
  const [editMode, setEditMode] = useState(false);
  const [editInsight, setEditInsight] = useState(insightText);
  const [editingProfile, setEditingProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState(userName);
  const [deadlineDraft, setDeadlineDraft] = useState(releaseDeadline);
  const [urlDraft, setUrlDraft] = useState(learnMoreUrl);
  const [titleDraft, setTitleDraft] = useState(insightTitle);
  const [labelDraft, setLabelDraft] = useState(learnMoreLabel);

  // Confirm dialog state
  const [confirm, setConfirm] = useState<null | { kind: "insight" | "url" | "title" | "label"; value: string }>(null);

  // Auto-saved indicators (transient)
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const flashSaved = (key: string) => { setSavedFlash(key); setTimeout(() => setSavedFlash((k) => k === key ? null : k), 1200); };

  // Sync drafts when props change (e.g. project switch)
  useEffect(() => { setEditInsight(insightText); }, [insightText]);
  useEffect(() => { setUrlDraft(learnMoreUrl); }, [learnMoreUrl]);
  useEffect(() => { setTitleDraft(insightTitle); }, [insightTitle]);
  useEffect(() => { setLabelDraft(learnMoreLabel); }, [learnMoreLabel]);

  // Debounced auto-save (Admin Mode)
  const debouncedInsight = useDebouncedCallback((v: string) => { onUpdateInsight(v); flashSaved("insight"); }, 600);
  const debouncedUrl = useDebouncedCallback((v: string) => { onUpdateLearnMoreUrl(v); flashSaved("url"); }, 600);
  const debouncedTitle = useDebouncedCallback((v: string) => { onUpdateInsightTitle(v); flashSaved("title"); }, 600);
  const debouncedLabel = useDebouncedCallback((v: string) => { onUpdateLearnMoreLabel(v); flashSaved("label"); }, 600);

  // Auto-enable insight edit when global edit mode active
  const insightEditing = editMode || globalEditMode;

  const passRate = stats.totalTC > 0 ? ((stats.passed / stats.totalTC) * 100).toFixed(1) : "0";
  const countdown = useCountdown(releaseDeadline);
  const greeting = getGreeting();

  // Critical pending count for greeting message
  const pendingCount = stats.pending;

  const cards = [
    { label: "Total Test Cases", value: stats.totalTC, icon: BarChart3, color: "text-stat-total", bg: "bg-blue-50", glow: false },
    { label: "Passed", value: stats.passed, icon: CheckCircle, color: "text-stat-passed", bg: "bg-emerald-50", glow: false },
    { label: "Failed", value: stats.failed, icon: XCircle, color: "text-stat-failed", bg: "bg-red-50", glow: stats.failed > 0 },
    { label: "Pending", value: stats.pending, icon: Clock, color: "text-stat-pending", bg: "bg-amber-50", glow: false },
  ];

  // Pie chart: status per submodule (aggregated by category)
  const pieData = useMemo(() => {
    const result: { name: string; value: number }[] = [];
    for (const cat of categories) {
      let total = 0;
      for (const sub of cat.submodules) {
        const s = submoduleStats[sub.id];
        if (s) total += s.totalTC;
      }
      if (total > 0) result.push({ name: cat.name, value: total });
    }
    return result;
  }, [categories, submoduleStats]);

  // Line chart: daily execution trend from journal entries (count per day)
  const lineData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const j of journalEntries) {
      const d = j.date || j.createdAt.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    }
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, count]) => ({ date: date.slice(5), entries: count }));
  }, [journalEntries]);

  const handleSaveInsight = () => { onUpdateInsight(editInsight); setEditMode(false); };
  const handleSaveProfile = () => {
    onUpdateUserName(nameDraft.trim() || userName);
    onUpdateDeadline(deadlineDraft);
    setEditingProfile(false);
  };

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-primary/10 via-emerald-50 to-blue-50 dark:from-primary/20 dark:via-emerald-900/20 dark:to-blue-900/20 rounded-2xl border border-border p-6 relative">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Sparkles size={12} /> {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {greeting}, {userName}! 👋
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {pendingCount > 0
                ? <>Ada <span className="font-semibold text-amber-600">{pendingCount} test case pending</span> yang menunggu verifikasimu hari ini.</>
                : stats.failed > 0
                ? <>Ada <span className="font-semibold text-red-600">{stats.failed} test case failed</span> yang perlu di-retest.</>
                : stats.totalTC > 0
                ? <>Semua test case dalam kondisi baik. Pertahankan kualitasnya! 🎉</>
                : <>Mulai catat test case pertamamu untuk membangun confidence rilis.</>}
            </p>
          </div>
          <button onClick={() => { setNameDraft(userName); setDeadlineDraft(releaseDeadline); setEditingProfile(true); }}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Edit2 size={12} /> Edit Profile
          </button>
        </div>

        {editingProfile && (
          <div className="mt-4 p-3 bg-card rounded-lg border border-border space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Nama Panggilan</label>
                <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm mt-1" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Deadline Rilis</label>
                <input type="datetime-local" value={deadlineDraft} onChange={(e) => setDeadlineDraft(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm mt-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingProfile(false)} className="px-3 py-1 text-xs rounded border border-border text-muted-foreground">Cancel</button>
              <button onClick={handleSaveProfile} className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground">Save</button>
            </div>
          </div>
        )}

        {/* Countdown */}
        {countdown && (
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar size={12} />
              {countdown.past ? "Lewat dari deadline:" : "Menuju rilis:"}
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { v: countdown.d, l: "Hari" },
                { v: countdown.h, l: "Jam" },
                { v: countdown.m, l: "Min" },
                { v: countdown.s, l: "Det" },
              ].map((c) => (
                <div key={c.l} className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${countdown.past ? "bg-red-100 text-red-700" : "bg-card text-foreground border border-border"}`}>
                  {String(c.v).padStart(2, "0")}<span className="ml-1 text-[9px] font-normal opacity-60">{c.l}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Overview of QA test execution</p>
        </div>
        <button
          onClick={() => { setEditMode(!editMode); if (!editMode) onEditStats(); }}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${editMode ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted text-muted-foreground"}`}>
          <Edit2 size={14} /> {editMode ? "Editing..." : "Edit Stats"}
        </button>
      </div>

      {/* KPI Cards — show 0 explicitly */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label}
            className={`bg-card rounded-xl border border-border p-5 shadow-sm transition-shadow ${card.glow ? "shadow-red-200 ring-1 ring-red-200 animate-pulse" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</span>
              <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon size={18} className={card.color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{Number(card.value ?? 0).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Distribution per Category</h3>
          {pieData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
              Belum ada data submodule. Isi statistik per submodule untuk melihat chart.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Daily Execution Trend (Journal)</h3>
          {lineData.length === 0 ? (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
              Belum ada entry jurnal. Tambahkan Daily Journal untuk lihat tren.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="entries" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Middle Row: Analytics + Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Live Analytics — Hero */}
        <div className="bg-gradient-to-br from-emerald-50 via-card to-card dark:from-emerald-950/30 rounded-xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-primary" />
            <h3 className="font-semibold text-foreground">Live Analytics — Auto Pass Rate</h3>
          </div>
          <div className="text-center mb-5">
            <p className="text-6xl font-extrabold bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
              {passRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
              {Number(stats.passed ?? 0)} of {Number(stats.totalTC ?? 0)} test cases passed
            </p>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden mb-5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-primary to-emerald-400 rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(6,78,59,0.5)]"
              style={{ width: `${Math.min(Number(passRate), 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg">
              <p className="text-lg font-bold text-stat-passed">{Number(stats.passed ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Passed</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950/40 rounded-lg">
              <p className="text-lg font-bold text-stat-failed">{Number(stats.failed ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Failed</p>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg">
              <p className="text-lg font-bold text-stat-pending">{Number(stats.pending ?? 0).toLocaleString()}</p>
              <p className="text-[11px] text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>

        {/* QA Insight */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Lightbulb size={18} className="text-amber-500 shrink-0" />
              {globalEditMode ? (
                <input
                  value={titleDraft}
                  onChange={(e) => { setTitleDraft(e.target.value); debouncedTitle(e.target.value); }}
                  className="font-semibold text-foreground bg-transparent border-b border-dashed border-border focus:outline-none focus:border-primary text-sm flex-1 min-w-0"
                  placeholder="Card title..."
                />
              ) : (
                <h3 className="font-semibold text-foreground truncate">{insightTitle}</h3>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {savedFlash === "title" && <span className="text-[10px] text-emerald-600 inline-flex items-center gap-0.5"><Check size={10}/>Saved</span>}
              {globalEditMode && (
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Admin</span>
              )}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {insightEditing ? (
              <div className="w-full space-y-2">
                <textarea
                  value={editInsight}
                  onChange={(e) => { setEditInsight(e.target.value); debouncedInsight(e.target.value); }}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={4}
                  placeholder="Tulis insight QA hari ini..."
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {savedFlash === "insight" ? <span className="text-emerald-600 inline-flex items-center gap-0.5"><Check size={10}/>Auto-saved</span> : "Auto-save aktif (debounce 600ms)"}
                  </span>
                  <button
                    onClick={() => setConfirm({ kind: "insight", value: editInsight })}
                    className="text-[11px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted inline-flex items-center gap-1"
                    title="Konfirmasi simpan sekarang"
                  >
                    <Save size={11} /> Save now
                  </button>
                </div>
              </div>
            ) : (
              <blockquote className="text-center italic text-muted-foreground text-base leading-relaxed px-4">"{insightText}"</blockquote>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            {globalEditMode && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide w-16 shrink-0">CTA Text</label>
                  <input
                    value={labelDraft}
                    onChange={(e) => { setLabelDraft(e.target.value); debouncedLabel(e.target.value); }}
                    placeholder="Button label..."
                    className="flex-1 px-2 py-1 rounded border border-input bg-background text-xs"
                  />
                  {savedFlash === "label" && <Check size={12} className="text-emerald-600" />}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide w-16 shrink-0">URL</label>
                  <input
                    value={urlDraft}
                    onChange={(e) => { setUrlDraft(e.target.value); debouncedUrl(e.target.value); }}
                    placeholder="https://..."
                    className="flex-1 px-2 py-1 rounded border border-input bg-background text-xs"
                  />
                  {savedFlash === "url" && <Check size={12} className="text-emerald-600" />}
                  <button
                    onClick={() => setConfirm({ kind: "url", value: urlDraft })}
                    className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted"
                    title="Konfirmasi simpan URL"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <a href={learnMoreUrl || "#"} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <ExternalLink size={12} /> {learnMoreLabel || "Learn More"}
              </a>
              {globalEditMode && (
                <span className="text-[10px] text-muted-foreground">Auto-save aktif</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirm}
        title="Konfirmasi Simpan Perubahan"
        description={
          confirm?.kind === "url"
            ? `Simpan URL Learn More menjadi: ${confirm.value || "(kosong)"}?`
            : confirm?.kind === "insight"
            ? "Simpan teks insight saat ini ke localStorage?"
            : "Simpan perubahan?"
        }
        confirmLabel="Ya, Simpan"
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "insight") onUpdateInsight(confirm.value);
          if (confirm.kind === "url") onUpdateLearnMoreUrl(confirm.value);
          if (confirm.kind === "title") onUpdateInsightTitle(confirm.value);
          if (confirm.kind === "label") onUpdateLearnMoreLabel(confirm.value);
          flashSaved(confirm.kind);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
