"use client";

import { Moon, Radio, Sun } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  isRecording: boolean;
  nextCaptureAt: number | null;
  nextReportAt: number | null;
  pendingCount: number;
  summaryCount: number;
  reportCount: number;
  onToggleTheme: () => void;
  theme: "light" | "dark";
}

export default function StatusHeader({
  isRecording,
  nextCaptureAt,
  nextReportAt,
  pendingCount,
  summaryCount,
  reportCount,
  onToggleTheme,
  theme,
}: Props) {
  return (
    <header className="flex shrink-0 items-center justify-between px-6 py-4">
      {/* Logo & Title */}
      <div className="flex items-center gap-4">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
          <Radio className="size-4 text-primary" />
        </div>
        <div>
          <h1 className="font-mono font-semibold text-lg text-primary tracking-tight">
            デスクワークトラッカー
          </h1>
          <p className="font-mono text-xs text-muted-foreground">
            ブラウザで動くセキュアな AI で、あなたの仕事をデータに残す
          </p>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-5">
        {/* Recording Status */}
        <div className="flex items-center gap-2">
          <div
            className={`size-2 rounded-full ${
              isRecording
                ? "animate-pulse bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                : "bg-muted-foreground/40"
            }`}
          />
          <span className="font-mono text-muted-foreground text-xs">
            {isRecording ? "REC" : "STANDBY"}
          </span>
        </div>

        {/* Countdown */}
        {isRecording && nextCaptureAt && (
          <CountdownDisplay label="CAP" targetTime={nextCaptureAt} />
        )}

        {/* Next Report */}
        {isRecording && nextReportAt && (
          <CountdownDisplay label="RPT" showMinutes targetTime={nextReportAt} />
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 border-border/50 border-l pl-5">
          <div className="text-center">
            <div className="font-mono font-semibold text-foreground text-sm">
              {summaryCount}
            </div>
            <div className="font-mono text-[9px] text-muted-foreground">
              CAPS
            </div>
          </div>

          <div className="text-center">
            <div className="font-mono font-semibold text-foreground text-sm">
              {reportCount}
            </div>
            <div className="font-mono text-[9px] text-muted-foreground">
              RPTS
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="text-center">
              <div className="font-mono font-semibold text-amber-500 text-sm">
                {pendingCount}
              </div>
              <div className="font-mono text-[9px] text-muted-foreground">
                WAIT
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onToggleTheme}
          type="button"
        >
          {theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </button>
      </div>
    </header>
  );
}

function CountdownDisplay({
  targetTime,
  label,
  showMinutes = false,
}: {
  targetTime: number;
  label: string;
  showMinutes?: boolean;
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));
      setRemaining(diff);
    };
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [targetTime]);

  const displayValue = showMinutes
    ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
    : `${remaining}s`;

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[9px] text-muted-foreground">
        {label}
      </span>
      <svg className="size-6 -rotate-90" viewBox="0 0 36 36">
        <circle
          className="text-muted/30"
          cx="18"
          cy="18"
          fill="none"
          r="16"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          className="text-primary transition-all duration-100"
          cx="18"
          cy="18"
          fill="none"
          r="16"
          stroke="currentColor"
          strokeDasharray="100"
          strokeDashoffset={
            showMinutes
              ? 100 - (remaining / (30 * 60)) * 100
              : 100 - (remaining / 10) * 100
          }
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>
      <span className="font-mono text-muted-foreground text-xs tabular-nums">
        {displayValue}
      </span>
    </div>
  );
}
