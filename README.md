# know-as-ui

把知识做成可以打开、点击、探索的 HTML 界面集合。

## 目录结构

```text
know-as-ui/
├── index.html                 # 总索引，所有知识点从这里进入
├── README.md                  # 项目约定
└── <topic-slug>/              # 一个知识点一个目录
    ├── a.html                 # 第一个可视化 / 交互页面
    ├── b.html                 # 可选：同一主题的第二个页面
    └── assets/                # 可选：该知识点专用资源
```

当前目录：

```text
pi-extensions/
└── a.html                     # pi 自定义扩展开发交互手册
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
- 不依赖构建工具时，直接用浏览器打开即可；如果确实需要依赖，再单独说明运行方式。
- 中文内容使用 `UTF-8`，文件和目录命名使用 ASCII。
- 知识内容要标注来源；涉及会变化的 API，记录来源 URL 或仓库路径。
- 根索引保持简洁，详细内容放在主题目录内。

## 本地预览

直接打开：

```bash
open ~/work/github/know-as-ui/index.html
```

也可以用任意静态文件服务器：

```bash
cd ~/work/github/know-as-ui
python3 -m http.server 8000
```

然后访问 <http://localhost:8000>。
