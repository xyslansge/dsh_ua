/**
 * dsh-ua 插件:为 dsh 的自定义 provider 按需重写 User-Agent。
 *
 * 配置落在 settings.yaml 的 dsh-ua 命名空间,按 provider 名组织:
 *
 * ```yaml
 * dsh-ua:
 *   providers:
 *     ocapi:
 *       userAgent: my-custom-ua
 * ```
 *
 * 插件读取 llm-pi-ai / llm-deepseek 命名空间拿到 provider 的 baseURL,
 * 包装全局 fetch,在请求 URL 命中 baseURL 前缀时重写 user-agent 请求头。
 * 未配置的 provider 保持 dsh 默认 UA,对其它请求完全透传。
 * @module dsh-ua
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import { resolveUa, rewriteInit, requestUrl } from './rewrite.ts'
import type { BaseUrlLookup, UaConfig } from './rewrite.ts'

export const name = 'dsh-ua'
export const inject = ['settings']

const NS = settingsNamespace('dsh-ua')

/** 单个 provider 的配置条目,当前仅 userAgent 一个字段 */
export interface ProviderEntry {
  /** 自定义 User-Agent 字符串;空串或缺失视为未配置,保持默认 */
  userAgent?: string
}

/** 插件配置形状:按 provider 名组织的 UA 覆盖表 */
export interface Config {
  providers?: Record<string, ProviderEntry>
}

const providerEntry: z<ProviderEntry> = z.object({
  userAgent: z.string(),
})

export const Config: z<Config> = z.object({
  providers: z.dict(providerEntry).default({}),
})

/**
 * 解析 provider 的 baseURL:先查 llm-pi-ai 的 providers 字典,
 * 再查 llm-deepseek 的顶层 baseURL(deepseek-official 路由)。
 * 从 settings 服务实时读取,配置变更天然热生效。
 * @param ctx - 插件上下文,用于访问 settings 服务
 * @returns provider 名到 baseURL 的解析器
 */
function baseUrlLookup(ctx: Context): BaseUrlLookup {
  return (provider: string): string | undefined => {
    const settings = ctx.get('settings')
    if (settings === undefined) return undefined
    const piAi = settings.get(settingsNamespace('llm-pi-ai')) as
      | { providers?: Record<string, { baseURL?: string }> }
      | undefined
    const piUrl = piAi?.providers?.[provider]?.baseURL
    if (piUrl !== undefined && piUrl.length > 0) return piUrl
    const deepseek = settings.get(settingsNamespace('llm-deepseek')) as
      | { baseURL?: string }
      | undefined
    const dsUrl = deepseek?.baseURL
    if (provider === 'deepseek-official' && dsUrl !== undefined && dsUrl.length > 0) return dsUrl
    return undefined
  }
}

/**
 * 注册 dsh-ua 命名空间并包装全局 fetch。
 * 配置变更通过 settings 热生效;dispose 时恢复原始 fetch。
 * @param ctx - 插件上下文
 * @param config - 插件入口配置
 */
export function apply(ctx: Context, config: Config): void {
  // 当前生效的配置来源:settings 挂载时指向其作用域,否则回落入口配置
  let current: () => Config = () => config
  installSettingsSection(ctx, NS, Config, config, {
    setSource: (source) => {
      current = source
    },
    onChange: () => {},
  })

  const originalFetch = globalThis.fetch
  const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = requestUrl(input)
    const ua = resolveUa(current(), baseUrlLookup(ctx), url)
    if (ua === undefined) return originalFetch(input, init)
    return originalFetch(input, rewriteInit(input, init, ua))
  }
  // 以 effect 安装 fetch 包装,dispose 时随插件卸载自动恢复原始 fetch,
  // 且仅当仍是本插件安装的包装时恢复,避免覆盖其它插件安装的包装
  ctx.effect(() => {
    globalThis.fetch = wrapped
    return () => {
      if (globalThis.fetch === wrapped) globalThis.fetch = originalFetch
    }
  })
}
