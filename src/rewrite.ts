/**
 * UA 重写的纯逻辑模块:URL 前缀匹配与请求头合并。
 * 与 cordis/settings 解耦,便于单元测试。
 */

/** 单个 provider 的 UA 配置条目 */
export interface UaEntry {
  /** 自定义 User-Agent 字符串;空串或缺失视为未配置 */
  userAgent?: string
}

/** dsh-ua 插件的配置形状,来自 settings.yaml 的 dsh-ua 命名空间 */
export interface UaConfig {
  /** 按 provider 名组织的 UA 配置 */
  providers?: Record<string, UaEntry>
}

/** provider 名到 baseURL 的解析器,由插件注入 settings 查询实现 */
export type BaseUrlLookup = (provider: string) => string | undefined

/**
 * 从 fetch 入参提取规范化 URL 字符串。
 * @param input - fetch 的 input,可为 string / URL / Request
 * @returns 统一后的 URL 字符串
 */
export function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

/**
 * 为一次请求解析目标 UA:按配置顺序遍历 provider,
 * 命中首个 baseURL 前缀的返回其 UA;未命中返回 undefined。
 * @param config - 当前生效的 dsh-ua 配置
 * @param lookup - provider 名到 baseURL 的解析器
 * @param url - 本次请求的完整 URL
 * @returns 命中的自定义 UA,或 undefined 表示不重写
 */
export function resolveUa(
  config: UaConfig,
  lookup: BaseUrlLookup,
  url: string,
): string | undefined {
  const providers = config.providers
  if (providers === undefined) return undefined
  for (const [provider, entry] of Object.entries(providers)) {
    const ua = entry?.userAgent
    if (ua === undefined || ua.length === 0) continue
    const baseURL = lookup(provider)
    if (baseURL !== undefined && url.startsWith(baseURL)) return ua
  }
  return undefined
}

/**
 * 构造重写 UA 后的 fetch init:保留既有请求头,
 * 将 user-agent 替换为自定义值。
 * @param input - 原始 fetch input,用于 Request 形式下的头部兜底
 * @param init - 原始 fetch init
 * @param ua - 要写入的自定义 UA
 * @returns 重写后的 init
 */
export function rewriteInit(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  ua: string,
): RequestInit {
  const source = init?.headers
  const headers = source === undefined && input instanceof Request
    ? new Headers(input.headers)
    : new Headers(source)
  headers.set('user-agent', ua)
  return { ...init, headers }
}
