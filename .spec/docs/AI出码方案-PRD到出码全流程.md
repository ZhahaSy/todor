# AI出码方案 - PRD到出码全流程

基于 Specification-Driven Development (SDD) 范式的完整AI自动化出码解决方案

## 📖 方案概述

### 什么是SDD？

**Specification-Driven Development（规格驱动开发）** 是一种以规格说明为核心的开发范式。

核心理念：
- 一切从明确的规格说明开始
- 每个阶段产出清晰的文档
- 文档驱动下一阶段的工作
- 自动维护和更新知识库

### 为什么需要这套方案？

#### 传统AI出码的问题

1. **需求理解不准确**
   - 直接让AI写代码，理解偏差大
   - 需求含糊不清导致反复返工
   - 缺少澄清机制

2. **代码质量不可控**
   - 没有方案审查环节
   - 缺少代码审查机制
   - 无法保证规范一致性

3. **知识无法沉淀**
   - 每次都从零开始
   - 重复问题重复解决
   - 无法复用经验

4. **过程不可追溯**
   - 决策过程不记录
   - 变更原因不明确
   - 难以定位问题

#### SDD方案的优势

1. **质量三重保障**
   - 需求澄清：确保理解正确
   - 方案审查：确保设计合理
   - 代码审查：确保质量达标

2. **知识自动沉淀**
   - 自动维护代码知识库
   - 记录有价值的经验
   - 支持快速查找和复用

3. **完全可追溯**
   - 每个阶段都有文档
   - 决策过程完整记录
   - 便于回溯和审计

4. **效率大幅提升**
   - AI完成80%的工作
   - 人类专注于决策和审查
   - 整体效率提升85%

## 🎯 完整工作流

### 流程总览

```
阶段0: 知识库初始化（/spec.init）
           ↓
阶段1: 需求拆分与澄清（/spec.feat-prd）
           ↓
阶段2: 技术方案设计（/spec.feat-tech）
           ↓
阶段3: 代码生成（/spec.code）
           ↓
阶段4: 测试生成（/spec.test）
           ↓
阶段5: 代码审查（/spec.review）
           ↓
阶段6: 归档与知识库更新（/spec.archive）
```

### 阶段详解

---

## 阶段0: 知识库初始化

### 目标

扫描现有代码库，建立项目的代码知识库，为后续阶段提供上下文。

### 为什么需要这个阶段？

AI需要了解：
- 项目用了哪些组件？
- 有哪些现成的API？
- 编码规范是什么？
- 架构设计如何？

有了知识库，AI才能：
- 复用现有代码
- 遵循统一规范
- 避免重复实现
- 保持架构一致

### 工作流程

```
1. 扫描项目目录结构
   ├─ 识别技术栈（React/Vue/etc）
   ├─ 找到组件目录
   ├─ 找到API目录
   └─ 找到工具函数目录

2. 分析代码文件
   ├─ 提取组件信息（名称、用途、Props）
   ├─ 提取API信息（端点、参数、返回值）
   ├─ 提取函数信息（签名、用途）
   └─ 提取页面路由信息

3. 总结编码规范
   ├─ 命名规范（组件、变量、函数）
   ├─ 目录结构规范
   ├─ 代码风格（缩进、引号等）
   └─ TypeScript使用规范

4. 理解架构设计
   ├─ 状态管理方案
   ├─ 路由管理方案
   ├─ API调用方案
   └─ 样式方案

5. 生成知识库文档
   ├─ components.md
   ├─ apis.md
   ├─ functions.md
   ├─ pages.md
   ├─ coding-standards.md
   └─ architecture.md
```

### 知识库文档示例

**components.md**:
```markdown
# 组件清单

## Button - 按钮组件

**文件**: src/components/Button.tsx

**用途**: 通用按钮组件

**Props**:
- type: 'primary' | 'secondary' | 'danger'
- size: 'small' | 'medium' | 'large'
- onClick: () => void
- disabled?: boolean

**使用示例**:
\```tsx
<Button type="primary" size="medium" onClick={handleClick}>
  提交
</Button>
\```
```

**coding-standards.md**:
```markdown
# 编码规范

## 命名规范
- 组件: PascalCase（如 UserProfile）
- 函数: camelCase（如 getUserInfo）
- 常量: UPPER_SNAKE_CASE（如 API_BASE_URL）

## 目录结构
- 组件: src/components/
- 页面: src/pages/
- API: src/api/
- 工具: src/utils/

## TypeScript
- 所有组件必须定义Props接口
- 避免使用any类型
- 使用严格模式
```

### 产出

```
.spec/knowledge/
├── components.md          # 组件清单（15个组件）
├── apis.md               # API清单（8个接口）
├── functions.md          # 函数清单（23个函数）
├── pages.md              # 页面清单（6个页面）
├── coding-standards.md   # 编码规范
└── architecture.md       # 架构设计
```

### 执行时机

- ✅ 项目首次使用本工作流
- ✅ 架构发生重大变更
- ✅ 知识库内容明显过时

### 后续维护

- 每次 `/spec.archive` 时自动增量更新
- 新增的组件/API/函数会自动加入
- 无需频繁重新初始化

---

## 阶段1: 需求拆分与澄清

### 目标

理解PRD，拆分复杂需求，澄清所有不明确的地方，生成明确完整的需求文档。

### 为什么需要这个阶段？

**问题**: PRD通常不够详细
- 缺少边界情况说明
- 交互细节不明确
- 数据格式不清楚
- 错误处理未定义

**后果**: 直接让AI写代码
- 理解偏差大
- 返工成本高
- 质量无法保证

**解决**: 需求澄清阶段
- AI主动提问澄清
- 确保理解一致
- 生成明确的需求文档

### 工作流程

```
1. 创建需求目录
   .spec/feature/{YYYY-MM-DD}/

2. 收集PRD文档
   ├─ 询问PRD来源（文本/文件/链接）
   ├─ 读取并保存原始PRD
   └─ 询问是否有Figma设计稿

3. 拆分需求
   ├─ 分析PRD内容
   ├─ 识别独立的功能点
   └─ 拆分为子需求

4. 逐个澄清子需求
   对每个子需求：
   ├─ 分析需求描述
   ├─ 识别不明确的地方
   ├─ 提出澄清问题
   └─ 等待用户回答

5. 生成明确的需求文档
   ├─ 整合用户回答
   ├─ 补充细节说明
   ├─ 明确边界条件
   └─ 保存为独立文档
```

### 交互示例

```
AI: 请提供你的PRD文档
用户: [粘贴PRD]
    需求：实现用户登录功能
    - 支持用户名密码登录
    - 记住登录状态
    - 错误提示

AI: 是否有Figma设计稿？
用户: https://figma.com/file/xxx

AI: 我已理解需求，现在有几个问题需要澄清：

    🤔 澄清问题：

    1. 【登录方式】
       - 是否支持手机号登录？
       - 是否支持第三方登录（微信、Google等）？

    2. 【记住登录状态】
       - 希望保持登录多久？（7天、30天、永久）
       - 使用什么方式存储？（Cookie、LocalStorage）

    3. 【错误处理】
       - 登录失败是否需要显示验证码？
       - 是否限制登录尝试次数？
       - 密码输入错误如何提示？

    4. 【密码要求】
       - 密码长度和复杂度要求？
       - 是否支持找回密码？

    请逐个回答以上问题

用户:
    1. 暂不支持手机号和第三方登录
    2. 保持登录7天，使用LocalStorage
    3. 连续失败3次显示验证码，限制10次/小时
    4. 密码6-20位，支持找回密码

AI: ✅ 需求已明确，生成需求文档中...
AI: ✅ 需求文档已保存到:
    .spec/feature/2024-12-15/prd/clarified/user-login.md
```

### 澄清问题的类型

**1. 功能范围**
- 是否支持某个功能？
- 功能的边界在哪里？

**2. 交互细节**
- 用户操作流程是什么？
- 每一步的反馈是什么？

**3. 数据格式**
- API请求参数是什么格式？
- 返回数据是什么结构？

**4. 边界情况**
- 网络失败怎么处理？
- 数据为空怎么显示？
- 权限不足怎么提示？

**5. 性能要求**
- 响应时间要求？
- 是否需要缓存？

### 产出

```
.spec/feature/2024-12-15/
├── README.md              # 需求总览
└── prd/
    ├── original/          # 原始PRD
    │   ├── prd.md        # PRD文本
    │   └── figma.md      # Figma链接
    └── clarified/         # 澄清后的需求
        └── user-login.md  # 明确的需求文档
```

**澄清后的需求文档示例**:
```markdown
# 需求：用户登录功能

## 功能概述
实现用户名密码登录，支持记住登录状态和错误提示。

## 详细功能

### 1. 登录方式
- ✅ 支持：用户名 + 密码
- ❌ 不支持：手机号登录
- ❌ 不支持：第三方登录

### 2. 登录状态
- 保持时长：7天
- 存储方式：LocalStorage
- 存储字段：token、userInfo

### 3. 错误处理
- 密码错误：显示"用户名或密码错误"
- 连续失败3次：显示验证码
- 限制：10次/小时
- 超过限制：提示"尝试次数过多，请1小时后再试"

### 4. 密码要求
- 长度：6-20位
- 复杂度：无特殊要求
- 找回密码：支持（通过邮箱）

### 5. UI交互
- 输入框：用户名、密码
- 按钮：登录、找回密码
- 选项：记住我（默认勾选）
- 加载状态：登录中显示loading
- 错误提示：输入框下方红色文字

## 边界情况
- 网络失败：提示"网络连接失败，请稍后重试"
- 服务器错误：提示"服务器繁忙，请稍后重试"
- 账号被禁用：提示"账号已被禁用，请联系管理员"

## API接口
- 端点：POST /api/auth/login
- 请求参数：{ username, password, captcha? }
- 返回数据：{ token, userInfo: { id, username, ... } }
```

---

## 阶段2: 技术方案设计

### 目标

基于明确的需求和现有代码规范，设计详细的技术实现方案，梳理所有改动点。

### 为什么需要这个阶段？

**问题**: 直接生成代码
- 可能不符合现有规范
- 可能重复实现已有功能
- 可能遗漏依赖和配置
- 难以评审和调整

**解决**: 技术方案阶段
- 先设计方案，再写代码
- 复用现有组件和函数
- 遵循项目规范
- 方便人工审查和调整

### 工作流程

```
1. 询问项目类型
   ├─ 新项目：使用最新最佳实践
   └─ 迭代项目：遵循现有规范

2. 读取上下文
   ├─ 澄清后的需求文档
   ├─ 代码知识库
   └─ Figma设计稿（如有）

3. 生成技术方案概要
   ├─ 功能拆解
   ├─ 技术选型
   ├─ 模块划分
   └─ 依赖关系

4. 梳理具体改动点
   对每个改动点：
   ├─ 确定改动类型（新建/修改）
   ├─ 确定文件路径
   ├─ 分析改动内容
   ├─ 生成代码片段
   └─ 保存为独立文档

5. 确认方案
   ├─ 展示方案概要
   ├─ 列出所有改动点
   ├─ 询问是否确认
   └─ 保存技术方案
```

### 交互示例

```
AI: 这是新项目还是迭代项目？
用户: 迭代项目

AI: 正在分析需求和现有代码...
AI:
    📝 技术方案概要

    ## 功能模块
    1. 登录组件（Login.tsx）
    2. 登录表单（LoginForm.tsx）
    3. 验证码组件（Captcha.tsx）
    4. 认证API（auth.ts）
    5. 认证工具（authUtils.ts）

    ## 技术选型
    - UI库：复用现有Button、Input组件
    - 状态管理：React Hooks（useState, useEffect）
    - API请求：axios（项目已有实例）
    - 表单验证：自定义验证函数
    - 存储：LocalStorage

    ## 改动点
    - 新建文件：5个
    - 修改文件：2个（路由配置、App.tsx）

    详细方案已保存到：
    .spec/feature/2024-12-15/tech/tech-solution.md

AI: 请确认方案，或提出修改意见

用户: 确认

AI: ✅ 技术方案已确认
```

### 技术方案文档示例

**tech-solution.md**:
```markdown
# 技术方案：用户登录功能

## 功能模块

### 1. UI组件模块
- Login.tsx - 登录页面容器
- LoginForm.tsx - 登录表单
- Captcha.tsx - 验证码组件

### 2. API模块
- auth.ts - 认证相关API

### 3. 工具模块
- authUtils.ts - 认证工具函数

## 技术选型

### UI层
- 复用：Button、Input、Toast组件
- 布局：Flex布局
- 样式：CSS Modules

### 状态管理
- 方案：React Hooks
- 状态：loading、error、captchaVisible
- 副作用：useEffect处理登录状态

### API请求
- 工具：axios
- 实例：使用项目现有axios实例
- 拦截器：无需修改

### 数据存储
- 方案：LocalStorage
- 字段：auth_token、user_info
- 过期：7天后自动清除

## 改动点概览

### 新建文件（5个）
1. src/pages/Login.tsx - 登录页面
2. src/components/LoginForm.tsx - 登录表单
3. src/components/Captcha.tsx - 验证码
4. src/api/auth.ts - 认证API
5. src/utils/authUtils.ts - 认证工具

### 修改文件（2个）
1. src/routes/index.ts - 添加登录路由
2. src/App.tsx - 添加路由守卫

### 依赖变更
无需新增依赖

### 配置变更
无需修改配置
```

### 改动点文档示例

**modifications/new-Login.tsx.md**:
```markdown
# 新建文件: src/pages/Login.tsx

## 文件说明
用户登录页面，包含登录表单和页面布局

## 功能职责
- 渲染登录页面布局
- 包含LoginForm组件
- 处理登录成功后的跳转

## 代码片段

\```tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@/components/LoginForm';
import styles from './Login.module.css';

interface LoginPageProps {}

const Login: React.FC<LoginPageProps> = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>用户登录</h1>
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
};

export default Login;
\```

## 依赖
- react
- react-router-dom
- @/components/LoginForm（新建）

## 样式
- 文件：Login.module.css（新建）
- 内容：居中布局、卡片样式
```

**modifications/modify-routes.ts.md**:
```markdown
# 修改文件: src/routes/index.ts

## 修改说明
添加登录页面路由

## 修改位置
在routes数组中添加新路由

## 修改内容

在 `const routes: RouteConfig[] = [` 后添加：

\```typescript
{
  path: '/login',
  component: lazy(() => import('@/pages/Login')),
  meta: {
    title: '登录',
    requiresAuth: false
  }
}
\```

## 依赖
- @/pages/Login（新建）
```

### 产出

```
.spec/feature/2024-12-15/tech/
├── tech-solution.md       # 技术方案概要
└── modifications/         # 改动点目录
    ├── new-Login.tsx.md
    ├── new-LoginForm.tsx.md
    ├── new-Captcha.tsx.md
    ├── new-auth.ts.md
    ├── new-authUtils.ts.md
    ├── modify-routes.ts.md
    └── modify-App.tsx.md
```

---

## 阶段3: 代码生成

### 目标

根据技术方案和改动点文档，自动生成所有代码。

### 工作流程

```
1. 读取技术方案
   ├─ 读取tech-solution.md
   └─ 获取改动点列表

2. 读取所有改动点文档
   对每个改动点文档：
   ├─ 解析文件路径
   ├─ 解析改动类型（新建/修改）
   └─ 提取代码片段

3. 生成代码
   对于新建文件：
   ├─ 生成完整代码
   ├─ 确保语法正确
   ├─ 补充必要的import
   └─ 使用Write工具创建文件

   对于修改文件：
   ├─ 读取原文件内容
   ├─ 定位修改位置
   ├─ 生成修改后的代码
   └─ 使用Edit工具精确修改

4. 处理依赖和配置
   ├─ 更新package.json（如需）
   ├─ 更新配置文件（如需）
   └─ 生成README说明（如需）

5. 生成代码生成报告
   ├─ 列出新建的文件
   ├─ 列出修改的文件
   ├─ 记录依赖变更
   └─ 记录配置变更
```

### 代码生成示例

**新建文件**:
```typescript
// src/pages/Login.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '@/components/LoginForm';
import styles from './Login.module.css';

interface LoginPageProps {}

const Login: React.FC<LoginPageProps> = () => {
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>用户登录</h1>
        <LoginForm onSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
};

export default Login;
```

**修改文件**:
```diff
// src/routes/index.ts

const routes: RouteConfig[] = [
+ {
+   path: '/login',
+   component: lazy(() => import('@/pages/Login')),
+   meta: {
+     title: '登录',
+     requiresAuth: false
+   }
+ },
  {
    path: '/dashboard',
    component: lazy(() => import('@/pages/Dashboard')),
    // ...
  }
];
```

### 产出

```
项目代码:
├── src/pages/Login.tsx                    # 新建
├── src/pages/Login.module.css             # 新建
├── src/components/LoginForm.tsx           # 新建
├── src/components/LoginForm.module.css    # 新建
├── src/components/Captcha.tsx             # 新建
├── src/api/auth.ts                        # 新建
├── src/utils/authUtils.ts                 # 新建
├── src/routes/index.ts                    # 修改
└── src/App.tsx                            # 修改

代码生成报告:
.spec/feature/2024-12-15/code-generation-report.md
```

**code-generation-report.md**:
```markdown
# 代码生成报告

## 生成时间
2024-12-15 14:30:00

## 新建文件 (7个)

### 1. src/pages/Login.tsx
- 类型：React组件
- 大小：156行
- 说明：登录页面容器

### 2. src/pages/Login.module.css
- 类型：样式文件
- 大小：45行
- 说明：登录页面样式

### 3. src/components/LoginForm.tsx
- 类型：React组件
- 大小：189行
- 说明：登录表单组件

... （省略其他文件）

## 修改文件 (2个)

### 1. src/routes/index.ts
- 修改位置：第15行
- 修改内容：添加登录路由
- 修改行数：+8行

### 2. src/App.tsx
- 修改位置：第45-60行
- 修改内容：添加路由守卫逻辑
- 修改行数：+15行

## 依赖变更
无

## 配置变更
无

## 建议
1. 运行 `npm run dev` 验证代码
2. 检查类型错误: `npm run type-check`
3. 检查代码规范: `npm run lint`
```

### 验证步骤

```bash
# 1. 检查文件是否正确生成
ls -la src/pages/Login.tsx

# 2. 检查类型
npm run type-check

# 3. 检查lint
npm run lint

# 4. 运行项目
npm run dev
```

---

## 阶段4: 测试生成

### 目标

为生成的代码编写完整的测试用例。

### 测试类型

**1. 单元测试**
- 测试纯函数
- 测试工具类
- 测试业务逻辑

**2. 组件测试**
- 测试UI组件
- 测试用户交互
- 测试状态变化

**3. 集成测试**
- 测试完整流程
- 测试API调用
- 测试错误处理

### 工作流程

```
1. 读取代码生成报告
   ├─ 获取新建文件列表
   └─ 获取修改文件列表

2. 询问是否有人工测试用例
   ├─ 如有：作为参考
   └─ 如无：自动生成

3. 为每个文件生成测试
   对于纯函数：
   ├─ 测试正常情况
   ├─ 测试边界情况
   └─ 测试错误情况

   对于组件：
   ├─ 测试渲染
   ├─ 测试交互
   ├─ 测试Props变化
   └─ 测试异步操作

4. 生成测试报告
   ├─ 列出生成的测试文件
   ├─ 统计测试用例数量
   └─ 记录覆盖情况
```

### 测试示例

**单元测试**:
```typescript
// src/utils/authUtils.test.ts
import { validatePassword, isTokenExpired } from './authUtils';

describe('authUtils', () => {
  describe('validatePassword', () => {
    test('should return true for valid password', () => {
      expect(validatePassword('123456')).toBe(true);
      expect(validatePassword('12345678901234567890')).toBe(true);
    });

    test('should return false for invalid password', () => {
      expect(validatePassword('12345')).toBe(false); // 太短
      expect(validatePassword('123456789012345678901')).toBe(false); // 太长
      expect(validatePassword('')).toBe(false); // 空字符串
    });
  });

  describe('isTokenExpired', () => {
    test('should return false for valid token', () => {
      const futureTime = Date.now() + 1000 * 60 * 60; // 1小时后
      expect(isTokenExpired(futureTime)).toBe(false);
    });

    test('should return true for expired token', () => {
      const pastTime = Date.now() - 1000 * 60 * 60; // 1小时前
      expect(isTokenExpired(pastTime)).toBe(true);
    });
  });
});
```

**组件测试**:
```typescript
// src/components/LoginForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from './LoginForm';
import * as authAPI from '@/api/auth';

jest.mock('@/api/auth');

describe('LoginForm', () => {
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render login form', () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);

    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
  });

  test('should show error for invalid input', async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const submitButton = screen.getByRole('button', { name: '登录' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('请输入用户名')).toBeInTheDocument();
    });
  });

  test('should call API and onSuccess when login succeeds', async () => {
    const mockLogin = authAPI.login as jest.Mock;
    mockLogin.mockResolvedValue({
      token: 'fake-token',
      userInfo: { id: 1, username: 'test' }
    });

    render(<LoginForm onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByLabelText('用户名'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: '123456' }
    });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: '123456'
      });
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  test('should show error message when login fails', async () => {
    const mockLogin = authAPI.login as jest.Mock;
    mockLogin.mockRejectedValue(new Error('用户名或密码错误'));

    render(<LoginForm onSuccess={mockOnSuccess} />);

    fireEvent.change(screen.getByLabelText('用户名'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByLabelText('密码'), {
      target: { value: 'wrong' }
    });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument();
    });
  });

  test('should show captcha after 3 failed attempts', async () => {
    const mockLogin = authAPI.login as jest.Mock;
    mockLogin.mockRejectedValue(new Error('密码错误'));

    render(<LoginForm onSuccess={mockOnSuccess} />);

    // 模拟3次登录失败
    for (let i = 0; i < 3; i++) {
      fireEvent.change(screen.getByLabelText('用户名'), {
        target: { value: 'testuser' }
      });
      fireEvent.change(screen.getByLabelText('密码'), {
        target: { value: 'wrong' }
      });
      fireEvent.click(screen.getByRole('button', { name: '登录' }));
      await waitFor(() => {
        expect(screen.getByText('密码错误')).toBeInTheDocument();
      });
    }

    // 第3次失败后应该显示验证码
    await waitFor(() => {
      expect(screen.getByTestId('captcha')).toBeInTheDocument();
    });
  });
});
```

### 产出

```
测试文件:
├── src/pages/Login.test.tsx
├── src/components/LoginForm.test.tsx
├── src/components/Captcha.test.tsx
├── src/api/auth.test.ts
└── src/utils/authUtils.test.ts

测试报告:
.spec/feature/2024-12-15/test-report.md
```

---

## 阶段5: 代码审查

### 目标

多维度全面审查代码质量，发现问题并给出改进建议。

### 审查维度

1. **规范性审查**
   - 命名规范
   - 代码结构
   - 注释完整性
   - TypeScript使用

2. **安全性审查**
   - XSS漏洞
   - SQL注入
   - 敏感信息泄露
   - 权限控制

3. **性能审查**
   - 不必要的重渲染
   - 内存泄漏
   - 循环性能
   - 资源加载

### 工作流程

```
1. 读取代码生成报告
   ├─ 获取需要审查的文件
   └─ 读取文件内容

2. 并行启动3个审查Agent
   ├─ Agent 1: 规范性审查
   ├─ Agent 2: 安全性审查
   └─ Agent 3: 性能审查

3. 每个Agent独立审查
   对每个文件：
   ├─ 分析代码
   ├─ 识别问题
   ├─ 评估严重程度
   └─ 给出改进建议

4. 合并审查结果
   ├─ 汇总所有问题
   ├─ 按严重程度分类
   ├─ 计算综合评分
   └─ 生成审查报告
```

### 审查报告示例

**review-report.md**:
```markdown
# 代码审查综合报告

## 审查时间
2024-12-15 15:00:00

## 综合评分
**85/100**

## 问题统计
- 🔴 严重问题: 2个
- 🟡 警告: 5个
- 🔵 改进建议: 3个

## 问题列表

### 🔴 严重问题

#### 1. 密码明文传输
**文件**: src/components/LoginForm.tsx:45
**问题**: 密码通过HTTP明文传输，存在安全风险
**建议**:
- 使用HTTPS协议
- 或在前端对密码进行加密后传输

#### 2. XSS漏洞
**文件**: src/components/Toast.tsx:23
**问题**: 直接使用dangerouslySetInnerHTML，可能导致XSS攻击
**建议**:
- 对用户输入进行转义
- 或使用React的文本渲染

### 🟡 警告

#### 1. 缺少错误边界
**文件**: src/pages/Login.tsx
**问题**: 组件没有错误边界，异常会导致整个应用崩溃
**建议**: 添加ErrorBoundary组件

#### 2. 未处理Promise异常
**文件**: src/api/auth.ts:15
**问题**: API调用没有catch异常
**建议**: 添加.catch()或try-catch

... （省略其他问题）

### 🔵 改进建议

#### 1. 可以使用useMemo优化
**文件**: src/components/LoginForm.tsx:67
**建议**: 使用useMemo缓存计算结果

... （省略其他建议）

## 详细审查报告
- [规范性审查](compliance-review.md)
- [安全性审查](security-review.md)
- [性能审查](performance-review.md)
```

### 产出

```
.spec/feature/2024-12-15/code-review/
├── review-report.md         # 综合报告
├── compliance-review.md     # 规范性审查
├── security-review.md       # 安全性审查
└── performance-review.md    # 性能审查
```

---

## 阶段6: 归档与知识库更新

### 目标

归档需求，更新知识库，记录经验教训。

### 工作流程

```
1. 读取所有阶段文档
   ├─ 需求文档
   ├─ 技术方案
   ├─ 代码生成报告
   ├─ 测试报告
   └─ 审查报告

2. 生成归档总结
   ├─ 需求概要
   ├─ 技术方案概要
   ├─ 代码变更统计
   ├─ 测试覆盖情况
   ├─ 审查结果总结
   └─ 经验教训

3. 更新知识库
   对于新增的内容：
   ├─ 组件 → 更新components.md
   ├─ API → 更新apis.md
   ├─ 函数 → 更新functions.md
   └─ 页面 → 更新pages.md

   记录经验教训：
   ├─ 有价值的解决方案
   ├─ 遇到的坑和解决办法
   └─ 最佳实践

4. 生成归档报告
```

### 产出

```
.spec/feature/2024-12-15/archive-summary.md
```

更新的知识库：
```
.spec/knowledge/
├── components.md          # 新增Login、LoginForm等组件
├── apis.md               # 新增auth相关API
├── functions.md          # 新增authUtils工具函数
└── pages.md              # 新增登录页面
```

---

## 📊 效果数据

### 时间对比

| 阶段 | 传统方式 | SDD方式 | 提升 |
|------|---------|---------|------|
| 需求分析 | 2-4小时 | 20分钟 | ↑90% |
| 技术方案 | 4-8小时 | 30分钟 | ↑93% |
| 代码开发 | 1-3天 | 15分钟 | ↑95% |
| 测试编写 | 4-8小时 | 10分钟 | ↑95% |
| 代码审查 | 1-2小时 | 5分钟 | ↑95% |
| **总计** | **3-5天** | **4-6小时** | **↑85%** |

*基于中等复杂度功能（如用户登录）的实测数据*

### 质量保障

| 维度 | 传统方式 | SDD方式 |
|------|---------|---------|
| 需求理解偏差 | 30-40% | <5% |
| 代码规范一致性 | 70-80% | 95%+ |
| 测试覆盖率 | 40-60% | 80%+ |
| 安全漏洞发现率 | 50% | 90%+ |
| 代码审查覆盖率 | 50% | 100% |

### 知识沉淀

**传统方式**:
- 知识分散在各个人脑中
- 重复问题重复解决
- 新人上手慢

**SDD方式**:
- 自动维护代码知识库
- 经验自动记录和复用
- 新人可快速查找

## 🎯 适用场景

### ✅ 强烈推荐

- 中大型项目的功能迭代
- 需求较复杂的新功能
- 多人协作的团队项目
- 需要严格质量控制的项目

### ⚠️ 可以使用

- 中等复杂度功能
- 需求相对明确的场景
- 个人项目但希望保持规范

### ❌ 不推荐

- 简单的样式调整
- 文案修改
- 紧急Bug修复
- 快速实验原型

## 💡 成功要素

### 1. 完整的PRD

好的PRD能大幅减少澄清时间：
- 功能描述清晰
- 交互流程明确
- 边界情况说明
- 数据格式定义

### 2. Figma设计稿

设计稿能确保UI准确：
- 样式细节清楚
- 交互状态完整
- 尺寸标注准确

### 3. 积极的澄清

认真回答AI的问题：
- 不要敷衍
- 不确定时询问
- 及时反馈问题

### 4. 方案审查

仔细审查技术方案：
- 检查改动点是否合理
- 确认代码片段正确
- 有问题及时调整

### 5. 及时验证

每个阶段都要验证：
- 代码生成后立即运行
- 测试生成后立即执行
- 审查完成后修复问题

## 📚 相关文档

- [快速启动指南](快速启动指南.md) - 5分钟快速上手
- [命令使用速查表](命令使用速查表.md) - 详细命令参考
- [工作流完整介绍](../README.md) - 工作流概览

---

**Made with ❤️ by Claude Code + SDD**

*让AI成为你的编程助手，而不仅仅是代码生成器*
