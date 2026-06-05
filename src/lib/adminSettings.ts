// Persisted admin-only settings for report template and regression monitoring.

export interface ReportTemplateSettings {
  logoDataUrl: string;
  heading: string;
  footerText: string;
  releaseDate: string; // YYYY-MM-DD or free-form
}

const REPORT_KEY = "hms-qa-report-settings";

export const DEFAULT_REPORT_SETTINGS: ReportTemplateSettings = {
  logoDataUrl: "",
  heading: "HMS QA HUB - Enterprise Report",
  footerText: "Developed by Suryani Lestari · Confidential",
  releaseDate: "",
};

export function getReportSettings(): ReportTemplateSettings {
  try {
    const raw = localStorage.getItem(REPORT_KEY);
    if (!raw) return { ...DEFAULT_REPORT_SETTINGS };
    const p = JSON.parse(raw);
    return { ...DEFAULT_REPORT_SETTINGS, ...p };
  } catch {
    return { ...DEFAULT_REPORT_SETTINGS };
  }
}
export function setReportSettings(v: ReportTemplateSettings) {
  localStorage.setItem(REPORT_KEY, JSON.stringify(v));
}

export interface RegressionSettings {
  thresholdPct: number;
  watchedCategoryIds: string[]; // empty = auto (default keywords)
}
const REG_KEY = "hms-qa-regression-settings";

export const DEFAULT_REGRESSION_SETTINGS: RegressionSettings = {
  thresholdPct: 3,
  watchedCategoryIds: [],
};

export function getRegressionSettings(): RegressionSettings {
  try {
    const raw = localStorage.getItem(REG_KEY);
    if (!raw) return { ...DEFAULT_REGRESSION_SETTINGS };
    const p = JSON.parse(raw);
    return {
      thresholdPct: typeof p.thresholdPct === "number" ? p.thresholdPct : 3,
      watchedCategoryIds: Array.isArray(p.watchedCategoryIds) ? p.watchedCategoryIds : [],
    };
  } catch {
    return { ...DEFAULT_REGRESSION_SETTINGS };
  }
}
export function setRegressionSettings(v: RegressionSettings) {
  localStorage.setItem(REG_KEY, JSON.stringify(v));
}
