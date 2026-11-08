// 知识目录的唯一数据源。新增主题只改这里，index.html 自动渲染。
// 用 <script> 而不是 fetch JSON，保证双击 index.html（file://）也能打开。
// 新增/删除 pages 或改动任何知识页正文后，必须运行 make seo，同步生成对应 <slug>/<page>.llms.txt。
window.KAU = {
  // 分类顺序即首页分组顺序
  categories: [
    { id: 'coding-agent', label: 'Coding Agent' },
    { id: 'agent-arch', label: 'Agent 架构' },
    { id: 'llm-infra', label: 'LLM Infra' },
    { id: 'decision-model', label: '判断模型' },
  ],

  // slug: 目录名；pages: 目录内的页面，第一个是入口；date: 首次发布日期
  topics: [
    {
      slug: 'pi-extensions', category: 'coding-agent', date: '2026-08-24', pages: ['a'],
      title: 'pi 扩展开发',
      desc: '从 ExtensionAPI、事件生命周期、自定义工具，到 UI、状态持久化和动态 Provider 的可交互开发手册。',
      tags: ['TypeScript', 'extensions', 'interactive'],
      keywords: 'pi extensions 插件 coding agent typescript tool event ui provider',
    },
    {
      slug: 'pi-agent-loop', category: 'coding-agent', date: '2026-08-24', pages: ['a'],
      title: 'pi Agent Loop',
      desc: '从 6 行心智模型到 runLoop 双环走读：三层架构、五段工具流水线、steering/followUp 双队列与自愈决策树，配步进器和终极测验。',
      tags: ['源码走读', 'architecture', 'quiz'],
      keywords: 'pi agent loop 循环 tool call steering compaction coding agent architecture',
    },
    {
      slug: 'subagent-vs-multi-agent', category: 'agent-arch', date: '2026-08-25', pages: ['a'],
      title: 'Subagent vs 多 Agent',
      desc: '控制权谱系、星型 vs 网状拓扑、Handoff 交接模拟、Anthropic 实测数据与交互决策向导——一次分清三种 Agent 架构。',
      tags: ['architecture', 'Anthropic / OpenAI', '决策向导'],
      keywords: 'subagent multi agent 多智能体 orchestrator handoff agent teams 架构 星型 网状 anthropic openai',
    },
    {
      slug: 'pi-context-management', category: 'coding-agent', date: '2026-08-26', pages: ['a'],
      title: 'pi 上下文管理',
      desc: '原生压缩的一条规则、三个扩展钩子，与五派插件的内容哲学——遗忘、备忘录、版本管理、源头减噪、预热切换，配水位模拟器和终极测验。',
      tags: ['compaction', '插件生态', 'quiz'],
      keywords: 'pi context management 上下文管理 compaction 压缩 compact pai-acp smart-compact hypa press checkpoint 上下文窗口 token',
    },
    {
      slug: 'llm-prompt-caching', category: 'llm-infra', date: '2026-08-27', pages: ['a'],
      title: 'LLM 前缀缓存',
      desc: '缓存的不是答案，而是已经算过的前缀状态。用咬合动画、请求步进器、成本实验室与缓存杀手挑战，一次分清 OpenAI、Anthropic、DeepSeek。',
      tags: ['prompt caching', 'DeepSeek', '成本模拟器'],
      keywords: 'llm prompt prefix cache caching kv cache deepseek openai anthropic 缓存 前缀 命中 成本',
    },
    {
      slug: 'pi-react-agent', category: 'coding-agent', date: '2026-08-31', pages: ['a'],
      title: 'pi ReAct Agent 实现',
      desc: '由浅入深拆 pi 的 ReAct 循环：三拍节奏与消息模型、四样原料拆件实验台、R/A/O 三要素源码解剖、系统提示词拼装机与「循环之上皆是上下文管理」钉板。',
      tags: ['ReAct', '源码走读', 'quiz'],
      keywords: 'pi react agent reasoning acting 循环 工具 tool system prompt 上下文管理 最小实现 coding agent',
    },
    {
      slug: 'gpu-and-deployment', category: 'llm-infra', date: '2026-09-02', pages: ['a', 'b', 'c', 'd'],
      title: 'GPU 与模型部署实战',
      desc: '从「显存里到底装了什么」到「稳定便宜地服务用户」：显存估算器、推理时间线、并发模拟器、训练显存沙盘与部署架构搭建器，四页走完一个 14B 模型的一生。',
      tags: ['GPU / 显存', '部署', '微调'],
      keywords: 'gpu 显存 vram 部署 deployment 推理 inference 量化 quantization kv cache 微调 finetune lora qlora vllm ollama sglang 训练 显卡 选型 成本 tco 并发',
    },
    {
      slug: 'dsh-cordis', category: 'agent-arch', date: '2026-09-05', pages: ['a'],
      title: 'dsh Cordis 与插件开发',
      desc: 'DeepSeek Harness「一切皆插件」的心脏：四问翻卡、插件树装卸模拟、fiber 状态机动画、effect 回滚栈、waterfall 决策链与 patch 叠层演示，附可运行的工具 / 钩子插件实战。',
      tags: ['Cordis', 'DeepSeek Harness', '插件实战'],
      keywords: 'dsh cordis deepseek harness plugin 插件开发 agent runtime ctx effect inject service 事件 waterfall fiber hmr 配置 cordis.yml 一切皆插件',
    },
    {
      slug: 'jev-typesafe', category: 'decision-model', date: '2026-09-19', pages: ['a'],
      title: 'Jev 深入浅出',
      desc: '只做判断题的模型：state 加三种题型换类型化答案与概率。概率翻译机、歧义工单路由、等级设计实验台、Noul 天平、风险阈值路由器，再配十类社区玩法、18 份官方 cookbook 与生态地图。',
      tags: ['判断模型', '校准概率', 'quiz'],
      keywords: 'jev typesafe system one decision model 判断模型 choice score noul 校准 calibrated confidence 概率 rlcd rlhf 结构化输出 分类 路由 cookbook 实战 用例 agent skill',
    },
    {
      slug: 'rag-vector-db', category: 'llm-infra', date: '2026-10-05', pages: ['a', 'b', 'c', 'd', 'e'],
      title: 'RAG 与向量数据库',
      desc: '从「开卷考试」到「一千万条怎么扛」：BM25×向量对撞、切块实验台、RRF 调参、真实跑 k-means / HNSW / 量化的内核实验，用 pgvector 和 Milvus 各搭一套混合检索，再讲上线后的增量更新、蓝绿换模型、数据治理与 29 条常见问题手册。',
      tags: ['RAG', '向量库', '混合检索', '五部曲'],
      keywords: 'rag 检索增强生成 向量数据库 vector database embedding 嵌入 bm25 hybrid 混合检索 rrf rerank 重排 chunking 切块 hnsw ivf 量化 rabitq pgvector milvus qdrant 选型 graphrag agentic 评估 recall 增量更新 incremental upsert 对账 删除 别名 alias 蓝绿 重建 治理 元数据 faq 常见问题 排障',
    },
  ],
};
