import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

// 动态获取baseURL的函数
const getBaseURL = async () => {
  try {
    // 先尝试从本地获取配置
    const response = await axios.get('/api/config/domain')
    if (response.data.success && response.data.data.enabled) {
      return response.data.data.url
    }
  } catch (error) {
    // 如果获取配置失败，使用默认配置
    console.log('使用默认baseURL配置')
  }
  return '' // 默认为空，使用相对路径
}

// 创建axios实例
const api = axios.create({
  baseURL: '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 初始化baseURL
let baseURLInitialized = false
const initializeBaseURL = async () => {
  if (!baseURLInitialized) {
    const baseURL = await getBaseURL()
    api.defaults.baseURL = baseURL
    baseURLInitialized = true
    console.log('API baseURL 设置为:', baseURL || '相对路径')
  }
}

// 请求拦截器
api.interceptors.request.use(
  async (config) => {
    // 确保baseURL已初始化
    await initializeBaseURL()
    
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('发送请求:', config.method.toUpperCase(), config.url, '使用token:', token.substring(0, 20) + '...')
    } else {
      console.log('发送请求:', config.method.toUpperCase(), config.url, '无token')
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('收到响应:', response.config.method.toUpperCase(), response.config.url, '状态:', response.status)
    return response
  },
  (error) => {
    console.error('请求失败:', error.config?.method?.toUpperCase(), error.config?.url, '状态:', error.response?.status, '错误:', error.response?.data)
    if (error.response) {
      switch (error.response.status) {
        case 401:
          ElMessage.error('登录已过期，请重新登录')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          router.push('/login')
          break
        case 403:
          ElMessage.error('没有权限访问此资源')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(error.response.data?.message || '请求失败')
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接')
    } else {
      ElMessage.error('请求配置错误')
    }
    return Promise.reject(error)
  }
)

export default api