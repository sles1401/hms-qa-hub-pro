export interface Submodule {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  submodules: Submodule[];
}

export interface QAQuestion {
  id: string;
  category: string;
  question: string;
  directedTo: "Developer" | "UI-UX";
  answer: string;
  answeredBy: string;
  status: "PENDING" | "RESOLVED";
  createdAt: string;
}

export interface TestClassification {
  positive: number;
  negative: number;
  edgeCase: number;
  integrationTest: number;
  uiUxCheck: number;
  securityRole: number;
}

export interface SubmoduleStats {
  totalTC: number;
  passed: number;
  failed: number;
  pending: number;
  classification: TestClassification;
}

export interface AppStats {
  totalTC: number;
  passed: number;
  failed: number;
  pending: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  taskCompleted: string;
  blockers: string;
  nextPlan: string;
  createdAt: string;
}

export interface ReleaseNote {
  id: string;
  version: string;
  releaseDate: string;
  features: string;
  bugFixes: string;
  knownIssues: string;
  createdAt: string;
}

export interface AppConfig {
  projectTitle: string;
  categories: Category[];
  stats: AppStats;
  testPlanUrl: string;
  testCaseUrl: string;
  defectTrackerUrl: string;
  qaQuestions: QAQuestion[];
  qaCategories: string[];
  submoduleStats: Record<string, SubmoduleStats>;
  insightText: string;
  journalEntries: JournalEntry[];
  releaseNotes: ReleaseNote[];
}

export interface ProjectEntry {
  id: string;
  name: string;
}

export const DEFAULT_SUBMODULE_STATS: SubmoduleStats = {
  totalTC: 0,
  passed: 0,
  failed: 0,
  pending: 0,
  classification: {
    positive: 0,
    negative: 0,
    edgeCase: 0,
    integrationTest: 0,
    uiUxCheck: 0,
    securityRole: 0,
  },
};

const DEFAULT_CONFIG: AppConfig = {
  projectTitle: "New Project",
  categories: [
    {
      id: "master-data",
      name: "Master Data",
      icon: "Database",
      submodules: [
        { id: "company", name: "Company" },
        { id: "unit", name: "Unit" },
        { id: "role", name: "Role" },
        { id: "user", name: "User" },
        { id: "customer", name: "Customer" },
        { id: "supplier", name: "Supplier" },
        { id: "document-type", name: "Document Type" },
        { id: "vehicle", name: "Vehicle" },
        { id: "driver", name: "Driver" },
        { id: "route", name: "Route" },
        { id: "warehouse", name: "Warehouse" },
        { id: "product", name: "Product" },
      ],
    },
    {
      id: "hauling",
      name: "Hauling Management",
      icon: "Truck",
      submodules: [
        { id: "ritase", name: "Ritase" },
        { id: "delivery-order", name: "Delivery Order" },
        { id: "manifest", name: "Manifest" },
      ],
    },
  ],
  stats: {
    totalTC: 0,
    passed: 0,
    failed: 0,
    pending: 0,
  },
  testPlanUrl: "",
  testCaseUrl: "",
  defectTrackerUrl: "",
  qaQuestions: [],
  qaCategories: [],
  submoduleStats: {},
  insightText: "Good testing is not about finding bugs. It's about delivering confidence in every release.",
  journalEntries: [],
  releaseNotes: [],
};

const PROJECTS_KEY = "hms-qa-projects";
const ACTIVE_PROJECT_KEY = "hms-qa-active-project";

function projectStorageKey(projectId: string) {
  return `hms-qa-hub-config-${projectId}`;
}

// Migration: move old single-project data to multi-project format
function migrateIfNeeded() {
  const oldKey = "hms-qa-hub-config";
  const existing = localStorage.getItem(PROJECTS_KEY);
  if (!existing) {
    const oldData = localStorage.getItem(oldKey);
    const defaultId = "project-1";
    let projectName = "HMS QA HUB";

    if (oldData) {
      try {
        const parsed = JSON.parse(oldData);
        projectName = parsed.projectTitle || projectName;
      } catch {}
      localStorage.setItem(projectStorageKey(defaultId), oldData);
      localStorage.removeItem(oldKey);
    }

    const projects: ProjectEntry[] = [{ id: defaultId, name: projectName }];
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    localStorage.setItem(ACTIVE_PROJECT_KEY, defaultId);
  }
}

export function getProjects(): ProjectEntry[] {
  migrateIfNeeded();
  try {
    const stored = localStorage.getItem(PROJECTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveProjects(projects: ProjectEntry[]) {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getActiveProjectId(): string {
  migrateIfNeeded();
  return localStorage.getItem(ACTIVE_PROJECT_KEY) || getProjects()[0]?.id || "project-1";
}

export function setActiveProjectId(id: string) {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
}

export function createProject(name: string): string {
  const projects = getProjects();
  const id = `project-${Date.now()}`;
  projects.push({ id, name });
  saveProjects(projects);

  const newConfig: AppConfig = { ...DEFAULT_CONFIG, projectTitle: name };
  localStorage.setItem(projectStorageKey(id), JSON.stringify(newConfig));
  setActiveProjectId(id);
  return id;
}

export function duplicateProject(sourceId: string, newName?: string): string {
  const sourceConfig = loadConfig(sourceId);
  const projects = getProjects();
  const id = `project-${Date.now()}`;
  const name = newName || `${sourceConfig.projectTitle} (Copy)`;
  projects.push({ id, name });
  saveProjects(projects);

  const newConfig: AppConfig = { ...sourceConfig, projectTitle: name };
  localStorage.setItem(projectStorageKey(id), JSON.stringify(newConfig));
  setActiveProjectId(id);
  return id;
}

export function importProject(configData: AppConfig): string {
  const projects = getProjects();
  const id = `project-${Date.now()}`;
  const name = configData.projectTitle || `Imported Project`;
  projects.push({ id, name });
  saveProjects(projects);
  localStorage.setItem(projectStorageKey(id), JSON.stringify(configData));
  setActiveProjectId(id);
  return id;
}

export function deleteProject(id: string) {
  let projects = getProjects().filter((p) => p.id !== id);
  localStorage.removeItem(projectStorageKey(id));

  if (projects.length === 0) {
    const fallbackId = `project-${Date.now()}`;
    projects = [{ id: fallbackId, name: "New Project" }];
    localStorage.setItem(projectStorageKey(fallbackId), JSON.stringify(DEFAULT_CONFIG));
  }

  saveProjects(projects);

  if (getActiveProjectId() === id) {
    setActiveProjectId(projects[0].id);
  }
}

export function renameProject(id: string, name: string) {
  const projects = getProjects();
  const p = projects.find((p) => p.id === id);
  if (p) {
    p.name = name;
    saveProjects(projects);
  }
}

export function loadConfig(projectId?: string): AppConfig {
  migrateIfNeeded();
  const id = projectId || getActiveProjectId();
  try {
    const stored = localStorage.getItem(projectStorageKey(id));
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        projectTitle: parsed.projectTitle ?? DEFAULT_CONFIG.projectTitle,
        categories: parsed.categories ?? DEFAULT_CONFIG.categories,
        stats: parsed.stats ?? DEFAULT_CONFIG.stats,
        testPlanUrl: parsed.testPlanUrl ?? DEFAULT_CONFIG.testPlanUrl,
        testCaseUrl: parsed.testCaseUrl ?? DEFAULT_CONFIG.testCaseUrl,
        defectTrackerUrl: parsed.defectTrackerUrl ?? DEFAULT_CONFIG.defectTrackerUrl,
        qaQuestions: parsed.qaQuestions ?? DEFAULT_CONFIG.qaQuestions,
        qaCategories: parsed.qaCategories ?? DEFAULT_CONFIG.qaCategories,
        submoduleStats: parsed.submoduleStats ?? DEFAULT_CONFIG.submoduleStats,
        insightText: parsed.insightText ?? DEFAULT_CONFIG.insightText,
        journalEntries: parsed.journalEntries ?? DEFAULT_CONFIG.journalEntries,
        releaseNotes: parsed.releaseNotes ?? DEFAULT_CONFIG.releaseNotes,
      };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: AppConfig, projectId?: string) {
  const id = projectId || getActiveProjectId();
  localStorage.setItem(projectStorageKey(id), JSON.stringify(config));

  // Also sync project name in the project list
  const projects = getProjects();
  const p = projects.find((p) => p.id === id);
  if (p && p.name !== config.projectTitle) {
    p.name = config.projectTitle;
    saveProjects(projects);
  }
}

export function resetConfig(): AppConfig {
  const id = getActiveProjectId();
  localStorage.removeItem(projectStorageKey(id));
  return { ...DEFAULT_CONFIG };
}
