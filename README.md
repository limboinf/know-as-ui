# know-as-ui

把知识做成可以打开、点击、探索的 HTML 界面集合。

## 目录结构

```text
know-as-ui/
├── index.html                 # 总索引，所有知识点从这里进入
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

subagent-vs-multi-agent/
└── a.html                     # subagent vs 多 agent 架构对照手册

pi-context-management/
└── a.html                     # pi 上下文管理与压缩插件生态交互手册

llm-prompt-caching/
└── a.html                     # LLM 前缀缓存原理、厂商对照与成本实验室
```

## 新增知识点

1. 创建一个小写短横线命名的主题目录，例如 `browser-automation/`。
2. 在目录内创建 `a.html`。页面尽量自包含，优先使用内嵌 CSS、SVG 和 JavaScript，保证直接双击 HTML 也能打开。
3. 在根目录 `index.html` 的知识卡片区域增加一个入口，链接到 `./browser-automation/a.html`。
4. 如果同一个知识点需要拆成多个视角，再在该目录里增加 `b.html`、`c.html`，不要把不相关主题混在同一个目录。
5. 需要图片、数据或其他专用文件时，放在该主题目录自己的 `assets/` 下。

## 页面约定

- 页面应该是可用的知识界面，不只是静态文章。
- 适合加入流程图、架构图、时间线、模拟器、折叠代码、自测题、搜索、进度记录等交互。
- 每个页面的 `<head>` 顶部带上 GA4 统计代码（衡量 ID `G-ZX3SDXK5B3`），可直接从 `index.html` 复制 `<!-- Google tag (gtag.js) -->` 整段。
- 不依赖构建工具时，直接用浏览器打开即可；如果确实需要依赖，再单独说明运行方式。
- 中文内容使用 `UTF-8`，文件和目录命名使用 ASCII。
- 知识内容要标注来源；涉及会变化的 API，记录来源 URL 或仓库路径。
- 根索引保持简洁，详细内容放在主题目录内。

## 本地预览

**一键启动并打开**（推荐）：

```bash
cd ~/work/github/know-as-ui
make open        # 后台启动 http.server :8000，并用浏览器打开
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

也可以手动起任意静态文件服务器：

```bash
cd ~/work/github/know-as-ui
python3 -m http.server 8000
```

然后访问 <http://localhost:8000>。
