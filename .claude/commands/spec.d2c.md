---
description: Figma设计详情获取,读取已拆分的页面结构并获取截图、组件结构、设计代码等详细信息
---

# Figma 设计详情获取 (Design to Code)

读取已拆分的 Figma 页面结构,获取页面截图、组件结构、设计代码等详细信息,为技术方案和代码生成提供设计依据。

## 前置条件

1. 确保已配置 Figma MCP 服务
2. 确保有 Figma 文件的访问权限
3. 建议在需求澄清后使用 (`/spec.feat-prd` 之后)

## 核心能力

本命令负责获取 Figma 设计的详细信息:
- **页面截图**: 高清截图 (2x scale)
- **组件结构**: 完整的组件树和层级关系
- **设计代码**: React/Vue/HTML 等框架的代码片段
- **设计变量**: 颜色、字体、间距等设计 Token
- **资源文件**: 图标、图片等设计资源

## 执行步骤

### 第零步: 检测拆分结果

**检查是否已有 `resources/figma.md`**:

1. **如果文件存在**:
   - 读取文件内容
   - 解析页面列表
   - 检查每个页面的"设计详情状态"
   - 展示给用户

```
✅ 检测到已有 Figma 页面拆分结果

已记录 {N} 个页面:

1. 业务选择采购类型
   - Node ID: 3339-718947
   - 设计详情状态: ❌ 未获取

2. 供应商列表
   - Node ID: 3339-718948
   - 设计详情状态: ✅ 已获取 (2024-12-17)

...

请选择要获取设计详情的页面:
[选项]
A. 全部页面 - 获取所有未获取的页面
B. 指定页面 - 选择特定页面 (请告知页面序号,如 "1,3")
C. 仅新增页面 - 只获取未获取过的页面
```

2. **如果文件不存在**:
   - 提示用户需要先进行页面拆分
   - 询问是否立即执行拆分

```
⚠️  未检测到 Figma 页面拆分结果

需要先运行页面拆分工具建立页面结构。

是否立即执行拆分?
[选项]
A. 是 - 运行 /spec.utils.figma-split 进行拆分
B. 否 - 退出当前命令

如果选择"否",请先运行:
/spec.utils.figma-split
```

   - 如果用户选择"是",调用 `/spec.utils.figma-split`
   - 拆分完成后,回到本步骤继续

### 第一步: 初始化目录

确保目录结构存在:

```
.spec/feature/{YYYY-MM-DD}-{feature-name}/
├── resources/
│   ├── figma.md                       # 页面关联文档(已存在)
│   └── figma/
│       ├── screenshots/               # 页面截图
│       │   ├── {page-name}.png
│       │   └── ...
│       ├── design-context/            # 设计上下文
│       │   ├── {page-name}.md
│       │   └── ...
│       └── assets/                    # 设计资源
│           ├── icons/
│           └── images/
└── README.md
```

### 第二步: 获取页面截图

根据用户在第零步的选择,为每个选定页面获取高清截图:

```javascript
// 遍历选中的页面
for (const page of selectedPages) {
  // 转换 Node ID 格式: hyphen -> colon
  const colonNodeId = page.nodeId.replace('-', ':')

  // 提取 fileKey
  const fileKey = extractFileKeyFromUrl(page.url)

  // 调用 Figma MCP 导出截图
  mcp__mcp-router__figma_export_images({
    fileKey: fileKey,
    nodeIds: [colonNodeId],
    format: "png",
    scale: 2  // 2x 缩放,确保高清
  })

  // 保存到 resources/screenshots/{page-name}.png
  // 文件命名: 使用页面名称,替换非法字符
}
```

**文件命名规则**:
- 使用页面原始名称
- 替换文件系统非法字符: `/ \ : * ? " < > |` -> `-`
- 保留中文和其他合法字符
- 扩展名: `.png`

**展示截图**:
```javascript
// 获取完成后,展示截图预览
for (const page of selectedPages) {
  Read({
    file_path: `resources/screenshots/${sanitizedPageName}.png`
  })
}
```

### 第三步: 获取设计上下文

为每个选定页面获取详细的设计上下文信息:

```javascript
// 遍历选中的页面
for (const page of selectedPages) {
  const colonNodeId = page.nodeId.replace('-', ':')
  const fileKey = extractFileKeyFromUrl(page.url)

  // 1. 获取截图(带标注)
  const screenshot = await mcp__figma-remote-mcp__get_screenshot({
    fileKey: fileKey,
    nodeId: colonNodeId,
    clientLanguages: "javascript,typescript,html,css",
    clientFrameworks: "react,vue"  // 根据项目技术栈调整
  })

  // 2. 获取设计上下文(组件结构、代码片段)
  const designContext = await mcp__figma-remote-mcp__get_design_context({
    fileKey: fileKey,
    nodeId: colonNodeId,
    clientLanguages: "javascript,typescript,html,css",
    clientFrameworks: "react,vue"
  })

  // 3. 获取设计变量(可选)
  const variables = await mcp__figma-remote-mcp__get_variable_defs({
    fileKey: fileKey
  })

  // 4. 整理并保存到 resources/figma/design-context/{page-name}.md
}
```

**设计上下文文档格式** (`design-context/{page-name}.md`):

```markdown
# {页面名称} - 设计上下文

> 获取时间: {timestamp}
> Node ID: {nodeId}
> Figma 链接: {url}

## 页面截图

![页面截图](../screenshots/{page-name}.png)

## 组件结构

### 整体布局

{从 design_context 提取的布局信息}

### 组件树

{从 design_context 提取的组件树结构}

## 设计代码

### React 组件示例

```jsx
{从 design_context 提取的 React 代码}
```

### 样式定义

```css
{从 design_context 提取的 CSS 代码}
```

## 设计规范

### 颜色

{从 variables 提取的颜色定义}

### 字体

{从 variables 提取的字体定义}

### 间距

{从 variables 提取的间距定义}

## 设计资源

### 图标

{列出页面中使用的图标}

### 图片

{列出页面中使用的图片}

## 交互说明

{从 design_context 提取的交互说明}

## 响应式设计

{从 design_context 提取的响应式信息}

---

**注意**: 本文档由 Figma MCP 自动生成,供技术方案和代码生成参考使用。
```

### 第四步: 提取设计资源

如果页面包含图标、图片等资源,提取并保存:

```javascript
// 遍历设计上下文,识别资源
for (const asset of identifiedAssets) {
  if (asset.type === 'icon') {
    // 导出图标到 resources/figma/assets/icons/
    exportAsset(asset, 'icons')
  } else if (asset.type === 'image') {
    // 导出图片到 resources/figma/assets/images/
    exportAsset(asset, 'images')
  }
}
```

### 第五步: 更新页面关联文档

更新 `resources/figma.md`,标记已获取设计详情的页面:

```markdown
### 1. 业务选择采购类型
- **Figma 链接**: https://www.figma.com/design/xxx?node-id=3339-718947
- **Node ID (hyphen)**: 3339-718947
- **Node ID (colon)**: 3339:718947
- **关联功能点**: 待在技术方案阶段关联
- **设计详情状态**: ✅ 已获取 (2024-12-17 14:30)
  - 截图: `screenshots/业务选择采购类型.png`
  - 设计上下文: `figma/design-context/业务选择采购类型.md`
  - 资源文件: 2 个图标, 1 张图片
- **备注**: {留空}
```

### 第六步: 生成获取报告

生成设计详情获取报告,保存到 `resources/figma/fetch-report.md`:

```markdown
# Figma 设计详情获取报告

> 生成时间: {timestamp}

## 获取概况

- **获取页面数**: {N} 个
- **截图数量**: {N} 张
- **设计上下文**: {N} 份
- **资源文件**: {N} 个 (图标: {X}, 图片: {Y})

## 页面详情

### 1. {页面名称1}
- ✅ 截图获取成功: `screenshots/{page-name}.png` (尺寸: 1920x1080, 大小: 245KB)
- ✅ 设计上下文获取成功: `design-context/{page-name}.md`
- ✅ 组件数量: 15 个
- ✅ 代码片段: React (3个), CSS (1个)
- ✅ 设计变量: 颜色 (8个), 字体 (3个), 间距 (5个)
- ✅ 资源文件: 图标 (2个), 图片 (1张)

### 2. {页面名称2}
- ✅ 截图获取成功
- ✅ 设计上下文获取成功
- ...

## 技术栈识别

基于设计上下文分析,识别的技术栈:
- **框架**: React
- **样式**: CSS Modules / Styled Components
- **组件库**: Ant Design (检测到部分组件)
- **响应式**: 支持移动端适配

## 后续建议

1. 在技术方案阶段 (`/spec.feat-tech`):
   - 读取设计上下文文档
   - 将页面与功能点关联
   - 参考组件结构和代码片段设计方案

2. 在代码生成阶段 (`/spec.code`):
   - 参考设计代码生成组件
   - 使用设计变量保持样式一致
   - 导入设计资源文件

3. 样式规范:
   - 统一使用设计变量中的颜色/字体/间距
   - 保持与设计稿的视觉一致性
   - 注意响应式设计要求
```

### 第七步: 更新 README

更新需求目录的 `README.md`,添加设计详情章节:

```markdown
## 📐 Figma 设计稿

### 页面列表

- **业务选择采购类型**: [查看](https://www.figma.com/design/xxx?node-id=xxx)
  - 截图: [查看](./resources/screenshots/业务选择采购类型.png)
  - 设计上下文: [查看](./resources/figma/design-context/业务选择采购类型.md)

- **供应商列表**: [查看](https://www.figma.com/design/xxx?node-id=xxx)
  - 截图: [查看](./resources/screenshots/供应商列表.png)
  - 设计上下文: [查看](./resources/figma/design-context/供应商列表.md)

### 设计资源

- 截图: {N} 张
- 设计上下文: {N} 份
- 图标: {X} 个
- 图片: {Y} 张

详细信息: [查看获取报告](./resources/figma/fetch-report.md)

**下一步**: 在技术方案阶段参考设计上下文生成详细方案
```

### 第八步: 完成确认

展示完成信息:

```
✅ Figma 设计详情获取完成!

📊 获取统计:
- 页面数量: {N} 个
- 截图文件: {N} 张 (保存在 resources/screenshots/)
- 设计上下文: {N} 份 (保存在 resources/figma/design-context/)
- 资源文件: {M} 个 (保存在 resources/figma/assets/)

📁 生成文件:
- resources/screenshots/*.png - 页面截图
- resources/figma/design-context/*.md - 设计上下文文档
- resources/figma/assets/ - 设计资源文件
- resources/figma/fetch-report.md - 获取报告
- resources/figma.md - 已更新(标记获取状态)

📝 后续步骤:
1. 查看设计上下文文档了解页面结构和代码示例
2. 在技术方案阶段参考设计内容
3. 在代码生成阶段使用设计代码和资源

💡 提示:
- 所有设计详情已保存到本地,可随时查看
- 设计上下文包含组件结构和代码片段,便于开发参考
- 如需重新获取,再次运行本命令并选择对应页面
```

## Figma MCP 方法说明

### 1. figma_export_images

**用途**: 导出页面高清截图

**参数**:
- `fileKey` (string): Figma 文件 Key
- `nodeIds` (array): 节点 ID 数组 (colon format)
- `format` (string): 导出格式 ("png", "jpg", "svg")
- `scale` (number): 缩放比例 (1, 2, 4)

### 2. figma_get_screenshot

**用途**: 获取带标注的页面截图和基本信息

**参数**:
- `fileKey` (string): Figma 文件 Key
- `nodeId` (string): 节点 ID (colon format)
- `clientLanguages` (string): 目标语言 (如 "javascript,typescript,html,css")
- `clientFrameworks` (string): 目标框架 (如 "react,vue")

### 3. figma_get_design_context

**用途**: 获取详细设计上下文(组件结构、代码片段、交互说明)

**参数**:
- `fileKey` (string): Figma 文件 Key
- `nodeId` (string): 节点 ID (colon format)
- `clientLanguages` (string): 目标语言
- `clientFrameworks` (string): 目标框架

**返回内容**:
- 组件树结构
- React/Vue/HTML 代码片段
- CSS 样式定义
- 交互逻辑说明
- 响应式设计信息

### 4. figma_get_variable_defs

**用途**: 获取设计变量定义(颜色、字体、间距等)

**参数**:
- `fileKey` (string): Figma 文件 Key

**返回内容**:
- 颜色变量
- 字体变量
- 间距变量
- 其他设计 Token

## 特殊场景处理

### 场景 1: 部分页面获取失败

如果某些页面获取失败:
- 记录失败原因
- 继续处理其他页面
- 在报告中标注失败页面
- 提供重试建议

### 场景 2: 网络超时

如果获取过程中网络超时:
- 保存已获取的内容
- 记录中断位置
- 提示用户稍后重试
- 支持断点续传

### 场景 3: 设计稿已更新

如果检测到设计稿比本地版本新:
```
⚠️  检测到设计稿已更新

本地版本: 2024-12-15 10:30
Figma 版本: 2024-12-17 14:20

是否重新获取设计详情?
[选项]
A. 是 - 重新获取所有页面
B. 部分更新 - 只更新指定页面
C. 否 - 继续使用本地版本
```

### 场景 4: 大文件处理

如果页面内容过大(>10MB):
- 提示用户可能需要较长时间
- 显示处理进度
- 考虑分块处理
- 压缩保存

## 错误处理

1. **权限错误**: 提示检查 Figma 访问权限
2. **节点不存在**: 提示节点可能已删除,建议更新拆分结果
3. **格式不支持**: 提示当前 Figma 版本或内容不支持导出
4. **存储空间不足**: 提示清理磁盘空间
5. **MCP 服务异常**: 提示检查 Figma MCP 配置和网络连接

## 与其他命令的集成

### 在技术方案阶段使用 (/spec.feat-tech)

```markdown
1. 读取 resources/figma.md 了解可用页面
2. 读取 resources/figma/design-context/*.md 获取设计详情
3. 在梳理改动点时:
   - 关联相关设计页面
   - 引用设计上下文中的组件结构
   - 参考设计代码片段
4. 更新 figma.md 中的"关联功能点"字段
```

### 在代码生成阶段使用 (/spec.code)

```markdown
1. 读取技术方案中关联的设计页面
2. 参考设计上下文中的代码片段生成组件
3. 使用设计变量保持样式一致性
4. 导入设计资源文件(图标、图片)
5. 确保 UI 实现与设计稿一致
```

## 最佳实践

1. **获取时机**:
   - 建议在需求澄清完成后执行
   - 技术方案前获取,便于参考设计
   - 避免过早获取(设计可能变更)

2. **选择性获取**:
   - 首次可获取所有页面
   - 后续按需更新特定页面
   - 避免重复获取未变更的页面

3. **版本管理**:
   - 将截图和设计上下文纳入版本控制
   - 记录获取时间,便于追踪设计版本
   - 设计变更时及时更新本地内容

4. **资源优化**:
   - 截图使用 2x 缩放平衡清晰度和文件大小
   - 大文件考虑压缩存储
   - 不常用的资源可按需导出

## 注意事项

1. **性能考虑**:
   - 每个页面获取需要 5-10 秒
   - 多页面建议选择性获取
   - 大文件可能需要更长时间

2. **隐私和安全**:
   - 截图和设计内容可能包含敏感信息
   - 根据需要将 `resources/figma/` 添加到 `.gitignore`
   - 注意 Figma 文件的访问权限

3. **存储空间**:
   - 每张截图约 50-500KB
   - 设计上下文文档约 10-50KB
   - 资源文件大小取决于具体内容
   - 注意磁盘空间使用

4. **设计一致性**:
   - 获取的设计内容是快照,不会自动更新
   - 设计稿变更后需手动重新获取
   - 建议在开发前确认设计最终版本

## 输出文件清单

执行完成后,生成以下文件:

```
.spec/feature/{YYYY-MM-DD}-{feature-name}/
├── resources/
│   ├── figma.md                          # 更新(标记获取状态)
│   └── figma/
│       ├── screenshots/                  # 页面截图
│       │   ├── {page-name-1}.png
│       │   ├── {page-name-2}.png
│       │   └── ...
│       ├── design-context/               # 设计上下文
│       │   ├── {page-name-1}.md
│       │   ├── {page-name-2}.md
│       │   └── ...
│       ├── assets/                       # 设计资源
│       │   ├── icons/
│       │   │   ├── icon-1.svg
│       │   │   └── ...
│       │   └── images/
│       │       ├── image-1.png
│       │       └── ...
│       └── fetch-report.md               # 获取报告
└── README.md                             # 更新(添加设计详情信息)
```

## 命令示例

```bash
# 在 Claude Code 中执行
/spec.d2c

# 如果已有拆分结果,直接选择获取页面
# 如果没有拆分结果,会先引导执行拆分

# 完整工作流
/spec.feat-prd          # PRD 阶段,提供 Figma 链接并拆分
/spec.d2c               # 获取设计详情
/spec.feat-tech         # 技术方案,参考设计上下文
/spec.code              # 代码生成,使用设计代码
```

---

**版本**: 2.0.0
**更新日期**: 2024-12-17
**依赖**:
- Figma MCP Server
- `/spec.utils.figma-split` (页面拆分工具)
