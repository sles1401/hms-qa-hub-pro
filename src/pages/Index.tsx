import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardTab from "@/components/DashboardTab";
import EmbedTab from "@/components/EmbedTab";
import QAHubTab from "@/components/QAHubTab";
import ManageModulesModal from "@/components/ManageModulesModal";
import EditStatsModal from "@/components/EditStatsModal";
import { loadConfig, saveConfig, type AppConfig } from "@/lib/store";

export default function Index() {
  const [config, setConfig] = useState<AppConfig>(loadConfig);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showModules, setShowModules] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { saveConfig(config); }, [config]);

  const update = (partial: Partial<AppConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        categories={config.categories}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onManageModules={() => setShowModules(true)}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((p) => !p)}
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
