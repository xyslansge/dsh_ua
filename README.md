# dsh-ua

`dsh-ua` 是一个 deepseek harness 插件，让用户可以自定义 provider 的请求 User-Agent

## 安装

在任意目录下执行：

```
npx @deepseek-ai/dsh plugin --profile web add 【发行连接】
```

重启 dsh

```
npx @deepseek-ai/dsh web
```

## 配置

打开 `$DSH_HOME\settings.yaml`，末尾追加：

```yaml
dsh-ua:
  providers:
    your-provider:
      userAgent: your-User-Agent
```

将 `your-provider` 与 `your-User-Agent` 替换为

## 卸载

```
npx @deepseek-ai/dsh plugin --profile web remove dsh-ua
```

## 构建

在项目目录执行：

```
npm pack
```

## 协议

本项目采用 [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0) 开源协议，完整条款见 [LICENSE](./LICENSE)。

## 声明

本插件仅限合法用途，使用者应自行确保其使用行为符合适用的法律法规，以及第三方服务（包括但不限于各 AI provider）的服务条款与政策。

因使用者使用本插件而引发的任何争议、损失或法律责任，均由使用者自行承担；开发者不为此承担责任。开发者亦不对本插件的适用性、准确性或特定用途的适用性作任何明示或默示的保证。
