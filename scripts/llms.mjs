// 从真实渲染后的 DOM 生成每页 llms.txt（正文快照）：
// - 用无头 Chrome 跑一遍页面，避免漏掉 JS 渲染的 FAQ / 实验说明
// - 保留章标题、正文、列表、代码块、表格、问答与外部引用
// - 不抓导航、测验答案、按钮和交互状态
// 用法：make llms（首次需 npm install；默认找 Google Chrome，可用 CHROME_PATH 覆盖）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://dev.limbo101.win';
const PORT = 8766;

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(join(ROOT, 'topics.js'), 'utf8'), sandbox);
const { KAU } = sandbox.window;

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ];
  for (const path of candidates) if (existsSync(path)) return path;
  const which = spawnSync('which', ['google-chrome'], { encoding: 'utf8' }).stdout.trim();
  if (which) return which;
  throw new Error('找不到 Chrome / Chromium，请设置 CHROME_PATH 后再运行 make llms');
}

// 交给页面执行：把每个章节压成干净的 Markdown
function chapterMarkdown(sec) {
  const clean = text => String(text || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  const lines = text => String(text || '').replace(/\u00a0/g, ' ').split('\n').map(s => s.trimEnd()).join('\n').trim();

  function inline(node) {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return '';
    const tag = node.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'svg', 'canvas', 'button', 'input', 'select', 'textarea', 'nav'].includes(tag)) return '';
    if (node.classList.contains('copybtn') || node.classList.contains('chapter-no')) return '';
    // 行内代码先整体取纯文本，避免 <code><span> 被拆成多段
    if (tag === 'code' && !node.closest('pre')) return `\`${clean(node.textContent)}\``;
    const text = [...node.childNodes].map(inline).join('');
    if (tag === 'strong' || tag === 'b') return `**${text.trim()}**`;
    if (tag === 'em' || tag === 'i') return `*${text.trim()}*`;
    if (tag === 'br') return '\n';
    if (tag === 'a') {
      const href = node.getAttribute('href') || '';
      if (/^(https?:)?\/\//.test(href) && text.trim()) return `[${text.trim()}](${href})`;
      return text;
    }
    if (tag === 'img') return node.alt ? `[图：${node.alt}]` : '';
    return text;
  }

  const blockText = el => clean([...el.childNodes].map(inline).join('').replace(/\s*\n\s*/g, ' '));

  function listBlock(list, depth = 0) {
    const ordered = list.tagName.toLowerCase() === 'ol';
    return [...list.children]
      .filter(li => li.tagName.toLowerCase() === 'li')
      .map((li, i) => {
        const indent = '  '.repeat(depth);
        const marker = ordered ? `${i + 1}.` : '-';
        const text = [...li.childNodes].filter(n => !(n.nodeType === 1 && /^(ul|ol)$/i.test(n.tagName))).map(inline).join('');
        const nested = [...li.children].filter(n => /^(ul|ol)$/i.test(n.tagName)).map(n => listBlock(n, depth + 1)).filter(Boolean);
        return [`${indent}${marker} ${clean(text)}`, ...nested].filter(Boolean).join('\n');
      }).join('\n');
  }

  function tableBlock(table) {
    const rows = [...table.querySelectorAll('tr')].map(tr =>
      [...tr.children].filter(td => /^(td|th)$/i.test(td.tagName)).map(td => blockText(td).replace(/\|/g, '\\|'))
    ).filter(r => r.length);
    if (!rows.length) return '';
    const head = rows[0];
    const sep = head.map(() => '---');
    return [head, sep, ...rows.slice(1)].map(r => `| ${r.join(' | ')} |`).join('\n');
  }

  const out = [];
  const walk = el => {
    for (const node of el.children) {
      const tag = node.tagName.toLowerCase();
      if (['script', 'style', 'noscript', 'button', 'nav', 'header'].includes(tag)) continue;
      if (node.matches('.toc, .checkpoint, .ckpt-item, .quiz-engine, #quizMount, .quiz-head, .quiz-mount, .quiz-box, .sn-nav, .copybtn, .stepper, .step-controls, .step-ctrl, .step-actions, .step-progress, .step-status, .sim-controls, .sim-actions, .sim-toolbar, .controls, .toolbar, .sim-log, .event-log, .kau-ai-panel, .kau-ai-fab')) continue;
      if (tag === 'section' && /终极测验|final exam/i.test(node.textContent || '')) break;

      if (node.classList.contains('chapter-no')) continue;
      if (/^h[1-4]$/.test(tag)) {
        const level = tag === 'h2' ? 2 : 3;
        out.push(`${'#'.repeat(level)} ${blockText(node)}`);
        continue;
      }
      if (tag === 'p') { const t = blockText(node); if (t) out.push(t); continue; }
      if (tag === 'img') { if (node.alt) out.push(`[图：${node.alt}]`); continue; }
      if (tag === 'pre') {
        const text = lines(node.innerText);
        if (text) out.push('```\n' + text + '\n```');
        continue;
      }
      if (tag === 'ul' || tag === 'ol') { out.push(listBlock(node)); continue; }
      if (tag === 'table') { out.push(tableBlock(node)); continue; }
      if (tag === 'details') {
        const summary = node.querySelector('summary');
        const q = summary ? blockText(summary) : '';
        const parts = [];
        for (const child of node.children) {
          if (child.tagName.toLowerCase() === 'summary') continue;
          const collect = el => {
            if (!el.querySelector('p, div, ul, ol, pre, table, h3, h4')) {
              const text = blockText(el);
              if (text) parts.push(text);
              return;
            }
            for (const sub of el.children) {
              const t = sub.tagName.toLowerCase();
              if (t === 'p') parts.push(blockText(sub));
              else if (t === 'ul' || t === 'ol') parts.push(listBlock(sub));
              else if (t === 'pre') parts.push('```\n' + lines(sub.innerText) + '\n```');
              else collect(sub);
            }
          };
          collect(child);
        }
        if (q) out.push(`**${q}**\n${parts.filter(Boolean).join('\n')}`);
        continue;
      }
      if (node.classList.contains('note') || node.classList.contains('callout')) {
        const text = blockText(node);
        if (text) out.push(text);
        continue;
      }
      if (tag === 'figure') {
        const caption = node.querySelector('figcaption');
        const images = [...node.querySelectorAll('img')].map(img => img.alt).filter(Boolean);
        const text = [images.length ? `图示：${images.join('；')}` : '', caption ? blockText(caption) : ''].filter(Boolean).join('\n');
        if (text) out.push(text);
        continue;
      }
      if (node.children.length) walk(node);
      else { const t = blockText(node); if (t) out.push(t); }
    }
  };
  walk(sec);
  return out.filter(Boolean).join('\n\n');
}

const server = spawnSync('which', ['python3'], { encoding: 'utf8' });
if (!server.stdout.trim()) throw new Error('需要 python3 起本地预览服务器');

const { spawn } = await import('node:child_process');
const http = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
let browser;
try {
  await new Promise(resolve => setTimeout(resolve, 700));
  browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);
  const pageEntries = [];

  for (const topic of KAU.topics) {
    for (const p of topic.pages) {
      const rel = `${topic.slug}/${p}.html`;
      const url = `http://127.0.0.1:${PORT}/${rel}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await new Promise(resolve => setTimeout(resolve, 300));
      const data = await page.evaluate(chapterMarkdownForPage => {
        const build = eval('(' + chapterMarkdownForPage + ')');
        const chapters = [...document.querySelectorAll('main section.chapter')];
        const links = new Set();
        document.querySelectorAll('main a[href]').forEach(a => {
          const href = a.getAttribute('href') || '';
          if (/^https?:\/\//.test(href)) links.add(href);
        });
        return {
          title: document.title.trim(),
          description: document.querySelector('meta[name="description"]')?.content?.trim() || '',
          canonical: document.querySelector('link[rel="canonical"]')?.href || location.href,
          chapters: chapters
            .filter(sec => !/终极测验|final exam/i.test(sec.querySelector('h2.ch')?.textContent || ''))
            .map(build),
          links: [...links].sort(),
        };
      }, chapterMarkdown.toString());

      const text = [
        `# ${data.title}`,
        '',
        `> ${data.description}`,
        '',
        `来源：${data.canonical}`,
        `站点：know-as-ui（交互式技术手册，本文件是自动生成的正文快照）`,
        `生成：scripts/llms.mjs`,
        '',
        data.chapters.join('\n\n\n'),
        '',
        ...(data.links.length ? ['## 外部引用', '', ...data.links.map(link => `- ${link}`), ''] : []),
      ].join('\n');
      writeFileSync(join(ROOT, `${topic.slug}/${p}.llms.txt`), text);
      pageEntries.push({ slug: topic.slug, page: p, title: data.title, description: data.description });
      console.log(`generated ${topic.slug}/${p}.llms.txt (${text.length} chars)`);
    }
  }

  const index = [
    '# know-as-ui',
    '',
    '> 把 AI Agent、LLM Infra 等硬核知识做成可打开、点击、探索的交互式 HTML 手册。',
    '',
    '每个页面的完整正文快照放在同名 `.llms.txt`，可直接读取；HTML 页面本身包含交互式图解、模拟器和测验。',
    '',
    '## 主题',
    '',
    ...pageEntries.map(entry => {
      const pageUrl = `${SITE}/${entry.slug}/${entry.page}`;
      return `- [${entry.title}](${pageUrl}) — ${entry.description}\n  - 正文快照：${pageUrl}.llms.txt`;
    }),
    '',
  ].join('\n');
  writeFileSync(join(ROOT, 'llms.txt'), index);
  console.log('generated llms.txt');
} finally {
  if (browser) await browser.close();
  http.kill();
}
