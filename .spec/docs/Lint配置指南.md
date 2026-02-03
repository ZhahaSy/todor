# Lint 配置指南

确保自动生成的代码符合项目编码规范。

## 为什么需要 Lint？

在使用 AI 生成代码时，Lint 工具可以：

- ✅ **统一代码风格** - 缩进、引号、分号等保持一致
- ✅ **发现潜在错误** - 未使用的变量、语法问题等
- ✅ **提高代码质量** - 遵循最佳实践
- ✅ **减少 Code Review 负担** - 自动检查规范问题

## 快速配置

### 1. 检查是否已配置

```bash
# 检查 package.json 中是否有 eslint
grep "eslint" package.json

# 检查是否有配置文件
ls -la | grep eslint
```

### 2. 安装 ESLint (如果未安装)

```bash
# 安装 ESLint
npm install eslint --save-dev

# 初始化配置
npx eslint --init
```

根据提示选择：
- 项目类型（Node.js / Browser / Both）
- 使用模块（ESM / CommonJS）
- 框架（React / Vue / None）
- TypeScript（Yes / No）
- 代码风格（Popular style guide / 自定义）

### 3. 推荐配置

#### Node.js 项目

创建 `.eslintrc.js`:

```javascript
module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'no-console': 'off',
  },
};
```

#### React 项目

```javascript
module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'react/prop-types': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
```

#### TypeScript 项目

```javascript
module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

### 4. 添加 npm scripts

在 `package.json` 中添加：

```json
{
  "scripts": {
    "lint": "eslint src/ --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src/ --ext .js,.jsx,.ts,.tsx --fix"
  }
}
```

### 5. 配置忽略文件

创建 `.eslintignore`:

```
node_modules/
dist/
build/
coverage/
*.config.js
```

## 在工作流中使用

### 代码生成后（/spec.code）

```bash
# 1. 检查代码规范
npm run lint

# 2. 自动修复
npm run lint:fix

# 3. 查看修复结果
git diff
```

### 提交前检查

使用 Git Hooks 自动检查：

```bash
# 安装 husky 和 lint-staged
npm install husky lint-staged --save-dev

# 初始化 husky
npx husky init

# 创建 pre-commit hook
echo "npx lint-staged" > .husky/pre-commit
```

在 `package.json` 中添加：

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "git add"
    ]
  }
}
```

## 常见问题

### Q: 运行 lint 时报错 "Parsing error"

**A**: 检查 `parserOptions.ecmaVersion` 是否足够新，或安装对应的 parser：

```bash
# TypeScript
npm install @typescript-eslint/parser --save-dev

# React
npm install @babel/eslint-parser --save-dev
```

### Q: 大量缩进错误

**A**: 检查项目实际使用的缩进（2空格 / 4空格 / Tab），修改配置：

```javascript
rules: {
  'indent': ['error', 4], // 改为 4 空格
}
```

或自动修复：

```bash
npm run lint:fix
```

### Q: 如何忽略某些规则？

**A**: 在文件顶部添加注释：

```javascript
/* eslint-disable no-console */
console.log('这行不会被检查');
```

或在配置中关闭：

```javascript
rules: {
  'no-console': 'off',
}
```

### Q: 工作流中没有自动运行 lint？

**A**: 确保在 `/spec.code` 生成代码后手动运行：

```bash
npm run lint:fix
```

## 最佳实践

1. **提交前必须通过 lint** - 使用 Git Hooks
2. **优先修复错误(error)** - 警告(warning)可以暂时忽略
3. **团队统一配置** - 将 `.eslintrc.js` 提交到 Git
4. **CI 中运行 lint** - 确保所有代码符合规范
5. **定期更新规则** - 跟随项目发展调整规则

## 与工作流集成

在工作流各阶段的 lint 检查：

### /spec.init - 初始化
- 检测是否有 lint 配置
- 记录 lint 规则到 coding-standards.md

### /spec.code - 代码生成
- **生成后自动运行 lint**
- 提示修复所有错误

### /spec.review - 代码审查
- 检查是否通过 lint
- 标记未修复的规范问题

### /spec.archive - 归档
- 确认所有代码通过 lint
- 记录经验和最佳实践

## 推荐工具

- **ESLint** - JavaScript/TypeScript 标准工具
- **Prettier** - 代码格式化（与 ESLint 配合）
- **Stylelint** - CSS/SCSS 代码检查
- **Markdownlint** - Markdown 文档检查

## 参考资源

- [ESLint 官方文档](https://eslint.org/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Prettier + ESLint](https://prettier.io/docs/en/integrating-with-linters.html)

---

**记住**: Lint 不是限制，而是帮助我们写出更好的代码！✨
