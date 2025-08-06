<template>
  <div class="parameters-container">
    <el-card class="parameters-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><Setting /></el-icon>
            <h3>{{ t('parameters.title') }}</h3>
          </div>
          <div class="header-actions">
            <el-button type="primary" @click="showAddDialog" :icon="Plus">
              {{ t('parameters.addParameter') }}
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
              :placeholder="t('common.search')"
              :prefix-icon="Search"
              clearable
              @input="searchParameters"
            />
          </el-col>
          <el-col :span="8">
            <el-select
              v-model="filterServer"
              :placeholder="t('common.selectServer')"
              clearable
              style="width: 100%"
              @change="filterByServer"
            >
              <el-option
                v-for="server in servers"
                :key="server.id"
                :label="server.name"
                :value="server.id"
              />
            </el-select>
          </el-col>
        </el-row>
      </div>

      <!-- 参数组列表 -->
      <el-table
        :data="filteredParameters"
        v-loading="loading"
        stripe
        class="parameters-table"
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="60" />
        
        <el-table-column :label="t('parameters.groupName')" min-width="180">
          <template #default="{ row }">
            <div class="parameter-info">
              <div class="name">{{ row.name }}</div>
              <div class="method-tag">
                <el-tag size="small" type="primary">
                  {{ row.method }}
                </el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column :label="t('servers.title')" min-width="200">
          <template #default="{ row }">
            <div v-if="row.server" class="server-info">
              <div class="server-name">{{ row.server.name }}</div>
              <div class="server-address">{{ row.server.host }}:{{ row.server.port }}</div>
            </div>
            <span v-else class="empty-text">{{ t('common.unbound') }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('parameters.command')" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <code class="command-text">{{ row.command }}</code>
          </template>
        </el-table-column>
        <el-table-column :label="t('parameters.apiEndpoint')" width="150">
          <template #default="{ row }">
            <el-tag v-if="row.apiEndpoint" type="info" size="small">
              {{ row.apiEndpoint }}
            </el-tag>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('parameters.dynamicParams')" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.parameters && row.parameters.length > 0" 
                    type="success" size="small">
              {{ row.parameters.length }} {{ t('parameters.params') }}
            </el-tag>
            <span v-else class="empty-text">{{ t('common.none') }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('common.createTime')" width="160">
          <template #default="{ row }">
            <div class="time-info">
              <el-icon class="time-icon"><Clock /></el-icon>
              {{ formatDate(row.createTime) }}
            </div>
          </template>
        </el-table-column>
        
        <el-table-column :label="t('common.actions')" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button 
                size="small" 
                type="success" 
                :icon="VideoPlay"
                @click="executeTask(row)"
              >
                {{ t('common.execute') }}
              </el-button>
              <el-button 
                size="small" 
                :icon="Edit"
                @click="editParameter(row)"
              >
                {{ t('common.edit') }}
              </el-button>
              <el-popconfirm 
                :title="t('parameters.deleteConfirm')"
                @confirm="deleteParameter(row)"
              >
                <template #reference>
                  <el-button 
                    size="small" 
                    type="danger" 
                    :icon="Delete"
                  >
                    {{ t('common.delete') }}
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑参数对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="90%"
      :style="{ maxWidth: '1200px' }"
      top="5vh"
    >
      <el-form
        ref="paramFormRef"
        :model="paramForm"
        :rules="paramRules"
        label-width="120px"
      >
        <!-- 基本信息区域 -->
        <div class="form-grid">
          <!-- 左侧：基本配置 -->
          <div>
            <h4 style="margin: 0 0 15px 0; color: #2c3e50; font-weight: 600; border-bottom: 2px solid #6366f1; padding-bottom: 8px;">
              📋 基本配置
            </h4>
            <el-form-item label="参数组名称" prop="name">
              <el-input v-model="paramForm.name" placeholder="请输入参数组名称" />
            </el-form-item>
            
            <el-form-item label="执行方法" prop="method">
              <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
                <el-button 
                  size="small" 
                  type="primary" 
                  plain 
                  @click="setQuickMethod('ssh')"
                >
                  SSH连接
                </el-button>
                <el-button 
                  size="small" 
                  type="success" 
                  plain 
                  @click="setQuickMethod('docker')"
                >
                  Docker
                </el-button>
                <el-button 
                  size="small" 
                  type="info" 
                  plain 
                  @click="setQuickMethod('systemctl')"
                >
                  系统服务
                </el-button>
                <el-button 
                  size="small" 
                  type="warning" 
                  plain 
                  @click="setQuickMethod('file')"
                >
                  文件操作
                </el-button>
              </div>
              <el-input v-model="paramForm.method" placeholder="请输入执行方法或点击上方快速选择" />
            </el-form-item>
          </div>
          
          <!-- 右侧：服务器配置 -->
          <div>
            <h4 style="margin: 0 0 15px 0; color: #2c3e50; font-weight: 600; border-bottom: 2px solid #059669; padding-bottom: 8px;">
              🖥️ 服务器配置
            </h4>
            <el-form-item label="绑定服务器" prop="serverId">
              <el-select v-model="paramForm.serverId" placeholder="请选择服务器" style="width: 100%" filterable>
                <el-option 
                  v-for="server in servers" 
                  :key="server.id" 
                  :label="`${server.name} (${server.host}:${server.port})`" 
                  :value="server.id"
                >
                  <div style="display: flex; justify-content: space-between; align-items: center; min-height: 48px; padding: 4px 0;">
                    <div style="flex: 1; display: flex; flex-direction: column; justify-content: center;">
                      <div style="font-weight: 500; display: flex; align-items: center; gap: 8px;">
                        {{ server.name }}
                        <el-tag 
                          :type="server.status === 'online' ? 'success' : 'danger'" 
                          size="small"
                          style="font-size: 10px;"
                        >
                          {{ server.status === 'online' ? '在线' : '离线' }}
                        </el-tag>
                      </div>
                      <div style="font-size: 12px; color: #909399; margin-top: 2px;">{{ server.host }}:{{ server.port }}</div>
                    </div>
                  </div>
                </el-option>
              </el-select>
              <div style="margin-top: 8px; font-size: 12px; color: #909399;">
                {{ t('parameters.selectTargetServer') }}
              </div>
            </el-form-item>
            
            <el-form-item :label="t('servers.description')">
              <el-input 
                v-model="paramForm.description" 
                type="textarea" 
                :rows="3"
                placeholder="请输入参数描述"
              />
            </el-form-item>
          </div>
        </div>
        
        <!-- 命令配置区域 -->
        <div style="margin-bottom: 25px;">
          <h4 style="margin: 0 0 15px 0; color: #2c3e50; font-weight: 600; border-bottom: 2px solid #f59e0b; padding-bottom: 8px;">
            ⚡ 命令配置
          </h4>
          <el-form-item label="执行命令" prop="command">
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 10px; flex-wrap: wrap;" v-if="quickCommands.length > 0">
              <span style="font-size: 12px; color: #909399; margin-right: 5px;">快速模板：</span>
              <el-button 
                v-for="cmd in quickCommands" 
                :key="cmd.name"
                size="small" 
                type="primary" 
                plain 
                @click="setQuickCommand(cmd.command)"
              >
                {{ cmd.name }}
              </el-button>
            </div>
            <el-input 
              v-model="paramForm.command" 
              type="textarea" 
              :rows="5"
              placeholder="请输入执行命令，支持多行命令和参数占位符，如: ./program [host] [port]" 
            />
            <div style="margin-top: 8px; font-size: 12px; color: #909399;">
              💡 支持多行命令、参数占位符 [参数名]，使用 && 连接命令或 ; 分隔命令
            </div>
          </el-form-item>
        </div>
        
        <!-- API端点配置区域 -->
        <div style="margin-bottom: 25px;">
          <h4 style="margin: 0 0 15px 0; color: #2c3e50; font-weight: 600; border-bottom: 2px solid #0ea5e9; padding-bottom: 8px;">
            🔗 API端点配置
          </h4>
          <el-form-item label="API端点名称">
            <el-input 
              v-model="paramForm.apiEndpoint" 
              placeholder="请输入API端点名称，如: stress-test (可选)"
              @input="validateApiEndpoint"
            />
          </el-form-item>
          
          <el-form-item label="API密钥" v-if="paramForm.apiEndpoint">
            <el-input 
              v-model="paramForm.apiKey" 
              placeholder="请输入API访问密钥 (可选，用于URL认证)"
              show-password
            />
            <div style="margin-top: 6px; font-size: 12px; color: #909399;">
              💡 如果设置了API密钥，访问URL时会自动添加key参数进行认证
            </div>
            
            <!-- API端点预览 -->
            <div v-if="paramForm.apiEndpoint" style="margin-top: 10px;">
              <div style="padding: 15px; background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                  <el-icon style="color: #0ea5e9;"><Link /></el-icon>
                  <span style="font-weight: 600; color: #0c4a6e;">API访问地址预览</span>
                </div>
                
                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e0f2fe;">
                  <code style="color: #059669; font-weight: 500; font-size: 13px; word-break: break-all;">
                    GET {{ getApiPreviewUrl() }}
                  </code>
                </div>
                
                <div v-if="apiEndpointError" style="margin-top: 10px; padding: 10px; background: #fef2f2; border: 1px solid #fca5a5; border-radius: 6px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <el-icon style="color: #dc2626;"><WarningFilled /></el-icon>
                    <span style="font-size: 12px; color: #dc2626;">{{ apiEndpointError }}</span>
                  </div>
                </div>
                
                <div v-else style="margin-top: 10px;">
                  <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <el-icon style="color: #059669;"><Select /></el-icon>
                    <span style="font-size: 12px; color: #059669; font-weight: 500;">格式正确</span>
                  </div>
                  <div style="font-size: 11px; color: #6b7280;">
                    • 支持字母、数字、连字符和下划线<br>
                    • 建议使用kebab-case格式（如：user-login, data-export）
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else style="margin-top: 8px; font-size: 12px; color: #909399;">
              💡 输入端点名称后将显示完整的API访问地址预览
            </div>
          </el-form-item>
        </div>
        
        <!-- 动态参数配置区域 -->
        <div style="margin-bottom: 25px;">
          <h4 style="margin: 0 0 15px 0; color: #2c3e50; font-weight: 600; border-bottom: 2px solid #8b5cf6; padding-bottom: 8px;">
            🎛️ 动态参数配置
          </h4>
          <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <el-button 
                type="primary" 
                @click="addParameter"
              >
                <el-icon><Plus /></el-icon>
                添加参数
              </el-button>
              <span style="margin-left: 15px; font-size: 12px; color: #909399;">
                💡 在命令中使用 [参数名] 作为占位符，如: ./program [host] [port] [timeout]
              </span>
            </div>
          </div>
          
          <div v-if="paramForm.parameters && paramForm.parameters.length > 0" 
               style="border: 1px solid #e4e7ed; border-radius: 12px; padding: 20px; background: #fafcff;">
            <!-- 参数表头 -->
            <div style="display: grid; grid-template-columns: 2fr 3fr 2fr 80px 60px; gap: 15px; margin-bottom: 15px; padding: 10px; background: #f1f5f9; border-radius: 8px; font-weight: 600; color: #475569;">
              <div>参数名称</div>
              <div>参数描述</div>
              <div>默认值</div>
              <div>必填</div>
              <div>操作</div>
            </div>
            
            <!-- 参数列表 -->
            <div v-for="(param, index) in paramForm.parameters" 
                 :key="index" 
                 style="display: grid; grid-template-columns: 2fr 3fr 2fr 80px 60px; gap: 15px; align-items: center; margin-bottom: 12px; padding: 15px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; transition: all 0.3s ease;"
                 :style="{ borderColor: param.required ? '#fca5a5' : '#e2e8f0' }">
              <div>
                <el-input 
                  v-model="param.name" 
                  placeholder="如: host, port, timeout" 
                  size="default"
                />
              </div>
              <div>
                <el-input 
                  v-model="param.description" 
                  placeholder="如: 目标主机地址, 端口号, 超时时间" 
                  size="default"
                />
              </div>
              <div>
                <el-input 
                  v-model="param.default" 
                  placeholder="默认值 (可选)" 
                  size="default"
                />
              </div>
              <div style="text-align: center;">
                <el-checkbox 
                  v-model="param.required" 
                  size="default"
                />
              </div>
              <div style="text-align: center;">
                <el-button 
                  size="small" 
                  type="danger" 
                  circle
                  @click="removeParameter(index)"
                  :icon="Close"
                />
              </div>
            </div>
          </div>
          
          <div v-else style="text-align: center; padding: 40px 20px; color: #909399; background: #fafcff; border-radius: 12px; border: 2px dashed #d1d5db;">
            <div style="font-size: 48px; margin-bottom: 15px;">🎛️</div>
            <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">暂无动态参数配置</div>
            <div style="font-size: 12px;">点击上方"添加参数"按钮开始配置动态参数</div>
          </div>
        </div>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button @click="resetForm" :disabled="saving">
            重置
          </el-button>
          <el-button type="info" @click="previewParameter" :disabled="!paramForm.command">
            预览
          </el-button>
          <el-button type="primary" @click="saveParameter" :loading="saving">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 执行任务对话框 -->
    <el-dialog
      title="执行任务"
      v-model="executeDialogVisible"
      width="500px"
    >
      <el-form label-width="120px">
        <el-form-item label="参数组名称">
          <span>{{ currentTask.name }}</span>
        </el-form-item>
        <el-form-item label="绑定服务器">
          <span v-if="currentTask.server">
            {{ currentTask.server.name }} ({{ currentTask.server.host }}:{{ currentTask.server.port }})
          </span>
          <span v-else style="color: #909399;">未绑定</span>
        </el-form-item>
        <el-form-item label="执行方法">
          <el-tag>
            {{ currentTask.method }}
          </el-tag>
        </el-form-item>
        <el-form-item label="执行命令">
          <pre style="margin: 0; font-family: monospace; white-space: pre-wrap;">{{ currentTask.command }}</pre>
        </el-form-item>
        <el-form-item label="API端点" v-if="currentTask.apiEndpoint">
          <el-tag type="info">{{ currentTask.apiEndpoint }}</el-tag>
          <div style="margin-top: 5px; font-size: 12px; color: #909399;">
            浏览器访问: /api/{{ currentTask.apiEndpoint }}?参数名=参数值
          </div>
        </el-form-item>
        <el-form-item label="动态参数" v-if="currentTask.parameters && currentTask.parameters.length > 0">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div v-for="(param, index) in currentTask.parameters" :key="index" 
                 style="display: flex; align-items: center; gap: 8px; padding: 6px; background: #f9f9f9; border-radius: 4px; font-size: 12px;">
              <el-tag size="small" type="primary">[{{ param.name }}]</el-tag>
              <span style="flex: 1;">{{ param.description || '无描述' }}</span>
              <el-tag v-if="param.required" size="small" type="danger">必填</el-tag>
              <span v-if="param.default" style="color: #909399;">默认: {{ param.default }}</span>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <el-alert
        title="确认执行任务"
        type="warning"
        description="请确认参数无误后执行任务，任务执行期间请勿重复提交"
        :closable="false"
        style="margin-bottom: 20px"
      />

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="executeDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmExecute" :loading="executing">
            确认执行
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 预览对话框 -->
    <el-dialog
      title="参数组预览"
      v-model="previewDialogVisible"
      width="85%"
      :style="{ maxWidth: '1000px' }"
      top="8vh"
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="参数组名称">
          {{ paramForm.name || '未填写' }}
        </el-descriptions-item>
        <el-descriptions-item label="绑定服务器">
          <span v-if="selectedServer">
            {{ selectedServer.name }} ({{ selectedServer.host }}:{{ selectedServer.port }})
          </span>
          <span v-else style="color: #909399;">未选择</span>
        </el-descriptions-item>
        <el-descriptions-item label="执行方法">
          <el-tag v-if="paramForm.method">{{ paramForm.method }}</el-tag>
          <span v-else style="color: #909399;">未填写</span>
        </el-descriptions-item>
        <el-descriptions-item label="执行命令">
          <pre v-if="paramForm.command" style="margin: 0; font-family: monospace; white-space: pre-wrap; background: #f5f5f5; padding: 10px; border-radius: 4px;">{{ paramForm.command }}</pre>
          <span v-else style="color: #909399;">未填写</span>
        </el-descriptions-item>
        <el-descriptions-item label="API端点" v-if="paramForm.apiEndpoint">
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div>
              <el-tag type="info">{{ paramForm.apiEndpoint }}</el-tag>
            </div>
            
            <!-- API使用示例卡片 -->
            <div style="padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                <el-icon style="color: #6366f1;"><Link /></el-icon>
                <span style="font-weight: 600; color: #475569;">API使用示例</span>
              </div>
              
              <!-- 浏览器访问 -->
              <div style="margin-bottom: 12px;">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">🌐 浏览器访问：</div>
                <div style="background: white; padding: 8px; border-radius: 4px; border: 1px solid #d1d5db;">
                  <code style="color: #059669; font-size: 12px;">{{ getApiPreviewUrl() }}</code>
                </div>
              </div>
              
              <!-- cURL命令 -->
              <div style="margin-bottom: 12px;">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">📡 cURL命令：</div>
                <div style="background: #1e293b; padding: 8px; border-radius: 4px;">
                  <code style="color: #e2e8f0; font-size: 11px;">{{ getCurlExample() }}</code>
                </div>
              </div>
              
              <!-- JavaScript示例 -->
              <div v-if="paramForm.parameters && paramForm.parameters.length > 0">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">⚡ JavaScript示例：</div>
                <div style="background: #0f172a; padding: 8px; border-radius: 4px;">
                  <code style="color: #e2e8f0; font-size: 11px; white-space: pre-line;">{{ getJavaScriptExample() }}</code>
                </div>
              </div>
            </div>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="动态参数" v-if="paramForm.parameters && paramForm.parameters.length > 0">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div v-for="(param, index) in paramForm.parameters" :key="index" 
                 style="display: flex; align-items: center; gap: 10px; padding: 8px; background: #f9f9f9; border-radius: 4px;">
              <el-tag size="small" type="primary">[{{ param.name }}]</el-tag>
              <span style="flex: 1;">{{ param.description || '无描述' }}</span>
              <el-tag v-if="param.required" size="small" type="danger">必填</el-tag>
              <el-tag v-else size="small" type="info">可选</el-tag>
              <span v-if="param.default" style="font-size: 12px; color: #909399;">默认: {{ param.default }}</span>
            </div>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="描述" v-if="paramForm.description">
          {{ paramForm.description }}
        </el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="previewDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="previewDialogVisible = false; saveParameter()">
            确认保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Link, WarningFilled, Select, Close, Search, Setting, Edit, Delete, VideoPlay, Clock } from '@element-plus/icons-vue'
import api from '../utils/axios'

const { t } = useI18n()

// 搜索和过滤
const searchQuery = ref('')
const filterServer = ref('')
const loading = ref(false)

const parameters = ref([])
const servers = ref([])
const dialogVisible = ref(false)

// 过滤后的参数列表
const filteredParameters = computed(() => {
  let filtered = parameters.value

  // 按名称搜索
  if (searchQuery.value) {
    filtered = filtered.filter(param => 
      param.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      param.method.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      param.command.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  // 按服务器过滤
  if (filterServer.value) {
    filtered = filtered.filter(param => param.serverId === filterServer.value)
  }

  return filtered
})
const executeDialogVisible = ref(false)
const dialogTitle = ref('添加参数组')
const paramFormRef = ref()
const saving = ref(false)
const executing = ref(false)
const editingId = ref(null)
const quickCommands = ref([])
const previewDialogVisible = ref(false)
const apiEndpointError = ref('')

const paramForm = reactive({
  name: '',
  serverId: '',
  method: '',
  command: '',
  description: '',
  apiEndpoint: '',
  apiKey: '',
  parameters: []
})

const currentTask = reactive({
  name: '',
  method: '',
  command: '',
  server: null
})

const paramRules = {
  name: [
    { required: true, message: '请输入参数组名称', trigger: 'blur' }
  ],
  serverId: [
    { required: true, message: '请选择服务器', trigger: 'change' }
  ],
  method: [
    { required: true, message: '请输入执行方法', trigger: 'blur' }
  ],
  command: [
    { required: true, message: '请输入执行命令', trigger: 'blur' }
  ]
}

// 计算选中的服务器信息
const selectedServer = computed(() => {
  if (!paramForm.serverId) return null
  return servers.value.find(server => server.id === paramForm.serverId)
})

// 预览参数组
const previewParameter = () => {
  previewDialogVisible.value = true
}

// 搜索和过滤函数
const searchParameters = () => {
  // 搜索功能通过计算属性实现，这里可以添加防抖逻辑
}

const filterByServer = () => {
  // 过滤功能通过计算属性实现
}

// 日期格式化
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadParameters = async () => {
  loading.value = true
  try {
    const response = await api.get('/api/parameters')
    parameters.value = response.data.data
  } catch (error) {
    console.error('加载参数列表失败:', error)
    ElMessage.error('加载参数列表失败')
  } finally {
    loading.value = false
  }
}

const loadServers = async () => {
  try {
    const response = await api.get('/api/servers')
    servers.value = response.data.data
  } catch (error) {
    console.error('加载服务器列表失败:', error)
    ElMessage.error('加载服务器列表失败')
  }
}

const showAddDialog = () => {
  dialogTitle.value = '添加参数组'
  editingId.value = null
  resetForm()
  dialogVisible.value = true
}

const editParameter = (param) => {
  dialogTitle.value = '编辑参数组'
  editingId.value = param.id
  Object.assign(paramForm, {
    name: param.name,
    serverId: param.serverId,
    method: param.method,
    command: param.command,
    description: param.description || '',
    apiEndpoint: param.apiEndpoint || '',
    apiKey: param.apiKey || '',
    parameters: param.parameters ? JSON.parse(JSON.stringify(param.parameters)) : []
  })
  dialogVisible.value = true
}

const resetForm = () => {
  Object.assign(paramForm, {
    name: '',
    serverId: '',
    method: '',
    command: '',
    description: '',
    apiEndpoint: '',
    apiKey: '',
    parameters: []
  })
  if (paramFormRef.value) {
    paramFormRef.value.resetFields()
  }
}

const saveParameter = async () => {
  if (!paramFormRef.value) return

  // 验证API端点名称
  if (paramForm.apiEndpoint && !validateApiEndpoint()) {
    ElMessage.error('请修正API端点名称格式错误')
    return
  }

  await paramFormRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        if (editingId.value) {
          await api.put(`/api/parameters/${editingId.value}`, paramForm)
          ElMessage.success('参数组更新成功')
        } else {
          await api.post('/api/parameters', paramForm)
          ElMessage.success('参数组添加成功')
        }
        dialogVisible.value = false
        loadParameters()
      } catch (error) {
        ElMessage.error('操作失败，请重试')
      } finally {
        saving.value = false
      }
    }
  })
}

const executeTask = (param) => {
  Object.assign(currentTask, param)
  executeDialogVisible.value = true
}

const confirmExecute = async () => {
  executing.value = true
  try {
    const response = await api.post('/api/tasks/execute', {
      parameterId: currentTask.id,
      method: currentTask.method,
      command: currentTask.command,
      serverId: currentTask.server?.id
    })
    
    if (response.data.success) {
      ElMessage.success(`任务已提交执行，任务ID: ${response.data.data.id}`)
      executeDialogVisible.value = false
      // 提示用户查看任务管理页面
      ElMessage.info('请到任务管理页面查看执行状态和结果')
    } else {
      ElMessage.error(response.data.message || '任务执行失败')
    }
  } catch (error) {
    console.error('任务执行失败:', error)
    if (error.response && error.response.data && error.response.data.message) {
      ElMessage.error(`任务执行失败: ${error.response.data.message}`)
    } else {
      ElMessage.error('任务执行失败，请重试')
    }
  } finally {
    executing.value = false
  }
}

const deleteParameter = async (param) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除参数组 "${param.name}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await api.delete(`/api/parameters/${param.id}`)
    ElMessage.success('参数组删除成功')
    loadParameters()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败，请重试')
    }
  }
}

// 快速方法选择
const setQuickMethod = (methodType) => {
  const methodTemplates = {
    ssh: 'remote-execute',
    docker: 'container-manage',
    systemctl: 'service-control',
    file: 'file-operation'
  }
  
  paramForm.method = methodTemplates[methodType] || methodType
  
  // 根据方法类型更新快速命令模板
  updateQuickCommands(methodType)
}

// 更新快速命令模板
const updateQuickCommands = (methodType) => {
  const commandTemplates = {
    ssh: [
      { name: '系统信息', command: 'uname -a\ndf -h\nfree -h' },
      { name: '进程查看', command: 'ps aux | head -20' },
      { name: '网络状态', command: 'netstat -tuln' }
    ],
    docker: [
      { name: '容器列表', command: 'docker ps -a' },
      { name: '镜像列表', command: 'docker images' },
      { name: '系统清理', command: 'docker system prune -f' }
    ],
    systemctl: [
      { name: '服务状态', command: 'systemctl status nginx' },
      { name: '重启服务', command: 'systemctl restart nginx' },
      { name: '查看日志', command: 'journalctl -u nginx -n 50' }
    ],
    file: [
      { name: '目录列表', command: 'ls -la' },
      { name: '磁盘使用', command: 'du -sh *' },
      { name: '查找文件', command: 'find . -name "*.log" -type f' }
    ]
  }
  
  quickCommands.value = commandTemplates[methodType] || []
}

// 设置快速命令
const setQuickCommand = (command) => {
  paramForm.command = command
}

// 添加动态参数
const addParameter = () => {
  paramForm.parameters.push({
    name: '',
    description: '',
    required: false,
    default: ''
  })
}

// 删除动态参数
const removeParameter = (index) => {
  paramForm.parameters.splice(index, 1)
}

// 验证API端点名称
const validateApiEndpoint = () => {
  const endpoint = paramForm.apiEndpoint
  if (!endpoint) {
    apiEndpointError.value = ''
    return true
  }
  
  // API端点名称格式验证
  const validPattern = /^[a-zA-Z0-9_-]+$/
  if (!validPattern.test(endpoint)) {
    apiEndpointError.value = '只能包含字母、数字、连字符(-)和下划线(_)'
    return false
  }
  
  // 长度验证
  if (endpoint.length < 2) {
    apiEndpointError.value = '端点名称长度至少为2个字符'
    return false
  }
  
  if (endpoint.length > 50) {
    apiEndpointError.value = '端点名称长度不能超过50个字符'
    return false
  }
  
  // 不能以数字开头
  if (/^\d/.test(endpoint)) {
    apiEndpointError.value = '端点名称不能以数字开头'
    return false
  }
  
  // 不能以连字符或下划线开头/结尾
  if (/^[-_]|[-_]$/.test(endpoint)) {
    apiEndpointError.value = '端点名称不能以连字符或下划线开头/结尾'
    return false
  }
  
  // 保留关键字检查
  const reservedWords = ['api', 'admin', 'auth', 'login', 'logout', 'dashboard', 'servers', 'parameters', 'tasks', 'logs', 'settings', 'monitor']
  if (reservedWords.includes(endpoint.toLowerCase())) {
    apiEndpointError.value = `"${endpoint}" 是保留关键字，请使用其他名称`
    return false
  }
  
  apiEndpointError.value = ''
  return true
}

// 获取API预览URL
const getApiPreviewUrl = () => {
  const baseUrl = window.location.origin
  const endpoint = paramForm.apiEndpoint
  
  if (!endpoint) return ''
  
  // 根据动态参数生成示例URL
  let url = `${baseUrl}/api/${endpoint}`
  
  // 构建参数数组
  const urlParams = []
  
  // 如果有API密钥，首先添加key参数
  if (paramForm.apiKey) {
    urlParams.push(`key=${paramForm.apiKey}`)
  }
  
  // 添加动态参数
  if (paramForm.parameters && paramForm.parameters.length > 0) {
    const dynamicParams = paramForm.parameters
      .map(param => `${param.name}=${param.default || 'value'}`)
    urlParams.push(...dynamicParams)
  }
  
  // 如果有参数，添加到URL
  if (urlParams.length > 0) {
    url += `?${urlParams.join('&')}`
  }
  
  return url
}

// 生成cURL示例
const getCurlExample = () => {
  const url = getApiPreviewUrl()
  if (!url) return ''
  
  // 如果URL中已包含key参数，就不需要Authorization header
  if (paramForm.apiKey) {
    return `curl "${url}"`
  } else {
    return `curl -H "Authorization: Bearer YOUR_TOKEN" "${url}"`
  }
}

// 生成JavaScript示例
const getJavaScriptExample = () => {
  const endpoint = paramForm.apiEndpoint
  if (!endpoint) return ''
  
  // 构建参数对象
  const allParams = []
  
  // 添加key参数（如果有）
  if (paramForm.apiKey) {
    allParams.push(`  key: '${paramForm.apiKey}' // API密钥`)
  }
  
  // 添加动态参数
  if (paramForm.parameters && paramForm.parameters.length > 0) {
    const dynamicParams = paramForm.parameters
      .map(param => `  ${param.name}: '${param.default || 'value'}' // ${param.description || '参数值'}`)
    allParams.push(...dynamicParams)
  }
  
  if (allParams.length === 0) {
    // 没有参数的情况
    if (paramForm.apiKey) {
      return `fetch('/api/${endpoint}?key=${paramForm.apiKey}').then(res => res.json())`
    } else {
      return `fetch('/api/${endpoint}', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
}).then(res => res.json())`
    }
  }
  
  const paramExamples = allParams.join(',\n')
  const headersCode = paramForm.apiKey ? '' : ',\n  headers: { \'Authorization\': \'Bearer YOUR_TOKEN\' }'
  
  return `const params = {
${paramExamples}
}

const queryString = new URLSearchParams(params).toString()
fetch(\`/api/${endpoint}?\${queryString}\`${headersCode}).then(res => res.json())`
}

onMounted(() => {
  loadParameters()
  loadServers()
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

.dialog-footer {
  text-align: right;
}

/* 操作按钮横排对齐 */
.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-start;
}

.action-buttons .el-button {
  margin: 0;
}

/* 现代化表格样式 */
:deep(.el-table) {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

:deep(.el-table th.el-table__cell) {
  background: #6366f1;
  color: white;
  font-weight: 600;
  border: none;
}

:deep(.el-table tr:hover > td) {
  background-color: rgba(99, 102, 241, 0.05) !important;
}

:deep(.el-table td.el-table__cell) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
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
  transition: all 0.3s ease;
}

:deep(.el-button--danger:hover) {
  background: #b91c1c;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(220, 38, 38, 0.4);
}

:deep(.el-button) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

/* 标签样式 */
:deep(.el-tag) {
  border-radius: 20px;
  font-weight: 500;
  border: none;
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
  background: rgba(99, 102, 241, 0.05);
  border-radius: 16px 16px 0 0;
  padding: 20px;
}

:deep(.el-dialog__title) {
  font-weight: 600;
  color: #2c3e50;
}

/* 表单样式 */
:deep(.el-form-item__label) {
  font-weight: 500;
  color: #2c3e50;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 4px 12px rgba(0, 180, 219, 0.15);
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-input-number) {
  border-radius: 8px;
}

/* 警告框样式 */
:deep(.el-alert) {
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

/* 表单网格布局 */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  margin-bottom: 25px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  /* 参数表格在小屏幕上的响应式调整 */
  .param-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .param-grid-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

@media (min-width: 769px) {
  .param-grid {
    display: grid;
    grid-template-columns: 2fr 3fr 2fr 80px 60px;
    gap: 15px;
    align-items: center;
  }
}
</style>