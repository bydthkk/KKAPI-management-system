import { defineStore } from 'pinia'
import api from '../utils/axios'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    user: JSON.parse(localStorage.getItem('user') || '{}'),
    isLoggedIn: !!localStorage.getItem('token')
  }),

  actions: {
    async login(credentials) {
      try {
        const response = await api.post('/api/auth/login', credentials)
        const { token, user } = response.data.data

        // 立即保存到localStorage
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        // 然后更新store状态
        this.token = token
        this.user = user
        this.isLoggedIn = true

        console.log('=== 登录成功，token已保存 ===')
        console.log('Token:', token.substring(0, 20) + '...')
        console.log('LocalStorage中的token:', localStorage.getItem('token')?.substring(0, 20) + '...')

        return { success: true }
      } catch (error) {
        console.error('登录失败:', error)
        return { 
          success: false, 
          message: error.response?.data?.message || '登录失败' 
        }
      }
    },

    async logout() {
      try {
        await api.post('/api/auth/logout')
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        this.token = ''
        this.user = {}
        this.isLoggedIn = false

        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    },

    async fetchProfile() {
      try {
        const response = await api.get('/api/auth/profile')
        if (response.data.success) {
          this.user = response.data.data
          localStorage.setItem('user', JSON.stringify(response.data.data))
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
      }
    },

    async initAuth() {
      const token = localStorage.getItem('token')
      if (!token) {
        this.token = ''
        this.user = {}
        this.isLoggedIn = false
        return false
      }

      // 直接设置状态，不验证token（避免循环调用）
      this.token = token
      this.user = JSON.parse(localStorage.getItem('user') || '{}')
      this.isLoggedIn = true
      
      console.log('从localStorage恢复登录状态:', { token: token.substring(0, 20) + '...', user: this.user.username })
      return true
    }
  }
})