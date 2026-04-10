import { useState, useEffect } from "react";
import {
  Database, Truck, ChevronDown, ChevronRight,
  Settings, LayoutDashboard, FileText, Table, Menu, X, HelpCircle, Bug, BookOpen, Rocket,
  Sun, Moon, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Category, loadConfig } from "@/lib/store";
import { Switch } from "@/components/ui/switch";

const ICON_MAP: Record<string, React.ElementType> = {
  Database, Truck, Settings,
};

interface SidebarProps {
  categories: Category[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onManageModules: () => void;
  isOpen: boolean;
  onToggle: () => void;
  onSubmoduleClick?: (submoduleId: string, submoduleName: string) => void;
  activeSubmodule?: string | null;
}

export default function Sidebar({
  categories, activeTab, onTabChange, onManageModules, isOpen, onToggle, onSubmoduleClick, activeSubmodule,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "master-data": true });

  const toggle = (id: string) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "test-plan", label: "Strategic Test Plan", icon: FileText },
    { id: "test-case", label: "Test Case Library", icon: Table },
    { id: "defect-tracker", label: "Defect Tracker", icon: Bug },
    { id: "faq-logic", label: "FAQ & Logic", icon: HelpCircle },
    { id: "daily-journal", label: "Daily Journal", icon: BookOpen },
    { id: "release-notes", label: "Release Notes", icon: Rocket },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 md:hidden rounded-lg p-2 bg-primary text-primary-foreground shadow-lg"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onToggle} />
      )}

      <aside
        className={cn(
          "fixed md:static z-40 h-screen w-64 sidebar-gradient flex flex-col border-r border-sidebar-border transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">QA</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-sidebar-foreground tracking-wide">HMS QA HUB</h1>
              <p className="text-[10px] text-sidebar-muted">Scalable Web Center</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted px-2 mb-2">
            Navigation
          </p>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onTabChange(item.id); if (isOpen) onToggle(); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                activeTab === item.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
              )}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}

          <div className="pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted px-2 mb-2">
              Modules
            </p>
            {categories.map((cat) => {
              const Icon = ICON_MAP[cat.icon] || Database;
              const isExpanded = expanded[cat.id];
              return (
                <div key={cat.id}>
                  <button
                    onClick={() => toggle(cat.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors"
                  >
                    <Icon size={16} />
                    <span className="flex-1 text-left">{cat.name}</span>
                    <span className="text-[10px] bg-sidebar-accent rounded-full px-1.5 py-0.5 text-sidebar-muted">
                      {cat.submodules.length}
                    </span>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  {isExpanded && (
                    <div className="ml-6 border-l border-sidebar-border pl-3 space-y-0.5 py-1">
                      {cat.submodules.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => { onSubmoduleClick?.(sub.id, sub.name); if (isOpen) onToggle(); }}
                          className={cn(
                            "w-full text-left text-xs py-1.5 px-2 rounded hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors",
                            activeSubmodule === sub.id
                              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                              : "text-sidebar-muted"
                          )}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Manage Modules */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            onClick={onManageModules}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors"
          >
            <Settings size={16} />
            Manage Modules
          </button>
          <button
            onClick={() => {
              const data = loadConfig();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `hms-qa-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors"
          >
            <Download size={16} />
            Export Backup (JSON)
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <div className="p-3 border-t border-sidebar-border">
          <DarkModeToggle />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-[10px] text-sidebar-muted text-center leading-relaxed">
            Developed by <span className="text-emerald-400 font-medium">Suryani Lestari</span>
            <br />QA Engineer
          </p>
        </div>
      </aside>
    </>
  );
}
