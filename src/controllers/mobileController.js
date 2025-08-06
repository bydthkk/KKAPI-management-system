const { Task, Parameter, Server, User, sequelize } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

/**
 * 获取移动端简化的仪表板数据
 */
const getMobileDashboard = async (req, res, next) => {
  try {
    // 获取基础统计信息
    const [
      serverCount,
      onlineServerCount,
      taskCount,
      recentTaskCount,
      failedTaskCount
    ] = await Promise.all([
      Server.count(),
      Server.count({ where: { status: 'online' } }),
      Task.count(),
      Task.count({ 
        where: { 
          createdAt: {
            [Op.gte]: sequelize.literal("datetime('now', '-24 hours')")
          }
        }
      }),
      Task.count({ 
        where: { 
          status: 'failed',
          createdAt: {
            [Op.gte]: sequelize.literal("datetime('now', '-24 hours')")
          }
        }
      })
    ]);

    // 获取最近的任务（移动端只显示5个）
    const recentTasks = await Task.findAll({
      include: [
        {
          model: Parameter,
          as: 'parameter',
          attributes: ['name'],
          include: [
            {
              model: Server,
              as: 'server',
              attributes: ['name', 'host']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'method', 'status', 'createdAt', 'progress']
    });

    // 简化任务数据
    const formattedTasks = recentTasks.map(task => ({
      id: task.id,
      server: task.parameter?.server?.name || '未知',
      status: task.status,
      time: formatMobileTime(task.createdAt),
      progress: task.progress || 0
    }));

    // 计算系统健康状态
    const healthScore = calculateHealthScore(onlineServerCount, serverCount, failedTaskCount, recentTaskCount);

    res.json({
      success: true,
      data: {
        stats: {
          servers: {
            total: serverCount,
            online: onlineServerCount,
            offline: serverCount - onlineServerCount
          },
          tasks: {
            total: taskCount,
            recent: recentTaskCount,
            failed: failedTaskCount
          }
        },
        health: {
          score: healthScore,
          status: getHealthStatus(healthScore)
        },
        recentTasks: formattedTasks,
        lastUpdate: new Date().toISOString()
      },
      _mobile: {
        optimized: true,
        version: '1.0',
        cacheAge: 300 // 5分钟
      }
    });
  } catch (error) {
    logger.error('Mobile dashboard error:', error);
    next(error);
  }
};

/**
 * 获取移动端简化的服务器列表
 */
const getMobileServers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: servers } = await Server.findAndCountAll({
      attributes: ['id', 'name', 'host', 'port', 'status', 'osName', 'osIcon', 'updatedAt'],
      order: [['status', 'DESC'], ['name', 'ASC']], // 在线服务器优先
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 简化服务器数据
    const formattedServers = servers.map(server => ({
      id: server.id,
      name: server.name,
      host: server.host,
      port: server.port,
      status: server.status,
      os: server.osName || 'Unknown',
      osIcon: server.osIcon,
      lastCheck: formatMobileTime(server.updatedAt),
      isOnline: server.status === 'online'
    }));

    res.json({
      success: true,
      data: formattedServers,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(count / limit),
        limit: parseInt(limit),
        count
      },
      _mobile: {
        optimized: true,
        suggested_limit: 8 // 移动端建议每页8个
      }
    });
  } catch (error) {
    logger.error('Mobile servers error:', error);
    next(error);
  }
};

/**
 * 获取移动端简化的任务列表
 */
const getMobileTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    const whereCondition = {};
    if (status) {
      whereCondition.status = status;
    }

    const { count, rows: tasks } = await Task.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Parameter,
          as: 'parameter',
          attributes: ['name'],
          include: [
            {
              model: Server,
              as: 'server',
              attributes: ['name', 'host']
            }
          ]
        }
      ],
      attributes: ['id', 'method', 'status', 'progress', 'createdAt', 'endTime'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 简化任务数据
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      server: task.parameter?.server?.name || '未知',
      method: task.method,
      status: task.status,
      progress: task.progress || 0,
      startTime: formatMobileTime(task.createdAt),
      duration: calculateDuration(task.createdAt, task.endTime),
      statusColor: getStatusColor(task.status)
    }));

    res.json({
      success: true,
      data: formattedTasks,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(count / limit),
        limit: parseInt(limit),
        count
      },
      filters: {
        status: ['waiting', 'running', 'success', 'failed']
      },
      _mobile: {
        optimized: true,
        suggested_limit: 8
      }
    });
  } catch (error) {
    logger.error('Mobile tasks error:', error);
    next(error);
  }
};

/**
 * 获取移动端设备信息
 */
const getMobileDeviceInfo = async (req, res, next) => {
  try {
    const deviceInfo = req.device || {};
    
    res.json({
      success: true,
      data: {
        device: deviceInfo,
        serverTime: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        recommendations: getMobileRecommendations(deviceInfo)
      }
    });
  } catch (error) {
    logger.error('Mobile device info error:', error);
    next(error);
  }
};

/**
 * 移动端快速操作 - 执行预定义任务
 */
const executeMobileQuickTask = async (req, res, next) => {
  try {
    const { parameterId } = req.params;
    const { params = {} } = req.body;

    // 查找参数配置
    const parameter = await Parameter.findOne({
      where: { id: parameterId },
      include: [{
        model: Server,
        as: 'server'
      }]
    });

    if (!parameter) {
      return res.status(404).json({
        success: false,
        message: '参数配置不存在'
      });
    }

    if (!parameter.server) {
      return res.status(400).json({
        success: false,
        message: '服务器配置不存在'
      });
    }

    // 创建任务记录
    const task = await Task.create({
      parameterId: parameter.id,
      serverId: parameter.server.id,
      method: 'mobile-quick',
      command: parameter.command,
      status: 'waiting',
      progress: 0,
      startTime: new Date()
    });

    logger.info('Mobile quick task created', {
      taskId: task.id,
      parameterId,
      deviceType: req.device?.deviceType,
      executedBy: req.user?.username
    });

    res.json({
      success: true,
      data: {
        taskId: task.id,
        status: 'waiting',
        message: '任务已创建，正在执行中...'
      },
      _mobile: {
        optimized: true,
        quickTask: true
      }
    });
  } catch (error) {
    logger.error('Mobile quick task error:', error);
    next(error);
  }
};

// 辅助函数
const formatMobileTime = (date) => {
  if (!date) return '未知';
  
  const now = new Date();
  const targetDate = new Date(date);
  const diff = now - targetDate;
  
  // 小于1分钟
  if (diff < 60000) {
    return '刚刚';
  }
  
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`;
  }
  
  // 小于24小时
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`;
  }
  
  // 大于24小时
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`;
  }
  
  // 返回具体日期
  return targetDate.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const calculateHealthScore = (onlineServers, totalServers, failedTasks, totalRecentTasks) => {
  let score = 100;
  
  // 服务器在线率影响
  if (totalServers > 0) {
    const serverScore = (onlineServers / totalServers) * 60;
    score = Math.min(score, 40 + serverScore);
  }
  
  // 任务成功率影响
  if (totalRecentTasks > 0) {
    const taskSuccessRate = (totalRecentTasks - failedTasks) / totalRecentTasks;
    const taskScore = taskSuccessRate * 40;
    score = Math.min(score, score * 0.6 + taskScore);
  }
  
  return Math.round(score);
};

const getHealthStatus = (score) => {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'critical';
};

const getStatusColor = (status) => {
  const colorMap = {
    'success': '#10b981',
    'failed': '#ef4444',
    'running': '#3b82f6',
    'waiting': '#f59e0b'
  };
  return colorMap[status] || '#6b7280';
};

const calculateDuration = (startTime, endTime) => {
  if (!startTime) return '未知';
  if (!endTime) return '进行中';
  
  const duration = new Date(endTime) - new Date(startTime);
  if (duration < 1000) return '< 1秒';
  if (duration < 60000) return `${Math.floor(duration / 1000)}秒`;
  if (duration < 3600000) return `${Math.floor(duration / 60000)}分${Math.floor((duration % 60000) / 1000)}秒`;
  return `${Math.floor(duration / 3600000)}小时${Math.floor((duration % 3600000) / 60000)}分`;
};

const getMobileRecommendations = (deviceInfo) => {
  const recommendations = [];
  
  if (deviceInfo.isMobile) {
    recommendations.push({
      type: 'performance',
      message: '移动设备检测到，已启用数据优化模式'
    });
    
    if (deviceInfo.platform === 'ios') {
      recommendations.push({
        type: 'feature',
        message: '支持添加到主屏幕以获得类似原生应用的体验'
      });
    }
    
    recommendations.push({
      type: 'ui',
      message: '建议使用横屏模式以获得更好的表格查看体验'
    });
  }
  
  if (deviceInfo.isTablet) {
    recommendations.push({
      type: 'performance',
      message: '平板设备检测到，已优化界面布局'
    });
  }
  
  return recommendations;
};

module.exports = {
  getMobileDashboard,
  getMobileServers,
  getMobileTasks,
  getMobileDeviceInfo,
  executeMobileQuickTask
};