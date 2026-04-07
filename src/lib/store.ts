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

export interface AppConfig {
  categories: Category[];
  stats: AppStats;
  testPlanUrl: string;
  testCaseUrl: string;
  qaQuestions: QAQuestion[];
  qaCategories: string[];
}

const DEFAULT_CONFIG: AppConfig = {
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
      id: "operasional",
      name: "Operasional",
      icon: "Truck",
      submodules: [
        { id: "ritase", name: "Ritase" },
        { id: "delivery-order", name: "Delivery Order" },
        { id: "manifest", name: "Manifest" },
      ],
    },
    {
      id: "finance",
      name: "Finance",
      icon: "DollarSign",
      submodules: [
        { id: "invoice", name: "Invoice" },
        { id: "payment", name: "Payment" },
      ],
    },
  ],
  stats: {
    totalTC: 1853,
    passed: 1555,
    failed: 1,
    pending: 297,
  },
  testPlanUrl: "",
  testCaseUrl: "",
  qaQuestions: [],
  qaCategories: [],
};

const STORAGE_KEY = "hms-qa-hub-config";

export function loadConfig(): AppConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure all keys exist with defaults, but stored values always win
      return {
        categories: parsed.categories ?? DEFAULT_CONFIG.categories,
        stats: parsed.stats ?? DEFAULT_CONFIG.stats,
        testPlanUrl: parsed.testPlanUrl ?? DEFAULT_CONFIG.testPlanUrl,
        testCaseUrl: parsed.testCaseUrl ?? DEFAULT_CONFIG.testCaseUrl,
        qaQuestions: parsed.qaQuestions ?? DEFAULT_CONFIG.qaQuestions,
        qaCategories: parsed.qaCategories ?? DEFAULT_CONFIG.qaCategories,
      };
    }
  } catch {}
  return DEFAULT_CONFIG;
}

export function saveConfig(config: AppConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function resetConfig(): AppConfig {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_CONFIG;
}
