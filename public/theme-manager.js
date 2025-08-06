// 简化的主题管理器 - 仅保持默认浅色主题
class ThemeManager {
  constructor() {
    this.init()
  }

  init() {
    // 确保使用默认的浅色主题
    this.applyTheme('light')
  }

  applyTheme(theme) {
    console.log('ThemeManager: 应用主题', theme)
    
    // 移除所有主题类和属性
    document.documentElement.classList.remove('dark-mode', 'light-mode')
    document.body.classList.remove('dark-mode', 'light-mode')
    document.documentElement.removeAttribute('data-theme')
    
    // 只支持浅色主题
    document.documentElement.setAttribute('data-theme', 'light')
    document.documentElement.classList.add('light-mode')
    document.body.classList.add('light-mode')
    
    localStorage.setItem('theme', 'light')
  }
}

// 初始化主题管理器
window.themeManager = new ThemeManager()

// 导出全局主题切换函数（保持向后兼容）
window.switchTheme = (theme) => {
  // 忽略主题切换请求，始终保持浅色主题
  window.themeManager.applyTheme('light')
}