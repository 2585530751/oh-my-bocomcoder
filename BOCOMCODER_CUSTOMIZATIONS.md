# Oh-My-BocomCoder 定制改动记录

> 本文档记录了 Oh-My-BocomCoder 相对于上游 Oh My Pi (can1357/oh-my-pi) 的所有定制改动，方便每次同步上游更新时参考。

## 概述
Oh-My-BocomCoder 的定制改动较少，主要是构建适配、本地开发修复和 Provider 精简，未做品牌名替换。

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
## Provider 精简（全部移除）

> 所有内置 Provider 已移除（原 83 个 → 0 个）。模型完全通过用户配置提供。
> `models.json` 已清空（原 2.1MB/64 provider/4120 模型 → `{}`）。
> 用户自定义 Provider（`mouser-llm`、`xfyun`）通过 `~/.bocomcoder/agent/models.json` 加载，使用 `api: "openai-completions"` 协议。

### 设计决策
- **保留源码文件**：`packages/ai/src/providers/` 和 `packages/ai/src/registry/` 中的 78+ 个已移除 Provider 的源码文件未删除，仅从注册表和描述符中移除。这样 `stream.ts`、`mapOptionsForApi`、`register-builtins.ts` 等函数中的类型引用仍可编译，且未来恢复 Provider 只需重新注册。
- **`KnownProvider` 放宽为 `string`**：`CATALOG_PROVIDERS` 为空数组，`(typeof CATALOG_PROVIDERS)[number]["id"]` = `string`，使所有 provider ID 类型兼容。
- **`OAuthProvider` 放宽为 `string`**：`OAuthProviderUnion` 从空 `PROVIDER_REGISTRY` 派生，`OAuthProvider` 已从 `OAuthProviderUnion` 改为 `string`。
- **编译时完整性检查移除**：`registry.ts` 中的 `_CheckRegistryComplete` 已移除（`KnownProvider` = `string` 后 `Exclude<string, never>` = `string` ≠ `never`，检查无意义）。
- **models.json 清空**：编译时静态模型目录已清空为 `{}`，`GeneratedProvider` 类型放宽为 `string` 以兼容死代码。运行时模型来源：用户 `~/.bocomcoder/agent/models.json` 自定义配置。
- **自定义 Provider 兼容性**：`mouser-llm` 和 `xfyun` 使用 `api: "openai-completions"`，通过 `stream.ts` 的 `case "openai-completions":` 分支和 `register-builtins.ts` 的 `streamOpenAICompletions` 惰性加载器处理。这些代码路径完整保留。

### 修改的文件

| 文件 | 改动 | 说明 |
|------|------|------|
| `packages/catalog/src/provider-models/descriptors.ts` | `CATALOG_PROVIDERS` 清空为 `[]`，`KnownProvider` = `string` | 所有内置 Provider 描述符移除，类型放宽 |
| `packages/ai/src/registry/registry.ts` | `ALL` 数组清空为 `[]`，移除 `_CheckRegistryComplete` | 所有内置 Provider 注册移除，编译时检查不再适用 |
| `packages/ai/src/registry/oauth/types.ts` | `OAuthProvider` 从 `OAuthProviderUnion` 改为 `string` | 无内置 Provider 后联合类型为 `never`，需放宽 |
| `packages/ai/src/registry/oauth/index.ts` | 移除 perplexity/github-copilot/google-gemini-cli/google-antigravity/alibaba-coding-plan 特殊处理 | `getOAuthApiKey` 简化为直接返回 `creds.access` |
| `packages/ai/src/registry/vllm.ts` | `PROVIDER_ID` 类型从 `OAuthProvider` 改为 `string` | 避免 `OAuthProvider` 联合类型缩小后的类型错误 |
| `packages/catalog/scripts/generate-models.ts` | `fetchAntigravityModels` 和 `fetchCodexDiscoveryModels` 改为空 stub | 返回 `never[]`，避免引用已移除 Provider 的类型 |
| `packages/catalog/test/*.test.ts` | 删除 15 个引用已移除 Provider 的测试文件 | aiand、alibaba-token-plan、amazon-bedrock-openai、azure、coreweave、descriptors、gmi-cloud、issue-2105-repro、issue-830-repro、meta、novita、sakana、siliconflow、zenmux、zhipu |
| `packages/ai/test/*.test.ts` | 删除 6 个引用已移除 Provider 的测试文件 | alibaba-endpoint-selection、auth-storage-broker-no-sentinel、auth-storage-codex-selection、github-copilot-login、google-gemini-cli-alignment、provider-registry |
| `packages/catalog/src/models.json` | 清空为 `{}` | 原 2.1MB/64 provider/4120 模型全部移除 |
| `packages/catalog/src/models.ts` | `GeneratedProvider` 类型从 `keyof typeof MODELS` 改为 `string` | 兼容死代码中对已移除 Provider 的调用 |
| `packages/catalog/test/*.test.ts` | 删除 6 个引用已清空 models.json 的测试文件 | models-lazy-provider-cache、issue-3067-repro、issue-772-repro、minimax-bundled-catalog、umans-provider、zai-bundled-catalog |
### 启动联网请求禁用

| 文件 | 改动 | 说明 |
|------|------|------|
| `packages/coding-agent/src/config/settings-schema.ts` | `startup.checkUpdate` 默认值 `true` → `false` | 自编译无需联网检查版本更新 |
| `packages/coding-agent/src/config/settings-schema.ts` | `marketplace.autoUpdate` 默认值 `"notify"` → `"off"` | 自编译无需联网检查插件市场更新 |

### 未修改的文件（死代码保留）

以下文件仍包含已移除 Provider 的代码，但编译正常，运行时不会被调用：
- `packages/ai/src/providers/*.ts` — 78+ 个 Provider 实现文件
- `packages/ai/src/registry/*.ts` — 78+ 个 Provider 注册文件（除 vllm.ts 外均无类型错误）
- `packages/ai/src/stream.ts` — `streamDispatch`、`streamSimple`、`mapOptionsForApi` 仍包含所有 API 类型的处理分支
- `packages/ai/src/providers/register-builtins.ts` — 仍注册所有 Provider 的流函数
- `packages/catalog/src/provider-models/google.ts` — Google/Vertex/Antigravity/GeminiCli 模型管理器
- `packages/catalog/src/provider-models/special.ts` — Codex/Cursor/GitLabDuo/Devin/Zai 模型管理器
- `packages/catalog/src/provider-models/openai-compat.ts` — 仍导出所有 Provider 的描述符和静态模型种子

### 同步上游时的注意事项

1. **descriptors.ts 冲突**：上游新增 Provider 时，需要决定是否保留。如果保留，需同步在 `registry.ts` 中添加对应注册。
2. **registry.ts 冲突**：同上，新增 Provider 需同步在 `descriptors.ts` 中添加描述符。
3. **stream.ts / register-builtins.ts**：这些文件保留完整，上游更新通常不会冲突。
4. **oauth/index.ts**：如果上游新增有特殊 API key 处理的 Provider，需在 `getOAuthApiKey` 中添加对应分支。
5. **generate-models.ts**：如果上游新增有动态发现功能的 Provider，需恢复或新增对应的 fetch 函数。
6. **测试文件**：删除的测试文件如果上游有更新，需评估是否需要恢复并适配。


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
| `packages/ai/src/registry/registry.ts` | 保留空 `ALL` 数组，移除 `_CheckRegistryComplete`；如需恢复 Provider，添加注册并同步 descriptors.ts |
| `packages/ai/src/registry/oauth/types.ts` | 保留 `OAuthProvider = string`；如需恢复内置 OAuth Provider，改回 `OAuthProviderUnion` |
| `packages/ai/src/registry/oauth/index.ts` | 保留简化后的 `getOAuthApiKey`，合并上游新增特殊处理分支 |
| `packages/catalog/src/provider-models/descriptors.ts` | 保留空 `CATALOG_PROVIDERS`；如需恢复 Provider，添加描述符并同步 registry.ts |
| `packages/catalog/scripts/generate-models.ts` | 保留 stub 函数，合并上游新增动态发现时需恢复 |
| `packages/coding-agent/src/config/settings-schema.ts` | 保留 `startup.checkUpdate: false` 和 `marketplace.autoUpdate: "off"` 默认值，合并上游新增设置项 |

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
| v0.83.0-bc1 | v0.83.0 | Provider 精简：83→5（openai/ollama/openrouter/litellm+ollama-cloud），OAuth 简化，测试清理 |
| v0.83.0-bc2 | v0.83.0 | 禁用启动版本检查（`startup.checkUpdate: false`）和插件市场自动更新（`marketplace.autoUpdate: "off"`），自编译无需联网检查更新 |
| v0.83.0-bc3 | v0.83.0 | Provider 全部移除：5→0，`KnownProvider`/`OAuthProvider` 放宽为 `string`，`_CheckRegistryComplete` 移除，自定义 Provider（mouser-llm/xfyun）通过 `api: "openai-completions"` 独立运行 |
| v0.83.0-bc4 | v0.83.0+ | 上游合并 200+ commits，models.json 冲突取上游后重新清空，vllm.ts 采纳 createApiKeyLogin 重构，legacy-pi-virtual-module.ts 采纳 path.sep 规范化 |
