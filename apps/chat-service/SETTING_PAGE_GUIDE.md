# Setting 页面功能说明

## 📋 功能概览

Setting 页面已完整实现，包含三个主要模块：

### 1. 个人档案 👤
用户可以编辑和更新以下信息：
- ✅ 基本信息：姓名、邮箱、手机号
- ✅ 个人资料：性别、年龄、职业
- ✅ 地址信息：公司地址、居住地
- ✅ 生活信息：兴趣爱好、生活作息

**特性**：
- 表单验证（必填项、邮箱格式等）
- 实时保存并刷新用户信息
- 友好的成功/失败提示

### 2. 账户安全 🔒
用户可以修改登录密码：
- ✅ 旧密码验证
- ✅ 新密码确认（防止输入错误）
- ✅ 密码强度要求（最少 6 位）
- ✅ 修改成功后自动跳转登录页

**特性**：
- 密码使用 Argon2id 加密
- 修改成功后需要重新登录
- 防止密码不一致提交

### 3. 数据管理 💾
用户可以管理自己的数据：
- ✅ **导出数据** - 下载个人信息为 JSON 文件
- ✅ **清空数据** - 删除所有待办和聊天记录（带二次确认）

**特性**：
- 导出数据不包含敏感信息（密码、盐值）
- 清空操作有二次确认提示
- 导出文件名包含时间戳

---

## 🎨 UI 设计

### 布局
- **侧边导航** - 使用 Tabs 组件，左侧菜单切换
- **卡片式设计** - 每个模块独立卡片
- **响应式** - 最大宽度 1200px，居中布局

### 交互
- **表单校验** - 实时验证，提示错误
- **加载状态** - 按钮 loading 提示
- **消息提示** - 成功/失败 Toast 消息
- **二次确认** - 危险操作（清空数据、修改密码）

---

## 🔧 技术实现

### 后端 API

#### 1. 更新用户信息
```http
PUT /user/update
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "phone": "13800138000",
  "gender": "male",
  "age": 28,
  "job": "软件工程师",
  "work_address": "北京市朝阳区",
  "address": "北京市海淀区",
  "hobby": "跑步、阅读、音乐",
  "schedule": "早上7点起床，晚上11点睡觉"
}
```

**响应**：
```json
{
  "code": 0,
  "msg": "更新成功",
  "data": { /* 更新后的用户信息 */ }
}
```

#### 2. 修改密码
```http
POST /user/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "oldPassword": "oldpass123",
  "newPassword": "newpass123",
  "confirmPassword": "newpass123"
}
```

**响应**：
```json
{
  "code": 0,
  "msg": "密码修改成功",
  "data": null
}
```

#### 3. 导出数据
```http
GET /user/export-data
Authorization: Bearer {token}
```

**响应**：
```json
{
  "code": 0,
  "msg": "导出成功",
  "data": {
    "id": "uuid",
    "name": "张三",
    "email": "zhangsan@example.com",
    // ... 其他字段（不包含 hashPwd, salt, deleted）
  }
}
```

---

### 前端实现

#### 文件结构
```
apps/chat-ui/src/pages/setting/
└── index.tsx              # Setting 页面主文件

packages/api/
└── user.ts                # 用户 API 封装

packages/entities/
└── user.ts                # 用户类型定义
```

#### 关键代码

**API 调用**：
```typescript
// 更新用户信息
const handleUpdateProfile = async (values: UpdateUserDto) => {
  await updateUserInfo(values);
  message.success('个人信息更新成功');
  await getUserInfo(); // 刷新用户信息
};

// 修改密码
const handleChangePassword = async (values: ChangePasswordDto) => {
  await changePassword(values);
  message.success('密码修改成功，请重新登录');
  setTimeout(() => {
    window.location.href = '/login';
  }, 3000);
};

// 导出数据
const handleExportData = async () => {
  const data = await exportUserData();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  // ... 下载文件逻辑
};
```

---

## 🔒 安全特性

### 密码安全
- ✅ **Argon2id 加密** - 行业标准的密码哈希算法
- ✅ **旧密码验证** - 修改前必须验证旧密码
- ✅ **密码强度** - 最少 6 位
- ✅ **确认密码** - 防止输入错误

### 数据安全
- ✅ **JWT 认证** - 所有 API 需要登录
- ✅ **邮箱唯一性** - 检查邮箱是否被占用
- ✅ **敏感信息过滤** - 导出数据不包含密码
- ✅ **二次确认** - 危险操作需要确认

### 输入验证
- ✅ **前端验证** - 必填项、格式验证
- ✅ **后端验证** - class-validator DTO 验证
- ✅ **类型检查** - TypeScript 类型安全

---

## 📸 页面截图说明

### 个人档案页面
- 左侧：三个 Tab 菜单（个人档案、账户安全、数据管理）
- 右侧：个人档案表单
  - 姓名、邮箱、手机号（必填）
  - 性别下拉框、年龄数字输入框
  - 职业、公司地址、居住地
  - 兴趣爱好、生活作息（多行文本框）
  - 底部：保存修改按钮

### 账户安全页面
- 修改密码表单
  - 旧密码输入框
  - 新密码输入框
  - 确认密码输入框
  - 底部：修改密码按钮

### 数据管理页面
- 导出数据区域
  - 说明文字
  - 导出数据按钮
- 清空数据区域
  - 警告文字
  - 清空所有数据按钮（红色）

---

## 🚀 使用指南

### 启动项目

#### 后端
```bash
cd /Users/v_zhangshuangyi/self/my-turborepo/apps/chat-service
pnpm install
pnpm start:dev
```

#### 前端
```bash
cd /Users/v_zhangshuangyi/self/my-turborepo/apps/chat-ui
pnpm install
pnpm dev
```

### 访问页面
1. 启动服务后，访问 `http://localhost:3001/login`
2. 登录后，点击左侧菜单的"设置"
3. 进入 Setting 页面

---

## ✅ 功能测试清单

### 个人档案
- [ ] 修改姓名，点击保存，验证更新成功
- [ ] 修改邮箱为已存在的邮箱，验证提示"该邮箱已被使用"
- [ ] 修改手机号、性别、年龄等，验证更新成功
- [ ] 清空必填项，验证表单校验生效

### 账户安全
- [ ] 输入错误的旧密码，验证提示"旧密码错误"
- [ ] 新密码和确认密码不一致，验证提示"两次输入的密码不一致"
- [ ] 输入少于 6 位的密码，验证提示"密码长度不能小于 6 位"
- [ ] 正确修改密码，验证跳转登录页
- [ ] 使用新密码登录，验证可以成功登录

### 数据管理
- [ ] 点击导出数据，验证下载 JSON 文件
- [ ] 打开 JSON 文件，验证不包含密码等敏感信息
- [ ] 点击清空数据，验证二次确认弹窗
- [ ] 取消清空操作，验证数据未删除

---

## 📝 后续优化建议

### P2 优先级
1. **头像上传** - 允许用户上传头像
2. **偏好设置** - 主题、语言、通知设置
3. **登录设备管理** - 查看和管理登录的设备
4. **账号注销** - 永久删除账号

### P3 优先级
1. **数据统计** - 展示待办完成率、使用时长等
2. **导入数据** - 支持导入 JSON 格式的数据
3. **第三方账号绑定** - 微信、GitHub 等
4. **API Key 管理** - 生成和管理 API 密钥

---

## 🐛 已知问题

无

---

## 📚 相关文档

- [NestJS Validation](https://docs.nestjs.com/techniques/validation)
- [Ant Design Form](https://ant.design/components/form-cn/)
- [Argon2 密码哈希](https://github.com/ranisalt/node-argon2)

---

**文档版本**: v1.0
**最后更新**: 2026-02-03
**负责人**: Todor Team
