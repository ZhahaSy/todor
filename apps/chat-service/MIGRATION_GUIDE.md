# 密码加密算法迁移指南

## 概述

本项目已将密码加密算法从弱加密方式（SHA-1 + PBKDF2 10,000次迭代）升级到更安全的 **Argon2id** 算法。

## 变更内容

### 1. 密码加密算法
- **旧方式**: PBKDF2 + SHA-1 + 10,000次迭代 + 3字节盐值
- **新方式**: Argon2id + 64MB内存成本 + 3次迭代 + 自动盐值管理

### 2. 数据库变更
- `User.salt` 字段已标记为可选，Argon2 不再需要单独的盐值
- `User.hashPwd` 现在存储 Argon2 格式的密码哈希

### 3. API 变更
- `encryptPassword()` 现在是异步函数，返回 `Promise<string>`
- `makeSalt()` 已废弃，调用会抛出错误
- 新增 `verifyPassword()` 函数用于密码验证

## 迁移方案

### 选项 A: 重置所有用户密码（推荐用于开发环境）

如果这是开发环境且用户数据不重要：

```bash
# 1. 删除旧数据库
rm -rf dbs/chat.db

# 2. 重启应用，会自动创建新表结构
pnpm start

# 3. 重新创建用户账号
```

### 选项 B: 渐进式迁移（推荐用于生产环境）

保留现有用户数据，在用户下次登录时自动迁移：

1. **修改 `auth.service.ts` 的 `validateUser` 方法**:

```typescript
async validateUser(userName: string, password: string): Promise<any> {
  const user = await this.usersService.findOne({ name: userName });

  if (!user) {
    return ResOp.error(NotFoundUser, '账号或密码错误');
  }

  try {
    // 尝试使用 Argon2 验证（新用户）
    const isPasswordValid = await verifyPassword(password, user.hashPwd);

    if (isPasswordValid) {
      return ResOp.success(user, '验证成功');
    }

    // Argon2 验证失败，尝试使用旧方式验证（兼容旧用户）
    if (user.salt && user.salt.length > 0) {
      const legacyHash = this.legacyEncryptPassword(password, user.salt);

      if (user.hashPwd === legacyHash) {
        // 旧密码验证成功，自动迁移到 Argon2
        this.logger.log(`迁移用户 ${userName} 的密码到 Argon2`);
        const newHash = await encryptPassword(password);
        await this.userRepository.update(user.id, {
          hashPwd: newHash,
          salt: '', // 清空盐值
        });

        return ResOp.success(user, '验证成功');
      }
    }

    return ResOp.error(UserOrPasswordError, '账号或密码错误');
  } catch (error) {
    this.logger.error(`密码验证失败: ${error.message}`, error.stack);
    return ResOp.error(UserOrPasswordError, '账号或密码错误');
  }
}

// 保留旧的加密方法用于验证
private legacyEncryptPassword(password: string, salt: string): string {
  const crypto = require('crypto');
  const tempSalt = Buffer.from(salt, 'base64');
  return crypto
    .pbkdf2Sync(password, Uint8Array.from(tempSalt), 10000, 16, 'sha1')
    .toString('base64');
}
```

2. **测试迁移流程**:
   - 旧用户登录时会自动迁移到 Argon2
   - 新用户直接使用 Argon2
   - 所有用户逐步迁移后，可以移除兼容代码

### 选项 C: 批量迁移脚本

创建一个迁移脚本重置所有用户密码：

```typescript
// scripts/migrate-passwords.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { UserService } from '../src/modules/user/user.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userService = app.get(UserService);

  // 获取所有用户
  const users = await userService.getUserList();

  console.log(`找到 ${users.length} 个用户需要重置密码`);
  console.log('请联系每个用户重置密码，或设置临时密码');

  // 示例：为所有用户设置临时密码
  const tempPassword = 'TempPass123!';
  for (const user of users) {
    await userService.resetPassword(user.id, tempPassword);
    console.log(`用户 ${user.name} 的密码已重置为临时密码`);
  }

  await app.close();
}

bootstrap();
```

## 验证迁移

迁移完成后，验证以下内容：

1. **新用户注册**:
```bash
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
```

2. **用户登录**:
```bash
curl -X POST http://localhost:3000/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!"
  }'
```

3. **检查数据库**:
```bash
sqlite3 dbs/chat.db "SELECT name, hashPwd, salt FROM user LIMIT 1;"
```

- 新用户的 `hashPwd` 应该以 `$argon2id$` 开头
- 新用户的 `salt` 应该为空字符串

## 回滚方案

如果遇到问题需要回滚：

1. **恢复代码**:
```bash
git revert <commit-hash>
```

2. **恢复数据库备份**:
```bash
cp dbs/chat.db.backup dbs/chat.db
```

3. **重启应用**:
```bash
pnpm start
```

## 注意事项

1. **在迁移前备份数据库**:
```bash
cp dbs/chat.db dbs/chat.db.backup
```

2. **环境变量**: 确保设置了 `JWT_SECRET` 和其他必需的环境变量

3. **性能影响**: Argon2 比旧算法更安全但计算量更大，登录可能稍慢（约100-200ms）

4. **内存使用**: Argon2 使用 64MB 内存进行哈希计算，确保服务器有足够内存

## 相关链接

- [Argon2 文档](https://github.com/P-H-C/phc-winner-argon2)
- [OWASP 密码存储备忘录](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
