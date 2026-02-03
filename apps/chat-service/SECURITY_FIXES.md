# P0 安全问题修复总结

## 修复完成日期
2026-02-03

## 修复的安全问题

### ✅ 1. 硬编码的 JWT 密钥（严重）

**问题描述**:
- `auth/constants.ts` 中 JWT 密钥硬编码为 `'zsy_todo'`
- 任何获得代码的人都能伪造 JWT 令牌

**修复方案**:
- 修改 `auth/constants.ts` 使用环境变量
- 更新 `auth.module.ts` 使用 `ConfigService` 异步注册 JWT 模块
- 在 `.env` 中添加 `JWT_SECRET` 配置项

**修改文件**:
- `src/modules/auth/constants.ts`
- `src/modules/auth/auth.module.ts`
- `.env`
- `.env.example`

---

### ✅ 2. 硬编码的邮件配置（严重）

**问题描述**:
- `message/config.ts` 中包含真实的 QQ 邮箱和授权密码
- 这些敏感信息暴露在代码中

**修复方案**:
- 修改 `message/config.ts` 从环境变量读取邮件配置
- 在 `.env` 中添加 `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`

**修改文件**:
- `src/modules/message/config.ts`
- `.env`
- `.env.example`

---

### ✅ 3. 弱密码加密算法（严重）

**问题描述**:
- 使用 SHA-1 算法（已不安全）
- PBKDF2 迭代次数仅 10,000（推荐 100,000+）
- 盐值仅 3 字节（推荐 16+ 字节）

**修复方案**:
- 完全替换为 **Argon2id** 算法
- 使用推荐的参数：
  - 内存成本: 64MB
  - 时间成本: 3 次迭代
  - 并行度: 1
  - 自动盐值管理（不需要单独的 salt 字段）
- 安装 `argon2` 包
- 更新 `cryptogram.ts` 实现新的加密和验证函数
- 更新 `auth.service.ts` 使用 `verifyPassword()`
- 更新 `user.service.ts` 使用新的 `encryptPassword()`

**修改文件**:
- `src/utils/cryptogram.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/user/user.service.ts`
- `package.json` (添加 argon2 依赖)

**注意**: 需要迁移现有用户数据，详见 `MIGRATION_GUIDE.md`

---

### ✅ 4. 数据库实体重复装饰器（严重）

**问题描述**:
- `user.entity.ts` 中 `logging` 字段有两个 `@Column` 装饰器
- 第一个 `@Column({comment: '是否删除'})` 被覆盖，导致该字段丢失
- 数据完整性问题

**修复方案**:
- 删除重复的装饰器
- 保留 `logging` 字段用于"是否登录"
- `deleted` 字段单独定义
- 将 `salt` 字段标记为可选（Argon2 不再需要）

**修改文件**:
- `src/modules/user/entities/user.entity.ts`

---

### ✅ 5. 缺少输入验证（严重）

**问题描述**:
- `LoginDto` 使用了错误的 `@Column` 装饰器（应该是 `@IsString` 等）
- `CreateUserDto` 完全缺少验证装饰器
- `SendMessageDto` 的 `input` 字段没有长度限制
- 存在注入攻击风险

**修复方案**:
- 为所有 DTO 添加 class-validator 验证装饰器
- 添加详细的验证规则：
  - 用户名: 2-255 字符
  - 密码: 6-255 字符
  - 手机号: 正则验证
  - 年龄: 1-150
  - 邮箱: 邮箱格式验证
  - 消息输入: 1-10000 字符
- 添加 Swagger API 文档注解

**修改文件**:
- `src/modules/user/dto/login.dto.ts`
- `src/modules/user/dto/create-user.dto.ts`
- `src/modules/ai/dto/send-message.dto.ts`

---

### ✅ 6. .env 文件未被 Git 忽略（严重）

**问题描述**:
- `.gitignore` 中没有忽略 `.env` 文件
- 敏感信息可能被提交到版本控制

**修复方案**:
- 在 `.gitignore` 中添加 `.env` 相关规则
- 创建 `.env.example` 作为模板

**修改文件**:
- `.gitignore`
- `.env.example` (新建)

---

## 其他改进

### 日志优化
- 在 `auth.service.ts` 和 `user.service.ts` 中使用 NestJS Logger 替代 `console.log`
- 添加更详细的错误日志

### 代码质量
- 移除 `auth.service.ts` 中重复的 `secret` 参数（JWT 模块已配置）
- 添加更完善的错误处理

---

## 验证步骤

1. **环境变量配置**:
```bash
cd apps/chat-service
cp .env.example .env
# 编辑 .env，设置 JWT_SECRET 和其他配置
```

2. **安装依赖**:
```bash
pnpm install
```

3. **编译检查**:
```bash
pnpm build
# ✅ 编译成功，无错误
```

4. **启动服务**:
```bash
pnpm start
```

5. **测试注册和登录**:
```bash
# 注册新用户
curl -X POST http://localhost:3000/user/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "testuser",
    "password": "TestPass123!",
    "email": "test@example.com",
    "phone": "13800138000",
    "gender": "male",
    "age": 25
  }'

# 登录
curl -X POST http://localhost:3000/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!"
  }'
```

---

## 后续建议

### 立即执行
1. **更改所有环境变量**:
   - 生成强 JWT 密钥: `openssl rand -base64 32`
   - 更改邮箱配置为实际使用的邮箱
   - **不要使用示例中的敏感信息**

2. **数据库迁移**:
   - 备份现有数据库: `cp dbs/chat.db dbs/chat.db.backup`
   - 根据 `MIGRATION_GUIDE.md` 选择合适的迁移方案

3. **检查版本控制**:
   - 确认 `.env` 文件没有被提交
   - 如果已提交，立即更改所有密钥

### 下一步优化 (P1-P3)
继续修复其他优先级的问题：
- P1: 性能优化（数据库索引、AI 模型单例、邮件重试）
- P2: 代码质量（模块解耦、测试覆盖）
- P3: 可维护性（配置验证、统一错误格式）

---

## 文件清单

### 修改的文件
- `src/modules/auth/constants.ts`
- `src/modules/auth/auth.module.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/message/config.ts`
- `src/utils/cryptogram.ts`
- `src/modules/user/entities/user.entity.ts`
- `src/modules/user/user.service.ts`
- `src/modules/user/dto/login.dto.ts`
- `src/modules/user/dto/create-user.dto.ts`
- `src/modules/ai/dto/send-message.dto.ts`
- `.env`
- `.gitignore`

### 新建的文件
- `.env.example` - 环境变量模板
- `MIGRATION_GUIDE.md` - 密码迁移指南
- `SECURITY_FIXES.md` - 本文档

---

## 总结

✅ **所有 P0 级别安全问题已修复**
✅ **代码编译通过**
✅ **保持向后兼容（通过迁移指南）**

**关键改进**:
- 🔒 **Argon2id** 密码哈希（行业标准）
- 🔐 **环境变量管理**敏感信息
- ✅ **完善的输入验证**
- 📝 **详细的 API 文档**
- 🛡️ **更好的错误处理**

请立即更改 `.env` 中的所有敏感信息，并根据迁移指南处理现有用户数据。
