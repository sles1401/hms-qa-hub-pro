import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardTab from "@/components/DashboardTab";
import EmbedTab from "@/components/EmbedTab";
import QAHubTab from "@/components/QAHubTab";
import SubmoduleDetailTab from "@/components/SubmoduleDetailTab";
import ManageModulesModal from "@/components/ManageModulesModal";
import EditStatsModal from "@/components/EditStatsModal";
import { loadConfig, saveConfig, DEFAULT_SUBMODULE_STATS, type AppConfig, type SubmoduleStats } from "@/lib/store";

export default function Index() {
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showModules, setShowModules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSubmodule, setActiveSubmodule] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { saveConfig(config); }, [config]);

  const update = (partial: Partial<AppConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

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
      />

      <main className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          {activeTab === "dashboard" && (
            <DashboardTab stats={config.stats} onEditStats={() => setShowStats(true)} />
          )}
          {activeTab === "test-plan" && (
            <EmbedTab
              title="Strategic Test Plan"
              description="Embed your Google Docs test plan document"
              url={config.testPlanUrl}
              onUpdateUrl={(url) => update({ testPlanUrl: url })}
              type="docs"
            />
          )}
          {activeTab === "test-case" && (
            <EmbedTab
              title="Test Case Library"
              description="Embed your Google Sheets test case spreadsheet"
              url={config.testCaseUrl}
              onUpdateUrl={(url) => update({ testCaseUrl: url })}
              type="sheets"
            />
          )}
          {activeTab === "faq-logic" && (
            <QAHubTab
              questions={config.qaQuestions}
              onUpdate={(qaQuestions) => update({ qaQuestions })}
              qaCategories={config.qaCategories || []}
              onUpdateCategories={(qaCategories) => update({ qaCategories })}
            />
          )}
          {activeTab === "submodule" && activeSubmodule && (
            <SubmoduleDetailTab
              submoduleId={activeSubmodule.id}
              submoduleName={activeSubmodule.name}
              stats={currentSubmoduleStats}
              onUpdateStats={handleSubmoduleStatsUpdate}
              onBack={() => handleTabChange("dashboard")}
            />
          )}
        </div>
      </main>

      {showModules && (
        <ManageModulesModal
          categories={config.categories}
          onSave={(categories) => update({ categories })}
          onClose={() => setShowModules(false)}
        />
      )}
      {showStats && (
        <EditStatsModal
          stats={config.stats}
          onSave={(stats) => update({ stats })}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  );
}
