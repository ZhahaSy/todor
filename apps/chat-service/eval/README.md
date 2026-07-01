# Agent Eval & Observability

给本项目的 AI agent（`AgentChatService`）做的**离线评估体系**与**运行时可观测性**。

> 一句话：能回答"改了 prompt / 换了模型之后，agent 到底变好了还是变坏了"。

## 为什么需要它

agent 是非确定性的——同一句输入，模型可能这次调对工具、下次纯聊天。单元测试（`*.spec.ts`）
只能验证"代码跑不跑通"，验证不了"agent 答得好不好"。没有 eval，任何对 prompt、工具描述、
模型的改动都是凭感觉，回归无从发现。

这套 eval 把"答得好不好"拆成**四个可度量的维度**：

| 维度 | 方法 | 成本 | 例子 |
|---|---|---|---|
| 工具选择正确性 | 确定性断言（读 trace） | 免费 | "今天天气"必须调 `weather_query`；"你好"不该调任何工具 |
| 参数正确性 | 确定性断言（读 trace） | 免费 | "提醒我明天9点"→ `todoTime` 日期应是明天 |
| 回复质量 | LLM-as-judge | 付费 | 回复是否切题、是否真回答了问题（按 rubric 打 1-5） |
| 忠实度（反幻觉） | LLM-as-judge | 付费 | 回复里的天气数字是否来自工具返回，而非编造 |

前两个是地基，**优先做扎实**——大多数 agent 回归都能被它们零成本抓住。

## 核心设计取舍：trace 从哪来

通常做 agent 可观测性会接 LangChain 的 `callbacks`（`handleToolStart/End`）。但**本项目的 agent
是手写的流式 tool-calling 循环**（见 `src/modules/ai/agent-chat.service.ts`），工具是循环里直接
`tool.invoke()` 调的，**不在 LangChain 的 runnable 链路内**——那套回调根本抓不到。

既然循环本身就持有每一步的全部信息（调了哪个工具、入参、返回、耗时、第几轮），最准确、最低成本
的做法就是**由循环直接 emit 结构化事件**，并在结束时收敛成一份 `RunTrace`（见 `src/modules/ai/agent-events.ts`）。
这份 trace 一份数据、两处复用：

- **离线 eval**：断言"该调的工具调了没、参数对不对"（本目录）
- **生产可观测性**：经 SSE 推前端做"正在查天气…"之类的工具调用可视化（`ai.controller.ts` 已发
  `tool_call` / `tool_result` 事件，前端旧版本会静默忽略，向后兼容）

## 工具副作用隔离

被测 agent 用**真 DeepSeek 模型**（工具选择决策必须是真的，否则 eval 没意义），但三个有副作用的
工具（天气打外部 API、待办写 SQLite、提醒排程邮件）替换成 **mock 桩**（`mocks.ts`）：

- 隔离副作用：eval 不真发邮件、不真写库
- 确定性：天气永远返回同一份桩，回复才可复现
- "调了没、参数对不对"**不靠桩记账**，全从 agent 自报的 `RunTrace` 读——这正是上面 trace 改造的价值

## 应对非确定性

- 工具选择 / 参数维度：每条用例跑 **k 次（pass@k）**，报告通过次数而非二值通过
- 质量评分：judge 多次采样取均值，降低 judge 自身噪声
- judge 用 `temperature=0` + 强制 JSON 输出

## 用法

在 `apps/chat-service` 下：

```bash
pnpm eval:selftest          # 离线自检评分器逻辑（不打模型，免费，秒级）
pnpm eval                   # 跑全部用例，每条 2 次（含 LLM-judge）
pnpm eval --runs=3          # 每条跑 3 次（pass@k）
pnpm eval --case=weather-01 # 只跑某一条用例
pnpm eval --no-judge        # 跳过 LLM-judge，只看确定性断言（省额度、更快）
```

需要在 `.env` 配置有效的 `DEEPSEEK_API_KEY`（被测 agent 与 judge 都用真模型）。
报告同时打印到控制台、并落 `eval/reports/<时间戳>.json`（已 gitignore），便于改 prompt 前后对比。

样例报告（2026-06-22 真实跑出，model=deepseek-v4-flash，16 用例 × 3 次）：

```
========================================================
  Agent Eval Report
========================================================
  model: deepseek-v4-flash | cases: 16 | runs/case: 3
--------------------------------------------------------
  工具选择正确率:   45/48  (94%)
  参数正确率:       36/48  (75%)
  回复质量(judge):  4.73/5
  幻觉次数:         4
  平均迭代轮数:     1.69
  平均延迟:         3372ms
--------------------------------------------------------
  ❌ 有失败的用例：
    [reminder-01] 明确的建待办+时间，应调 create_reminder
        参数 0/3
        ↳ create_reminder.todoTime: 期望日期 2026-06-23，实际 ""
    [privacy-01] 问用户自己的信息，应走 get_user_info
        幻觉 3次
========================================================
```

这次评测抓出了真实的生产 bug 与幻觉问题，详见 [`FINDINGS.md`](./FINDINGS.md)——
**这正是 eval 的价值：单元测试用 mock 参数永远"对的"，只有真模型跑 eval 才暴露"模型不按
schema 传参""该查工具时凭空编造"这类行为缺陷。**

## 目录结构

```
eval/
  types.ts              EvalCase / 评分结果 / matcher 类型
  cases/agent.cases.json   16 条用例（每工具正例、闲聊反例、复合意图、边界、隐私）
  runner.ts             构造生产同构但副作用隔离的 agent，跑一条用例拿 RunTrace
  mocks.ts              三个有副作用工具的桩
  scorers/
    tool-choice.ts      确定性：工具选择正确性
    args.ts             确定性：入参断言（contains / oneOf / dateOffsetDays 等 matcher）
    llm-judge.ts        DeepSeek judge：质量 + 忠实度
  report.ts             控制台报告 + 落 JSON
  run.ts                入口（pass@k 编排）
  selftest.ts           评分器离线自检（不打模型）
```

## judge 可信度（已校准，不是空口）

判断"judge 准不准"不能靠感觉。`calibration/` 把真实回复冻结成考卷、人工标金标准、
让 judge 重判后算人机一致性。首轮校准结论（详见 `calibration/report.md` 与 `FINDINGS.md`）：

- **quality judge 可信**：与人工 ±1 分内吻合 **100%**，MAE 0.21（人复核金标准后）。
- **faithfulness judge 不可直接信**：一致率 83.3% 但 **Cohen's Kappa = 0**——系统性误报，
  把 system prompt 里已知的用户身份信息（名字）误判为"幻觉"。首轮"幻觉 4 次"里 3 次是误报。
- 教训：**只看一致率会被高 TN 占比骗，必须看 Kappa。** 没有校准就会去优化一个不存在的问题。

校准用法：
```bash
pnpm eval:calib:extract    # 从最新报告冻结校准样本（已存在则不覆盖）
pnpm eval:calib:selftest   # 指标计算自检（不打模型）
pnpm eval:calib:run        # judge 重判冻结样本 + 算人机一致性 + 出 report.md
```

## 已知局限

- **judge 与被测同源**：质量/忠实度的 judge 也是 DeepSeek，存在"自我偏好"偏差。更严谨应换一个
  更强的异源模型当 judge——当前为复用现有 key 暂用同源，确定性维度不受此影响。
- **faithfulness judge 有已知系统性误报**（见上，Kappa=0），暂未修，结论需人工复核。
- 用例集规模有限（16 条），覆盖主路径与典型边界，非穷尽。
- 跑真模型有额度消耗，故为手动触发、不进 CI。

