const { Task, Parameter, Server, sequelize } = require('../models');
const logger = require('../utils/logger');

const getStats = async (req, res, next) => {
  try {
    // 获取统计数据
    const [
      serverCount,
      taskCount,
      successTaskCount,
      failedTaskCount
    ] = await Promise.all([
      Server.count(),
      Task.count(),
      Task.count({ where: { status: 'success' } }),
      Task.count({ where: { status: 'failed' } })
    ]);

    res.json({
      success: true,
      data: {
        servers: serverCount,
        tasks: taskCount,
        successTasks: successTaskCount,
        failedTasks: failedTaskCount
      }
    });
  } catch (error) {
    next(error);
  }
};

const getRecentTasks = async (req, res, next) => {
  try {
    const tasks = await Task.findAll({
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
      limit: 10
    });

    const formattedTasks = tasks.map(task => ({
      id: task.id,
      server: task.parameter?.server ? `${task.parameter.server.name} (${task.parameter.server.host}:${task.parameter.server.port})` : '未知服务器',
      method: task.method,
      status: getStatusText(task.status),
      createTime: formatDate(task.createdAt)
    }));

    res.json({
      success: true,
      data: formattedTasks
    });
  } catch (error) {
    next(error);
  }
};

const getSystemStatus = async (req, res, next) => {
  try {
    // 检查API服务状态
    const apiStatus = true; // 如果能到达这里说明API正常

    // 检查SSH连接状态
    const onlineServers = await Server.count({ where: { status: 'online' } });
    const sshStatus = onlineServers > 0;

    // 检查队列状态
    const runningTasks = await Task.count({ where: { status: 'running' } });
    const queueStatus = runningTasks < 3; // 假设最大并发数为3

    res.json({
      success: true,
      data: {
        api: apiStatus,
        ssh: sshStatus,
        queue: queueStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTaskStatsByDate = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    
    const stats = await Task.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', 
          sequelize.literal("CASE WHEN status = 'success' THEN 1 ELSE 0 END")
        ), 'success'],
        [sequelize.fn('SUM', 
          sequelize.literal("CASE WHEN status = 'failed' THEN 1 ELSE 0 END")
        ), 'failed']
      ],
      where: {
        createdAt: {
          [sequelize.Op.gte]: sequelize.literal(`DATE('now', '-${days} days')`)
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// 辅助函数
const getStatusText = (status) => {
  const statusMap = {
    'waiting': '等待中',
    'running': '运行中',
    'success': '成功',
    'failed': '失败'
  };
  return statusMap[status] || status;
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

module.exports = {
  getStats,
  getRecentTasks,
  getSystemStatus,
  getTaskStatsByDate
};