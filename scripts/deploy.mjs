/**
 * 一键部署脚本:构建后把插件复制到 dsh 的外部插件闭包目录,
 * 并把它注册进 web profile 的 dsh.profile.bundles(幂等,不重复添加)。
 *
 * 注意:插件目录内不能带 node_modules,否则 Node 会沿真实路径解析到
 * 项目自己的依赖(双实例),导致插件失效。这里只复制 lib / package.json /
 * cordis.patch.yml 三样产物。
 */

import { existsSync, mkdirSync, rmSync, copyFileSync, cpSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(import.meta.url), '..', '..')
// 可用 DSH_HOME 环境变量覆盖,默认 ~/.dsh
const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh')
const targetDir = join(dshHome, 'profiles', 'node_modules', 'dsh-ua')
// 当前只支持 web profile;其他 profile 需要自行在 bundle 列表中加入 dsh-ua
const profileDir = join(dshHome, 'profiles', 'web')

const sourceLib = join(projectRoot, 'lib')
const files = ['package.json', 'cordis.patch.yml']

for (const name of ['lib', ...files]) {
  const src = join(projectRoot, name)
  if (!existsSync(src)) throw new Error(`缺少 ${name}: 请先运行 npm run build`)
}

// 1. 复制产物到闭包目录
rmSync(targetDir, { recursive: true, force: true })
mkdirSync(targetDir, { recursive: true })
cpSync(sourceLib, join(targetDir, 'lib'), { recursive: true })
for (const name of files) copyFileSync(join(projectRoot, name), join(targetDir, name))

// 2. 注册 bundle:把 dsh-ua 追加进 profile 的 dsh.profile.bundles(若缺失)
const manifestPath = join(profileDir, 'package.json')
if (!existsSync(manifestPath)) {
  throw new Error(`未找到 web profile 清单 ${manifestPath}: 请先至少运行一次 dsh web`)
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const bundles = manifest.dsh?.profile?.bundles
if (!Array.isArray(bundles)) {
  throw new Error(`web profile 清单 ${manifestPath} 缺少 dsh.profile.bundles 数组`)
}
if (!bundles.includes('dsh-ua')) {
  manifest.dsh.profile.bundles = [...bundles, 'dsh-ua']
  writeFileSync(manifestPath, JSON.stringify(manifest, undefined, 2) + '\n')
  console.log(`已注册 bundle:dsh-ua 加入 ${manifestPath}`)
} else {
  console.log('bundle 已注册,跳过')
}

const deployed = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf8'))
console.log(`已部署 dsh-ua@${deployed.version} 到 ${targetDir}`)
console.log('重启 dsh(npx @deepseek-ai/dsh web)后插件生效')
