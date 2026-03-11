import { useState, useMemo, useEffect, useCallback } from "react";

// ══════════════════════════════════════════
//  NEW Milestone definitions
//  Each has: key, label, actionLabel (checkbox text),
//  deadlineRule: function(campaign) => deadline Date string for turning red
// ══════════════════════════════════════════
const MS_DEFS = [
  { k:"esCollection",  label:"ES回収",                  action:"回収済み",            deadlineOffset: (d) => d },                           // 回収日当日
  { k:"infoRelease",   label:"ユーザー募集開始（情報解禁）", action:"クライアントに中途報告", deadlineOffset: (d) => addDays(d, 5) },              // 開始から5日後
  { k:"postStart",     label:"投稿開始",                 action:"クライアントに中途報告", deadlineOffset: (d) => addDays(d, -3) },             // 投稿の3日前
  { k:"postEnd",       label:"投稿期限",                 action:"クライアントに報告",    deadlineOffset: (d) => addDays(d, 3) },              // 3日後
  { k:"viewComplete",  label:"再生完了",                 action:"クライアントに報告",    deadlineOffset: (d) => addDays(d, 1) },              // 1日後
  { k:"reportSend",    label:"レポート送付",             action:"レポート送付",          deadlineOffset: (d) => d },                           // 送付日当日
];

function addDays(dateStr, n) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}

// ══════════════════════════════════════════
//  Seed data
// ══════════════════════════════════════════
const SEED = [
  { id:1,  maker:"農心ジャパン",              product:"辛ラーメン トゥーンバ",                  status:"進行中",        type:"既存",  budget:3900000, unitPrice:1.3, avgViews:150, influencers:"",              url:"", esCollection:"2026-01-31", infoRelease:"2026-02-01", postStart:"2026-03-02", postEnd:"2026-03-05", viewComplete:"2026-03-20", reportSend:"2026-04-03", memo:"" },
  { id:2,  maker:"アイリスオーヤマ",          product:"Genkiパンツ",                            status:"進行中",        type:"既存",  budget:2000000, unitPrice:1.3, avgViews:77,  influencers:"",              url:"", esCollection:"2026-01-13", infoRelease:"2026-01-31", postStart:"2026-02-12", postEnd:"2026-03-15", viewComplete:"2026-03-31", reportSend:"",           memo:"" },
  { id:3,  maker:"エヌアイエスフーズサービス",product:"ヴェルターズキャラメルキャンディ 70g",    status:"進行中",        type:"既存",  budget:1800000, unitPrice:1.3, avgViews:46,  influencers:"",              url:"", esCollection:"2026-01-31", infoRelease:"",           postStart:"2026-03-02", postEnd:"2026-04-01", viewComplete:"",           reportSend:"",           memo:"" },
  { id:4,  maker:"ユニリーバ",                product:"ダヴ ビューティセラムボディウォッシュ",  status:"シート回収済み", type:"新商品", budget:3000000, unitPrice:1.3, avgViews:77,  influencers:"",              url:"", esCollection:"2026-03-01", infoRelease:"2026-03-02", postStart:"2026-03-31", postEnd:"2026-04-30", viewComplete:"",           reportSend:"",           memo:"審査: EG" },
  { id:5,  maker:"株式会社b-ex",              product:"ロレッタ",                              status:"シート回収済み", type:"新商品", budget:1300000, unitPrice:1.3, avgViews:50,  influencers:"",              url:"", esCollection:"2026-03-01", infoRelease:"",           postStart:"2026-03-31", postEnd:"2026-04-20", viewComplete:"",           reportSend:"",           memo:"審査: EG" },
  { id:6,  maker:"リベルタ",                  product:"QB",                                    status:"シート回収済み", type:"既存",  budget:1000000, unitPrice:1.3, avgViews:31,  influencers:"",              url:"", esCollection:"2026-03-17", infoRelease:"",           postStart:"2026-04-16", postEnd:"2026-06-10", viewComplete:"",           reportSend:"",           memo:"" },
  { id:7,  maker:"エイクリット",              product:"首枕",                                  status:"未確定",        type:"既存",  budget:1000000, unitPrice:1.3, avgViews:26,  influencers:"",              url:"", esCollection:"2026-02-28", infoRelease:"",           postStart:"2026-03-03", postEnd:"2026-04-30", viewComplete:"",           reportSend:"",           memo:"" },
  { id:8,  maker:"DHC",                        product:"メタガード",                            status:"未確定",        type:"既存",  budget:1500000, unitPrice:1.3, avgViews:77,  influencers:"15人",          url:"", esCollection:"2026-03-04", infoRelease:"",           postStart:"2026-04-03", postEnd:"2026-05-10", viewComplete:"",           reportSend:"",           memo:"" },
  { id:9,  maker:"大正製薬",                  product:"ブラックウルフ",                        status:"未確定",        type:"新商品", budget:3000000, unitPrice:1.3, avgViews:105, influencers:"男20-30 女70-80", url:"", esCollection:"2026-04-01", infoRelease:"",           postStart:"2026-05-01", postEnd:"2026-05-30", viewComplete:"",           reportSend:"",           memo:"" },
  { id:10, maker:"日本薬健",                  product:"いないいないグルテン① ウエルシア",      status:"シート回収済み", type:"新商品", budget:1000000, unitPrice:1.3, avgViews:26,  influencers:"",              url:"", esCollection:"2026-04-01", infoRelease:"2026-03-10", postStart:"2026-05-01", postEnd:"2026-05-30", viewComplete:"",           reportSend:"",           memo:"メーカー" },
  { id:11, maker:"日本薬健",                  product:"いないいないグルテン② ツルハ",          status:"シート回収済み", type:"新商品", budget:1000000, unitPrice:1.3, avgViews:26,  influencers:"",              url:"", esCollection:"2026-04-25", infoRelease:"",           postStart:"2026-05-25", postEnd:"2026-06-15", viewComplete:"",           reportSend:"",           memo:"" },
  { id:12, maker:"DHC",                        product:"（値下げ案件）",                        status:"未確定",        type:"既存",  budget:1500000, unitPrice:1.3, avgViews:77,  influencers:"5〜10人",       url:"", esCollection:"2026-04-15", infoRelease:"",           postStart:"2026-05-15", postEnd:"2026-06-10", viewComplete:"",           reportSend:"",           memo:"" },
];

// ══════════════════════════════════════════
//  Config
// ══════════════════════════════════════════
const STATUS_CFG = {
  未確定:         { c:"#94a3b8", bg:"#f1f5f9", row:"#f8fafc",  bl:"#cbd5e1" },
  シート回収済み: { c:"#f59e0b", bg:"#fffbeb", row:"#fffdf5",  bl:"#fbbf24" },
  進行中:         { c:"#3b82f6", bg:"#eff6ff", row:"#f0f7ff",  bl:"#60a5fa" },
  投稿中:         { c:"#8b5cf6", bg:"#f5f3ff", row:"#f8f5ff",  bl:"#a78bfa" },
  完了:           { c:"#10b981", bg:"#ecfdf5", row:"#f0fdf4",  bl:"#34d399" },
};
const S_ORDER = ["未確定","シート回収済み","進行中","投稿中","完了"];

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════
const now = new Date(); now.setHours(0,0,0,0);
const dDiff = (s) => { if(!s) return null; const d=new Date(s); d.setHours(0,0,0,0); return Math.ceil((d-now)/864e5); };
const fDate = (s) => { if(!s) return "—"; const d=new Date(s); return `${d.getMonth()+1}/${d.getDate()}`; };
const fYen  = (n) => { if(!n) return "—"; return n>=10000 ? `¥${(n/10000).toFixed(0)}万` : `¥${n.toLocaleString()}`; };
const fNum  = (n) => (n!=null && !isNaN(n)) ? Number(n).toLocaleString() : "—";

function calc(c) {
  const rv = (c.budget && c.unitPrice) ? Math.round(c.budget / c.unitPrice) : null;
  const tp = (rv && c.avgViews) ? Math.ceil(rv / c.avgViews) : null;
  return { ...c, requiredViews: rv, targetPosts: tp };
}

// Check if a milestone's ACTION is overdue (not the date itself, but the deadline for the action)
function isMsOverdue(campaign, msDef, checked) {
  if (checked) return false;
  if (!campaign[msDef.k]) return false;
  const deadline = msDef.deadlineOffset(campaign[msDef.k]);
  if (!deadline) return false;
  return dDiff(deadline) < 0;
}

// ══════════════════════════════════════════
//  Persistence
// ══════════════════════════════════════════
const LS_C = "tagpo_v2_campaigns";
const LS_M = "tagpo_v2_checks";

function loadC() { try { const r=localStorage.getItem(LS_C); if(r) return JSON.parse(r); } catch{} return SEED; }
function loadM() { try { const r=localStorage.getItem(LS_M); if(r) return JSON.parse(r); } catch{} return {}; }

// ══════════════════════════════════════════
//  Styles
// ══════════════════════════════════════════
const iS = { width:"100%",padding:"8px 10px",borderRadius:6,border:"1px solid #e2e8f0",fontSize:13,color:"#1e293b",background:"#fff",boxSizing:"border-box" };
const lS = { fontSize:11,fontWeight:600,color:"#64748b",marginBottom:3,display:"block" };

// ══════════════════════════════════════════
//  Campaign Form (Add / Edit)
// ══════════════════════════════════════════
function CampaignForm({ initial, onSave, onClose, title }) {
  const [f, setF] = useState({
    maker:"",product:"",status:"未確定",type:"既存",
    budget:"",unitPrice:1.3,avgViews:"",influencers:"",url:"",
    esCollection:"",infoRelease:"",postStart:"",postEnd:"",viewComplete:"",reportSend:"",
    memo:"",
    ...initial,
    budget:initial?.budget??"", unitPrice:initial?.unitPrice??1.3, avgViews:initial?.avgViews??"",
  });
  const s=(k,v)=>setF(p=>({...p,[k]:v}));
  const rv=(f.budget&&f.unitPrice)?Math.round(Number(f.budget)/Number(f.unitPrice)):null;
  const tp=(rv&&f.avgViews)?Math.ceil(rv/Number(f.avgViews)):null;
  const submit=()=>{
    if(!f.maker.trim()||!f.product.trim()) return;
    onSave({...f, budget:f.budget?Number(f.budget):null, unitPrice:f.unitPrice?Number(f.unitPrice):null, avgViews:f.avgViews?Number(f.avgViews):null });
  };
  const rb=(v)=>(!String(v).trim()?"1px solid #fca5a5":"1px solid #e2e8f0");

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:16,padding:"28px 32px",width:660,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{margin:0,fontSize:20,fontWeight:700,color:"#0f172a"}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,color:"#94a3b8",cursor:"pointer"}}>✕</button>
        </div>

        {/* Basic */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div><label style={lS}>メーカー名 *</label><input style={{...iS,border:rb(f.maker)}} value={f.maker} onChange={e=>s("maker",e.target.value)} placeholder="例: 大正製薬" /></div>
          <div><label style={lS}>商品名 *</label><input style={{...iS,border:rb(f.product)}} value={f.product} onChange={e=>s("product",e.target.value)} placeholder="例: ブラックウルフ" /></div>
          <div><label style={lS}>ステータス</label><select style={iS} value={f.status} onChange={e=>s("status",e.target.value)}>{S_ORDER.map(v=><option key={v}>{v}</option>)}</select></div>
          <div><label style={lS}>既存/新商品</label><select style={iS} value={f.type} onChange={e=>s("type",e.target.value)}><option value="既存">既存</option><option value="新商品">新商品</option></select></div>
        </div>

        <div style={{marginBottom:16}}><label style={lS}>商品URL</label><input style={iS} value={f.url} onChange={e=>s("url",e.target.value)} placeholder="https://..." /></div>

        {/* A/B/C → X/Y */}
        <div style={{fontSize:12,fontWeight:600,color:"#475569",marginBottom:8}}>予算 &amp; 数値（A/B/C → X/Y 自動計算）</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:8}}>
          <div><label style={lS}><b style={{color:"#3b82f6"}}>A</b> 予算（円）</label><input style={iS} type="number" value={f.budget} onChange={e=>s("budget",e.target.value)} placeholder="3000000" /></div>
          <div><label style={lS}><b style={{color:"#3b82f6"}}>B</b> 再生単価（円）</label><input style={iS} type="number" step="0.1" value={f.unitPrice} onChange={e=>s("unitPrice",e.target.value)} placeholder="1.3" /></div>
          <div><label style={lS}><b style={{color:"#3b82f6"}}>C</b> 平均再生回数（想定）</label><input style={iS} type="number" value={f.avgViews} onChange={e=>s("avgViews",e.target.value)} placeholder="77" /></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
          <div style={{background:"#f0f9ff",padding:"10px 12px",borderRadius:8,border:"1px dashed #93c5fd"}}>
            <div style={{fontSize:11,color:"#3b82f6",fontWeight:600}}>X = A ÷ B 必要再生回数</div>
            <div style={{fontSize:18,fontWeight:700,color:"#1e40af",marginTop:2}}>{rv?fNum(rv):"—"}</div>
          </div>
          <div style={{background:"#f0f9ff",padding:"10px 12px",borderRadius:8,border:"1px dashed #93c5fd"}}>
            <div style={{fontSize:11,color:"#3b82f6",fontWeight:600}}>Y = X ÷ C 目標投稿数</div>
            <div style={{fontSize:18,fontWeight:700,color:"#1e40af",marginTop:2}}>{tp?fNum(tp):"—"}</div>
          </div>
          <div><label style={lS}>投稿者数</label><input style={iS} value={f.influencers} onChange={e=>s("influencers",e.target.value)} placeholder="15人" /></div>
        </div>

        {/* Dates — 6 milestones */}
        <div style={{fontSize:12,fontWeight:600,color:"#475569",marginBottom:8}}>マイルストーン日程</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
          {MS_DEFS.map(m=>(
            <div key={m.k}><label style={lS}>{m.label}</label><input style={iS} type="date" value={f[m.k]||""} onChange={e=>s(m.k,e.target.value)} /></div>
          ))}
        </div>

        <div style={{marginBottom:20}}><label style={lS}>メモ</label><textarea style={{...iS,minHeight:70,resize:"vertical",fontFamily:"inherit"}} value={f.memo} onChange={e=>s("memo",e.target.value)} placeholder="案件メモを自由に記載..." /></div>

        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <button onClick={onClose} style={{padding:"10px 20px",borderRadius:8,border:"1px solid #e2e8f0",background:"#fff",color:"#64748b",fontSize:14,cursor:"pointer"}}>キャンセル</button>
          <button onClick={submit} disabled={!f.maker.trim()||!f.product.trim()} style={{padding:"10px 24px",borderRadius:8,border:"none",background:(!f.maker.trim()||!f.product.trim())?"#cbd5e1":"#3b82f6",color:"#fff",fontSize:14,fontWeight:600,cursor:(!f.maker.trim()||!f.product.trim())?"default":"pointer"}}>保存する</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════
//  Main Dashboard
// ══════════════════════════════════════════
export default function TagpoDashboard() {
  const [campaigns, setCampaigns] = useState(loadC);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("postStart");
  const [expandedId, setExpanded] = useState(null);
  const [checks, setChecks] = useState(loadM);  // { "campId-msKey": true }
  const [modal, setModal] = useState(null);
  const [memoOpen, setMemoOpen] = useState({});

  useEffect(()=>{localStorage.setItem(LS_C,JSON.stringify(campaigns));},[campaigns]);
  useEffect(()=>{localStorage.setItem(LS_M,JSON.stringify(checks));},[checks]);

  const toggleCheck = useCallback((cid,mk) => {
    setChecks(p=>{const k=`${cid}-${mk}`; return {...p,[k]:!p[k]};});
  },[]);

  const updateStatus = useCallback((id,st)=>{
    setCampaigns(p=>p.map(c=>c.id===id?{...c,status:st}:c));
  },[]);

  const addCampaign=(data)=>{
    const nid=Math.max(...campaigns.map(c=>c.id),0)+1;
    setCampaigns(p=>[...p,{...data,id:nid}]); setModal(null);
  };
  const editCampaign=(data)=>{
    setCampaigns(p=>p.map(c=>c.id===data.id?{...c,...data}:c)); setModal(null);
  };
  const deleteCampaign=(id)=>{
    if(!confirm("この案件を削除しますか？")) return;
    setCampaigns(p=>p.filter(c=>c.id!==id));
    if(expandedId===id) setExpanded(null);
  };

  const enriched = useMemo(()=>campaigns.map(calc),[campaigns]);

  const filtered = useMemo(()=>{
    let list=[...enriched];
    if(filter!=="all") list=list.filter(c=>c.status===filter);
    list.sort((a,b)=>{
      if(sortBy==="postStart"){ const an=a.postStart,bn=b.postStart; if(!an)return 1;if(!bn)return -1; return new Date(an)-new Date(bn); }
      if(sortBy==="budget") return (b.budget||0)-(a.budget||0);
      if(sortBy==="maker") return a.maker.localeCompare(b.maker);
      return 0;
    });
    return list;
  },[enriched,filter,sortBy]);

  // ── Stats ──
  const stats = useMemo(()=>{
    const byStatus = {};
    S_ORDER.forEach(s=>{byStatus[s]=enriched.filter(c=>c.status===s).length;});

    let overdueActions=0;
    enriched.forEach(c=>{
      MS_DEFS.forEach(m=>{
        if(isMsOverdue(c,m,checks[`${c.id}-${m.k}`])) overdueActions++;
      });
    });

    // Monthly revenue (grouped by postEnd month)
    const monthly={};
    enriched.forEach(c=>{
      if(!c.postEnd||!c.budget) return;
      const d=new Date(c.postEnd);
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      monthly[key]=(monthly[key]||0)+c.budget;
    });
    const monthKeys=Object.keys(monthly).sort();

    return { total:enriched.length, byStatus, overdueActions, totalBudget:enriched.reduce((s,c)=>s+(c.budget||0),0), monthly, monthKeys };
  },[enriched,checks]);

  // (campOverdue removed — row color is now purely status-based)

  return (
    <div style={{background:"#f8fafc",minHeight:"100vh",padding:"24px",fontFamily:"'Helvetica Neue','Hiragino Sans','Yu Gothic',sans-serif"}}>

      {/* ── Header ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:28,fontWeight:700,color:"#0f172a",letterSpacing:-.5}}>Tagpo 案件管理ダッシュボード</h1>
          <p style={{margin:"4px 0 0",fontSize:14,color:"#64748b"}}>{now.getFullYear()}年{now.getMonth()+1}月{now.getDate()}日 現在</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{padding:"8px 12px",borderRadius:8,border:"1px solid #e2e8f0",fontSize:13,color:"#475569",background:"#fff",cursor:"pointer"}}>
            <option value="postStart">投稿開始日順</option>
            <option value="budget">予算順</option>
            <option value="maker">メーカー順</option>
          </select>
          <button onClick={()=>setModal({mode:"add"})} style={{padding:"8px 18px",borderRadius:8,border:"none",background:"#3b82f6",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>＋ 案件追加</button>
        </div>
      </div>

      {/* ── KPI: 2 rows ── */}
      {/* Row 1: Counts */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:10}}>
        <Kpi l="全案件" v={stats.total} c="#0f172a" />
        {S_ORDER.map(s=><Kpi key={s} l={s} v={stats.byStatus[s]} c={STATUS_CFG[s].c} />)}
        <Kpi l="対応遅延" v={stats.overdueActions} c="#ef4444" hi={stats.overdueActions>0} />
      </div>
      {/* Row 2: Budget */}
      <div style={{display:"grid",gridTemplateColumns:`180px repeat(${Math.max(stats.monthKeys.length,1)},1fr)`,gap:10,marginBottom:24}}>
        <Kpi l="総予算" v={fYen(stats.totalBudget)} c="#10b981" sm />
        {stats.monthKeys.map(k=>{
          const [y,m]=k.split("-");
          return <Kpi key={k} l={`${Number(m)}月売上`} v={fYen(stats.monthly[k])} c="#6366f1" sm />;
        })}
      </div>

      {/* ── Filters ── */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {["all",...S_ORDER].map(s=>{
          const act=filter===s;
          const label=s==="all"?"すべて":s;
          const cnt=s==="all"?enriched.length:enriched.filter(c=>c.status===s).length;
          return <button key={s} onClick={()=>setFilter(s)} style={{padding:"6px 16px",borderRadius:20,border:act?"2px solid #3b82f6":"1px solid #e2e8f0",background:act?"#eff6ff":"#fff",color:act?"#2563eb":"#64748b",fontWeight:act?600:400,fontSize:13,cursor:"pointer"}}>{label} ({cnt})</button>;
        })}
      </div>

      {/* ── Table ── */}
      <div style={{background:"#fff",borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,0.06)",overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"140px 1fr 110px 80px repeat(6,64px) 40px",padding:"10px 16px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",fontSize:10,fontWeight:600,color:"#64748b",textTransform:"uppercase",letterSpacing:.5,alignItems:"end"}}>
          <span>メーカー</span><span>商品</span><span>ステータス</span><span>予算</span>
          {MS_DEFS.map(m=><span key={m.k} style={{textAlign:"center",lineHeight:1.2}}>{m.label.replace("（情報解禁）","").slice(0,5)}</span>)}
          <span></span>
        </div>

        {filtered.map(c=>{
          const ex=expandedId===c.id;
          const sc=STATUS_CFG[c.status]||STATUS_CFG["未確定"];
          const rbg=sc.row;
          const rbl=sc.bl;

          return (
            <div key={c.id}>
              <div onClick={()=>setExpanded(ex?null:c.id)} style={{display:"grid",gridTemplateColumns:"140px 1fr 110px 80px repeat(6,64px) 40px",padding:"10px 16px",borderBottom:"1px solid #f1f5f9",cursor:"pointer",background:rbg,borderLeft:`4px solid ${rbl}`,alignItems:"center",transition:"background .15s"}}>
                <span style={{fontWeight:600,fontSize:12,color:"#0f172a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.maker}</span>
                <div style={{display:"flex",alignItems:"center",gap:5,overflow:"hidden"}}>
                  <span style={{fontSize:12,color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.product}</span>
                  {c.url&&<a href={c.url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:10,color:"#3b82f6",flexShrink:0}} title={c.url}>🔗</a>}
                </div>
                <span><span style={{display:"inline-block",padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:600,color:sc.c,background:sc.bg}}>{c.status}</span></span>
                <span style={{fontSize:12,color:"#475569",fontWeight:500}}>{fYen(c.budget)}</span>

                {/* Milestone mini-indicators */}
                {MS_DEFS.map(m=>{
                  const hasDate=!!c[m.k];
                  const chk=checks[`${c.id}-${m.k}`];
                  const od=isMsOverdue(c,m,chk);
                  let bg="#f1f5f9",color="#cbd5e1",icon="—";
                  if(hasDate&&chk){ bg="#ecfdf5";color="#10b981";icon="✓"; }
                  else if(hasDate&&od){ bg="#fef2f2";color="#ef4444";icon="!"; }
                  else if(hasDate){ bg="#f0fdf4";color="#16a34a";icon=fDate(c[m.k]); }
                  return <span key={m.k} style={{textAlign:"center",fontSize:10,fontWeight:600,color,background:bg,borderRadius:4,padding:"3px 2px",lineHeight:1}}>{icon}</span>;
                })}

                <span style={{fontSize:14,color:"#94a3b8",textAlign:"center"}}>{ex?"▲":"▼"}</span>
              </div>

              {/* ── Expanded ── */}
              {ex&&(
                <div style={{padding:"16px 20px 20px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                    {/* Left: details */}
                    <div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                        <h4 style={{margin:0,fontSize:13,fontWeight:600,color:"#475569"}}>案件詳細</h4>
                        <button onClick={()=>setModal({mode:"edit",campaign:c})} style={{padding:"4px 12px",borderRadius:6,border:"1px solid #3b82f6",background:"#eff6ff",color:"#3b82f6",fontSize:12,fontWeight:600,cursor:"pointer"}}>編集</button>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:13}}>
                        <DI l="タイプ" v={c.type} /><DI l="予算" v={fYen(c.budget)} />
                        <DI l="再生単価" v={c.unitPrice?`¥${c.unitPrice}`:"—"} /><DI l="平均再生回数" v={fNum(c.avgViews)} />
                        <DI l="必要再生回数" v={fNum(c.requiredViews)} accent /><DI l="目標投稿数" v={fNum(c.targetPosts)} accent />
                        <DI l="投稿者数" v={c.influencers||"—"} />
                      </div>
                      {c.url&&<div style={{marginTop:8,fontSize:12}}><span style={{color:"#94a3b8",fontWeight:500}}>URL：</span><a href={c.url} target="_blank" rel="noreferrer" style={{color:"#3b82f6",wordBreak:"break-all"}}>{c.url}</a></div>}

                      {/* Memo */}
                      <div style={{marginTop:12}}>
                        <button onClick={()=>setMemoOpen(p=>({...p,[c.id]:!p[c.id]}))} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,fontWeight:600,color:"#64748b",display:"flex",alignItems:"center",gap:4,padding:0}}>
                          {memoOpen[c.id]?"▼":"▶"} メモ {c.memo?`(${c.memo.length}文字)`:"(なし)"}
                        </button>
                        {memoOpen[c.id]&&<textarea value={c.memo||""} onChange={e=>setCampaigns(p=>p.map(x=>x.id===c.id?{...x,memo:e.target.value}:x))} placeholder="案件メモを自由に入力..." style={{...iS,marginTop:6,minHeight:80,resize:"vertical",fontFamily:"inherit",fontSize:13,lineHeight:1.6}} />}
                      </div>

                      {/* Status */}
                      <div style={{marginTop:14}}>
                        <span style={{fontSize:12,fontWeight:600,color:"#64748b"}}>ステータス：</span>
                        <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                          {S_ORDER.map(st=>(
                            <button key={st} onClick={()=>updateStatus(c.id,st)} style={{padding:"4px 12px",borderRadius:8,border:c.status===st?`2px solid ${STATUS_CFG[st].c}`:"1px solid #e2e8f0",background:c.status===st?STATUS_CFG[st].bg:"#fff",color:c.status===st?STATUS_CFG[st].c:"#64748b",fontSize:12,fontWeight:c.status===st?600:400,cursor:"pointer"}}>{st}</button>
                          ))}
                        </div>
                      </div>
                      <button onClick={()=>deleteCampaign(c.id)} style={{marginTop:14,padding:"5px 12px",borderRadius:6,border:"1px solid #fecaca",background:"#fff",color:"#ef4444",fontSize:11,cursor:"pointer"}}>削除</button>
                    </div>

                    {/* Right: milestone checklist */}
                    <div>
                      <h4 style={{margin:"0 0 12px",fontSize:13,fontWeight:600,color:"#475569"}}>マイルストーン進捗</h4>
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        {MS_DEFS.map(m=>{
                          const hasDate=!!c[m.k];
                          const chk=checks[`${c.id}-${m.k}`];
                          const od=isMsOverdue(c,m,chk);
                          const deadline=m.deadlineOffset(c[m.k]);
                          const deadlineDiff=dDiff(deadline);

                          let bg="#f9fafb",bd="#e5e7eb";
                          if(chk){bg="#ecfdf5";bd="#86efac";}
                          else if(od){bg="#fef2f2";bd="#fca5a5";}
                          else if(hasDate&&deadlineDiff!==null&&deadlineDiff<=3){bg="#fffbeb";bd="#fcd34d";}

                          return (
                            <div key={m.k} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,background:bg,border:`1px solid ${bd}`,opacity:hasDate?1:.5}}>
                              {/* Checkbox */}
                              <div onClick={e=>{e.stopPropagation();if(hasDate)toggleCheck(c.id,m.k);}} style={{width:22,height:22,borderRadius:4,flexShrink:0,border:`2px solid ${chk?"#10b981":od?"#ef4444":"#d1d5db"}`,background:chk?"#10b981":"#fff",display:"flex",alignItems:"center",justifyContent:"center",cursor:hasDate?"pointer":"default"}}>
                                {chk&&<span style={{color:"#fff",fontSize:14,fontWeight:700}}>✓</span>}
                              </div>
                              {/* Info */}
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                  <span style={{fontSize:13,fontWeight:600,color:chk?"#9ca3af":"#1e293b",textDecoration:chk?"line-through":"none"}}>{m.label}</span>
                                  {hasDate&&<span style={{fontSize:11,color:"#94a3b8"}}>{fDate(c[m.k])}</span>}
                                </div>
                                <div style={{fontSize:11,marginTop:2,color:chk?"#10b981":od?"#ef4444":"#64748b"}}>
                                  {chk ? `✓ ${m.action} 完了`
                                    : !hasDate ? "日付未設定"
                                    : od ? `⚠ ${m.action}が${Math.abs(dDiff(deadline))}日遅延中`
                                    : deadlineDiff!==null&&deadlineDiff<=3 ? `${m.action} 期限まであと${deadlineDiff}日`
                                    : `${m.action} 期限: ${fDate(deadline)}`}
                                </div>
                              </div>
                              {/* Alert icon */}
                              {od&&!chk&&<span style={{fontSize:20,flexShrink:0}}>🔴</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length===0&&<div style={{padding:40,textAlign:"center",color:"#94a3b8",fontSize:14}}>該当する案件がありません</div>}
      </div>

      {/* ── Legend ── */}
      <div style={{marginTop:16,display:"flex",gap:14,flexWrap:"wrap",fontSize:11,color:"#64748b",alignItems:"center"}}>
        <span style={{fontWeight:600}}>行カラー：</span>
        {[{l:"未確定",c:"#cbd5e1"},{l:"シート回収済み",c:"#fbbf24"},{l:"進行中",c:"#60a5fa"},{l:"投稿中",c:"#a78bfa"},{l:"完了",c:"#34d399"},{l:"対応遅延あり",c:"#ef4444"}].map(i=>(
          <span key={i.l} style={{display:"inline-flex",alignItems:"center",gap:3}}><span style={{width:12,height:7,borderRadius:2,background:i.c,display:"inline-block"}} />{i.l}</span>
        ))}
        <span style={{marginLeft:8,fontWeight:600}}>セル：</span>
        <span style={{display:"inline-flex",alignItems:"center",gap:3}}><span style={{width:7,height:7,borderRadius:2,background:"#ecfdf5",border:"1px solid #86efac",display:"inline-block"}} />完了</span>
        <span style={{display:"inline-flex",alignItems:"center",gap:3}}><span style={{width:7,height:7,borderRadius:2,background:"#fef2f2",border:"1px solid #fca5a5",display:"inline-block"}} />遅延</span>
        <span style={{display:"inline-flex",alignItems:"center",gap:3}}><span style={{width:7,height:7,borderRadius:2,background:"#f0fdf4",border:"1px solid #86efac",display:"inline-block"}} />日付あり</span>
      </div>

      {/* Modal */}
      {modal?.mode==="add"&&<CampaignForm title="新規案件を追加" onSave={addCampaign} onClose={()=>setModal(null)} />}
      {modal?.mode==="edit"&&<CampaignForm title="案件を編集" initial={modal.campaign} onSave={d=>editCampaign({...modal.campaign,...d})} onClose={()=>setModal(null)} />}
    </div>
  );
}

// ── Small components ──
function Kpi({l,v,c,hi,sm}) {
  return <div style={{background:hi?`${c}10`:"#fff",borderRadius:10,padding:"12px 14px",border:hi?`2px solid ${c}`:"1px solid #e2e8f0",boxShadow:hi?`0 0 12px ${c}20`:"0 1px 2px rgba(0,0,0,.04)"}}>
    <div style={{fontSize:10,color:"#64748b",fontWeight:500,marginBottom:3}}>{l}</div>
    <div style={{fontSize:sm?16:24,fontWeight:700,color:hi?c:"#0f172a"}}>{v}</div>
  </div>;
}
function DI({l,v,accent}) {
  return <div style={{padding:"3px 0"}}>
    <span style={{fontSize:11,color:"#94a3b8",fontWeight:500}}>{l}：</span>
    <span style={{fontSize:13,color:accent?"#2563eb":"#1e293b",fontWeight:accent?700:500}}>{v||"—"}</span>
  </div>;
}
