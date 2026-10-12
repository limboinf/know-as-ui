/* 玩具检索引擎：客服知识库（贯穿案例）
   - BM25：真实公式，分词 = ASCII 单词 + 中文二元组（bigram）
   - 「向量」：词向量求和。每个词在 2D 单位圆上有个角度，文档/查询向量 = 命中词向量之和。
     真实嵌入是 768~4096 维、由神经网络学出来的；这里只保留两个本质：语义相近 → 方向相近；词表外的词 → 看不见。 */
window.KB = window.KB || {};
(function () {
  const docs = [
    { id: 'D1',  text: '无线网络连接失败：请检查路由器电源与信号强度，重启路由器后重新连接 wifi。' },
    { id: 'D2',  text: '错误码 E1042：API 网关鉴权超时，请检查 token 是否过期并重新签发。' },
    { id: 'D3',  text: '忘记密码：在登录页点击“忘记密码”，通过邮箱验证码重置密码。' },
    { id: 'D4',  text: '账号被锁定：连续输错 5 次密码，账号将被锁定 30 分钟，联系管理员可提前解锁。' },
    { id: 'D5',  text: '订阅续费失败：检查支付方式是否有效，银行卡过期会导致扣费失败，请更新付款信息。' },
    { id: 'D6',  text: '申请退款与发票：订单完成 7 天内可申请退款，发票在账单页下载。' },
    { id: 'D7',  text: '部署回滚：发布后发现问题，可在控制台一键回滚到上一版本。' },
    { id: 'D8',  text: '服务器宕机排查：先看日志，确认容器是否崩溃，再决定重启或扩容。' },
    { id: 'D9',  text: '错误码 E2001：磁盘空间不足导致容器写入失败，请清理日志后重试。' },
    { id: 'D10', text: '无线 AP 固件升级：升级前请备份配置，升级期间网络会短暂中断。' },
  ];

  /* ---------- BM25 ---------- */
  const tokenize = s => {
    s = s.toLowerCase();
    const out = (s.match(/[a-z0-9]+/g) || []).slice();
    (s.match(/[一-鿿]+/g) || []).forEach(run => { for (let i = 0; i < run.length - 1; i++) out.push(run.slice(i, i + 2)); });
    return out;
  };
  const K1 = 1.2, B = 0.75;
  const dTokens = docs.map(d => tokenize(d.text));
  const avgdl = dTokens.reduce((n, t) => n + t.length, 0) / docs.length;
  const df = {}; dTokens.forEach(t => new Set(t).forEach(w => { df[w] = (df[w] || 0) + 1; }));
  const idf = w => Math.log(1 + (docs.length - (df[w] || 0) + .5) / ((df[w] || 0) + .5));
  function bm25(query) {
    const qt = [...new Set(tokenize(query))];
    const rows = docs.map((d, i) => {
      const tf = {}; dTokens[i].forEach(w => { tf[w] = (tf[w] || 0) + 1; });
      let s = 0; const hit = [];
      qt.forEach(w => { const f = tf[w] || 0; if (!f) return; s += idf(w) * f * (K1 + 1) / (f + K1 * (1 - B + B * dTokens[i].length / avgdl)); hit.push(w); });
      return { id: d.id, text: d.text, score: s, hit };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);
    return { rows, queryTokens: qt };
  }

  /* ---------- 词向量求和 ---------- */
  const TOPICS = { net: 10, auth: 80, bill: 150, ops: 220 };
  const WORDS = {
    net:  'wifi 无线 网络 断网 上网 上不了网 路由 信号 掉线 连接 联网 网速 热点',
    auth: '登录 登不进去 登陆 密码 验证码 账号 账户 锁定 鉴权 token 令牌 认证 解锁',
    bill: '账单 付款 支付 发票 退款 退回 多扣 扣费 订阅 续费 银行卡 价格 费用 订单',
    ops:  '部署 服务器 上线 发布 容器 回滚 宕机 日志 崩溃 磁盘 扩容 控制台',
  };
  const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const LEX = [];   // {w, topic, deg}
  Object.keys(WORDS).forEach(tp => WORDS[tp].split(' ').forEach(w => LEX.push({ w, topic: tp, deg: TOPICS[tp] + (hash(w) % 25) - 12 })));
  LEX.sort((a, b) => b.w.length - a.w.length);   // 长词优先，避免「上网」吃掉「上不了网」
  function embed(text) {
    let s = text.toLowerCase(); const found = []; let x = 0, y = 0;
    LEX.forEach(e => { let at; while ((at = s.indexOf(e.w)) >= 0) { found.push(e); x += Math.cos(e.deg * Math.PI / 180); y += Math.sin(e.deg * Math.PI / 180); s = s.slice(0, at) + '\u0000'.repeat(e.w.length) + s.slice(at + e.w.length); } });
    const n = Math.hypot(x, y);
    return { x, y, n, found, ux: n ? x / n : 0, uy: n ? y / n : 0, deg: n ? (Math.atan2(y, x) * 180 / Math.PI) : null };
  }
  const dVec = docs.map(d => embed(d.text));
  const COS_MIN = 0.6;   // 低于它视为「不相关」，对应真实系统里的相似度阈值
  function vec(query, limit = 5) {
    const q = embed(query);
    if (!q.n) return { rows: [], q };
    const rows = docs.map((d, i) => ({ id: d.id, text: d.text, score: q.ux * dVec[i].ux + q.uy * dVec[i].uy, deg: dVec[i].deg }))
      .filter(r => r.score > COS_MIN).sort((a, b) => b.score - a.score).slice(0, limit);
    return { rows, q };
  }

  /* ---------- RRF ---------- */
  function rrf(lists, k = 60, weights) {
    const sc = {}, meta = {};
    lists.forEach((rows, li) => rows.forEach((r, i) => { const c = (weights ? weights[li] : 1) / (k + i + 1); sc[r.id] = (sc[r.id] || 0) + c; (meta[r.id] = meta[r.id] || { id: r.id, text: r.text, parts: [] }).parts[li] = { rank: i + 1, c }; }));
    return Object.keys(sc).map(id => ({ ...meta[id], score: sc[id] })).sort((a, b) => b.score - a.score);
  }

  /* ---------- 预设查询 ---------- */
  const PRESETS = [
    { q: '上不了网怎么办', note: '同义改写：文档里写的是「无线网络连接失败」，字面一个词都对不上' },
    { q: 'E1042', note: '精确标识符：只有字面匹配能认出它' },
    { q: '密码忘了登不进去', note: '两路都能找到，但理由不同' },
    { q: '钱被多扣了想退回来', note: '口语 vs 书面：「多扣、退回」对「扣费、退款」' },
    { q: 'E2001 磁盘满了', note: '一半精确（E2001）一半语义（磁盘满了）——混合检索的主场' },
  ];

  /* ---------- 小工具 ---------- */
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtBytes = b => b >= 1e12 ? (b / 1e12).toFixed(2) + ' TB' : b >= 1e9 ? (b / 1e9).toFixed(1) + ' GB' : b >= 1e6 ? (b / 1e6).toFixed(1) + ' MB' : b >= 1e3 ? (b / 1e3).toFixed(1) + ' KB' : Math.round(b) + ' B';
  const fmtN = n => n >= 1e9 ? (n / 1e9).toFixed(n % 1e9 ? 1 : 0) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n % 1e3 ? 1 : 0) + 'K' : String(n);

  /* 三栏渲染（BM25 / 向量 / 混合），A、B 页共用 */
  function hitHTML(r, i, extra) { return `<div class="hit ${i === 0 ? 'top' : ''}"><span class="rk">${i + 1}</span><span class="t"><span class="id">${r.id}</span>${esc(r.text.length > 34 ? r.text.slice(0, 34) + '…' : r.text)}</span><span class="sc">${extra}</span></div>`; }
  function renderTrio(mount, query, opt = {}) {
    const lx = bm25(query), vc = vec(query), k = opt.k || 60;
    const hy = rrf([lx.rows.slice(0, 5), vc.rows], k, opt.weights);
    const lexH = lx.rows.length ? lx.rows.slice(0, 5).map((r, i) => hitHTML(r, i, r.score.toFixed(2))).join('') : '<div class="none">0 条命中：查询里的词在任何文档里都没出现过。</div>';
    const vecH = vc.rows.length ? vc.rows.map((r, i) => hitHTML(r, i, 'cos ' + r.score.toFixed(2))).join('') : `<div class="none">${vc.q.n ? '没有文档与它方向接近（cos ≤ 0.6）。' : '0 个词落在词表里 → 向量是零向量，什么也比不了。'}</div>`;
    const hyH = hy.length ? hy.slice(0, 5).map((r, i) => hitHTML(r, i, r.score.toFixed(4))).join('') : '<div class="none">两路都空。</div>';
    mount.innerHTML = `<div class="trio"><div class="trio-col lex"><h4><span>BM25 · 关键词</span><span>${lx.rows.length} 命中</span></h4>${lexH}</div><div class="trio-col vec"><h4><span>向量 · 语义</span><span>${vc.rows.length} 命中</span></h4>${vecH}</div><div class="trio-col hyb"><h4><span>混合 · RRF k=${k}</span><span>融合</span></h4>${hyH}</div></div>`;
    return { lx, vc, hy };
  }

  Object.assign(KB, { docs, tokenize, bm25, embed, vec, rrf, COS_MIN, PRESETS, rng, esc, fmtBytes, fmtN, renderTrio, TOPICS, dVec });
})();
