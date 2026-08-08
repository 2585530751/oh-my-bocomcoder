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

## 编译步骤

### 前置条件
- Bun（版本见根目录 `bun.lock`）
- Bazelisk（用于构建原生模块）
- Rust toolchain（用于编译 `pi_natives`）
- Windows: Visual Studio Build Tools（C++ 编译）

### 完整构建（推荐）
```bash
# 一键 setup：安装依赖 + 构建原生模块 + link coding-agent + 安装 omp 全局命令
bun run setup
```

`setup` 等价于：
```bash
bun install                    # 安装所有 workspace 依赖
bun run build:native           # 构建 pi_natives.node（Bazel）
bun --cwd=packages/coding-agent link  # 注册 coding-agent 到 Bun 全局
sh scripts/link-omp.sh         # 安装 omp wrapper 到全局 bin
```

### 分步构建

#### 1. 构建原生模块
```bash
bun run build:native
# 等价于：bun --cwd=packages/natives run build
# 内部调用 Bazel：bazel build //packages/natives:pi_natives
# 产物：packages/natives/native/pi_natives.host.node
```

#### 2. 编译 coding-agent 二进制
```bash
cd packages/coding-agent
bun run build
# 内部调用 scripts/build-binary.ts，流程：
#   1. gen:stats — 生成统计客户端
#   2. gen:tool-views — 生成工具视图
#   3. gen:native — 嵌入原生模块
#   4. gen:mupdf — 嵌入 mupdf wasm
#   5. compileCodingAgent — Bun compile 打包为单文件二进制
#   6. gen:mupdf:reset / gen:native:reset — 恢复占位符
#   7. gen:stats:reset — 恢复占位符
# 产物：packages/coding-agent/dist/omp（或 omp.exe）
```

#### 3. 交叉编译
```bash
# 指定目标平台
CROSS_TARGET=win32-x64 bun --cwd=packages/coding-agent run build
# 支持的目标：darwin-arm64, darwin-x64, linux-arm64, linux-x64, win32-x64
```

### 开发模式
```bash
# 直接运行源码（无需编译二进制）
bun run dev
# 等价于：bun --cwd=packages/coding-agent src/cli.ts
```

### Docker 构建
```bash
# 构建完整 Docker 镜像
docker build -t oh-my-pi/pi:dev .

# 仅构建 base 镜像
docker build --target pi-base -t oh-my-pi/pi-base:dev .

# 运行
docker run --rm oh-my-pi/pi:dev --help
docker run --rm -it -v "$PWD":/work oh-my-pi/pi:dev cli
```

### 关键构建脚本说明

| 脚本 | 用途 |
|------|------|
| `scripts/bazel-natives.ts` | 调用 Bazel 构建原生模块 |
| `scripts/build-binary.ts` | 编译 coding-agent 为单文件二进制 |
| `scripts/compile-binary.ts` | 底层 Bun compile 打包逻辑 |
| `scripts/embed-mupdf-wasm.ts` | 嵌入/重置 mupdf wasm 字节 |
| `scripts/embed-native.ts` | 嵌入/重置原生模块 |
| `scripts/link-omp.sh` | 安装 omp 全局命令 wrapper |
| `packages/natives/scripts/build-bindings.ts` | 生成 Rust 绑定 |

### 注意事项
- `build:native` 依赖 Bazel 和 Rust，首次构建较慢（编译 miniaudio、opus 等）
- `gen:native` 和 `gen:mupdf` 在构建时临时嵌入大文件，构建后自动恢复占位符（`reset`）
- Windows 上 `embedded-addon.js` 已改为内联 `win32-x64` tar.gz，确保本地构建可用
- `MODULE.bazel.lock` 冲突时直接采纳上游版本，重新构建即可

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
   # 完整构建
   bun run setup

   # 或仅编译二进制
   cd packages/coding-agent
   bun run build
   ```

---

## 版本历史

| 版本 | 上游版本 | 主要变化 |
|------|----------|----------|
| v0.83.0 | v0.83.0 | 初始构建适配，embedded-addon/mupdf-wasm-embed 本地化，路径分隔符修复 |
