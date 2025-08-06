const { Server } = require('../models');
const sshService = require('./sshService');
const logger = require('../utils/logger');

class ServerStatusService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.checkInterval = 5 * 60 * 1000; // 5分钟检测一次
    this.concurrentLimit = 5; // 同时检测的最大服务器数量
  }

  /**
   * 启动定期检测服务
   */
  start() {
    if (this.isRunning) {
      logger.warn('Server status service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting server status service', { 
      interval: this.checkInterval / 1000 / 60 + ' minutes',
      concurrentLimit: this.concurrentLimit 
    });

    // 启动后立即执行一次检测
    this.checkAllServers();

    // 设置定期检测
    this.intervalId = setInterval(() => {
      this.checkAllServers();
    }, this.checkInterval);
  }

  /**
   * 停止定期检测服务
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    logger.info('Server status service stopped');
  }

  /**
   * 检测所有服务器状态
   */
  async checkAllServers() {
    try {
      const servers = await Server.findAll({
        where: {
          // 只检测非测试中状态的服务器，避免与手动测试冲突
          status: ['online', 'offline', 'unknown']
        }
      });

      if (servers.length === 0) {
        logger.info('No servers to check');
        return;
      }

      logger.info(`Starting periodic status check for ${servers.length} servers`);

      // 分批处理，避免同时连接过多服务器
      await this.processConcurrently(servers, this.concurrentLimit);

      logger.info('Periodic status check completed');
    } catch (error) {
      logger.error('Error during periodic server status check', { error: error.message });
    }
  }

  /**
   * 并发处理服务器检测，控制并发数量
   */
  async processConcurrently(servers, limit) {
    const results = [];
    
    for (let i = 0; i < servers.length; i += limit) {
      const batch = servers.slice(i, i + limit);
      const batchPromises = batch.map(server => this.checkSingleServer(server));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
        
        // 批次间稍作延迟，避免过于频繁的连接
        if (i + limit < servers.length) {
          await this.sleep(1000); // 1秒延迟
        }
      } catch (error) {
        logger.error('Error processing server batch', { error: error.message });
      }
    }

    return results;
  }

  /**
   * 检测单个服务器状态
   */
  async checkSingleServer(server) {
    const startTime = Date.now();
    
    try {
      const connectionConfig = {
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password
      };

      const result = await sshService.testConnection(connectionConfig);
      const statusToSet = result.success ? 'online' : 'offline';
      const duration = Date.now() - startTime;
      
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

      logger.info('Periodic server status check completed', { 
        serverId: server.id, 
        host: server.host,
        previousStatus: server.status,
        newStatus: statusToSet,
        success: result.success,
        duration: duration + 'ms'
      });

      return { 
        serverId: server.id, 
        host: server.host, 
        success: result.success, 
        status: statusToSet,
        duration 
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Periodic server status check failed', { 
        serverId: server.id,
        host: server.host,
        error: error.message,
        duration: duration + 'ms'
      });

      // 测试失败时设置为离线状态
      try {
        await server.update({
          status: 'offline',
          lastTestAt: new Date()
        });
      } catch (updateError) {
        logger.error('Failed to update server status to offline during periodic check', { 
          serverId: server.id,
          error: updateError.message 
        });
      }

      return { 
        serverId: server.id, 
        host: server.host, 
        success: false, 
        status: 'offline',
        error: error.message,
        duration 
      };
    }
  }

  /**
   * 设置检测间隔 (毫秒)
   */
  setCheckInterval(intervalMs) {
    if (intervalMs < 60000) { // 最小1分钟
      throw new Error('Check interval cannot be less than 1 minute');
    }
    
    this.checkInterval = intervalMs;
    logger.info('Server status check interval updated', { 
      interval: intervalMs / 1000 / 60 + ' minutes' 
    });

    // 如果服务正在运行，重启以应用新间隔
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * 设置并发检测限制
   */
  setConcurrentLimit(limit) {
    if (limit < 1 || limit > 20) {
      throw new Error('Concurrent limit must be between 1 and 20');
    }
    
    this.concurrentLimit = limit;
    logger.info('Server status concurrent limit updated', { limit });
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      concurrentLimit: this.concurrentLimit,
      nextCheckIn: this.isRunning ? this.checkInterval : null
    };
  }

  /**
   * 手动触发一次检测
   */
  async triggerCheck() {
    if (!this.isRunning) {
      throw new Error('Service is not running');
    }
    
    logger.info('Manual server status check triggered');
    await this.checkAllServers();
  }

  /**
   * 延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建单例实例
const serverStatusService = new ServerStatusService();

module.exports = serverStatusService;