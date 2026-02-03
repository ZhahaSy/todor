---
description: 智能自动化工作流,一站式完成从需求到归档的完整开发流程,自动识别模式、收集信息、生成代码和测试
---

# 智能自动化工作流

智能协调完整开发流程,从需求到归档一站式完成。

## 核心优势
1. **零门槛启动**: 无需提前准备,只需简单描述需求
2. **主动式交互**: AI主动询问缺失信息,智能补全
3. **一站式体验**: 一个命令完成全流程
4. **灵活中断**: 任意阶段补充信息或调整
5. **进度持久化**: 支持断点续传和错误恢复
6. **自动化管理**: 自动管理目录、文档、进度、日志

## 执行流程

### 0. 初始化与检测
- **询问是否更新代码知识库**:
  - 询问用户是否需要更新代码知识库(扫描最新代码结构和文档)
  - 如果用户选择"是": 执行 `/spec.init` 初始化或更新代码知识库
  - 如果用户选择"否": 跳过知识库更新,直接进入后续流程
- 自动初始化工作目录
- **检测未完成的工作流**: 运行 `/spec.utils.progress query`，如果发现未完成工作流，询问是否恢复
- 如用户选择恢复: 运行 `/spec.utils.progress resume`
- 如用户选择新建: 创建新的工作目录
- 提示提供需求方式(描述/上传文件/链接)
- 智能识别是否涉及多个工程项目
- **保存初始化进度**: `/spec.utils.progress save --stage=init --status=completed --description="工作流初始化完成"`

### 1. 自动收集信息
分析用户输入 → 自动识别模式(feature/bugfix) → 渐进式询问缺失信息 → 自动补全低优先级信息 → 保存收集结果

**需求模式**: 收集功能描述、业务规则、设计稿、API文档、数据字典(后2者可选,自动补全)
- 如提供链接,自动下载主文档和所有关联资源(图片/附件/设计稿)到resources/目录
**Bug模式**: 收集Bug描述、复现步骤、错误信息、影响范围

**保存进度**: `/spec.utils.progress save --stage=collect --status=completed --description="信息收集完成,识别模式:[mode]"`

### 2. 确认并开始
展示识别模式、已收集信息、缺失信息补全策略、预计流程,等待用户确认

**保存进度**: `/spec.utils.progress save --stage=confirm --status=completed --description="用户确认完成,开始执行流程"`

### 3. 执行流程

#### 需求模式(单项目)
**阶段1 需求预分析**:
- 生成original.md → 需求拆分 → 识别快速通道候选(纯前端改动) → 用户确认快速通道
- 需求预分析(完整性/一致性/明确性评估,常规流程需求)
- 生成澄清问题清单(按优先级组织) → 用户确认 → 生成澄清文档
- [确认] 评估结果是否通过
- **保存进度**: `/spec.utils.progress save --stage=feat-prd --status=completed --description="需求预分析完成,快速通道:{X}个,常规流程:{Y}个"`

**阶段2 技术方案**(仅处理常规流程需求,快速通道需求跳过):
- 收集技术信息 → 生成概要设计 → 梳理改动点 → 生成详细方案 → [确认]
- **保存进度**: `/spec.utils.progress save --stage=feat-tech --status=completed --description="技术方案设计完成(常规流程需求)"`
- **快速通道提示**: 提示用户快速通道需求无需技术方案,将直接进入代码生成

**阶段3 代码生成**(分流处理):
- **快速通道**: 读取 `prd/fast-track-approved.md` → 精确定位代码文件 → 应用文案/样式改动
- **常规流程**: 按依赖顺序生成代码 → 新建/修改文件
- 生成改动日志和报告 → [提示运行检查]
- **保存进度**: `/spec.utils.progress save --stage=code --status=completed --description="代码生成完成(快速通道:{X}个,常规流程:{Y}个)"`

**阶段4 测试生成**: 询问是否生成测试 → 识别框架 → 生成测试代码和报告 → [提示运行测试]
- **保存进度**: `/spec.utils.progress save --stage=test --status=completed --description="测试代码生成完成"`

**阶段5 代码审查**: 询问是否审查 → 启动3个Agent并行审查 → 生成综合报告 → [如有严重问题等待修复]
- **保存进度**: `/spec.utils.progress save --stage=review --status=completed --description="代码审查完成"`

**阶段6 归档**: 询问是否归档 → 生成归档总结 → 更新知识库 → 完成
- **保存进度**: `/spec.utils.progress save --stage=archive --status=completed --description="归档完成,工作流结束"`

#### 需求模式(多项目)
**阶段1 需求预分析**:
- 生成original.md → 按项目拆分需求
- 各项目需求预分析(完整性/一致性/明确性评估)
- 生成各项目澄清问题清单 → 用户确认 → 生成澄清文档
- [确认] 评估结果是否通过,能否进入项目协调
- **保存进度**: `/spec.utils.progress save --stage=feat-prd --status=completed --description="多项目需求预分析完成"`

**阶段2 项目协调**: 分析项目依赖 → 定义接口契约 → 确定执行顺序 → [确认]
- **保存进度**: `/spec.utils.progress save --stage=multi-project-coord --status=completed --description="项目协调完成"`

**阶段3-6**: 按项目依次执行技术方案/代码生成/测试/审查
- **保存进度**: 每个项目完成后调用 `/spec.utils.progress save --stage=project-[name] --status=completed --description="项目[name]开发完成"`

**阶段7 集成验证**: 集成测试 → 接口联调 → 生成验证报告 → [确认]
- **保存进度**: `/spec.utils.progress save --stage=integration --status=completed --description="集成验证完成"`

**阶段8 归档**: 统一归档 → 更新各项目知识库 → 完成
- **保存进度**: `/spec.utils.progress save --stage=archive --status=completed --description="多项目归档完成,工作流结束"`

详见: `/spec.multi-project`

#### Bugfix模式
**阶段1 问题分析**: 分析描述推测原因 → 搜索相关代码 → 识别bug位置 → [确认]
- **保存进度**: `/spec.utils.progress save --stage=bug-analysis --status=completed --description="问题分析完成"`

**阶段2 问题定位**: 深入分析代码 → 定位具体问题 → 确定根因 → 生成定位报告 → [确认]
- **保存进度**: `/spec.utils.progress save --stage=bug-locate --status=completed --description="问题定位完成"`

**阶段3 修复方案**: 设计修复方案(多个) → 分析优缺点 → 推荐最佳方案 → 生成修复代码 → [确认]
- **保存进度**: `/spec.utils.progress save --stage=bug-solution --status=completed --description="修复方案设计完成"`

**阶段4 代码修复**: 执行修复 → 验证修复 → [提示运行验证]
- **保存进度**: `/spec.utils.progress save --stage=bug-fix --status=completed --description="代码修复完成"`

**阶段5-6**: 测试/审查/归档(同需求模式)
- **保存进度**: 各阶段完成后分别调用 `/spec.utils.progress save` 保存进度

### 4. 进度展示
实时展示当前阶段、已完成/进行中/待完成的步骤、预计剩余时间

💡 随时运行 `/spec.status` 查看详细进度和项目信息

### 5. 错误处理
记录错误 → 尝试自动恢复(重试/跳过/备用方案) → 向用户报告 → 保存进度

**保存错误进度**: `/spec.utils.progress save --stage=[current-stage] --status=error --description="错误: [error-message]" --error="[详细错误信息]"`

## 快捷模式
- **完整模式**(默认): `/auto` - 执行所有步骤,每个关键点确认
- **快速模式**: `/auto --fast` - 跳过非必要确认、不生成测试和审查
- **静默模式**: `/auto --silent` - 完全自动化,只在出错时询问
- **仅分析**: `/auto --analyze-only` - 只执行分析和方案,不生成代码

## 配置选项
创建 `.spec/auto-config.json` 自定义行为:
```json
{
  "mode": "full",           // full | fast | silent
  "autoTest": true,         // 自动生成测试
  "autoReview": true,       // 自动审查
  "autoArchive": false,     // 自动归档
  "confirmSteps": true,     // 关键点确认
  "maxRetry": 3,            // 错误重试次数
  "timeout": 30             // 阶段超时(分钟)
}
```

## 输出示例
```
🚀 开始智能自动化工作流
📁 工作目录: .spec/feature/2025-12-12-user-management/
✅ 识别模式: 需求开发
━━━━━━━━━━━━━━━━━━━━━━━━━━
[✓] 需求处理 (15分钟)
[✓] 技术方案 (20分钟)
[✓] 代码生成 (10分钟)
[✓] 测试生成 (8分钟)
[✓] 代码审查 (12分钟)
[✓] 归档 (3分钟)
━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 自动化流程完成! 总耗时68分钟
生成16个文件, 详见: .spec/feature/2025-12-12-user-management/
```

## 注意事项
1. 所有自动化操作参考 `.claude/internal/workflow-utils.md`
2. 不需一次性提供所有信息,AI会主动询问
3. 提供链接时会自动打包所有关联资源文件到本地
4. **每阶段完成自动保存进度,支持中断续传**: 进度文件保存在 `.spec/[type]/[name]/.meta/progress.json`
5. 可随时补充信息或调整方向
6. 关键决策必须确认,可配置确认策略
7. 使用 `/spec.status` 查看实时进度, `/spec.utils.progress query` 检测未完成工作流

## 与单独命令的关系
`/auto` 是对其他命令的智能编排:
- **单项目需求(常规流程)** = /spec.feat-prd → /spec.feat-tech → /spec.code → /spec.test → /spec.review → /spec.archive
- **单项目需求(快速通道)** = /spec.feat-prd → /spec.code(跳过技术方案) → /spec.test → /spec.review → /spec.archive
- **单项目需求(混合)** = /spec.feat-prd → /spec.feat-tech(仅常规) → /spec.code(快速通道+常规) → /spec.test → /spec.review → /spec.archive
- **多项目需求** = /spec.feat-prd → /spec.multi-project → (逐项目执行) → /spec.archive
- **Bugfix模式** = 独立的bug分析修复流程
- 单独命令仍可独立使用
