import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { captureFrame, stopCapture } from "@/lib/capture";
import { summarizeCaptures } from "@/lib/llm";
import { saveSummaries } from "@/lib/storage";
import type { SummaryEntry } from "@/types";

interface Params {
  enabled: boolean;
  intervalSec: number;
  streamRef: React.MutableRefObject<MediaStream | null>;
  setSummaries: (fn: (s: SummaryEntry[]) => SummaryEntry[]) => void;
  onStopCapture: () => void;
}

export function useCaptureLoop({
  enabled,
  intervalSec,
  streamRef,
  setSummaries,
  onStopCapture,
}: Params) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const llmUnavailableRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timerRef.current = null;
      timeoutRef.current = null;
      return;
    }

    const tick = async () => {
      let pendingId: string | null = null;
      let requestedAt = 0;
      try {
        const track = streamRef.current?.getVideoTracks()?.[0];
        if (!track || track.readyState !== "live") {
          await stopCapture(streamRef);
          onStopCapture();
          return;
        }

        const frameBlob = await captureFrame(streamRef);
        requestedAt = Date.now();
        pendingId = crypto.randomUUID();

        const pendingEntry: SummaryEntry = {
          id: pendingId,
          timestamp: requestedAt,
          requestedAt,
          status: "pending" as const,
          durationMs: 0,
        };

        let recent: SummaryEntry[] = [];
        setSummaries((prev) => {
          recent = prev.slice(0, 5);
          return [pendingEntry, ...prev];
        });

        const startedAt = performance.now();
        let summaryText: string | null = null;
        try {
          summaryText = await summarizeCaptures({ frameBlob, recent });
        } catch (err) {
          console.error("Prompt API error (summary)", err);
        }
        const durationMs = performance.now() - startedAt;

        if (!summaryText) {
          const failureSummary =
            "サマリ生成に失敗しました。Prompt APIが無効、またはマルチモーダル入力に非対応の可能性があります。";
          if (!llmUnavailableRef.current) {
            llmUnavailableRef.current = true;
            toast.error("サマリ生成に失敗しました", {
              description:
                "Prompt APIが無効、またはマルチモーダル入力に非対応の可能性があります。",
            });
          }
          if (pendingId) {
            setSummaries((prev) => {
              const next = prev.map((item) =>
                item.id === pendingId
                  ? {
                      ...item,
                      status: "error" as const,
                      summary: failureSummary,
                      durationMs,
                      errorMessage:
                        item.errorMessage ??
                        "Prompt APIが利用できないか、レスポンス取得に失敗しました。",
                    }
                  : item
              );
              saveSummaries(next.filter((entry) => entry.status !== "pending"));
              return next;
            });
          }
          return;
        }

        llmUnavailableRef.current = false;
        if (pendingId) {
          setSummaries((prev) => {
            const next = prev.map((item) =>
              item.id === pendingId
                ? {
                    ...item,
                    status: "success" as const,
                    summary: summaryText,
                    durationMs,
                    requestedAt,
                    timestamp: requestedAt,
                    errorMessage: undefined,
                  }
                : item
            );
            saveSummaries(next.filter((entry) => entry.status !== "pending"));
            return next;
          });
        }
      } catch (e) {
        const msg = String(e);
        if (msg.includes("InvalidStateError")) {
          await stopCapture(streamRef);
          onStopCapture();
          toast.error("画面共有が停止されました", {
            description:
              "ブラウザ側で共有が終了したためキャプチャを停止しました。",
          });
          return;
        }
        if (pendingId) {
          setSummaries((prev) => {
            const next = prev.map((item) =>
              item.id === pendingId
                ? {
                    ...item,
                    status: "error" as const,
                    summary: "サマリ生成中にエラーが発生しました。",
                    errorMessage: msg,
                    durationMs: item.durationMs ?? 0,
                  }
                : item
            );
            saveSummaries(next.filter((entry) => entry.status !== "pending"));
            return next;
          });
        }
        toast.error("キャプチャに失敗しました", { description: msg });
      }
    };

    // 初回は遅延させ、以降 intervalSec ごとに実行
    timeoutRef.current = setTimeout(() => {
      tick();
      timerRef.current = setInterval(tick, intervalSec * 1000);
    }, intervalSec * 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, intervalSec, onStopCapture, setSummaries, streamRef]);
}
