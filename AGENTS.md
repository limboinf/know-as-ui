# know-as-ui 项目约定

- 新增或编辑任何主题知识页后，必须运行 `make seo`，同步生成 SEO 产物与该页的 `<slug>/<page>.llms.txt`。
- `*.llms.txt` 是模型的正文快照，不要手工编辑；只改 HTML 后由 `scripts/llms.mjs` 重新生成。
- 首次生成前执行 `npm install`。生成器需要本机 Chrome / Chromium，可用 `CHROME_PATH` 指定路径。
- 提交前检查 `.html` 与对应 `.llms.txt` 是否同时变更；新增主题还要检查 `topics.js` 的 `pages` 是否包含全部页面。
