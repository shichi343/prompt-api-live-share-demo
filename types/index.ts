export interface SummaryEntry {
  id: string;
  timestamp: number;
  summary: string;
}

export interface ReportEntry {
  id: string;
  timestamp: number;
  markdown: string;
  title?: string;
}
