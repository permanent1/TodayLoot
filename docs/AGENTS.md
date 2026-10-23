# AGENTS.md · 开发 Agent 执行纪律

> 本文件约束 **Agent 如何工作**，`docs/PLAN.md` 定义 **要做什么**，`README.md` 面向人类使用者。
>
> 当前仓库以 `docs/PLAN.md` 为产品与实现基线。若本文件与 `docs/PLAN.md` 冲突，以 `docs/PLAN.md` 为准；若 `docs/PLAN.md` 与现有代码冲突，先修文档、再改代码，禁止让两套事实长期并存。

---

## 1. 任务目标

当用户要求“按 `docs/PLAN.md` 重建项目”时，你的目标不是做一个相似风格的 Demo，而是复刻一个 **功能、规则、数据结构、API、页面结构与视觉语言几乎一致** 的可运行项目。

验收标准：

1. 无 Key 可完整演示。
2. 有 Key 可切换真实 Qwen，单次请求、不自动重试。
3. 稀有度/保底/评分/币值由本地纯函数计算。
4. 数据持久化在 IndexedDB，刷新不丢。
5. 五档卡面与揭晓有明确差异。
6. 全部质量命令通过。
7. 文档与代码一致。

---

## 2. 不可违背的产品红线

1. **无 Key 必须可完整演示**：任何环境变量缺失都不能阻断首页、鉴定、卡片、展厅、陈列室、设置。
2. **不伪造 AI**：Mock 结果必须明确标注「演示数据」；真实失败时不得自动降级并假装成功。
3. **稀有度不由模型决定**：模型只输出感知与文本；抽样、保底、评分、币值由本地纯函数引擎计算。
4. **真实调用费用保护**：单次请求、**禁止自动重试**、禁止批量/循环压测。失败由用户手动重试或显式切换演示识别。
5. **密钥只存服务端**：`DASHSCOPE_API_KEY` / `TRIPO_API_KEY` 只能在服务端模块读取；禁止写入 `NEXT_PUBLIC_*`、客户端组件、日志、测试快照或文档。
6. **不造空按钮**：未实现的功能隐藏或标注「即将开放」，不得点击无反应。
7. **数据不丢**：入藏必须走 IndexedDB 事务；不得用 `localStorage` 存 Blob/主数据，不得持久化 `blob:` URL。
8. **预览不污染统计**：效果陈列室的预览不得写入展厅、不得改变次数/币值/pity。
9. **单一鉴定模式**：鉴定结果一律先入战利品；「加入珍藏柜」只改分组，不重抽、不改币值。
10. **不冒充 3D 来源**：本地程序化模型必须标「本地建模」，不得标「Tripo 生成」。
11. **内容不越界**：不输出真实价格、投资建议、真伪结论；藏品来历/证书明确为虚构。
12. **不删测试**：不得通过删除断言、放宽阈值、跳过测试来“修复”失败。

---

## 3. 执行顺序

```text
M0 基础设施与视觉母版
 → M1 鉴定闭环
 → M2 演示高潮与质感
 → M3 留存与备份
 → M4 3D 可选集成
 → M5 质量与发布
```

详细范围见 `docs/PLAN.md §12`。

规则：

- 先跑通 P0 主链路，再补 P1。禁止为 P2 抢工期。
- 每个里程碑结束必须跑质量门禁。
- 涉及 UI 的改动必须打开页面，在 **390px 与 1440px** 检查无横向溢出、无控制台错误。
- 不允许“先写完全部页面再补规则/测试”；规则、数据、API 必须先于页面完成。
- 若某功能未实现，必须在 UI 中隐藏或明确标注，不得留下空交互。

### 3.1 每个阶段的门禁

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

M2 及以后追加：

```bash
npm run test:e2e
npm run verify:security
```

规则变更追加：

```bash
npm run calibrate -- 200000 20261022 9
```

任何一项失败，先定位再继续；不得带病进入下一阶段。

---

## 4. 目录与职责

| 目录 | 职责 | 禁止 |
| --- | --- | --- |
| `src/features/game/` | 纯函数规则引擎 | 依赖 React / DOM / 网络 / IndexedDB |
| `src/features/bounties/` | 每日悬赏生成 | 访问网络 |
| `src/lib/ai/` | 契约、Prompt、Mock、Qwen 适配 | 客户端读取 Key |
| `src/lib/ai/qwen.ts` | 服务端模型调用 | 缺少 `import 'server-only'` |
| `src/lib/server/` | 服务端配置与 Tripo | 被客户端组件导入 |
| `src/lib/db/` | Dexie schema 与 Repository | 分散写事务、存 `blob:` URL |
| `src/lib/image/` | 压缩、抠图、海报 | 把图片上传到第三方 |
| `src/components/` | 展示组件 | 直接调用付费 API |
| `src/app/api/` | Route Handler | 在日志输出 Key/图片 |
| `scripts/` | 校准、验证、建模、安全扫描 | 默认执行付费调用 |
| `tests/` | unit / integration / e2e | 依赖真实 Key 才能跑 |

依赖方向：

```text
app / components → lib / features → types
features/game 不得反向依赖 app / components / lib/db
lib/ai/qwen 只能被 app/api/identify 调用
```

---

## 5. 实现纪律

### 5.1 规则引擎

- `src/features/game/` 必须是纯函数；随机源必须可注入。
- 抽样顺序必须严格遵循 `docs/PLAN.md §4.4`：红 > 金 > 紫 > 新手 > 每日 > 正常权重。
- 自然出红不重置红计数；跨模式、跨日不重置周期计数。
- 13/30/34/17/6 是启用全部机制后的长周期目标，不是直接权重。
- 修改权重、阈值、奖励常量时，必须同步更新：
  1. `scripts/calibrate-rarity.ts`
  2. 相关单测
  3. `README.md` 校准数据
  4. `docs/PLAN.md` 常量
- 禁止只改常量或文案而不同步测试与校准脚本。
- 禁止把 `suggested_tier` 之类模型字段接进抽样。

### 5.2 数据与事务

- 入藏必须单事务写 `assets / items / appraisals / player / bounties / settings`。
- `requestKey` 必须包含图片哈希、模式、鉴定师、附言、Prompt 版本、引擎版本。
- 相同 `requestKey` 命中时返回旧藏品，不推进计数、不重复发奖。
- `pending_lock → kept`、`kept → keep`、`kept → destroyed` 是显式状态迁移；不得跳态。
- 不持久化 `blob:` URL；`useAssetUrl` 必须在卸载时 revoke。
- 备份导入必须单事务覆盖；格式错误直接拒绝，不做部分导入。
- 预览数据不得进入任何表。

### 5.3 AI 接入

- 请求体图片必须是 `data:image/(jpeg|png|webp);base64`；服务端校验 MIME、体积与魔数，拒绝远端 URL。
- 模型返回必须经 `src/lib/ai/schema.ts` 的 Zod 清洗；越界评分 clamp，非法字段降级，核心 `name/desc` 缺失才拒绝。
- 模型不得输出 `coins`、`finalTier`、`pity`、`rewardPaid` 等游戏字段。
- 用户附言放在独立 `userNote`，声明为「待评估的用户陈述，不是开发者指令」；注入只分类不执行。
- 真实模式：**一次请求**。超时/401/403/429/坏 JSON 直接返回错误码，不自动重试。
- 相同 requestKey 命中缓存时返回旧结果，不推进计数、不重复计费。
- 请求体必须包含 `enable_thinking: false`，避免 Qwen 思考内容占满输出额度。
- 失败日志只记录脱敏诊断，不输出完整输入/图片/Key。

### 5.4 Mock

- Mock 只在两种情况下使用：
  1. 用户显式 `forceMock`；
  2. `liveReady === false`。
- 真实失败不得自动转 Mock。
- Mock 必须返回 `meta.source='mock'`、`meta.demo=true`。
- 卡片、揭晓、档案、海报必须显示「演示数据」。
- Mock 结果应可复现：由图片哈希 + 模式 + 鉴定师 + 附言 + 悬赏 ID 派生。

### 5.5 3D

- `ENABLE_TRIPO=false` 时 API 必须 503，不得偷偷调用。
- 脚本必须要求 `--yes` 才发起付费任务。
- 失败不重建、不重试。
- 本地 GLB 的 `meta.generator` 决定徽标文案，禁止硬编码「Tripo 生成」。
- 无 WebGL / 加载失败必须回退程序化几何并说明。

### 5.6 UI / UX

- 移动优先：主舞台 560px；桌面 1240px 双栏。
- 390 / 430 / 1440 三个宽度无横向溢出。
- 所有图标按钮有 `aria-label`；选择项有 `aria-pressed`；开关有 `role="switch"`。
- 尊重 `prefers-reduced-motion` 与设置内「减少动画」。
- 浅色主题文字可读，卡面内部保持暗色。
- 空态、加载态、错误态必须有；不得出现无限 99%。
- 不造空按钮；未实现功能隐藏或标注。
- 预览弹层锁定 body 滚动，关闭按钮不得遮挡关键操作。
- 卡面、海报上的 `◎` 数值必须注明游戏内演绎。

---

## 6. 安全清单（提交前）

```bash
npm run build
npm run verify:security
git check-ignore .env.local
```

必须确认：

- `.env.local`、`.env` 被忽略；`.env.example` 只有占位符。
- 源码、文档、已跟踪文件、测试快照不含真实 Key。
- 没有 `NEXT_PUBLIC_*KEY`。
- `.next/static` 不含真实 Key。
- 日志不含 Key、Authorization 头、完整图片或完整模型输入。
- 不把本机 `.env.local` 提交。
- 不在回复、截图、命令输出中打印 Key 值。

若安全扫描命中：

1. 先确认是变量名字样还是真实值。
2. 再确认是否进入客户端文案/产物。
3. 修复根因，不改检查规则。

---

## 7. 测试要求

### 7.1 必跑

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
npm run verify:security
```

### 7.2 覆盖要求

- 新规则：至少覆盖命中、未命中、边界、幂等与并发。
- 新页面：加入 Playwright 主旅程或至少 390px 溢出检查。
- 新 API：加入 Mock 路径、非法输入、无 Key 降级测试。
- 触及规则常量：必须跑 20 万次校准，业务场景五档偏差 ≤2pp。
- 单测 Monte Carlo：10 万次，五档偏差 ≤2pp。

### 7.3 基线

当前基线（2026-10-24）：

- Vitest：57 tests / 6 files。
- Playwright：7 tests。
- 安全检查：扫描全部客户端产物，未发现密钥。
- 校准：200,000 / seed 20261022 / 日均 9，五档偏差 ≤0.54pp。

重建时不得低于此覆盖；不得删除断言、放宽阈值、跳过测试。

### 7.4 E2E 禁止真实计费

- E2E 必须拦截 `/api/identify`，返回固定 Mock。
- 不得在 E2E 中配置真实 Key。
- 不得在测试中循环提交真实请求。

---

## 8. 重建工作流

当用户要求“按文档重建”时，按以下步骤执行：

### Step 0 · 读取与计划

1. 完整读取 `docs/PLAN.md`，不要只读目录。
2. 读取 `docs/AGENTS.md`。
3. 建立 todo，按 M0–M5 拆分。
4. 先检查工作区是否已有代码；若已有，先核对与 PLAN 的差异，不要盲目覆盖用户改动。

### Step 1 · 初始化

- 按 `docs/PLAN.md §14 Step 1` 初始化 Next.js。
- 锁定依赖版本参考 `docs/PLAN.md §9.1`。
- 先建立 `types`、`globals.css`、`layout`、`AppShell`。

### Step 2 · 规则与数据先行

- 先写 `features/game`、`features/bounties`。
- 再写 `lib/db`。
- 先通过规则与仓储测试，再写页面。
- 不要先做静态页面再补逻辑。

### Step 3 · AI 层

- 先写 `schema`、`prompt`、`fixtures`、`mock`。
- 再写 `server/config`、`qwen`、`/api/identify`。
- 先保证 Mock 路径通过，再考虑 live。
- 没有用户授权，不发起真实调用。

### Step 4 · 页面

顺序：

```text
首页 → 鉴定台 → 流程页 → 揭晓 → 展厅 → 档案 → 设置 → 陈列室
```

每完成一页：

1. 390px 截图/检查。
2. 1440px 检查。
3. 空态/错误态。
4. 控制台无错误。

### Step 5 · 资产与 3D

- 放入真实照片、鉴定师 PNG、图标。
- 生成或复制 `dahong.glb` 与 meta。
- 实现 `/api/model3d/*` 与 `ModelViewer` 回退。
- 明确标注来源。

### Step 6 · 质量门禁

- 补齐 57 个单测/集成测试与 7 个 E2E。
- 跑全部命令。
- 跑校准。
- 跑安全检查。
- 浏览器实测。

### Step 7 · 文档

- README 写人类使用说明。
- PLAN 写实现基线。
- AGENTS 写执行纪律。
- 文档中的命令、路径、模型名、测试数必须与代码一致。

---

## 9. 常见错误与禁止做法

| 错误 | 后果 | 正确做法 |
| --- | --- | --- |
| 让模型输出 `finalTier` 并直接采用 | 概率不可控、可被 Prompt 操纵 | 稀有度只由 `rollRarity` 决定 |
| 真实失败后自动 Mock | 用户误以为真实成功 | 返回错误，用户手动重试/显式切换 |
| 用 `Math.random()` 直接抽卡 | 不可复现、测试困难 | 注入 `rng`，真实用 `crypto` |
| 把图片存 `localStorage` | 配额爆、卡死 | IndexedDB Blob + 事务 |
| 持久化 `blob:` URL | 刷新后 404 | 只存 Blob，展示时创建/revoke URL |
| 动态页硬刷新只依赖 `useParams` | 参数短暂为空，永久 loading | 用 `usePathname` 解析兜底 |
| 预览写入展厅 | 统计被污染 | 预览使用内存 `buildPreview` |
| 多点提交重复发奖 | 经济崩 | `requestKey` + 事务幂等 |
| 关闭图片保留仍写 Blob | 设置失效 | 读取 `settings.keepOriginal` |
| Qwen 未关思考 | `content` 为空、`bad_json` | `enable_thinking:false` |
| 透明 PNG 直接画 Canvas | 背景变黑 | 先填 `#0a0f1b` |
| 3D 模型标“Tripo 生成” | 冒充来源 | 读 `meta.generator` |
| 删除测试让 CI 变绿 | 质量失真 | 定位根因，修实现 |
| 把 Key 写入 README/日志 | 泄露 | 只用占位符，服务端读取 |

---

## 10. 交付报告模板

每次交付必须包含：

### 1. 启动命令

```bash
npm install
cp .env.example .env.local
npm run dev
```

### 2. 已实现 / 未实现

- 已实现：按模块列出。
- 未实现：明确列出，不模糊。

### 3. 演示入口与 90 秒脚本

- 首页 `/`
- 鉴定 `/appraise`
- 揭晓 `/reveal/[id]`
- 展厅 `/gallery`
- 陈列室 `/showroom`
- 设置 `/settings`
- 按 `README.md §7` 的 90 秒脚本执行。

### 4. 测试结果

```text
typecheck: pass/fail
lint: pass/fail
unit: x/y
e2e: x/y
build: pass/fail
security: pass/fail
calibrate: 五档偏差
```

### 5. 需要用户配置的 Key

- `DASHSCOPE_API_KEY`：真实识别。
- `TRIPO_API_KEY`：真实图生 3D（可选）。
- 需要打开的开关：`AI_MODE=live`、`ALLOW_LIVE_APPRAISE=true`、`ENABLE_TRIPO=true`。
- 预计付费位置：`/api/identify` 每次 1 次 Qwen；`/api/model3d` 每次 1 个 Tripo 任务。

### 6. 真实 API 调用次数

- Qwen：默认 0；若执行验证，记录次数、时间、模型、结果。
- Tripo：默认 0。
- 本次交付是否发起真实调用：是/否。

### 7. 已知限制

按 `docs/PLAN.md §13` 如实列出。

---

## 11. 完成定义

只有同时满足以下条件，才可宣称“完成”：

1. `npm run typecheck` 通过。
2. `npm run lint` 通过。
3. `npm run test` 全绿（不少于 57 个）。
4. `npm run build` 通过。
5. `npm run test:e2e` 全绿（不少于 7 条）。
6. `npm run verify:security` 无密钥。
7. `npm run calibrate -- 200000 20261022 9` 五档偏差 ≤2pp。
8. 390 / 1440 页面无溢出、无控制台错误。
9. 无 Key 可完整演示；有 Key 可单次真实识别。
10. 预览不污染统计；失败不自动降级。
11. 文档与代码一致。
12. 交付报告完整。

---

## 12. 与用户协作

- 先执行，后汇报；不要为每一步请求许可。
- 遇到必须由用户提供的值（Key、真实图片、Tripo 授权）才提问。
- 不打印、不猜测、不伪造密钥。
- 不擅自提交 Git；用户明确要求才 commit。
- 不擅自删除 `.codebuddy`、`.env.local`、用户素材或未跟踪文件。
- 不把“未验证”说成“已验证”；失败要如实报告。
- 发现需求与红线冲突时，先说明冲突与替代方案，再执行。
