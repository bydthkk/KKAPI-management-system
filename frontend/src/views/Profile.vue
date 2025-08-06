<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <el-icon><User /></el-icon>
          <h3>个人资料设置</h3>
        </div>
      </template>

      <div class="profile-content">
        <el-row :gutter="32">
          <!-- 头像设置 -->
          <el-col :span="8">
            <div class="avatar-section">
              <div class="avatar-preview">
                <el-avatar 
                  :size="120" 
                  :src="avatarPreview || userStore.user.avatar"
                  class="user-avatar"
                >
                  <template v-if="!avatarPreview && !userStore.user.avatar">
                    <el-icon size="48"><User /></el-icon>
                  </template>
                </el-avatar>
              </div>
              <div class="avatar-actions">
                <el-upload
                  ref="uploadRef"
                  :show-file-list="false"
                  :before-upload="handleBeforeUpload"
                  :on-change="handleAvatarChange"
                  :auto-upload="false"
                  accept="image/*"
                  class="avatar-upload"
                >
                  <el-button type="primary" plain>
                    <el-icon><Upload /></el-icon>
                    选择头像
                  </el-button>
                </el-upload>
                <el-button 
                  v-if="avatarPreview || userStore.user.avatar" 
                  type="danger" 
                  plain 
                  @click="removeAvatar"
                >
                  <el-icon><Delete /></el-icon>
                  移除头像
                </el-button>
              </div>
              <p class="avatar-tip">支持 JPG、PNG 格式，建议尺寸 200x200px</p>
            </div>
          </el-col>

          <!-- 个人信息 -->
          <el-col :span="16">
            <el-form 
              ref="profileFormRef" 
              :model="profileForm" 
              :rules="profileRules" 
              label-width="100px"
              class="profile-form"
            >
              <el-form-item label="用户名">
                <el-input 
                  v-model="userStore.user.username" 
                  disabled 
                  class="readonly-input"
                >
                  <template #prefix>
                    <el-icon><User /></el-icon>
                  </template>
                </el-input>
                <div class="form-tip">用户名不可修改</div>
              </el-form-item>

              <el-form-item label="昵称" prop="nickname">
                <el-input 
                  v-model="profileForm.nickname" 
                  placeholder="请输入昵称" 
                  maxlength="100"
                  show-word-limit
                  clearable
                >
                  <template #prefix>
                    <el-icon><Edit /></el-icon>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item label="邮箱">
                <el-input 
                  :value="userStore.user.email || '未设置'" 
                  disabled 
                  class="readonly-input"
                >
                  <template #prefix>
                    <el-icon><Message /></el-icon>
                  </template>
                </el-input>
              </el-form-item>

              <el-form-item label="角色">
                <el-tag :type="userStore.user.role === 'admin' ? 'danger' : 'primary'">
                  {{ userStore.user.role === 'admin' ? '管理员' : '普通用户' }}
                </el-tag>
              </el-form-item>

              <el-form-item label="状态">
                <el-tag :type="userStore.user.status === 'active' ? 'success' : 'info'">
                  {{ userStore.user.status === 'active' ? '正常' : '禁用' }}
                </el-tag>
              </el-form-item>

              <el-form-item label="最后登录">
                <span class="last-login">
                  {{ formatDate(userStore.user.lastLoginAt) || '从未登录' }}
                </span>
              </el-form-item>

              <el-form-item>
                <el-button 
                  type="primary" 
                  @click="updateProfile" 
                  :loading="loading"
                  class="save-btn"
                >
                  <el-icon><Check /></el-icon>
                  保存修改
                </el-button>
                <el-button @click="resetForm">
                  <el-icon><Refresh /></el-icon>
                  重置
                </el-button>
              </el-form-item>
            </el-form>
          </el-col>
        </el-row>
      </div>
    </el-card>

    <!-- 密码修改卡片 -->
    <el-card class="password-card">
      <template #header>
        <div class="card-header">
          <el-icon><Lock /></el-icon>
          <h3>修改密码</h3>
        </div>
      </template>

      <el-form 
        ref="passwordFormRef" 
        :model="passwordForm" 
        :rules="passwordRules" 
        label-width="100px"
        class="password-form"
      >
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input 
            v-model="passwordForm.oldPassword" 
            type="password" 
            placeholder="请输入当前密码"
            show-password
            clearable
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input 
            v-model="passwordForm.newPassword" 
            type="password" 
            placeholder="请输入新密码"
            show-password
            clearable
          >
            <template #prefix>
              <el-icon><Unlock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input 
            v-model="passwordForm.confirmPassword" 
            type="password" 
            placeholder="请再次输入新密码"
            show-password
            clearable
          >
            <template #prefix>
              <el-icon><Unlock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button 
            type="primary" 
            @click="changePassword" 
            :loading="passwordLoading"
            class="change-password-btn"
          >
            <el-icon><Key /></el-icon>
            修改密码
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../store/user'
import api from '../utils/axios'
import { 
  User, Upload, Delete, Edit, Message, Check, Refresh, 
  Lock, Unlock, Key 
} from '@element-plus/icons-vue'

const userStore = useUserStore()
const profileFormRef = ref()
const passwordFormRef = ref()
const uploadRef = ref()
const loading = ref(false)
const passwordLoading = ref(false)
const avatarPreview = ref('')

// 个人资料表单
const profileForm = reactive({
  nickname: ''
})

// 密码修改表单
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 表单验证规则
const profileRules = {
  nickname: [
    { max: 100, message: '昵称不能超过100个字符', trigger: 'blur' }
  ]
}

const passwordRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 头像上传处理
const handleBeforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

const handleAvatarChange = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    avatarPreview.value = e.target.result
  }
  reader.readAsDataURL(file.raw)
}

const removeAvatar = () => {
  avatarPreview.value = ''
  profileForm.avatar = ''
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

// 更新个人资料
const updateProfile = async () => {
  if (!profileFormRef.value) return

  try {
    await profileFormRef.value.validate()
    loading.value = true

    const updateData = {
      nickname: profileForm.nickname
    }

    if (avatarPreview.value) {
      updateData.avatar = avatarPreview.value
    } else if (profileForm.avatar === '') {
      updateData.avatar = ''
    }

    const response = await api.put('/api/auth/profile', updateData)

    if (response.data.success) {
      // 更新用户store中的信息
      await userStore.fetchProfile()
      ElMessage.success('个人资料更新成功')
      avatarPreview.value = ''
    }
  } catch (error) {
    console.error('更新个人资料失败:', error)
    if (error.response?.data?.details) {
      ElMessage.error(error.response.data.details.join(', '))
    } else {
      ElMessage.error('更新个人资料失败')
    }
  } finally {
    loading.value = false
  }
}

// 修改密码
const changePassword = async () => {
  if (!passwordFormRef.value) return

  try {
    await passwordFormRef.value.validate()
    
    const confirmed = await ElMessageBox.confirm(
      '确定要修改密码吗？修改后需要重新登录。',
      '确认修改密码',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    if (confirmed) {
      passwordLoading.value = true

      const response = await api.put('/api/auth/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      })

      if (response.data.success) {
        ElMessage.success('密码修改成功，请重新登录')
        // 清空密码表单
        Object.assign(passwordForm, {
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
        // 3秒后跳转到登录页
        setTimeout(() => {
          userStore.logout()
          window.location.reload()
        }, 3000)
      }
    }
  } catch (error) {
    console.error('修改密码失败:', error)
    if (error.response?.data?.details) {
      ElMessage.error(error.response.data.details.join(', '))
    } else if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('修改密码失败')
    }
  } finally {
    passwordLoading.value = false
  }
}

// 重置表单
const resetForm = () => {
  profileForm.nickname = userStore.user.nickname || ''
  avatarPreview.value = ''
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

// 初始化数据
onMounted(() => {
  profileForm.nickname = userStore.user.nickname || ''
})
</script>

<style scoped>
.profile-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.profile-card,
.password-card {
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  border: 1px solid #e2e8f0;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.profile-content {
  padding: 24px 0;
}

.avatar-section {
  text-align: center;
}

.avatar-preview {
  margin-bottom: 16px;
}

.user-avatar {
  border: 3px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.user-avatar:hover {
  border-color: #6366f1;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.2);
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.avatar-tip {
  font-size: 12px;
  color: #64748b;
  margin: 0;
}

.profile-form {
  padding-left: 24px;
}

.readonly-input :deep(.el-input__inner) {
  background-color: #f8fafc;
  color: #64748b;
}

.form-tip {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
}

.last-login {
  color: #64748b;
  font-size: 14px;
}

.save-btn {
  background: #6366f1;
  border-color: #6366f1;
}

.save-btn:hover {
  background: #5855eb;
  border-color: #5855eb;
}

.password-form {
  max-width: 500px;
}

.change-password-btn {
  background: #dc2626;
  border-color: #dc2626;
}

.change-password-btn:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}

:deep(.el-card__header) {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

:deep(.el-form-item__label) {
  color: #374151;
  font-weight: 500;
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
}

:deep(.el-input__inner) {
  border-radius: 8px;
}

:deep(.el-upload) {
  width: 100%;
}

:deep(.el-upload .el-button) {
  width: 100%;
}
</style>