# know-as-ui

把知识做成可以打开、点击、探索的 HTML 界面集合。

## 目录结构

```text
know-as-ui/
├── index.html                 # 总索引，所有知识点从这里进入（由 topics.js 渲染）
├── topics.js                  # 知识目录数据源：分类 + 主题清单
├── catalog.js                 # 首页目录渲染函数（浏览器与 SEO 预渲染共用）
├── assets/ask-ai.js           # 知识页 AI 上下文交接：范围选择、正文提取、提示词拼装
├── assets/ask-ai.css          # 浮动入口与面板样式
├── assets/vendor/             # 本地化的 ask-ai-widget（MIT）与许可证
├── scripts/seo.mjs            # make seo：生成 SEO 标签、预渲染目录、sitemap、robots
├── scripts/llms.mjs           # make llms：用无头 Chrome 生成每页正文快照 <slug>/<page>.llms.txt
├── sitemap.xml / robots.txt   # 由 scripts/seo.mjs 生成
├── README.md                  # 项目约定
├── wrangler.jsonc             # Cloudflare Workers Static Assets 配置
├── .assetsignore              # 发布时排除开发文件
└── <topic-slug>/              # 一个知识点一个目录
    ├── a.html                 # 第一个可视化 / 交互页面
    ├── b.html                 # 可选：同一主题的第二个页面
    └── assets/                # 可选：该知识点专用资源
```

当前目录：

```text
pi-extensions/
└── a.html                     # pi 自定义扩展开发交互手册

pi-agent-loop/
└── a.html                     # pi agent loop 可视化

pi-react-agent/
├── a.html                     # pi ReAct Agent 实现原理交互手册（R/A/O 解剖、拆件实验台、提示词拼装机）
└── assets/                    # 手册配图

subagent-vs-multi-agent/
└── a.html                     # subagent vs 多 agent 架构对照手册

pi-context-management/
└── a.html                     # pi 上下文管理与压缩插件生态交互手册

llm-prompt-caching/
└── a.html                     # LLM 前缀缓存原理、厂商对照与成本实验室

gpu-and-deployment/
├── a.html                     # 第一页 A：GPU、显存与模型运行的底层认知（显存估算器）
├── b.html                     # 第二页 B：推理、量化与本地/线上部署（推理时间线、并发模拟器）
├── c.html                     # 第三页 C：微调实战（知识库 vs 微调面试题、LoRA/QLoRA、训练显存沙盘、需求分流挑战）
├── d.html                     # 第四页 D：GPU 选型、成本与真实工程案例（部署架构搭建器）
├── topic.css                  # 五页共享样式
└── calc.js                    # 四页共享显存/成本公式（硬件表、KV、训练账单、$/1M）

dsh-cordis/
├── a.html                     # dsh Cordis 与插件开发交互手册（插件树装卸模拟、fiber 动画、waterfall 决策链、patch 叠层、工具/钩子插件实战）
├── topic.css                  # 系列共享样式
└── assets/                    # 配图（出自腾讯技术工程原文）

rag-vector-db/
├── a.html                     # 第一页 A：RAG 直觉（流水线步进器、余弦圆盘、BM25×向量×混合对撞、方案选择与成本账）
├── b.html                     # 第二页 B：检索质量（切块实验台、维度存储账、RRF 调参台、MaxSim 与重排截断、多意图改写、检索指标计算器）
├── c.html                     # 第三页 C：向量库内核（规模计算器、IVF 片区探测、HNSW 搜索回放、量化召回实测、过滤缺口、分段架构模拟器）
├── d.html                     # 第四页 D：选型与实战（选型向导、问题路由器、成本计算器、pgvector 与 Milvus 混合检索实战、排障决策树）
├── e.html                     # 第五页 E：更新治理与问题手册（幽灵答案复现、增量更新实验台、更新时序模拟器、蓝绿切换演练、增量同步开源项目地图、知识库体检、常见问题手册）
├── topic.css                  # 五页共享样式
├── common.js                  # 五页共用：目录/进度/打卡/测验引擎
└── lib.js                     # 玩具检索引擎（BM25、词向量、RRF），A/B 页共用

jev-typesafe/
├── a.html                     # Jev 深入浅出：TypeSafe 判断模型交互手册（概率翻译机、请求拼装台、歧义工单路由、等级设计实验台、Noul 天平、校准对比器、风险阈值路由器、优先级计算器、实战地图：十类玩法/模式/18 份 cookbook/skill/社区链接）
├── topic.css                  # 系列共享样式
└── assets/                    # 封面
```

每个知识页旁边还有一份同名正文快照，例如 `pi-agent-loop/a.llms.txt`。
它由 `scripts/llms.mjs` 从**真实渲染后的 DOM** 生成，保留章节、正文、代码块、表格、FAQ 和外部引用；不包含导航、按钮和测验控件。
这份文件供「与 AI 讨论本页」或外部模型读取完整内容，不要手工编辑；页面 `<head>` 会自动挂 `rel="alternate"` 指向它。

## 新增知识点

1. 创建一个小写短横线命名的主题目录，例如 `browser-automation/`。
2. 在目录内创建 `a.html`。页面尽量自包含，优先使用内嵌 CSS、SVG 和 JavaScript，保证直接双击 HTML 也能打开。
3. 在根目录 `topics.js` 的 `topics` 数组追加一条记录（`slug`、`category`、`date`、`pages`、`title`、`desc`、`tags`、`keywords`），首页自动按分类分组、编号和计数，不用改 `index.html`。需要新分类时在 `categories` 里加一项。
4. 如果同一个知识点需要拆成多个视角，再在该目录里增加 `b.html`、`c.html`，不要把不相关主题混在同一个目录。
5. 需要图片、数据或其他专用文件时，放在该主题目录自己的 `assets/` 下。
6. 运行 `make seo`，按 `topics.js` 重新生成各页 `<!-- seo:start -->` 区块、首页静态预渲染目录、`sitemap.xml`、`robots.txt`，以及**每页的 `<slug>/<page>.llms.txt`**，把结果一起提交。首次运行先执行 `npm install`；生成 llms.txt 需要本机 Chrome / Chromium，路径不对时用 `CHROME_PATH=/path/to/chrome make seo` 覆盖。只想更新正文快照可运行 `make llms`。分享卡片图约定放在 `<slug>/assets/og.jpg`（首页为 `assets/og.jpg`，1200×630），存在即自动挂 `summary_large_image` 大图卡片；脚本幂等，生成区块与 `*.llms.txt` 都不要手改。

## 页面约定

- **正文变更必做**：新增主题、修改知识页正文、增删章节或调整 FAQ 后，都要重新运行 `make seo`，把对应 `.llms.txt` 与 HTML 一起提交，避免模型读到过期内容。
- 页面应该是可用的知识界面，不只是静态文章。
- 适合加入流程图、架构图、时间线、模拟器、折叠代码、自测题、搜索、进度记录等交互。
- 知识页在 `</body>` 前引入 `assets/vendor/ask-ai.min.js` 与 `assets/ask-ai.js`，并在 `<head>` 引入 `assets/ask-ai.css`，右下角会出现「与 AI 讨论」入口。它按「选中片段 → 当前章节 → 整页」自动挑上下文，并把该页 `<slug>/<page>.llms.txt` 的完整正文快照链接写进提示词；支持 ChatGPT、Claude、DeepSeek、Gemini、Perplexity。DeepSeek 与 Gemini 走复制提示词后跳转。新增主题页时复制这三行引用即可。
- 每个页面的 `<head>` 顶部带上 GA4 统计代码（衡量 ID `G-ZX3SDXK5B3`），可直接从 `index.html` 复制 `<!-- Google tag (gtag.js) -->` 整段。
- 不依赖构建工具时，直接用浏览器打开即可；如果确实需要依赖，再单独说明运行方式。
- 中文内容使用 `UTF-8`，文件和目录命名使用 ASCII。
- 知识内容要标注来源；涉及会变化的 API，记录来源 URL 或仓库路径。
- 根索引保持简洁，详细内容放在主题目录内。

## 本地预览

**一键启动并打开**（推荐）：

```bash
cd ~/work/github/know-as-ui
make open        # 后台启动本地预览服务器 :8000，并用浏览器打开
make stop        # 停止后台服务器
make serve       # 前台运行（Ctrl+C 退出，适合调试）
```

直接双击打开：

```bash
open ~/work/github/know-as-ui/index.html
```

Cloudflare Worker 部署：

```bash
npx wrangler deploy --domains dev.limbo101.win
```

根目录 `_headers` 会给所有 `*.llms.txt` 显式设置 `Content-Type: text/plain; charset=utf-8`，避免线上浏览器把 UTF-8 正文按 GBK 解码成乱码。

也可以手动起任意静态文件服务器：

```bash
cd ~/work/github/know-as-ui
python3 scripts/serve.py 8000
```

然后访问 <http://localhost:8000>。别直接用 `python3 -m http.server`：它不会给 `text/plain` 声明 UTF-8，中文 `.llms.txt` 会被浏览器按系统编码猜成乱码。
