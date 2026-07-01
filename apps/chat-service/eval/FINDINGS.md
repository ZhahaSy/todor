# Eval 发现的问题（FINDINGS）

记录每次 eval 跑出的真实问题。**这是 eval 价值的直接证据**——能抓出单元测试发现不了的 agent 行为缺陷。

---

## 2026-06-22 首次完整评测（model: deepseek-v4-flash）

### 🔴 P1｜AI 建的待办时间/内容为空（真实生产 bug）

**现象**：`reminder-*` 用例参数断言稳定失败（3/3）。

模型实际传的参数：
```json
{"title":"产品评审会","time":"2026-06-23 09:00","description":"明天上午9点开产品评审会"}
{"title":"产品评审会","time":"明天上午9:00"}                        // 连日期都没解析
{"title":"给妈妈打电话","time":"2026-06-22 20:00"}                  // 漏传 content
```

**根因**：`create_reminder` 的 schema 字段是 `todoTime` / `content`，工具代码读
`input.todoTime` / `input.content`。但 deepseek-v4-flash **稳定地**把它们传成 `time` /
`description`（schema 里不存在的字段），且常漏传 `content`。

注意：`title` 字段模型每次都传对了——区别在于 `title` 是通用命名，模型自然会用；
`todoTime` 是自定义命名，模型"猜"成了更常见的 `time`。

**生产后果**：`input.todoTime` = `undefined` → 排程邮件时间错乱；`input.content` =
`undefined` → 待办内容空白。即"提醒我明天9点开会"建出来的待办，**时间和内容很可能是空的**。

**为什么单元测试没发现**：`agent-chat.service.spec.ts` 用的是 mock model + 硬编码的
工具调用参数，参数永远是"对的"。只有用真模型跑 eval，才暴露"真模型不按 schema 传参"。

**状态**：已记录，暂不修（按"先建立基线再优化"的原则，留改前快照）。
修复方向见下方"候选修法"。

### 🟡 P2｜weather_query 指定城市时不提取城市名

**现象**：`weather-03`（"上海现在几度"）模型传空 `{}`，没提取 "上海"。
靠工具内部 IP 兜底定位能出结果，但不是用户要的城市。

### 🟡 P3｜建待办意图偶发漏识别

**现象**：`reminder-03`（"帮我记一个紧急的工作待办…"）3 次里有 1 次没调
`create_reminder`（纯文本回复）。模型波动，非稳定。

### ✅ 工具"选择"层面健康

抛开参数问题，工具**选得对不对**几乎全对：闲聊不乱调、天气/待办/查询识别准确、
复合意图能连调两个工具。问题集中在**参数 schema 遵循**这一层，不是 agent 主体设计问题。

---

## 候选修法（针对 P1）

1. **改 schema 迎合模型**：字段改成模型习惯的通用名（`time`/`description`），或加更强的
   `.describe` 约束。最简单，跟模型习惯走。
2. **工具内做容错映射**：保留 schema，在 `run()` 里兼容 `time→todoTime`、
   `description→content`，并对自然语言时间（"明天上午9:00"）做解析。鲁棒但表面掩盖了模型问题。
3. **换/约束模型**：v4-flash 的 function-calling 遵循偏弱，更强的模型可能直接缓解。

修复后**重跑 eval 对比**，验证参数正确率提升——这正是 eval 体系的闭环用法。

---

## eval 自身的修复

- judge 的 JSON 解析失败过去会**中断整个评测**（一条 `privacy-01` 的 judge 返回非法 JSON
  导致全部前功尽弃）。已改为：单次 judge 失败仅跳过该次采样，不影响全局（`run.ts`）。
- 失败用例现在会打印实际 `toolCalls` 参数与失败原因，便于判断"模型错"还是"断言太严"。

---

## 2026-06-22 LLM-judge 校准（量化 judge 可信度）

把首轮报告里 24 条真实回复冻结成校准集（`calibration/dataset.json`），人工预标金标准，
让 judge 对冻结样本重判 3 次，比对人机一致性。详见 `calibration/report.md`。

### 🔴 重大发现：faithfulness judge 有系统性误报，Kappa=0

- 一致率 83.3% 看似还行，**但 Cohen's Kappa = 0（极弱）**——一致全靠"绝大多数样本本就无幻觉"
  （15 个 TN），judge 闭眼全判"无幻觉"也能蒙这么高。它没有真正的判别力。
- 混淆矩阵 FP=3，**全部来自 privacy-01**：judge 三次三票判"幻觉"，但名字"小明"是对的。
- **根因**：faithfulness judge 的 prompt 只让它拿 `toolData` 当依据，**不认 system prompt 里
  已提供的用户身份信息（名字）是合法来源**。凡 toolData 里没有的事实一律判幻觉。
- **直接后果**：首轮 eval 报告的"幻觉 4 次"里至少 3 次是 judge 误报，不是模型真幻觉。
  **没有校准，就会拿着一个错误的幻觉率去优化一个不存在的问题。**
- 状态：**已记录，暂不修 judge**（保留为已知缺陷）。修法很简单：judge prompt 补一句
  "用户基本身份信息属已知上下文，不算编造"。

### ✅ quality judge 高度可信

- 人均分 4.92 vs judge 均分 4.88，MAE=0.21，**±1 分内吻合率 100%**（人复核金标准后）。
- 质量维度的 judge 评分可直接采信。两条 ≥2 分分歧（chitchat-04#1 / chitchat-01#2）属边界主观差异。

### 方法论价值（写进作品集）

> "quality judge 与人工 ±1 分内吻合 100%，可信；但 faithfulness judge 的 Kappa=0，
> 存在系统性误报，不可直接信任。" —— 不仅做了 eval，还量化了它哪里可信、哪里不可信、为什么。

校准的指标计算（一致率/Kappa/MAE）有独立 selftest（`calibration/metrics.selftest.ts`，15/15）。

---

## 2026-06-22 记忆抽取器评测（`pnpm eval:memory`，model: deepseek-v4-flash）

第二期抽取器第一版，用走例子攒的 11 条金标准（`cases/memory-extract.cases.json`）验证分类准确率。

### 结果（10 用例 × 2，delete 类不归抽取器跳过）
```
shouldRemember（该不该记）: 20/20  (100%)  ← 命门，满分
confidence:                14/14  (100%)
category:                  14/14  (100%)
route:                     11/14  (79%)
value:                      8/14  (57%)  ← 短板
```

### 🟢 抽取器的反幻觉闸是严的
`shouldRemember` 100%：所有反例（老王过敏=无关第三方、"要是我…"=假设、"今天好累"=情绪）
全部正确判为不记；所有正例全部判为该记。**不误存垃圾、不漏记事实。** confidence/category 也 100%。

### 🔴 value 仅 57%，且系统性偏高
模型分不清 high/medium 界线，且**倾向判高**（考研 high→medium；养猫/美式/改口 medium→high）。
**危险**：偏高会把本该"二次确认"的 medium 误判成 high 而静默存——踩中"未经确认就写库"红线。

**→ 直接驱动了设计修正**：决策表从"value 驱动"改为"**confidence 驱动**"（见
`docs/long-term-memory-design.md §3`）。只用 eval 实测 100% 的 shouldRemember + confidence 做
"静默存 vs 二次确认"硬决策，value 降级为召回排序参考。

**这就是"先验证再开自动写入闸"的价值**：若不验证直接上自动写入，value 的 57% 会悄悄
导致档位误判、未确认写库。eval 把它在写一行生产代码前就拦下了。

### 🟡 route 79% + 已知局限：抽取器只返回单事实
`mem-multi-fact`（"我是程序员，喜欢爬山，对海鲜过敏"）失败：抽取器目前只返回**单个** memory，
没拆多事实，所以"程序员→User.job"没被单独路由。多事实拆分留后续迭代。

---

## 2026-06-24 自动记忆端到端真聊验证（起真服务，zsy 账号，6 组案例）

eval（mock、单点、隔离）通过 ≠ 端到端没问题。真聊抓出 3 个 eval 结构上发现不了的问题：

### 🔴 双写 bug（修复）
同一句"我对花生过敏"在库里存了 2 条。根因：**第一期的 `save_memory` 工具（agent 显式调）
和第二期的 `autoExtractMemory`（后台自动）两条写入路径叠加**，各存一次。
→ 修：`MemoryService.hasSimilarActive`（同 userId+subject、content 互相包含视为重复），
自动写入前查重跳过。真聊复测：花生发两次只存 1 条。

### 🔴 路 C 缺陷：同类多事实召回不全（修复）
存了"花生过敏"+"海鲜过敏"（都 self/health），清掉对话历史纯库召回时**只返回海鲜，花生漏了**。
根因：路 C"同 subject+category 取最新一条"把**多个并存事实**误当成**改主意的新旧版本**。
→ 修：召回改为**返回同类全部 active**，不再取最新去重。写入侧靠 hasSimilarActive 防近重复，
真正的"改主意"supersede 留第三期。两害取轻：多事实漏召回 >> 改主意偶尔并存。真聊复测：花生+海鲜都召回。

### 🟡 老王误存：低频非确定性（加固）
"我朋友老王对海鲜过敏"——eval 里 6/6、30/30 都正确不存，但**真聊偶发存了一次**。
印证"小样本通过率会骗人"（同 judge 校准的教训）。temp=0 下 LLM 仍有低频非确定性。
→ 加固：抽取 prompt 补显式反例锚点（老王=无关第三方→[]）。复测 30/30 稳定不存。
顺带修了 prompt 里"shouldRemember=false"的措辞遗留（多事实改数组后该字段已不存在）。

### 召回验证的方法学坑
首次召回"成功"是假象——模型从 **Redis 短期对话历史**（同会话里刚说过）读的，没真查库。
必须**清掉会话历史**才能验证"纯靠记忆库召回"。否则会话历史会掩盖召回功能的真实状态。

**结论**：eval 验证"单次判断在受控输入下对不对"，真聊验证"多路径叠加/非确定性翻车/状态污染"。
二者盲区互补，缺一不可。

---

## 2026-06-24 P1 修复闭环：create_reminder 参数 bug（含 eval 自身的方法论修正）

起因：用户反馈"回答快但效果不好"。先给 eval 加了 **depth/充分度** 维度 + 6 条开放问答用例，
实测开放问答深度 4.92/5（并不浅）——**数据否定了"答得浅"的直觉**，把矛头转回 P1 参数 bug。

### ✅ P1 已修（schema 加强描述 + 降必填）

采用候选修法 1（不引入隐式容错层，保留 schema 显式性）：
- **必填字段加反例引导**：`todoTime` 的 describe 明确"字段名是 todoTime，不要用 time/date/deadline，
  需把'明天上午9点'换算成 YYYY-MM-DD HH:mm 绝对时间"；`title` 加示例。
- **非核心字段降为可选 + 兜底**：`content`/`type`/`priority`/`isUrgent` 改 `.optional()`，
  describe 点名"不要用 description/message"并给默认值；`run()` 里兜底
  （content 缺→用 title，type→life，priority→medium，isUrgent→false）。
  这样模型"觉得用户没明说就整条摆烂不调工具"的问题也消除了。
- 字段名**保持不变**，兼容现有 DB schema，零迁移。

**修复前→后**（reminder-* 各跑 3 次）：reminder-01 `0/2 → 3/3`、reminder-03 `0/2 → 3/3`、
edge-01 稳定 `3/3`、reminder-02 `0 → 3/3`。

### 🔴 eval mock 的方法论坑：空 schema 会凭空夸大 bug

修复时发现 `mocks.ts` 的 `createReminderToolMock` 用的是 `noopSchema`（passthrough 空对象），
**完全不带真实工具的字段定义与 describe**。即过去 eval 测的是"模型在零字段引导下瞎传"，
这**夸大了 bug 严重度**，也使"加强 schema 描述"这类修法在 eval 里根本测不出效果。
→ 修：新增 `stubToolWithSchema`，`create_reminder` 桩改用**生产同款 `reminderSchema`**
（从 `create-reminder.tool.ts` 导出复用），只隔离写库/排程副作用。
**教训：评估「参数正确性」时，桩必须沿用真实 schema，否则测的是另一回事。**

### 🟡 修掉一条 flaky 用例

reminder-02 原输入"今晚8点"依赖"当前时刻还没到20:00"——跑得晚时模型会正确反问
"今晚8点已过，要改明天吗"（这其实是**对的**行为）导致断言失败。
→ 改为"明晚8点"（`offsetDays:1`），消除对当前时刻的依赖。**这条本身也印证了模型不傻：
过期时间会主动确认而非默建残缺待办。**

### depth 维度小结（新增能力）

`judgeDepth` 与已校准的 `judgeQuality` 正交：quality 测切题/自然，depth 测信息增量
（5=具体可操作有依据，1=正确废话）。rubric 明确"充分≠啰嗦，复述/套话/凑字数不加分"，
防止放开长度后 judge 奖励长篇废话。selftest 仍 12/12（depth 是 LLM 调用，不进离线自检）。
