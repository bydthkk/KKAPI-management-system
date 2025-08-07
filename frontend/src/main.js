import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import App from './App.vue'
import './assets/styles/main.css'
import './assets/styles/global.css'
import './styles/mobile.css'
import i18n from './i18n'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
app.use(pinia)

// 初始化用户状态 - 在路由挂载前从localStorage恢复状态
import { useUserStore } from './store/user'
const userStore = useUserStore()
userStore.initAuth()

app.use(router)
app.use(ElementPlus)
app.use(i18n)

app.mount('#app')