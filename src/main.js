import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// ===== Element Plus 按需引入 =====
// 全站只用到 7 个组件 + v-loading 指令 + 两个消息 API：
//   el-table / el-table-column / el-button / el-dialog / el-switch / el-select / el-option
//
// 注意这里用的是**深路径**（element-plus/es/components/xxx/index）而不是
// `import { ElTable } from 'element-plus'`：根入口会连带引入 installer（全部组件的数组），
// 导致 tree-shaking 完全失效——实测无论怎么按需注册，vendor-ui 都稳定在 900KB。
// 换成深路径后只剩实际用到的组件及其依赖。
//
// 新增 Element Plus 组件时：在这里补一行深路径 import + 一行 app.component。
import { ElButton } from 'element-plus/es/components/button/index'
import { ElDialog } from 'element-plus/es/components/dialog/index'
import { ElLoading } from 'element-plus/es/components/loading/index'
import { ElOption, ElSelect } from 'element-plus/es/components/select/index'
import { ElSwitch } from 'element-plus/es/components/switch/index'
import { ElTable, ElTableColumn } from 'element-plus/es/components/table/index'

// 样式保留完整主题包：按组件拆 CSS 容易漏掉表格/弹窗/选择器之间的依赖样式，
// 视觉回归风险高于收益（gzip 后约 47KB，且文件名带 hash 可长期缓存）。
import 'element-plus/dist/index.css'

import './assets/main.css'
import './assets/theme.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 显式按名字注册，避免依赖各组件内部 name 字段（Vue 会把 <el-table> 解析成 ElTable）
app.component('ElTable', ElTable)
app.component('ElTableColumn', ElTableColumn)
app.component('ElButton', ElButton)
app.component('ElDialog', ElDialog)
app.component('ElSwitch', ElSwitch)
app.component('ElSelect', ElSelect)
app.component('ElOption', ElOption)
// v-loading 指令（ElLoading 以插件形式安装）
app.use(ElLoading)

app.mount('#app')

// PWA：生产环境注册 Service Worker（应用壳缓存 + 离线可用）
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service Worker 注册失败：', err)
    })
  })
}
