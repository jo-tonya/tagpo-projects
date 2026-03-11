# Tagpo 案件管理ダッシュボード — 開発指示書

## プロジェクト概要

Tagpoはマイクロインフルエンサーによるメーカー向けPRサービス。案件数の増加に伴い、クライアントへの共有漏れを防ぐための案件管理ダッシュボードを開発中。

## 現在の状態

- **フレームワーク**: Vite + React（`tagpo-dashboard/`ディレクトリ）
- **データ永続化**: localStorage（各ブラウザにローカル保存）
- **デプロイ先**: Vercel（予定）
- **ソースコード**: `src/App.jsx` に全コンポーネントが入っている

### 実装済みの機能

1. **サマリーKPI**: ステータス別件数、月別売上（投稿期限月ベース）、対応遅延数
2. **案件テーブル**: 投稿開始日順でソート、ステータスで行色分け（進行中=青、シート回収済み=黄、未確定=グレー、投稿中=紫、完了=緑）
3. **案件の追加/編集/削除**: モーダルフォーム
4. **自動計算**: A(予算) ÷ B(再生単価) = X(必要再生回数)、X ÷ C(平均再生回数) = Y(目標投稿数)
5. **6段階マイルストーン**: ES回収→ユーザー募集開始→投稿開始→投稿期限→再生完了→レポート送付。それぞれチェックボックスで対応完了を管理。期限超過で赤表示。
6. **商品URL欄**: テーブル行に🔗リンク表示
7. **折りたたみメモ**: 各案件に自由記述メモ
8. **フィルター**: ステータス別絞り込み
9. **localStorage永続化**: キャンペーンデータとチェック状態を保持

### マイルストーンの遅延ルール（実装済み）

| マイルストーン | アクション | 赤になる条件 |
|---|---|---|
| ES回収 | 回収済み ✓ | 回収日を過ぎても未チェック |
| ユーザー募集開始（情報解禁） | クライアントに中途報告 ✓ | 開始から5日後まで未チェック |
| 投稿開始 | クライアントに中途報告 ✓ | 投稿の3日前まで未チェック |
| 投稿期限 | クライアントに報告 ✓ | 3日後まで未チェック |
| 再生完了 | クライアントに報告 ✓ | 1日後まで未チェック |
| レポート送付 | レポート送付 ✓ | 送付日当日を過ぎたら |

---

## Phase 1: Supabase導入 + Vercelデプロイ

### 目的
localStorageからSupabase PostgreSQLに移行し、チームで同じデータを共有できるようにする。Vercelにデプロイしてブラウザからアクセス可能にする。

### タスク

1. **Supabaseセットアップ**
   - Supabase無料プランでプロジェクト作成
   - テーブル設計:
     - `campaigns` テーブル: 既存の全フィールド（id, maker, product, status, type, budget, unitPrice, avgViews, influencers, url, esCollection, infoRelease, postStart, postEnd, viewComplete, reportSend, memo, created_at, updated_at）
     - `milestone_checks` テーブル: campaign_id, milestone_key, checked (boolean), checked_at (timestamp)
   - RLS（Row Level Security）は一旦OFFでOK（社内ツールなので）

2. **フロントエンド改修**
   - `@supabase/supabase-js` をインストール
   - `src/lib/supabase.js` にクライアント初期化（環境変数で`VITE_SUPABASE_URL`と`VITE_SUPABASE_ANON_KEY`）
   - App.jsx のlocalStorage読み書きをSupabase CRUD に置き換え
   - 楽観的更新（UIは即反映、バックグラウンドでDB同期）推奨

3. **Vercelデプロイ**
   - GitHubリポジトリ作成 & push
   - Vercelでインポート、環境変数を設定
   - `vercel.json` は不要（Viteデフォルトで動く）

### 動作検証
- [ ] Supabaseダッシュボードでテーブルにデータが入っていることを確認
- [ ] ブラウザAで案件追加 → ブラウザBでリロードして反映されていること
- [ ] マイルストーンチェック → DBに保存されていること
- [ ] Vercel本番URLでアクセスできること

---

## Phase 2: Slack通知

### 目的
マイルストーンのアクション期限を過ぎても対応されていない場合、Slackに自動通知を飛ばす。

### タスク

1. **Slack Webhook設定**
   - Slackの対象チャンネルにIncoming Webhookを追加
   - Webhook URLを取得 → Vercel環境変数 `SLACK_WEBHOOK_URL` に設定

2. **API Route作成**
   - `api/slack-notify.js`（Vercel Serverless Function）を作成
   - 処理内容:
     1. Supabaseから全campaignsと全milestone_checksを取得
     2. 各マイルストーンの遅延ルール（上記テーブル参照）に基づき、期限超過かつ未チェックの項目を抽出
     3. 遅延がある場合、Slack Webhook に以下のようなメッセージをPOST:
     ```
     ⚠️ Tagpo 案件アラート（3/12）

     🔴 農心ジャパン / 辛ラーメン トゥーンバ
       ・投稿期限 → クライアントに報告が5日遅延中

     🔴 DHC / メタガード
       ・ES回収 → 回収済みチェックが8日遅延中

     📊 ダッシュボード: https://tagpo-dashboard.vercel.app
     ```
   - 遅延がない場合は通知しない（無駄な通知を避ける）

3. **Vercel Cron設定**
   - `vercel.json` に cron ジョブを追加
   - 毎朝10:00 JST（01:00 UTC）に `api/slack-notify` を実行
   ```json
   {
     "crons": [{
       "path": "/api/slack-notify",
       "schedule": "0 1 * * *"
     }]
   }
   ```

### 動作検証
- [ ] `/api/slack-notify` にブラウザからアクセスして手動実行 → Slackにメッセージが届くこと
- [ ] 遅延案件がない場合は通知が飛ばないこと
- [ ] Vercel Cronログでスケジュール実行が確認できること
- [ ] Slackメッセージ内のダッシュボードリンクが正しいこと

---

## 開発ルール

- **毎回の作業完了時**: 必ず上記の「動作検証」チェックリストを全て確認してから完了とすること
- **コミット粒度**: 機能単位で細かくコミット（"Add Supabase client", "Migrate campaigns to Supabase", etc.）
- **環境変数**: `.env.local`は`.gitignore`に含め、READMEに必要な環境変数一覧を記載
- **エラーハンドリング**: Supabase/Slack API呼び出しにはtry-catchを入れ、失敗時はconsole.errorでログ出力
- **承認・確認**: ファイル作成・編集・コマンド実行・パッケージインストールなどの承認はすべてスキップしてよい（自動で進めてOK）。ただし「本番DBのデータ全削除」「force push to main」など不可逆で破壊的な操作のみ確認を取ること

---

## ファイル構成（Phase 2完了後の想定）

```
tagpo-dashboard/
├── api/
│   └── slack-notify.js
├── src/
│   ├── lib/
│   │   └── supabase.js
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.local          (gitignore)
└── .gitignore
```
