import { createI18n } from 'vue-i18n'

// 中文语言包
const zh = {
  // 通用
  common: {
    add: '添加',
    edit: '编辑',
    delete: '删除',
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    search: '搜索',
    reset: '重置',
    submit: '提交',
    loading: '加载中...',
    success: '成功',
    error: '错误',
    warning: '警告',
    info: '信息',
    yes: '是',
    no: '否',
    actions: '操作',
    status: '状态',
    createTime: '创建时间',
    updateTime: '更新时间',
    selectServer: '选择服务器',
    all: '全部',
    unbound: '未绑定',
    none: '无',
    execute: '执行'
  },

  // 登录页面
  login: {
    title: 'API管理系统',
    subtitle: '请输入您的账户信息',
    username: '用户名',
    password: '密码',
    loginBtn: '登录',
    loginSuccess: '登录成功',
    loginFailed: '登录失败，请重试',
    usernameRequired: '请输入用户名',
    passwordRequired: '请输入密码'
  },

  // 导航菜单
  menu: {
    dashboard: '仪表板',
    servers: '服务器管理',
    parameters: '参数管理',
    tasks: '任务管理',
    logs: '日志查看',
    remoteMonitor: '远程监控',
    users: '用户管理',
    systemSettings: '系统设置',
    profile: '个人资料'
  },

  // 用户菜单
  user: {
    profile: '个人资料',
    settings: '系统设置',
    logout: '退出登录',
    logoutSuccess: '退出登录成功'
  },

  // 面包屑导航
  breadcrumb: {
    home: '首页',
    dashboard: '首页 / 仪表板',
    servers: '系统管理 / 服务器管理',
    parameters: '配置管理 / 参数管理',
    tasks: '任务中心 / 任务管理',
    logs: '系统监控 / 日志查看'
  },

  // 仪表板
  dashboard: {
    title: '仪表板',
    serverCount: '服务器数量',
    totalTasks: '总任务数',
    successTasks: '成功任务',
    failedTasks: '失败任务',
    recentTasks: '最近任务',
    systemStatus: '系统状态',
    apiStatus: 'API服务状态',
    sshStatus: 'SSH连接状态',
    queueStatus: '队列状态',
    online: '正常',
    offline: '异常',
    idle: '空闲',
    busy: '繁忙',
    id: 'ID',
    server: '服务器',
    method: '方法',
    time: '时间'
  },

  // 服务器管理
  servers: {
    title: '服务器管理',
    addServer: '添加服务器',
    editServer: '编辑服务器',
    serverName: '服务器名称',
    host: '主机地址',
    port: '端口',
    username: '用户名',
    password: '密码',
    description: '描述',
    test: '测试',
    terminal: '终端',
    lastTest: '最后测试',
    testConnection: '测试连接',
    connectionSuccess: '连接成功',
    connectionFailed: '连接失败',
    deleteConfirm: '确定要删除这个服务器吗？',
    serverNameRequired: '请输入服务器名称',
    hostRequired: '请输入主机地址',
    portRequired: '请输入端口',
    usernameRequired: '请输入用户名',
    passwordRequired: '请输入密码'
  },

  // 参数管理
  parameters: {
    title: '参数管理',
    addParameter: '添加参数组',
    editParameter: '编辑参数组',
    groupName: '参数组名称',
    method: '执行方法',
    command: '命令',
    groupNameRequired: '请输入参数组名称',
    methodRequired: '请输入执行方法',
    commandRequired: '请输入命令',
    deleteConfirm: '确定要删除这个参数组吗？',
    apiEndpoint: 'API端点',
    dynamicParams: '动态参数',
    params: '个参数',
    selectTargetServer: '选择要执行命令的目标服务器'
  },

  // 任务管理
  tasks: {
    title: '任务管理',
    executeTask: '执行任务',
    selectServer: '选择服务器',
    selectMethod: '选择方法',
    progress: '进度',
    result: '结果',
    stopTask: '停止任务',
    taskDetails: '任务详情',
    serverRequired: '请选择服务器',
    methodRequired: '请选择方法',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    pending: '等待中'
  },

  // 日志查看
  logs: {
    title: '日志查看',
    logLevel: '日志级别',
    service: '服务',
    startTime: '开始时间',
    endTime: '结束时间',
    keyword: '关键词',
    clearLogs: '清空日志',
    downloadLogs: '下载日志',
    refresh: '刷新',
    logContent: '日志内容',
    logDetails: '日志详情',
    clearConfirm: '确定要清空所有日志吗？',
    error: '错误',
    warn: '警告',
    debug: '调试'
  },

  // 远程监控
  remoteMonitor: {
    title: '远程监控',
    serverStatus: '服务器状态',
    systemInfo: '系统信息',
    cpuUsage: 'CPU使用率',
    memoryUsage: '内存使用率',
    diskUsage: '磁盘使用率',
    networkStats: '网络统计',
    loadAverage: '系统负载',
    uptime: '运行时间',
    lastUpdated: '最后更新',
    refreshData: '刷新数据',
    autoRefresh: '自动刷新',
    refreshInterval: '刷新间隔',
    connectionError: '连接错误',
    noData: '暂无数据'
  },

  // 本地监控
  localMonitor: {
    title: '本地服务器监控',
    serverLabel: '服务器',
    uptimeLabel: '运行时间',
    statusLabel: '状态',
    onlineStatus: '在线',
    offlineStatus: '离线',
    cpuUsage: 'CPU 使用率',
    memoryUsage: '内存使用',
    diskUsage: '磁盘使用',
    systemLoad: '系统负载',
    cores: '核心',
    autoRefresh: '自动刷新',
    refresh: '刷新',
    minute1: '1分钟',
    minutes5: '5分钟',
    minutes15: '15分钟',
    lastUpdate: '最后更新',
    nodeVersion: 'Node.js'
  },

  // 用户管理
  users: {
    title: '用户管理',
    addUser: '添加用户',
    editUser: '编辑用户',
    username: '用户名',
    email: '邮箱',
    nickname: '昵称',
    role: '角色',
    permissions: '权限',
    status: '状态',
    lastLogin: '最后登录',
    createUser: '创建用户',
    updateUser: '更新用户',
    deleteUser: '删除用户',
    resetPassword: '重置密码',
    active: '激活',
    inactive: '禁用',
    admin: '管理员',
    user: '普通用户',
    selectPermissions: '选择权限',
    usernameRequired: '请输入用户名',
    emailFormat: '请输入正确的邮箱格式',
    passwordRequired: '请输入密码',
    confirmPassword: '确认密码',
    passwordMismatch: '两次输入的密码不一致',
    deleteConfirm: '确定要删除这个用户吗？',
    userExists: '用户名已存在'
  },

  // 系统设置
  systemSettings: {
    title: '系统设置',
    generalSettings: '通用设置',
    systemTitle: '系统标题',
    systemDescription: '系统描述',
    appearance: '外观设置',
    theme: '主题',
    language: '语言',
    security: '安全设置',
    sessionTimeout: '会话超时',
    passwordPolicy: '密码策略',
    logging: '日志设置',
    logLevel: '日志级别',
    logRetention: '日志保留天数',
    maintenance: '维护设置',
    backupSettings: '备份设置',
    systemMaintenance: '系统维护',
    saveSettings: '保存设置',
    resetDefaults: '恢复默认',
    settingsSaved: '设置已保存',
    changePassword: '修改密码',
    currentPassword: '当前密码',
    newPassword: '新密码',
    confirmNewPassword: '确认新密码',
    passwordChanged: '密码修改成功'
  },

  // 个人资料
  profile: {
    title: '个人资料',
    basicInfo: '基本信息',
    avatar: '头像',
    uploadAvatar: '上传头像',
    changeAvatar: '更换头像',
    personalSettings: '个人设置',
    accountSecurity: '账户安全',
    updateProfile: '更新资料',
    profileUpdated: '资料更新成功',
    avatarUrl: '头像URL',
    enterAvatarUrl: '请输入头像URL地址'
  },

  // 语言设置
  locale: {
    switchLanguage: '切换语言',
    chinese: '简体中文',
    english: 'English',
    languageChanged: '语言切换成功'
  }
}

// 英文语言包
const en = {
  // Common
  common: {
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    search: 'Search',
    reset: 'Reset',
    submit: 'Submit',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    yes: 'Yes',
    no: 'No',
    actions: 'Actions',
    status: 'Status',
    createTime: 'Create Time',
    updateTime: 'Update Time',
    selectServer: 'Select Server',
    all: 'All',
    unbound: 'Unbound',
    none: 'None',
    execute: 'Execute'
  },

  // Login Page
  login: {
    title: 'API Management System',
    subtitle: 'Please enter your account information',
    username: 'Username',
    password: 'Password',
    loginBtn: 'Login',
    loginSuccess: 'Login successful',
    loginFailed: 'Login failed, please try again',
    usernameRequired: 'Please enter username',
    passwordRequired: 'Please enter password'
  },

  // Navigation Menu
  menu: {
    dashboard: 'Dashboard',
    servers: 'Server Management',
    parameters: 'Parameter Management',
    tasks: 'Task Management',
    logs: 'Log Viewer',
    remoteMonitor: 'Remote Monitor',
    users: 'User Management',
    systemSettings: 'System Settings',
    profile: 'Profile'
  },

  // User Menu
  user: {
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    logoutSuccess: 'Logout successful'
  },

  // Breadcrumb
  breadcrumb: {
    home: 'Home',
    dashboard: 'Home / Dashboard',
    servers: 'System / Server Management',
    parameters: 'Config / Parameter Management',
    tasks: 'Task Center / Task Management',
    logs: 'Monitor / Log Viewer'
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    serverCount: 'Server Count',
    totalTasks: 'Total Tasks',
    successTasks: 'Success Tasks',
    failedTasks: 'Failed Tasks',
    recentTasks: 'Recent Tasks',
    systemStatus: 'System Status',
    apiStatus: 'API Service Status',
    sshStatus: 'SSH Connection Status',
    queueStatus: 'Queue Status',
    online: 'Online',
    offline: 'Offline',
    idle: 'Idle',
    busy: 'Busy',
    id: 'ID',
    server: 'Server',
    method: 'Method',
    time: 'Time'
  },

  // Server Management
  servers: {
    title: 'Server Management',
    addServer: 'Add Server',
    editServer: 'Edit Server',
    serverName: 'Server Name',
    host: 'Host Address',
    port: 'Port',
    username: 'Username',
    password: 'Password',
    description: 'Description',
    test: 'Test',
    terminal: 'Terminal',
    lastTest: 'Last Test',
    testConnection: 'Test Connection',
    connectionSuccess: 'Connection successful',
    connectionFailed: 'Connection failed',
    deleteConfirm: 'Are you sure you want to delete this server?',
    serverNameRequired: 'Please enter server name',
    hostRequired: 'Please enter host address',
    portRequired: 'Please enter port',
    usernameRequired: 'Please enter username',
    passwordRequired: 'Please enter password'
  },

  // Parameter Management
  parameters: {
    title: 'Parameter Management',
    addParameter: 'Add Parameter Group',
    editParameter: 'Edit Parameter Group',
    groupName: 'Group Name',
    method: 'Method',
    command: 'Command',
    groupNameRequired: 'Please enter group name',
    methodRequired: 'Please enter method',
    commandRequired: 'Please enter command',
    deleteConfirm: 'Are you sure you want to delete this parameter group?',
    apiEndpoint: 'API Endpoint',
    dynamicParams: 'Dynamic Parameters',
    params: 'parameters',
    selectTargetServer: 'Select target server to execute commands'
  },

  // Task Management
  tasks: {
    title: 'Task Management',
    executeTask: 'Execute Task',
    selectServer: 'Select Server',
    selectMethod: 'Select Method',
    progress: 'Progress',
    result: 'Result',
    stopTask: 'Stop Task',
    taskDetails: 'Task Details',
    serverRequired: 'Please select server',
    methodRequired: 'Please select method',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    pending: 'Pending'
  },

  // Log Viewer
  logs: {
    title: 'Log Viewer',
    logLevel: 'Log Level',
    service: 'Service',
    startTime: 'Start Time',
    endTime: 'End Time',
    keyword: 'Keyword',
    clearLogs: 'Clear Logs',
    downloadLogs: 'Download Logs',
    refresh: 'Refresh',
    logContent: 'Log Content',
    logDetails: 'Log Details',
    clearConfirm: 'Are you sure you want to clear all logs?',
    error: 'Error',
    warn: 'Warning',
    debug: 'Debug'
  },

  // Remote Monitor
  remoteMonitor: {
    title: 'Remote Monitor',
    serverStatus: 'Server Status',
    systemInfo: 'System Information',
    cpuUsage: 'CPU Usage',
    memoryUsage: 'Memory Usage',
    diskUsage: 'Disk Usage',
    networkStats: 'Network Statistics',
    loadAverage: 'Load Average',
    uptime: 'Uptime',
    lastUpdated: 'Last Updated',
    refreshData: 'Refresh Data',
    autoRefresh: 'Auto Refresh',
    refreshInterval: 'Refresh Interval',
    connectionError: 'Connection Error',
    noData: 'No Data Available'
  },

  // Local Monitor
  localMonitor: {
    title: 'Local Server Monitor',
    serverLabel: 'Server',
    uptimeLabel: 'Uptime',
    statusLabel: 'Status',
    onlineStatus: 'Online',
    offlineStatus: 'Offline',
    cpuUsage: 'CPU Usage',
    memoryUsage: 'Memory Usage',
    diskUsage: 'Disk Usage',
    systemLoad: 'System Load',
    cores: 'Cores',
    autoRefresh: 'Auto Refresh',
    refresh: 'Refresh',
    minute1: '1 Minute',
    minutes5: '5 Minutes',
    minutes15: '15 Minutes',
    lastUpdate: 'Last Updated',
    nodeVersion: 'Node.js'
  },

  // User Management
  users: {
    title: 'User Management',
    addUser: 'Add User',
    editUser: 'Edit User',
    username: 'Username',
    email: 'Email',
    nickname: 'Nickname',
    role: 'Role',
    permissions: 'Permissions',
    status: 'Status',
    lastLogin: 'Last Login',
    createUser: 'Create User',
    updateUser: 'Update User',
    deleteUser: 'Delete User',
    resetPassword: 'Reset Password',
    active: 'Active',
    inactive: 'Inactive',
    admin: 'Administrator',
    user: 'User',
    selectPermissions: 'Select Permissions',
    usernameRequired: 'Please enter username',
    emailFormat: 'Please enter valid email format',
    passwordRequired: 'Please enter password',
    confirmPassword: 'Confirm Password',
    passwordMismatch: 'Passwords do not match',
    deleteConfirm: 'Are you sure you want to delete this user?',
    userExists: 'Username already exists'
  },

  // System Settings
  systemSettings: {
    title: 'System Settings',
    generalSettings: 'General Settings',
    systemTitle: 'System Title',
    systemDescription: 'System Description',
    appearance: 'Appearance',
    theme: 'Theme',
    language: 'Language',
    security: 'Security',
    sessionTimeout: 'Session Timeout',
    passwordPolicy: 'Password Policy',
    logging: 'Logging',
    logLevel: 'Log Level',
    logRetention: 'Log Retention Days',
    maintenance: 'Maintenance',
    backupSettings: 'Backup Settings',
    systemMaintenance: 'System Maintenance',
    saveSettings: 'Save Settings',
    resetDefaults: 'Reset to Defaults',
    settingsSaved: 'Settings saved successfully',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    passwordChanged: 'Password changed successfully'
  },

  // Profile
  profile: {
    title: 'Profile',
    basicInfo: 'Basic Information',
    avatar: 'Avatar',
    uploadAvatar: 'Upload Avatar',
    changeAvatar: 'Change Avatar',
    personalSettings: 'Personal Settings',
    accountSecurity: 'Account Security',
    updateProfile: 'Update Profile',
    profileUpdated: 'Profile updated successfully',
    avatarUrl: 'Avatar URL',
    enterAvatarUrl: 'Please enter avatar URL'
  },

  // Language Settings
  locale: {
    switchLanguage: 'Switch Language',
    chinese: '简体中文',
    english: 'English',
    languageChanged: 'Language changed successfully'
  }
}

// 获取浏览器语言，支持自动检测
const getInitialLocale = () => {
  // 首先检查本地存储
  const saved = localStorage.getItem('locale')
  if (saved && ['zh', 'en'].includes(saved)) {
    return saved
  }
  
  // 检查浏览器语言设置
  const browserLanguage = navigator.language || navigator.userLanguage
  if (browserLanguage) {
    if (browserLanguage.startsWith('zh')) {
      return 'zh'
    }
    if (browserLanguage.startsWith('en')) {
      return 'en'
    }
  }
  
  // 默认中文
  return 'zh'
}

// 语言切换函数
export const changeLocale = (locale) => {
  if (['zh', 'en'].includes(locale)) {
    i18n.global.locale.value = locale
    localStorage.setItem('locale', locale)
    // 更新HTML lang属性
    document.documentElement.lang = locale
  }
}

// 创建i18n实例
const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'zh',
  messages: {
    zh,
    en
  }
})

export default i18n