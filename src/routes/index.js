const express = require('express');
const router = express.Router();

// 导入路由模块
const authRoutes = require('./auth');
const sshRoutes = require('./ssh');
const serverRoutes = require('./servers');
const parameterRoutes = require('./parameters');
const taskRoutes = require('./tasks');
const dashboardRoutes = require('./dashboard');
const logRoutes = require('./logs');
const monitorRoutes = require('./monitor');
const systemSettingsRoutes = require('./systemSettings');
const userRoutes = require('./users');
const mobileRoutes = require('./mobile');

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'API Management System',
    version: '1.0.0',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'User login',
        'POST /api/auth/logout': 'User logout',
        'GET /api/auth/profile': 'Get user profile',
        'PUT /api/auth/change-password': 'Change password'
      },
      servers: {
        'GET /api/servers': 'Get all servers',
        'POST /api/servers': 'Create server',
        'PUT /api/servers/:id': 'Update server',
        'DELETE /api/servers/:id': 'Delete server',
        'POST /api/servers/:id/test': 'Test server connection'
      },
      parameters: {
        'GET /api/parameters': 'Get all parameters',
        'POST /api/parameters': 'Create parameter',
        'PUT /api/parameters/:id': 'Update parameter',
        'DELETE /api/parameters/:id': 'Delete parameter'
      },
      tasks: {
        'GET /api/tasks': 'Get all tasks',
        'POST /api/tasks/execute': 'Execute task',
        'POST /api/tasks/:id/stop': 'Stop task'
      },
      dashboard: {
        'GET /api/dashboard/stats': 'Get dashboard statistics',
        'GET /api/dashboard/recent-tasks': 'Get recent tasks',
        'GET /api/dashboard/status': 'Get system status'
      },
      ssh: {
        'POST /api/ssh/test-connection': 'Test SSH connection',
        'POST /api/ssh/execute': 'Execute SSH command',
        'POST /api/ssh/server-info': 'Get server information',
        'GET /api/ssh/allowed-commands': 'Get allowed commands'
      },
      logs: {
        'GET /api/logs': 'Get system logs',
        'DELETE /api/logs': 'Clear logs',
        'GET /api/logs/download': 'Download logs'
      },
      monitor: {
        'GET /api/monitor/servers': 'Get all servers monitoring data',
        'GET /api/monitor/servers/:serverId': 'Get single server monitoring data'
      },
      systemSettings: {
        'GET /api/system-settings': 'Get all system settings',
        'GET /api/system-settings/:key': 'Get single system setting',
        'PUT /api/system-settings': 'Update system settings',
        'POST /api/system-settings/change-password': 'Change user password',
        'POST /api/system-settings/reset-defaults': 'Reset to default settings'
      },
      mobile: {
        'GET /api/mobile/dashboard': 'Get mobile optimized dashboard',
        'GET /api/mobile/servers': 'Get mobile optimized server list',
        'GET /api/mobile/tasks': 'Get mobile optimized task list',
        'GET /api/mobile/device-info': 'Get device information',
        'POST /api/mobile/quick-task/:parameterId': 'Execute quick task',
        'GET /api/mobile/health': 'Mobile health check',
        'GET /api/mobile/config': 'Get mobile configuration'
      }
    },
    timestamp: new Date().toISOString()
  });
});

router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 注册路由
router.use('/auth', authRoutes);
router.use('/ssh', sshRoutes);
router.use('/servers', serverRoutes);
router.use('/parameters', parameterRoutes);
router.use('/tasks', taskRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/logs', logRoutes);
router.use('/monitor', monitorRoutes);
router.use('/system-settings', systemSettingsRoutes);
router.use('/users', userRoutes);
router.use('/mobile', mobileRoutes);

// 动态API端点 - 通过apiEndpoint执行参数化命令
const { Parameter, Server, Task } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const sshService = require('../services/sshService');

// 动态API路由放在最后，并添加排除已定义路由的逻辑
router.get('/:apiEndpoint', authenticateToken, async (req, res, next) => {
  const { apiEndpoint } = req.params;
  
  // 排除已定义的路由路径
  const reservedRoutes = [
    'auth', 'ssh', 'servers', 'parameters', 'tasks', 
    'dashboard', 'logs', 'monitor', 'system-settings', 'users', 
    'health'
  ];
  
  if (reservedRoutes.includes(apiEndpoint)) {
    return next(); // 跳过动态路由处理
  }
  
  try {
    const paramValues = req.query;

    // 查找具有指定apiEndpoint的参数
    const parameter = await Parameter.findOne({
      where: { apiEndpoint },
      include: [{
        model: Server,
        as: 'server',
        attributes: ['id', 'name', 'host', 'port', 'username', 'password']
      }]
    });

    if (!parameter) {
      return next(); // 继续到下一个路由处理器
    }

    if (!parameter.server) {
      return res.status(400).json({
        success: false,
        message: '关联的服务器不存在'
      });
    }

    // 替换命令中的参数变量
    let command = parameter.command;
    
    if (parameter.parameters && Array.isArray(parameter.parameters)) {
      for (const param of parameter.parameters) {
        if (param.name && param.required && !paramValues[param.name]) {
          return res.status(400).json({
            success: false,
            message: `缺少必需参数: ${param.name}`,
            requiredParameters: parameter.parameters,
            example: `GET /api/${apiEndpoint}?${parameter.parameters.map(p => `${p.name}=${p.default || 'value'}`).join('&')}`
          });
        }
        
        const value = paramValues[param.name] || param.default || '';
        const placeholder = `[${param.name}]`;
        command = command.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      }
    }

    logger.info('Executing dynamic API endpoint', {
      apiEndpoint,
      parameterId: parameter.id,
      parameterName: parameter.name,
      serverId: parameter.server.id,
      serverHost: parameter.server.host,
      originalCommand: parameter.command,
      finalCommand: command,
      parameters: paramValues,
      executedBy: req.user?.username || 'system'
    });

    // 执行SSH命令
    const result = await sshService.executeCommand({
      host: parameter.server.host,
      port: parameter.server.port,
      username: parameter.server.username,
      password: parameter.server.password
    }, command);

    // 创建任务记录
    let task = null;
    try {
      task = await Task.create({
        parameterId: parameter.id,
        serverId: parameter.server.id,
        method: 'dynamic-api',
        command: command,
        status: result.success ? 'success' : 'failed',
        progress: result.success ? 100 : 0,
        output: result.stdout || null,
        error: result.stderr || null,
        startTime: new Date(result.timestamp),
        endTime: new Date()
      });

      logger.info('Dynamic API task record created', {
        taskId: task.id,
        apiEndpoint,
        parameterId: parameter.id,
        serverId: parameter.server.id,
        executedBy: req.user?.username || 'api-key-access'
      });
    } catch (error) {
      logger.error('Failed to create task record for dynamic API', {
        apiEndpoint,
        error: error.message
      });
    }

    res.json({
      success: true,
      data: {
        apiEndpoint,
        taskId: task?.id || null,
        parameter: {
          id: parameter.id,
          name: parameter.name,
          command: parameter.command,
          finalCommand: command
        },
        server: {
          id: parameter.server.id,
          name: parameter.server.name,
          host: parameter.server.host
        },
        result: result,
        executedAt: new Date().toISOString()
      },
      message: '命令执行成功'
    });

  } catch (error) {
    logger.error('Dynamic API endpoint execution failed', {
      apiEndpoint: req.params.apiEndpoint,
      error: error.message,
      executedBy: req.user?.username || 'system'
    });
    
    res.status(500).json({
      success: false,
      message: '命令执行失败',
      error: error.message
    });
  }
});

module.exports = router;