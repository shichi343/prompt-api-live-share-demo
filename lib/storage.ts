import type { ReportEntry, SummaryEntry } from "@/types";

const KEYS = {
  interval: "capture_interval_sec",
  reportInterval: "report_interval_min",
  summaries: "capture_summaries",
  reports: "capture_reports",
  theme: "theme",
};

export function saveInterval(sec: number) {
  localStorage.setItem(KEYS.interval, String(sec));
}

export function loadInterval(): number | null {
  const raw = localStorage.getItem(KEYS.interval);
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function saveReportInterval(min: number) {
  localStorage.setItem(KEYS.reportInterval, String(min));
}

export function loadReportInterval(): number | null {
  const raw = localStorage.getItem(KEYS.reportInterval);
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function saveSummaries(entries: SummaryEntry[]) {
  localStorage.setItem(KEYS.summaries, JSON.stringify(entries));
}

export function loadSummaries(): SummaryEntry[] {
  const raw = localStorage.getItem(KEYS.summaries);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SummaryEntry>[];
    return parsed.map((item) => ({
      id: item.id ?? crypto.randomUUID(),
      timestamp: item.timestamp ?? Date.now(),
      summary: item.summary,
      requestedAt: item.requestedAt ?? item.timestamp ?? Date.now(),
      durationMs: item.durationMs ?? 0,
      status: item.status ?? "success",
      errorMessage: item.errorMessage,
    }));
  } catch {
    return [];
  }
}

export function loadSummariesPaged(page: number, size: number) {
  const all = loadSummaries();
  const start = (page - 1) * size;
  const end = start + size;
  const items = all.slice(start, end);
  return { items, hasMore: end < all.length };
}

export function saveReports(entries: ReportEntry[]) {
  localStorage.setItem(KEYS.reports, JSON.stringify(entries));
}

export function loadReports(): ReportEntry[] {
  const raw = localStorage.getItem(KEYS.reports);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as ReportEntry[];
  } catch {
    return [];
  }
}

export function saveTheme(theme: "light" | "dark") {
  localStorage.setItem(KEYS.theme, theme);
}

export function loadTheme(): "light" | "dark" | null {
  const raw = localStorage.getItem(KEYS.theme);
  if (raw === "light" || raw === "dark") {
    return raw;
  }
  return null;
}

export function clearAll() {
  for (const key of [
    KEYS.interval,
    KEYS.reportInterval,
    KEYS.summaries,
    KEYS.reports,
  ]) {
    localStorage.removeItem(key);
  }
}
