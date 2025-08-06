<template>
  <el-dialog
    :title="`终端 - ${serverName}`"
    v-model="visible"
    width="80%"
    :before-close="handleClose"
    destroy-on-close
  >
    <div class="terminal-container">
      <div ref="terminalElement" class="terminal"></div>
    </div>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="clearTerminal">清屏</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { io } from 'socket.io-client'
import { ElMessage } from 'element-plus'
import '@xterm/xterm/css/xterm.css'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  serverId: {
    type: Number,
    required: true
  },
  serverName: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = ref(false)
const terminalElement = ref()
let terminal = null
let fitAddon = null
let socket = null

watch(() => props.modelValue, (newVal) => {
  visible.value = newVal
  if (newVal) {
    // 延迟一点时间确保DOM完全渲染
    setTimeout(() => {
      initTerminal()
    }, 100)
  }
})

watch(visible, (newVal) => {
  emit('update:modelValue', newVal)
})

const initTerminal = async () => {
  try {
    // 先清理之前的实例
    if (terminal) {
      terminal.dispose()
      terminal = null
    }
    if (socket) {
      socket.disconnect()
      socket = null
    }
    
    console.log('Initializing terminal for server:', props.serverId)
    console.log('Terminal element:', terminalElement.value)
    
    if (!terminalElement.value) {
      console.error('Terminal element not found')
      return
    }
    
    // 创建终端实例
    terminal = new XTerm({
      fontSize: 14,
      fontFamily: 'monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selection: '#ffffff40'
      },
      cursorBlink: true,
      cols: 80,
      rows: 24,
      allowTransparency: false,
      convertEol: true
    })

    console.log('XTerm instance created:', terminal)

    // 添加 fit 插件
    fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    console.log('FitAddon loaded')

    // 打开终端
    terminal.open(terminalElement.value)
    console.log('Terminal opened')
    
    fitAddon.fit()
    console.log('Terminal fitted')
    
    // 测试终端是否正常工作
    terminal.writeln('终端初始化完成...')
    console.log('Test message written to terminal')

    // 创建Socket连接
    const token = localStorage.getItem('token')
    const socketUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : window.location.origin
    socket = io(socketUrl, {
      auth: {
        token: token
      }
    })

    // Socket事件处理
    socket.on('connect', () => {
      console.log('Socket connected')
      terminal.writeln('正在连接服务器...')
      console.log('Emitting create-terminal with serverId:', props.serverId)
      socket.emit('create-terminal', { serverId: props.serverId })
    })

    socket.on('terminal-ready', () => {
      console.log('Terminal ready received')
      terminal.clear()
      terminal.writeln('\\r\\n终端连接成功！\\r\\n')
    })

    socket.on('terminal-output', (data) => {
      console.log('Terminal output received:', data)
      terminal.write(data.data)
    })

    socket.on('terminal-error', (data) => {
      console.log('Terminal error received:', data)
      terminal.writeln(`\\r\\n\\x1b[31m错误: ${data.error}\\x1b[0m\\r\\n`)
      ElMessage.error(data.error)
    })

    socket.on('terminal-closed', () => {
      console.log('Terminal closed received')
      terminal.writeln('\\r\\n\\x1b[33m连接已断开\\x1b[0m\\r\\n')
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      terminal.writeln(`\\r\\n\\x1b[31m连接错误: ${error.message}\\x1b[0m\\r\\n`)
      ElMessage.error('Socket连接失败')
    })

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      terminal.writeln(`\\r\\n\\x1b[33m连接断开: ${reason}\\x1b[0m\\r\\n`)
    })

    // 监听用户输入
    terminal.onData((data) => {
      if (socket && socket.connected) {
        socket.emit('terminal-input', { input: data })
      }
    })

    // 监听窗口大小变化
    terminal.onResize((size) => {
      if (socket && socket.connected) {
        socket.emit('terminal-resize', { rows: size.rows, cols: size.cols })
      }
    })

    // 窗口大小自适应
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddon) {
        fitAddon.fit()
      }
    })
    resizeObserver.observe(terminalElement.value)

  } catch (error) {
    console.error('Failed to initialize terminal:', error)
    ElMessage.error('终端初始化失败')
  }
}

const clearTerminal = () => {
  if (terminal) {
    terminal.clear()
  }
}

const handleClose = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
  
  if (terminal) {
    terminal.dispose()
    terminal = null
  }
  
  fitAddon = null
  visible.value = false
}

onUnmounted(() => {
  handleClose()
})
</script>

<style scoped>
.terminal-container {
  height: 500px;
  background-color: #1e1e1e;
  border-radius: 4px;
  padding: 10px;
}

.terminal {
  height: 100%;
  width: 100%;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 确保 xterm 样式正确加载 */
:deep(.xterm) {
  height: 100% !important;
  width: 100% !important;
}

:deep(.xterm-viewport) {
  background-color: #1e1e1e !important;
}

:deep(.xterm-screen) {
  background-color: #1e1e1e !important;
}
</style>