"use client";

import {
  Camera,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  Filter,
  Loader2,
  Plus,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { ReportEntry, SummaryEntry, TimelineEntry } from "@/types";
import MarkdownViewer from "./markdown-viewer";

interface Props {
  summaries: SummaryEntry[];
  reports: ReportEntry[];
  isGeneratingReport: boolean;
  onGenerateReport: () => void;
}

export default function Timeline({
  summaries,
  reports,
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
          <div className="space-y-3">
            {timelineEntries.map((entry) =>
              entry.type === "summary" ? (
                <SummaryItem item={entry.data} key={entry.data.id} />
              ) : (
                <ReportItem
                  expandedId={expandedReportId}
                  item={entry.data}
                  key={entry.data.id}
                  onCopy={handleCopyReport}
                  onToggleExpand={setExpandedReportId}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryItem({ item }: { item: SummaryEntry }) {
  const status = item.status ?? "success";

  return (
    <div>
      {/* Content */}
      <div className="rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/20">
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-[10px] text-muted-foreground">
              {new Date(item.requestedAt ?? item.timestamp).toLocaleTimeString(
                "ja-JP"
              )}
            </span>
          </div>
          {status === "success" && typeof item.durationMs === "number" && (
            <span className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground/70">
              {(item.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {status === "pending" ? (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="size-3.5 animate-spin text-amber-500" />
            <span className="font-mono text-muted-foreground text-xs">
              サマリを生成中...
            </span>
          </div>
        ) : (
          <p className="font-sans text-foreground text-sm leading-relaxed">
            {item.summary ?? ""}
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
  expandedId,
  onCopy,
  onToggleExpand,
}: {
  item: ReportEntry;
  expandedId: string | null;
  onCopy: (markdown: string) => void;
  onToggleExpand: (id: string | null) => void;
}) {
  const isExpanded = expandedId === item.id;
  const status = item.status ?? "success";

  // Accordion clickable for success status
  const isClickable = status === "success";

  return (
    <div>
      {/* Wrapper - entire element is clickable for accordion */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Accordion trigger with role=button */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: Accordion trigger with role=button */}
      <div
        className={`rounded-lg border-2 border-primary/40 bg-primary/5 p-3 transition-colors ${
          isClickable ? "cursor-pointer hover:bg-primary/10" : ""
        }`}
        onClick={
          isClickable
            ? () => onToggleExpand(isExpanded ? null : item.id)
            : undefined
        }
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleExpand(isExpanded ? null : item.id);
                }
              }
            : undefined
        }
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
      >
        {/* Time & Duration row - same as Summary */}
        <div className="mb-1.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-3.5 text-muted-foreground" />
            <span className="font-mono text-[10px] text-muted-foreground">
              {new Date(item.requestedAt ?? item.timestamp).toLocaleTimeString(
                "ja-JP"
              )}
            </span>
          </div>
          {status === "success" && typeof item.durationMs === "number" && (
            <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] text-primary">
              {(item.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {/* Content area */}
        {status === "pending" ? (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="size-3.5 animate-spin text-amber-500" />
            <span className="font-mono text-muted-foreground text-xs">
              レポートを生成中...
            </span>
          </div>
        ) : status === "error" ? (
          <div className="flex flex-col gap-1">
            {item.errorMessage && (
              <p className="mt-2 rounded bg-red-500/10 px-2 py-1 font-mono text-[10px] text-red-500">
                {item.errorMessage}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Accordion header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">
                  作業レポート
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="size-5 text-primary" />
              ) : (
                <ChevronDown className="size-5 text-muted-foreground" />
              )}
            </div>

            {/* Expanded content - markdown container with copy button */}
            {isExpanded && item.markdown && (
              // biome-ignore lint/a11y/noStaticElementInteractions: Prevents accordion toggle
              // biome-ignore lint/a11y/useKeyWithClickEvents: Only prevents propagation
              // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Wrapper prevents propagation
              <div
                className="relative mt-3 rounded-lg border border-primary/20 bg-background/50 p-3"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Copy button */}
                <button
                  className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded-md bg-background/90 px-2 py-1 font-mono text-[10px] text-muted-foreground ring-1 ring-border backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopy(item.markdown ?? "");
                  }}
                  type="button"
                >
                  <Copy className="size-3" />
                  コピー
                </button>
                <MarkdownViewer markdown={item.markdown} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
