"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import CaptureControls from "@/components/capture-controls";
import HistoryTab from "@/components/history-tab";
import LivePreview from "@/components/live-preview";
import ReportTab from "@/components/report-tab";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCaptureLoop } from "@/hooks/use-capture-loop";
import { loadInterval, loadReports, loadSummaries } from "@/lib/storage";
import type { ReportEntry, SummaryEntry } from "@/types";

function PageContent() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [intervalSec, setIntervalSec] = useState<number>(10);
  const [summaries, setSummaries] = useState<SummaryEntry[]>([]);
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "report">("history");
  const streamRef = useRef<MediaStream | null>(null);

  // 初期ロード
  useEffect(() => {
    const initialInterval = loadInterval();
    if (initialInterval) {
      setIntervalSec(initialInterval);
    }
    setSummaries(loadSummaries());
    setReports(loadReports());
    setIsLoading(false);
  }, []);

  const controlsProps = useMemo(
    () => ({
      isSharing,
      intervalSec,
      setIntervalSec,
      setIsSharing,
      streamRef,
      setSummaries,
    }),
    [isSharing, intervalSec]
  );

  // キャプチャループ
  useCaptureLoop({
    enabled: isSharing,
    intervalSec,
    streamRef,
    setSummaries,
    onStopCapture: () => setIsSharing(false),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-zinc-50 text-zinc-900">
        <Spinner className="size-8" />
        <span className="text-sm text-zinc-600">
          ローカルデータを読み込み中...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-2xl">
              画面共有 × Prompt API 日次レポート
            </h1>
            <p className="text-sm text-zinc-500">
              共有を開始して履歴を蓄積し、必要なタイミングでレポートを生成します。
            </p>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
          {/* Left column */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <CaptureControls {...controlsProps} />
            <div className="mt-4">
              <LivePreview streamRef={streamRef} />
            </div>
          </div>

          {/* Right column */}
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <Tabs
              onValueChange={(v) => setActiveTab(v as "history" | "report")}
              value={activeTab}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="history">作業履歴</TabsTrigger>
                <TabsTrigger value="report">レポート</TabsTrigger>
              </TabsList>
              <TabsContent className="mt-4" value="history">
                <HistoryTab setSummaries={setSummaries} summaries={summaries} />
              </TabsContent>
              <TabsContent className="mt-4" value="report">
                <ReportTab
                  reports={reports}
                  setReports={setReports}
                  summaries={summaries}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  return <PageContent />;
}
