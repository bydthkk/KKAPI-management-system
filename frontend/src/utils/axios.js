import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

// 检测当前访问方式
const isIPAccess = () => {
  const host = window.location.host
  return /^\d+\.\d+\.\d+\.\d+:\d+$/.test(host)
}

// aaPanel常见的路径格式
const aaPathFormats = [
  '', // 直接相对路径
  '/nodeapp_5000', // aaPanel格式1
  '/node_5000', // aaPanel格式2
  '/app_5000', // aaPanel格式3
  '/api-management', // 自定义格式
]

// 获取和保存baseURL的key
const BASE_URL_KEY = 'api_base_url'

class APIClient {
  constructor() {
    this.currentPathIndex = 0
    this.isTesting = false
    this.baseURL = this.getInitialBaseURL()
    
    // 创建axios实例
    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    this.setupInterceptors()
    console.log('=== API客户端初始化 ===')
    console.log('访问模式:', isIPAccess() ? 'IP直连' : '域名访问')
    console.log('初始baseURL:', this.baseURL || '相对路径')
  }
  
  getInitialBaseURL() {
    if (isIPAccess()) {
      console.log('IP访问：使用相对路径')
      return ''
    }
    
    // 域名访问：尝试从localStorage获取工作的路径
    const savedPath = localStorage.getItem(BASE_URL_KEY)
    if (savedPath) {
      console.log('域名访问：使用保存的路径 =>', savedPath)
      this.currentPathIndex = aaPathFormats.indexOf(savedPath)
      if (this.currentPathIndex === -1) {
        this.currentPathIndex = 0
      }
      return savedPath
    }
    
    console.log('域名访问：使用默认路径，准备自动检测')
    this.currentPathIndex = 0
    return aaPathFormats[0]
  }
  
  saveWorkingPath(path) {
    if (!isIPAccess()) {
      localStorage.setItem(BASE_URL_KEY, path)
      console.log('=== 保存工作路径 ===', path || '相对路径')
    }
  }
  
  async tryNextPath() {
    if (this.isTesting || isIPAccess()) {
      return false
    }
    
    if (this.currentPathIndex >= aaPathFormats.length - 1) {
      console.log('所有路径都已尝试完毕')
      return false
    }
    
    this.isTesting = true
    this.currentPathIndex++
    const newPath = aaPathFormats[this.currentPathIndex]
    
    console.log(`=== 尝试新路径 [${this.currentPathIndex}/${aaPathFormats.length - 1}] ===`)
    console.log('新路径:', newPath || '相对路径')
    
    // 更新baseURL
    this.baseURL = newPath
    this.instance.defaults.baseURL = newPath
    
    this.isTesting = false
    return true
  }
  
  setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config) => {
        // 每次请求时重新获取token，确保是最新的
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
          console.log('→ 发送请求:', config.method.toUpperCase(), config.url, '✓ 携带token')
          console.log('  Token前20位:', token.substring(0, 20) + '...')
        } else {
          console.log('→ 发送请求:', config.method.toUpperCase(), config.url, '✗ 无token')
          console.log('  LocalStorage中的token:', localStorage.getItem('token'))
        }
        
        console.log('  baseURL:', config.baseURL || '相对路径')
        console.log('  完整URL:', (config.baseURL || '') + config.url)
        console.log('  Authorization头:', config.headers.Authorization ? 'Bearer ' + token?.substring(0, 20) + '...' : 'None')
        
        return config
      },
      (error) => {
        console.error('请求拦截器错误:', error)
        return Promise.reject(error)
      }
    )
    
    // 响应拦截器
    this.instance.interceptors.response.use(
      (response) => {
        console.log('← 收到响应:', response.status, response.config.method.toUpperCase(), response.config.url)
        
        // 请求成功，保存当前路径
        if (response.status === 200 && !isIPAccess()) {
          this.saveWorkingPath(this.baseURL)
        }
        
        return response
      },
      async (error) => {
        const config = error.config
        const method = config?.method?.toUpperCase() || 'UNKNOWN'
        const url = config?.url || 'unknown'
        
        console.log('← 请求失败:', method, url)
        console.log('  错误类型:', error.response ? '服务器错误' : error.request ? '网络错误' : '配置错误')
        
        if (error.response) {
          // 有服务器响应
          console.log('  响应状态:', error.response.status)
          console.log('  响应数据:', error.response.data)
          
          if (error.response.status === 401) {
            // 检查错误信息，只有真正的token问题才清除
            const errorData = error.response.data || {};
            const errorMsg = errorData.error || errorData.message || '';
            
            console.log('=== 401错误分析 ===')
            console.log('错误信息:', errorMsg)
            console.log('当前localStorage token存在:', !!localStorage.getItem('token'))
            
            // 只有在明确的token过期/无效时才清除
            if (errorMsg.includes('Invalid or expired token') || 
                errorMsg.includes('token expired') ||
                errorMsg.includes('jwt expired') ||
                errorMsg === 'jwt malformed') {
              console.log('→ Token确实过期，清除认证信息')
              ElMessage.error('登录已过期，请重新登录')
              localStorage.removeItem('token')
              localStorage.removeItem('user')
              if (!isIPAccess()) {
                localStorage.removeItem(BASE_URL_KEY)
              }
              router.push('/login')
            } else if (errorMsg === 'Access denied. No token provided.') {
              console.log('→ 请求未携带token，但不清除localStorage中的token')
              // 这种情况不清除token，可能是前端发送问题
            } else {
              console.log('→ 其他401错误，不清除token:', errorMsg)
            }
            return Promise.reject(error)
          }
          
          // 其他HTTP错误
          const errorMsg = error.response.data?.message || `服务器错误 (${error.response.status})`
          ElMessage.error(errorMsg)
          
        } else if (error.request) {
          // 网络错误 - 可能是路径问题
          console.log('  网络错误，尝试其他路径...')
          
          if (await this.tryNextPath()) {
            console.log('=== 重试请求 ===')
            console.log('使用新路径:', this.baseURL || '相对路径')
            return this.instance.request(config)
          } else {
            console.log('=== 所有路径都失败了 ===')
            ElMessage.error(`无法连接到服务器：${method} ${url}`)
          }
          
        } else {
          console.log('  配置错误:', error.message)
          ElMessage.error('请求配置错误: ' + error.message)
        }
        
        return Promise.reject(error)
      }
    )
  }
  
  // 代理axios方法
  get(url, config) { return this.instance.get(url, config) }
  post(url, data, config) { return this.instance.post(url, data, config) }
  put(url, data, config) { return this.instance.put(url, data, config) }
  delete(url, config) { return this.instance.delete(url, config) }
  request(config) { return this.instance.request(config) }
}

// 创建单例
const api = new APIClient()

export default api