// 首页目录的渲染函数。浏览器和 scripts/seo.mjs（预渲染）共用这一份，保证静态 HTML 与 JS 渲染结果一致。
window.KAU_CATALOG = (() => {
  const NEW_DAYS = 14;
  const esc = s => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const isNew = (t, now) => (now - new Date(t.date)) / 864e5 <= NEW_DAYS;

  // 编号按发布顺序自动生成，不再手写；返回按日期升序的列表
  function prepare({ categories, topics }) {
    const catLabel = Object.fromEntries(categories.map(c => [c.id, c.label]));
    const byDate = [...topics].sort((a, b) => a.date.localeCompare(b.date));
    byDate.forEach((t, i) => { t.no = String(i + 1).padStart(2, '0'); });
    topics.forEach(t => { t.haystack = [t.title, t.desc, t.tags.join(' '), t.keywords, catLabel[t.category], t.slug].join(' ').toLowerCase(); });
    return byDate;
  }

  function card(t, now) {
    const pages = t.pages.length > 1 ? `<span class="pages">${t.pages.length} 页</span>` : '';
    return `<a class="card" href="./${t.slug}/${t.pages[0]}.html">
      <div class="meta"><span class="no">${t.no}</span><span>${t.date}</span>${isNew(t, now) ? '<span class="new">NEW</span>' : ''}${pages}</div>
      <h3>${esc(t.title)}</h3><p>${esc(t.desc)}</p>
      <div class="tags">${t.tags.map(g => `<span class="tag">${esc(g)}</span>`).join('')}</div>
    </a>`;
  }

  // filter 为空时渲染全部主题
  function groupsHTML({ categories, topics }, filter = () => true, now = Date.now()) {
    return categories
      .map(c => ({ ...c, items: topics.filter(t => t.category === c.id && filter(t)).sort((a, b) => b.date.localeCompare(a.date)) }))
      .filter(g => g.items.length)
      .map(g => `<section class="group"><header class="group-head"><h2>${esc(g.label)}</h2><span class="n">${g.items.length}</span></header><div class="grid">${g.items.map(t => card(t, now)).join('')}</div></section>`)
      .join('');
  }

  return { esc, prepare, groupsHTML };
})();
