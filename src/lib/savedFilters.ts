// Generic localStorage-backed saved filter presets.
export interface FilterPreset<T = any> {
  id: string;
  name: string;
  values: T;
  createdAt: string;
}

function keyFor(scope: string) { return `hms-qa-filter-presets:${scope}`; }

export function loadPresets<T = any>(scope: string): FilterPreset<T>[] {
  try { return JSON.parse(localStorage.getItem(keyFor(scope)) || "[]"); } catch { return []; }
}

export function savePresets<T = any>(scope: string, presets: FilterPreset<T>[]) {
  localStorage.setItem(keyFor(scope), JSON.stringify(presets));
  window.dispatchEvent(new CustomEvent(`hms-qa-filter-presets-change:${scope}`));
}

export function addPreset<T = any>(scope: string, name: string, values: T): FilterPreset<T> {
  const preset: FilterPreset<T> = {
    id: `fp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || `Preset ${new Date().toLocaleString("id-ID")}`,
    values,
    createdAt: new Date().toISOString(),
  };
  const list = loadPresets<T>(scope);
  list.unshift(preset);
  savePresets(scope, list.slice(0, 20));
  return preset;
}

export function deletePreset(scope: string, id: string) {
  savePresets(scope, loadPresets(scope).filter((p) => p.id !== id));
}
