---
description: 初始化或更新代码知识库,扫描项目代码并生成结构化文档(架构、规范、组件、API等)
---

# 初始化代码知识库

扫描项目代码,提取关键信息并生成结构化知识库文档。

## 执行步骤

### 1. 检查知识库状态

**首次初始化**: 创建 `.spec/knowledge/` 并执行完整生成流程

**更新模式**: 已存在时询问是否增量更新,读取现有文档,扫描变更并更新受影响的部分
- **⚠️ 关键**: 增量更新时必须验证现有条目的准确性
- **路径验证**: 检查所有已记录的文件路径是否仍然存在
- **清理过时条目**: 删除已不存在的组件、API、函数、页面等记录
- **验证文件内容**: 确保记录的路径指向实际文件，而非空目录

### 2. 扫描项目
- 识别项目类型和技术栈
- 分析目录结构

### 2.5 验证路径有效性（增量更新时执行）

**如果是增量更新**, 在扫描新内容前，先验证现有知识库中的路径：

1. **读取现有知识库文件**: 读取 `.spec/knowledge/` 中已生成的文档
2. **提取文件路径**: 从各个文档中提取所有记录的文件路径
3. **逐一验证**: 使用 Read 工具验证每个路径是否仍然存在
4. **标记无效路径**: 记录所有已不存在或指向空目录的路径
5. **清理过时条目**: 从知识库中删除无效路径对应的条目

**验证规则**:
- ✅ **有效路径**: `src/components/Button/index.tsx` (文件存在)
- ❌ **无效路径**: `src/components/Button/` (仅目录，无文件)
- ❌ **无效路径**: `src/components/OldButton.tsx` (文件已删除)
- ❌ **无效路径**: `src/utils/legacy/` (目录为空或不存在)

### 3. 生成文档

**重要原则**:
- ✅ **只记录真实存在的内容**: 仅记录实际扫描到的组件/API/函数/页面
- ✅ **验证文件路径**: 确保所有记录的文件路径都真实存在
- ✅ **实时扫描**: 基于当前代码状态生成，不臆测或补全不存在的内容
- ❌ **禁止虚构**: 绝不生成项目中不存在的组件名、API、函数或文件路径
- ❌ **禁止过时信息**: 如果文件已删除或重命名，不要保留旧记录

#### 3.0 README.md (索引)
- 知识库概览
- 文档列表
- 使用场景
- 项目统计

#### 3.1 components.md
扫描 `src/components/`: 组件名称、路径、Props、功能、使用示例

**扫描要求**:
- 使用 Glob 工具查找所有组件文件（如 `**/*.tsx`, `**/*.vue`, `**/*.jsx`）
- **检查文件夹内容**: 如果 `src/components/` 不存在或为空（没有任何组件文件），跳过生成此文档
- 使用 Read 工具读取组件内容
- 只记录真实存在的组件
- **⚠️ 关键**: 记录的路径必须指向实际文件，而非仅仅是目录
  - ✅ 正确: `src/components/Button/index.tsx` (具体文件)
  - ❌ 错误: `src/components/Button/` (仅目录)
  - ❌ 错误: `src/components/Button` (目录路径，没有文件扩展名)
- **增量更新时**: 验证现有 components.md 中所有组件路径，使用 Read 工具检查文件是否存在，清理已删除的组件

#### 3.2 apis.md
扫描 `src/services/` 或 `src/api/`: API名称、方法、路径、参数、响应格式

**扫描要求**:
- 使用 Glob 工具查找 API 定义文件（如 `**/*.ts`, `**/*.js`）
- **检查文件夹内容**: 如果 `src/services/` 和 `src/api/` 都不存在或为空（没有任何 API 文件），跳过生成此文档
- 使用 Read 工具读取文件内容
- 只记录代码中实际定义的 API
- **路径验证**: 记录的文件路径必须指向实际存在的文件（如 `src/services/auth.ts`）
- **增量更新时**: 验证现有 apis.md 中所有文件路径，清理已删除的 API 定义

#### 3.3 functions.md
扫描 `src/utils/`: 函数名称、签名、功能、参数、返回值

**扫描要求**:
- 使用 Glob 工具查找工具函数文件（如 `**/*.ts`, `**/*.js`）
- **检查文件夹内容**: 如果 `src/utils/` 不存在或为空（没有任何工具函数文件），跳过生成此文档
- 使用 Read 工具读取函数定义
- 只记录代码中实际存在的函数
- **路径验证**: 记录的文件路径必须指向实际存在的文件（如 `src/utils/format.ts`）
- **增量更新时**: 验证现有 functions.md 中所有文件路径，清理已删除的函数定义

#### 3.4 pages.md
扫描 `src/pages/`: 页面名称、路由、功能、依赖组件

**扫描要求**:
- 使用 Glob 工具查找页面文件（如 `**/*.tsx`, `**/*.vue`, `**/*.jsx`）
- **检查文件夹内容**: 如果 `src/pages/` 不存在或为空（没有任何页面文件），跳过生成此文档
- 使用 Read 工具读取页面内容和路由配置
- 只记录实际存在的页面和路由
- **路径验证**: 记录的文件路径必须指向实际存在的文件（如 `src/pages/Home/index.tsx`）
- **增量更新时**: 验证现有 pages.md 中所有页面路径，清理已删除的页面

#### 3.5 coding-standards.md
分析代码规范: 命名规范、目录结构、代码风格、导入顺序、注释规范

**Lint 配置检查**:
- 检查是否存在 `.eslintrc.*` 或 `eslint` 配置
- 记录项目使用的 lint 工具和规则
- 如果没有 lint 配置，在文档中标注并建议配置
- 提取关键规则: 缩进、引号、分号等

#### 3.6 architecture.md
分析架构: 项目类型、技术栈、状态管理、路由方案、样式方案、构建工具、主要依赖

#### 3.7 interactions.md
记录关键交互流程: 用户操作流程、页面跳转、数据流转、业务处理流程

**扫描要求**:
- 分析关键页面的交互逻辑（从路由配置和组件代码中提取）
- 识别主要用户流程（登录、注册、核心业务操作等）
- 记录页面间跳转关系（基于路由跳转代码）
- 提取状态变化流程（基于状态管理代码）

**支持图文结合**:
- **流程图**: 使用 Mermaid 语法绘制流程图
- **截图**: 如果项目文档中有交互流程截图，引用相对路径
- **文字描述**: 补充关键节点的文字说明

**文档格式示例**:
```markdown
# 交互流程

## 用户登录流程

### 流程图
\`\`\`mermaid
graph TD
    A[打开登录页] --> B{是否已登录?}
    B -->|是| C[跳转首页]
    B -->|否| D[显示登录表单]
    D --> E[用户输入账号密码]
    E --> F[点击登录]
    F --> G{验证成功?}
    G -->|是| H[保存token]
    H --> I[跳转首页]
    G -->|否| J[显示错误提示]
\`\`\`

### 关键节点
1. **登录页面**: `/pages/login/index.tsx`
   - 组件: `LoginForm`
   - 状态管理: `useAuthStore`

2. **API调用**: `/services/auth.ts` - `login()`
   - 请求: `POST /api/auth/login`
   - 响应: `{token, userInfo}`

3. **跳转逻辑**:
   - 成功: `router.push('/')`
   - 失败: 显示 `Toast.error()`

### 相关截图
如果有设计稿或文档中的流程图，可以引用：
![登录流程](../docs/flows/login-flow.png)
```

**扫描重点**:
- 只记录主要的、常用的交互流程（3-5个）
- 避免过度细节化，聚焦核心业务流程
- 流程图优先使用 Mermaid，简洁清晰
- 关联相关的页面、组件、API，便于追溯

#### 3.8 store.md
记录状态管理: Store定义、State结构、Actions、Getters/Selectors

**扫描要求**:
- 识别状态管理方案（Redux/Zustand/Pinia/Vuex/Context等）
- 扫描 `src/store/` 或 `src/stores/` 目录（如 `**/*.ts`, `**/*.js`）
- **检查文件夹内容**: 如果 `src/store/` 和 `src/stores/` 都不存在或为空（没有任何 Store 文件），跳过生成此文档
- 提取 Store 名称、状态结构、主要 Actions
- 记录状态持久化方案（localStorage/sessionStorage等）
- **路径验证**: 记录的文件路径必须指向实际存在的文件（如 `src/store/auth.ts`）
- **增量更新时**: 验证现有 store.md 中所有 Store 文件路径，清理已删除的 Store

**文档格式**:
```markdown
# 状态管理

## 状态管理方案
- **工具**: Zustand / Redux Toolkit / Pinia
- **目录**: `src/store/`
- **持久化**: localStorage (通过 persist 中间件)

## Store 清单

### 1. authStore - 用户认证状态
**文件**: `src/store/auth.ts`

**State 结构**:
- `user`: 用户信息对象
- `token`: 认证令牌
- `isLoggedIn`: 登录状态

**主要 Actions**:
- `login(credentials)` - 用户登录
- `logout()` - 退出登录
- `refreshToken()` - 刷新令牌

**使用示例**:
\`\`\`typescript
const { user, login } = useAuthStore()
\`\`\`

### 2. cartStore - 购物车状态
...
```

**扫描重点**:
- 只记录 Store 的接口（名称、State、Actions），不包含实现细节
- 验证所有 Store 文件路径的真实性
- 记录 Store 之间的依赖关系

#### 3.9 hooks.md
记录自定义 Hooks (React) 或 Composables (Vue)

**扫描要求**:
- 扫描 `src/hooks/` 或 `src/composables/` 目录（如 `**/*.ts`, `**/*.js`）
- **检查文件夹内容**: 如果 `src/hooks/` 和 `src/composables/` 都不存在或为空（没有任何 Hook/Composable 文件），跳过生成此文档
- 提取 Hook 名称、参数、返回值、功能说明
- 记录 Hook 的依赖关系
- **路径验证**: 记录的文件路径必须指向实际存在的文件（如 `src/hooks/useAuth.ts`）
- **增量更新时**: 验证现有 hooks.md 中所有 Hook 文件路径，清理已删除的 Hook

**文档格式**:
```markdown
# 自定义 Hooks / Composables

## Hooks 清单

### 1. useAuth - 认证相关 Hook
**文件**: `src/hooks/useAuth.ts`

**参数**: 无

**返回值**:
- `user`: 当前用户信息
- `login`: 登录函数
- `logout`: 退出函数
- `isLoading`: 加载状态

**功能**: 封装用户认证逻辑，提供登录、退出等操作

**使用示例**:
\`\`\`typescript
const { user, login, logout } = useAuth()
\`\`\`

### 2. useFetch - 数据请求 Hook
...
```

#### 3.10 constants.md
记录项目常量和枚举定义

**扫描要求**:
- 扫描 `src/constants/` 或 `src/enums/` 目录（如 `**/*.ts`, `**/*.js`）
- **检查文件夹内容**: 如果 `src/constants/` 和 `src/enums/` 都不存在或为空（没有任何常量文件），跳过生成此文档
- 提取常量名称、值、用途说明
- 识别枚举类型和取值范围
- **路径验证**: 记录的文件路径必须指向实际存在的文件（如 `src/constants/api.ts`）
- **增量更新时**: 验证现有 constants.md 中所有常量文件路径，清理已删除的常量定义

**文档格式**:
```markdown
# 常量定义

## 常量清单

### 1. API 相关
**文件**: `src/constants/api.ts`

- `API_BASE_URL`: API 基础地址
- `API_TIMEOUT`: 请求超时时间 (30000ms)
- `API_VERSION`: API 版本 ("v1")

### 2. 业务状态枚举
**文件**: `src/constants/status.ts`

**OrderStatus** - 订单状态:
- `PENDING = 0` - 待支付
- `PAID = 1` - 已支付
- `SHIPPED = 2` - 已发货
- `COMPLETED = 3` - 已完成
- `CANCELLED = 4` - 已取消
```

#### 3.11 types.md
记录 TypeScript 类型定义 (仅 TypeScript 项目)

**扫描要求**:
- 扫描 `src/types/` 或 `src/@types/` 目录（如 `**/*.ts`, `**/*.d.ts`）
- **检查文件夹内容**: 如果 `src/types/` 和 `src/@types/` 都不存在或为空（没有任何类型定义文件），跳过生成此文档
- 提取 Interface、Type、Enum 定义
- 记录类型之间的继承和组合关系
- **路径验证**: 记录的文件路径必须指向实际存在的文件（如 `src/types/user.ts`）
- **增量更新时**: 验证现有 types.md 中所有类型文件路径，清理已删除的类型定义

**文档格式**:
```markdown
# 类型定义

## 类型清单

### 1. User - 用户类型
**文件**: `src/types/user.ts`

\`\`\`typescript
interface User {
  id: number
  username: string
  email: string
  avatar?: string
  role: UserRole
}

enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}
\`\`\`

### 2. ApiResponse - API 响应类型
...
```

**扫描重点**:
- 只记录公共的、被广泛使用的类型
- 验证类型文件路径的真实性
- 避免记录组件内部的私有类型

### 4. 总结报告
输出扫描统计和知识库路径

## 输出示例

**首次初始化**:
```
✅ 代码知识库初始化完成
📊 扫描: 文件156个, 组件23个, API45个, 函数67个, 页面12个
   Store 3个, Hooks 8个, 常量文件5个, 类型定义12个, 交互流程5个
📁 知识库: .spec/knowledge/
   ├── README.md           # 知识库索引
   ├── architecture.md     # 架构设计
   ├── components.md       # 组件清单
   ├── apis.md            # API接口
   ├── functions.md       # 工具函数
   ├── pages.md           # 页面路由
   ├── coding-standards.md # 代码规范
   ├── interactions.md    # 交互流程
   ├── store.md           # 状态管理 ⭐
   ├── hooks.md           # 自定义 Hooks ⭐
   ├── constants.md       # 常量定义 ⭐
   └── types.md           # 类型定义 ⭐

🔍 Lint 配置: [已检测到 ESLint / 未配置]
   ⚠️ 建议: 配置 lint 工具以确保代码质量

💡 下一步: /spec.feat-prd 创建新需求
📋 查看状态: /spec.status
```

**更新模式**:
```
🔄 增量更新完成
📊 变更: 文件+8, 组件+2, 函数+3, 页面+1, Store+1, Hook+2
📝 已更新: README, components.md, functions.md, pages.md, store.md, hooks.md
📋 查看状态: /spec.status
```

## 注意事项

1. **真实性优先**: 只记录实际扫描到的内容,绝不虚构或臆测
2. **验证路径**: 确保所有记录的文件路径都真实存在,使用 Glob 和 Read 工具验证
   - **⚠️ 关键**: 路径必须指向实际文件（如 `src/components/Button/index.tsx`），而非空目录（如 `src/components/Button/`）
   - 使用 Read 工具验证每个路径是否可访问
3. **避免重复冗余**:
   - 不同文档之间不要重复记录相同信息
   - 例如：components.md 记录组件清单，pages.md 记录页面，不要在 pages.md 中重复描述组件细节
   - hooks.md 和 store.md 各司其职，不要交叉记录
   - 跨文档引用时使用相对路径链接，避免复制粘贴
4. **大项目只提取核心部分**: 避免过度扫描影响性能
5. **保持文档格式统一**: 所有知识库文档使用一致的 Markdown 格式
6. **空目录自动跳过**: 如果项目没有某个目录（如 `src/api/`）或目录为空（没有任何相关文件），跳过生成对应的知识库文档
7. **增量更新时智能对比**:
   - **必须验证现有条目**: 在扫描新内容前，先验证现有知识库中所有文件路径的有效性
   - **清理过时条目**: 删除已不存在的组件、API、函数、页面等记录
   - **保留人工编辑**: 谨慎保留用户手动添加的内容
8. **强制重建**: 删除 `.spec/knowledge/` 后重新执行可完全重建知识库

### 质量检查清单

**首次初始化和增量更新都必须执行以下检查**:

#### 路径验证检查
- [ ] 所有组件的文件路径都指向实际文件（使用 Read 工具验证可访问），而非空目录
- [ ] 所有 API 定义都来自实际的代码文件（文件路径可用 Read 工具访问）
- [ ] 所有函数签名都是从实际存在的代码文件中提取的
- [ ] 所有页面路由都指向项目中实际存在的文件
- [ ] 所有 Store 文件路径指向实际存在的文件（如 `src/store/auth.ts`）
- [ ] 所有 Hook/Composable 文件路径指向实际存在的文件（如 `src/hooks/useAuth.ts`）
- [ ] 所有常量文件路径指向实际存在的文件（如 `src/constants/api.ts`）
- [ ] 所有类型定义文件路径指向实际存在的文件（TypeScript 项目）

#### 内容准确性检查
- [ ] 交互流程中引用的页面、组件、API、Store 都在知识库中有对应记录且路径真实存在
- [ ] Mermaid 流程图语法正确，能正常渲染
- [ ] 截图路径（如果有）指向实际存在的文件
- [ ] 没有任何虚构或猜测的内容

#### 增量更新专项检查
- [ ] **验证现有条目**: 已读取现有知识库文档，验证所有记录的文件路径
- [ ] **清理过时条目**: 已删除所有指向不存在文件的记录
- [ ] **无空目录路径**: 确认没有仅指向目录而非文件的路径（如 `src/components/Button/` 应改为 `src/components/Button/index.tsx`）
