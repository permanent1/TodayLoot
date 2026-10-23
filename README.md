# 今天出货了吗？· Today Loot

> 万物皆可鉴定，今天你出货了吗？
>
> 零号鉴定局 · 万物收藏计划（游戏内虚构机构）

移动端优先的 **AI 万物鉴定与收藏小游戏**。拍下身边任意一件物品，AI 为它写一份藏品档案，本地规则引擎决定稀有度与收藏币，五档卡牌揭晓后收进展厅。

- **无 API Key 也能完整演示**：首页、鉴定、揭晓、卡片、展厅、陈列室、设置全部可用，演示结果明确标注「演示数据」。
- **真实模型只做感知与文本**：稀有度、保底、评分、币值全部由本地纯函数引擎计算，模型不能决定中奖。
- **真实调用单次、不自动重试**：失败由用户手动重试或显式切换演示识别，绝不伪造真实结果。
- **数据留在本机**：图片、卡面、币值、保底进度保存在 IndexedDB，不上传服务器。

| 项目信息 | 内容 |
| --- | --- |
| 版本 | `1.0.0` |
| 形态 | 响应式 Web / PWA manifest（未注册 Service Worker，安装能力取决于浏览器） |
| 技术栈 | Next.js 15 App Router + React 19 + TypeScript + Tailwind CSS 4 + Motion + Dexie + Zod + Three.js |
| 默认识别 | `AI_MODE=mock`（演示数据） |
| 可选真实识别 | 阿里云百炼 · 通义千问视觉模型（OpenAI 兼容接口） |
| 可选 3D | Tripo v3 图生 3D（默认关闭） |
| 当前质量状态 | typecheck / lint / 57 个单测 / 7 个 E2E / build / 安全检查全部通过 |

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [快速开始](#3-快速开始)
4. [环境变量](#4-环境变量)
5. [调用的模型与服务](#5-调用的模型与服务)
6. [功能详解](#6-功能详解)
7. [90 秒演示脚本](#7-90-秒演示脚本)
8. [项目结构](#8-项目结构)
9. [测试与质量](#9-测试与质量)
10. [安全与隐私](#10-安全与隐私)
11. [已实现 / 未实现](#11-已实现--未实现)
12. [常见问题](#12-常见问题)
13. [开发日志](#13-开发日志)
14. [素材与许可](#14-素材与许可)
15. [文档索引](#15-文档索引)

---

## 1. 项目概述

### 1.1 这是什么

这不是「上传图片后显示 AI 文本」的工具，而是一个有完整情绪曲线的轻量游戏：

```text
好奇（看见身边物品）
  → 参与（拍照、附言、选鉴定师、猜档位）
  → 悬念（扫描与鉴定流程）
  → 惊喜（五档揭晓、卡面、音效、粒子）
  → 拥有（战利品 / 珍藏柜 / 藏品档案）
  → 回访（每日悬赏、探访、效果陈列室、3D）
```

### 1.2 五个核心卖点

1. **拍任何物件都能玩**：手机拍照、相册选择、桌面拖拽，或直接用内置真实照片样例。
2. **出货仪式感**：普通、精良、稀有、史诗、传说（大红）五档有明确不同的卡面、光效与揭晓节奏。
3. **真实 AI + 可控游戏引擎**：模型负责识别、描述、评分；概率与币值由本地规则引擎决定。
4. **东西真的留下来**：图片 Blob、卡面、词条、鉴定记录存入 IndexedDB，刷新、重启浏览器后仍在。
5. **一键可演示**：无 Key 走 Mock；效果陈列室可单独预览五档与传说红卡，绝不把预览伪装成真实抽卡。

### 1.3 当前完成度

已完成 **P0 主链路 + 大部分 P1**：

- 首页 → 鉴定台 → 流程页 → 揭晓 → 战利品 / 珍藏柜 → 藏品档案 → 效果陈列室 → 设置。
- 五档卡面与揭晓动画、传说红卡高光、音效、减少动画。
- 真实 Qwen 适配器、Zod 契约、单次调用、服务端限流与缓存。
- 本地规则引擎、10 万次 Monte Carlo 单测、20 万次校准脚本。
- 本地抠图（可选）、每日悬赏、探访计数、JSON 备份导入导出、清空数据。
- Tripo v3 适配层与本地 3D 展台；**真实 Tripo 调用次数为 0**。
- 未实现：珍藏模式鉴定入口、包浆纹理里程碑、加注经济、Service Worker 离线缓存、P2 社交等，详见 [第 11 节](#11-已实现--未实现)。

---

## 2. 技术栈

| 层 | 选型 | 用途 |
| --- | --- | --- |
| Web | Next.js `15.5.x`（App Router）+ React `19.3.x` + TypeScript `5.9.x` | 页面、路由、API Route |
| 样式 | Tailwind CSS `4.3.x` + 自定义 CSS 变量 / 动画 | 暗色 HUD、双主题、五档视觉 |
| 动效 | Motion（`motion/react`）+ CSS keyframes | 揭晓、粒子、卡片翻转 |
| 状态 | Zustand `5.x` | 玩家快照、设置、主题 |
| 校验 | Zod `4.x` | AI 返回、请求体、备份导入 |
| 本地存储 | Dexie `4.x`（IndexedDB） | 藏品、图片 Blob、审计、悬赏、设置 |
| 3D | three.js + `@react-three/fiber` + `@react-three/drei` | GLB 展台 |
| 抠图 | `@imgly/background-removal`（浏览器 WASM，AGPL-3.0） | 可选本地主体抠图 |
| 图标 | Lucide React | UI 图标 |
| 测试 | Vitest + fake-indexeddb + Playwright | 规则 / 仓储 / API / E2E |

> Node.js 建议 **20 LTS 或 22 LTS**（Next.js 15 要求 Node ≥ 18.18）。仓库未锁定 `engines`。

---

## 3. 快速开始

### 3.1 安装

```bash
git clone <repo-url> today-loot
cd today-loot
npm install
```

### 3.2 配置环境变量

```bash
cp .env.example .env.local
```

`.env.example` 默认是 **无 Key 演示配置**：

```dotenv
AI_MODE=mock
ALLOW_LIVE_APPRAISE=false
```

不需要填写任何 Key，直接启动即可完整演示。

> 如果你本机已有 `.env.local` 并切到了 `live`，以 `http://localhost:3000/api/health` 返回的 `aiMode` / `liveReady` 为准。
> `.env.local` 已在 `.gitignore` 中，**不要提交**。

### 3.3 启动开发服务器

```bash
npm run dev
# http://localhost:3000
```

指定端口：

```bash
npm run dev -- -p 3001
```

### 3.4 生产构建

```bash
npm run build
npm run start
# http://localhost:3000
```

### 3.5 切换到真实识别

1. 在 `.env.local` 填写：

   ```dotenv
   AI_MODE=live
   ALLOW_LIVE_APPRAISE=true
   DASHSCOPE_API_KEY=你的百炼_API_Key
   DASHSCOPE_MODEL=qwen3.8-flash
   DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
   ```

2. **重启服务**（环境变量只在进程启动时读取）。
3. 打开 `/settings`，确认「识别服务」显示 **真实识别已就绪**；或直接访问 `/api/health` 检查 `liveReady: true`。
4. 在鉴定台提交一张照片。每次提交只发起 **一次** 模型请求。

若 `AI_MODE=live` 但缺少 Key 或未打开 `ALLOW_LIVE_APPRAISE`，接口会返回**明确标注的演示数据**，不会冒充真实识别。

### 3.6 首次运行 E2E

```bash
npx playwright install chromium
npx playwright install-deps chromium   # Linux CI
npm run build                           # E2E 使用生产服务
npm run test:e2e
```

E2E 默认在 `3100` 端口启动 `npm run start`；可用 `E2E_BASE_URL` 复用已有服务。

---

## 4. 环境变量

所有变量只在服务端读取（除测试/脚本变量外）。**当前实现不使用任何 `NEXT_PUBLIC_*` 变量，也不允许把密钥放进该前缀。**

### 4.1 应用变量

| 变量 | 默认 | 取值 | 是否必填 | 说明 |
| --- | --- | --- | --- | --- |
| `AI_MODE` | `mock` | `mock` / `live` | 否 | `mock` 演示；`live` 尝试真实识别 |
| `ALLOW_LIVE_APPRAISE` | `false` | `true` / `false` | live 时必填 | 真实识别第二道开关，必须为 `true` |
| `DASHSCOPE_API_KEY` | 空 | 字符串 | live 时必填 | 阿里云百炼 Key，仅服务端读取 |
| `DASHSCOPE_MODEL` | `qwen3.8-flash` | 控制台可用视觉模型 | 否 | 以控制台实际可用模型为准 |
| `DASHSCOPE_BASE_URL` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | URL | 否 | OpenAI 兼容模式端点，末尾斜杠会被去掉 |
| `ENABLE_TRIPO` | `false` | `true` / `false` | 否 | 3D 付费调用总开关 |
| `TRIPO_API_KEY` | 空 | 字符串 | 3D 时必填 | 仅服务端读取 |
| `TRIPO_BASE_URL` | `https://openapi.tripo3d.ai/v3` | URL | 否 | Tripo v3 端点 |
| `DEMO_ACCESS_CODE` | 空 | 字符串 | 否 | 预留；当前仅在 `/api/health` 上报是否配置，**未强制校验** |
| `MAX_IMAGE_MB` | `8` | 正整数 | 否 | 服务端图片体积上限 |
| `MAX_DAILY_LIVE_REQUESTS` | `20` | 正整数 | 否 | 每 IP 每日真实识别上限（内存计数，重启清零） |

### 4.2 脚本 / 测试变量（不写入 `.env.example`）

| 变量 | 默认 | 作用 |
| --- | --- | --- |
| `VERIFY_BASE_URL` | `http://localhost:3000` | `npm run verify:live` 校验的服务地址 |
| `E2E_BASE_URL` | `http://localhost:3100` | Playwright 复用的服务地址 |
| `SHOTS_DIR` | `/tmp/today-loot-shots` | E2E 截图输出目录 |

### 4.3 安全约束

- `DASHSCOPE_API_KEY` / `TRIPO_API_KEY` 只能出现在 `.env.local` 或部署平台的服务端环境变量中。
- 不得写入 `NEXT_PUBLIC_*`、客户端组件、日志、测试快照、README、截图。
- `.env.example` 只能放占位符（如 `your_dashscope_api_key_here`）。
- 提交前执行：

  ```bash
  npm run verify:security
  git check-ignore .env.local
  ```

---

## 5. 调用的模型与服务

### 5.1 总览

| 用途 | 提供方 | 模型 / 接口 | 是否必需 | 默认状态 | 计费 |
| --- | --- | --- | --- | --- | --- |
| 视觉识别 + 藏品文案 + JSON | 阿里云百炼（DashScope） | `qwen3.8-flash`，OpenAI 兼容 `/chat/completions` | 否 | Mock | 按 Token 计费 |
| 图生 3D | Tripo | v3 `image_to_model` 异步任务 | 否 | 关闭 | 按任务计费 |
| 浏览器主体抠图 | 本地 / CDN | `@imgly/background-removal`，`isnet_quint8` | 否 | 开启（可关） | 免费（下载模型流量） |
| 演示识别 | 本地 | `src/lib/ai/fixtures.ts` 固定样例 | 无 Key 时自动使用 | 开启 | 免费 |
| 音效 | 浏览器 | Web Audio API 程序化合成 | 否 | 开启 | 免费 |

**没有接入**文生图、TTS、云端数据库、账号系统。

### 5.2 Qwen 视觉识别（真实模式）

- 端点：`{DASHSCOPE_BASE_URL}/chat/completions`
- 请求头：`Authorization: Bearer <DASHSCOPE_API_KEY>`，仅服务端发送。
- 消息结构：
  - `system`：鉴定局角色与硬规则（见 `src/lib/ai/prompt.ts`）。
  - `user`：`image_url` + Base64 Data URL，以及模式、鉴定师、附言、今日悬赏文本。
- 关键参数：

  ```json
  {
    "model": "qwen3.8-flash",
    "temperature": 0.85,
    "enable_thinking": false,
    "max_completion_tokens": 3000,
    "response_format": { "type": "json_object" }
  }
  ```

- 超时：60 秒。
- **单次请求，不自动重试**。超时、401/403、429、坏 JSON、Schema 不合法都会返回明确错误码。
- 返回经 `src/lib/ai/schema.ts` 的 Zod 清洗：
  - 评分越界 clamp 到 `0..100`；
  - `dimensions` 缺失时用 50 兜底；
  - `bounty_match` 补齐/截断为 3 个布尔值；
  - 非法 `description_credibility` 降级为 `null`；
  - HTML / 控制字符会被清理；
  - 只有核心 `name` / `desc` 缺失才拒绝。
- 模型**不输出**游戏字段（`coins`、`finalTier`、`pity`、`rewardPaid` 等）。
- 相同图片 + 模式 + 鉴定师 + 附言 + 悬赏 + 模型 + Prompt 版本命中服务端内存缓存（1 小时 / 最多 40 条），不重复计费。

> 接口核对时间：2026-10-23。Qwen3.8 默认开启思考模式，本实现显式传入 `enable_thinking: false`，避免 `reasoning_content` 占满输出额度导致 `content` 为空。

### 5.3 Tripo 图生 3D（可选）

- v3 API：
  - `POST /files` 上传图片，取 `file_token`；
  - `POST /tasks`，`type: "image_to_model"`，创建任务；
  - `GET /tasks/{taskId}` 查询状态与 `output.pbr_model` / `model` / `base_model`。
- 服务端适配：`src/lib/server/tripo.ts`，30 秒超时，不自动重试。
- API Route：
  - `POST /api/model3d`
  - `GET /api/model3d/[taskId]`
  - `GET /api/model3d/asset`（探测 `public/models/dahong.glb` 与 meta）
- 脚本：

  ```bash
  npm run tripo:generate -- --image images/image4.jpg --yes
  ```

  只创建 **1 个任务**；失败不重建、不重试；成功后下载 GLB 到 `public/models/dahong.glb` 并写 `dahong.meta.json`。
- 当前仓库的 `public/models/dahong.glb` 是**本地程序化建模**（6 个 PBR 材质、11 个网格、6,044 个三角面、约 163KB），由 `npm run model:build` 生成；`meta.generator` 为 `local-procedural`，展台徽标会如实显示「本地建模」。
- 真实 Tripo 生成调用次数：**0**。

### 5.4 本地抠图

- 使用 `@imgly/background-removal`，模型 `isnet_quint8`，在浏览器内运行。
- 首次需从 CDN 下载约 40–65MB 模型 / WASM；之后命中 IndexedDB 缓存（最多 30 条）。
- 失败判定：**90 秒无进度**；硬上限 10 分钟。
- 抠图失败不阻断鉴定：流程页如实提示「抠图没成功，改用原图相框」，卡片自动回退原图。
- 可在 `/settings` 关闭「本地抠图」，演示时更快。

### 5.5 Mock 演示识别

- 触发条件：
  1. `forceMock: true`（用户显式选择）；
  2. 或 `liveReady(config) === false`（`AI_MODE != live`、未开 `ALLOW_LIVE_APPRAISE`、无 Key）。
- 返回 `meta.source = "mock"`、`meta.demo = true`，并在卡片上显示「演示数据」。
- 结果由图片 SHA-256 + 模式 + 鉴定师 + 附言 + 悬赏 ID 派生，稳定可复现；内置样例会命中对应 fixture（酸奶 / 键盘 / 鼠标）。
- 真实失败**不会**自动降级为 Mock；页面提供「手动重试」与「改用演示识别（不调用真实模型）」两个明确按钮。

### 5.6 费用保护

- 真实识别：一次提交只发一次请求，**不自动重试**。
- 服务端按 IP 做每日真实识别限额（`MAX_DAILY_LIVE_REQUESTS`，默认 20）。
- 相同请求命中缓存不重复计费。
- Tripo 默认 `ENABLE_TRIPO=false`；未开启时 API 直接返回 503。
- `npm run verify:live` 与 `npm run tripo:generate` 都必须带 `--yes` 才会发起付费调用。

---

## 6. 功能详解

### 6.1 核心循环

```text
首页（开始鉴定）
  → 鉴定台（拍照 / 样例 / 附言 / 鉴定师 / 竞猜 / 悬赏）
  → 鉴定流程页（可选抠图 → 视觉识别 → 封存档案）
  → 揭晓页（扫描 → 爆发 → 五档卡面）
  → 战利品（默认）或 加入珍藏柜
  → 藏品档案（翻面 / 评分 / 海报 / 探访 / 碎卡）
  → 我的展厅（战利品 / 珍藏柜双 Tab）
  → 效果陈列室（五档预览 / 传说红卡 / 3D）
```

**单一鉴定模式**：鉴定台只有一种流程，结果一律先进入战利品；揭晓后可选择「加入珍藏柜」，只改变分组，不重抽稀有度、不改币值。

### 6.2 页面与功能

| 路由 | 页面 | 主要功能 |
| --- | --- | --- |
| `/` | 首页 · 零号鉴定局 | 品牌 Hero、开始鉴定、五档跑马灯、今日悬赏告示牌、最近战利品、效果陈列室入口、统计条 |
| `/appraise` | 鉴定台 | 拍照 / 相册 / 拖拽、三张真实样例、60 字附言、三位鉴定师、五档竞猜、对数币值滑块、今日悬赏 |
| `/appraise/run` | 鉴定流程 | 本地抠图（可关）→ 视觉鉴定 → 封存档案；真实失败可手动重试或显式转演示 |
| `/reveal/[id]` | 出货时刻 | 扫描节奏 → 爆发 → 卡面；跳过、静音、加入珍藏柜、查看档案、再鉴定 |
| `/gallery` | 我的展厅 | 战利品 / 珍藏柜双 Tab、总数/珍藏/传说统计、稀有度筛选、最新/稀有度排序、空态 |
| `/item/[id]` | 藏品档案 | 卡面翻转、评分条、可见特征、附言、证书区、探访、海报导出、转珍藏、碎卡、3D 入口 |
| `/showroom` | 效果陈列室 | 五档真实照片预览、传说「大红」全屏预览、3D 展台、明确「预览」标识 |
| `/settings` | 设置与备份 | 识别模式状态、深/浅主题、音效、减少动画、图片保留、本地抠图、JSON 备份导入导出、清空数据 |

#### 首页 `/`

- 暗色鉴定所 Hero：金色 `今天出货了吗？`、三位鉴定师合影、在岗信息。
- 主 CTA「开始鉴定」，次按钮「五档卡面」跳转陈列室。
- 统计：鉴定次数、建档数、传说数。
- 今日悬赏告示牌：只给已命中项盖章，未命中不打叉。
- 最近战利品横向滑动；桌面端提供可拖动自绘滑条。

#### 鉴定台 `/appraise`

- 图片入口：`capture="environment"` 拍照、相册选择、桌面拖拽。
- 图片处理：校验 MIME（JPEG/PNG/WebP）与 8MB 上限；最长边压缩到 1024px，JPEG 质量 0.86，清除 EXIF。
- 三张内置真实样例：希腊风味酸奶、蓝白机械键盘、白色无线鼠标。
- 60 字附言：明确提示「会作为待评估的用户陈述交给 AI，不会当作指令执行」。
- 三位鉴定师：老周（故事/羁绊，抖动 ×0.6）、小 K（工艺/稀缺，×1.4）、阿黎（故事/惊喜，×1.8）。
- 五档竞猜：可取消；猜中档位评分 +6。
- 币值竞猜：对数滑块 1,000–3,000,000；可开关。
- 今日悬赏：读取当天 3 条任务并随鉴定请求发送。

#### 鉴定流程 `/appraise/run`

- 步骤：`本地抠图（可选） → 视觉鉴定 → 封存档案`。
- 阶段文案由客户端状态驱动，明确标注「展示节奏 · 非服务端进度」。
- 每次进入只执行一次；`requestKey` 已存在时直接跳转旧揭晓页，不重复计数。
- 失败页提供「手动重试」「改用演示识别（不调用真实模型）」「返回鉴定台」。
- 流程页图片只存在内存；硬刷新后回退鉴定台，不会产生半截记录。

#### 揭晓 `/reveal/[id]`

- 三阶段：`scan` → `burst` → `reveal`。
- 普通档扫描约 2.0 秒，传说约 2.6 秒；可跳过。
- 五档差异：
  - 普通：哑光纸张、轻落位。
  - 精良：蓝色描边、扫描流光。
  - 稀有：紫雾、全息折射、12 个粒子。
  - 史诗：金色光柱、射线、20 个粒子。
  - 传说：全屏柔光爆发、红色光晕、40 个粒子、专属音效。
- 揭晓后：收进战利品 / 加入珍藏柜 / 查看档案 / 我的展厅 / 再鉴定 / 返回首页。
- 已保存的档案再次打开不重播揭晓，直接显示卡面与操作。

#### 我的展厅 `/gallery`

- 双 Tab：战利品（高密度卡组）、珍藏柜（证书式陈列）。
- 统计：全部藏品、珍藏柜数量、传说数量。
- 筛选：全部 / 普通 / 精良 / 稀有 / 史诗 / 传说。
- 排序：最新 / 稀有度。
- 空态区分「战利品为空」「珍藏柜为空」「筛选无结果」。

#### 藏品档案 `/item/[id]`

- 卡面翻转：正面（稀有度、图片/抠图、评分、词条与币值区间）↔ 背面（证书式档案、可见特征、评分条、播报、附言、编号）。
- 收藏币区间、综合分、鉴定记录、可见特征、附言。
- 珍藏证书区（若存在 `origin/story/monologue`；当前正常鉴定流程不生成，见限制）。
- 探访：珍藏品可「看一看它」，累加访问次数与最近访问时间。
- 保存 1080×1620 PNG 卡片海报（Canvas 绘制，含演示数据水印）。
- 加入珍藏柜、碎卡（标记 `destroyed`，从展厅移除）、3D 陈列入口。

#### 效果陈列室 `/showroom`

- 五档预览：全部使用 `public/images/` 真实照片（笔记本 / 鼠标 / 酸奶 / 键盘 / 大红奶茶）。
- 点击任意档位 → 全屏揭晓预览；明确标注「效果预览 · 非真实结果」。
- 传说「大红」独立高光区，可重复播放。
- 3D 展台：
  - 存在 GLB 时加载 `public/models/dahong.glb`；
  - 无 GLB / 加载失败 / 无 WebGL 时回退程序化几何或说明；
  - 徽标根据 `meta.generator` 显示「本地建模」或「Tripo 生成」，不冒充。
- 预览不写入展厅、不改变次数/币值/保底。

#### 设置 `/settings`

- 识别服务状态：`真实识别已就绪` / `LIVE 配置不完整` / `演示识别模式`。
- 主题：深色 · 鉴定所 / 浅色 · 展厅；写入 `localStorage`，首屏内联脚本防闪烁。
- 音效开关、减少动画、本机保留藏品图片、本地抠图。
- 本机档案：鉴定次数、收藏币余额、建模券。
- 导出 JSON 备份（含图片 Base64）、导入备份（覆盖本机数据）、清空本机数据（二次确认）。

### 6.3 稀有度与保底

五档与目标长周期分布：

| 枚举 | 档位 | 目标占比 | 卡面主色 | 收藏币区间 |
| --- | --- | --- | --- | --- |
| `common` | 普通 | 13% | `#DDE3EF` | ◎1,000–3,200 |
| `fine` | 精良 | 30% | `#54A9FF` | ◎3,200–14,000 |
| `rare` | 稀有 | 34% | `#A67CFF` | ◎14,000–68,000 |
| `epic` | 史诗 | 17% | `#F7C66A` | ◎68,000–340,000 |
| `legendary` | 传说（大红） | 6% | `#FF3B53` | ◎340,000–2,600,000 |

**初始候选权重**（不是最终目标）：`16.0 / 38.5 / 27.0 / 15.0 / 3.5`。13/30/34/17/6 是启用全部机制后的长周期目标，必须通过校准脚本验证。

**唯一抽样顺序**：

1. 周期硬保底：红 40 > 金 20 > 紫 8。命中只归零被消费的那个计数器。
2. 新手第 3 次固定稀有。
3. 当日第 9 次且前 8 次无史诗及以上 → 固定史诗（同日一次）。
4. 正常权重抽样；前 20 次稀有及以上候选权重 ×1.3。
5. 金保底固定至少史诗，并保留 26% 升级传说。
6. 自然出红**不重置**红计数；跨模式、跨日不重置周期计数。
7. 真实模式使用 `crypto.getRandomValues` 封装的随机源；测试/校准显式注入 seed。

### 6.4 评分

八维原始分（0–100）：`rarity`、`surprise`、`value`、`aesthetic`、`craft`、`story`、`condition`、`bond`。

| 模式 | 权重（系数和 = 1） |
| --- | --- |
| 摸金 `hunt` | rarity .26 / surprise .20 / value .16 / aesthetic .12 / craft .10 / story .10 / condition .06 / bond 0 |
| 珍藏 `keep` | story .24 / bond .20 / rarity .18 / aesthetic .12 / craft .10 / surprise .10 / condition .06 / value 0 |

辅助分：

- 附言：摸金 `0~8`，珍藏 `0~12`；`contradicted` 时先 `max(0, note-8)`，再在明细中扣 8。
- 猜中档位：`+6`。
- 悬赏：命中 1 条 `+10`，2 条 `+15`，3 条 `+20`。
- 首次鉴定：`+15`。
- 每日运势：`-10~+10`。
- 鉴定师抖动：`±10 × 系数`。
- 幸运一击：5% 概率 `+25`，默认**不改变稀有度**。
- 总分 clamp 到 `0~200`。

**综合分只用于展示与同档币值落点，不决定稀有度。**

### 6.5 收藏币与奖励

- 藏品币值区间：`center = lerp(tierMin, tierMax, valueScore/100)`；
  `low = clamp(round(center×0.75), tierMin, tierMax)`；
  `high = clamp(round(center×1.30), low, tierMax)`；`low ≥ 1,000`。
- 卡面只显示 `◎ low~high`，不代表真实价格。
- 玩家余额初始为 0，只有实际奖励会增加：
  - 币值猜中区间：`+5,000`；
  - 再接近区间中点（相对误差 ≤20%）：`+2,000`；
  - 悬赏每条：`+8,000`；
  - 当日三条悬赏全部达成：额外 `+20,000`（同日一次）；
  - 猜中档位只加分，不加币。
- 传说入藏：每日最多发 1 张建模券，持有上限 5 张（当前没有消耗入口）。
- 碎卡不返还收藏币。

### 6.6 每日悬赏

- 每天固定 3 条，按本地日期种子稳定生成；同一天多次打开保持一致。
- 任务池 6 条：红色物品、圆形物体、桌面用品、织物、金属制品、植物。
- 模型在识别时返回 `bounty_match: [boolean, boolean, boolean]`，与三条任务一一对应。
- 命中即盖章；未命中保持安静（不打叉）。
- 每条 `+8,000`，三条全达成额外 `+20,000`；`claimed` 防止重复领币。
- 次日按日期键自动刷新。

### 6.7 珍藏柜与探访

- 鉴定结果默认 `mode = hunt`，进入战利品。
- 揭晓页 / 档案页可「加入珍藏柜」：`mode = keep`、`status = kept`，**不重抽、不改币值**。
- 珍藏柜使用证书式卡片：双线金框、拱形取景窗、烫金印章、入藏日期、探访次数、编号。
- 探访：`visits + 1`，更新 `lastVisitAt`。
- 包浆纹理与 7/30/100/365 天里程碑**未实现**，只有探访次数。

### 6.8 幂等、缓存与持久化

- `requestKey = SHA-256(imageHash | mode | persona | note | promptVersion | engineVersion)`。
- 相同 `requestKey` 直接返回旧藏品，不推进计数、不重复发奖励。
- 提交事务同时写入：
  - `assets`（原图 / 抠图 Blob）
  - `items`（藏品）
  - `appraisals`（审计 + 幂等键）
  - `player`（次数、币值、pity、每日状态）
  - `bounties`（盖章状态）
  - `settings`（读取图片保留开关）
- 多标签页并发依赖 IndexedDB `readwrite` 事务串行化。
- 不持久化 `blob:` URL；只在当前页面用 `URL.createObjectURL` 展示，卸载时 revoke。

### 6.9 视觉与交互

- 深色默认：深蓝黑 `#080C16`、面板 `#101827`、金色 `#F7C66A`、紫色 `#A67CFF`、传说红 `#FF3B53`。
- 支持浅色主题「展厅」：暖纸色背景、压深强调色；卡面内部通过 `.keep-dark` 还原暗色。
- 移动端最大舞台 560px，桌面 1240px 双栏。
- 按钮圆角 14px、卡片 20px；按下缩放、弹簧反馈。
- 支持 `prefers-reduced-motion` 与设置内「减少动画」；关闭震屏、粒子与长扫描。
- 音效由 Web Audio 合成，可全局静音。
- 移动端底部导航：首页 / 鉴定 / 展厅 / 设置；桌面端顶部导航 + 余额 + 建模券 + 静音 + 主题。

---

## 7. 90 秒演示脚本

| 时间 | 操作 | 展示点 |
| --- | --- | --- |
| 0–10s | 打开 `/` | 品牌 Hero、金色标题、三位鉴定师、开始鉴定 |
| 10–25s | 进入 `/appraise`，点「希腊风味酸奶」样例 | 真实照片走完整压缩管线；提示样例仅为流程体验 |
| 25–35s | 写一句附言，选「阿黎」，猜「史诗」 | 附言声明、鉴定师人设、竞猜交互 |
| 35–45s | 点「开始鉴定」 | 流程页阶段推进；若开抠图，展示进度；可提前关闭抠图加快演示 |
| 45–60s | 揭晓页 | 扫描节奏、卡面落位、五档光效；点「跳过」 |
| 60–70s | 「加入珍藏柜」→「查看藏品档案」 | 卡面翻面、评分、币值、海报按钮 |
| 70–80s | 打开 `/showroom` | 五档真实照片、传说「大红」全屏预览、明确预览标识 |
| 80–90s | 滚到「大红 · 3D 陈列」拖动旋转 | GLB / 程序化几何、徽标如实标注「本地建模」 |

可选加分项：

- `/gallery` 双 Tab、筛选、排序。
- `/settings` 切换浅色主题、导出备份。
- 侧栏悬赏告示牌：命中的任务会盖章。

---

## 8. 项目结构

```text
today-loot/
├── README.md                    # 人类使用说明（入口）
├── docs/
│   ├── PLAN.md                  # 产品 / 技术 / 复现基线
│   └── AGENTS.md                # Agent 执行纪律
├── .env.example                 # 占位符配置
├── public/
│   ├── images/image1-6.jpg      # 五档预览与内置样例真实照片
│   ├── pngs/                    # 三位鉴定师、合影
│   ├── icons/icon.svg           # 品牌 / PWA 图标
│   ├── manifest.webmanifest     # PWA manifest
│   ├── models/dahong.glb        # 本地程序化 3D 模型
│   ├── models/dahong.meta.json  # 模型来源标注
│   └── demo/*.svg               # 早期占位素材（当前页面未引用）
├── src/
│   ├── app/
│   │   ├── page.tsx             # 首页
│   │   ├── appraise/page.tsx    # 鉴定台
│   │   ├── appraise/run/page.tsx# 鉴定流程
│   │   ├── reveal/[id]/page.tsx # 揭晓
│   │   ├── gallery/page.tsx     # 展厅
│   │   ├── item/[id]/page.tsx   # 藏品档案
│   │   ├── showroom/page.tsx    # 效果陈列室
│   │   ├── settings/page.tsx    # 设置
│   │   ├── layout.tsx           # 根布局 / metadata / 主题脚本
│   │   ├── globals.css          # 设计 Token / 主题 / 动画
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── identify/route.ts
│   │       └── model3d/{route.ts,[taskId]/route.ts,asset/route.ts}
│   ├── components/
│   │   ├── layout/              # AppShell / AppHeader / BottomNav / ThemeToggle
│   │   ├── cards/LootCard.tsx   # 正反面卡牌、稀有度徽标、翻转、tilt
│   │   ├── reveal/RevealSequence.tsx
│   │   ├── bounties/BountyBoard.tsx
│   │   ├── gallery/             # HuntTile / KeepTile
│   │   ├── home/RecentRail.tsx
│   │   └── model3d/ModelViewer.tsx
│   ├── features/
│   │   ├── game/                # rarity / engine / scoring / rng（纯函数）
│   │   └── bounties/generate.ts
│   ├── lib/
│   │   ├── ai/                  # schema / prompt / mock / fixtures / qwen / client
│   │   ├── db/                  # db / repository / cutouts
│   │   ├── image/               # process / cutout / poster
│   │   ├── server/              # config / tripo（server-only）
│   │   ├── hooks/               # useHealth / useAssetUrl
│   │   ├── utils/               # cn / id / text
│   │   ├── appraise-session.ts  # 鉴定台 → 流程页一次性会话
│   │   ├── sfx.ts               # Web Audio 音效
│   │   ├── store.ts             # Zustand
│   │   └── theme.ts             # 主题持久化
│   └── types/index.ts           # 领域类型
├── scripts/
│   ├── calibrate-rarity.ts      # 概率校准
│   ├── verify-live.ts           # 单次真实识别验证
│   ├── tripo-generate.ts        # 单次 Tripo 建模
│   ├── build-dahong-model.ts    # 本地程序化 GLB
│   ├── check-security.mjs       # 密钥 / 客户端产物扫描
│   └── tmp-cutout-success.mjs   # 临时调试脚本（不在 npm scripts）
└── tests/
    ├── unit/                    # rarity / scoring / schema / mock
    ├── integration/             # api / repository
    ├── e2e/smoke.spec.ts
    ├── helpers/vision.ts
    └── stubs/server-only.ts
```

---

## 9. 测试与质量

### 9.1 命令

```bash
npm run typecheck       # TypeScript
npm run lint            # ESLint
npm run test            # Vitest：规则 / 评分 / Schema / Mock / 仓储 / API
npm run build           # 生产构建
npm run test:e2e        # Playwright 主旅程 + 390/1440 溢出检查
npm run verify:security # 检查客户端产物与 .env 安全
npm run verify:all      # typecheck + lint + test + build + security
npm run calibrate -- 200000 20261022 9
```

### 9.2 当前结果（2026-10-24 复跑）

| 检查 | 结果 |
| --- | --- |
| `typecheck` | 通过 |
| `lint` | 通过 |
| Vitest | **57 tests / 6 files 全部通过** |
| Playwright | **7 tests 全部通过**（约 42 秒） |
| 生产 `build` | 通过 |
| `verify:security` | 扫描全部客户端产物，未发现密钥 |

E2E 覆盖：

1. 390px 五个页面无横向溢出、无控制台异常。
2. 完整鉴定闭环：样例 → 流程页 → 揭晓 → 战利品 → 珍藏柜 → 档案 → 刷新持久化。
3. 陈列室传说红卡全屏预览与「预览」标识。
4. 1440px 桌面双栏布局与主导航。
5. 浅色主题切换与刷新保持。
6. 抠图失败回退原图相框且不阻断鉴定。
7. 设置页展示服务端模式且不出现密钥。

### 9.3 校准结果

`npm run calibrate -- 200000 20261022 9`（种子 `20261022`，日均 9 次）：

| 档位 | 目标 | 业务场景 | 偏差 |
| --- | --- | --- | --- |
| 普通 | 13% | 12.63% | -0.37 |
| 精良 | 30% | 30.13% | +0.13 |
| 稀有 | 34% | 33.92% | -0.08 |
| 史诗 | 17% | 16.77% | -0.23 |
| 传说 | 6% | 6.54% | +0.54 |

基础抽样（不启用保底/新手/每日）为 `15.97 / 38.40 / 27.14 / 15.00 / 3.48`，显著低于目标，属预期：13/30/34/17/6 是启用全部机制后的长周期目标。

单测中另有 10 万次 Monte Carlo 断言，五档绝对偏差均 ≤ 2 个百分点。

---

## 10. 安全与隐私

- Key 只在 `src/lib/server/config.ts`、`src/lib/ai/qwen.ts`、`src/lib/server/tripo.ts` 读取，并显式 `import 'server-only'`。
- 前端只调用 `/api/identify`，从不接触 Key；当前项目不使用 `NEXT_PUBLIC_*`。
- `.env.local` / `.env` 已忽略；`.env.example` 只有占位符。
- 服务端二次校验图片：
  - 只接受 `data:image/(jpeg|png|webp);base64`；
  - 校验 MIME 与文件头魔数；
  - 拒绝远端 URL（避免 SSRF）；
  - 体积上限 `MAX_IMAGE_MB`。
- 日志只记录错误码、状态、脱敏后的少量诊断信息；不记录 Key、Authorization 头、完整图片或完整模型输入。
- 同一图片+模式+鉴定师+附言 1 小时内命中服务端缓存，不重复计费。
- 藏品、图片、币值、保底进度保存在本机 IndexedDB，不上传服务器。
- `.next` 安全头：`X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options`、`Permissions-Policy`（仅允许本页摄像头）。
- 备份文件包含藏品图片 Base64，体积可能较大，需用户自行妥善保存。

---

## 11. 已实现 / 未实现

### 11.1 已实现

- 品牌首页、移动端底部导航、桌面端顶部导航与双栏舞台。
- 相机 / 相册 / 拖拽上传、压缩、预览、重拍、三张真实样例。
- 60 字附言、三位鉴定师、五档竞猜、对数币值滑块、今日悬赏。
- Mock / Live 双提供者、Zod 契约、无 Key 降级且明确标注。
- 五档卡面、扫描揭晓、传说红卡柔光/粒子/音效、跳过与静音。
- 交易式入藏、展厅双 Tab、筛选、排序、详情、翻面、海报导出、转珍藏、碎卡。
- 效果陈列室五档真实照片预览、传说「大红」全屏预览、3D 展台。
- 每日悬赏生成、命中判定、奖励与重复领取保护。
- 设置：主题、音效、减少动画、图片保留、本地抠图、JSON 备份导入导出、清空数据。
- PWA manifest 与图标、响应式、reduced-motion、错误/空/加载态。
- 57 个单测/集成测试、7 个 Playwright E2E、20 万次校准脚本、安全检查脚本。

### 11.2 未实现 / 明确限制

- **珍藏模式鉴定入口**：当前鉴定固定使用摸金文风 `mode: hunt`；「加入珍藏柜」只改分组，不重新生成珍藏文案。`origin/story/monologue` 契约与证书展示已就绪，但正常流程不会产生这些字段。
- **珍藏岁月包浆**：只有探访次数与最近访问时间，没有 7/30/100/365 天纹理与词条解锁。
- **加注 / 碎卡返还 / 完整统计面板**：未做加注经济循环；碎卡不返还收藏币。
- **建模券消耗 / 档案页发起 3D**：传说入藏会发券，但当前没有「消耗券生成 3D」的 UI；3D 入口跳转效果陈列室的样例展台。
- **Tripo 真实生成**：适配层、API Route、脚本已就绪；本仓库真实调用次数为 0。当前 `dahong.glb` 是本地程序化模型，展台徽标如实标注「本地建模」。
- **Service Worker 离线缓存**：只有 manifest，没有 SW。
- **手动裁剪 / 旋转**：上传后只能重拍或换图。
- **P2**：AR、3D 展厅漫游、社交、排行榜、账号云同步、金币商城等未实现。
- `DEMO_ACCESS_CODE` 仅上报配置状态，未做访问码校验。
- 真实模型内容质量抽检（20 张 / 50 条）尚未执行。
- 截图/校准数据来自本地 Chromium；iOS Safari 真机未实测。
- 仓库未附 `LICENSE` 文件；第三方依赖遵循各自许可（尤其 `@imgly/background-removal` 为 AGPL-3.0）。

---

## 12. 常见问题

### Q1：启动后一直是演示数据？

检查 `.env.local`：

```dotenv
AI_MODE=live
ALLOW_LIVE_APPRAISE=true
DASHSCOPE_API_KEY=...
```

然后**重启**服务，访问 `/api/health` 确认 `liveReady: true`。设置页也会显示当前状态。

### Q2：真实识别报 `bad_json` / 空内容？

- 确认模型支持图片输入与 `response_format: json_object`。
- 本实现已传 `enable_thinking: false`，避免思考内容占满输出额度。
- 失败不会自动重试；请手动重试或显式切换演示识别。
- 查看服务端日志中的 `[identify] live failed code=...` 与 `[qwen]` 脱敏诊断。

### Q3：429 / 额度受限？

- 可能是百炼账户额度或频率限制，也可能是本地 `MAX_DAILY_LIVE_REQUESTS` 用完。
- 内存计数在服务重启后清零；生产环境请按实际配额调整。

### Q4：抠图一直很慢或失败？

- 首次需下载约 40–65MB 模型；慢网可能触发「90 秒无进度」判定。
- 失败会自动回退原图相框，不阻断鉴定。
- 演示时可在设置关闭「本地抠图」。

### Q5：3D 区域是几何体而不是奶茶杯？

- 说明 `public/models/dahong.glb` 缺失或加载失败，页面回退程序化几何。
- 本地模型可用 `npm run model:build` 重新生成。
- 真实 Tripo 产物需联网执行 `npm run tripo:generate -- --image images/image4.jpg --yes`。

### Q6：刷新后图片/藏品没了？

- 数据在 IndexedDB；隐私模式、清理站点数据、换浏览器都会导致看不到。
- 用设置页「导出 JSON 备份」迁移；导入会覆盖本机数据。
- 流程页的待鉴定图片只存在内存，刷新会回到鉴定台。

### Q7：`npm run verify:security` 报 `.next/static` 命中？

- 先确认是不是变量名字样（如文档字符串）而非真实 Key。
- 再确认 `.env.local` 的值没有被写进客户端文案。
- 不要用删除检查或放宽规则来“修复”。

### Q8：E2E 起不来？

```bash
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E 默认占用 `3100` 端口；如已有服务，设置 `E2E_BASE_URL`。

### Q9：刷新揭晓页一直显示「正在读取鉴定档案」？

该问题已在 2026-10-24 修复：硬刷新时 `useParams()` 可能短暂为空，页面现在会从 `usePathname()` 解析藏品 ID 兜底。若仍复现，请重新 `npm run build` 后重启，避免运行旧产物。

---

## 13. 开发日志

### 2026-10-24 · 文档整理与全量复跑

- 重写 `README.md`：补充项目概述、详细功能、模型调用、环境配置、启动与排错。
- 重写 `docs/PLAN.md`：以当前代码为准，整理可复现的产品、规则、AI 契约、数据结构、API、页面与文件清单。
- 重写 `docs/AGENTS.md`：补充「从零重建」执行流程、验收命令与禁止事项。
- 目录整理：`PLAN.md` / `AGENTS.md` 移入 `docs/`；根目录 `pngs/` 原图并入 `public/pngs/` 并按展示尺寸压缩。
- 修复 `/reveal/[id]` 硬刷新时路由参数短暂为空、页面永久停在「正在读取鉴定档案」的问题。
- 复跑：`typecheck` 通过、`lint` 通过、Vitest **57/57**、Playwright **7/7**、`build` 通过、安全检查通过。
- 校准：`200000` 样本 / 种子 `20261022` / 日均 9 次，业务场景五档偏差 ≤ 0.54pp。
- 本次文档整理**未发起任何真实模型调用**；历史真实调用记录见下。

### 2026-10-23 · M0–M2（P0 闭环）

- 初始化 Next.js 15 + TS + Tailwind 4，建立设计 Token、暗色 HUD、五档主题与品牌图标。
- 完成 Dexie 仓储与单事务提交、requestKey 幂等、资产 Blob 存储。
- 完成规则引擎并通过 10 万次模拟校准（业务场景全部 ≤ 0.6pp 偏差）。
- 完成 Mock/Live 适配器、Zod 契约、服务端限流与缓存、错误映射。
- 完成首页、鉴定台、揭晓、展厅、详情、陈列室、设置。
- 完成单元/集成测试与 Playwright E2E，生产构建与安全检查通过。
- 修复：演示样例与识别物不一致、预览关闭按钮遮挡「跳过」、移动端横向溢出检查。

### 2026-10-23 · 真实 API 单次验证与故障修复

- 现象：鉴定后前端报错，服务端日志为 `[identify] live failed code=bad_json status=502`（连续两次）。
- 排查：`/models` 返回 200，鉴权与接入点正常；`qwen3.8-flash` 在模型列表中。
- 高概率根因：Qwen3.8-Flash 默认开启思考模式；`max_completion_tokens=1400` 可能被 `reasoning_content` 消耗完，最终 `content` 为空，被判定为 `bad_json`。
- 修复：请求体增加 `enable_thinking: false`，输出额度提升到 3000；失败时输出脱敏诊断日志（状态码、内容类型、finish_reason、reasoning 长度、截断内容）。
- 验证：`images/image2.jpg`，HTTP 200，5976ms，识别为「英菲克（inphic）纯白静音鼠标」，Zod 契约通过。
- 调用次数：修复前用户端 2 次失败请求，修复后 1 次成功请求；未做自动重试或批量测试。

### 2026-10-23 · 单模式 + 鉴定流程页 + 悬赏告示牌

- 取消「摸金 / 珍藏」双模式开关，改为单一鉴定：结果一律先入战利品，揭晓后可「加入珍藏柜」（只改分组，不重抽）。
- 新增 `/appraise/run`：抠图（开启时）→ 视觉鉴定 → 封存档案；失败如实提示、仅手动重试，不自动重试。
- 抠图超时改为「90s 无进度」判定 + 10 分钟硬上限，慢网首次下载不再被 90s 总时长误杀。
- 今日悬赏改为赏金猎人告示牌（`BountyBoard`）：只有命中才盖章，未命中不打叉，按日自动刷新。
- 效果陈列室五档改用 `images/` 真实照片（笔记本 / 鼠标 / 酸奶 / 键盘 / 大红奶茶）。
- Tripo v3 适配层与 `npm run tripo:generate` 落地；沙箱网络不通，未产生真实建模调用。

### 2026-10-23 · 3D 陈列可演示

- 新增 `scripts/build-dahong-model.ts`（`npm run model:build`）：手写 glTF 2.0 二进制，生成奶茶杯模型（杯身 / 奶盖 / 杯口压圈 / 红色标签 / 吸管 / 杯底珍珠），写入 `public/models/dahong.glb`。
- `/api/model3d/asset` 回传 `meta.generator`，展台徽标据此显示「本地建模」或「Tripo 生成」，不冒充。
- Tripo 通路保持可用但本沙箱不可达，真实建模调用仍为 0。

### 尚未执行

- 真实模型内容质量抽检（20 张 / 50 条）。
- `npm run tripo:generate -- --image images/image4.jpg --yes`：需在可访问 `openapi.tripo3d.ai` 的环境执行，产出 `public/models/dahong.glb`。

---

## 14. 素材与许可

- `public/images/image1-6.jpg`：项目内使用的真实物品照片，用于样例与五档预览。
- `public/pngs/*.png`：三位鉴定师与合影素材。
- `public/icons/icon.svg`：品牌 / PWA 图标。
- `public/models/dahong.glb`：由本项目脚本程序化生成，非 Tripo 产物。
- `public/demo/*.svg`：早期占位素材，当前页面未引用。
- 音效由 Web Audio API 程序化合成，无第三方音频文件。
- 不使用未授权品牌、图片或字体文件。
- 卡面 ◎ 数值、藏品来历、证书内容均为游戏虚构内容，不代表真实价格或鉴定结论。
- 第三方依赖遵循各自许可；`@imgly/background-removal` 为 **AGPL-3.0**，商用/分发前请自行评估。
- 仓库当前未附 `LICENSE` 文件。

---

## 15. 文档索引

| 文档 | 用途 |
| --- | --- |
| `README.md` | 人类使用说明：概述、功能、模型、环境、启动、测试、排错 |
| `docs/PLAN.md` | 唯一产品与实现基线：可复现的规则、契约、页面、数据、文件清单 |
| `docs/AGENTS.md` | Agent 执行纪律：红线、阶段、验收命令、禁止事项 |

> 如果三份文档与代码冲突，以 **当前代码 + `docs/PLAN.md`** 为准；`docs/AGENTS.md` 负责约束执行方式。
