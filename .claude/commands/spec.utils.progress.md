---
description: 进度持久化工具,保存和恢复工作流执行进度,支持断点续传和错误恢复
---

# 进度持久化工具

你是一个进度管理专家。你的任务是管理 workflow 的执行进度,支持断点续传和错误恢复。

## 核心功能

1. **进度保存** - 自动保存当前执行进度
2. **进度恢复** - 从中断点继续执行
3. **状态追踪** - 追踪每个步骤的执行状态
4. **错误记录** - 记录错误和重试次数
5. **时间统计** - 统计每个阶段的耗时

## 使用方式

### 保存进度
```bash
/spec.utils.progress save --stage=prd-split --step=3 --status=in_progress
```

### 查询进度
```bash
/spec.utils.progress query
```

### 恢复执行
```bash
/spec.utils.progress resume
```

### 清除进度
```bash
/spec.utils.progress clear
```

## 进度文件结构

进度文件保存在: `.spec/feature/{YYYY-MM-DD}/.meta/progress.json`

```json
{
  "version": "1.0",
  "workflowType": "feature",
  "workDir": ".spec/feature/2025-12-12",
  "startTime": "2025-12-12T14:30:00.000Z",
  "lastUpdateTime": "2025-12-12T14:45:00.000Z",
  "currentStage": "prd-split",
  "currentStep": 3,
  "status": "in_progress",

  "stages": {
    "prd-collect": {
      "status": "completed",
      "startTime": "2025-12-12T14:30:00.000Z",
      "endTime": "2025-12-12T14:35:00.000Z",
      "duration": 300,
      "steps": [
        {
          "step": 1,
          "name": "创建目录",
          "status": "completed",
          "duration": 10
        },
        {
          "step": 2,
          "name": "收集需求信息",
          "status": "completed",
          "duration": 290
        }
      ]
    },
    "prd-split": {
      "status": "in_progress",
      "startTime": "2025-12-12T14:35:00.000Z",
      "endTime": null,
      "duration": null,
      "steps": [
        {
          "step": 1,
          "name": "分析需求",
          "status": "completed",
          "duration": 120
        },
        {
          "step": 2,
          "name": "应用拆分规则",
          "status": "completed",
          "duration": 180
        },
        {
          "step": 3,
          "name": "生成拆分文档",
          "status": "in_progress",
          "duration": null,
          "startTime": "2025-12-12T14:40:00.000Z"
        }
      ]
    },
    "prd-clarify": {
      "status": "pending",
      "startTime": null,
      "endTime": null,
      "duration": null,
      "steps": []
    }
  },

  "checkpoints": [
    {
      "timestamp": "2025-12-12T14:35:00.000Z",
      "stage": "prd-collect",
      "description": "需求收集完成",
      "filesCreated": [
        "prd/original.md",
        "resources/docs/user-input.md"
      ]
    },
    {
      "timestamp": "2025-12-12T14:40:00.000Z",
      "stage": "prd-split",
      "description": "需求拆分进行中",
      "filesCreated": [
        "prd/split/system1-feature1.md",
        "prd/split/system1-feature2.md"
      ]
    }
  ],

  "errors": [
    {
      "timestamp": "2025-12-12T14:38:00.000Z",
      "stage": "prd-split",
      "step": 2,
      "error": "文件写入失败",
      "retryCount": 1,
      "resolved": true
    }
  ],

  "context": {
    "requirementName": "用户管理",
    "systemCount": 1,
    "featureCount": 4,
    "figmaUrl": null,
    "apiDocUrl": null,
    "userInput": "需要开发用户管理功能..."
  },

  "statistics": {
    "totalSteps": 25,
    "completedSteps": 5,
    "failedSteps": 0,
    "estimatedTotalTime": 3600,
    "elapsedTime": 900,
    "remainingTime": 2700
  }
}
```

## 执行流程

### 命令1: save (保存进度)

#### 参数:
- `--stage`: 当前阶段
- `--step`: 当前步骤编号(可选)
- `--status`: 状态 (pending/in_progress/completed/failed)
- `--description`: 描述信息(可选)
- `--context`: 上下文数据(JSON格式,可选)
- `--error`: 错误信息(可选)

#### 流程:

1. **定位进度文件**
   ```typescript
   const progressFile = `.spec/feature/${YYYY-MM-DD}/.meta/progress.json`;
   ```

2. **读取现有进度** (如果存在)
   ```typescript
   let progress = existsSync(progressFile)
     ? JSON.parse(readFileSync(progressFile))
     : createInitialProgress();
   ```

3. **更新进度数据**
   ```typescript
   // 更新当前阶段和步骤
   progress.currentStage = stage;
   progress.currentStep = step;
   progress.lastUpdateTime = new Date().toISOString();

   // 更新阶段状态
   if (!progress.stages[stage]) {
     progress.stages[stage] = createStageData(stage);
   }

   if (status === 'in_progress' && !progress.stages[stage].startTime) {
     progress.stages[stage].startTime = new Date().toISOString();
   }

   if (status === 'completed') {
     progress.stages[stage].status = 'completed';
     progress.stages[stage].endTime = new Date().toISOString();
     progress.stages[stage].duration = calculateDuration(
       progress.stages[stage].startTime,
       progress.stages[stage].endTime
     );
   }

   // 更新步骤信息
   if (step) {
     updateStepInfo(progress.stages[stage], step, status);
   }

   // 添加检查点
   if (description) {
     progress.checkpoints.push({
       timestamp: new Date().toISOString(),
       stage: stage,
       description: description,
       filesCreated: scanNewFiles(progress.lastCheckpoint)
     });
   }

   // 记录错误
   if (error) {
     progress.errors.push({
       timestamp: new Date().toISOString(),
       stage: stage,
       step: step,
       error: error,
       retryCount: 0,
       resolved: false
     });
   }

   // 更新上下文
   if (context) {
     progress.context = { ...progress.context, ...context };
   }

   // 更新统计信息
   updateStatistics(progress);
   ```

4. **写入进度文件**
   ```typescript
   // 确保目录存在
   ensureDir(`.meta/`);

   // 写入文件
   writeFileSync(progressFile, JSON.stringify(progress, null, 2));
   ```

5. **输出保存结果**
   ```
   ✅ 进度已保存

   📊 当前进度:
   - 阶段: prd-split (需求拆分)
   - 步骤: 3/5
   - 状态: 🔄 进行中
   - 已用时: 15分钟
   - 预计剩余: 45分钟
   ```

### 命令2: query (查询进度)

#### 参数:
- `--detail`: 显示详细信息(可选)
- `--format`: 输出格式 (text/json)(可选)

#### 流程:

1. **读取进度文件**
   ```typescript
   const progress = readProgressFile();
   ```

2. **格式化输出**

   **简洁模式** (默认):
   ```
   📊 工作流进度

   工作目录: .spec/feature/2025-12-12
   工作流类型: 需求开发

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   流程进度: ████████████░░░░░░░░ 60%
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   阶段列表:
   ✅ 需求收集      (5分钟)
   ✅ 需求拆分      (10分钟)
   🔄 需求澄清      (进行中... 已耗时: 8分钟)
   ⏳ 技术方案概设
   ⏳ 改动点梳理
   ⏳ 技术方案详设
   ⏳ 代码生成
   ⏳ 测试
   ⏳ Code Review
   ⏳ 归档

   当前操作: 正在生成澄清文档...

   时间统计:
   - 开始时间: 2025-12-12 14:30:00
   - 已用时间: 23分钟
   - 预计剩余: 37分钟
   - 预计完成: 2025-12-12 15:30:00

   错误记录: 1个(已解决)

   💡 提示: 使用 --detail 查看详细信息
   ```

   **详细模式** (--detail):
   ```
   📊 工作流进度 (详细)

   [... 基本信息同上 ...]

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   阶段详情:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   1. ✅ 需求收集 (5分钟)
      开始: 14:30:00  结束: 14:35:00
      步骤:
      ✓ 创建目录 (10秒)
      ✓ 收集需求信息 (4分50秒)

   2. ✅ 需求拆分 (10分钟)
      开始: 14:35:00  结束: 14:45:00
      步骤:
      ✓ 分析需求 (2分钟)
      ✓ 应用拆分规则 (3分钟)
      ✓ 生成拆分文档 (5分钟)

      产出文件:
      - prd/split/system1-feature1.md
      - prd/split/system1-feature2.md
      - prd/split/system2-feature1.md

   3. 🔄 需求澄清 (进行中)
      开始: 14:45:00  当前: 14:53:00
      步骤:
      ✓ 读取代码知识库 (1分钟)
      ✓ 完整性检查 (2分钟)
      → 一致性检查 (进行中...)
      ⏳ 明确性检查
      ⏳ 生成澄清问题
      ⏳ 与用户澄清
      ⏳ 生成澄清文档

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   检查点:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   14:35:00 - 需求收集完成
   14:45:00 - 需求拆分完成,生成3个子需求

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   错误记录:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   14:38:00 - [需求拆分/步骤2] 文件写入失败
      重试: 1次
      状态: ✅ 已解决

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   上下文信息:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   需求名称: 用户管理
   涉及系统: 1个
   功能模块: 4个
   Figma: 无
   API文档: 无
   ```

   **JSON格式** (--format=json):
   ```json
   {完整的 progress.json 内容}
   ```

### 命令3: resume (恢复执行)

#### 参数:
- `--force`: 强制从最后一个检查点恢复(可选)
- `--from`: 从指定阶段恢复(可选)

#### 流程:

1. **检测未完成的工作流**
   ```typescript
   const progress = findIncompleteProgress();

   if (!progress) {
     console.log('没有发现未完成的工作流');
     return;
   }
   ```

2. **显示恢复信息**
   ```
   🔄 发现未完成的工作流

   工作目录: .spec/feature/2025-12-12
   需求名称: 用户管理

   上次执行:
   - 时间: 2025-12-12 14:53:00
   - 阶段: 需求澄清
   - 步骤: 3/7
   - 状态: 进行中

   中断原因: {如果有错误记录则显示}

   恢复方案:
   ✓ 已完成的阶段: 需求收集、需求拆分
   → 当前阶段: 需求澄清 (从步骤3继续)
   ⏳ 待执行阶段: 技术方案、代码生成、测试、审查、归档

   是否恢复执行? (Y/n)
   ```

3. **用户确认后恢复**
   ```typescript
   if (userConfirms()) {
     // 从当前阶段和步骤继续
     const { currentStage, currentStep } = progress;

     // 加载上下文
     const context = progress.context;

     // 调用对应的命令继续执行
     resumeWorkflow(currentStage, currentStep, context);
   }
   ```

4. **智能恢复策略**

   根据中断的阶段和步骤,智能选择恢复方式:

   - **步骤中间中断**: 重新执行当前步骤
   - **步骤之间中断**: 从下一步骤开始
   - **阶段之间中断**: 从下一阶段开始
   - **有错误记录**: 询问是否重试或跳过

   ```
   恢复策略:

   当前步骤未完成,将重新执行:
   - 步骤3: 一致性检查

   提示:
   - 如果要跳过此步骤,使用 --skip-step=3
   - 如果要从下一阶段开始,使用 --from=tech-overview
   ```

### 命令4: clear (清除进度)

#### 参数:
- `--confirm`: 跳过确认直接清除

#### 流程:

1. **确认操作**
   ```
   ⚠️ 警告: 将清除以下进度数据

   工作目录: .spec/feature/2025-12-12
   需求名称: 用户管理

   已完成:
   - 需求收集 ✅
   - 需求拆分 ✅
   - 需求澄清 🔄 (60%)

   清除后将无法恢复进度。

   确认清除? (yes/no)
   请输入 "yes" 确认:
   ```

2. **清除进度文件**
   ```typescript
   if (userInput === 'yes') {
     // 备份到历史
     const timestamp = Date.now();
     const backupPath = `.meta/history/progress-${timestamp}.json`;
     fs.copyFileSync(progressFile, backupPath);

     // 删除进度文件
     fs.unlinkSync(progressFile);

     console.log('✅ 进度已清除');
     console.log(`   备份到: ${backupPath}`);
   }
   ```

## 高级功能

### 功能1: 自动保存

在每个关键操作后自动保存进度:

```typescript
// 在命令中调用
function executeStep(stage, step, action) {
  // 保存开始状态
  saveProgress(stage, step, 'in_progress');

  try {
    // 执行操作
    const result = action();

    // 保存完成状态
    saveProgress(stage, step, 'completed', {
      description: `${step}完成`,
      files: result.filesCreated
    });

    return result;
  } catch (error) {
    // 保存错误状态
    saveProgress(stage, step, 'failed', {
      error: error.message
    });

    throw error;
  }
}
```

### 功能2: 进度可视化

生成进度图表:

```
/spec.utils.progress visualize

输出:
┌─────────────────────────────────────────────────────┐
│           工作流进度可视化                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  需求收集   ████████ 100%  ✅ 5分钟               │
│  需求拆分   ████████ 100%  ✅ 10分钟              │
│  需求澄清   ████░░░░  60%  🔄 8分钟 (预计12分钟)  │
│  技术方案概设 ░░░░░░░░  0%  ⏳                    │
│  改动点梳理  ░░░░░░░░  0%  ⏳                    │
│  技术方案详设 ░░░░░░░░  0%  ⏳                    │
│  代码生成   ░░░░░░░░  0%  ⏳                    │
│  测试      ░░░░░░░░  0%  ⏳                    │
│  审查      ░░░░░░░░  0%  ⏳                    │
│  归档      ░░░░░░░░  0%  ⏳                    │
│                                                     │
│  总进度    ██████████████░░░░░░░░░░░░ 30%         │
│                                                     │
│  开始时间: 14:30  当前时间: 14:53                 │
│  已用时: 23分钟   预计剩余: 37分钟                │
│  预计完成: 15:30                                   │
└─────────────────────────────────────────────────────┘
```

### 功能3: 进度对比

对比多次执行的进度:

```bash
/spec.utils.progress compare --dates=2025-12-10,2025-12-12

输出:
📊 进度对比

需求1 (2025-12-10):
  总耗时: 65分钟
  各阶段: 需求(15min) 方案(20min) 代码(20min) 测试(10min)

需求2 (2025-12-12):
  总耗时: 预计60分钟 (当前30分钟)
  各阶段: 需求(15min) 方案(预计18min) 代码(预计18min) 测试(预计9min)

效率提升: 约8%
```

### 功能4: 导出报告

导出进度报告:

```bash
/spec.utils.progress export --format=markdown

生成文件: .spec/feature/2025-12-12/progress-report.md
```

## 集成到命令

在每个主要命令中集成进度保存:

**spec.feat-prd.md**:
```markdown
### 第一步: 收集和整理需求信息

**开始前保存进度**:
/spec.utils.progress save --stage=prd-collect --step=1 --status=in_progress

[... 执行收集逻辑 ...]

**完成后保存进度**:
/spec.utils.progress save --stage=prd-collect --step=1 --status=completed --description="需求收集完成"
```

**spec.auto.md**:
```markdown
### 第三步: 执行对应流程

**自动保存进度**:
在每个阶段开始和结束时,自动调用 progress save 保存进度。

如果执行被中断,下次运行时自动检测并提示恢复:
```
🔄 检测到未完成的工作流

上次执行: 2025-12-12 14:53
中断阶段: 需求澄清 (60%)

是否从中断点继续? (Y/n)
```

用户选择 Y 后,自动调用:
/spec.utils.progress resume
```

## 错误处理

### 1. 进度文件损坏
```
❌ 错误: 进度文件格式错误

已自动备份损坏文件到:
.meta/corrupted/progress-{timestamp}.json

创建新的进度文件? (Y/n)
```

### 2. 多个未完成工作流
```
⚠️ 发现多个未完成的工作流:

1. .spec/feature/2025-12-10 - 用户管理 (技术方案阶段)
2. .spec/feature/2025-12-12 - 订单系统 (需求澄清阶段)

请选择要恢复的工作流 (1/2):
```

### 3. 版本不兼容
```
⚠️ 警告: 进度文件版本 (v0.9) 与当前工具版本 (v1.0) 不兼容

是否尝试自动迁移? (Y/n)
```

## 配置选项

`.spec/.config/progress.json`:

```json
{
  "autoSave": true,
  "saveInterval": 300,
  "maxBackups": 20,
  "detailedSteps": true,
  "trackFiles": true,
  "estimateTime": true,
  "notifyOnResume": true
}
```

## 使用示例

### 示例1: 正常工作流中使用

```bash
# 在 /spec.feat-prd 执行过程中
# 系统自动保存进度,无需手动调用

# 查看当前进度
/spec.utils.progress query

# 输出:
📊 当前进度: 需求拆分 (步骤 3/5) 🔄 进行中
已用时: 15分钟  预计剩余: 45分钟
```

### 示例2: 意外中断后恢复

```bash
# 重新启动后,系统自动检测未完成的工作流
# 或手动恢复:
/spec.utils.progress resume

# 输出:
🔄 从中断点恢复执行...
   阶段: 需求拆分
   步骤: 3 - 生成拆分文档

[继续执行...]
```

### 示例3: 查看详细进度

```bash
/spec.utils.progress query --detail

# 显示完整的阶段、步骤、时间统计
```

### 示例4: 清除并重新开始

```bash
/spec.utils.progress clear

# 确认后清除进度,可以重新开始
```

---

**提示**: 这个工具让 workflow 具备了"记忆能力",即使中断也能无缝恢复!
