# Cookie 认证问题修复

## 问题描述

用户登录成功后，跳转到其他页面时依然提示需要登录。

## 根本原因

1. **前端手动设置 Cookie 缺少安全属性**
   - 前端使用 `document.cookie` 设置 Cookie
   - 缺少 `SameSite` 属性，导致现代浏览器可能不发送 Cookie

2. **Cookie 不够安全**
   - 前端设置的 Cookie 不是 `HttpOnly`，容易受到 XSS 攻击
   - 没有设置 `Secure` 标志

## 修复方案

采用**后端设置 HttpOnly Cookie** 的方案，这是业界最佳实践。

### 修改内容

#### 1. 后端登录接口 (`user.controller.ts`)

**修改前**：
```typescript
@Post('/login')
async login(@Body() loginDto: LoginDto) {
  const result = await this.userService.login(loginDto);
  return result; // 只返回 JSON，包含 token
}
```

**修改后**：
```typescript
@Post('/login')
async login(
  @Body() loginDto: LoginDto,
  @Response({ passthrough: true }) res: ExpressResponse,
) {
  const result = await this.userService.login(loginDto);

  // 如果登录成功，将 token 设置到 Cookie
  if (result.code === 0 && 'data' in result && result.data?.token) {
    res.cookie('token', result.data.token, {
      httpOnly: true,  // ✅ 防止 XSS 攻击
      secure: process.env.NODE_ENV === 'production', // ✅ 生产环境使用 HTTPS
      sameSite: 'lax', // ✅ 防止 CSRF 攻击
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 天
      path: '/',
    });
  }

  return result;
}
```

#### 2. JWT Strategy (`jwt.strategy.ts`)

**修改前**：
```typescript
import { jwtConstants } from './constants';

constructor() {
  super({
    secretOrKey: jwtConstants.secret, // ❌ 硬编码
  });
}
```

**修改后**：
```typescript
import { ConfigService } from '@nestjs/config';

constructor(private configService: ConfigService) {
  super({
    secretOrKey: configService.get<string>('JWT_SECRET'), // ✅ 从环境变量读取
  });
}
```

#### 3. 前端登录页面 (`packages/ui/src/login/index.tsx`)

**修改前**：
```typescript
const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
  const res = await login(values);
  setCookie("token", res.token, 7); // ❌ 手动设置，不安全
  window.location.replace("/");
};
```

**修改后**：
```typescript
const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
  await login(values);
  // ✅ Cookie 已由后端自动设置（HttpOnly, Secure）
  window.location.replace("/");
};
```

## 认证流程

### 修复后的完整流程

```
1. 用户提交登录表单
   ↓
2. 前端调用 POST /user/login
   ↓
3. 后端验证用户名和密码（支持新旧密码自动迁移）
   ↓
4. 验证成功，生成 JWT token
   ↓
5. 后端设置 HttpOnly Cookie
   Set-Cookie: token=<jwt>; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000
   ↓
6. 返回响应给前端
   {
     "code": 0,
     "msg": "success",
     "data": { "token": "<jwt>" }
   }
   ↓
7. 前端跳转到首页
   ↓
8. 后续请求自动携带 Cookie
   Cookie: token=<jwt>
   ↓
9. 后端 JwtStrategy 从 Cookie 中提取 token
   ↓
10. JWT 验证通过，返回用户信息
```

## 安全改进

### HttpOnly Cookie 的优势

1. **防止 XSS 攻击**
   - JavaScript 无法访问 `HttpOnly` Cookie
   - 即使页面被注入恶意脚本，也无法窃取 token

2. **自动携带**
   - 浏览器会自动在请求中携带 Cookie
   - 不需要手动在 Authorization header 中添加

3. **SameSite 保护**
   - `SameSite=Lax` 防止大部分 CSRF 攻击
   - 跨站请求不会携带 Cookie

4. **Secure 标志**
   - 生产环境强制使用 HTTPS
   - 防止中间人攻击

## 测试验证

### 1. 启动服务

```bash
# 后端
cd apps/chat-service
pnpm start

# 前端
cd apps/chat-ui
pnpm start
```

### 2. 测试登录

1. 访问 http://localhost:5173/login
2. 输入用户名和密码
3. 点击登录

### 3. 验证 Cookie

打开浏览器开发者工具：

**Application → Cookies → http://localhost:5173**

你应该看到：
```
Name:     token
Value:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Domain:   localhost
Path:     /
Expires:  (30天后的日期)
HttpOnly: ✅
Secure:   (生产环境为 ✅)
SameSite: Lax
```

### 4. 验证认证

1. 登录后跳转到 `/chat`
2. **不应该再提示需要登录** ✅
3. 刷新页面，依然保持登录状态 ✅
4. 打开新标签页访问 http://localhost:5173/chat，自动登录 ✅

### 5. 验证 API 请求

打开 Network 面板，查看任何受保护的 API 请求：

```
Request Headers:
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

后端会从 Cookie 中提取 token 并验证。

## 常见问题

### Q: 为什么我在 localhost 上看不到 Secure 标志？

**A**: `Secure` 标志只在生产环境（HTTPS）下启用。在开发环境（HTTP）下，`secure: false`，这是正常的。

### Q: 如果用户清除 Cookie 会怎样？

**A**: 用户需要重新登录。这是预期行为。

### Q: Cookie 的过期时间是多久？

**A**: 当前设置为 30 天。可以在 `user.controller.ts` 中修改 `maxAge`。

### Q: 如何退出登录？

**A**: 需要实现一个退出接口，清除 Cookie：

```typescript
@Post('/logout')
async logout(@Response({ passthrough: true }) res: ExpressResponse) {
  res.clearCookie('token', { path: '/' });
  return ResOp.success(null, '退出成功');
}
```

前端：
```typescript
await logout();
window.location.href = '/login';
```

## 后续建议

1. **实现退出登录功能**
   - 添加 `/user/logout` 接口
   - 清除 Cookie

2. **添加 CORS 配置**（如果前后端分离部署）
   ```typescript
   // main.ts
   app.enableCors({
     origin: 'https://your-frontend-domain.com',
     credentials: true, // 允许携带 Cookie
   });
   ```

3. **Token 刷新机制**
   - 实现 Refresh Token
   - 在 token 快过期时自动刷新

4. **记住登录状态**
   - 添加"记住我"选项
   - 调整 Cookie 过期时间

## 相关文件

- `/apps/chat-service/src/modules/user/user.controller.ts` - 登录接口
- `/apps/chat-service/src/modules/auth/jwt.strategy.ts` - JWT 验证策略
- `/packages/ui/src/login/index.tsx` - 登录页面
- `/packages/request/index.ts` - Axios 配置

## 参考资料

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [SameSite Cookie 详解](https://web.dev/samesite-cookies-explained/)
