import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../store/user'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('../components/Layout.vue'),
    meta: { requiresAuth: true },
    redirect: '/dashboard',
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '仪表板' }
      },
      {
        path: '/servers',
        name: 'Servers',
        component: () => import('../views/Servers.vue'),
        meta: { title: '服务器管理' }
      },
      {
        path: '/parameters',
        name: 'Parameters',
        component: () => import('../views/Parameters.vue'),
        meta: { title: '参数管理' }
      },
      {
        path: '/tasks',
        name: 'Tasks',
        component: () => import('../views/Tasks.vue'),
        meta: { title: '任务管理' }
      },
      {
        path: '/remote-monitor',
        name: 'RemoteMonitor',
        component: () => import('../views/RemoteMonitor.vue'),
        meta: { title: '远程服务器监控' }
      },
      {
        path: '/logs',
        name: 'Logs',
        component: () => import('../views/Logs.vue'),
        meta: { title: '日志查看' }
      },
      {
        path: '/system-settings',
        name: 'SystemSettings',
        component: () => import('../views/SystemSettings.vue'),
        meta: { title: '系统设置' }
      },
      {
        path: '/security-settings',
        name: 'SecuritySettings',
        component: () => import('../views/SecuritySettings.vue'),
        meta: { title: '安全设置', requiresAdmin: true }
      },
      {
        path: '/profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue'),
        meta: { title: '个人资料' }
      },
      {
        path: '/users',
        name: 'Users',
        component: () => import('../views/Users.vue'),
        meta: { title: '用户管理', requiresAdmin: true }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next('/')
  } else if (to.meta.requiresAdmin && userStore.user.role !== 'admin') {
    next('/') // 非管理员用户访问管理员页面时重定向到首页
  } else {
    next()
  }
})

export default router