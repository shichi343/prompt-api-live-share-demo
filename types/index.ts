export interface SummaryEntry {
  id: string;
  timestamp: number;
  summary?: string;
  requestedAt: number;
  durationMs: number;
  status: "pending" | "success" | "error";
  errorMessage?: string;
}

export interface ReportEntry {
  id: string;
  timestamp: number;
  markdown: string;
}

// タイムライン表示用の統合型
export type TimelineEntry =
  | { type: "summary"; data: SummaryEntry }
  | { type: "report"; data: ReportEntry };
