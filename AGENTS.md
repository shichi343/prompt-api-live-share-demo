# AGENTS

- プロジェクト: Next.js (App Router, TypeScript, Tailwind CSS)
- パッケージマネージャー: npm
- 品質/フォーマット: Ultracite(Biome)、`npm run format` / `npm run lint`
- エディタ: VSCode推奨、保存時フォーマットを有効化
- デプロイ想定: 静的エクスポート（GitHub Pages）

## デプロイ
- GitHub Actions: `.github/workflows/deploy.yml` で Pages デプロイ
- ビルド/エクスポート: `npm run build`（`output: "export"` で `out/` が生成）
- basePath: Pages の公開URLが `https://username.github.io/<repo>/` の場合は `NEXT_PUBLIC_BASE_PATH=<repo>` を環境変数で指定（ルート直下なら不要）

