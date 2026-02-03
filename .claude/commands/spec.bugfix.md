---
description: Bug修复工作流,快速定位问题、设计修复方案、生成修复代码和回归测试
---

# Bug 修复工作流

专门为 Bug 修复场景优化的工作流，快速定位问题并生成修复代码。

## 核心优势
1. **快速定位**: 自动分析问题、搜索相关代码、定位 Bug 位置
2. **根因分析**: 深入分析代码逻辑，确定问题根本原因
3. **方案对比**: 提供多个修复方案，分析优缺点，推荐最佳方案
4. **回归测试**: 自动生成回归测试用例，防止问题重现
5. **完整记录**: 记录问题分析、修复过程和验证结果

## 执行流程

### 初始化与检测

- **检测未完成的工作流**: 运行 `/spec.utils.progress query`，如果发现未完成工作流，询问是否恢复
- 如用户选择恢复: 运行 `/spec.utils.progress resume`
- 如用户选择新建: 创建新的工作目录
- **保存初始化进度**: `/spec.utils.progress save --stage=init --status=completed --description="Bug修复工作流初始化完成"`

### 阶段 1: 问题收集与描述 ⏱️ 2-5分钟

**AI 会询问**:
1. **Bug 现象**: 具体表现是什么？
2. **复现步骤**: 如何触发这个问题？
3. **错误信息**: 是否有报错日志或截图？
4. **影响范围**: 影响哪些功能或用户？
5. **环境信息**: 测试/预发/生产？浏览器版本？

**输出**:
- `.spec/bugfix/{date}-{bug-name}/bug-description.md`: Bug 完整描述文档

**保存进度**: `/spec.utils.progress save --stage=bug-collect --status=completed --description="问题收集完成"`

### 阶段 2: 问题分析与定位 ⏱️ 3-8分钟

**AI 会执行**:
1. 根据 Bug 描述推测可能原因
2. 搜索相关代码文件和函数
3. 分析代码逻辑和数据流
4. 识别可能的 Bug 位置
5. 生成问题分析报告

**输出**:
- `analysis/problem-analysis.md`: 问题分析报告
- `analysis/related-files.md`: 相关代码文件列表

**确认点**: AI 会展示分析结果，等待你确认是否准确

**保存进度**: `/spec.utils.progress save --stage=bug-analysis --status=completed --description="问题分析完成"`

### 阶段 3: 深度定位与根因分析 ⏱️ 3-10分钟

**AI 会执行**:
1. 深入分析可疑代码段
2. 追踪变量和函数调用链
3. 分析边界条件和异常场景
4. 确定问题根本原因
5. 评估影响范围和风险

**输出**:
- `analysis/root-cause.md`: 根因分析报告
- `analysis/impact-assessment.md`: 影响评估文档

**确认点**: AI 会展示根因分析，等待你确认

**保存进度**: `/spec.utils.progress save --stage=bug-locate --status=completed --description="根因定位完成"`

### 阶段 4: 修复方案设计 ⏱️ 3-8分钟

**AI 会执行**:
1. 设计多个修复方案（通常 2-3 个）
2. 分析每个方案的优缺点
3. 评估方案的风险和成本
4. 推荐最佳方案
5. 生成详细的修复计划

**输出**:
- `solution/fix-proposals.md`: 修复方案对比文档
- `solution/recommended-solution.md`: 推荐方案详细说明

**确认点**: AI 会展示方案对比，等待你选择方案

**保存进度**: `/spec.utils.progress save --stage=bug-solution --status=completed --description="修复方案设计完成"`

### 阶段 5: 代码修复 ⏱️ 5-15分钟

**AI 会执行**:
1. 根据选定方案生成修复代码
2. 更新相关文件
3. 保持代码风格一致
4. 添加必要的注释
5. 生成改动清单

**输出**:
- 修复后的代码文件（直接修改）
- `fix-report.md`: 代码修复报告
- `changes.md`: 改动清单

**提示**: 运行项目检查修复是否生效

**保存进度**: `/spec.utils.progress save --stage=bug-fix --status=completed --description="代码修复完成"`

### 阶段 6: 测试生成 ⏱️ 3-8分钟

**AI 会询问**: 是否生成回归测试？（推荐）

**AI 会执行**:
1. 生成回归测试用例
2. 覆盖 Bug 触发场景
3. 测试边界条件
4. 验证修复效果

**输出**:
- 测试文件（单元测试/组件测试）
- `test-report.md`: 测试报告

**提示**: 运行测试验证修复

**保存进度**: `/spec.utils.progress save --stage=test --status=completed --description="测试生成完成"`

### 阶段 7: 代码审查（可选） ⏱️ 3-8分钟

**AI 会询问**: 是否执行代码审查？

**AI 会执行**:
1. 审查修复代码质量
2. 检查潜在副作用
3. 验证是否引入新问题
4. 生成审查报告

**输出**:
- `code-review/review-report.md`: 审查报告

**保存进度**: `/spec.utils.progress save --stage=review --status=completed --description="代码审查完成"`

### 阶段 8: 归档 ⏱️ 2-3分钟

**AI 会执行**:
1. 生成 Bug 修复总结
2. 记录经验教训
3. 更新知识库（常见问题/解决方案）
4. 生成完整的修复文档

**输出**:
- `archive-summary.md`: 归档总结
- 知识库更新

**保存进度**: `/spec.utils.progress save --stage=archive --status=completed --description="归档完成,Bug修复工作流结束"`

## 快捷模式

- **标准模式**（默认）: `/spec.bugfix` - 完整流程，每个阶段确认
- **快速修复**: `/spec.bugfix --fast` - 跳过非必要确认，直接修复
- **仅分析**: `/spec.bugfix --analyze-only` - 只分析问题，不修复代码

## 使用示例

### 示例 1: 基础用法

```bash
/spec.bugfix
```

AI: "请描述遇到的 Bug"

你: "用户点击提交按钮后，表单没有提交，也没有任何错误提示"

AI 会自动进入问题收集流程...

### 示例 2: 提供详细信息

```bash
/spec.bugfix
```

你可以直接提供完整的 Bug 描述：

```
Bug: 登录页面输入错误密码无提示

复现步骤:
1. 打开登录页面
2. 输入正确用户名
3. 输入错误密码
4. 点击登录按钮

预期: 显示"用户名或密码错误"提示
实际: 没有任何提示，页面无响应

环境: Chrome 120, 测试环境
错误日志: 控制台显示 400 错误，但未被捕获
```

### 示例 3: 快速修复模式

```bash
/spec.bugfix --fast
```

适合紧急修复场景，减少确认步骤。

## 输出目录结构

```
.spec/bugfix/{date}-{bug-name}/
├── bug-description.md          # Bug 描述
├── analysis/                   # 分析阶段
│   ├── problem-analysis.md     # 问题分析
│   ├── related-files.md        # 相关文件
│   ├── root-cause.md          # 根因分析
│   └── impact-assessment.md    # 影响评估
├── solution/                   # 方案阶段
│   ├── fix-proposals.md        # 方案对比
│   └── recommended-solution.md # 推荐方案
├── fix-report.md              # 修复报告
├── changes.md                 # 改动清单
├── test-report.md            # 测试报告
├── code-review/              # 审查报告（可选）
│   └── review-report.md
└── archive-summary.md        # 归档总结
```

## 与其他命令的关系

- **vs `/spec.auto`**: `/spec.bugfix` 专门为 Bug 修复优化，包含问题定位和根因分析
- **vs 分步命令**: `/spec.bugfix` 是 Bug 修复的完整流程，包含独特的分析和定位步骤
- **可独立使用**: 不依赖其他命令，可以随时执行

## 最佳实践

### 1. 提供详细的 Bug 描述
- ✅ 包含完整的复现步骤
- ✅ 提供错误日志和截图
- ✅ 说明预期行为和实际行为
- ✅ 注明环境信息

### 2. 及时验证修复
- ✅ 按照 AI 提示运行项目
- ✅ 手动复现 Bug，验证是否修复
- ✅ 运行回归测试
- ✅ 检查是否引入新问题

### 3. 认真审查方案
- ✅ 对比多个修复方案
- ✅ 考虑长期影响
- ✅ 评估风险和成本
- ✅ 选择最合适的方案

### 4. 完善测试覆盖
- ✅ 生成回归测试
- ✅ 覆盖边界条件
- ✅ 测试相关功能
- ✅ 确保问题不再重现

### 5. 记录经验教训
- ✅ 总结问题原因
- ✅ 记录解决方案
- ✅ 更新知识库
- ✅ 分享给团队

## 注意事项

1. **紧急修复**: 对于紧急 Bug，可以使用 `--fast` 模式快速修复
2. **复杂问题**: 对于复杂的 Bug，建议使用完整模式，确保分析准确
3. **数据安全**: 涉及数据迁移或数据库修改时，务必谨慎确认
4. **回滚准备**: 修复前确保可以快速回滚（git commit、数据库备份等）
5. **影响评估**: 特别关注修复可能影响的其他功能
6. **进度持久化**: 每阶段完成自动保存进度，进度文件保存在 `.spec/bugfix/{date}-{bug-name}/.meta/progress.json`
7. **断点续传**: 使用 `/spec.utils.progress query` 检测未完成工作流，`/spec.utils.progress resume` 恢复执行

## 常见问题

### Q1: 如何提供错误日志？

**A**: 可以直接粘贴到对话中，或者：
1. 保存日志到文件
2. 上传文件
3. AI 会自动分析日志内容

### Q2: 如果 AI 定位不准确怎么办？

**A**:
1. 在确认点提供更多线索
2. 指出你怀疑的代码位置
3. AI 会重新分析

### Q3: 可以同时修复多个 Bug 吗？

**A**: 不建议。每次只修复一个 Bug，确保：
- 问题定位准确
- 修复效果可验证
- 不引入新问题

### Q4: 修复后发现有新问题怎么办？

**A**:
1. 记录新问题
2. 可以回滚修复
3. 重新执行 `/spec.bugfix` 分析新问题

### Q5: 如何查看修复历史？

**A**:
1. 查看 `.spec/bugfix/` 目录
2. 每个修复都有完整的文档
3. 可以搜索相似问题的解决方案

## 进度查看

随时运行 `/spec.status` 查看当前 Bug 修复进度和详细信息。

---

💡 **提示**: 对于生产环境的紧急 Bug，建议先在测试环境验证修复效果，确保无误后再部署到生产环境。
