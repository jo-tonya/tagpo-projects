import { createClient } from "@supabase/supabase-js";

// ── Milestone definitions (same logic as frontend) ──
// k = DB column name (snake_case), fk = frontend milestone_key (camelCase, stored in milestone_checks)
const MS_DEFS = [
  { k: "es_collection",  fk: "esCollection",  label: "ES回収",                      action: "回収済みチェック",       deadlineOffset: (d) => d },
  { k: "info_release",   fk: "infoRelease",   label: "ユーザー募集開始（情報解禁）", action: "クライアントに中途報告", deadlineOffset: (d) => addDays(d, 5) },
  { k: "post_start",     fk: "postStart",     label: "投稿開始",                     action: "クライアントに中途報告", deadlineOffset: (d) => addDays(d, -3) },
  { k: "post_end",       fk: "postEnd",       label: "投稿期限",                     action: "クライアントに報告",     deadlineOffset: (d) => addDays(d, 3) },
  { k: "view_complete",  fk: "viewComplete",  label: "再生完了",                     action: "クライアントに報告",     deadlineOffset: (d) => addDays(d, 1) },
  { k: "report_send",    fk: "reportSend",    label: "レポート送付",                 action: "レポート送付",           deadlineOffset: (d) => d },
];

function addDays(dateStr, n) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dDiff(s) {
  if (!s) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / 864e5);
}

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Supabase credentials not configured" });
    }
    if (!slackWebhookUrl) {
      return res.status(500).json({ error: "SLACK_WEBHOOK_URL not configured" });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all campaigns
    const { data: campaigns, error: campErr } = await supabase
      .from("campaigns")
      .select("*");

    if (campErr) throw campErr;

    // Fetch all milestone checks
    const { data: checkRows, error: checkErr } = await supabase
      .from("milestone_checks")
      .select("*");

    if (checkErr) throw checkErr;

    // Build checks map
    const checksMap = {};
    (checkRows || []).forEach((row) => {
      if (row.checked) {
        checksMap[`${row.campaign_id}-${row.milestone_key}`] = true;
      }
    });

    // Find overdue milestones
    const overdueItems = [];

    (campaigns || []).forEach((camp) => {
      const campOverdues = [];

      MS_DEFS.forEach((ms) => {
        const dateVal = camp[ms.k];
        if (!dateVal) return;

        const checked = checksMap[`${camp.id}-${ms.fk}`];
        if (checked) return;

        const deadline = ms.deadlineOffset(dateVal);
        if (!deadline) return;

        const diff = dDiff(deadline);
        if (diff !== null && diff < 0) {
          campOverdues.push({
            milestone: ms.label,
            action: ms.action,
            daysOverdue: Math.abs(diff),
          });
        }
      });

      if (campOverdues.length > 0) {
        overdueItems.push({
          maker: camp.maker,
          product: camp.product,
          overdues: campOverdues,
        });
      }
    });

    // If no overdue items, don't send notification
    if (overdueItems.length === 0) {
      return res.status(200).json({ message: "No overdue items. No notification sent." });
    }

    // Build Slack message
    const today = new Date();
    const dateStr = `${today.getMonth() + 1}/${today.getDate()}`;

    let message = `⚠️ Tagpo 案件アラート（${dateStr}）\n\n`;

    overdueItems.forEach((item) => {
      message += `🔴 ${item.maker} / ${item.product}\n`;
      item.overdues.forEach((od) => {
        message += `　・${od.milestone} → ${od.action}が${od.daysOverdue}日遅延中\n`;
      });
      message += "\n";
    });

    const dashboardUrl = process.env.DASHBOARD_URL || "https://tagpo-projects.vercel.app";
    message += `📊 ダッシュボード: ${dashboardUrl}`;

    // Send to Slack
    const slackRes = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    if (!slackRes.ok) {
      const errText = await slackRes.text();
      throw new Error(`Slack webhook failed: ${slackRes.status} ${errText}`);
    }

    return res.status(200).json({
      message: "Notification sent",
      overdueCount: overdueItems.length,
    });
  } catch (err) {
    console.error("slack-notify error:", err);
    return res.status(500).json({ error: err.message });
  }
}
