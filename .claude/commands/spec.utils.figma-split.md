---
description: Figma页面拆分工具,分析Figma链接结构并询问用户拆分策略,生成页面关联文档
---

# Figma 页面拆分工具

分析 Figma 设计稿结构,询问用户拆分策略,生成页面关联文档。本工具为其他命令提供基础的 Figma 页面拆分服务。

## 使用场景

1. **PRD 阶段集成**: `/spec.feat-prd` 收集资源时自动调用
2. **手动拆分**: 用户直接运行进行拆分
3. **D2C 前置**: `/spec.d2c` 执行前自动检测并调用

## 前置条件

1. 确保已配置 Figma MCP 服务
2. 确保有 Figma 文件的访问权限
3. 需要有效的 Figma 文件或节点 URL

## 执行步骤

### 第零步: 检测已有拆分结果

**检测 `resources/figma.md` 是否存在**:

1. 如果文件存在,读取内容并展示:
```
✅ 检测到已有 Figma 页面拆分结果

已记录 {N} 个页面:
1. {页面名称1} - {URL}
2. {页面名称2} - {URL}
...

是否需要重新拆分?
[选项]
A. 使用现有拆分 - 继续使用已有结果
B. 重新拆分 - 清除现有记录,重新分析
C. 追加页面 - 在现有基础上添加新页面
```

2. 处理用户选择:
   - **选择 A**: 直接返回,使用现有拆分结果
   - **选择 B**: 备份现有文件到 `resources/.backup/figma-{timestamp}.md`,继续执行
   - **选择 C**: 保留现有记录,后续追加新页面

3. 如果文件不存在,直接进入第一步

### 第一步: 接收 Figma 链接

**检测是否已有链接**:
- 检查命令调用上下文,是否由其他命令传入 Figma URL
- 如果已有链接,直接使用
- 如果没有链接,询问用户

**询问用户提供 Figma 链接**:

```
请提供 Figma 设计稿链接:
示例: https://www.figma.com/design/xxx/FileName?node-id=123-456

支持的链接格式:
- 完整文件: https://www.figma.com/design/{fileKey}/{fileName}
- 指定节点: https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
- 分支文件: https://www.figma.com/design/{fileKey}/branch/{branchKey}/{fileName}

💡 提示: 如果链接包含 node-id 参数,将从该节点开始分析
```

### 第二步: 获取设计稿结构

**调用 Figma MCP 获取页面/Frame 链接**:

```javascript
// 获取 depth=1 的 Frame 链接
figma_get_frame_links({
  url: userProvidedFigmaUrl,
  depth: 1
})
```

**返回数据分析**:
```json
{
  "frames": [
    {
      "name": "业务选择采购类型",
      "nodeId": "3339-718947",
      "url": "https://www.figma.com/design/xxx?node-id=3339-718947",
      "type": "FRAME"
    },
    {
      "name": "供应商列表",
      "nodeId": "3339-718948",
      "url": "https://www.figma.com/design/xxx?node-id=3339-718948",
      "type": "FRAME"
    }
  ]
}
```

- 解析返回的 frames 数组
- 统计页面/Frame 数量
- 提取每个页面的名称、nodeId、URL

### 第三步: 询问用户拆分策略

**如果检测到多个页面/Frame (>1个)**,询问用户拆分策略:

```
📊 Figma 设计稿结构分析

检测到该设计稿包含 {N} 个 Frame/页面:

1. 业务选择采购类型
   - Node ID: 3339-718947
   - URL: https://www.figma.com/design/xxx?node-id=3339-718947

2. 供应商列表
   - Node ID: 3339-718948
   - URL: https://www.figma.com/design/xxx?node-id=3339-718948

...

请选择拆分策略:

[选项]
A. 拆分 - 分别记录每个页面,后续技术方案中可针对不同页面处理
B. 整体 - 作为一个整体记录,保持页面间的完整关联
C. 自定义 - 选择特定的页面进行记录 (请告知页面序号,如 "1,3,5")

💡 提示:
- 拆分处理适合多页面/多功能场景,便于技术方案阶段精准关联
- 整体处理适合设计稿页面相互关联紧密的场景
- 后续可以在 /spec.d2c 中获取具体页面的截图和设计详情
```

**处理用户选择**:
- **选择 A (拆分)**: 记录所有 Frame
- **选择 B (整体)**: 使用用户提供的原始 URL 作为单个整体
- **选择 C (自定义)**: 解析用户输入的页面序号,只记录选中的页面

**如果只有 1 个 Frame**:
- 跳过询问,直接记录该 Frame

### 第四步: 获取页面截图

**仅在拆分模式下获取截图**:

根据用户的拆分选择:
- **选择 A (拆分)**: 为每个页面获取截图
- **选择 B (整体)**: 跳过此步骤
- **选择 C (自定义)**: 为选中的页面获取截图

**创建截图目录**:
```bash
mkdir -p resources/screenshots
```

**批量获取截图**:

对每个选中的页面,调用 Figma MCP 获取截图:

```javascript
// 注意: nodeId 需要从 hyphen 格式转换为 colon 格式
// 例如: "3339-718947" -> "3339:718947"

figma_export_images({
  fileKey: extractedFileKey,
  nodeIds: [nodeIdInColonFormat],
  format: "png",
  scale: 2
})
```

**保存截图命名规范**:
```
resources/screenshots/
├── {序号}-{页面名称}-{nodeId-hyphen}.png
├── 01-业务选择采购类型-3339-718947.png
├── 02-供应商列表-3339-718948.png
└── ...
```

**批量下载优化**:
- 使用并行 curl 命令批量下载所有截图
- 命令示例:
```bash
curl -s -o "path/to/01-页面名称-nodeId.png" "imageUrl1" && \
curl -s -o "path/to/02-页面名称-nodeId.png" "imageUrl2" && \
curl -s -o "path/to/03-页面名称-nodeId.png" "imageUrl3" && \
echo "Downloaded N screenshots"
```

**错误处理**:
- 如果某个截图获取失败,记录错误但继续处理其他页面
- 在最终报告中标注哪些页面截图获取失败

### 第五步: 生成页面关联文档

根据用户的拆分选择,生成 `resources/figma.md` 文档:

```markdown
# Figma 设计稿页面关联

> 本文档记录了 Figma 设计页面的拆分结果和截图
> 详细设计内容(组件结构、代码)将在后续阶段按需获取

## 元信息
- **Figma 文件**: {fileName}
- **原始链接**: {fileUrl}
- **拆分时间**: {timestamp}
- **拆分策略**: {split/whole/custom}
- **截图数量**: {N} 个

## 页面列表

### 1. {页面名称1}

![页面截图](screenshots/01-{页面名称}-{nodeId-hyphen}.png)

- **Figma 链接**: https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
- **Node ID (hyphen)**: {nodeId-hyphen}
- **Node ID (colon)**: {nodeId-colon}
- **截图路径**: `screenshots/01-{页面名称}-{nodeId-hyphen}.png`
- **关联功能点**: 待在技术方案阶段关联
- **设计详情状态**: 已获取截图
- **备注**: {留空}

### 2. {页面名称2}

![页面截图](screenshots/02-{页面名称}-{nodeId-hyphen}.png)

- **Figma 链接**: https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
- **Node ID (hyphen)**: {nodeId-hyphen}
- **Node ID (colon)**: {nodeId-colon}
- **截图路径**: `screenshots/02-{页面名称}-{nodeId-hyphen}.png`
- **关联功能点**: 待在技术方案阶段关联
- **设计详情状态**: 已获取截图
- **备注**: {留空}

## 使用说明

### 1. 查看页面截图
- 截图已保存到 resources/screenshots/ 目录
- 可直接在文件管理器中查看各个页面的设计稿

### 2. 在技术方案阶段使用 (/spec.feat-tech)
- 读取本文档了解可用的设计页面
- 在梳理改动点时,将功能点与对应页面关联
- 更新"关联功能点"字段

### 3. 获取更多设计详情 (/spec.d2c)
- 如需获取组件结构、设计代码等详细信息,运行 `/spec.d2c`
- 命令会自动读取本文档,针对选定页面获取设计详情
- 获取后更新"设计详情状态"字段

### 4. Node ID 格式说明
- **Hyphen format** (如 `3339-718947`): `figma_get_frame_links` 返回的格式,用于文件命名
- **Colon format** (如 `3339:718947`): 其他 Figma MCP 方法使用的格式
- 转换方法: `nodeId.replace('-', ':')`

## 后续操作

- ✅ 页面拆分已完成
- ✅ 页面截图已保存
- ⏳ 待运行 `/spec.d2c` 获取详细设计信息(组件结构、代码)
- ⏳ 待在 `/spec.feat-tech` 中关联功能点
```

**生成要点**:
1. 记录所有选中的页面(拆分/整体/自定义)
2. 保存完整的 Figma URL 和两种格式的 Node ID
3. **记录每个页面的截图路径**(新增)
4. 标注"设计详情状态"为"已获取截图"
5. 添加清晰的使用说明和后续操作指引
6. 在"整体"模式下,不记录截图路径,状态为"未获取"

### 第六步: 确认完成

展示拆分结果,确认完成:

```
✅ Figma 页面拆分完成!

📊 拆分结果:
- 拆分策略: {split/whole/custom}
- 页面数量: {N} 个
- 截图数量: {N} 个 (拆分模式) / 0 个 (整体模式)
- 关联文档: resources/figma.md
- 截图目录: resources/screenshots/

📋 已记录页面:
1. {页面名称1} - ✅ 截图已保存
2. {页面名称2} - ✅ 截图已保存
...

📝 后续步骤:
1. 查看 resources/screenshots/ 目录预览各页面设计
2. 在技术方案阶段 (/spec.feat-tech) 关联功能点
3. (可选) 运行 /spec.d2c 获取更多设计详情(组件结构、代码)
4. 在代码生成阶段使用设计内容

💡 提示:
- 拆分结果已保存到 resources/figma.md
- 页面截图已保存到 resources/screenshots/
- 可随时查看这些文件了解页面结构和视觉设计
- 如需重新拆分,再次运行本命令
```

## 特殊场景处理

### 场景 1: 单个组件/元素

如果用户提供的链接指向单个组件(不是整个页面):
- 跳过拆分询问
- 直接记录该组件信息
- 标记类型为"component"

### 场景 2: 无权限访问

如果返回权限错误:
```
❌ 无法访问该 Figma 文件

可能的原因:
1. 您没有该文件的访问权限
2. Figma MCP 服务未正确登录
3. 链接已过期或无效

解决方案:
1. 检查 Figma 文件的访问权限设置
2. 确认 Figma MCP 服务登录状态
3. 重新获取有效的 Figma 链接
```

### 场景 3: 追加页面模式

如果用户选择"追加页面"(第零步选项 C):
1. 读取现有 `resources/figma.md` 内容
2. 解析已有页面列表
3. 新页面从现有最大序号 +1 开始编号
4. 追加到文档末尾,保持格式一致
5. 更新元信息中的"最后更新时间"

### 场景 4: 链接格式错误

如果链接格式不正确:
```
❌ Figma 链接格式错误

您提供的链接: {userUrl}

支持的格式:
- https://www.figma.com/design/{fileKey}/{fileName}
- https://www.figma.com/design/{fileKey}/{fileName}?node-id={nodeId}
- https://www.figma.com/file/{fileKey}/{fileName}
- https://www.figma.com/design/{fileKey}/branch/{branchKey}/{fileName}

请提供正确的 Figma 链接。
```

## 错误处理

1. **网络错误**: 提示检查网络连接,建议重试
2. **节点不存在**: 提示节点 ID 可能无效,建议使用文件根节点
3. **文件未找到**: 提示文件可能已删除或链接错误
4. **MCP 服务错误**: 提示检查 Figma MCP 配置

## 输出文件

执行完成后,生成以下文件:

```
.spec/feature/{YYYY-MM-DD}-{feature-name}/
└── resources/
    ├── figma.md                              # Figma 页面关联文档
    ├── screenshots/                            # Figma 页面截图目录(拆分模式)
    │   ├── 01-{页面名称}-{nodeId}.png
    │   ├── 02-{页面名称}-{nodeId}.png
    │   └── ...
    └── .backup/                              # 备份目录(重新拆分时)
        └── figma-{timestamp}.md
```

## 与其他命令的集成

### 被 /spec.feat-prd 调用

在 PRD 阶段收集资源时:
```markdown
如果用户提供 Figma 链接:
1. 保存链接到 prd/original.md
2. 询问用户是否立即拆分页面并获取截图
3. 如果用户同意,调用 /spec.utils.figma-split
4. 传入 Figma URL,自动完成拆分和截图获取
5. 继续 PRD 其他流程
```

### 被 /spec.d2c 调用

在 D2C 阶段:
```markdown
1. 首先检测 resources/figma.md 是否存在
2. 如果存在,读取并使用已拆分结果:
   - 如果已有截图,直接使用现有截图
   - 如果没有截图(整体模式),询问是否需要获取截图
3. 如果不存在:
   - 询问用户提供 Figma 链接
   - 调用 /spec.utils.figma-split 进行拆分和截图获取
   - 拆分完成后继续获取更多设计详情
```

### 被 /spec.auto 调用

在自动化工作流中:
```markdown
在收集信息阶段:
1. 如果检测到 Figma 链接,自动调用拆分工具
2. 静默处理,使用默认策略(拆分)
3. 继续后续流程
```

## 命令示例

```bash
# 手动运行拆分
/spec.utils.figma-split

# 然后提供 Figma 链接
https://www.figma.com/design/jE6p2o9yoJ0qSZRnvtnAZT/寻源执行?node-id=3339-718947

# AI 分析设计稿结构,询问拆分策略
# 用户选择"拆分"
# AI 自动获取每个页面的截图并保存到 resources/figma/screenshots/

# 或在其他命令中自动调用(用户无感知)
/spec.feat-prd
# AI 询问是否有设计稿
# 用户提供 Figma 链接
# AI 自动调用本工具完成拆分和截图获取
```

---

**版本**: 1.0.0
**创建日期**: 2024-12-17
**依赖**: Figma MCP Server
