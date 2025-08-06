<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>安全设置管理</span>
          <div>
            <el-button @click="loadSettings">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="primary" @click="saveSettings" :loading="saving">
              <el-icon><Check /></el-icon>
              保存设置
            </el-button>
          </div>
        </div>
      </template>

      <div class="settings-section">
        <h3>命令白名单设置</h3>
        
        <!-- 白名单开关 -->
        <div class="setting-item">
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="setting-label">
                <el-icon><Lock /></el-icon>
                启用命令白名单
              </div>
              <p class="setting-description">
                启用后，只有白名单中的命令才能被执行。关闭后，所有命令都可以执行（不推荐）。
              </p>
            </el-col>
            <el-col :span="12">
              <el-switch
                v-model="settings.enableWhitelist"
                size="large"
                active-text="启用"
                inactive-text="禁用"
                :active-color="settings.enableWhitelist ? '#67c23a' : '#409eff'"
              />
            </el-col>
          </el-row>
        </div>

        <el-divider />

        <!-- 最大命令长度 -->
        <div class="setting-item">
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="setting-label">
                <el-icon><Document /></el-icon>
                最大命令长度
              </div>
              <p class="setting-description">
                限制单个命令的最大字符数，防止过长的命令执行。
              </p>
            </el-col>
            <el-col :span="12">
              <el-input-number
                v-model="settings.maxCommandLength"
                :min="100"
                :max="10000"
                :step="100"
                size="large"
              />
              <span class="unit-text">字符</span>
            </el-col>
          </el-row>
        </div>

        <el-divider />

        <!-- 白名单命令管理 -->
        <div class="setting-item">
          <div class="setting-label">
            <el-icon><List /></el-icon>
            允许的命令列表
          </div>
          <p class="setting-description">
            以下命令在启用白名单时可以执行。你可以添加新命令或删除现有命令。
          </p>

          <!-- 添加新命令 -->
          <div class="add-command-section">
            <el-row :gutter="10">
              <el-col :span="16">
                <el-input
                  v-model="newCommand"
                  placeholder="输入要添加的命令，如：ls、./cc、python3 等"
                  @keyup.enter="addCommand"
                />
              </el-col>
              <el-col :span="8">
                <el-button type="primary" @click="addCommand" :disabled="!newCommand.trim()">
                  <el-icon><Plus /></el-icon>
                  添加命令
                </el-button>
              </el-col>
            </el-row>
          </div>

          <!-- 命令列表 -->
          <div class="commands-list">
            <div class="commands-header">
              <span>当前允许的命令 ({{ settings.allowedCommands.length }} 个)</span>
              <el-button 
                size="small" 
                type="danger" 
                @click="clearAllCommands"
                :disabled="settings.allowedCommands.length === 0"
              >
                清空所有
              </el-button>
            </div>
            
            <div class="commands-grid">
              <el-tag
                v-for="(command, index) in settings.allowedCommands"
                :key="index"
                closable
                @close="removeCommand(index)"
                :type="getCommandTagType(command)"
                size="large"
              >
                <el-icon><List /></el-icon>
                {{ command }}
              </el-tag>
            </div>

            <!-- 快速添加预设命令 -->
            <div class="preset-commands">
              <h4>快速添加常用命令:</h4>
              <div class="preset-buttons">
                <el-button 
                  v-for="preset in presetCommands"
                  :key="preset"
                  size="small"
                  @click="addPresetCommand(preset)"
                  :disabled="settings.allowedCommands.includes(preset)"
                >
                  {{ preset }}
                </el-button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </el-card>

    <!-- 危险操作提示对话框 -->
    <el-dialog
      title="⚠️ 危险操作确认"
      v-model="dangerDialogVisible"
      width="500px"
    >
      <div class="danger-warning">
        <el-icon color="#f56c6c"><Warning /></el-icon>
        <p>您正在执行以下危险操作：</p>
        <ul>
          <li v-if="!settings.enableWhitelist">
            <strong>禁用命令白名单：</strong>这将允许执行任何命令，存在严重安全风险！
          </li>
          <li v-if="pendingClearCommands">
            <strong>清空所有允许的命令：</strong>这将删除所有白名单命令，需要重新添加！
          </li>
        </ul>
        <p>确定要继续吗？</p>
      </div>
      <template #footer>
        <el-button @click="cancelDangerOperation">取消</el-button>
        <el-button type="danger" @click="confirmDangerOperation">确认执行</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Refresh, Check, Lock, Document, List, Plus, Warning 
} from '@element-plus/icons-vue'
import api from '../utils/axios'

const saving = ref(false)
const newCommand = ref('')
const dangerDialogVisible = ref(false)
const pendingClearCommands = ref(false)

const settings = reactive({
  enableWhitelist: true,
  allowedCommands: [],
  maxCommandLength: 1000
})

// 预设的常用命令
const presetCommands = [
  'ls', 'pwd', 'whoami', 'ps', 'df', 'free', 'uptime', 'date', 'echo',
  'cat', 'head', 'tail', 'grep', 'find', 'curl', 'wget', 'ping',
  'docker', 'systemctl', 'service', 'top', 'htop', 'uname',
  './cc', 'python3', 'node', 'npm', 'git'
]

const getCommandTagType = (command) => {
  if (command.startsWith('./')) return 'warning'
  if (['rm', 'delete', 'kill', 'sudo', 'su'].some(dangerous => command.includes(dangerous))) {
    return 'danger'
  }
  return 'primary'
}

const loadSettings = async () => {
  try {
    const response = await api.get('/api/ssh/allowed-commands')
    Object.assign(settings, response.data.data)
  } catch (error) {
    console.error('加载安全设置失败:', error)
    ElMessage.error('加载安全设置失败')
  }
}

const saveSettings = async () => {
  // 检查危险操作
  if (!settings.enableWhitelist || pendingClearCommands.value) {
    dangerDialogVisible.value = true
    return
  }

  await performSave()
}

const performSave = async () => {
  saving.value = true
  try {
    await api.put('/api/ssh/security-settings', {
      enableWhitelist: settings.enableWhitelist,
      allowedCommands: settings.allowedCommands
    })
    ElMessage.success('安全设置保存成功')
  } catch (error) {
    console.error('保存安全设置失败:', error)
    ElMessage.error('保存安全设置失败')
  } finally {
    saving.value = false
  }
}

const addCommand = () => {
  const command = newCommand.value.trim()
  if (!command) return

  if (settings.allowedCommands.includes(command)) {
    ElMessage.warning(`命令 "${command}" 已存在`)
    return
  }

  settings.allowedCommands.push(command)
  newCommand.value = ''
  ElMessage.success(`命令 "${command}" 添加成功`)
}

const addPresetCommand = (command) => {
  if (settings.allowedCommands.includes(command)) return
  
  settings.allowedCommands.push(command)
  ElMessage.success(`命令 "${command}" 添加成功`)
}

const removeCommand = (index) => {
  const command = settings.allowedCommands[index]
  settings.allowedCommands.splice(index, 1)
  ElMessage.success(`命令 "${command}" 删除成功`)
}

const clearAllCommands = () => {
  pendingClearCommands.value = true
  dangerDialogVisible.value = true
}

const confirmDangerOperation = async () => {
  if (pendingClearCommands.value) {
    settings.allowedCommands = []
    pendingClearCommands.value = false
    ElMessage.success('已清空所有命令')
  }
  
  dangerDialogVisible.value = false
  await performSave()
}

const cancelDangerOperation = () => {
  if (pendingClearCommands.value) {
    pendingClearCommands.value = false
  } else {
    // 如果是关闭白名单的操作，恢复设置
    settings.enableWhitelist = true
  }
  dangerDialogVisible.value = false
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.page-container {
  padding: 20px;
  min-height: 100vh;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 16px;
}

.settings-section {
  max-width: 1200px;
}

.settings-section h3 {
  color: #2c3e50;
  margin-bottom: 20px;
  font-size: 18px;
  font-weight: 600;
}

.setting-item {
  margin-bottom: 30px;
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
  color: #2c3e50;
  margin-bottom: 8px;
}

.setting-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.unit-text {
  margin-left: 8px;
  color: #909399;
  font-size: 14px;
}

.add-command-section {
  margin: 20px 0;
}

.commands-list {
  margin-top: 20px;
}

.commands-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  font-weight: 600;
  color: #2c3e50;
}

.commands-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
  min-height: 60px;
  padding: 15px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  background-color: #fafafa;
}

.commands-grid:empty::before {
  content: "暂无允许的命令";
  color: #909399;
  font-style: italic;
}

.preset-commands {
  margin-top: 20px;
  padding: 15px;
  background-color: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.1);
}

.preset-commands h4 {
  margin: 0 0 10px 0;
  color: #2c3e50;
  font-size: 14px;
}

.preset-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.danger-warning {
  text-align: left;
}

.danger-warning .el-icon {
  font-size: 24px;
  margin-right: 8px;
}

.danger-warning ul {
  margin: 10px 0;
  padding-left: 20px;
}

.danger-warning li {
  margin: 5px 0;
  line-height: 1.5;
}

/* 卡片样式 */
:deep(.el-card) {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

:deep(.el-card__header) {
  background: rgba(99, 102, 241, 0.05);
  border-bottom: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 16px 16px 0 0;
}

/* 按钮样式 */
:deep(.el-button--primary) {
  background: #6366f1;
  border: none;
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-button--primary:hover) {
  background: #5855eb;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
}

:deep(.el-button--danger) {
  background: #dc2626;
  border: none;
  border-radius: 8px;
}

:deep(.el-button) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

/* 开关样式 */
:deep(.el-switch.is-checked .el-switch__core) {
  background-color: #67c23a;
}

/* 标签样式 */
:deep(.el-tag) {
  border-radius: 20px;
  font-weight: 500;
  border: none;
  margin: 2px;
}

/* 输入框样式 */
:deep(.el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

/* 分割线样式 */
:deep(.el-divider) {
  border-color: rgba(99, 102, 241, 0.2);
}

/* 对话框样式 */
:deep(.el-dialog) {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

:deep(.el-dialog__header) {
  background: rgba(220, 38, 38, 0.05);
  border-radius: 16px 16px 0 0;
  padding: 20px;
}

:deep(.el-dialog__title) {
  font-weight: 600;
  color: #2c3e50;
}
</style>