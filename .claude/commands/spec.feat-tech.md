---
description: 技术方案设计,基于澄清后的需求进行技术选型、改动点梳理和详细代码片段生成
---

# 技术方案设计

基于澄清后的需求设计技术方案,包括技术选型、改动点梳理和代码片段生成。

## 前置检查

### 1. 检查快速通道需求
- 读取 `prd/fast-track-approved.md` (如果存在)
- 识别哪些需求已标记为快速通道
- 快速通道需求无需技术方案,直接跳过
- 提示用户快速通道需求应直接运行 `/spec.code`

### 2. 读取常规流程需求
- 读取 README、澄清文档(`prd/clarified/`)、代码知识库
- 只处理非快速通道的需求

## 执行步骤

### 1. 收集技术信息

#### 1.1 基础信息确认(命令行交互)

使用 AskUserQuestion 快速确认:
1. 项目类型: 新项目 or 迭代项目
2. 是否有API文档可用
3. 是否有数据字典可用
4. 是否有特殊技术约束

#### 1.2 前端技术信息收集(文档确认)

生成 `tech/questions/tech-info.md`,包含:

```markdown
## 前端技术信息确认

### 【必填】组件技术选型
- [ ] 使用的UI组件库: ___________
- [ ] 状态管理方案: ___________
- [ ] 是否需要新增公共组件:
  - [ ] 是(请描述): ___________
  - [ ] 否,完全复用现有组件

### 【必填】交互实现方案
- [ ] 需要实现的交互效果(loading/toast/modal等): ___________
- [ ] 表单验证方案: ___________
- [ ] 错误处理方式: ___________

### 【必填】样式实现
- [ ] CSS方案:
  - [ ] CSS Modules
  - [ ] Styled Components
  - [ ] Tailwind CSS
  - [ ] 其他: ___________
- [ ] 是否需要响应式: ___________
- [ ] 是否需要深色模式: ___________

### 【必填】数据流设计
- [ ] API调用方式:
  - [ ] axios
  - [ ] fetch
  - [ ] 其他: ___________
- [ ] 状态管理:
  - [ ] 组件本地状态
  - [ ] Context
  - [ ] Redux/Zustand/其他
- [ ] 数据缓存策略: ___________

### 【可选】依赖信息
- [ ] API文档地址: ___________
- [ ] 数据字典: ___________
- [ ] 设计稿链接: ___________
- [ ] 技术约束说明: ___________
```

提示用户填写后回复"已完成"

### 2. 技术方案概设
创建 `tech/overview.md`

**新项目**: 使用最新技术栈,自由选择架构
**迭代项目**: 读取 coding-standards.md 和 architecture.md,遵循现有规范

包含: 技术选型(框架/UI库/状态管理/路由/样式/HTTP库/依赖)、代码规范(目录结构/命名/风格/导入顺序/注释)、架构设计(如新项目)、技术约束、风险评估

### 3. 改动点梳理

#### 3.1 读取 Figma 页面关联和截图（如果存在）

如果存在 `resources/figma.md`，先读取了解可用的设计页面：
- 查看可用的设计页面列表
- 了解每个页面的 Figma 链接和 Node ID
- 读取 Figma 截图路径 (`resources/figma/screenshots/`)
- 准备在梳理改动点时建立功能与页面的关联
- 在改动点文档中引用 Figma 截图以可视化设计

#### 3.2 逐个分析功能并关联设计

逐个分析澄清文档，从知识库检索相关组件/API/函数/页面

对每个功能生成 `tech/change-points/{功能名}.md`，包含以下部分：

**基础部分**：
- 改动概览表（文件路径/改动类型/说明）
- 详细改动（每个文件的完整代码/修改位置/依赖说明）
- TODO项和待确认问题
- 依赖关系图

**Figma 设计集成部分**（如果该功能关联了设计页面）：

1. **读取已有的 Figma 信息**
   - 从澄清文档 (`prd/clarified/{功能名}-clarified.md`) 读取已关联的 Figma 页面
   - 从 `resources/figma.md` 获取完整的页面信息和截图路径
   - 确认 Figma 截图已存在于 `resources/figma/screenshots/`

2. **在改动点文档中展示 Figma 截图**
   - 在"设计参考"部分引用 Figma 截图
   - 使用 Markdown 图片语法展示截图: `![Figma设计](../resources/figma/screenshots/XX-{页面名称}.png)`
   - 记录 Figma 链接 (含 node-id) 用于精确定位图层

3. **按需获取更多设计内容**（可选）

   如果需要更详细的设计信息，对关联的每个页面，调用 Figma MCP 获取设计详情：

   ```javascript
   // 从 figma.md 读取页面信息
   const page = {
     name: "业务选择采购类型",
     nodeId: "3339-718947",  // hyphen format
     url: "https://www.figma.com/design/jE6p2o9yoJ0qSZRnvtnAZT/寻源执行?node-id=3339-718947"
   }

   // 转换 Node ID 格式
   const colonNodeId = page.nodeId.replace('-', ':')  // "3339:718947"
   const fileKey = "jE6p2o9yoJ0qSZRnvtnAZT"  // 从 URL 提取

   // Step 1: 获取截图（用于直观参考）
   mcp__figma-remote-mcp__get_screenshot({
     fileKey: fileKey,
     nodeId: colonNodeId,
     clientLanguages: "javascript,typescript,html,css",
     clientFrameworks: "react"
   })

   // Step 2: 获取设计上下文（组件结构、样式、代码片段）
   mcp__figma-remote-mcp__get_design_context({
     fileKey: fileKey,
     nodeId: colonNodeId,
     clientLanguages: "javascript,typescript,html,css",
     clientFrameworks: "react",
     disableCodeConnect: false,  // 优先使用 Code Connect
     forceCode: false  // 如果输出过大，返回元数据
   })

   // Step 3: 获取设计变量（可选，如果需要颜色、字体等）
   mcp__figma-remote-mcp__get_variable_defs({
     fileKey: fileKey,
     nodeId: colonNodeId,
     clientLanguages: "javascript,typescript,css",
     clientFrameworks: "react"
   })
   ```

4. **整理设计内容到改动点文档（含截图对比）**

   在 `tech/change-points/{功能名}.md` 中添加"设计参考"部分：

   ```markdown
   ## 设计参考

   ### 📸 截图对比

   **用户提供的截图** (如果有)

   ![用户截图](../resources/images/XX-{文件名}.png)

   **Figma 设计稿**

   ![Figma截图](../resources/figma/screenshots/XX-{页面名称}.png)

   ### 📋 设计信息

   - **Figma 页面**: {页面名称}
   - **Figma 链接**: {Figma URL with node-id} - 用于精确定位图层
   - **Node ID (colon格式)**: {nodeId-colon} - 用于 Figma MCP 调用
   - **设计差异**: {如果用户截图和 Figma 不一致，说明差异}

   ### UI 组件结构 (如需详细信息)
   {从 design_context 提取的组件层级结构}

   ### 关键代码片段 (如需详细信息)
   ```jsx
   {从 design_context 提取的代码片段}
   ```

   ### 设计变量 (如需详细信息)
   - 主色调: {color value}
   - 字体: {font family}
   - 间距: {spacing values}
   ...

   ### 涉及的现有组件
   {基于截图和设计上下文，列出可以复用的现有组件}
   {或需要新建的组件}

   ### 实施要点
   - 优先参考 Figma 设计稿（最新设计）
   - 关注用户截图与 Figma 的差异（如有）
   - 使用 Figma 链接精确定位到具体图层
   ```

5. **更新 figma.md 关联状态**

   在 `resources/figma.md` 中更新该页面的"关联功能点"字段：
   ```markdown
   ### X. {页面名称}
   - **Figma 链接**: {URL with node-id}
   - **Node ID (hyphen)**: {nodeId-hyphen}
   - **Node ID (colon)**: {nodeId-colon}
   - **截图路径**: resources/figma/screenshots/XX-{页面名称}.png
   - **关联功能点**:
     - [x] {功能名} - 改动点文档: tech/change-points/{功能名}.md
   - **设计详情状态**: 已关联到技术方案
   - **备注**: 已在改动点文档中展示 Figma 截图
   ```

### 4. 与用户确认

#### 4.1 生成改动确认文档(优先推荐)

生成 `tech/questions/change-confirmation.md`,包含:

```markdown
## 技术方案改动确认

> 生成时间: {YYYY-MM-DD HH:mm:ss}

### 改动统计
- 新建文件: {N}个
- 修改文件: {M}个
- 预计代码行数: 约{X}行

### 【必答】前端改动点确认

#### 1. 组件改动影响分析
{列出所有涉及的组件及其改动}

- [ ] 问题1: {组件A} 的修改会影响以下页面使用,是否已考虑?
  - 影响页面: {列出页面列表}
  - [ ] 已确认影响范围
  - [ ] 需要调整方案(请说明): ___________

#### 2. 状态管理改动
{列出状态管理相关的改动}

- [ ] 问题2: 新增的状态 {stateX} 是否需要持久化?
  - [ ] 需要(localStorage/sessionStorage/其他): ___________
  - [ ] 不需要

#### 3. API调用改动
{列出API调用相关的改动}

- [ ] 问题3: API调用的错误处理方式
  - [ ] 使用全局错误处理
  - [ ] 自定义错误处理(请说明): ___________

#### 4. 样式改动影响
{列出样式相关的改动}

- [ ] 问题4: 新增样式是否会影响现有页面?
  - [ ] 不会影响,使用了模块化CSS
  - [ ] 可能影响(请说明哪些页面): ___________

#### 5. 联动逻辑检查(重要)
{分析改动对历史逻辑的影响}

- [ ] 问题5: 以下组件与当前改动有联动关系,需要确认:
  - {组件B}: {描述联动关系}
    - [ ] 已在改动点中包含
    - [ ] 不需要改动,原因: ___________
    - [ ] 需要补充改动(请说明): ___________

### 【可选】待确认问题
{列出需要确认的技术细节}

### 【待解决】TODO项
{列出依赖未就绪的项}
- API接口 {X} 未就绪
- 数据字典字段 {Y} 待确认
```

提示用户: "请仔细检查改动点,在文档中勾选确认或提出修改意见,完成后回复'已确认'"

#### 4.2 命令行交互确认(简单问题)

对于简单的技术选择,使用 AskUserQuestion:
- 技术方案二选一
- 简单的是/否判断
- 不涉及复杂影响分析的问题

#### 4.3 确认流程
1. 优先生成确认文档,给用户充分时间思考
2. 对于文档中用户提出的疑问,进一步讨论
3. 调整方案后重新生成确认文档
4. 确认完成后进入详细设计阶段

### 5. 技术方案详设
解决TODO后,生成 `tech/detailed-design.md`:
- 改动概览(统计信息/改动清单)
- 功能模块详细设计(每个模块的核心改动和代码)
- 完整文件改动列表
- 数据流设计
- 路由配置
- 接口依赖和数据字典
- 技术难点与解决方案
- 性能优化、兼容性、测试计划、工作量评估、交付检查清单、风险提示

## 输出示例

**常规情况**:
```
✅ 技术方案设计完成
📋 概要设计、改动点({N}个)、详细设计
📊 新建{N}个, 修改{M}个, 约{X}行
📝 确认方式: 文档确认({X}个问题) + 命令行交互({Y}个问题)
📁 技术信息: tech/questions/tech-info.md
📁 改动确认: tech/questions/change-confirmation.md
⚠️ 接口{就绪数}/{总数}, 数据字典{已确认数}/{总数}, TODO{已解决数}/{总数}
🔍 联动影响: 已检查{N}个组件的联动关系
🎨 Figma 集成: {M}个功能点已关联设计，获取了{K}个页面的设计内容
💡 下一步: /spec.code 开始代码生成
📋 查看进度: /spec.status
```

**存在快速通道需求时**:
```
ℹ️ 检测到快速通道需求

🚀 快速通道需求 ({X}个):
这些需求无需技术方案设计，可直接生成代码:
1. {功能名称1} - 文案修改
2. {功能名称2} - 样式调整
...

💡 处理建议:
- 快速通道需求: 直接运行 /spec.code
- 常规流程需求: 继续设计技术方案

━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 技术方案设计完成 (仅处理常规流程需求)
📋 概要设计、改动点({N}个)、详细设计
📊 新建{N}个, 修改{M}个, 约{X}行
...
```

## 注意事项
1. 充分利用知识库了解现有代码
2. 迭代项目必须遵循现有规范
3. 改动点代码必须可直接使用
4. 依赖未就绪明确标注TODO
5. 文档之间要有清晰引用
6. 生成详细设计前务必确认改动点
7. 考虑扩展性和性能
8. **Figma 设计集成**：
   - 如果存在 `resources/figma.md`，优先使用已有的 Figma 截图
   - 在改动点文档中直接引用 Figma 截图，可视化展示设计
   - Figma 链接必须包含 node-id，方便代码实现时精确定位图层
   - 只在需要更详细信息时才调用 Figma MCP 获取设计上下文（性能优化）
   - 将 Figma 截图和设计内容整理到改动点文档，便于代码生成阶段使用
   - 基于 Figma 截图，识别可复用的现有组件
   - 更新 `figma.md` 记录功能与页面的关联关系
   - 同时保留用户上传的截图（如果有），用于对比或补充说明
