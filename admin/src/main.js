import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './router/permission' // 路由权限控制
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css' // 暗黑模式样式
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import '@/assets/styles/index.scss'
import { vPermission } from '@/directives/permission'

const app = createApp(App)

// 注册所有 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.directive('permission', vPermission)

// 全局错误处理：捕获组件渲染错误，避免白屏
app.config.errorHandler = (err, instance, info) => {
  console.error('应用错误:', err, '\n来源:', info)
}

app.mount('#app')
