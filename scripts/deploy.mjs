/**
 * 一键部署脚本:把插件构建产物复制到 dsh 的外部插件闭包目录。
 *
 * 注意:插件目录内不能带 node_modules,否则 Node 会沿真实路径解析到
 * 项目自己的依赖(双实例),导致插件失效。这里只复制 lib / package.json /
 * cordis.patch.yml 三样产物。
 */

import { existsSync, mkdirSync, rmSync, copyFileSync, cpSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(import.meta.url), '..', '..')
const dshHome = process.env.DSH_HOME ?? join(homedir(), '.dsh')
const targetDir = join(dshHome, 'profiles', 'node_modules', 'dsh-ua')

const sourceLib = join(projectRoot, 'lib')
const files = ['package.json', 'cordis.patch.yml']

for (const name of ['lib', ...files]) {
  const src = join(projectRoot, name)
  if (!existsSync(src)) throw new Error(`缺少 ${name}: 请先运行 npm run build`)
}

rmSync(targetDir, { recursive: true, force: true })
mkdirSync(targetDir, { recursive: true })
cpSync(sourceLib, join(targetDir, 'lib'), { recursive: true })
for (const name of files) copyFileSync(join(projectRoot, name), join(targetDir, name))

const manifest = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf8'))
console.log(`已部署 dsh-ua@${manifest.version} 到 ${targetDir}`)
console.log('目录内容:', readFileSync(join(targetDir, 'package.json'), 'utf8').includes('"bundle"') ? '(含 dsh.bundle 声明)' : '(缺少 bundle 声明!)')
