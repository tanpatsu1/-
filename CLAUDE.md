# MISE — Brand Manager

## Stack
- 素のHTML + CDN React 18 + Babel standalone（**ビルドなし**）
- Vercel デプロイ / Serverless Functions（`api/`）
- Supabase（auth + `user_data` テーブルにJSON保存）

## エントリ
`index.html` が以下を順に読込:
`js/auth.js` → `data.js` → `tweaks-panel.jsx` → `components.jsx` → `brands.jsx` → `pages.jsx` → `auth.jsx` → `app.jsx`

## 主要ファイル
- `app.jsx` — ルート、reducer、ページ切替、Supabase 同期
- `auth.jsx` — `AuthGate`（セッション判定 + `/login` リダイレクト）
- `js/auth.js` — Supabase クライアント生成 / sign-in/up/out
- `brands.jsx` `pages.jsx` `components.jsx` — UI
- `data.js` — シードデータ（`window.SEED_*`）
- `api/config.js` — フロントへ `SUPABASE_URL` / `SUPABASE_ANON_KEY` を返す
- `api/fetch-meta.js` — URL→OGP/swatch 取得
- `api/cron/sync-products.js` — 日次同期
- `supabase/*.sql` — スキーマ
- `brand.html` `login.html` `reset-password.html` — 個別ページ

## 環境変数（Vercel に設定必須）
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` ← **これが無いと白画面**
- `SUPABASE_SERVICE_ROLE_KEY`（cron用）
- `CRON_SECRET`

## ローカル起動
`/api/config` が必要なため **`vercel dev` 必須**。素の静的サーバーでは認証初期化が失敗する。

## 既知の落とし穴
- 白画面 = ① 環境変数未設定 ② 未ログイン時の `AuthGate` `return null`（修正済: ローディング表示にフォールバック）
- `_initClient` の例外は `AuthGate` の `.catch` でエラー表示
- React/ReactDOM/Babel/Supabase は **CDN 固定バージョン**。バージョン上げる時は SRI ハッシュも更新

## 開発ルール
- ビルドステップを足さない（哲学: シンプル維持）
- JSX ファイルは `<script type="text/babel">` で読まれるため import/export 不可、グローバル関数で連携
- 新しいJSXを足すときは `index.html` の script 順に注意（依存先を先に）
- 推測で大規模リファクタしない / 最小修正
