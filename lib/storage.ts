import type { ReportEntry, SummaryEntry } from "@/types";

const KEYS = {
  interval: "capture_interval_sec",
  summaries: "capture_summaries",
  reports: "capture_reports",
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

export function saveSummaries(entries: SummaryEntry[]) {
  localStorage.setItem(KEYS.summaries, JSON.stringify(entries));
}

export function loadSummaries(): SummaryEntry[] {
  const raw = localStorage.getItem(KEYS.summaries);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as SummaryEntry[];
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

export function clearAll() {
  for (const key of [KEYS.interval, KEYS.summaries, KEYS.reports]) {
    localStorage.removeItem(key);
  }
}
