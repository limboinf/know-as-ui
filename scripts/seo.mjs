// 从 topics.js 生成 SEO 产物，结果直接写回仓库并提交（部署端仍然零构建）：
//   1. 每个页面 <head> 里 seo 标记之间的 description / canonical / Open Graph / JSON-LD
//   2. 首页 #catalog 的静态预渲染卡片（让不跑 JS 的爬虫也能看到全部内链）
//   3. sitemap.xml 与 robots.txt
// 注意：编辑任何主题正文后，还必须运行 make seo（或 make llms）更新 <slug>/<page>.llms.txt。
// 分享图按约定放在 <slug>/assets/og.jpg（首页是 assets/og.jpg，1200×630），存在就自动挂上大图卡片。
// 用法：node scripts/seo.mjs（或 make seo）。新增主题、改 topics.js 后重跑一次。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const SITE = 'https://dev.limbo101.win';
const SITE_NAME = 'know-as-ui';
const AUTHOR = { name: 'limbo', url: 'https://x.com/limbopeng', twitter: '@limbopeng' };
const HOME_DESC = '把 AI Agent、LLM Infra 等硬核知识做成可打开、可点击、可探索的交互式 HTML 手册：可视化图解、模拟器与测验，一页讲透一个知识点。';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HEAD_RE = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/;
const CATALOG_RE = /<!-- seo:catalog:start -->[\s\S]*?<!-- seo:catalog:end -->/;
const FAVICON_RE = /^.*<link rel="icon"[^>]*>.*$/m;

// 在同一个沙箱里执行 topics.js 与 catalog.js，拿到和浏览器一模一样的数据与渲染函数
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of ['topics.js', 'catalog.js']) vm.runInContext(read(f), sandbox, { filename: f });
const { KAU, KAU_CATALOG } = sandbox.window;
const { esc, prepare, groupsHTML } = KAU_CATALOG;
prepare(KAU);

function read(rel) { return readFileSync(join(ROOT, rel), 'utf8'); }

function write(rel, content) {
  const path = join(ROOT, rel);
  if (existsSync(path) && readFileSync(path, 'utf8') === content) return;
  writeFileSync(path, content);
  console.log(`updated ${rel}`);
}

// Cloudflare 的 auto-trailing-slash 会把 /x/a.html 重定向到 /x/a，canonical 用重定向后的形式
const pageUrl = (slug, page) => `${SITE}/${slug}/${page}`;

// 文件最近一次提交的日期；未提交的文件退回主题发布日期
function lastmod(rel, fallback) {
  try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim() || fallback; }
  catch { return fallback; }
}

// 分享图的绝对 URL；带内容哈希，换图后 X / 微信等平台的卡片缓存会失效重抓
function ogImage(rel) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) return null;
  const v = createHash('md5').update(readFileSync(path)).digest('hex').slice(0, 8);
  return `${SITE}/${rel}?v=${v}`;
}

function imageTags(image, alt) {
  if (!image) return [`<meta name="twitter:card" content="summary">`];
  return [
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(alt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:image" content="${image}">`,
  ];
}

function headTags({ title, desc, url, type, image, llms, jsonLd }) {
  const tags = [
    `<meta name="description" content="${esc(desc)}">`,
    `<link rel="canonical" href="${url}">`,
    `<link rel="alternate" type="text/plain" href="${llms}" title="正文快照">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:site_name" content="${SITE_NAME}">`,
    `<meta property="og:locale" content="zh_CN">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${url}">`,
    ...imageTags(image, title),
    `<meta name="twitter:creator" content="${AUTHOR.twitter}">`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`,
  ];
  return `<!-- seo:start -->\n${tags.join('\n')}\n<!-- seo:end -->`;
}

function injectHead(html, block, rel) {
  if (HEAD_RE.test(html)) return html.replace(HEAD_RE, () => block);
  if (!FAVICON_RE.test(html)) throw new Error(`${rel}: 找不到 seo 标记或 favicon <link>，无法注入`);
  return html.replace(FAVICON_RE, line => `${line}\n${block}`);
}

// 取 <title> 原文并还原实体，交给 headTags 统一转义
const titleOf = html => (html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const urls = [];

// 1. 主题页
for (const t of KAU.topics) {
  for (const page of t.pages) {
    const rel = `${t.slug}/${page}.html`;
    let html = read(rel);
    const title = titleOf(html);
    // 多页主题：页面标题里「·」之后是分篇名（如「B 检索质量」），拼到描述前面以区分各页
    const part = t.pages.length > 1 ? title.split(' · ').slice(1).join(' · ') : '';
    const desc = part ? `${t.title} · ${part}｜${t.desc}` : t.desc;
    const url = pageUrl(t.slug, page);
    const modified = lastmod(rel, t.date);
    const image = ogImage(`${t.slug}/assets/og.jpg`);
    html = injectHead(html, headTags({
      title, desc, url, type: 'article', image, llms: `${url}.llms.txt`,
      jsonLd: {
        '@context': 'https://schema.org', '@type': 'TechArticle',
        headline: title, description: desc, url, inLanguage: 'zh-CN',
        datePublished: t.date, dateModified: modified,
        keywords: t.keywords, author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE}/` },
        ...(image && { image }),
      },
    }), rel);
    write(rel, html);
    urls.push({ loc: url, lastmod: modified });
  }
}

// 2. 首页：head 标签 + 预渲染目录
{
  let html = read('index.html');
  const modified = lastmod('index.html', KAU.topics.map(t => t.date).sort().at(-1));
  html = injectHead(html, headTags({
    title: titleOf(html), desc: HOME_DESC, url: `${SITE}/`, type: 'website', image: ogImage('assets/og.jpg'),
    llms: `${SITE}/llms.txt`,
    jsonLd: {
      '@context': 'https://schema.org', '@type': 'WebSite',
      name: SITE_NAME, url: `${SITE}/`, description: HOME_DESC, inLanguage: 'zh-CN',
      author: { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url },
    },
  }), 'index.html');
  if (!CATALOG_RE.test(html)) throw new Error('index.html: 找不到 seo:catalog 标记');
  // 固定 now 为最新主题日期，避免每天重跑都因 NEW 徽章变化产生 diff；浏览器加载后会用真实时间重绘
  const now = new Date(KAU.topics.map(t => t.date).sort().at(-1)).getTime();
  html = html.replace(CATALOG_RE, () => `<!-- seo:catalog:start -->${groupsHTML(KAU, undefined, now)}<!-- seo:catalog:end -->`);
  write('index.html', html);
  urls.unshift({ loc: `${SITE}/`, lastmod: modified });
}

// 3. sitemap.xml + robots.txt
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
