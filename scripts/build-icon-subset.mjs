/**
 * 生成 EmojiIcon 用到的图标子集
 *
 * 背景：EmojiIcon 渲染的是 <Icon icon="openmoji:xxx">，@iconify/vue 默认会向
 * api.iconify.design 按需拉取图标数据——国内网络下经常失败，表现为图标空白，
 * 而且首屏会多出几十个外部请求。
 *
 * 这个脚本把"代码里实际用到的图标"从 @iconify-json/openmoji 里抽出来，生成
 * src/assets/openmoji-subset.json；应用启动时用 addCollection() 一次性注册，
 * 图标就完全本地化、零网络请求。
 *
 * 用法：在新增/删除 EmojiIcon 之后执行
 *   npm run icons:build
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(root, 'src')
const OUT = path.join(SRC, 'assets', 'openmoji-subset.json')

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, acc)
    else if (/\.(vue|js)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

// 只认 <EmojiIcon ... name="xxx">，避免把 <Transition name="fade"> 也算进去
const used = new Set()
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, 'utf8')
  for (const m of text.matchAll(/<EmojiIcon[^>]*?name="([a-z0-9-]+)"/g)) used.add(m[1])
}

const collection = JSON.parse(
  fs.readFileSync(path.join(root, 'node_modules', '@iconify-json', 'openmoji', 'icons.json'), 'utf8')
)

const icons = {}
const aliases = {}
const missing = []

for (const name of [...used].sort()) {
  if (collection.icons[name]) {
    icons[name] = collection.icons[name]
    continue
  }
  const alias = collection.aliases?.[name]
  if (alias) {
    aliases[name] = alias
    if (alias.parent && collection.icons[alias.parent]) icons[alias.parent] = collection.icons[alias.parent]
    continue
  }
  missing.push(name)
}

if (missing.length) {
  console.error('以下图标在 openmoji 集合中不存在，请改名：' + missing.join(', '))
  process.exitCode = 1
}

const subset = { prefix: 'openmoji' }
if (collection.width) subset.width = collection.width
if (collection.height) subset.height = collection.height
subset.icons = icons
if (Object.keys(aliases).length) subset.aliases = aliases

// 稳定输出：图标按名字排序，方便 review 与 diff
fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      prefix: subset.prefix,
      ...(subset.width ? { width: subset.width } : {}),
      ...(subset.height ? { height: subset.height } : {}),
      icons: Object.fromEntries(Object.keys(subset.icons).sort().map((k) => [k, subset.icons[k]])),
      ...(subset.aliases ? { aliases: subset.aliases } : {})
    },
    null,
    2
  ) + '\n',
  'utf8'
)

const size = fs.statSync(OUT).size
console.log(`图标子集已生成：${Object.keys(icons).length} 个图标，${(size / 1024).toFixed(1)} KB → ${path.relative(root, OUT)}`)
