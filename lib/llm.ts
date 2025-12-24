import type { SummaryEntry } from "@/types";

const REPORT_SYSTEM_PROMPT = `
あなたはパソコンの操作観測ログから作業レポートを作るアシスタントです。
入力には意図や操作ログは含まれません。観測ログと時刻だけが根拠です。

ルール:
- 断定しない。推定は「〜の可能性」「〜と思われる」と明記する。
- 操作観測ログに書かれていない具体情報（固有名詞、ID、顧客名など）を創作しない。
- 報告書は読み手に役立つよう、(1)サマリー (2)タイムライン (3)成果 の順で。
`;

const SUMMARY_SYSTEM_PROMPT = `
あなたは作業画面スクリーンショットの「観測」だけを記述するアシスタントです。
入力はスクリーンショット画像のみです。

ルール:
- 推測しない。ユーザーの意図や操作（クリックした、実行した等）は書かない。
- 画面に見えている要素のみを短い文章で書く（箇条書きにしない）。
- 文章は日本語。2〜3文程度で簡潔に。
- 余計な前置きは不要。説明文だけを出力する。
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
  } catch (e) {
    console.error("Failed to create LanguageModel session", e);
    return null;
  }
}

function buildReportPrompt(summaries: SummaryEntry[]) {
  const rows =
    summaries
      .filter((s) => (s.status ?? "success") === "success")
      .map((s) => {
        return `${new Date(s.timestamp).toLocaleTimeString()}\n${s.summary ?? "観測がありません"}`;
      })
      .join("\n\n") || "履歴がありません。";

  const requirements = [
    "セッション（作業のまとまり）ごとに区切ってタイムライン化する",
    "推定は推定と明記する",
  ].join("\n- ");

  return [
    "以下は観測ログです。これを根拠に、作業報告書をMarkdownで作ってください。",
    "",
    "観測ログ（時系列）:",
    rows,
    "",
    "要件:",
    `- ${requirements}`,
  ].join("\n");
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
  } catch (e) {
    console.error("Prompt API call error", e);
    return null;
  } finally {
    if (session.destroy) {
      session.destroy();
    }
  }
}

export async function generateReport(
  summaries: SummaryEntry[]
): Promise<{ markdown: string } | undefined> {
  const prompt = buildReportPrompt(summaries);

  try {
    const result = await callPromptAPI(REPORT_SYSTEM_PROMPT, prompt);
    if (result) {
      return { markdown: result };
    }
  } catch (e) {
    console.error("Prompt API error (report)", e);
  }

  return undefined;
}

export async function generateCaptureSummary(params: {
  frameBlob?: Blob;
}): Promise<string | undefined> {
  const { frameBlob } = params;

  const prompt =
    "このスクリーンショットで見えていることを、日本語の文章で説明してください。推測や箇条書きは禁止です。";

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
      return undefined;
    }
    const result = await session.prompt(messages);
    session.destroy?.();
    if (result) {
      return result.trim();
    }
  } catch (e) {
    console.error("Prompt API error (summary)", e);
  }

  return undefined;
}
