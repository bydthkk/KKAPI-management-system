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

        this.token = token
        this.user = user
        this.isLoggedIn = true

        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))

        return { success: true }
      } catch (error) {
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

    initAuth() {
      // axios拦截器会自动处理token，这里不需要手动设置
      return true
    }
  }
})