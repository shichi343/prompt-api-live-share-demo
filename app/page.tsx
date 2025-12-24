"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import ControlPanel from "@/components/control-panel";
import StatusHeader from "@/components/status-header";
import Timeline from "@/components/timeline";
import { useCaptureLoop } from "@/hooks/use-capture-loop";
import { startCapture, stopCapture } from "@/lib/capture";
import { generateReport } from "@/lib/llm";
import {
  loadInterval,
  loadReportInterval,
  loadReports,
  loadSummaries,
  loadTheme,
  saveReports,
  saveTheme,
} from "@/lib/storage";
import type { ReportEntry, SummaryEntry } from "@/types";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [intervalSec, setIntervalSec] = useState<number>(30);
  const [reportIntervalMin, setReportIntervalMin] = useState<number>(30);
  const [summaries, setSummaries] = useState<SummaryEntry[]>([]);
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [nextCaptureAt, setNextCaptureAt] = useState<number | null>(null);
  const [nextReportAt, setNextReportAt] = useState<number | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const streamRef = useRef<MediaStream | null>(null);
  const reportTimerRef = useRef<NodeJS.Timeout | null>(null);
  const summariesRef = useRef<SummaryEntry[]>([]);

  // 最新 summaries を参照用に保持（依存関係に使わない）
  useEffect(() => {
    summariesRef.current = summaries;
  }, [summaries]);

  // 初期ロード
  useEffect(() => {
    const initialInterval = loadInterval();
    if (initialInterval) {
      setIntervalSec(initialInterval);
    }
    const initialReportInterval = loadReportInterval();
    if (initialReportInterval) {
      setReportIntervalMin(initialReportInterval);
    }
    const initialTheme = loadTheme();
    if (initialTheme) {
      setTheme(initialTheme);
    }
    setSummaries(loadSummaries());
    setReports(loadReports());
    setIsLoading(false);
  }, []);

  // テーマ変更時にHTML要素のクラスを更新
  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }
    saveTheme(theme);
  }, [theme]);

  // 次のキャプチャ時刻を計算
  useEffect(() => {
    if (!isSharing) {
      setNextCaptureAt(null);
      return;
    }
    const updateNext = () => setNextCaptureAt(Date.now() + intervalSec * 1000);
    updateNext();
    const interval = setInterval(updateNext, intervalSec * 1000);
    return () => clearInterval(interval);
  }, [isSharing, intervalSec]);

  // レポート定期生成
  useEffect(() => {
    if (!isSharing || reportIntervalMin <= 0) {
      setNextReportAt(null);
      const timer = reportTimerRef.current;
      if (timer) {
        clearInterval(timer);
        reportTimerRef.current = null;
      }
      return;
    }

    const generateReportAuto = async () => {
      const currentSummaries = summariesRef.current;
      if (currentSummaries.length === 0) {
        return;
      }

      const pendingId = crypto.randomUUID();
      const requestedAt = Date.now();

      const pendingReport: ReportEntry = {
        id: pendingId,
        timestamp: requestedAt,
        requestedAt,
        status: "pending",
        durationMs: 0,
      };

      setReports((prev) => [pendingReport, ...prev]);
      setIsGeneratingReport(true);

      const startedAt = performance.now();
      try {
        const result = await generateReport(currentSummaries);
        const durationMs = performance.now() - startedAt;

        setReports((prev) => {
          const next = prev.map((r) =>
            r.id === pendingId
              ? result
                ? {
                    ...r,
                    status: "success" as const,
                    markdown: result.markdown,
                    durationMs,
                    errorMessage: undefined,
                  }
                : {
                    ...r,
                    status: "error" as const,
                    durationMs,
                    errorMessage:
                      "レポート生成に失敗しました。Prompt APIが無効か、レスポンスが取得できませんでした。",
                  }
              : r
          );
          saveReports(next.filter((r) => r.status !== "pending"));
          return next;
        });

        if (result) {
          toast.success("レポートを自動生成しました");
        } else {
          toast.error("レポート自動生成に失敗しました");
        }
      } catch (e) {
        const durationMs = performance.now() - startedAt;
        const errorMessage = e instanceof Error ? e.message : String(e);
        setReports((prev) => {
          const next = prev.map((r) =>
            r.id === pendingId
              ? {
                  ...r,
                  status: "error" as const,
                  durationMs,
                  errorMessage,
                }
              : r
          );
          saveReports(next.filter((r) => r.status !== "pending"));
          return next;
        });
        toast.error("レポート自動生成に失敗しました", {
          description: errorMessage,
        });
      } finally {
        setIsGeneratingReport(false);
      }
    };

    const updateNextReport = () => {
      const next = Date.now() + reportIntervalMin * 60 * 1000;
      setNextReportAt(next);
    };
    updateNextReport();

    reportTimerRef.current = setInterval(
      () => {
        generateReportAuto();
        updateNextReport();
      },
      reportIntervalMin * 60 * 1000
    );

    return () => {
      const timer = reportTimerRef.current;
      if (timer) {
        clearInterval(timer);
        reportTimerRef.current = null;
      }
    };
  }, [isSharing, reportIntervalMin]);

  const handleStartCapture = useCallback(async () => {
    if (isSharing) {
      return;
    }
    try {
      await startCapture(streamRef);
      setIsSharing(true);
      toast.success("画面共有を開始しました");
    } catch (e) {
      const name = (e as DOMException)?.name ?? "";
      const isUserCancel =
        name === "NotAllowedError" ||
        name === "AbortError" ||
        String(e).includes("Permission") ||
        String(e).includes("denied");
      if (!isUserCancel) {
        console.error(e);
        toast.error("画面共有に失敗しました", { description: String(e) });
      }
      stopCapture(streamRef);
      setIsSharing(false);
    }
  }, [isSharing]);

  const handleStopCapture = useCallback(() => {
    stopCapture(streamRef);
    setIsSharing(false);
    toast("画面共有を停止しました");
  }, []);

  const handleAutoStopCapture = useCallback(() => {
    setIsSharing(false);
  }, []);

  const handleGenerateReport = useCallback(async () => {
    if (summaries.length === 0) {
      toast.error("履歴がありません", {
        description: "共有を開始してキャプチャを蓄積してください。",
      });
      return;
    }

    const pendingId = crypto.randomUUID();
    const requestedAt = Date.now();

    const pendingReport: ReportEntry = {
      id: pendingId,
      timestamp: requestedAt,
      requestedAt,
      status: "pending",
      durationMs: 0,
    };

    setReports((prev) => [pendingReport, ...prev]);
    setIsGeneratingReport(true);

    const startedAt = performance.now();
    try {
      const result = await generateReport(summaries);
      const durationMs = performance.now() - startedAt;

      setReports((prev) => {
        const next = prev.map((r) =>
          r.id === pendingId
            ? result
              ? {
                  ...r,
                  status: "success" as const,
                  markdown: result.markdown,
                  durationMs,
                  errorMessage: undefined,
                }
              : {
                  ...r,
                  status: "error" as const,
                  durationMs,
                  errorMessage:
                    "レポート生成に失敗しました。Prompt APIが無効か、レスポンスが取得できませんでした。",
                }
            : r
        );
        saveReports(next.filter((r) => r.status !== "pending"));
        return next;
      });

      if (result) {
        toast.success("レポートを生成しました");
      } else {
        toast.error("レポート生成に失敗しました");
      }
    } catch (e) {
      const durationMs = performance.now() - startedAt;
      setReports((prev) => {
        const next = prev.map((r) =>
          r.id === pendingId
            ? {
                ...r,
                status: "error" as const,
                durationMs,
                errorMessage: String(e),
              }
            : r
        );
        saveReports(next.filter((r) => r.status !== "pending"));
        return next;
      });
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast.error("レポート生成に失敗しました", {
        description: errorMessage,
      });
    } finally {
      setIsGeneratingReport(false);
    }
  }, [summaries]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  // キャプチャループ
  useCaptureLoop({
    enabled: isSharing,
    intervalSec,
    streamRef,
    setSummaries,
    onStopCapture: handleAutoStopCapture,
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center gap-3 bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="font-mono text-muted-foreground text-sm">
          初期化中...
        </span>
      </div>
    );
  }

  const pendingCount = summaries.filter((s) => s.status === "pending").length;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,var(--gradient-top),transparent_50%),radial-gradient(ellipse_at_bottom_right,var(--gradient-bottom),transparent_50%)]" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-7xl flex-col">
        {/* Header */}
        <StatusHeader
          captureIntervalSec={intervalSec}
          isRecording={isSharing}
          nextCaptureAt={nextCaptureAt}
          nextReportAt={nextReportAt}
          onToggleTheme={toggleTheme}
          pendingCount={pendingCount}
          reportCount={reports.length}
          reportIntervalMin={reportIntervalMin}
          summaryCount={summaries.length}
          theme={theme}
        />

        {/* Main content */}
        <main className="flex min-h-0 flex-1 gap-6 px-6 pb-6">
          {/* Left: Control Panel */}
          <div className="w-72 shrink-0 overflow-auto">
            <ControlPanel
              intervalSec={intervalSec}
              isSharing={isSharing}
              onStart={handleStartCapture}
              onStop={handleStopCapture}
              reportIntervalMin={reportIntervalMin}
              setIntervalSec={setIntervalSec}
              setReportIntervalMin={setReportIntervalMin}
              setReports={setReports}
              setSummaries={setSummaries}
              streamRef={streamRef}
            />
          </div>

          {/* Center: Timeline */}
          <div className="min-h-0 flex-1">
            <Timeline
              isGeneratingReport={isGeneratingReport}
              onGenerateReport={handleGenerateReport}
              reports={reports}
              summaries={summaries}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
