"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { startCapture, stopCapture } from "@/lib/capture";
import { clearAll, saveInterval } from "@/lib/storage";
import type { SummaryEntry } from "@/types";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";

interface Props {
  isSharing: boolean;
  intervalSec: number;
  setIntervalSec: (v: number) => void;
  setIsSharing: (v: boolean) => void;
  streamRef: React.MutableRefObject<MediaStream | null>;
  setSummaries: (fn: (s: SummaryEntry[]) => SummaryEntry[]) => void;
}

export default function CaptureControls({
  isSharing,
  intervalSec,
  setIntervalSec,
  setIsSharing,
  streamRef,
  setSummaries,
}: Props) {
  const handleStart = useCallback(async () => {
    if (isSharing) {
      return;
    }
    try {
      await startCapture(streamRef);
      setIsSharing(true);
      toast.success("画面共有を開始しました");
    } catch (e) {
      console.error(e);
      toast.error("画面共有に失敗しました", { description: String(e) });
      await stopCapture(streamRef);
      setIsSharing(false);
    }
  }, [isSharing, setIsSharing, streamRef]);

  const handleStop = useCallback(async () => {
    await stopCapture(streamRef);
    setIsSharing(false);
    toast("画面共有を停止しました");
  }, [setIsSharing, streamRef]);

  const handleIntervalChange = (value: number[]) => {
    const v = Math.max(2, Math.min(120, Math.round(value[0])));
    setIntervalSec(v);
    saveInterval(v);
  };

  const handleClear = () => {
    clearAll();
    setSummaries(() => []);
    toast("ローカルデータをクリアしました");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={isSharing} onClick={handleStart} type="button">
          共有開始
        </Button>
        <Button
          disabled={!isSharing}
          onClick={handleStop}
          type="button"
          variant="outline"
        >
          共有停止
        </Button>
        <Button onClick={handleClear} type="button" variant="secondary">
          ローカルストレージをクリア
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-sm text-zinc-600">キャプチャ間隔</div>
        <div className="flex-1">
          <Slider
            max={120}
            min={2}
            onValueChange={handleIntervalChange}
            step={1}
            value={[intervalSec]}
          />
        </div>
        <div className="w-14 text-right font-medium text-sm">
          {intervalSec}s
        </div>
      </div>
    </div>
  );
}
