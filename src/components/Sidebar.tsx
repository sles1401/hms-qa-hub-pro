import { useState, useEffect, useRef } from "react";
import {
  Database, Truck, ChevronDown, ChevronRight,
  Settings, LayoutDashboard, FileText, Table, Menu, X, HelpCircle, Bug, BookOpen, Rocket,
  Sun, Moon, Download, Upload, Pencil, Check, Plus, Trash2, FolderOpen, Copy,
  CheckCircle2, History, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Category, type ProjectEntry, type AppConfig, loadConfig, getProjects, getActiveProjectId, createProject, deleteProject, duplicateProject, importProject } from "@/lib/store";
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
  projectTitle: string;
  onUpdateTitle: (title: string) => void;
  onSwitchProject: (projectId: string) => void;
}

function DarkModeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDark(true);
    }
  }, []);

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Sun size={14} className="text-sidebar-muted" />
      <Switch checked={dark} onCheckedChange={setDark} />
      <Moon size={14} className="text-sidebar-muted" />
      <span className="text-xs text-sidebar-muted ml-1">{dark ? "Dark" : "Light"}</span>
    </div>
  );
}

function ProjectSwitcher({ currentProjectId, onSwitch }: { currentProjectId: string; onSwitch: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectEntry[]>(getProjects);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = () => setProjects(getProjects());

  useEffect(() => {
    refresh();
  }, [currentProjectId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleCreate = () => {
    const name = newName.trim() || `Project ${projects.length + 1}`;
    const id = createProject(name);
    setNewName("");
    setShowNew(false);
    refresh();
    onSwitch(id);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length <= 1) return;
    if (!confirm("Hapus project ini? Data akan hilang permanen.")) return;
    deleteProject(id);
    refresh();
    if (id === currentProjectId) {
      const remaining = getProjects();
      onSwitch(remaining[0].id);
    }
  };

  const handleDuplicate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = duplicateProject(id);
    refresh();
    onSwitch(newId);
    setOpen(false);
  };

  const current = projects.find((p) => p.id === currentProjectId);

  return (
    <div ref={ref} className="relative px-3 py-2 border-b border-sidebar-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors"
      >
        <FolderOpen size={14} />
        <span className="flex-1 text-left truncate">{current?.name || "Select Project"}</span>
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full mt-1 z-50 bg-sidebar-accent border border-sidebar-border rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto py-1">
            {projects.map((p) => (
              <div
                key={p.id}
                onClick={() => { onSwitch(p.id); setOpen(false); }}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 text-xs cursor-pointer transition-colors",
                  p.id === currentProjectId
                    ? "bg-emerald-500/20 text-sidebar-foreground font-medium"
                    : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground"
                )}
              >
                <span className="flex-1 truncate">{p.name}</span>
                <button
                  onClick={(e) => handleDuplicate(p.id, e)}
                  className="opacity-0 group-hover:opacity-100 hover:text-emerald-300 transition-opacity shrink-0"
                  title="Duplikasi project"
                >
                  <Copy size={12} />
                </button>
                {projects.length > 1 && (
                  <button
                    onClick={(e) => handleDelete(p.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-sidebar-border p-2">
            {showNew ? (
              <div className="flex items-center gap-1">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  placeholder="Nama project..."
                  className="flex-1 text-xs bg-transparent border-b border-emerald-400 text-sidebar-foreground outline-none px-1 py-0.5"
                  autoFocus
                />
                <button onClick={handleCreate} className="text-emerald-400 hover:text-emerald-300">
                  <Check size={14} />
                </button>
                <button onClick={() => { setShowNew(false); setNewName(""); }} className="text-sidebar-muted hover:text-sidebar-foreground">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowNew(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-emerald-400 hover:bg-sidebar-hover transition-colors"
              >
                <Plus size={14} />
                New Project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  categories, activeTab, onTabChange, onManageModules, isOpen, onToggle, onSubmoduleClick, activeSubmodule, projectTitle, onUpdateTitle, onSwitchProject,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "master-data": true });
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(projectTitle);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTitleDraft(projectTitle); }, [projectTitle]);

  const toggle = (id: string) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "test-plan", label: "Strategic Test Plan", icon: FileText },
    { id: "test-case", label: "Test Case Library", icon: Table },
    { id: "defect-tracker", label: "Defect Tracker", icon: Bug },
    { id: "bug-tracker", label: "Bug Tracker (SLA)", icon: ShieldAlert },
    { id: "passed-notes", label: "Passed with Notes", icon: CheckCircle2 },
    { id: "faq-logic", label: "FAQ & Logic", icon: HelpCircle },
    { id: "daily-journal", label: "Daily Journal", icon: BookOpen },
    { id: "release-notes", label: "Release Notes", icon: Rocket },
    { id: "template-library", label: "Template Library", icon: FileText },
    { id: "audit-trail", label: "Audit Trail", icon: History },
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
        {/* Logo & Title */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
              <span className="text-white font-extrabold text-sm">QA</span>
            </div>
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onUpdateTitle(titleDraft.trim() || projectTitle);
                        setEditingTitle(false);
                      } else if (e.key === "Escape") {
                        setTitleDraft(projectTitle);
                        setEditingTitle(false);
                      }
                    }}
                    className="text-sm font-bold text-sidebar-foreground tracking-wide bg-transparent border-b border-emerald-400 outline-none w-full"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      onUpdateTitle(titleDraft.trim() || projectTitle);
                      setEditingTitle(false);
                    }}
                    className="text-emerald-400 hover:text-emerald-300"
                  >
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group">
                  <h1 className="text-sm font-bold text-sidebar-foreground tracking-wide truncate">{projectTitle}</h1>
                  <button
                    onClick={() => { setTitleDraft(projectTitle); setEditingTitle(true); }}
                    className="opacity-0 group-hover:opacity-100 text-sidebar-muted hover:text-emerald-400 transition-opacity"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              )}
              <p className="text-[10px] text-sidebar-muted">Scalable Web Center</p>
            </div>
          </div>
        </div>

        {/* Project Switcher */}
        <ProjectSwitcher currentProjectId={getActiveProjectId()} onSwitch={onSwitchProject} />

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
              a.download = `qa-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors"
          >
            <Download size={16} />
            Export Backup (JSON)
          </button>
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".json";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const data = JSON.parse(ev.target?.result as string) as AppConfig;
                    if (!data.categories && !data.stats) {
                      alert("File JSON tidak valid. Pastikan file adalah backup dari QA Hub.");
                      return;
                    }
                    const id = importProject(data);
                    onSwitchProject(id);
                  } catch {
                    alert("Gagal membaca file JSON. Pastikan format file benar.");
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors"
          >
            <Upload size={16} />
            Import Backup (JSON)
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
