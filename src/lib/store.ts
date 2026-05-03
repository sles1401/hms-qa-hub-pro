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

export interface PassedWithNoteEntry {
  id: string;
  module: string;
  testCase: string;
  note: string;
  category: "UI/UX" | "Optimization" | "Suggestion" | "Other";
  createdAt: string;
}

export interface BugItem {
  id: string;
  title: string;
  module: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Fixed" | "Closed";
  assignee: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  who: string;
  action: string;
  target: string;
  at: string;
}

export type Environment = "staging" | "production";

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
  templateUrls: Record<string, string>;
  releaseDeadline: string; // ISO date string for countdown
  userName: string; // for humanize greeting
  passedWithNotes: PassedWithNoteEntry[];
  bugs: BugItem[];
  auditLog: AuditLogEntry[];
  learnMoreUrl: string;
  insightTitle: string;
  learnMoreLabel: string;
}

export interface ProjectEntry {
  id: string;
  name: string;
}

export const DASHBOARD_DEFAULTS = {
  insightText: "Good testing is not about finding bugs. It's about delivering confidence in every release.",
  insightTitle: "QA Insight of the Day",
  learnMoreLabel: "Learn More",
  learnMoreUrl: "https://www.istqb.org/",
};

export function isValidGoogleUrl(url: string): { ok: boolean; reason?: string } {
  if (!url || !url.trim()) return { ok: false, reason: "URL tidak boleh kosong" };
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, reason: "Protokol harus http/https" };
    const allowed = ["drive.google.com", "docs.google.com", "sheets.google.com", "www.istqb.org", "istqb.org"];
    // Allow any https URL but warn if not Google Drive/Docs — per spec validate Google Drive specifically
    if (allowed.some((h) => u.hostname === h || u.hostname.endsWith("." + h))) return { ok: true };
    // Allow generic https URLs but mark as non-google
    return { ok: true };
  } catch {
    return { ok: false, reason: "Format URL tidak valid" };
  }
}

export function isValidGoogleDriveUrl(url: string): { ok: boolean; reason?: string } {
  if (!url || !url.trim()) return { ok: false, reason: "URL tidak boleh kosong" };
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "https:") return { ok: false, reason: "Harus menggunakan HTTPS" };
    const googleHosts = ["drive.google.com", "docs.google.com", "sheets.google.com"];
    const isGoogle = googleHosts.some((h) => u.hostname === h);
    if (!isGoogle) return { ok: false, reason: "URL harus berasal dari Google Drive/Docs/Sheets" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "Format URL tidak valid" };
  }
}

export interface DashboardHistoryEntry {
  id: string;
  field: "insightText" | "insightTitle" | "learnMoreLabel" | "learnMoreUrl";
  oldValue: string;
  newValue: string;
  at: string;
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
  stats: { totalTC: 0, passed: 0, failed: 0, pending: 0 },
  testPlanUrl: "",
  testCaseUrl: "",
  defectTrackerUrl: "",
  qaQuestions: [],
  qaCategories: [],
  submoduleStats: {},
  insightText: "Good testing is not about finding bugs. It's about delivering confidence in every release.",
  journalEntries: [],
  releaseNotes: [],
  templateUrls: {},
  releaseDeadline: "",
  userName: "Yani",
  passedWithNotes: [],
  bugs: [],
  auditLog: [],
  learnMoreUrl: "https://www.istqb.org/",
  insightTitle: "QA Insight of the Day",
  learnMoreLabel: "Learn More",
};

const PROJECTS_KEY = "hms-qa-projects";
const ACTIVE_PROJECT_KEY = "hms-qa-active-project";
const ACTIVE_ENV_KEY = "hms-qa-active-env";

export function getActiveEnv(): Environment {
  const v = localStorage.getItem(ACTIVE_ENV_KEY);
  return v === "production" ? "production" : "staging";
}

export function setActiveEnv(env: Environment) {
  localStorage.setItem(ACTIVE_ENV_KEY, env);
}

function projectStorageKey(projectId: string, env?: Environment) {
  const e = env || getActiveEnv();
  return `hms-qa-hub-config-${projectId}-${e}`;
}

// Migration: move old single-project data to multi-project + env format
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
      // seed both envs with old data
      localStorage.setItem(`hms-qa-hub-config-${defaultId}-staging`, oldData);
      localStorage.removeItem(oldKey);
    }

    const projects: ProjectEntry[] = [{ id: defaultId, name: projectName }];
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    localStorage.setItem(ACTIVE_PROJECT_KEY, defaultId);
    if (!localStorage.getItem(ACTIVE_ENV_KEY)) localStorage.setItem(ACTIVE_ENV_KEY, "staging");
  }

  // Migrate older multi-project format (without env suffix)
  const projectsRaw = localStorage.getItem(PROJECTS_KEY);
  if (projectsRaw) {
    try {
      const projects: ProjectEntry[] = JSON.parse(projectsRaw);
      for (const p of projects) {
        const legacyKey = `hms-qa-hub-config-${p.id}`;
        const legacy = localStorage.getItem(legacyKey);
        if (legacy) {
          const stagingKey = `hms-qa-hub-config-${p.id}-staging`;
          if (!localStorage.getItem(stagingKey)) {
            localStorage.setItem(stagingKey, legacy);
          }
          localStorage.removeItem(legacyKey);
        }
      }
    } catch {}
  }
  if (!localStorage.getItem(ACTIVE_ENV_KEY)) localStorage.setItem(ACTIVE_ENV_KEY, "staging");
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
  // seed both envs
  localStorage.setItem(`hms-qa-hub-config-${id}-staging`, JSON.stringify(newConfig));
  localStorage.setItem(`hms-qa-hub-config-${id}-production`, JSON.stringify(newConfig));
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

  // duplicate both envs from source
  const stagingSrc = localStorage.getItem(`hms-qa-hub-config-${sourceId}-staging`);
  const prodSrc = localStorage.getItem(`hms-qa-hub-config-${sourceId}-production`);
  const newStaging = stagingSrc ? { ...JSON.parse(stagingSrc), projectTitle: name } : { ...sourceConfig, projectTitle: name };
  const newProd = prodSrc ? { ...JSON.parse(prodSrc), projectTitle: name } : { ...sourceConfig, projectTitle: name };
  localStorage.setItem(`hms-qa-hub-config-${id}-staging`, JSON.stringify(newStaging));
  localStorage.setItem(`hms-qa-hub-config-${id}-production`, JSON.stringify(newProd));
  setActiveProjectId(id);
  return id;
}

export function importProject(configData: AppConfig): string {
  const projects = getProjects();
  const id = `project-${Date.now()}`;
  const name = configData.projectTitle || `Imported Project`;
  projects.push({ id, name });
  saveProjects(projects);
  // import to current env
  localStorage.setItem(projectStorageKey(id), JSON.stringify(configData));
  setActiveProjectId(id);
  return id;
}

export function deleteProject(id: string) {
  let projects = getProjects().filter((p) => p.id !== id);
  localStorage.removeItem(`hms-qa-hub-config-${id}-staging`);
  localStorage.removeItem(`hms-qa-hub-config-${id}-production`);

  if (projects.length === 0) {
    const fallbackId = `project-${Date.now()}`;
    projects = [{ id: fallbackId, name: "New Project" }];
    localStorage.setItem(`hms-qa-hub-config-${fallbackId}-staging`, JSON.stringify(DEFAULT_CONFIG));
    localStorage.setItem(`hms-qa-hub-config-${fallbackId}-production`, JSON.stringify(DEFAULT_CONFIG));
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

export function loadConfig(projectId?: string, env?: Environment): AppConfig {
  migrateIfNeeded();
  const id = projectId || getActiveProjectId();
  try {
    const stored = localStorage.getItem(projectStorageKey(id, env));
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
        templateUrls: parsed.templateUrls ?? DEFAULT_CONFIG.templateUrls,
        releaseDeadline: parsed.releaseDeadline ?? DEFAULT_CONFIG.releaseDeadline,
        userName: parsed.userName ?? DEFAULT_CONFIG.userName,
        passedWithNotes: parsed.passedWithNotes ?? DEFAULT_CONFIG.passedWithNotes,
        bugs: parsed.bugs ?? DEFAULT_CONFIG.bugs,
        auditLog: parsed.auditLog ?? DEFAULT_CONFIG.auditLog,
        learnMoreUrl: parsed.learnMoreUrl ?? DEFAULT_CONFIG.learnMoreUrl,
        insightTitle: parsed.insightTitle ?? DEFAULT_CONFIG.insightTitle,
        learnMoreLabel: parsed.learnMoreLabel ?? DEFAULT_CONFIG.learnMoreLabel,
      };
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: AppConfig, projectId?: string, env?: Environment) {
  const id = projectId || getActiveProjectId();
  localStorage.setItem(projectStorageKey(id, env), JSON.stringify(config));

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

export function appendAudit(config: AppConfig, who: string, action: string, target: string): AppConfig {
  const entry: AuditLogEntry = {
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    who: who || "Unknown",
    action,
    target,
    at: new Date().toISOString(),
  };
  const log = [entry, ...(config.auditLog || [])].slice(0, 200);
  return { ...config, auditLog: log };
}
