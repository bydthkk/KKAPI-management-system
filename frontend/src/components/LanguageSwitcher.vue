<template>
  <div class="language-switcher">
    <el-dropdown @command="handleLanguageChange" trigger="click">
      <span class="language-trigger">
        <el-icon class="language-icon">
          <Operation />
        </el-icon>
        <span class="language-text">{{ currentLanguageLabel }}</span>
        <el-icon class="dropdown-icon">
          <ArrowDown />
        </el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item 
            command="zh" 
            :class="{ active: currentLocale === 'zh' }"
          >
            <div class="language-option">
              <span class="flag">🇨🇳</span>
              <span class="label">{{ t('locale.chinese') }}</span>
              <el-icon v-if="currentLocale === 'zh'" class="check-icon">
                <Check />
              </el-icon>
            </div>
          </el-dropdown-item>
          <el-dropdown-item 
            command="en" 
            :class="{ active: currentLocale === 'en' }"
          >
            <div class="language-option">
              <span class="flag">🇺🇸</span>
              <span class="label">{{ t('locale.english') }}</span>
              <el-icon v-if="currentLocale === 'en'" class="check-icon">
                <Check />
              </el-icon>
            </div>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { Operation, ArrowDown, Check } from '@element-plus/icons-vue'
import { changeLocale } from '../i18n'

const { locale, t } = useI18n()

// 当前语言
const currentLocale = computed(() => locale.value)

// 当前语言标签
const currentLanguageLabel = computed(() => {
  return locale.value === 'zh' ? t('locale.chinese') : t('locale.english')
})

// 语言切换处理
const handleLanguageChange = (command) => {
  if (command === currentLocale.value) {
    return
  }
  
  try {
    changeLocale(command)
    
    // 显示成功消息
    setTimeout(() => {
      ElMessage.success(t('locale.languageChanged'))
    }, 100)
    
    // 可选：刷新页面以确保所有组件都更新
    // setTimeout(() => {
    //   window.location.reload()
    // }, 500)
  } catch (error) {
    console.error('Language change failed:', error)
    ElMessage.error('Language change failed')
  }
}
</script>

<style scoped>
.language-switcher {
  display: inline-block;
}

.language-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--el-text-color-primary);
  font-size: 14px;
  user-select: none;
}

.language-trigger:hover {
  background: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

.language-icon {
  font-size: 16px;
}

.language-text {
  font-weight: 500;
}

.dropdown-icon {
  font-size: 12px;
  transition: transform 0.3s ease;
}

.language-trigger:hover .dropdown-icon {
  transform: rotate(180deg);
}

.language-option {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 140px;
}

.flag {
  font-size: 16px;
}

.label {
  flex: 1;
  font-weight: 500;
}

.check-icon {
  font-size: 16px;
  color: var(--el-color-primary);
}

:deep(.el-dropdown-menu__item) {
  padding: 8px 16px;
}

:deep(.el-dropdown-menu__item.active) {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}

:deep(.el-dropdown-menu__item:hover) {
  background: var(--el-fill-color-light);
}

/* 暗色主题适配 */
@media (prefers-color-scheme: dark) {
  .language-trigger:hover {
    background: var(--el-fill-color-dark);
  }
}
</style>