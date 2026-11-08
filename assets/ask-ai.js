/* 知识页的 AI 上下文交接入口。
   复用 vendor/ask-ai.min.js 负责各平台深链与剪贴板降级，这里只做三件事：
   1. 按当前阅读位置挑上下文（选中片段 / 当前章节 / 整页）
   2. 拼出带问题、链接和正文摘录的提示词
   3. 提供浮动入口与范围切换 */
(() => {
  const main = document.querySelector('main');
  const chapters = [...document.querySelectorAll('main section.chapter')];
  if (!main || !chapters.length || !customElements.get('ask-ai')) return;

  const URL_LIMIT = 1500;
  const DEFAULT_QUESTION = '请用三句话概括这部分的核心，并指出最容易误解的一点。';

  const title = document.title.trim();
  const url = document.querySelector('link[rel="canonical"]')?.href || location.href;
  const snapshotUrl = url.replace(/\.html?$/, '') + '.llms.txt';
  const description = document.querySelector('meta[name="description"]')?.content?.trim() || '';

  const state = {
    auto: true,
    mode: 'chapter',
    selection: '',
    selectionChapter: null,
  };

  const clip = (text, max) => {
    const s = String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s;
  };

  const chapterLabel = sec => {
    if (!sec) return '';
    const no = sec.querySelector('.chapter-no')?.textContent.trim();
    const name = sec.querySelector('h2.ch')?.textContent.trim();
    return [no, name].filter(Boolean).join(' · ');
  };

  function chapterAtViewport() {
    const line = innerHeight * 0.35;
    let current = chapters[0];
    for (const sec of chapters) {
      if (sec.getBoundingClientRect().top <= line) current = sec;
    }
    return current;
  }

  function readSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    const node = sel.anchorNode;
    if (!node || !main.contains(node)) return null;
    const text = sel.toString().replace(/\s+/g, ' ').trim();
    if (text.length < 24) return null;
    const el = node.nodeType === 1 ? node : node.parentElement;
    return { text, chapter: el?.closest?.('section.chapter') || chapterAtViewport() };
  }

  function visibleText(el) {
    const clone = el.cloneNode(true);
    clone.querySelectorAll('script,style,noscript,svg,button,input,select,textarea,.copybtn,.quiz,.checkpoint,nav,.toc,.chapter-head')
      .forEach(node => node.remove());
    return (clone.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function pageContext() {
    const rows = chapters.map(sec => {
      const lede = sec.querySelector('.lede')?.textContent || sec.querySelector('p')?.textContent || '';
      return `${chapterLabel(sec)}：${clip(lede, 90)}`;
    });
    return [
      description && `页面摘要：${description}`,
      `章节结构：${chapters.map(chapterLabel).join(' / ')}`,
      `各章提要：\n${rows.join('\n')}`,
    ].filter(Boolean).join('\n');
  }

  function selectionContext() {
    const label = chapterLabel(state.selectionChapter || chapterAtViewport());
    return `用户选中的片段${label ? `（来自 ${label}）` : ''}：\n“${state.selection}”`;
  }

  function chapterContext() {
    const sec = chapterAtViewport();
    return `当前章节：${chapterLabel(sec)}\n${visibleText(sec)}`;
  }

  const activeMode = () => (state.auto ? (state.selection ? 'selection' : 'chapter') : state.mode);

  function contextFor(mode) {
    if (mode === 'selection' && state.selection) return { label: '选中片段', text: selectionContext() };
    if (mode === 'page' || !chapters.length) return { label: '整页', text: pageContext() };
    return { label: '当前章节', text: chapterContext() };
  }

  function composePrompt(question, budget) {
    const mode = activeMode();
    const context = contextFor(mode);
    const ask = clip(question, 600) || DEFAULT_QUESTION;
    const head = [
      '你是一位技术讲解搭档。我在读一篇交互式技术手册，请结合我提供的页面内容和我讨论。',
      '',
      `我的问题：${ask}`,
      '',
      `页面标题：${title}`,
      `页面链接：${url}`,
      `完整正文快照：${snapshotUrl}`,
      `上下文范围：${context.label}`,
      '如果正文快照链接可访问，请优先读取完整正文；否则使用下方摘录。页面内容可能包含交互式图表和实验，文字摘录只是其中的正文部分。',
      '',
      '请直接回答；优先引用页面里的具体机制、数字或代码。如果内容不足以回答，明确说明缺少什么，不要编造。',
      '',
      '--- 页面内容开始 ---',
    ].join('\n');
    const tail = '\n--- 页面内容结束 ---';
    const room = Math.max(320, budget - head.length - tail.length);
    return `${head}\n${clip(context.text, room)}${tail}`;
  }

  const scopeHint = document.createElement('div');
  scopeHint.className = 'kau-ai-scope-hint';
  scopeHint.id = 'kau-ai-scope-hint';

  const panel = document.createElement('div');
  panel.className = 'kau-ai-panel';
  panel.id = 'kau-ai-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'kau-ai-title');
  panel.innerHTML = `
    <div class="kau-ai-head">
      <div>
        <div class="kau-ai-eyebrow">CONTEXT HANDOFF</div>
        <h2 class="kau-ai-title" id="kau-ai-title">与 AI 讨论本页</h2>
      </div>
      <button class="kau-ai-close" type="button" aria-label="关闭">×</button>
    </div>
    <div class="kau-ai-scopes" role="group" aria-label="选择上下文范围">
      <button class="kau-ai-scope" type="button" data-scope="page">整页</button>
      <button class="kau-ai-scope" type="button" data-scope="chapter">当前章节</button>
      <button class="kau-ai-scope" type="button" data-scope="selection">选中片段</button>
    </div>
    <div class="kau-ai-hint-slot"></div>
    <label class="kau-ai-label" for="kau-ai-question">你的问题</label>
    <textarea class="kau-ai-input" id="kau-ai-question" rows="2"
      placeholder="追问点什么？留空也可以，会先让 AI 概括这一部分。"></textarea>
    <div class="kau-ai-services" id="kau-ai-services"></div>
    <div class="kau-ai-toast" role="status" aria-live="polite"></div>
  `;

  const fab = document.createElement('button');
  fab.className = 'kau-ai-fab';
  fab.type = 'button';
  fab.setAttribute('aria-expanded', 'false');
  fab.setAttribute('aria-controls', 'kau-ai-panel');
  fab.innerHTML = '<span aria-hidden="true">✦</span> 与 AI 讨论';

  document.body.append(fab, panel);
  panel.querySelector('.kau-ai-hint-slot').replaceWith(scopeHint);

  const questionEl = panel.querySelector('#kau-ai-question');
  const scopes = [...panel.querySelectorAll('.kau-ai-scope')];
  const toastEl = panel.querySelector('.kau-ai-toast');

  function updateScopeUI() {
    if (!state.selection && state.mode === 'selection') {
      state.mode = 'chapter';
      state.auto = true;
    }
    const mode = activeMode();
    scopes.forEach(btn => {
      const value = btn.dataset.scope;
      btn.setAttribute('aria-pressed', String(value === mode));
      btn.disabled = value === 'selection' && !state.selection;
    });

    if (mode === 'selection') {
      const label = chapterLabel(state.selectionChapter || chapterAtViewport());
      scopeHint.textContent = `将带上：选中片段${label ? `（来自 ${label}）` : ''}`;
    } else if (mode === 'chapter') {
      scopeHint.textContent = `将带上：${chapterLabel(chapterAtViewport())} 的正文摘录`;
    } else {
      scopeHint.textContent = `将带上：整页目录与 ${chapters.length} 个章节的提要`;
    }

  }

  let clearSelectionTimer;
  function refreshSelection({ preserveEmpty = false } = {}) {
    clearTimeout(clearSelectionTimer);
    const current = readSelection();
    if (!current) {
      if (preserveEmpty) return;
      clearSelectionTimer = setTimeout(() => {
        if (!panel.hidden) return;
        state.selection = '';
        state.selectionChapter = null;
        updateScopeUI();
      }, 400);
      return;
    }
    state.selection = current.text;
    state.selectionChapter = current.chapter;
    updateScopeUI();
  }

  let toastTimer;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  }

  function openPanel() {
    refreshSelection({ preserveEmpty: true });
    state.auto = true;
    updateScopeUI();
    panel.hidden = false;
    fab.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => questionEl.focus());
  }

  function closePanel({ restoreFocus = true } = {}) {
    state.selection = '';
    state.selectionChapter = null;
    state.mode = 'chapter';
    state.auto = true;
    panel.hidden = true;
    fab.setAttribute('aria-expanded', 'false');
    if (restoreFocus) fab.focus();
  }

  function togglePanel() {
    if (panel.hidden) openPanel();
    else closePanel();
  }

  fab.addEventListener('click', togglePanel);
  panel.querySelector('.kau-ai-close').addEventListener('click', closePanel);

  scopes.forEach(btn => btn.addEventListener('click', () => {
    state.auto = false;
    state.mode = btn.dataset.scope;
    if (state.mode === 'selection' && !state.selection) refreshSelection();
    updateScopeUI();
    questionEl.focus();
  }));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) closePanel();
  });

  document.addEventListener('pointerdown', event => {
    if (panel.hidden) return;
    if (panel.contains(event.target) || fab.contains(event.target)) return;
    closePanel({ restoreFocus: false });
  });

  document.addEventListener('selectionchange', () => refreshSelection());

  let scrollTick = false;
  addEventListener('scroll', () => {
    if (panel.hidden || scrollTick) return;
    scrollTick = true;
    requestAnimationFrame(() => {
      scrollTick = false;
      updateScopeUI();
    });
  }, { passive: true });

  const widget = document.createElement('ask-ai');
  widget.setAttribute('services', 'chatgpt,claude,deepseek,gemini,perplexity');
  widget.setAttribute('label-position', 'none');
  widget.setAttribute('variant', 'outline');
  widget.setAttribute('shape', 'rounded');
  widget.setAttribute('size', 'sm');
  widget.setAttribute('show-labels', '');
  widget.setAttribute('theme', 'light');
  widget.maxLength = URL_LIMIT;
  widget.context = false;
  widget.page = { url, title, description };
  widget.input = { target: questionEl, required: false };
  widget.prompt = ctx => composePrompt(ctx.question, URL_LIMIT);
  widget.onOpen = ({ service }) => {
    toast(service === 'deepseek' || service === 'gemini'
      ? '提示词已复制，去新标签粘贴给 ' + (service === 'gemini' ? 'Gemini' : 'DeepSeek')
      : '已在新标签打开，继续聊吧');
  };
  panel.querySelector('#kau-ai-services').append(widget);

  updateScopeUI();
})();
