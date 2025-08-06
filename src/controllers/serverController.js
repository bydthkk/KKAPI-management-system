const { Server } = require('../models');
const sshService = require('../services/sshService');
const serverStatusService = require('../services/serverStatusService');
const logger = require('../utils/logger');

// 自动测试服务器连接的辅助函数
const autoTestConnection = async (server) => {
  try {
    const connectionConfig = {
      host: server.host,
      port: server.port,
      username: server.username,
      password: server.password
    };

    const result = await sshService.testConnection(connectionConfig);
    const statusToSet = result.success ? 'online' : 'offline';
    
    // 更新服务器状态和OS信息
    const updateData = {
      status: statusToSet,
      lastTestAt: new Date()
    };

    // 如果连接成功且检测到OS信息，保存到数据库
    if (result.success && result.osInfo) {
      updateData.osName = result.osInfo.osName;
      updateData.osVersion = result.osInfo.osVersion;
      updateData.osIcon = result.osInfo.osIcon;
      updateData.architecture = result.osInfo.architecture;
    }

    await server.update(updateData);

    logger.info('Auto server connection test completed', { 
      serverId: server.id, 
      host: server.host,
      success: result.success,
      status: statusToSet
    });

    return { success: result.success, status: statusToSet };
  } catch (error) {
    logger.error('Auto server connection test failed', { 
      serverId: server.id,
      host: server.host,
      error: error.message
    });

    // 测试失败时设置为离线状态
    try {
      await server.update({
        status: 'offline',
        lastTestAt: new Date()
      });
    } catch (updateError) {
      logger.error('Failed to update server status to offline', { error: updateError.message });
    }

    return { success: false, status: 'offline' };
  }
};

const getServers = async (req, res, next) => {
  try {
    // 获取分页参数
    const { page, limit } = req.query;
    const deviceInfo = req.device || {};
    
    // 构建查询选项
    const queryOptions = {
      order: [['status', 'DESC'], ['name', 'ASC']] // 在线服务器优先，然后按名称排序
    };
    
    // 如果是移动设备且请求了分页，应用分页
    if ((deviceInfo.isMobile || deviceInfo.isTablet) && page && limit) {
      const offset = (parseInt(page) - 1) * parseInt(limit);
      queryOptions.limit = parseInt(limit);
      queryOptions.offset = offset;
    }

    let result;
    if (queryOptions.limit) {
      result = await Server.findAndCountAll(queryOptions);
    } else {
      result = {
        rows: await Server.findAll(queryOptions),
        count: await Server.count()
      };
    }

    const serversWithStatus = result.rows.map(server => {
      const serverData = server.toJSON();
      const baseData = {
        ...serverData,
        createTime: new Date(serverData.createdAt).toLocaleString('zh-CN'),
        lastTestTime: serverData.lastTestAt ? new Date(serverData.lastTestAt).toLocaleString('zh-CN') : '未测试'
      };

      // 为移动设备简化数据
      if (deviceInfo.isMobile) {
        return {
          id: baseData.id,
          name: baseData.name,
          host: baseData.host,
          port: baseData.port,
          status: baseData.status,
          osName: baseData.osName,
          osIcon: baseData.osIcon,
          lastTestTime: baseData.lastTestTime,
          isOnline: baseData.status === 'online'
        };
      }

      return baseData;
    });

    const responseData = {
      success: true,
      data: serversWithStatus
    };

    // 添加分页信息
    if (queryOptions.limit) {
      responseData.pagination = {
        current: parseInt(page),
        total: Math.ceil(result.count / parseInt(limit)),
        limit: parseInt(limit),
        count: result.count
      };
      
      // 为移动设备添加优化建议
      if (deviceInfo.isMobile || deviceInfo.isTablet) {
        responseData._mobile = {
          optimized: true,
          suggested_limit: 8
        };
      }
    }

    res.json(responseData);
  } catch (error) {
    next(error);
  }
};

const getServer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const server = await Server.findByPk(id);

    if (!server) {
      return res.status(404).json({
        success: false,
        message: '服务器不存在'
      });
    }

    res.json({
      success: true,
      data: server
    });
  } catch (error) {
    next(error);
  }
};

const createServer = async (req, res, next) => {
  try {
    const { name, host, port, username, password, description } = req.body;

    const server = await Server.create({
      name,
      host,
      port: port || 22,
      username,
      password,
      description,
      status: 'testing' // 初始状态设为测试中
    });

    logger.info('Server created', { 
      serverId: server.id, 
      name: server.name,
      host: server.host,
      createdBy: req.user.username 
    });

    // 异步执行自动连接测试，不阻塞响应
    setImmediate(async () => {
      await autoTestConnection(server);
    });

    // 立即返回响应，测试会在后台进行
    res.status(201).json({
      success: true,
      data: {
        ...server.toJSON(),
        status: 'testing', // 告诉前端正在测试中
        testMessage: '正在自动测试连接...'
      },
      message: '服务器添加成功，正在自动测试连接'
    });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.errors.map(e => e.message)
      });
    }
    next(error);
  }
};

const updateServer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, host, port, username, password, description } = req.body;

    const server = await Server.findByPk(id);
    if (!server) {
      return res.status(404).json({
        success: false,
        message: '服务器不存在'
      });
    }

    // 检查是否修改了连接相关的配置
    const connectionChanged = 
      server.host !== host ||
      server.port !== port ||
      server.username !== username ||
      (password && server.password !== password);

    const updateData = { name, host, port, username, description };
    if (password) {
      updateData.password = password;
    }

    // 如果连接配置发生变化，设置状态为测试中
    if (connectionChanged) {
      updateData.status = 'testing';
    }

    await server.update(updateData);

    logger.info('Server updated', { 
      serverId: server.id, 
      name: server.name,
      connectionChanged,
      updatedBy: req.user.username 
    });

    // 如果连接配置发生变化，异步执行自动连接测试
    if (connectionChanged) {
      setImmediate(async () => {
        await autoTestConnection(server);
      });

      res.json({
        success: true,
        data: {
          ...server.toJSON(),
          status: 'testing',
          testMessage: '连接配置已更改，正在重新测试连接...'
        },
        message: '服务器更新成功，正在重新测试连接'
      });
    } else {
      res.json({
        success: true,
        data: server,
        message: '服务器更新成功'
      });
    }
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.errors.map(e => e.message)
      });
    }
    next(error);
  }
};

const deleteServer = async (req, res, next) => {
  const { sequelize } = require('../config/database');
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const server = await Server.findByPk(id, { transaction });

    if (!server) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: '服务器不存在'
      });
    }

    // 先删除所有关联的参数组
    const { Parameter } = require('../models');
    const deletedParameters = await Parameter.destroy({
      where: { serverId: id },
      transaction
    });

    logger.info('Deleted related parameters before server deletion', { 
      serverId: id,
      parametersDeleted: deletedParameters,
      deletedBy: req.user.username 
    });

    // 删除服务器
    await server.destroy({ transaction });
    
    // 提交事务
    await transaction.commit();

    logger.info('Server deleted successfully', { 
      serverId: id, 
      name: server.name,
      deletedBy: req.user.username 
    });

    res.json({
      success: true,
      message: '服务器删除成功'
    });
  } catch (error) {
    // 回滚事务
    await transaction.rollback();
    
    logger.error('Server deletion failed', {
      serverId: req.params.id,
      error: error.message,
      deletedBy: req.user?.username
    });
    
    next(error);
  }
};

const testServerConnection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { forceOnline } = req.body; // 允许强制设置为在线状态
    const server = await Server.findByPk(id);

    if (!server) {
      return res.status(404).json({
        success: false,
        message: '服务器不存在'
      });
    }

    let result;
    let statusToSet;

    if (forceOnline) {
      // 如果强制设置为在线，跳过实际测试
      result = {
        success: true,
        message: '手动设置为在线状态',
        timestamp: new Date().toISOString()
      };
      statusToSet = 'online';
    } else {
      // 正常测试连接
      const connectionConfig = {
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password
      };

      result = await sshService.testConnection(connectionConfig);
      statusToSet = result.success ? 'online' : 'offline';
    }
    
    // 更新服务器状态和OS信息
    const updateData = {
      status: statusToSet,
      lastTestAt: new Date()
    };

    // 如果连接成功且检测到OS信息，保存到数据库
    if (result.success && result.osInfo) {
      updateData.osName = result.osInfo.osName;
      updateData.osVersion = result.osInfo.osVersion;
      updateData.osIcon = result.osInfo.osIcon;
      updateData.architecture = result.osInfo.architecture;
    }

    await server.update(updateData);

    // 重新从数据库获取更新后的服务器信息
    await server.reload();

    logger.info('Server connection tested', { 
      serverId: server.id, 
      host: server.host,
      success: result.success,
      status: server.status,
      forceOnline: !!forceOnline,
      testedBy: req.user.username 
    });

    // 返回测试结果和更新后的服务器信息
    res.json({
      success: result.success,
      data: {
        ...result,
        server: {
          id: server.id,
          name: server.name,
          host: server.host,
          port: server.port,
          status: server.status,
          osName: server.osName,
          osVersion: server.osVersion,
          osIcon: server.osIcon,
          architecture: server.architecture,
          lastTestAt: server.lastTestAt,
          lastTestTime: server.lastTestAt ? new Date(server.lastTestAt).toLocaleString('zh-CN') : '未测试',
          createTime: new Date(server.createdAt).toLocaleString('zh-CN')
        }
      },
      message: forceOnline 
        ? '服务器状态已手动设置为在线' 
        : result.success 
          ? '连接测试成功' 
          : `连接测试失败: ${result.error || '未知错误'}`
    });
  } catch (error) {
    // 确保异常情况也正确处理
    logger.error('Server connection test error', { 
      serverId: req.params.id,
      error: error.message,
      testedBy: req.user?.username 
    });

    // 更新服务器状态为离线
    let serverInfo = null;
    try {
      const server = await Server.findByPk(req.params.id);
      if (server) {
        await server.update({
          status: 'offline',
          lastTestAt: new Date()
        });
        await server.reload();
        
        serverInfo = {
          id: server.id,
          name: server.name,
          host: server.host,
          port: server.port,
          status: server.status,
          osName: server.osName,
          osVersion: server.osVersion,
          osIcon: server.osIcon,
          architecture: server.architecture,
          lastTestAt: server.lastTestAt,
          lastTestTime: server.lastTestAt ? new Date(server.lastTestAt).toLocaleString('zh-CN') : '未测试',
          createTime: new Date(server.createdAt).toLocaleString('zh-CN')
        };
      }
    } catch (updateError) {
      logger.error('Failed to update server status', { error: updateError.message });
    }

    res.json({
      success: false,
      data: {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        server: serverInfo
      },
      message: `连接测试失败: ${error.message}`
    });
  }
};

// 获取服务器状态检测服务的状态
const getStatusServiceInfo = async (req, res, next) => {
  try {
    const status = serverStatusService.getStatus();
    res.json({
      success: true,
      data: status,
      message: '获取服务状态成功'
    });
  } catch (error) {
    next(error);
  }
};

// 手动触发服务器状态检测
const triggerStatusCheck = async (req, res, next) => {
  try {
    if (!serverStatusService.getStatus().isRunning) {
      return res.status(400).json({
        success: false,
        message: '状态检测服务未运行'
      });
    }

    // 异步触发检测，不阻塞响应
    setImmediate(async () => {
      try {
        await serverStatusService.triggerCheck();
      } catch (error) {
        logger.error('Manual status check failed', { error: error.message });
      }
    });

    res.json({
      success: true,
      message: '手动状态检测已触发，正在后台执行'
    });
  } catch (error) {
    next(error);
  }
};

// 配置状态检测服务
const configureStatusService = async (req, res, next) => {
  try {
    const { checkInterval, concurrentLimit } = req.body;

    if (checkInterval !== undefined) {
      const intervalMs = checkInterval * 60 * 1000; // 转换为毫秒
      serverStatusService.setCheckInterval(intervalMs);
    }

    if (concurrentLimit !== undefined) {
      serverStatusService.setConcurrentLimit(concurrentLimit);
    }

    const status = serverStatusService.getStatus();
    res.json({
      success: true,
      data: status,
      message: '状态检测服务配置已更新'
    });
  } catch (error) {
    if (error.message.includes('interval') || error.message.includes('limit')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

module.exports = {
  getServers,
  getServer,
  createServer,
  updateServer,
  deleteServer,
  testServerConnection,
  getStatusServiceInfo,
  triggerStatusCheck,
  configureStatusService
};