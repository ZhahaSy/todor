---
description: 多项目协同工作流,支持一个需求涉及多个工程项目的场景
---

# 多项目协同工作流

当一个需求涉及多个工程项目时的专用工作流。

## 适用场景
- 前后端分离项目(前端 + 后端)
- 微服务架构(多个服务)
- 移动端 + Web端 + 后端
- 组件库 + 应用项目

## 目录结构
```
.spec/feature/2025-12-12-user-management/
├── README.md                       # 多项目需求总览
├── prd/                            # 需求文档(统一)
│   ├── original.md
│   ├── split/                      # 按项目拆分
│   │   ├── project-frontend.md
│   │   ├── project-backend.md
│   │   └── project-admin.md
│   └── clarified/
│       ├── frontend-clarified.md
│       ├── backend-clarified.md
│       └── admin-clarified.md
│
├── projects/                       # 各项目独立工作空间
│   ├── frontend/
│   │   ├── tech/
│   │   ├── code-changes.log
│   │   └── test-report.md
│   ├── backend/
│   │   ├── tech/
│   │   ├── code-changes.log
│   │   └── test-report.md
│   └── admin/
│       ├── tech/
│       ├── code-changes.log
│       └── test-report.md
│
├── coordination/                   # 项目协调信息
│   ├── dependency-graph.md         # 项目依赖关系
│   ├── interface-contract.md      # 接口契约
│   ├── execution-order.md          # 执行顺序
│   └── integration-plan.md         # 集成方案
│
└── archive-summary.md              # 最终归档总结
```

## 执行流程

### 1. 初始化多项目工作流
询问用户涉及的项目列表和各项目代码路径:
```
请提供涉及的项目信息:
1. 项目名称: frontend
   代码路径: /path/to/frontend-project
   技术栈: React + TypeScript

2. 项目名称: backend
   代码路径: /path/to/backend-project
   技术栈: Node.js + Express
```

为每个项目初始化知识库(如果还没有)

### 2. 需求拆分(按项目维度)
**拆分规则**: 按项目边界拆分,明确每个项目的职责

生成 `prd/split/project-{项目名}.md`:
- 该项目需要实现的功能
- 与其他项目的交互点
- 依赖的接口/数据
- UI/UX要求(如适用)

**示例**:
```markdown
# frontend - 用户管理功能

## 功能点
1. 用户列表页面
2. 用户详情页面
3. 用户创建/编辑表单

## 依赖接口(backend提供)
- GET /api/users - 获取用户列表
- GET /api/users/:id - 获取用户详情
- POST /api/users - 创建用户
- PUT /api/users/:id - 更新用户

## 数据字段
- 用户实体: id, name, email, role, status, createdAt
```

### 3. 项目依赖分析
生成 `coordination/dependency-graph.md`:
```
项目依赖关系:
frontend ──依赖接口──> backend
admin   ──依赖接口──> backend
backend ──独立──> (无依赖)

执行顺序:
1. backend (优先,提供接口)
2. frontend, admin (并行,消费接口)

关键接口:
- /api/users (CRUD) - backend提供, frontend/admin消费
```

### 4. 接口契约定义
生成 `coordination/interface-contract.md`:
```markdown
# 接口契约

## 用户管理API

### GET /api/users
**请求**: { page, pageSize, keyword }
**响应**: { total, list: User[] }
**提供方**: backend
**消费方**: frontend, admin
**状态**: 待开发
```

### 5. 逐项目执行技术方案
对每个项目:
1. 切换到项目代码路径
2. 读取项目知识库
3. 生成该项目的技术方案 → `projects/{项目名}/tech/`
4. 确认后继续下一项目

### 6. 逐项目执行代码生成
按依赖顺序执行:
1. 先执行被依赖的项目(如backend)
2. 再执行依赖方项目(如frontend)
3. 每个项目生成到各自的代码库
4. 记录到 `projects/{项目名}/code-changes.log`

### 7. 集成验证
生成 `coordination/integration-plan.md`:
```markdown
# 集成验证计划

## 环境准备
1. 启动 backend: cd /path/to/backend && npm run dev
2. 启动 frontend: cd /path/to/frontend && npm run dev
3. 启动 admin: cd /path/to/admin && npm run dev

## 接口联调
1. 验证 GET /api/users 接口
2. 验证 POST /api/users 接口
3. 验证前端页面能正常调用接口

## 问题记录
...
```

### 8. 多项目测试
为每个项目生成测试:
- 单元测试(各项目独立)
- 集成测试(跨项目API测试)
- E2E测试(完整流程)

### 9. 多项目审查
并行审查各项目代码,生成独立审查报告

### 10. 统一归档
生成 `archive-summary.md`:
- 需求概览
- 涉及项目列表
- 各项目改动统计
- 接口清单
- 集成验证结果
- 更新各项目知识库

## 命令使用

### 启动多项目工作流
```bash
/spec.multi-project --projects=frontend,backend,admin
```

或使用 `/spec.auto` 时自动检测:
```
🔍 检测到需求涉及多个项目:
  - frontend
  - backend
  - admin

是否启用多项目协同模式? (Y/n)
```

## 进度追踪
使用 `/spec.status` 查看多项目进度:
```
📊 多项目工作流状态
━━━━━━━━━━━━━━━━━━━━━━━━━━
涉及项目: 3个
整体进度: 60%

项目进度:
[✓] backend   - 100% (代码生成完成)
[→] frontend  - 80% (测试生成中)
[→] admin     - 50% (代码生成中)

接口契约: 12个接口, 8个已实现
```

## 关键点

### 1. 接口优先
在代码开发前,先定义清楚接口契约,避免前后端不一致

### 2. 依赖顺序
严格按依赖关系执行,被依赖项先开发

### 3. 版本协调
如有接口变更,同步通知所有消费方

### 4. 独立验证 + 集成验证
各项目独立测试通过后,再进行集成测试

## 输出示例
```
✅ 多项目协同工作流完成
━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 项目统计:
  - frontend: 新建15个, 修改3个, 约800行
  - backend: 新建8个, 修改2个, 约500行
  - admin: 新建10个, 修改1个, 约600行

📋 接口实现: 12/12个
✅ 集成验证: 通过
📁 详见: .spec/feature/2025-12-12-user-management/
```

## 注意事项
1. 提前规划好项目边界和接口
2. 保持接口契约文档实时更新
3. 遇到接口变更及时同步给消费方
4. 各项目保持独立的代码规范和技术栈
5. 集成测试环境要能同时运行所有项目
