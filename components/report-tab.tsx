"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { generateReport } from "@/lib/llm";
import { saveReports } from "@/lib/storage";
import type { ReportEntry, SummaryEntry } from "@/types";
import MarkdownViewer from "./markdown-viewer";
import { Button } from "./ui/button";

interface Props {
  summaries: SummaryEntry[];
  reports: ReportEntry[];
  setReports: (fn: (r: ReportEntry[]) => ReportEntry[]) => void;
}

export default function ReportTab({ summaries, reports, setReports }: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? reports[0] ?? null,
    [reports, selectedId]
  );

  const handleGenerate = async () => {
    if (summaries.length === 0) {
      toast("履歴がありません", {
        description: "共有を開始してキャプチャを蓄積してください。",
      });
      return;
    }
    setLoading(true);
    try {
      const report = await generateReport(summaries);
      setReports((prev) => {
        const next = [report, ...prev];
        saveReports(next);
        return next;
      });
      setSelectedId(report.id);
      toast.success("レポートを生成しました");
    } catch (e) {
      console.error(e);
      toast.error("レポート生成に失敗しました", { description: String(e) });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!selected) {
      return;
    }
    try {
      await navigator.clipboard.writeText(selected.markdown);
      toast.success("コピーしました");
    } catch (e) {
      toast.error("コピーに失敗しました", { description: String(e) });
    }
  };

  const handleDelete = (id: string) => {
    setReports((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveReports(next);
      return next;
    });
    if (selectedId === id) {
      setSelectedId(null);
    }
    toast("レポートを削除しました");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={loading} onClick={handleGenerate} type="button">
          {loading ? "生成中..." : "レポート生成"}
        </Button>
        <Button
          disabled={!selected}
          onClick={handleCopy}
          type="button"
          variant="outline"
        >
          コピー
        </Button>
        <Button
          disabled={!selected}
          onClick={() => {
            if (selected) {
              handleDelete(selected.id);
            }
          }}
          type="button"
          variant="secondary"
        >
          削除
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="w-48 space-y-2">
          <h3 className="font-semibold text-sm text-zinc-700">レポート一覧</h3>
          <div className="max-h-64 overflow-auto rounded border border-zinc-200 bg-zinc-50">
            {reports.length === 0 && (
              <div className="p-3 text-sm text-zinc-500">
                まだレポートがありません。
              </div>
            )}
            {reports.map((r) => (
              <button
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-white ${
                  selectedId === r.id ? "bg-white font-semibold" : ""
                }`}
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                type="button"
              >
                {r.title ?? new Date(r.timestamp).toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="mb-2 font-semibold text-sm text-zinc-700">
            レポート表示
          </h3>
          {selected ? (
            <MarkdownViewer markdown={selected.markdown} />
          ) : (
            <p className="text-sm text-zinc-500">
              レポートを選択してください。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
