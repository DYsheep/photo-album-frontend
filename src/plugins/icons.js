/**
 * 图标本地化
 *
 * 把构建时生成的 openmoji 子集注册进 @iconify/vue，
 * 图标不再向 api.iconify.design 请求（离线/国内网络下也不会出现空白图标）。
 *
 * 新增图标后需要执行一次 `npm run icons:build` 重新生成子集。
 */
import { addCollection } from '@iconify/vue'
import openmojiSubset from '../assets/openmoji-subset.json'

addCollection(openmojiSubset)
