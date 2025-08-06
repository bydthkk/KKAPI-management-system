<template>
  <div class="users-container">
    <el-card class="users-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><User /></el-icon>
            <h3>用户管理</h3>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="showCreateDialog" :icon="Plus">
              添加用户
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <el-row :gutter="16">
          <el-col :span="8">
            <el-input
              v-model="searchQuery"
              placeholder="搜索用户名"
              :prefix-icon="Search"
              clearable
              @input="searchUsers"
            />
          </el-col>
        </el-row>
      </div>

      <!-- 用户列表 -->
      <el-table
        :data="users"
        v-loading="loading"
        stripe
        class="users-table"
      >
        <el-table-column prop="id" label="ID" width="60" />
        
        <el-table-column label="头像" width="80">
          <template #default="{ row }">
            <el-avatar 
              :size="40" 
              :src="row.avatar"
              background-color="#6366f1"
            >
              <template v-if="!row.avatar">
                <el-icon><User /></el-icon>
              </template>
            </el-avatar>
          </template>
        </el-table-column>

        <el-table-column prop="username" label="用户名" min-width="120" />
        
        <el-table-column prop="nickname" label="昵称" min-width="120">
          <template #default="{ row }">
            <span>{{ row.nickname || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="email" label="邮箱" min-width="180">
          <template #default="{ row }">
            <span>{{ row.email || '-' }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="role" label="角色" width="100">
          <template #default="{ row }">
            <el-tag :type="row.role === 'admin' ? 'danger' : 'primary'">
              {{ row.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="权限" min-width="200">
          <template #default="{ row }">
            <div v-if="row.role === 'admin'" class="permissions-display">
              <el-tag type="danger" size="small">全部权限</el-tag>
            </div>
            <div v-else-if="row.permissions && row.permissions.length > 0" class="permissions-display">
              <el-tag
                v-for="permission in row.permissions.slice(0, 3)"
                :key="permission"
                size="small"
                class="permission-tag"
              >
                {{ getMenuName(permission) }}
              </el-tag>
              <el-tag v-if="row.permissions.length > 3" size="small" type="info">
                +{{ row.permissions.length - 3 }}
              </el-tag>
            </div>
            <span v-else class="no-permissions">无权限</span>
          </template>
        </el-table-column>

        <el-table-column prop="lastLoginAt" label="最后登录" width="180">
          <template #default="{ row }">
            <span>{{ formatDate(row.lastLoginAt) || '从未登录' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              type="primary" 
              size="small" 
              @click="showEditDialog(row)"
              :icon="Edit"
            >
              编辑
            </el-button>
            <el-button 
              type="warning" 
              size="small" 
              @click="showResetPasswordDialog(row)"
              :icon="Key"
            >
              重置密码
            </el-button>
            <el-button 
              v-if="row.id !== userStore.user.id"
              type="danger" 
              size="small" 
              @click="deleteUser(row)"
              :icon="Delete"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 创建/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑用户' : '添加用户'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userRules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="userForm.username"
            placeholder="请输入用户名"
            :disabled="isEditing"
          />
        </el-form-item>

        <el-form-item v-if="!isEditing" label="密码" prop="password">
          <el-input
            v-model="userForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="userForm.email"
            placeholder="请输入邮箱"
          />
        </el-form-item>

        <el-form-item label="昵称" prop="nickname">
          <el-input
            v-model="userForm.nickname"
            placeholder="请输入昵称"
          />
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-radio-group v-model="userForm.role">
            <el-radio label="user">普通用户</el-radio>
            <el-radio label="admin">管理员</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="isEditing" label="状态" prop="status">
          <el-radio-group v-model="userForm.status">
            <el-radio label="active">正常</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="userForm.role === 'user'" label="菜单权限" prop="permissions">
          <el-checkbox-group v-model="userForm.permissions">
            <div class="permissions-grid">
              <el-checkbox
                v-for="menu in menuPermissions"
                :key="menu.key"
                :label="menu.key"
                class="permission-checkbox"
              >
                <div class="permission-item">
                  <strong>{{ menu.name }}</strong>
                  <p>{{ menu.description }}</p>
                </div>
              </el-checkbox>
            </div>
          </el-checkbox-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="saveUser" 
          :loading="saving"
        >
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="resetPasswordDialogVisible"
      title="重置密码"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="resetPasswordFormRef"
        :model="resetPasswordForm"
        :rules="resetPasswordRules"
        label-width="100px"
      >
        <el-alert
          :title="`重置用户: ${currentUser?.username}`"
          type="warning"
          :closable="false"
          style="margin-bottom: 20px"
        />
        
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="resetPasswordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="resetPasswordDialogVisible = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="resetPassword" 
          :loading="resetting"
        >
          确定重置
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../store/user'
import api from '../utils/axios'
import {
  User, Plus, Search, Edit, Key, Delete
} from '@element-plus/icons-vue'

const userStore = useUserStore()

// 响应式数据
const users = ref([])
const menuPermissions = ref([])
const loading = ref(false)
const saving = ref(false)
const resetting = ref(false)
const searchQuery = ref('')
const dialogVisible = ref(false)
const resetPasswordDialogVisible = ref(false)
const isEditing = ref(false)
const currentUser = ref(null)

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 用户表单
const userFormRef = ref()
const userForm = reactive({
  username: '',
  password: '',
  email: '',
  nickname: '',
  role: 'user',
  status: 'active',
  permissions: []
})

// 重置密码表单
const resetPasswordFormRef = ref()
const resetPasswordForm = reactive({
  newPassword: ''
})

// 表单验证规则
const userRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度在 3 到 50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

const resetPasswordRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' }
  ]
}

// 计算属性
const getMenuName = (key) => {
  const menu = menuPermissions.value.find(m => m.key === key)
  return menu ? menu.name : key
}

// 方法
const loadUsers = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      limit: pagination.limit
    }
    if (searchQuery.value) {
      params.search = searchQuery.value
    }

    const response = await api.get('/api/users', { params })
    
    if (response.data.success) {
      users.value = response.data.data.users
      pagination.total = response.data.data.pagination.total
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

const loadMenuPermissions = async () => {
  try {
    const response = await api.get('/api/users/menu-permissions')
    if (response.data.success) {
      // 过滤掉用户管理菜单，普通用户不应该有用户管理权限
      menuPermissions.value = response.data.data.filter(menu => menu.key !== 'users')
    }
  } catch (error) {
    console.error('加载菜单权限失败:', error)
  }
}

const searchUsers = () => {
  pagination.page = 1
  loadUsers()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadUsers()
}

const handleCurrentChange = (page) => {
  pagination.page = page
  loadUsers()
}

const showCreateDialog = () => {
  isEditing.value = false
  resetForm()
  dialogVisible.value = true
}

const showEditDialog = (user) => {
  isEditing.value = true
  currentUser.value = user
  Object.assign(userForm, {
    username: user.username,
    email: user.email || '',
    nickname: user.nickname || '',
    role: user.role,
    status: user.status,
    permissions: user.permissions || []
  })
  dialogVisible.value = true
}

const showResetPasswordDialog = (user) => {
  currentUser.value = user
  resetPasswordForm.newPassword = ''
  resetPasswordDialogVisible.value = true
}

const resetForm = () => {
  Object.assign(userForm, {
    username: '',
    password: '',
    email: '',
    nickname: '',
    role: 'user',
    status: 'active',
    permissions: []
  })
  if (userFormRef.value) {
    userFormRef.value.resetFields()
  }
}

const saveUser = async () => {
  if (!userFormRef.value) return

  try {
    await userFormRef.value.validate()
    saving.value = true

    const userData = { ...userForm }
    
    // 处理邮箱字段 - 空值转为null
    if (!userData.email || userData.email.trim() === '') {
      userData.email = null
    }
    
    // 处理昵称字段 - 空值转为null  
    if (!userData.nickname || userData.nickname.trim() === '') {
      userData.nickname = null
    }
    
    // 如果是管理员，不需要权限设置
    if (userData.role === 'admin') {
      userData.permissions = null
    }

    // 创建用户时不发送status字段
    if (!isEditing.value) {
      delete userData.status
    }
    
    // 编辑用户时不发送password字段
    if (isEditing.value) {
      delete userData.password
    }

    console.log('发送的用户数据:', userData)

    let response
    if (isEditing.value) {
      response = await api.put(`/api/users/${currentUser.value.id}`, userData)
    } else {
      response = await api.post('/api/users', userData)
    }

    if (response.data.success) {
      ElMessage.success(isEditing.value ? '用户更新成功' : '用户创建成功')
      dialogVisible.value = false
      loadUsers()
    }
  } catch (error) {
    console.error('保存用户失败:', error)
    if (error.response?.data?.details) {
      ElMessage.error(error.response.data.details.join(', '))
    } else if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('保存用户失败')
    }
  } finally {
    saving.value = false
  }
}

const resetPassword = async () => {
  if (!resetPasswordFormRef.value) return

  try {
    await resetPasswordFormRef.value.validate()
    
    const confirmed = await ElMessageBox.confirm(
      `确定要重置用户 "${currentUser.value.username}" 的密码吗？`,
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    if (confirmed) {
      resetting.value = true
      const response = await api.put(`/api/users/${currentUser.value.id}/reset-password`, {
        newPassword: resetPasswordForm.newPassword
      })

      if (response.data.success) {
        ElMessage.success('密码重置成功')
        resetPasswordDialogVisible.value = false
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置密码失败:', error)
      if (error.response?.data?.message) {
        ElMessage.error(error.response.data.message)
      } else {
        ElMessage.error('重置密码失败')
      }
    }
  } finally {
    resetting.value = false
  }
}

const deleteUser = async (user) => {
  try {
    const confirmed = await ElMessageBox.confirm(
      `确定要删除用户 "${user.username}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    if (confirmed) {
      const response = await api.delete(`/api/users/${user.id}`)
      
      if (response.data.success) {
        ElMessage.success('用户删除成功')
        loadUsers()
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除用户失败:', error)
      if (error.response?.data?.message) {
        ElMessage.error(error.response.data.message)
      } else {
        ElMessage.error('删除用户失败')
      }
    }
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

// 组件挂载
onMounted(() => {
  loadUsers()
  loadMenuPermissions()
})
</script>

<style scoped>
.users-container {
  padding: 24px;
}

.users-card {
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
}

.header-left h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.search-bar {
  margin-bottom: 20px;
}

.users-table {
  margin-bottom: 20px;
}

.permissions-display {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.permission-tag {
  margin-right: 4px;
}

.no-permissions {
  color: #64748b;
  font-size: 12px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.permission-checkbox {
  width: 100%;
  margin: 0;
  padding: 8px;
  border-radius: 6px;
  transition: background-color 0.3s ease;
}

.permission-checkbox:hover {
  background-color: #f8fafc;
}

.permission-item {
  margin-left: 24px;
}

.permission-item strong {
  display: block;
  color: #0f172a;
  font-size: 14px;
  margin-bottom: 2px;
}

.permission-item p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

:deep(.el-card__header) {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
}

:deep(.el-tag) {
  border-radius: 4px;
}

:deep(.el-dialog) {
  border-radius: 12px;
}

:deep(.el-checkbox-group) {
  width: 100%;
}

:deep(.el-checkbox) {
  height: auto;
  align-items: flex-start;
}

:deep(.el-checkbox__input) {
  margin-top: 2px;
}
</style>