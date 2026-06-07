// Builds consistent export filenames including filter scope and date range.
// Format: <prefix>__<format>__<scopeKey-value>__<from>_to_<to>.<ext>
function slug(s: string) {
  return String(s).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
}

export interface ExportNameOpts {
  prefix: string;
  format?: string;                  // e.g. "raw" | "human"
  ext: "json" | "csv";
  from?: string;                    // YYYY-MM-DD
  to?: string;                      // YYYY-MM-DD
  scope?: Record<string, string | number | undefined | null>;
}

export function buildExportFilename(opts: ExportNameOpts): string {
  const parts: string[] = [opts.prefix];
  if (opts.format) parts.push(opts.format);
  if (opts.scope) {
    for (const [k, v] of Object.entries(opts.scope)) {
      if (v === undefined || v === null) continue;
      const s = String(v).trim();
      if (!s || s === "all") continue;
      parts.push(`${slug(k)}-${slug(s)}`);
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  if (opts.from || opts.to) {
    parts.push(`${opts.from || "start"}_to_${opts.to || today}`);
  } else {
    parts.push(today);
  }
  return `${parts.join("__")}.${opts.ext}`;
}
