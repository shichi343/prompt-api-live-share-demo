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
      try {
        const track = streamRef.current?.getVideoTracks()?.[0];
        if (!track || track.readyState !== "live") {
          await stopCapture(streamRef);
          onStopCapture();
          return;
        }
        const frameBlob = await captureFrame(streamRef);
        const recent: SummaryEntry[] = [];
        const summaryText = await summarizeCaptures({ frameBlob, recent });
        if (!summaryText) {
          if (!llmUnavailableRef.current) {
            llmUnavailableRef.current = true;
            toast.error("サマリ生成に失敗しました", {
              description:
                "Prompt APIが無効、またはマルチモーダル入力に非対応の可能性があります。",
            });
          }
          return;
        }
        llmUnavailableRef.current = false;
        const entry: SummaryEntry = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          summary: summaryText,
        };
        setSummaries((prev) => {
          const next = [entry, ...prev];
          saveSummaries(next);
          return next;
        });
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
