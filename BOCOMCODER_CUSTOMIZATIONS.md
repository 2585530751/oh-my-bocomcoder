# Oh-My-BocomCoder 定制改动记录

> 本文档记录了 Oh-My-BocomCoder 相对于上游 Oh My Pi (can1357/oh-my-pi) 的所有定制改动，方便每次同步上游更新时参考。

## 概述

Oh-My-BocomCoder 的定制改动较少，主要是构建适配和本地开发修复，未做品牌名替换或功能删减。

---

## .gitignore 修改

新增忽略项：
```gitignore
# Bazel full output (symlink dir)
bazel-oh-my-pi/

# Local test/scratch scripts
local-*.sh
local-*.ts
local-*.js

# BocomCoder brand dir
.bocomcoder/

# Local environment overrides
.env.local
.env.*.local

# Debug / scratch
debug-*.log
scratch/
```

---

## 构建适配

### embedded-addon.js
- **文件**：`packages/natives/native/embedded-addon.js`
- **改动**：从 `export const embeddedAddon = null` 改为内联 `win32-x64` 平台的 tar.gz 引用
- **原因**：本地构建需要嵌入原生模块，上游默认为 null（由 CI 构建时填充）

### mupdf-wasm-embed.ts
- **文件**：`packages/coding-agent/src/utils/mupdf-wasm-embed.ts`
- **改动**：移除自动生成标记和注释，改为直接嵌入 wasm 文件
- **原因**：本地构建需要 wasm 字节可用

### legacy-pi-virtual-module.ts
- **文件**：`packages/coding-agent/scripts/legacy-pi-virtual-module.ts`
- **改动**：修复 glob 扫描结果路径分隔符处理（`rawMatch` → 标准化后 `match`）
- **原因**：Windows 平台路径分隔符兼容性修复

---

## 同步上游更新时的处理流程

### 1. 合并前检查
```bash
git fetch upstream
git log HEAD..upstream/main --oneline  # 查看新提交数量
git diff HEAD..upstream/main -- packages/natives/ packages/coding-agent/scripts/ packages/coding-agent/src/utils/mupdf-wasm-embed.ts
```

### 2. 合并冲突解决策略

| 冲突文件 | 解决策略 |
|----------|----------|
| `.gitignore` | 合并上游新增项，保留 BocomCoder 专属忽略项 |
| `packages/natives/native/embedded-addon.js` | 如果上游更新了此文件，评估是否需要重新适配 win32-x64 嵌入 |
| `packages/coding-agent/src/utils/mupdf-wasm-embed.ts` | 如果上游更新了此文件，评估是否需要重新适配本地构建 |
| `packages/coding-agent/scripts/legacy-pi-virtual-module.ts` | 保留路径分隔符修复，合并上游其他变化 |
| `MODULE.bazel.lock` | 直接采纳上游版本，重新构建 |

### 3. 合并后必做的检查

1. **检查 embedded-addon 是否需要更新**：
   ```bash
   git diff HEAD~1..HEAD -- packages/natives/native/embedded-addon.js
   ```
   如果上游改变了嵌入方式，需要重新适配。

2. **检查 mupdf-wasm 是否需要更新**：
   ```bash
   git diff HEAD~1..HEAD -- packages/coding-agent/src/utils/mupdf-wasm-embed.ts
   ```

3. **编译验证**：
   ```bash
   # Bazel 构建
   bazel build //packages/coding-agent:bundle
   
   # 或 Bun 构建
   cd packages/coding-agent
   bun run build
   ```

---

## 版本历史

| 版本 | 上游版本 | 主要变化 |
|------|----------|----------|
| v0.83.0 | v0.83.0 | 初始构建适配，embedded-addon/mupdf-wasm-embed 本地化，路径分隔符修复 |
