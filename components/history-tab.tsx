"use client";

import { useEffect, useState } from "react";
import { loadSummariesPaged } from "@/lib/storage";
import type { SummaryEntry } from "@/types";

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
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{new Date(item.timestamp).toLocaleString()}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">
              {item.summary}
            </p>
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
