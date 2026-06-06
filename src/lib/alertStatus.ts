// Persistence for Auto Alert acknowledgements & resolutions
export type AlertState = "ack" | "resolved";

export interface AlertStatusEntry {
  state: AlertState;
  at: string;
  before: number;
  after: number;
  by?: string;
}

const KEY = "hms-qa-alert-status";

export function loadAlertStatuses(): Record<string, AlertStatusEntry> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function saveAlertStatuses(map: Record<string, AlertStatusEntry>) {
  localStorage.setItem(KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("hms-qa-alert-status-change"));
}

export function setAlertStatus(key: string, entry: AlertStatusEntry) {
  const m = loadAlertStatuses();
  m[key] = entry;
  saveAlertStatuses(m);
}

export function clearAlertStatus(key: string) {
  const m = loadAlertStatuses();
  delete m[key];
  saveAlertStatuses(m);
}

export function fingerprint(before: number, after: number) {
  return `${before.toFixed(1)}:${after.toFixed(1)}`;
}
