"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  Filter,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { saveReports } from "@/lib/storage";
import type { ReportEntry, SummaryEntry, TimelineEntry } from "@/types";
import MarkdownViewer from "./markdown-viewer";

interface Props {
  summaries: SummaryEntry[];
  reports: ReportEntry[];
  setReports: (fn: (r: ReportEntry[]) => ReportEntry[]) => void;
  isGeneratingReport: boolean;
  onGenerateReport: () => void;
}

export default function Timeline({
  summaries,
  reports,
  setReports,
  isGeneratingReport,
  onGenerateReport,
}: Props) {
  const [showReportsOnly, setShowReportsOnly] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // タイムラインエントリを統合してソート
  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];

    if (!showReportsOnly) {
      for (const summary of summaries) {
        entries.push({ type: "summary", data: summary });
      }
    }

    for (const report of reports) {
      entries.push({ type: "report", data: report });
    }

    // timestampで降順ソート
    entries.sort((a, b) => b.data.timestamp - a.data.timestamp);

    return entries;
  }, [summaries, reports, showReportsOnly]);

  const handleDeleteReport = useCallback(
    (id: string) => {
      setReports((prev) => {
        const next = prev.filter((r) => r.id !== id);
        saveReports(next);
        return next;
      });
      if (expandedReportId === id) {
        setExpandedReportId(null);
      }
      toast("レポートを削除しました");
    },
    [expandedReportId, setReports]
  );

  const handleCopyReport = useCallback(async (markdown: string) => {
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success("コピーしました");
    } catch (e) {
      toast.error("コピーに失敗しました", { description: String(e) });
    }
  }, []);

  const summaryCount = summaries.length;
  const reportCount = reports.length;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-border border-b px-4 py-3">
        {/* Left side: Title + Filter */}
        <div className="flex items-center gap-3">
          <Clock className="size-4 text-primary" />
          <h2 className="font-medium font-mono text-foreground text-sm">
            タイムライン
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            {showReportsOnly ? reportCount : summaryCount + reportCount}件
          </span>

          {/* Filter Button - Left side */}
          <button
            className={`ml-2 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs transition-colors ${
              showReportsOnly
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            onClick={() => setShowReportsOnly(!showReportsOnly)}
            type="button"
          >
            <Filter className="size-3" />
            レポートのみ
          </button>
        </div>

        {/* Right side: Generate Report Button */}
        <button
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-mono text-primary-foreground text-xs transition-all hover:bg-primary/90 disabled:opacity-50"
          disabled={isGeneratingReport}
          onClick={onGenerateReport}
          type="button"
        >
          {isGeneratingReport ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Plus className="size-3" />
          )}
          レポート生成
        </button>
      </div>

      {/* Timeline content - scrollable */}
      <div className="min-h-0 flex-1 overflow-auto p-4" ref={containerRef}>
        {timelineEntries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted/50">
              <Clock className="size-7 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-mono text-muted-foreground text-sm">
                {showReportsOnly
                  ? "レポートがありません"
                  : "まだ履歴がありません"}
              </p>
              <p className="mt-1 font-mono text-muted-foreground/70 text-xs">
                {showReportsOnly
                  ? "レポートを生成してください"
                  : "録画を開始するとここにサマリが表示されます"}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative ml-4">
            {/* Timeline line */}
            <div className="absolute top-4 bottom-4 left-0 w-px bg-border" />

            {/* Timeline items */}
            <div className="space-y-3 pl-6">
              {timelineEntries.map((entry, index) =>
                entry.type === "summary" ? (
                  <SummaryItem
                    isFirst={index === 0}
                    item={entry.data}
                    key={entry.data.id}
                  />
                ) : (
                  <ReportItem
                    expandedId={expandedReportId}
                    isFirst={index === 0}
                    item={entry.data}
                    key={entry.data.id}
                    onCopy={handleCopyReport}
                    onDelete={handleDeleteReport}
                    onToggleExpand={setExpandedReportId}
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryItem({
  item,
  isFirst,
}: {
  item: SummaryEntry;
  isFirst: boolean;
}) {
  const status = item.status ?? "success";

  const statusConfig = {
    pending: {
      icon: Loader2,
      color: "text-amber-500",
      bg: "bg-amber-500/20",
      border: "border-amber-500/30",
      iconClass: "animate-spin",
    },
    success: {
      icon: CheckCircle2,
      color: "text-emerald-500",
      bg: "bg-emerald-500/20",
      border: "border-emerald-500/30",
      iconClass: "",
    },
    error: {
      icon: AlertCircle,
      color: "text-red-500",
      bg: "bg-red-500/20",
      border: "border-red-500/30",
      iconClass: "",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`relative ${isFirst ? "animate-fade-in-up" : ""}`}
      style={{ animationDelay: isFirst ? "0ms" : undefined }}
    >
      {/* Timeline dot */}
      <div
        className={`absolute top-3 -left-6 flex size-3 items-center justify-center rounded-full ${config.bg}`}
        style={{ transform: "translateX(-50%)" }}
      >
        <div
          className={`size-1.5 rounded-full ${config.color.replace("text-", "bg-")}`}
        />
      </div>

      {/* Content */}
      <div className="rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/20">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">
            {new Date(item.requestedAt ?? item.timestamp).toLocaleTimeString(
              "ja-JP"
            )}
          </span>
          {status === "success" && typeof item.durationMs === "number" && (
            <span className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/70">
              {(item.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {status === "pending" ? (
          <div className="flex items-center gap-2 py-1 text-amber-500">
            <Loader2 className="size-3.5 animate-spin" />
            <span className="font-mono text-xs">サマリを生成中...</span>
          </div>
        ) : (
          <p className="font-sans text-foreground text-sm leading-relaxed">
            {item.summary ?? "サマリ未設定"}
          </p>
        )}

        {status === "error" && item.errorMessage && (
          <p className="mt-1.5 rounded bg-red-500/10 px-2 py-1 font-mono text-[10px] text-red-500">
            {item.errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}

function ReportItem({
  item,
  isFirst,
  expandedId,
  onToggleExpand,
  onDelete,
  onCopy,
}: {
  item: ReportEntry;
  isFirst: boolean;
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
  onDelete: (id: string) => void;
  onCopy: (markdown: string) => void;
}) {
  const isExpanded = expandedId === item.id;

  return (
    <div
      className={`relative ${isFirst ? "animate-fade-in-up" : ""}`}
      style={{ animationDelay: isFirst ? "0ms" : undefined }}
    >
      {/* Timeline dot */}
      <div
        className="absolute top-3 -left-6 flex size-3 items-center justify-center rounded-full bg-primary/30"
        style={{ transform: "translateX(-50%)" }}
      >
        <div className="size-1.5 rounded-full bg-primary" />
      </div>

      {/* Content */}
      <div
        className={`rounded-lg border-2 border-primary/30 bg-background transition-colors ${
          isExpanded ? "" : "hover:border-primary/50"
        }`}
      >
        {/* Header - clickable */}
        <button
          className="flex w-full items-center justify-between px-3 py-2.5 text-left"
          onClick={() => onToggleExpand(isExpanded ? null : item.id)}
          type="button"
        >
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-primary" />
            <span className="font-medium font-mono text-foreground text-sm">
              日次レポート
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {new Date(item.timestamp).toLocaleString("ja-JP")}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-primary/20 border-t bg-muted/30 px-3 pb-3">
            {/* Actions */}
            <div className="flex items-center gap-2 py-3">
              <button
                className="flex items-center gap-1.5 rounded-md bg-background px-2.5 py-1.5 font-mono text-muted-foreground text-xs shadow-sm ring-1 ring-border transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => onCopy(item.markdown)}
                type="button"
              >
                <Copy className="size-3" />
                コピー
              </button>
              <button
                className="flex items-center gap-1.5 rounded-md bg-destructive/10 px-2.5 py-1.5 font-mono text-destructive text-xs ring-1 ring-destructive/30 transition-colors hover:bg-destructive/20"
                onClick={() => onDelete(item.id)}
                type="button"
              >
                <Trash2 className="size-3" />
                削除
              </button>
            </div>

            {/* Markdown */}
            <div className="rounded-lg border border-border bg-background p-4">
              <MarkdownViewer markdown={item.markdown} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
