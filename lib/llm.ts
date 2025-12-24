import type { ReportEntry, SummaryEntry } from "@/types";

const REPORT_SYSTEM_PROMPT = `
あなたは一日の作業報告書をMarkdownで作成するアシスタントです。
入力は時刻付きの作業サマリ一覧です。以下を含めてください:
- 箇条書きでの作業内容と成果
- 発生した課題と次のアクション
- 必要なら簡潔なまとめ
`;

const SUMMARY_SYSTEM_PROMPT = `
あなたは画面共有から得た情報をもとに、1行の簡潔な作業サマリを作るアシスタントです。
日本語で、50文字程度以内にまとめてください。余計な挨拶や引用符は不要です。
`;

async function createSession(
  system: string,
  expectedInputs?: LanguageModelExpected[]
): Promise<LanguageModel | null> {
  // biome-ignore lint/correctness/noUndeclaredVariables: LanguageModel is a browser-provided global
  if (typeof LanguageModel === "undefined") {
    return null;
  }
  try {
    // biome-ignore lint/correctness/noUndeclaredVariables: LanguageModel is a browser-provided global
    return await LanguageModel.create({
      initialPrompts: [{ role: "system", content: system }],
      expectedInputs,
      expectedOutputs: [{ type: "text", languages: ["ja"] }],
    });
  } catch {
    return null;
  }
}

function buildReportPrompt(summaries: SummaryEntry[]) {
  const rows =
    summaries
      .filter((s) => (s.status ?? "success") === "success")
      .slice(0, 30)
      .map((s) => {
        return `${new Date(s.timestamp).toLocaleTimeString()} | ${s.summary ?? "サマリ未取得"}`;
      })
      .join("\n") || "履歴がありません。";

  return `以下は時系列の作業サマリです。Markdownで日次レポートを作成してください。\n\n${rows}`;
}

async function callPromptAPI(
  systemPrompt: string,
  prompt: string
): Promise<string | null> {
  const session = await createSession(systemPrompt, [
    { type: "text", languages: ["ja"] },
  ]);
  if (!session) {
    return null;
  }
  try {
    const result = await session.prompt(prompt);
    return result;
  } finally {
    if (session.destroy) {
      session.destroy();
    }
  }
}

function buildReportFallback(
  now: number,
  summaries: SummaryEntry[]
): ReportEntry {
  const header = `# 日次作業レポート (${new Date(now).toLocaleString()})`;
  let body = "- サマリがありません";
  const lines: string[] = [];
  for (const s of summaries.slice(0, 30)) {
    const line = `- ${new Date(s.timestamp).toLocaleTimeString()} : ${s.summary ?? "サマリ未取得"}`;
    lines.push(line);
  }
  if (lines.length > 0) {
    body = lines.join("\n");
  }

  const fallbackMarkdown = `${header}\n\n## 概要\n${body}\n\n*内蔵LLMが未使用のため簡易出力です。*`;

  return {
    id: crypto.randomUUID(),
    timestamp: now,
    markdown: fallbackMarkdown,
  };
}

export async function generateReport(
  summaries: SummaryEntry[]
): Promise<ReportEntry> {
  const now = Date.now();
  const prompt = buildReportPrompt(summaries);

  try {
    const result = await callPromptAPI(REPORT_SYSTEM_PROMPT, prompt);
    if (result) {
      return {
        id: crypto.randomUUID(),
        timestamp: now,
        markdown: result,
      };
    }
  } catch (e) {
    console.error("Prompt API error (report)", e);
  }

  return buildReportFallback(now, summaries);
}

export async function summarizeCaptures(params: {
  frameBlob?: Blob;
  recent: SummaryEntry[];
}): Promise<string | null> {
  const { frameBlob, recent } = params;

  const context =
    recent
      .slice(0, 5)
      .map(
        (s) =>
          `${new Date(s.timestamp).toLocaleTimeString()} | ${s.summary ?? ""}`
      )
      .join("\n") || "直近の履歴はありません。";

  const prompt = `以下はこれまでの作業サマリです。\n${context}\n\n画面キャプチャから1行で最新の作業サマリを作ってください。`;

  try {
    const messages: LanguageModelPrompt = [
      {
        role: "user",
        content: [{ type: "text", value: prompt }],
      },
    ];
    if (frameBlob) {
      messages.push({
        role: "user",
        content: [{ type: "image", value: frameBlob }],
      });
    }
    const session = await createSession(SUMMARY_SYSTEM_PROMPT, [
      { type: "text", languages: ["ja"] },
      { type: "image" },
    ]);
    if (!session) {
      return null;
    }
    const result = await session.prompt(messages);
    session.destroy?.();
    if (result) {
      return result.trim();
    }
  } catch (e) {
    console.error("Prompt API error (summary)", e);
  }

  return null;
}
