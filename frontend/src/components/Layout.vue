<template>
  <div class="admin-container">
    <el-container>
      <!-- Mobile overlay -->
      <div 
        v-if="isMobile && sidebarCollapsed === false" 
        class="mobile-overlay" 
        @click="toggleSidebar"
      ></div>
      
      <el-aside 
        :width="sidebarCollapsed ? '0px' : '250px'" 
        :class="['sidebar', { 'sidebar-collapsed': sidebarCollapsed, 'sidebar-mobile': isMobile }]"
      >
        <div class="logo" v-show="!sidebarCollapsed">
          <div class="logo-icon">
            <el-icon size="28"><Monitor /></el-icon>
          </div>
          <h2 class="logo-title">{{ backendTitle || t('login.title') }}</h2>
        </div>
        <el-menu
          :default-active="$route.path"
          router
          background-color="transparent"
          text-color="#cbd5e1"
          active-text-color="#ffffff"
          class="sidebar-menu"
          v-show="!sidebarCollapsed"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/dashboard" v-if="hasPermission('dashboard')">
            <el-icon><House /></el-icon>
            <span>{{ t('menu.dashboard') }}</span>
          </el-menu-item>
          <el-menu-item index="/servers" v-if="hasPermission('servers')">
            <el-icon><Monitor /></el-icon>
            <span>{{ t('menu.servers') }}</span>
          </el-menu-item>
          <el-menu-item index="/parameters" v-if="hasPermission('parameters')">
            <el-icon><Setting /></el-icon>
            <span>{{ t('menu.parameters') }}</span>
          </el-menu-item>
          <el-menu-item index="/tasks" v-if="hasPermission('tasks')">
            <el-icon><List /></el-icon>
            <span>{{ t('menu.tasks') }}</span>
          </el-menu-item>
          <el-menu-item index="/remote-monitor" v-if="hasPermission('remote-monitor')">
            <el-icon><Monitor /></el-icon>
            <span>{{ t('menu.remoteMonitor') }}</span>
          </el-menu-item>
          <el-menu-item index="/logs" v-if="hasPermission('logs')">
            <el-icon><Document /></el-icon>
            <span>{{ t('menu.logs') }}</span>
          </el-menu-item>
          <el-menu-item index="/users" v-if="userStore.user.role === 'admin'">
            <el-icon><UserFilled /></el-icon>
            <span>{{ t('menu.users') }}</span>
          </el-menu-item>
          <el-menu-item index="/security-settings" v-if="userStore.user.role === 'admin'">
            <el-icon><Lock /></el-icon>
            <span>安全设置</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <el-container>
        <el-header class="main-header">
          <div class="header-content">
            <div class="header-left">
              <!-- Mobile menu toggle button -->
              <el-button 
                v-if="isMobile" 
                @click="toggleSidebar" 
                :icon="sidebarCollapsed ? Menu : Close"
                class="mobile-menu-toggle"
                size="large"
                text
              ></el-button>
              
              <div class="header-title">
                <h3>{{ getPageTitle() }}</h3>
                <div class="breadcrumb" v-show="!isMobile">
                  <el-icon><Location /></el-icon>
                  <span>{{ getBreadcrumb() }}</span>
                </div>
              </div>
            </div>
            <div class="header-right">
              <!-- 语言切换组件 -->
              <LanguageSwitcher />

              <div class="user-avatar">
                <el-avatar 
                  size="32" 
                  :src="userStore.user.avatar"
                  background-color="#6366f1"
                >
                  <template v-if="!userStore.user.avatar">
                    <el-icon><User /></el-icon>
                  </template>
                </el-avatar>
              </div>
              <el-dropdown @command="handleCommand" class="user-dropdown">
                <span class="el-dropdown-link">
                  {{ userStore.user.nickname || userStore.user.username }}
                  <el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="profile">
                      <el-icon><User /></el-icon>
                      {{ t('user.profile') }}
                    </el-dropdown-item>
                    <el-dropdown-item command="settings">
                      <el-icon><Setting /></el-icon>
                      {{ t('user.settings') }}
                    </el-dropdown-item>
                    <el-dropdown-item divided command="logout">
                      <el-icon><SwitchButton /></el-icon>
                      {{ t('user.logout') }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </el-header>

        <el-main class="main-content">
          <div class="content-wrapper">
            <router-view />
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { House, Monitor, Setting, List, Document, ArrowDown, Location, User, SwitchButton, UserFilled, Lock, Menu, Close } from '@element-plus/icons-vue'
import api from '../utils/axios'
import LanguageSwitcher from './LanguageSwitcher.vue'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()

const backendTitle = ref('')

// Mobile responsiveness
const isMobile = ref(false)
const sidebarCollapsed = ref(false)

// Check if device is mobile
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (isMobile.value) {
    sidebarCollapsed.value = true
  } else {
    sidebarCollapsed.value = false
  }
}

// Toggle sidebar
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

// Handle menu select (close sidebar on mobile after selection)
const handleMenuSelect = () => {
  if (isMobile.value) {
    sidebarCollapsed.value = true
  }
}

// 获取后台标题设置
const fetchBackendTitle = async () => {
  try {
    const response = await api.get('/api/system-settings/backend_title')
    if (response.data.success) {
      backendTitle.value = response.data.data.value
    }
  } catch (error) {
    // 如果获取失败，使用默认值
    console.warn('获取后台标题失败，使用默认值')
    backendTitle.value = t('login.title')
  }
}

// 处理用户菜单命令
const handleCommand = async (command) => {
  if (command === 'logout') {
    await userStore.logout()
    ElMessage.success(t('user.logoutSuccess'))
    router.push('/login')
  } else if (command === 'profile') {
    router.push('/profile')
  } else if (command === 'settings') {
    router.push('/system-settings')
  }
}

// 已移除旧的语言切换逻辑，现在使用LanguageSwitcher组件

const getPageTitle = () => {
  const route = router.currentRoute.value
  const titleMap = {
    '/dashboard': 'menu.dashboard',
    '/servers': 'menu.servers',
    '/parameters': 'menu.parameters',
    '/tasks': 'menu.tasks',
    '/remote-monitor': 'menu.remoteMonitor',
    '/logs': 'menu.logs',
    '/system-settings': 'menu.systemSettings',
    '/profile': 'menu.profile',
    '/users': 'menu.users'
  }
  const titleKey = titleMap[route.path] || 'menu.dashboard'
  return t(titleKey)
}

const getBreadcrumb = () => {
  const route = router.currentRoute.value
  const breadcrumbMap = {
    '/dashboard': 'breadcrumb.dashboard',
    '/servers': 'breadcrumb.servers',
    '/parameters': 'breadcrumb.parameters',
    '/tasks': 'breadcrumb.tasks',
    '/remote-monitor': 'breadcrumb.home',  // 使用 home 作为默认值
    '/logs': 'breadcrumb.logs',
    '/system-settings': 'breadcrumb.home',
    '/profile': 'breadcrumb.home',  
    '/users': 'breadcrumb.home'
  }
  const breadcrumbKey = breadcrumbMap[route.path] || 'breadcrumb.dashboard'
  return t(breadcrumbKey)
}

// 权限检查函数
const hasPermission = (permission) => {
  // 管理员拥有所有权限
  if (userStore.user.role === 'admin') {
    return true
  }
  
  // 检查用户权限
  if (!userStore.user.permissions || !Array.isArray(userStore.user.permissions)) {
    return false
  }
  
  return userStore.user.permissions.includes(permission)
}

// 组件挂载时获取后台标题和初始化移动端检测
onMounted(() => {
  fetchBackendTitle()
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

// 组件卸载时移除事件监听器
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.admin-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #f8fafc;
}

.el-container {
  height: 100%;
}

.sidebar {
  background: #1e293b;
  height: 100vh;
  overflow-y: auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  border-right: 1px solid #334155;
  transition: width 0.3s ease, transform 0.3s ease;
}

.sidebar-collapsed {
  width: 0 !important;
  min-width: 0 !important;
  overflow: hidden;
}

.sidebar-mobile {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 1000;
  transform: translateX(-100%);
}

.sidebar-mobile:not(.sidebar-collapsed) {
  transform: translateX(0);
}

.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.logo {
  background: #0f172a;
  color: white;
  text-align: center;
  padding: 24px 20px;
  border-bottom: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  background: #6366f1;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.logo h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: white;
}

.logo-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-menu {
  border-right: none;
  height: calc(100vh - 96px);
  overflow-y: auto;
}

.sidebar-menu .el-menu-item {
  margin: 6px 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
  color: #cbd5e1 !important;
}

.sidebar-menu .el-menu-item:hover {
  background-color: #334155 !important;
  color: white !important;
  transform: translateX(2px);
}

.sidebar-menu .el-menu-item.is-active {
  background: #6366f1 !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.main-header {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  padding: 0 32px;
  height: 64px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-menu-toggle {
  color: #475569 !important;
  margin-right: 12px;
  padding: 8px !important;
  min-height: 40px;
  min-width: 40px;
}

.header-title {
  flex: 1;
}

.header-left h3 {
  margin: 0 0 4px 0;
  font-size: 20px;
  font-weight: 600;
  color: #0f172a;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #64748b;
  font-size: 13px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.language-switcher {
  display: flex;
  align-items: center;
}

.language-btn {
  color: #475569 !important;
  font-size: 14px;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.language-btn:hover {
  color: #6366f1 !important;
  background-color: rgba(99, 102, 241, 0.1) !important;
}

.language-btn .el-icon {
  margin-right: 4px;
}

:deep(.el-dropdown-menu__item.is-active) {
  color: #6366f1;
  background-color: rgba(99, 102, 241, 0.1);
}

.user-avatar {
  display: flex;
  align-items: center;
}

.user-dropdown .el-dropdown-link {
  color: #475569;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: color 0.3s ease;
}

.user-dropdown .el-dropdown-link:hover {
  color: #6366f1;
}

.main-content {
  background: transparent;
  height: calc(100vh - 64px);
  overflow-y: auto;
  padding: 0;
}

.content-wrapper {
  padding: 24px;
  min-height: calc(100vh - 64px);
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .admin-container {
    overflow-x: hidden;
  }
  
  .main-header {
    padding: 0 16px;
    height: 56px;
  }
  
  .header-left {
    display: flex;
    align-items: center;
    flex: 1;
  }
  
  .header-left h3 {
    font-size: 16px;
    margin: 0;
  }
  
  .header-right {
    gap: 8px;
  }
  
  .header-right > * {
    font-size: 14px;
  }
  
  .user-avatar {
    display: none;
  }
  
  .user-dropdown .el-dropdown-link {
    font-size: 13px;
  }
  
  .main-content {
    height: calc(100vh - 56px);
  }
  
  .content-wrapper {
    padding: 16px;
    min-height: calc(100vh - 56px);
  }
  
  .sidebar {
    width: 280px !important;
  }
  
  .logo {
    padding: 16px;
  }
  
  .logo h2 {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .header-left h3 {
    font-size: 14px;
  }
  
  .user-dropdown .el-dropdown-link {
    font-size: 12px;
  }
  
  .content-wrapper {
    padding: 12px;
  }
  
  .sidebar {
    width: 260px !important;
  }
  
  .logo {
    padding: 12px;
  }
  
  .logo h2 {
    font-size: 14px;
  }
}
</style>