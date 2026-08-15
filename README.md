# dsh-ua

`dsh-ua` 是一个独立插件，让 dsh 把**指定自定义 provider** 的请求 User-Agent(UA)换成你写的值。

- 不改动你已安装的 dsh 任何文件
- 以官方 bundle 形态挂载进 dsh profile（`dsh.profile.bundles` 列出）
- 配置写在 dsh 的设置文件里，改完热生效
- 没配置的 provider 保持 dsh 原来的 UA，完全不受影响

## 准备

安装前请确认:

1. **Node.js 已安装**(用 `node --version` 能看到版本号)
2. **dsh 已经能正常运行**(你能用 `npx @deepseek-ai/dsh web` 打开网页界面)
3. 你知道自己的 dsh 主目录。一般在 `C:\Users\<你的用户名>\.dsh`，下文用 `$DSH_HOME` 指代它。

## 安装

### 1. 构建插件

在本项目目录执行:

```
npm install
npm run build
```

构建成功后项目里会出现 `lib` 文件夹（插件代码），以及配套的 `package.json`、`cordis.patch.yml`。

### 2. 部署到 dsh 外部插件目录

dsh 留了一个专门放外部插件的目录（闭包目录）：

```
$DSH_HOME\profiles\node_modules
```

一键部署（构建 + 复制到该目录下的 `dsh-ua\`）：

```
npm run deploy
```

部署脚本会把 `lib`、`package.json`、`cordis.patch.yml` 复制到
`$DSH_HOME\profiles\node_modules\dsh-ua\`。

> 注意：插件目录内**不要放 node_modules**，否则 Node 会沿真实路径解析到项目自己的依赖，产生 Cordis 双实例，导致插件失效。`npm run deploy` 已保证这一点。

### 3. 确认 bundle 已注册

插件包 `package.json` 声明了 `dsh.bundle.patch`，表示它是个 bundle。你的 web profile
（`$DSH_HOME\profiles\web\package.json`）的 `dsh.profile.bundles` 列表里应包含 `dsh-ua`：

```json
"dsh": {
  "profile": {
    "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-ua"]
  }
}
```

### 4. 启动

```
npx @deepseek-ai/dsh web
```

## 配置

打开 dsh 设置文件:

```
$DSH_HOME\settings.yaml
```

文件末尾追加一段，配置自定义 User-Agent:

```yaml
dsh-ua:
  providers:
    your-provider:
      userAgent: your-User-Agent
```

- **provider 名**必须和文件里 `llm-pi-ai.providers` 下面的名字一致，插件靠它找到这个 provider 的地址。
- **userAgent 值**就是最终发给服务器的 User-Agent。
- 保存后**不用重启**，下一次请求就生效。
- 想恢复默认 UA，把 `userAgent` 删掉或留空即可。

## 更新插件

改完代码后重复两步:

```
npm run build
npm run deploy
```

然后重启 dsh。

## 卸载

1. 删掉整个文件夹 `$DSH_HOME\profiles\node_modules\dsh-ua`
2. 把 `$DSH_HOME\profiles\web\package.json` 里 `bundles` 列表中的 `dsh-ua` 移除
3. 把 `settings.yaml` 里 `dsh-ua:` 那一段删掉
4. 重启 dsh

## 开发相关

```
npm test            # 单元测试
npm run typecheck   # 类型检查
```

## 原理

插件注册 `dsh-ua` settings 命名空间，并包装全局 `fetch`：每次请求发出前，读取
`llm-pi-ai` / `llm-deepseek` 的 provider → baseURL 映射，若请求 URL 命中已配置
provider 的 baseURL 前缀，就把 `user-agent` 换成配置值；否则完全透传。

## 限制

- 只对配置里显式写了 `baseURL` 的 provider 生效；由 dsh 内置目录自动提供地址的 provider 无法匹配，保持默认 UA。
- 浏览器网页端自己发起的请求、以及子进程里的请求，不在插件覆盖范围内（正常使用不受影响）。
