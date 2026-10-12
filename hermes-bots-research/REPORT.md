# Hermes Bots 调研报告

> 调研日期:2026-09-05 · 渠道:Web 搜索 + Twitter/X(ego-browser 实时抓取)· 素材:`images/`(13 张)、`videos/`(5 个,约 83MB)

## 一句话结论

**Hermes Bots = Nous Research 开源项目 [Hermes Agent](https://github.com/nousresearch/hermes-agent) 的"机器人模式"(Bot Mode)**:把一个自进化 AI 智能体拆成一个"机器人团队"——每个 Bot 有自己的角色、模型、记忆、技能、头像,可以定时干活、互相通信,像养一群数字员工。中文社区昵称"爱马仕"。

## 1. 底座:Hermes Agent 是什么

| 维度 | 事实 |
|---|---|
| 开发方 | [Nous Research](https://nousresearch.com/)(美国开源 AI 公司,Hermes 4 系列模型的作者) |
| 定位 | "The agent that grows with you" — 唯一内置学习循环的开源智能体 |
| 开源协议 | MIT,当前版本 v0.21.0(2026-08-31) |
| 热度 | **~241k GitHub Stars,全球仓库 Top 20**,半年从 0 到 214k,被称为 2026 最火开源 Agent |
| 部署 | 自托管:$5 VPS 即可,最低 256MB 内存;桌面版支持 macOS / Windows / Linux |
| 模型 | 接 OpenRouter / OpenAI / Anthropic / Ollama 本地模型;付费档(Nous Portal)含 300+ 模型额度 |
| 渠道 | Telegram、Discord、Slack、WhatsApp、Signal、Email、CLI —— "一个智能体、一份记忆、每个入口" |
| 沙箱 | 5 种后端:local / Docker / SSH / Singularity / Modal |

**核心卖点 Self-Improving(源码分析结论,阿里云开发者社区)**:三件事配合——
- **Memory** 记住你是谁(FTS5 跨会话记忆)
- **Skill** 记住怎么做事(干完活自动把踩坑经验提炼成可复用技能,发现更好路径会主动改技能文件)
- **Nudge Engine** 保证循环不停转(主动提示自己持久化知识)

## 2. Bot Mode:Hermes Bots 到底是什么

2026-08-17 随桌面版发布([Teknium 官宣推文](https://x.com/Teknium/status/2089430781668303090)、[官方文档](https://hermes-agent.nousresearch.com/docs/user-guide/bot-mode)、[GitHub: Hermes-Bot-Mode](https://github.com/NousResearch/Hermes-Bot-Mode)):

- **本质**:每个 Bot = 一个独立的 Hermes profile(`~/.hermes/profiles/<name>/`),完全隔离的配置、记忆、技能、凭据、聊天记录。Bot Mode 是这些 profile 的 UI 层,没有引入新原语。
- **与 Sessions 模式区别**:Sessions 是"一个智能体多个会话",Bot Mode 是"多个具名智能体,一人一个常驻聊天"。Bot 的主聊天里 `/new` 会被重定向为 `/compact`(保留关系,刷新上下文)。
- **Routines 定时任务**:挂在具体 Bot 上(如"每天早上总结我的收件箱"),本质是 `hermes cron list` 可见的 cron 任务,结果落到该 Bot 自己的聊天记录。
- **Bot↔Bot 通信**:
  - 群聊里 **@mentions** 直接点名;
  - **DM** 用 `message_agent(target="researcher", message="…")`,fire-and-forget + 自动署名;
  - **群聊**(2–6 个 Bot)每条消息最多 3 轮串行、硬顶 10 条;Bot 没话说会主动跳过,需要人时用 `@user` 触发"需要你"徽章。
- **跨机器**:9 月初的 Mega Update 后,Bot 可分布在不同机器(笔记本 / 家庭实验室 / VPS / Hermes 云),通过 Desktop relay 或 `hermes peer dm` 网关互通——HermesWatcher 称之为"你的 Bot 团队不再局限于一台电脑"。
- **头像**:6 种 blob 脸、几何眨眼脸、上传图片、AI 生成肖像、像素宠物(petdex)。
- **SOUL.md**:每个 Bot 的人设/常驻指令文件。

## 3. Twitter/X 上的社区动态(2026-08 至 09-05)

**官方侧**
- [@NousResearch](https://x.com/NousResearch) 8-18 官宣 Bot Mode;正把"一键本地模型"带给 NVIDIA Windows/机器(与 [Hermes 4 混合推理模型](https://x.com/NousResearch/status/1960416954457710982)同一家族)。
- [@tonbistudio 的 5 分钟官方演示视频](https://x.com/tonbistudio/status/2089226021749030999)(已下载):一群 Bot 基于"各自的经验和特长"自行拆分一个大型游戏项目——多智能体协作的展示级案例。
- Teknium(Hermes 核心开发者)多次转发社区玩法,包括把社区头像集成进 Bot Mode。

**玩家/开发者侧(热帖)**
- **Luke The Dev(@iamlukethedev)** — 最活跃的生态玩家,连发多条演示(视频均已下载):
  - 自制非官方 Hermes Bots 手机 App:pin 常用 Bot、一对一群聊、建 Bot(9-03);
  - 语音笔记:像 WhatsApp 一样按住说话直接发给 Agent 团队(9-04);
  - 移动端更新:每个 Bot 有自己的邮箱,接入 Hermes 邮件代理(9-05,发帖 1 小时 1 万浏览);
  - HUD"假装我在工作"模式(趣味向)。
- **HermesWatcher(@HermesWatcher)** — 跟踪版更新号:Mega Update 跨机器分布式 Bot(9-04)。
- **majoragv** — 法语社区,Mac 上跑 Bots Mode 插件,网关放服务器(8-14)。
- **AgentSparko** — 只用一个提示词就让 Hermes 自己写了一个"Hermes 技能"来管理 Bots(元技能玩法,8-18)。
- **跨生态互联(9-04,值得注意的新趋势)**:Elie Steinbock 发布 [hi.new](https://x.com/elie2222/status/2095889712770699678) — 让 Grok Bot、Hermes、OpenClaw、Rakazo 的 Bot 直接互发私信/群聊,端到端加密,不再手动复制粘贴。**"Bot 之间直接对话"正在成为一个独立生态位**。
- 生态竞品对照:经常与 **OpenClaw**(多智能体编排路线)对比 — Hermes 是闭环自学习路线。

## 4. 社区评价(正反面)

**好评**
- 开箱体验好 + Skill 闭环是最受认可的两大亮点(翔宇工作室评测);
- 个人技术爱好者强烈推荐:学习能力 + 隐私(自托管)+ token 成本可控(UniFuncs 评测);
- "会成长的个人 AI 员工"定位打动人。

**批评/风险**
- 稳定性与安全性不足,暂不适合生产环境;
- 自改进实际效果存疑:Reddit 用户实测发现 Agent 并不总是遵循自己的学习指令(系统提示要求"复杂任务后存 memory"常被忽略);
- 需要长期陪伴式使用才有复利,尝鲜玩家可能感知不到"越用越强"。

## 5. 素材清单

**图片 `images/`(13 张)**:多机分布式架构图(HermesWatcher)、Bots Mode 界面截图 ×4(LordThiouk/majoragv)、AgentSparko 元技能截图、hi.new 跨 Bot 聊天截图、hooeem/IBuzovskyi 界面图。

**视频 `videos/`(5 个)**
| 文件 | 内容 | 时长/大小 |
|---|---|---|
| `tonbistudio_bots_mode_demo_*.mp4` | **官方 Bots Mode 演示:Bot 团队自拆游戏项目** | 316s / 37MB |
| `lukethedev_mobile_update_*.mp4` | 移动端更新:pin Bot + 每Bot邮箱 | 24s / 7.5MB |
| `lukethedev_mobile_app_*.mp4` | 非官方手机 App 演示 | ~9MB |
| `lukethedev_hud_mode_*.mp4` | HUD"假装我在工作" | ~18MB |
| `lukethedev_computer_use_*.mp4` | Agent 远程用电脑 | ~11MB |

## 主要来源

- 官网/文档:[hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com/) · [Bot Mode 文档](https://hermes-agent.nousresearch.com/docs/user-guide/bot-mode) · [GitHub](https://github.com/nousresearch/hermes-agent)
- 报道:[MarkTechPost: Nous Research Ships Bot Mode](https://www.marktechpost.com/2026/08/17/nous-research-hermes-bot-mode/) · [Startup Fortune: 214k stars](https://startupfortune.com/hermes-agent-crosses-214000-github-stars-as-developers-abandon-commercial-ai-agent-frameworks/)
- 技术分析:[阿里云:深入源码看 Self-Improving](https://developer.aliyun.com/article/1730226) · [博客园:Self-Evolution 解析](https://www.cnblogs.com/itech/p/19867914)
- 评测:[翔宇工作室](https://xiangyugongzuoliu.com/hermes-agent-review/) · [UniFuncs](https://unifuncs.com/s/NfOgpbhF) · [Reddit r/hermesagent](https://www.reddit.com/r/hermesagent/comments/1upvfe7/)
- Twitter:文中各推文已附原文链接
