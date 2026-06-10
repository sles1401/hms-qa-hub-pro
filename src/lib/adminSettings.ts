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
  /** Severity mapping for Pass-Rate delta (negative values, e.g. -10 = critical). */
  severityCriticalDelta: number;
  severityHighDelta: number;
  /** Healthcheck Auto Alert configuration. */
  healthStreakThreshold: number;   // streak count required to raise alert (warning+)
  healthStreakHigh: number;        // escalate to High
  healthStreakCritical: number;    // escalate to Critical
}
const REG_KEY = "hms-qa-regression-settings";

export const DEFAULT_REGRESSION_SETTINGS: RegressionSettings = {
  thresholdPct: 3,
  watchedCategoryIds: [],
  severityCriticalDelta: -10,
  severityHighDelta: -5,
  healthStreakThreshold: 2,
  healthStreakHigh: 3,
  healthStreakCritical: 5,
};

export function getRegressionSettings(): RegressionSettings {
  try {
    const raw = localStorage.getItem(REG_KEY);
    if (!raw) return { ...DEFAULT_REGRESSION_SETTINGS };
    const p = JSON.parse(raw);
    return {
      ...DEFAULT_REGRESSION_SETTINGS,
      ...p,
      thresholdPct: typeof p.thresholdPct === "number" ? p.thresholdPct : 3,
      watchedCategoryIds: Array.isArray(p.watchedCategoryIds) ? p.watchedCategoryIds : [],
    };
  } catch {
    return { ...DEFAULT_REGRESSION_SETTINGS };
  }
}
export function setRegressionSettings(v: RegressionSettings) {
  localStorage.setItem(REG_KEY, JSON.stringify(v));
  try { window.dispatchEvent(new CustomEvent("hms-qa-regression-settings-change")); } catch {}
}

/** Severity classification helpers shared across alerts. */
export type Severity = "critical" | "high" | "warning";
export function severityFromDelta(delta: number, s = getRegressionSettings()): Severity {
  if (delta <= s.severityCriticalDelta) return "critical";
  if (delta <= s.severityHighDelta) return "high";
  return "warning";
}
export function severityFromStreak(streak: number, s = getRegressionSettings()): Severity {
  if (streak >= s.healthStreakCritical) return "critical";
  if (streak >= s.healthStreakHigh) return "high";
  return "warning";
}
export function severityFromRate(rate: number): Severity {
  if (rate < 50) return "critical";
  if (rate < 80) return "high";
  return "warning";
}
export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "bg-red-600",
  high: "bg-orange-500",
  warning: "bg-yellow-500",
};
export const SEVERITY_BADGE: Record<Severity, string> = {
  critical: "bg-red-100 text-red-700 border border-red-300",
  high: "bg-orange-100 text-orange-700 border border-orange-300",
  warning: "bg-yellow-100 text-yellow-700 border border-yellow-300",
};
