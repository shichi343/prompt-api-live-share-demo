"use client";

import { Camera, Clock, Pause, Play, RefreshCw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { clearAll, saveInterval, saveReportInterval } from "@/lib/storage";
import type { ReportEntry, SummaryEntry } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Slider } from "./ui/slider";

interface Props {
  isSharing: boolean;
  intervalSec: number;
  reportIntervalMin: number;
  setIntervalSec: (v: number) => void;
  setReportIntervalMin: (v: number) => void;
  onStart: () => Promise<void>;
  onStop: () => void;
  setSummaries: (fn: (s: SummaryEntry[]) => SummaryEntry[]) => void;
  setReports: (fn: (r: ReportEntry[]) => ReportEntry[]) => void;
  streamRef: React.MutableRefObject<MediaStream | null>;
}

export default function ControlPanel({
  isSharing,
  intervalSec,
  reportIntervalMin,
  setIntervalSec,
  setReportIntervalMin,
  onStart,
  onStop,
  setSummaries,
  setReports,
  streamRef,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (isSharing && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      // biome-ignore lint/suspicious/noEmptyBlockStatements: autoplay errors can be ignored
      videoRef.current.play().catch(() => {});
    }
  }, [isSharing, streamRef]);

  const handleIntervalChange = useCallback(
    (value: number[]) => {
      const v = Math.max(1, Math.min(60, Math.round(value[0])));
      setIntervalSec(v);
      saveInterval(v);
    },
    [setIntervalSec]
  );

  const handleReportIntervalChange = useCallback(
    (value: number[]) => {
      const v = Math.max(1, Math.min(60, Math.round(value[0])));
      setReportIntervalMin(v);
      saveReportInterval(v);
    },
    [setReportIntervalMin]
  );

  const handleClear = useCallback(() => {
    clearAll();
    setSummaries(() => []);
    setReports(() => []);
    setIsDialogOpen(false);
    toast("ローカルデータをクリアしました");
  }, [setSummaries, setReports]);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Screen Preview - Top of left column */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative aspect-video bg-black">
          {isSharing ? (
            <>
              <video
                autoPlay
                className="h-full w-full object-contain"
                muted
                playsInline
                ref={videoRef}
              />
              {/* Live indicator */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5">
                <div className="size-1.5 animate-pulse rounded-full bg-red-500" />
                <span className="font-mono text-[9px] text-white">LIVE</span>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="rounded-full bg-muted/20 p-3">
                <Play className="size-6 text-muted-foreground/50" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Start/Stop Button - Outside the preview container */}
      <button
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-mono text-sm transition-all ${
          isSharing
            ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
        onClick={isSharing ? onStop : onStart}
        type="button"
      >
        {isSharing ? (
          <>
            <Pause className="size-4" />
            録画を停止
          </>
        ) : (
          <>
            <Play className="size-4" />
            録画を開始
          </>
        )}
      </button>

      {/* Settings - Always visible */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="size-4" />
          <span className="font-mono text-sm">キャプチャ設定</span>
        </div>

        {/* Capture Interval */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <Camera className="size-3" />
              キャプチャ間隔
            </span>
            <span className="font-mono text-foreground text-xs tabular-nums">
              {intervalSec}秒
            </span>
          </div>
          <Slider
            className="w-full"
            max={60}
            min={1}
            onValueChange={handleIntervalChange}
            step={1}
            value={[intervalSec]}
          />
          <div className="mt-0.5 flex justify-between font-mono text-[9px] text-muted-foreground">
            <span>1秒</span>
            <span>60秒</span>
          </div>
        </div>

        {/* Report Interval */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <RefreshCw className="size-3" />
              レポート自動生成
            </span>
            <span className="font-mono text-foreground text-xs tabular-nums">
              {reportIntervalMin}分
            </span>
          </div>
          <Slider
            className="w-full"
            max={60}
            min={1}
            onValueChange={handleReportIntervalChange}
            step={1}
            value={[reportIntervalMin]}
          />
          <div className="mt-0.5 flex justify-between font-mono text-[9px] text-muted-foreground">
            <span>1分</span>
            <span>60分</span>
          </div>
        </div>
      </div>

      {/* Data Clear Button with Dialog */}
      <AlertDialog onOpenChange={setIsDialogOpen} open={isDialogOpen}>
        <AlertDialogTrigger asChild>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 py-2.5 text-destructive transition-colors hover:bg-destructive/15"
            type="button"
          >
            <Trash2 className="size-3.5" />
            <span className="font-mono text-xs">データをクリア</span>
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>データをクリア</AlertDialogTitle>
            <AlertDialogDescription>
              すべてのキャプチャサマリとレポートを削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleClear}
            >
              クリア
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
