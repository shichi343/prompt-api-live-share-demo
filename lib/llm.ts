import type { ReportEntry, SummaryEntry } from "@/types";

// Prompt API が利用できる場合に呼び出す想定のスタブ
// 実際のブラウザ組み込み LLM API は環境依存のため、ここでは疑似的にMarkdownを返す。

export function generateReport(
  summaries: SummaryEntry[]
): Promise<ReportEntry> {
  const now = Date.now();
  const header = `# 日次作業レポート (${new Date(now).toLocaleString()})`;
  const body =
    summaries
      .slice(-5)
      .map(
        (s) =>
          `- ${new Date(s.timestamp).toLocaleTimeString()} : ${s.summary ?? "サマリ未取得"}`
      )
      .join("\n") || "- サマリがありません";

  const fallbackMarkdown = `${header}\n\n## 概要\n${body}\n\n*このレポートはデモ用のスタブ出力です。*`;

  // ここで Prompt API を呼ぶ場合:
  // 1. 画像 + コンテキストテキストを準備
  // 2. window.ai などの API が存在するか確認
  // 3. 取得できなければ fallback を返す

  return Promise.resolve({
    id: crypto.randomUUID(),
    timestamp: now,
    markdown: fallbackMarkdown,
    title: new Date(now).toLocaleString(),
  });
}
