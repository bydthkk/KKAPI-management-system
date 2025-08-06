const { Task, Parameter, Server } = require('../models');
const sshService = require('../services/sshService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

// 队列管理
const taskQueue = [];
const runningTasks = new Map();

// 定期清理已完成的任务，防止内存泄漏
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10分钟
  
  for (const [taskId, taskData] of runningTasks.entries()) {
    // 如果任务已完成且超过10分钟，从内存中清除
    if (taskData.status !== 'running' && 
        taskData.endTime && 
        (now - new Date(taskData.endTime).getTime()) > maxAge) {
      runningTasks.delete(taskId);
      logger.debug_dev('Cleaned up completed task from memory:', { taskId, status: taskData.status });
    }
  }
  
  // 清理孤立的任务（没有对应数据库记录的任务）
  if (runningTasks.size > 100) {
    logger.warn('RunningTasks map growing large, checking for orphaned tasks', { size: runningTasks.size });
  }
}, 5 * 60 * 1000); // 每5分钟清理一次

const getTasks = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      pageSize = 20, 
      status, 
      method, 
      command 
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (method) where.method = method;
    if (command) where.command = { [require('sequelize').Op.like]: `%${command}%` };

    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize);

    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [
        {
          model: Parameter,
          as: 'parameter',
          attributes: ['name'],
          include: [
            {
              model: Server,
              as: 'server',
              attributes: ['name', 'host', 'port']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });

    res.json({
      success: true,
      data: {
        list: rows,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id, {
      include: [
        {
          model: Parameter,
          as: 'parameter',
          include: [
            {
              model: Server,
              as: 'server',
              attributes: ['name', 'host', 'port']
            }
          ]
        }
      ]
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    next(error);
  }
};

const executeTask = async (req, res, next) => {
  try {
    const { parameterId, serverId, method, command } = req.body;

    // 验证参数组存在
    const parameter = await Parameter.findByPk(parameterId);
    if (!parameter) {
      return res.status(404).json({
        success: false,
        message: '参数组不存在'
      });
    }

    // 验证服务器存在
    const server = await Server.findByPk(serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: '服务器不存在'
      });
    }

    // 检查队列状态
    const queueFile = path.join(__dirname, `../../time_${server.host}`);
    try {
      const queueTime = await fs.readFile(queueFile, 'utf8');
      const waitTime = parseInt(queueTime) - Math.floor(Date.now() / 1000);
      if (waitTime > 0) {
        return res.status(429).json({
          success: false,
          message: `攻击队列 1/1 (请等待 ${waitTime} 秒后再试)`
        });
      }
    } catch (error) {
      // 队列文件不存在，可以继续
    }

    // 创建任务
    const task = await Task.create({
      parameterId,
      serverId,
      method,
      command,
      status: 'waiting'
    });

    // 添加到队列
    taskQueue.push(task.id);
    processTaskQueue();

    logger.info('Task created and queued', { 
      taskId: task.id, 
      method,
      serverId,
      command,
      createdBy: req.user.username 
    });

    res.status(201).json({
      success: true,
      data: task,
      message: '任务已提交，正在队列中等待执行'
    });
  } catch (error) {
    next(error);
  }
};

const stopTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await Task.findByPk(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }

    if (task.status !== 'running') {
      return res.status(400).json({
        success: false,
        message: '只能停止正在运行的任务'
      });
    }

    // 从运行中任务移除并更新状态
    if (runningTasks.has(id)) {
      const taskData = runningTasks.get(id);
      if (taskData) {
        taskData.status = 'stopped';
        taskData.endTime = new Date();
      }
    }

    // 更新任务状态
    await task.update({
      status: 'failed',
      endTime: new Date(),
      error: '任务被用户手动停止'
    });

    logger.info('Task stopped by user', { 
      taskId: id,
      stoppedBy: req.user?.username || 'system'
    });

    res.json({
      success: true,
      message: '任务已停止'
    });
  } catch (error) {
    next(error);
  }
};

const clearTasks = async (req, res, next) => {
  try {
    // 首先停止所有运行中的任务
    const runningTaskIds = Array.from(runningTasks.keys());
    runningTasks.clear();
    
    // 清空任务队列
    taskQueue.length = 0;
    
    // 获取删除前的任务数量（快速统计）
    const taskCountBefore = await Task.count();
    logger.debug_dev(`删除前任务数量: ${taskCountBefore}`);
    
    // 立即返回成功响应
    res.json({
      success: true,
      message: `开始清空 ${taskCountBefore} 条任务记录...`,
      details: {
        estimatedTasks: taskCountBefore,
        stoppedRunningTasks: runningTaskIds.length,
        status: 'processing'
      }
    });

    // 异步删除任务，不阻塞响应
    setImmediate(async () => {
      try {
        // 批量删除，提高性能
        const result = await Task.destroy({
          where: {},
          force: true, // 强制删除
          truncate: false, // 不使用truncate
          // 增加批处理大小以提高性能
          limit: 10000 // 分批处理
        });
        
        // 验证删除结果
        const taskCountAfter = await Task.count();
        logger.debug_dev(`删除后任务数量: ${taskCountAfter}`);

        logger.info('All tasks cleared by user (async)', { 
          taskCountBefore,
          taskCountAfter,
          actualDeleted: result,
          runningTasksStopped: runningTaskIds.length,
          clearedBy: req.user?.username || 'system',
          ip: req.ip 
        });
      } catch (error) {
        logger.error('Failed to clear tasks asynchronously:', error);
      }
    });

  } catch (error) {
    logger.error('Failed to clear tasks:', error);
    res.status(500).json({
      success: false,
      message: '清空任务失败: ' + error.message
    });
  }
};

// 处理任务队列
const processTaskQueue = async () => {
  if (taskQueue.length === 0 || runningTasks.size >= 3) {
    return; // 没有待处理任务或已达到最大并发数
  }

  const taskId = taskQueue.shift();
  if (runningTasks.has(taskId)) {
    return; // 任务已在运行
  }

  try {
    const task = await Task.findByPk(taskId);
    if (!task || task.status !== 'waiting') {
      return processTaskQueue(); // 继续处理下一个任务
    }

    // 标记任务为运行中
    runningTasks.set(taskId, true);
    await task.update({
      status: 'running',
      startTime: new Date(),
      progress: 0
    });

    logger.info('Task execution started', { taskId: task.id });

    // 执行任务
    executeTaskInternal(task);
    
    // 继续处理队列中的其他任务
    setTimeout(() => processTaskQueue(), 1000);
  } catch (error) {
    logger.error('Error processing task queue:', error);
    // 任务执行失败，更新状态但保留供日志查询
    const taskData = runningTasks.get(taskId);
    if (taskData) {
      taskData.status = 'failed';
      taskData.endTime = new Date();
    }
    setTimeout(() => processTaskQueue(), 5000);
  }
};

// 执行具体任务
const executeTaskInternal = async (task) => {
  try {
    // 获取任务绑定的服务器
    const server = await Server.findByPk(task.serverId);

    if (!server) {
      throw new Error('任务绑定的服务器不存在');
    }

    // 通过SSH执行命令
    const connectionConfig = {
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password
    };

    logger.info('Executing SSH command', { 
      taskId: task.id,
      command: task.command,
      method: task.method,
      server: server.host 
    });

    // 更新进度
    await task.update({ progress: 10 });

    const result = await sshService.executeCommand(connectionConfig, task.command);

    if (result.success) {
      // 写入队列文件
      const queueFile = path.join(__dirname, `../../time_${server.host}`);
      const endTime = Math.floor(Date.now() / 1000) + 60; // 默认60秒冷却时间
      await fs.writeFile(queueFile, endTime.toString());

      await task.update({
        status: 'success',
        progress: 100,
        output: result.stdout,
        endTime: new Date()
      });

      logger.info('Task completed successfully', { 
        taskId: task.id,
        exitCode: result.exitCode 
      });
    } else {
      await task.update({
        status: 'failed',
        progress: 0,
        error: result.stderr || 'Unknown error',
        endTime: new Date()
      });

      logger.error('Task execution failed', { 
        taskId: task.id,
        error: result.stderr 
      });
    }
  } catch (error) {
    logger.error('Task execution error:', { taskId: task.id, error: error.message });
    
    await task.update({
      status: 'failed',
      progress: 0,
      error: error.message,
      endTime: new Date()
    });
  } finally {
    // 更新任务状态但保留供短时间查询
    const taskData = runningTasks.get(task.id);
    if (taskData) {
      taskData.status = 'completed';
      taskData.endTime = new Date();
    }
    // 继续处理队列
    setTimeout(() => processTaskQueue(), 1000);
  }
};

// 启动时处理未完成的任务
const initTaskQueue = async () => {
  try {
    // 将运行中但实际未运行的任务重置为等待状态
    await Task.update(
      { status: 'waiting' },
      { where: { status: 'running' } }
    );

    // 将等待中的任务加入队列
    const waitingTasks = await Task.findAll({
      where: { status: 'waiting' },
      order: [['createdAt', 'ASC']]
    });

    waitingTasks.forEach(task => {
      taskQueue.push(task.id);
    });

    // 开始处理队列
    processTaskQueue();

    logger.info('Task queue initialized', { queueSize: taskQueue.length });
  } catch (error) {
    logger.error('Error initializing task queue:', error);
  }
};

module.exports = {
  getTasks,
  getTask,
  executeTask,
  stopTask,
  clearTasks,
  initTaskQueue
};