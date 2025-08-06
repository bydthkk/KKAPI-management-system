const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');

const config = require('./src/config/config');
const { testConnection, syncDatabase } = require('./src/models');
const { initTaskQueue } = require('./src/controllers/taskController');
const serverStatusService = require('./src/services/serverStatusService');
const logger = require('./src/utils/logger');
const routes = require('./src/routes');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const { deviceDetection, mobileOptimization, apiResponseOptimization } = require('./src/middleware/deviceDetection');
const { analyticsMiddleware } = require('./src/middleware/mobileAnalytics');

const app = express();
const server = http.createServer(app);

// 全局中间件：强制所有响应不缓存
app.use((req, res, next) => {
  // 为所有响应设置强制不缓存的头部
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('ETag', Date.now().toString()); // 每次都不同的ETag
  next();
});

app.use(helmet({
  contentSecurityPolicy: false // 允许内联脚本和样式
}));
app.use(cors());

// 移动设备检测中间件
app.use(deviceDetection);
app.use(mobileOptimization);
app.use(analyticsMiddleware);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// 静态文件服务 - 简化配置，依赖全局不缓存中间件
app.use(express.static(path.join(__dirname, 'public')));
// 服务器发行版图标静态文件
app.use('/icon', express.static(path.join(__dirname, 'icon')));

// API路由 - 添加移动设备API响应优化
app.use('/api', apiResponseOptimization, routes);

// 错误处理中间件放在最后
app.use(errorHandler);

// SPA fallback - 简化路由，依赖全局不缓存中间件
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO 配置
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 终端Socket处理
const terminalService = require('./src/services/terminalService');
const jwt = require('jsonwebtoken');
const { Server } = require('./src/models');

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('No token provided'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('create-terminal', async (data) => {
    try {
      const { serverId } = data;
      const server = await Server.findByPk(serverId);
      
      if (!server) {
        socket.emit('terminal-error', { error: '服务器不存在' });
        return;
      }

      const connectionConfig = {
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password
      };

      const terminalId = terminalService.createTerminal(serverId, connectionConfig, socket);
      socket.terminalId = terminalId;
      
    } catch (error) {
      logger.error('Failed to create terminal:', error);
      socket.emit('terminal-error', { error: '创建终端失败' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
    if (socket.terminalId) {
      terminalService.closeTerminal(socket.terminalId);
    }
  });
});

// 初始化应用
const initializeApp = async () => {
  try {
    // 测试数据库连接
    await testConnection();
    
    // 同步数据库
    await syncDatabase();
    
    // 初始化任务队列
    await initTaskQueue();
    
    // 启动服务器状态定期检测服务
    serverStatusService.start();
    
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

server.listen(config.port, '0.0.0.0', async () => {
  logger.info(`API Management System started on port ${config.port}`);
  logger.info(`Environment: ${config.nodeEnv}`);
  logger.info(`Process ID: ${process.pid}`);
  
  // 初始化应用
  await initializeApp();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  serverStatusService.stop();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  serverStatusService.stop();
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;