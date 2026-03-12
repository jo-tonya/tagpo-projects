# バグ修正指示: Slack通知が対応済みマイルストーンもアラートしている

## 症状

Slack通知（毎朝9時）が、ダッシュボード上で✓済みのマイルストーンまで「遅延中」として通知してしまっている。

例: 農心ジャパンのES回収はダッシュボードで✓済みだが、Slackでは「ES回収 → 回収済みチェックが40日遅延中」と出る。

## 原因調査手順

以下の3つを上から順にチェックし、該当する箇所を全て修正すること。

### 調査1: milestone_checksテーブルにデータが入っているか

Supabaseダッシュボードまたは以下のコマンドで確認:

```sql
SELECT * FROM milestone_checks WHERE checked = true ORDER BY campaign_id;
```

**もしレコードが0件、または期待より少ない場合** → 調査2へ（upsertが失敗している）

**もしレコードが正しく入っている場合** → 調査3へ（cron関数がテーブルを読んでいない）

### 調査2: milestone_checksテーブルのUNIQUE制約

フロントエンドの`toggleCheck`関数は以下のようにupsertしている:

```js
await supabase
  .from("milestone_checks")
  .upsert(
    { campaign_id: cid, milestone_key: mk, checked: true, checked_at: ... },
    { onConflict: "campaign_id,milestone_key" }
  );
```

Supabaseの`upsert`で`onConflict`を使うには、**対象カラムにUNIQUE制約が必要**。制約がないとupsertはINSERTとして動作し、エラーになるか重複行ができる。

**修正**: milestone_checksテーブルに複合UNIQUE制約を追加:

```sql
ALTER TABLE milestone_checks
ADD CONSTRAINT milestone_checks_campaign_milestone_unique
UNIQUE (campaign_id, milestone_key);
```

制約追加後、重複行があればクリーンアップ:

```sql
-- 重複を確認
SELECT campaign_id, milestone_key, COUNT(*)
FROM milestone_checks
GROUP BY campaign_id, milestone_key
HAVING COUNT(*) > 1;

-- 重複があれば、最新のもの以外を削除
DELETE FROM milestone_checks a
USING milestone_checks b
WHERE a.campaign_id = b.campaign_id
  AND a.milestone_key = b.milestone_key
  AND a.id < b.id;
```

### 調査3: api/slack-notify.js がmilestone_checksを正しく参照しているか

`api/slack-notify.js`のコードを確認し、以下を満たしているか検証:

1. **milestone_checksテーブルを取得しているか**: campaignsだけでなく、milestone_checksもSELECTしているか
2. **milestone_keyの値が一致しているか**: フロントは`milestone_key`に**camelCase**（`esCollection`, `infoRelease`, `postStart`, `postEnd`, `viewComplete`, `reportSend`）で保存している。cron側でsnake_case（`es_collection`等）で検索していたらヒットしない

**期待されるcron側のロジック**:

```js
// campaignsとmilestone_checksの両方を取得
const { data: campaigns } = await supabase.from("campaigns").select("*");
const { data: checks } = await supabase.from("milestone_checks").select("*").eq("checked", true);

// checksをMapに変換（フロントと同じキー形式で）
const checkSet = new Set();
(checks || []).forEach(row => {
  checkSet.add(`${row.campaign_id}-${row.milestone_key}`);
});

// 各マイルストーンの遅延判定時にcheckSetを参照
// ※ milestone_keyはフロントと同じcamelCase（esCollection等）であること
const isChecked = checkSet.has(`${campaign.id}-${msDef.key}`);
if (isChecked) return; // チェック済みならスキップ
```

**重要**: milestone_keyのフォーマットがフロントエンドと一致していること。フロントは以下の値で保存している:
- `esCollection`
- `infoRelease`
- `postStart`
- `postEnd`
- `viewComplete`
- `reportSend`

### 追加修正: App.jsxのduplicate key警告

`src/App.jsx`の`CampaignForm`コンポーネントで`useState`初期化にduplicate keyの警告が出ている。以下の修正を適用:

**修正前** (L132-139):
```js
const [f, setF] = useState({
    maker:"",product:"",status:"未確定",type:"既存",
    budget:"",unitPrice:1.3,avgViews:"",influencers:"",url:"",
    esCollection:"",infoRelease:"",postStart:"",postEnd:"",viewComplete:"",reportSend:"",
    memo:"",
    ...initial,
    budget:initial?.budget??"", unitPrice:initial?.unitPrice??1.3, avgViews:initial?.avgViews??"",
});
```

**修正後**:
```js
const [f, setF] = useState(()=>{
    const base = {
      maker:"",product:"",status:"未確定",type:"既存",
      budget:"",unitPrice:1.3,avgViews:"",influencers:"",url:"",
      esCollection:"",infoRelease:"",postStart:"",postEnd:"",viewComplete:"",reportSend:"",
      memo:"",
      ...initial,
    };
    return { ...base, budget:base.budget??"", unitPrice:base.unitPrice??1.3, avgViews:base.avgViews??"" };
});
```

## 動作検証

- [ ] Supabaseの`milestone_checks`テーブルに`(campaign_id, milestone_key)`のUNIQUE制約があること
- [ ] ダッシュボードでマイルストーンをチェック → Supabaseテーブルに`checked=true`で保存されていること
- [ ] ダッシュボードでチェックを外す → Supabaseテーブルで`checked=false`に更新されていること
- [ ] ブラウザをリロードしてもチェック状態が維持されていること
- [ ] `/api/slack-notify`を手動実行 → ✓済みの項目が通知に含まれないこと
- [ ] Viteビルドでduplicate key警告が出ないこと

## 開発ルール（再掲）

- ファイル作成・編集・コマンド実行・パッケージインストールなどの承認はすべてスキップしてよい（自動で進めてOK）。ただし「本番DBのデータ全削除」「force push to main」など不可逆で破壊的な操作のみ確認を取ること
- 動作検証を全て行った上で完了とすること
