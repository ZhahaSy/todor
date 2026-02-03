# Workflow 内部工具库

> 本文档描述workflow核心命令使用的内部工具逻辑,不作为独立命令暴露给用户

## 工具列表

### 1. 目录初始化 (init-directory)

**用途**: 自动创建优化的工作流目录结构

**何时使用**: 在workflow开始时(feat-prd, auto等命令的第零步)

**目录结构**:
```
.spec/{type}/{YYYY-MM-DD}-{name}/
├── .meta/                  # 元数据目录
│   ├── progress.json      # 进度信息(供spec.utils.progress使用)
│   ├── state.json         # 状态信息
│   └── history/           # 历史版本
├── .logs/                  # 执行日志
│   ├── workflow.log       # 主日志
│   └── errors/            # 错误日志
├── README.md              # 目录索引
├── prd/                   # PRD文档
├── resources/             # 资源文件(用户上传)
├── tech/                  # 技术方案
├── generated/             # 生成文件备份
├── reports/               # 报告目录
└── archive/               # 归档目录
```

**实现逻辑**:
1. 从用户输入提取需求名称
2. 生成目录名: `{YYYY-MM-DD}-{simplified-name}`
3. 检查目录是否存在
4. 创建完整目录结构
5. 初始化README.md(包含流程进度、文档索引)
6. 初始化.meta/state.json和.meta/progress.json
7. 创建初始日志文件

**关键文件内容**:

**README.md初始模板**:
```markdown
# {需求类型} - {需求名称}

## 📋 基本信息
- **需求名称**: {name}
- **创建时间**: {timestamp}
- **当前状态**: ⏳ 初始化完成,等待输入
- **工作目录**: {workDir}

## 📊 流程进度
1. ⏳ 需求收集
2. ⏳ 需求拆分
3. ⏳ 需求澄清
...

## 📁 文档索引
(随流程更新)

## 🔄 变更记录
- {timestamp} - 创建工作目录

## 💡 下一步行动
请执行相关命令开始流程
```

**state.json初始内容**:
```json
{
  "version": "1.0",
  "workDir": "{workDir}",
  "type": "feature/bugfix",
  "name": "{name}",
  "createdAt": "{timestamp}",
  "currentStage": "init",
  "currentStatus": "initialized"
}
```

---

### 2. 信息收集 (collect-info)

**用途**: 渐进式、智能化地收集用户提供的需求信息

**何时使用**: workflow开始阶段,在创建目录后

**核心策略**:
1. **分析已有信息** - 检查用户输入、resources/目录
2. **识别缺失信息** - 判断哪些是必需的、哪些是可选的
3. **渐进式询问** - 不一次性问所有问题,优先必需信息
4. **自动补全** - 对于缺失的低优先级信息,基于最佳实践自动补充
5. **验证完整性** - 确保收集到的信息足够开始工作

**需求类型 (feature-requirement)**:
- **必需信息**:
  - 功能描述(详细)
  - 业务规则
- **高优先级可选**:
  - Figma设计稿链接
  - API文档
  - 数据字段说明
- **低优先级可选**:
  - 项目类型
  - 技术栈
  - UI框架

**Bug类型 (bugfix)**:
- **必需信息**:
  - Bug现象描述
  - 复现步骤
- **高优先级可选**:
  - 错误信息/截图
  - 影响范围
- **低优先级可选**:
  - 预期行为
  - 相关日志

**实现逻辑**:
1. 读取用户输入和resources/目录
2. 分析信息完整度(0-100%)
3. 生成缺失信息清单
4. 按优先级询问用户(每次1-2个问题)
5. 保存收集结果到.meta/collected-info.json
6. 生成resources/docs/collected-info.md文档

**输出示例**:
```
✅ 信息收集完成

收集结果:
- 功能描述: ✓ (详细)
- 业务规则: ✓ (3条)
- 设计稿: ✗ (将基于最佳实践设计)
- API文档: ✗ (将设计RESTful API)

信息完整度: 75%
已保存: .meta/collected-info.json
```

---

### 3. README自动更新 (readme-update)

**用途**: 在每个workflow阶段完成后,自动更新README文档

**何时使用**: 每个主要阶段完成后自动调用

**更新内容**:
1. **流程进度** - 更新emoji状态(⏳ → ✅)
2. **当前状态** - 更新"当前状态"字段
3. **文档索引** - 扫描目录,自动发现新文件并更新索引
4. **变更记录** - 添加新的变更条目
5. **下一步行动** - 更新建议的下一步操作

**实现逻辑**:
```typescript
function updateReadme(stage: string, status: string) {
  // 1. 读取当前README
  const readme = readFile('README.md');

  // 2. 备份到history/
  backupFile(readme, `.meta/history/README-${timestamp}.md`);

  // 3. 更新流程进度
  readme = updateStageStatus(readme, stage, status);

  // 4. 扫描并更新文档索引
  const docs = scanDirectory(['prd/', 'tech/', 'reports/']);
  readme = updateDocIndex(readme, docs);

  // 5. 添加变更记录
  readme = addChangeLog(readme, `${stage} ${status}`);

  // 6. 更新下一步行动
  readme = updateNextAction(readme, getNextStage(stage));

  // 7. 保存README
  writeFile('README.md', readme);
}
```

**扫描规则**:
- prd/original.md → "原始需求"
- prd/split/*.md → "拆分需求"
- prd/clarified/*.md → "澄清需求"
- tech/overview.md → "技术方案概设"
- tech/detailed-design.md → "技术方案详设"
- reports/*.md → "相关报告"

---

### 4. 执行日志 (logger)

**用途**: 记录workflow执行过程中的所有操作和事件

**何时使用**: 贯穿整个workflow流程

**日志级别**:
- **DEBUG**: 详细执行流程(不输出到控制台)
- **INFO**: 正常信息,关键操作
- **WARN**: 警告,可能的问题
- **ERROR**: 错误,操作失败但可恢复
- **FATAL**: 致命错误,无法继续

**日志文件**:
- `.logs/workflow.log` - 主日志(所有级别)
- `.logs/errors/{date}.log` - 错误日志(ERROR和FATAL)
- `.logs/tools/{tool}.log` - 工具调用日志

**日志格式**:
```
[{timestamp}] [{level}] [{stage}] [{component}] {message} {context}
```

示例:
```
[2025-12-12 14:30:00.123] [INFO] [prd-collect] [CollectInfo] 开始收集需求信息 {"userInput": "需要开发用户管理"}
[2025-12-12 14:30:05.456] [DEBUG] [prd-collect] [Read] 读取文件: resources/docs/user-input.md {"size": 1234}
[2025-12-12 14:30:10.789] [ERROR] [prd-split] [Write] 文件写入失败 {"file": "prd/split/feature1.md", "error": "Permission denied"}
```

**实现逻辑**:
```typescript
function log(level: string, stage: string, component: string, message: string, context?: any) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    stage,
    component,
    message,
    context
  };

  const logLine = formatLogLine(entry);

  // 写入主日志
  appendFile('.logs/workflow.log', logLine);

  // 如果是错误,写入错误日志
  if (level === 'ERROR' || level === 'FATAL') {
    appendFile(`.logs/errors/${YYYY-MM-DD}.log`, logLine);
  }

  // 输出到控制台(根据级别)
  if (shouldOutput(level)) {
    console.log(formatConsole(entry));
  }
}
```

**工具调用追踪**:
每次调用Read/Write/Edit/Grep等工具时,自动记录:
```typescript
function logToolCall(toolName: string, operation: string, target: string, duration: number, result: string) {
  log('INFO', getCurrentStage(), toolName, `${operation} ${target}`, {
    duration,
    result,
    performance: duration > 1000 ? 'slow' : 'normal'
  });
}
```

---

## 核心命令使用示例

### 在 spec.feat-prd 中使用

```markdown
### 第零步: 检查并初始化需求目录

**自动初始化目录结构**:
- 从用户输入提取需求名称
- 创建目录: .spec/feature/{YYYY-MM-DD}-{name}/
- 初始化目录结构(参考上述 init-directory 逻辑)
- 生成初始README.md
- 创建.meta/和.logs/目录
- 记录初始化日志

**检测已有工作流**:
- 检查是否存在.meta/progress.json
- 如存在,读取进度信息
- 询问用户是否从中断点恢复
- 如用户选择恢复,调用 /spec.utils.progress resume

### 第一步: 收集和整理需求信息

**智能信息收集**:
- 分析用户已提供的信息(参考 collect-info 逻辑)
- 识别缺失的必需信息
- 渐进式询问用户
- 验证信息完整性
- 保存到.meta/collected-info.json

**记录进度和日志**:
- 记录日志: "开始需求收集"
- 保存进度: stage=prd-collect, status=in_progress

### 第二步: 生成并保存original.md

**生成需求文档**:
- 整理收集到的信息
- 生成prd/original.md
- 记录工具调用(Write)

**自动更新README**:
- 备份当前README到.meta/history/
- 更新"需求收集"状态为✅
- 扫描并更新文档索引
- 添加变更记录
- 更新下一步行动
- 记录日志: "需求收集完成"

...后续步骤类似
```

### 在 spec.auto 中使用

```markdown
### 第零步: 初始化需求工作目录

**自动初始化**(使用 init-directory 逻辑):
- 提取需求名称
- 创建优化的目录结构
- 初始化元数据和日志文件
- 记录初始化日志

**检测已有工作流**:
- 调用 /spec.utils.progress query 检测
- 如发现未完成工作流,询问是否恢复
- 如用户选择恢复,调用 /spec.utils.progress resume

### 第一步: 自动收集需求信息

**使用智能收集逻辑**(collect-info):
- 自动分析用户输入
- 识别工作模式(feature/bugfix)
- 渐进式收集缺失信息
- 自动补全低优先级信息
- 保存收集结果

**记录执行**:
- 记录日志: "信息收集完成"
- 保存进度: stage=auto-collect, status=completed

### 各阶段自动化

每个阶段开始时:
- 记录日志: "开始{阶段}"
- 保存进度: stage={stage}, status=in_progress

每个阶段完成时:
- 自动更新README(readme-update逻辑)
- 记录日志: "{阶段}完成"
- 保存进度: stage={stage}, status=completed

遇到错误时:
- 记录错误日志(ERROR级别)
- 保存错误信息到进度文件
- 尝试自动恢复或询问用户
```

---

## 工具之间的协作

### 目录初始化 + 进度追踪
```
init-directory创建.meta/progress.json
  ↓
spec.utils.progress读取并管理进度
  ↓
各阶段更新progress.json
  ↓
用户可调用 /spec.utils.progress query 查看
```

### 信息收集 + README更新
```
collect-info收集信息
  ↓
保存到.meta/collected-info.json
  ↓
readme-update扫描并更新文档索引
  ↓
README显示收集的信息文档
```

### 日志 + 进度
```
logger记录所有操作到.logs/
  ↓
progress保存阶段进度到.meta/
  ↓
出错时,通过日志追溯原因
  ↓
通过progress恢复到中断点
```

---

## 注意事项

1. **自动化原则**: 这些工具应该自动运行,用户无感知
2. **错误处理**: 工具失败不应中断主流程,降级处理
3. **性能考虑**: 避免频繁的文件读写,批量操作
4. **用户体验**: 只在关键点与用户交互,不过度打扰
5. **可恢复性**: 确保任何阶段中断都能恢复

---

*本文档供workflow核心命令内部使用,不作为用户命令*
