import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardTab from "@/components/DashboardTab";
import EmbedTab from "@/components/EmbedTab";
import QAHubTab from "@/components/QAHubTab";
import SubmoduleDetailTab from "@/components/SubmoduleDetailTab";
import ManageModulesModal from "@/components/ManageModulesModal";
import EditStatsModal from "@/components/EditStatsModal";
import DefectTrackerTab from "@/components/DefectTrackerTab";
import DailyJournalTab from "@/components/DailyJournalTab";
import ReleaseNotesTab from "@/components/ReleaseNotesTab";
import TemplateLibraryTab from "@/components/TemplateLibraryTab";
import PassedWithNotesTab from "@/components/PassedWithNotesTab";
import BugTrackerTab from "@/components/BugTrackerTab";
import AuditTrailTab from "@/components/AuditTrailTab";
import DevControlCenterTab from "@/components/DevControlCenterTab";
import FigmaLinkTab from "@/components/FigmaLinkTab";
import EnvSwitcher from "@/components/EnvSwitcher";
import RoleSwitcher from "@/components/RoleSwitcher";
import AdminPinGate, { getStoredPin } from "@/components/AdminPinGate";
import { useRole } from "@/hooks/useRole";
import {
  loadConfig, saveConfig, setActiveProjectId, getActiveProjectId,
  getActiveEnv, setActiveEnv, appendAudit, syncPassedToEnv,
  DEFAULT_SUBMODULE_STATS, type AppConfig, type SubmoduleStats, type Environment,
} from "@/lib/store";

export default function Index() {
  const [projectId, setProjectId] = useState(getActiveProjectId);
  const [env, setEnv] = useState<Environment>(getActiveEnv);
  const [config, setConfig] = useState<AppConfig>(() => loadConfig(projectId, env));
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showModules, setShowModules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSubmodule, setActiveSubmodule] = useState<{ id: string; name: string } | null>(null);
  const [globalEditMode, setGlobalEditMode] = useState(false);
  const [pinGate, setPinGate] = useState<"verify" | "setup" | null>(null);
  const { isAdmin } = useRole();

  const handleToggleAdmin = () => {
    if (globalEditMode) {
      setGlobalEditMode(false);
      return;
    }
    const stored = getStoredPin();
    setPinGate(stored ? "verify" : "setup");
  };

  useEffect(() => { saveConfig(config, projectId, env); }, [config, projectId, env]);

  const update = (partial: Partial<AppConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

  const audit = useCallback((action: string, target: string) => {
    setConfig((prev) => appendAudit(prev, prev.userName || "User", action, target));
  }, []);

  const handleSwitchProject = useCallback((newId: string) => {
    saveConfig(config, projectId, env);
    setActiveProjectId(newId);
    setProjectId(newId);
    setConfig(loadConfig(newId, env));
    setActiveTab("dashboard");
    setActiveSubmodule(null);
  }, [config, projectId, env]);

  const handleSwitchEnv = useCallback((newEnv: Environment) => {
    saveConfig(config, projectId, env);
    setActiveEnv(newEnv);
    setEnv(newEnv);
    setConfig(loadConfig(projectId, newEnv));
    setActiveSubmodule(null);
  }, [config, projectId, env]);

  const handleSubmoduleClick = (id: string, name: string) => {
    setActiveTab("submodule");
    setActiveSubmodule({ id, name });
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setActiveSubmodule(null);
  };

  const handleSubmoduleStatsUpdate = (stats: SubmoduleStats) => {
    if (!activeSubmodule) return;
    update({
      submoduleStats: {
        ...config.submoduleStats,
        [activeSubmodule.id]: stats,
      },
    });
    audit("Update Submodule Stats", `${activeSubmodule.name} (P:${stats.passed}/F:${stats.failed}/Pn:${stats.pending})`);
  };

  const handleSyncToProduction = () => {
    saveConfig(config, projectId, env);
    const r = syncPassedToEnv(projectId, "staging", "production");
    audit("Sync to Production", `${r.copied} submodule disalin`);
    return r;
  };

  const currentSubmoduleStats = activeSubmodule
    ? config.submoduleStats[activeSubmodule.id] || { ...DEFAULT_SUBMODULE_STATS }
    : DEFAULT_SUBMODULE_STATS;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        categories={config.categories}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onManageModules={() => setShowModules(true)}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
        onSubmoduleClick={handleSubmoduleClick}
        activeSubmodule={activeSubmodule?.id}
        projectTitle={config.projectTitle}
        onUpdateTitle={(projectTitle) => update({ projectTitle })}
        onSwitchProject={handleSwitchProject}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Top Header with Env Switcher + Global Edit Mode */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{config.projectTitle}</span>
            <span className="mx-2">·</span>
            <span className={env === "production" ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
              {env === "production" ? "Production" : "Staging"} Environment
            </span>
          </div>
          <div className="flex items-center gap-2">
            <RoleSwitcher />
            <button
              onClick={handleToggleAdmin}
              disabled={!isAdmin && !globalEditMode}
              className={`text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                globalEditMode
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
              title={isAdmin ? "Toggle View / Admin mode (PIN protected)" : "Switch ke role Admin QA dulu"}
            >
              {globalEditMode ? "🔓 Admin Mode" : "🔒 View Mode"}
            </button>
            <EnvSwitcher env={env} onChange={handleSwitchEnv} />
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          {activeTab === "dashboard" && (
            <DashboardTab
              stats={config.stats}
              onEditStats={() => setShowStats(true)}
              insightText={config.insightText}
              onUpdateInsight={(insightText) => update({ insightText })}
              userName={config.userName}
              onUpdateUserName={(userName) => update({ userName })}
              releaseDeadline={config.releaseDeadline}
              onUpdateDeadline={(releaseDeadline) => update({ releaseDeadline })}
              submoduleStats={config.submoduleStats}
              categories={config.categories}
              journalEntries={config.journalEntries}
              globalEditMode={globalEditMode}
              learnMoreUrl={config.learnMoreUrl}
              onUpdateLearnMoreUrl={(learnMoreUrl) => { update({ learnMoreUrl }); audit("Update Learn More URL", learnMoreUrl || "(empty)"); }}
              insightTitle={config.insightTitle}
              onUpdateInsightTitle={(insightTitle) => { update({ insightTitle }); audit("Update Insight Title", insightTitle); }}
              learnMoreLabel={config.learnMoreLabel}
              onUpdateLearnMoreLabel={(learnMoreLabel) => { update({ learnMoreLabel }); audit("Update Learn More Label", learnMoreLabel); }}
              exportFullConfig={() => config}
              importFullConfig={(data) => { setConfig((prev) => ({ ...prev, ...data })); audit("Import Admin Settings", "full config"); }}
              env={env}
              onSyncToProduction={env === "staging" ? handleSyncToProduction : undefined}
              projectId={projectId}
              projectTitle={config.projectTitle}
            />
          )}
          {activeTab === "test-plan" && (
            <EmbedTab title="Strategic Test Plan" description="Embed your Google Docs test plan document"
              url={config.testPlanUrl} onUpdateUrl={(url) => { update({ testPlanUrl: url }); audit("Update Test Plan URL", url || "(empty)"); }} type="docs" />
          )}
          {activeTab === "test-case" && (
            <EmbedTab title="Test Case Library" description="Embed your Google Sheets test case spreadsheet"
              url={config.testCaseUrl} onUpdateUrl={(url) => { update({ testCaseUrl: url }); audit("Update Test Case URL", url || "(empty)"); }} type="sheets" />
          )}
          {activeTab === "defect-tracker" && (
            <DefectTrackerTab url={config.defectTrackerUrl}
              onUpdateUrl={(url) => { update({ defectTrackerUrl: url }); audit("Update Defect Tracker URL", url || "(empty)"); }} />
          )}
          {activeTab === "bug-tracker" && (
            <BugTrackerTab bugs={config.bugs}
              onUpdate={(bugs) => update({ bugs })} onAudit={audit} />
          )}
          {activeTab === "passed-notes" && (
            <PassedWithNotesTab entries={config.passedWithNotes}
              onUpdate={(passedWithNotes) => update({ passedWithNotes })} onAudit={audit} />
          )}
          {activeTab === "audit-trail" && (
            <AuditTrailTab log={config.auditLog} onClear={() => update({ auditLog: [] })} />
          )}
          {activeTab === "faq-logic" && (
            <QAHubTab questions={config.qaQuestions} onUpdate={(qaQuestions) => update({ qaQuestions })}
              qaCategories={config.qaCategories || []} onUpdateCategories={(qaCategories) => update({ qaCategories })} />
          )}
          {activeTab === "daily-journal" && (
            <DailyJournalTab entries={config.journalEntries} onUpdate={(journalEntries) => update({ journalEntries })} />
          )}
          {activeTab === "release-notes" && (
            <ReleaseNotesTab notes={config.releaseNotes} onUpdate={(releaseNotes) => update({ releaseNotes })} />
          )}
          {activeTab === "template-library" && (
            <TemplateLibraryTab templateUrls={config.templateUrls || {}}
              onUpdateUrl={(id, url) => update({ templateUrls: { ...config.templateUrls, [id]: url } })} />
          )}
          {activeTab === "submodule" && activeSubmodule && (
            <SubmoduleDetailTab submoduleId={activeSubmodule.id} submoduleName={activeSubmodule.name}
              stats={currentSubmoduleStats} onUpdateStats={handleSubmoduleStatsUpdate}
              onBack={() => handleTabChange("dashboard")} />
          )}
        </div>
      </main>

      {showModules && (
        <ManageModulesModal categories={config.categories}
          onSave={(categories) => { update({ categories }); audit("Update Modules", `${categories.length} categories`); }}
          onClose={() => setShowModules(false)} />
      )}
      {showStats && (
        <EditStatsModal stats={config.stats}
          onSave={(stats) => { update({ stats }); audit("Update Dashboard Stats", `Total: ${stats.totalTC}`); }}
          onClose={() => setShowStats(false)} />
      )}
      {pinGate && (
        <AdminPinGate mode={pinGate} onSuccess={() => { setGlobalEditMode(true); setPinGate(null); audit("Enable Admin Mode", "PIN verified"); }} onClose={() => setPinGate(null)} />
      )}
    </div>
  );
}
