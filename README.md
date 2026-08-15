# dsh-ua

为 [dsh](https://github.com/deepseek-ai/deepseek-harness) 的**自定义 provider** 配置自定义 User-Agent 的独立插件。不修改任何已安装的 dsh 代码,通过包装全局 `fetch` 在请求发出前重写 `user-agent` 请求头。

## 背景

dsh 会把硬编码的 attribution UA(`deepseek-harness/<version> (+https://github.com/deepseek-ai/deepseek-harness)`)发送给所有模型提供方,且不允许通过配置文件覆盖。某些网关会拒绝该 UA——例如 `opencode.ai/zen` 只接受识别 opencode 客户端的 UA,否则返回 HTTP 429。

本插件允许你在 `$DSH_HOME/settings.yaml` 中为每个自定义 provider 单独指定 UA。

## 配置

在 `$DSH_HOME/settings.yaml` 中新增 `dsh-ua` 命名空间,按 provider 名配置:

```yaml
dsh-ua:
  providers:
    ocapi:
      userAgent: opencode
```

- key `ocapi` 必须与 `llm-pi-ai.providers` 中的 provider 名一致,插件会据此查到该 provider 的 `baseURL` 并匹配请求
- `userAgent` 为该 provider 下所有模型请求使用的 User-Agent
- **不配置或留空** = 保持 dsh 默认 UA
- 修改后热生效,无需重启(新增插件行除外,见下)

## 安装

1. 构建:`npm run build`(产物在 `lib/`)
2. 复制到 dsh 外部插件闭包目录(**目录内不要放 node_modules**,依赖需命中 dsh 安装闭包):

   ```sh
   Copy-Item lib "C:\Users\xys\.dsh\profiles\node_modules\dsh-ua\lib" -Recurse -Force
   ```

   同时需保证 `package.json` 与 `cordis.patch.yml` 在该目录内。

3. 在 `$DSH_HOME/profiles/web/cordis.patch.yml` 中注册插件行:

   ```yaml
   - insert:
       - id: dsh-ua
         name: 'dsh-ua'
   ```

4. 重启 dsh(`npx @deepseek-ai/dsh web`)使插件行生效。

## 工作原理

- 插件注册 `dsh-ua` settings 命名空间(由 dsh settings 服务管理,含 schema 校验)
- 每次 `fetch` 调用时,插件读取 `llm-pi-ai` / `llm-deepseek` 命名空间拿到 provider → baseURL 映射
- 请求 URL 命中某已配置 provider 的 baseURL 前缀时,重写 `user-agent` 请求头;否则完全透传
- 插件卸载时恢复原始 `globalThis.fetch`

## 开发

```sh
npm install
npm run build      # tsc 编译到 lib/
npm test           # vitest 单元测试
npm run typecheck  # 类型检查(含测试文件)
```

## 已知限制

- 仅能匹配配置中显式写了 `baseURL` 的 provider;由 pi-ai 内置 catalog 提供地址的 provider 无法匹配,保持默认 UA
- 浏览器端(Web UI)与子进程/worker 中的 `fetch` 不在主进程插件包装范围内
