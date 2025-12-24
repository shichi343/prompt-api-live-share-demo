"use client";

import { useEffect, useState } from "react";
import { loadSummariesPaged } from "@/lib/storage";
import type { SummaryEntry } from "@/types";
import { Spinner } from "./ui/spinner";

interface Props {
  summaries: SummaryEntry[];
  setSummaries: (fn: (s: SummaryEntry[]) => SummaryEntry[]) => void;
}

const PAGE_SIZE = 20;

export default function HistoryTab({ summaries, setSummaries }: Props) {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    // 初期ロード
    const { items, hasMore: more } = loadSummariesPaged(1, PAGE_SIZE);
    setSummaries(() => items);
    setHasMore(more);
    setPage(1);
  }, [setSummaries]);

  const loadMore = () => {
    const nextPage = page + 1;
    const { items, hasMore: more } = loadSummariesPaged(nextPage, PAGE_SIZE);
    if (items.length > 0) {
      setSummaries((prev) => [...prev, ...items]);
      setPage(nextPage);
      setHasMore(more);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">キャプチャ履歴</h2>
        <span className="text-sm text-zinc-500">{summaries.length}件表示</span>
      </div>

      <div className="space-y-2">
        {summaries.length === 0 && (
          <p className="text-sm text-zinc-500">まだ履歴がありません。</p>
        )}
        {summaries.map((item) => (
          <div
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
            key={item.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
              <span>
                {new Date(item.requestedAt ?? item.timestamp).toLocaleString()}
                にリクエスト
              </span>
              <div className="flex items-center gap-2">
                {typeof item.durationMs === "number" &&
                  (item.status ?? "success") === "success" && (
                    <span className="text-zinc-600">
                      処理時間 {(item.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                {(item.status ?? "success") === "pending" && (
                  <span className="flex items-center text-amber-600">
                    <Spinner className="size-5" />
                    <span className="sr-only">生成中</span>
                  </span>
                )}
                {(item.status ?? "success") === "error" && (
                  <span className="text-red-500">失敗</span>
                )}
              </div>
            </div>
            {(item.status ?? "success") === "pending" ? (
              <div className="mt-2 flex items-center justify-center rounded-md border border-amber-200 border-dashed bg-amber-50 py-4 text-amber-600">
                <Spinner className="size-6" />
                <span className="sr-only">生成中</span>
              </div>
            ) : (
              <p
                className="mt-1 whitespace-pre-wrap text-sm text-zinc-800"
                data-status={item.status ?? "success"}
              >
                {item.summary ?? "サマリ未設定"}
              </p>
            )}
            {(item.status ?? "success") === "error" && item.errorMessage && (
              <p className="mt-1 text-red-500 text-xs">{item.errorMessage}</p>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          className="mt-2 w-full rounded border border-zinc-200 bg-white py-2 font-medium text-sm hover:bg-zinc-50"
          onClick={loadMore}
          type="button"
        >
          もっと読み込む
        </button>
      )}
    </div>
  );
}
