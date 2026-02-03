---
description: 接口变更检测,基于git diff对比接口文件变更,支持先更新接口再进行对比
---

# 接口变更检测

基于 git diff 对比接口文件的变更，识别新增、删除、修改的接口并生成详细的变更报告。

## 使用场景

1. **开发中检查**: 开发过程中实时查看接口变更
2. **代码审查**: 确认接口改动是否符合预期
3. **影响评估**: 评估接口变更对前端/客户端的影响
4. **提交前检查**: 提交代码前确认接口变更
5. **PR Review**: 审查 PR 中的接口变更

## 前置条件

- 项目使用 Git 版本控制
- 接口文件在 Git 仓库中

## 执行步骤

### 1. 检测可用的接口更新脚本

检测项目中可用的接口更新脚本：
- 读取 `package.json` 中的 `scripts` 字段
- 识别接口相关的脚本（包含 "api", "akali", "swagger", "openapi", "interface" 等关键词）
- 常见脚本示例：
  - `akali`: 使用 akali 工具更新接口
  - `api:update`: 更新 API 定义
  - `swagger:generate`: 生成 Swagger 文档
  - `openapi:sync`: 同步 OpenAPI 定义

### 2. 询问是否更新接口（可选）

使用 AskUserQuestion 工具询问用户：

**问题**: "是否需要先更新接口定义？"

**选项**:
1. **是，更新后再对比** - 执行接口更新脚本，然后进行 diff 对比
2. **否，直接对比当前变更** - 跳过更新，直接使用 git diff 对比

**说明**:
- 如果最近修改了接口或需要同步远程接口定义，建议先更新
- 如果只是想查看当前的代码变更，可以直接对比

### 3. 选择更新脚本（如果选择更新）

如果用户选择更新接口，展示可用的脚本供用户选择：

使用 AskUserQuestion 工具（multiSelect: true）：

**问题**: "选择要执行的接口更新脚本（可多选）"

**选项**: 动态生成，基于步骤 1 检测到的脚本，例如：
- `npm run akali` - 使用 akali 更新接口定义
- `npm run api:update` - 更新 API 定义
- `npm run swagger:generate` - 生成 Swagger 文档
- 其他检测到的相关脚本

**说明**:
- 可以选择多个脚本按顺序执行
- 脚本执行顺序按选择顺序

### 4. 执行接口更新脚本

按用户选择的顺序依次执行脚本：

```bash
# 示例：执行 akali 脚本
npm run akali

# 等待脚本执行完成，显示输出
```

**执行后**：
- 显示脚本执行结果
- 如果执行失败，询问是否继续进行 diff
- 如果成功，继续下一步

### 5. 使用 git diff 检测接口文件变更

#### 5.1 确定对比范围

询问用户对比范围：

**选项**:
1. **与上次提交对比** (HEAD) - 查看工作区的未提交变更
2. **与特定分支对比** - 例如 main、master、develop
3. **与特定提交对比** - 输入 commit hash
4. **暂存区变更** (--staged) - 查看已 add 但未 commit 的变更

**默认**: 与上次提交对比 (HEAD)

#### 5.2 检测接口文件

识别项目中的接口文件模式：
- `src/api/**/*.ts`
- `src/api/**/*.js`
- `src/services/**/*.ts`
- `src/services/**/*.js`
- `api/**/*.ts`
- `services/**/*.ts`
- `*.swagger.json`
- `*.openapi.json`
- `openapi.yaml`
- 其他自定义接口目录

#### 5.3 执行 git diff

```bash
# 示例：检测接口文件变更
git diff HEAD -- 'src/api/**/*.ts' 'src/services/**/*.ts'

# 或检测暂存区变更
git diff --staged -- 'src/api/**/*.ts' 'src/services/**/*.ts'

# 或与特定分支对比
git diff main -- 'src/api/**/*.ts' 'src/services/**/*.ts'
```

### 6. 智能分析变更内容

分析 git diff 输出，提取接口变更信息：

#### 6.1 识别新增接口
- 检测新增的 API 函数/方法定义
- 提取接口名称、路径、方法、参数

示例模式：
```typescript
// 新增的 axios 请求
+ export const getUserInfo = (id: string) => axios.get(`/api/user/${id}`)

// 新增的 API 路由
+ router.post('/api/user/create', createUserHandler)

// 新增的接口类型定义
+ interface CreateUserRequest {
+   username: string;
+   email: string;
+ }
```

#### 6.2 识别删除接口
- 检测删除的 API 函数/方法定义
- 标记为已删除，评估影响范围

示例模式：
```typescript
// 删除的接口
- export const oldApi = () => axios.get('/api/old-endpoint')
```

#### 6.3 识别修改接口
对比以下变更：

**路径变更**:
```typescript
- axios.get('/api/v1/user')
+ axios.get('/api/v2/user')
```

**方法变更**:
```typescript
- axios.get('/api/user')
+ axios.post('/api/user')
```

**参数变更**:
```typescript
// 参数类型变更
- getUserInfo(id: number)
+ getUserInfo(id: string)

// 新增参数
- createUser(name: string)
+ createUser(name: string, email: string)

// 参数结构变更
- interface UserRequest { name: string }
+ interface UserRequest { name: string; age: number; email?: string }
```

**响应变更**:
```typescript
// 响应类型变更
- Promise<{ success: boolean }>
+ Promise<{ success: boolean; data: User }>
```

### 7. 影响评估

对每个变更进行影响评估：

**高风险变更** 🔴:
- 删除接口
- 修改 HTTP 方法（GET → POST 等）
- 删除必填参数
- 修改参数类型（破坏性变更）
- 删除响应字段

**中风险变更** 🟡:
- 修改接口路径
- 新增必填参数
- 参数类型兼容性变更
- 响应字段类型变更

**低风险变更** 🔵:
- 新增接口
- 新增可选参数
- 新增响应字段
- 优化接口实现（不影响签名）

### 8. 确定报告保存路径

确定报告文件的保存位置：

#### 8.1 检查 feature 目录
```bash
# 检查 .spec/feature/ 目录是否存在
ls -d .spec/feature/*/  2>/dev/null
```

#### 8.2 确定保存路径
1. **如果存在 feature 目录**:
   - 找到最新的 feature 目录（按修改时间排序）
   - 报告保存到: `.spec/feature/{latest-dir}/api-diff-report.md`
   - 示例: `.spec/feature/2025-12-17/api-diff-report.md`

2. **如果不存在 feature 目录**:
   - 报告保存到: `.spec/api-diff-report.md`

#### 8.3 路径说明
- ✅ 优先保存到当前 feature 目录，便于与需求关联
- ✅ 如果没有活跃需求，保存到 `.spec/` 根目录
- ✅ 文件名固定为 `api-diff-report.md`

### 9. 生成变更报告

生成报告文件到上一步确定的路径：

#### 9.1 报告头部
```markdown
# 接口变更报告

**生成时间**: {YYYY-MM-DD HH:mm:ss}
**对比范围**: {git diff 范围，如 HEAD, main..HEAD}
**接口更新**: {是否执行了更新脚本}
**执行的脚本**: {列出执行的脚本}

---

## 📊 变更摘要

- 🔴 高风险变更: {N} 个
- 🟡 中风险变更: {M} 个
- 🔵 低风险变更: {K} 个
- 📝 总变更文件: {X} 个
- 📝 总变更行数: +{add} -{del}
```

#### 9.2 变更文件列表
```markdown
## 📁 变更文件

| 文件 | 变更类型 | +行数 | -行数 | 风险等级 |
|------|---------|-------|-------|----------|
| src/api/user.ts | 修改 | +15 | -8 | 🟡 中风险 |
| src/api/order.ts | 新增 | +45 | 0 | 🔵 低风险 |
| src/api/legacy.ts | 删除 | 0 | -30 | 🔴 高风险 |
```

#### 9.3 详细变更内容

按风险等级分组展示：

```markdown
## 🔴 高风险变更

### src/api/user.ts:45 - deleteUser

**变更类型**: HTTP 方法变更

**变更内容**:
\`\`\`diff
- export const deleteUser = (id: string) => axios.get(`/api/user/delete/${id}`)
+ export const deleteUser = (id: string) => axios.delete(`/api/user/${id}`)
\`\`\`

**影响评估**:
- HTTP 方法从 GET 改为 DELETE，符合 RESTful 规范
- 需要确认前端调用代码已更新
- 需要确认服务端路由已更新

**建议**:
- 搜索项目中对 deleteUser 的调用: `grep -r "deleteUser" src/`
- 确认所有调用处已更新

---

### src/api/auth.ts:23 - loginOld (删除)

**变更类型**: 接口删除

**变更内容**:
\`\`\`diff
- export const loginOld = (username: string) => axios.post('/api/auth/login-old', { username })
\`\`\`

**影响评估**:
- 接口已完全删除
- 可能影响旧版本客户端

**建议**:
- 搜索调用: `grep -r "loginOld" src/`
- 确认无遗留调用
- 考虑是否需要保留向后兼容
```

```markdown
## 🟡 中风险变更

### src/api/user.ts:12 - getUserInfo

**变更类型**: 参数类型变更

**变更内容**:
\`\`\`diff
- export const getUserInfo = (id: number) => axios.get(`/api/user/${id}`)
+ export const getUserInfo = (id: string) => axios.get(`/api/user/${id}`)
\`\`\`

**影响评估**:
- 参数类型从 number 改为 string
- 需要检查所有调用处的类型兼容性

**建议**:
- 运行 TypeScript 类型检查: `npm run type-check`
- 搜索调用: `grep -r "getUserInfo" src/`
```

```markdown
## 🔵 低风险变更

### src/api/user.ts (新增)

**变更类型**: 新增接口

**新增内容**:
\`\`\`typescript
+ export const createUser = (data: CreateUserRequest) =>
+   axios.post('/api/user/create', data)
+
+ interface CreateUserRequest {
+   username: string;
+   email: string;
+   password: string;
+ }
\`\`\`

**影响评估**:
- 新增接口，无破坏性变更
- 新功能实现

**建议**:
- 确认接口已在知识库中记录
- 添加单元测试
```

#### 9.4 统计信息
```markdown
## 📈 详细统计

### 按文件统计
| 文件 | 新增接口 | 删除接口 | 修改接口 |
|------|---------|---------|---------|
| src/api/user.ts | 2 | 1 | 3 |
| src/api/order.ts | 5 | 0 | 0 |

### 按变更类型统计
| 变更类型 | 数量 |
|---------|-----|
| 接口新增 | 7 |
| 接口删除 | 1 |
| 参数变更 | 3 |
| 路径变更 | 2 |
| 方法变更 | 1 |
```

#### 9.5 后续建议
```markdown
## 💡 后续建议

### 必须执行 🔴
1. 搜索已删除接口的调用: `grep -r "loginOld" src/`
2. 修复 TypeScript 类型错误: `npm run type-check`
3. 更新 API 文档

### 建议执行 🟡
1. 运行回归测试: `npm test`
2. 更新接口知识库: `/spec.init`
3. 通知前端团队接口变更

### 可选执行 🔵
1. 生成接口变更日志
2. 更新 CHANGELOG.md
3. 准备发版说明
```

### 10. 输出报告摘要

在命令执行完成后，输出简要摘要：

```
🔍 接口变更检测完成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 接口更新:
  ✅ 执行脚本: npm run akali
  ✅ 更新成功

📊 变更统计:
  📁 变更文件: 5个
  ➕ 新增接口: 7个
  ➖ 删除接口: 1个
  🔄 修改接口: 6个
  📝 变更行数: +127 -45

⚠️ 风险评估:
  🔴 高风险: 2个
  🟡 中风险: 4个
  🔵 低风险: 8个

📝 详细报告: {报告路径，如 .spec/feature/2025-12-17/api-diff-report.md}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ 高风险变更需要关注:

1. src/api/auth.ts:23
   [删除] loginOld 接口已删除
   → 搜索调用: grep -r "loginOld" src/

2. src/api/user.ts:45
   [方法变更] deleteUser: GET → DELETE
   → 确认前端和后端已同步更新

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 下一步建议:
  1. 查看详细报告: cat {报告路径}
  2. 搜索已删除接口调用: grep -r "loginOld" src/
  3. 运行类型检查: npm run type-check
  4. 运行测试: npm test
  5. 更新知识库: /spec.init

📋 查看状态: /spec.status
```

## 高级选项

### 指定对比范围
```bash
# 与 main 分支对比
/spec.api-diff --compare=main

# 与特定提交对比
/spec.api-diff --compare=abc123

# 只查看暂存区变更
/spec.api-diff --staged
```

### 指定接口文件模式
```bash
# 只检测特定目录
/spec.api-diff --files="src/api/**/*.ts"

# 多个目录
/spec.api-diff --files="src/api/**/*.ts,src/services/**/*.ts"
```

### 跳过更新询问
```bash
# 直接执行更新
/spec.api-diff --update

# 跳过更新
/spec.api-diff --no-update

# 指定更新脚本
/spec.api-diff --update-script="npm run akali"
```

### 输出格式
```bash
# JSON 格式（用于 CI/CD）
/spec.api-diff --format=json

# Markdown 表格格式
/spec.api-diff --format=table

# 只显示摘要
/spec.api-diff --summary-only
```

## 与其他命令的关系

- **配合 `/spec.review`**: 代码审查前检查接口变更
- **配合 `/spec.archive`**: 归档时记录接口变更
- **独立使用**: 可随时检测接口变更

## 最佳实践

### 1. 开发中定期检查
- ✅ 每次修改接口后执行
- ✅ 提交代码前执行
- ✅ 创建 PR 前执行

### 2. 接口更新时机
- ✅ 后端接口更新后，先执行更新脚本
- ✅ 需要同步远程接口定义时
- ✅ 切换分支后需要同步时

### 3. 关注高风险变更
- ✅ 删除接口前搜索调用代码
- ✅ 修改参数类型时运行类型检查
- ✅ 变更 HTTP 方法时确认前后端同步

### 4. 团队协作
- ✅ PR Review 时附上接口变更报告
- ✅ 接口变更通知相关团队
- ✅ 更新接口文档

### 5. CI/CD 集成
```yaml
# .github/workflows/api-check.yml
name: API 变更检测

on:
  pull_request:
    paths:
      - 'src/api/**'
      - 'src/services/**'

jobs:
  api-diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: 0

      - name: 检测接口变更
        run: |
          claude code -c "/spec.api-diff --compare=main --format=json --no-update" > api-diff.json

      - name: 检查高风险变更
        run: |
          HIGH_RISK=$(jq '.high_risk_count' api-diff.json)
          if [ "$HIGH_RISK" -gt 0 ]; then
            echo "发现 $HIGH_RISK 个高风险接口变更"
            echo "详细信息:"
            jq '.high_risk_changes' api-diff.json
            exit 1
          fi

      - name: 上传报告
        uses: actions/upload-artifact@v2
        with:
          name: api-diff-report
          path: |
            .spec/api-diff-report.md
            .spec/feature/*/api-diff-report.md
```

## 注意事项

1. **Git 依赖**: 需要在 Git 仓库中使用
2. **接口文件模式**: 自动检测常见模式，特殊情况可手动指定
3. **更新脚本**: 确保 package.json 中有正确的脚本定义
4. **性能**: 大型项目建议使用 --files 参数限制检测范围
5. **准确性**: 基于文本 diff，复杂重构可能需要人工确认

## 常见问题

### Q1: 没有检测到接口更新脚本怎么办？

**A**: 可以手动执行更新命令，或者在 package.json 中添加：
```json
{
  "scripts": {
    "akali": "akali update",
    "api:update": "your-update-command"
  }
}
```

### Q2: git diff 没有检测到变更？

**A**: 检查以下情况：
- 文件是否已提交到 Git
- 是否在 .gitignore 中
- 对比范围是否正确（HEAD、main 等）

### Q3: 如何对比两个分支的接口差异？

**A**: 使用 `--compare` 参数：
```bash
/spec.api-diff --compare=main
# 或
/spec.api-diff --compare=develop..feature-branch
```

### Q4: 更新脚本执行失败怎么办？

**A**: 命令会询问是否继续进行 diff：
- 选择"是"：跳过更新，直接对比
- 选择"否"：中止命令，先解决更新问题

### Q5: 如何只查看暂存区的接口变更？

**A**: 使用 `--staged` 参数：
```bash
/spec.api-diff --staged
```

### Q6: 支持哪些接口更新工具？

**A**: 支持任何在 package.json scripts 中定义的命令，常见的有：
- akali
- swagger-codegen
- openapi-generator
- apifox
- yapi
- 自定义更新脚本

## 执行流程图

```
开始
  ↓
检测 package.json 中的接口更新脚本
  ↓
询问: 是否需要更新接口?
  ├─ 是 → 选择更新脚本(多选) → 执行脚本 → 显示结果
  └─ 否 → 跳过更新
  ↓
询问: 对比范围 (HEAD/分支/提交/暂存区)
  ↓
检测接口文件模式
  ↓
执行 git diff 获取变更
  ↓
分析变更内容
  ├─ 识别新增接口
  ├─ 识别删除接口
  └─ 识别修改接口
  ↓
影响评估 (高/中/低风险)
  ↓
确定报告保存路径
  ├─ 有 feature 目录 → .spec/feature/{latest}/api-diff-report.md
  └─ 无 feature 目录 → .spec/api-diff-report.md
  ↓
生成详细报告
  ↓
输出摘要和建议
  ↓
完成
```

---

💡 **提示**: 建议在每次修改接口后、提交代码前执行此命令，确保接口变更可控且有完整记录。
