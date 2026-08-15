# dsh-ua

`dsh-ua` 是一个独立插件，让 dsh 把**指定自定义 provider** 的请求 User-Agent(UA)换成你写的值。

- 不改动你已安装的 dsh 任何文件
- 以官方 bundle 形态挂载进 dsh profile（`dsh.profile.bundles` 列出）
- 配置写在 dsh 的设置文件里，改完热生效
- 没配置的 provider 保持 dsh 原来的 UA，完全不受影响

## 它解决什么问题

dsh 发给模型服务器的请求里，User-Agent 是硬编码的：

```
deepseek-harness/<版本号> (+https://github.com/deepseek-ai/deepseek-harness)
```

有些网关不接受这个 UA。例如 `opencode.ai/zen` 只认识别成 opencode 客户端的 UA，
遇到 dsh 的 UA 会直接返回 **HTTP 429**。这个插件就是让你能按 provider 指定 UA，
让网关认出来。

---

## 安装（从零开始）

### 第 0 步：确认前提

1. 已安装 **Node.js**（`node --version` 有输出）
2. 已安装 **pnpm**（`pnpm --version` 有输出）—— dsh 的官方安装命令需要用到它
3. dsh 能正常运行（你能用 `npx @deepseek-ai/dsh web` 打开网页）
   - 如果还没装过 dsh，第一次运行上面的命令会自动下载
4. 确认 dsh 主目录（下文用 `$DSH_HOME` 表示）：
   - 默认是 `C:\Users\<你的用户名>\.dsh`

### 第 1 步：用官方命令从 git 安装

在任意目录执行（把仓库地址换成维护者提供的那一个）：

```
npx @deepseek-ai/dsh plugin --profile web add git+https://gitee.com/<仓库地址>/dsh-ua.git
```

第一次执行**会报错，这是正常的**：pnpm 默认禁止运行新装包的构建脚本。
报错末尾会打印一段 `allowBuilds:` 配置，例如：

```
allowBuilds:
  dsh-ua@git+https://gitee.com/<仓库地址>/dsh-ua.git#<一长串commit号>: true
```

把它**原样追加**到文件 `$DSH_HOME\profiles\web\pnpm-workspace.yaml` 末尾，保存，
再执行一次上面的安装命令即可装成功。装好后 `dsh-ua` 会自动加入 `dsh.profile.bundles`
（profile 的 bundle 列表）。

> 说明：
> - 这个命令会把 git 仓库里的**源码**拉下来并自动执行插件的构建脚本（插件自带了 `prepare`，
>   无需你手动装 TypeScript）。这是 dsh 官方支持的安装方式，与改 dsh 安装文件无关。
> - 如果你之前用旧方式（`npm run deploy` 复制法）装过，请删掉旧的 `$DSH_HOME\profiles\node_modules\dsh-ua`
>   文件夹，避免两份并存。

### 第 2 步：重启 dsh

```
npx @deepseek-ai/dsh web
```

第一次安装**必须重启**才能加载插件；之后改动 `settings.yaml` 里的 UA 值是热生效的，不用重启。

### 第 3 步：配置 UA

打开 `$DSH_HOME\settings.yaml`，末尾追加：

```yaml
dsh-ua:
  providers:
    your-provider:
      userAgent: your-User-Agent
```

- **provider 名**：必须和文件里 `llm-pi-ai.providers` 下面的名字一字不差，
  插件靠它找到该 provider 的 baseURL 再匹配请求。
- **userAgent 值**：最终发给服务器的 User-Agent 原文。
- 保存即生效（无需重启）。
- 想恢复默认 UA：删掉或留空 `userAgent`。

---

## 验证是否生效

1. 打开 dsh 网页（`http://127.0.0.1:3080`），发一条消息
2. 按 **F12** → **Network** 标签 → 找到发往你 provider 的请求（如 `chat/completions`）
3. 看 **Request Headers** 里的 `User-Agent`，应是你配置的值

---

## 更新插件

```
npx @deepseek-ai/dsh plugin --profile web update dsh-ua
```

然后重启 dsh。

## 卸载

```
npx @deepseek-ai/dsh plugin --profile web remove dsh-ua
```

然后把 `settings.yaml` 里的 `dsh-ua:` 段落删掉，重启 dsh。

## 开发相关

```
npm test            # 单元测试
npm run typecheck   # 类型检查
npm run build       # 编译到 lib/
```

插件带 `prepare` 构建脚本：通过 git 安装时 pnpm 会自动编译，无需手动 `npm run build`。

维护者在自己有 dsh 的机器上做本地快速迭代时，也可以用 `npm run deploy` 把产物复制到
`$DSH_HOME\profiles\node_modules\dsh-ua\`（旧方式，仅供本人开发用，不适合分发给用户）。

## 原理

插件注册 `dsh-ua` settings 命名空间，并包装全局 `fetch`：每次请求发出前，读取
`llm-pi-ai` / `llm-deepseek` 的 provider → baseURL 映射，若请求 URL 命中已配置
provider 的 baseURL 前缀，就把 `user-agent` 换成配置值；否则完全透传。

## 限制

- 只对配置里显式写了 `baseURL` 的 provider 生效；由 dsh 内置目录自动提供地址的 provider 无法匹配，保持默认 UA。
- 浏览器网页端自己发起的请求、以及子进程里的请求，不在插件覆盖范围内（正常使用不受影响）。
