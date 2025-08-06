const { Server } = require('../models');
const sshService = require('../services/sshService');

// 存储每个服务器的网络历史数据用于计算速度
const networkHistory = new Map();

// 清理过期的网络历史数据 - 改进内存管理
setInterval(() => {
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5分钟
  const cleanedCount = networkHistory.size;
  
  for (const [serverId, data] of networkHistory.entries()) {
    // 如果数据超过5分钟未更新，清理掉
    if (now - data.timestamp > maxAge) {
      networkHistory.delete(serverId);
    }
  }
  
  // 记录清理情况
  const finalCount = networkHistory.size;
  if (cleanedCount > finalCount) {
    logger.debug_dev('Cleaned up network history data', { 
      before: cleanedCount, 
      after: finalCount, 
      removed: cleanedCount - finalCount 
    });
  }
  
  // 如果内存使用过多，警告并进行额外清理
  if (networkHistory.size > 1000) {
    logger.warn('Network history map growing too large', { size: networkHistory.size });
    // 保留最近的100个服务器数据，清理其余
    const entries = Array.from(networkHistory.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, 100);
    networkHistory.clear();
    entries.forEach(([key, value]) => networkHistory.set(key, value));
  }
}, 60000); // 每分钟清理一次

class MonitorController {
  /**
   * 获取所有服务器的监控数据
   */
  static async getServersMonitoring(req, res) {
    try {
      // 禁用缓存，确保数据实时更新
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const servers = await Server.findAll({
        attributes: ['id', 'name', 'host', 'port', 'username', 'password', 'osName', 'osVersion', 'osIcon', 'architecture']
      });

      const monitoringData = await Promise.allSettled(
        servers.map(async (server) => {
          try {
            const connectionConfig = {
              host: server.host,
              port: server.port,
              username: server.username,
              password: server.password
            };

            // 获取系统信息
            const [cpuInfo, memInfo, diskInfo, networkInfo, loadInfo] = await Promise.allSettled([
              MonitorController.getCpuUsage(connectionConfig),
              MonitorController.getMemoryUsage(connectionConfig),
              MonitorController.getDiskUsage(connectionConfig),
              MonitorController.getNetworkInfo(connectionConfig, server.id),
              MonitorController.getLoadAverage(connectionConfig)
            ]);

            return {
              serverId: server.id,
              serverName: server.name,
              host: server.host,
              status: 'online',
              osName: server.osName,
              osVersion: server.osVersion,
              osIcon: server.osIcon,
              architecture: server.architecture,
              cpu: cpuInfo.status === 'fulfilled' ? cpuInfo.value : { usage: 0, cores: 1 },
              memory: memInfo.status === 'fulfilled' ? memInfo.value : { used: 0, total: 0, usage: 0 },
              disk: diskInfo.status === 'fulfilled' ? diskInfo.value : { used: 0, total: 0, usage: 0 },
              network: networkInfo.status === 'fulfilled' ? networkInfo.value : { rxBytes: 0, txBytes: 0, rxMB: 0, txMB: 0, rxSpeed: 0, txSpeed: 0 },
              load: loadInfo.status === 'fulfilled' ? loadInfo.value : { load1: 0, load5: 0, load15: 0 },
              timestamp: new Date()
            };
          } catch (error) {
            logger.error_dev(`监控服务器 ${server.name} 失败:`, error);
            return {
              serverId: server.id,
              serverName: server.name,
              host: server.host,
              status: 'offline',
              osName: server.osName,
              osVersion: server.osVersion,
              osIcon: server.osIcon,
              architecture: server.architecture,
              cpu: { usage: 0, cores: 1 },
              memory: { used: 0, total: 0, usage: 0 },
              disk: { used: 0, total: 0, usage: 0 },
              network: { rxBytes: 0, txBytes: 0, rxMB: 0, txMB: 0, rxSpeed: 0, txSpeed: 0 },
              load: { load1: 0, load5: 0, load15: 0 },
              timestamp: new Date(),
              error: error.message
            };
          }
        })
      );

      const results = monitoringData.map(result => 
        result.status === 'fulfilled' ? result.value : result.reason
      );

      res.json({
        success: true,
        data: results,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error_dev('获取服务器监控数据失败:', error);
      res.status(500).json({
        success: false,
        message: '获取监控数据失败',
        error: error.message
      });
    }
  }

  /**
   * 获取单个服务器的详细监控数据
   */
  static async getServerMonitoring(req, res) {
    try {
      // 禁用缓存，确保数据实时更新
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const { serverId } = req.params;
      
      const server = await Server.findByPk(serverId);
      if (!server) {
        return res.status(404).json({
          success: false,
          message: '服务器不存在'
        });
      }

      const connectionConfig = {
        host: server.host,
        port: server.port,
        username: server.username,
        password: server.password
      };

      // 获取详细系统信息
      const [cpuInfo, memInfo, diskInfo, networkInfo, loadInfo, processInfo] = await Promise.allSettled([
        MonitorController.getCpuUsage(connectionConfig),
        MonitorController.getMemoryUsage(connectionConfig),
        MonitorController.getDiskUsage(connectionConfig),
        MonitorController.getNetworkInfo(connectionConfig, serverId),
        MonitorController.getLoadAverage(connectionConfig),
        MonitorController.getTopProcesses(connectionConfig)
      ]);

      const monitoringData = {
        serverId: server.id,
        serverName: server.name,
        host: server.host,
        status: 'online',
        cpu: cpuInfo.status === 'fulfilled' ? cpuInfo.value : null,
        memory: memInfo.status === 'fulfilled' ? memInfo.value : null,
        disk: diskInfo.status === 'fulfilled' ? diskInfo.value : null,
        network: networkInfo.status === 'fulfilled' ? networkInfo.value : null,
        load: loadInfo.status === 'fulfilled' ? loadInfo.value : null,
        processes: processInfo.status === 'fulfilled' ? processInfo.value : null,
        timestamp: new Date()
      };

      res.json({
        success: true,
        data: monitoringData
      });

    } catch (error) {
      logger.error_dev('获取服务器监控数据失败:', error);
      res.status(500).json({
        success: false,
        message: '获取监控数据失败',
        error: error.message
      });
    }
  }

  /**
   * 获取CPU使用率
   */
  static async getCpuUsage(connectionConfig) {
    try {
      // 获取CPU核心数 - 使用lscpu替代nproc
      const coresResult = await sshService.executeCommand(connectionConfig, 'lscpu | grep "^CPU(s):" | awk \'{print $2}\'');
      const cores = parseInt(coresResult.stdout.trim()) || 1;

      // 获取CPU使用率 (通过top命令)
      const cpuResult = await sshService.executeCommand(connectionConfig, 
        "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'"
      );
      
      const usage = parseFloat(cpuResult.stdout.trim()) || 0;

      return {
        usage: Math.round(Math.max(0, Math.min(100, usage)) * 100) / 100,
        cores: cores
      };
    } catch (error) {
      logger.error_dev('getCpuUsage error:', error);
      return {
        usage: 0,
        cores: 1
      };
    }
  }

  /**
   * 获取内存使用情况
   */
  static async getMemoryUsage(connectionConfig) {
    try {
      const result = await sshService.executeCommand(connectionConfig, 
        "free -m | awk 'NR==2{printf \"%.0f %.0f %.1f\", $3,$2,$3*100/$2}'"
      );
      
      const values = result.stdout.trim().split(' ').map(Number);
      const [used = 0, total = 0, usage = 0] = values;

      return {
        used: Math.max(0, used),
        total: Math.max(0, total),
        usage: Math.round(Math.max(0, Math.min(100, usage)) * 100) / 100
      };
    } catch (error) {
      logger.error_dev('getMemoryUsage error:', error);
      return {
        used: 0,
        total: 0,
        usage: 0
      };
    }
  }

  /**
   * 获取磁盘使用情况
   */
  static async getDiskUsage(connectionConfig) {
    try {
      const result = await sshService.executeCommand(connectionConfig, 
        "df -h / | awk 'NR==2{printf \"%.1f %.1f %.0f\", $3,$2,($3/$2)*100}'"
      );
      
      const output = result.stdout.trim();
      const values = output.split(' ');
      const used = parseFloat(values[0]) || 0;
      const total = parseFloat(values[1]) || 0;
      const usage = parseFloat(values[2]) || 0;

      return {
        used: Math.max(0, used),
        total: Math.max(0, total),
        usage: Math.round(Math.max(0, Math.min(100, usage)) * 100) / 100
      };
    } catch (error) {
      logger.error_dev('getDiskUsage error:', error);
      return {
        used: 0,
        total: 0,
        usage: 0
      };
    }
  }

  /**
   * 获取系统负载
   */
  static async getLoadAverage(connectionConfig) {
    try {
      const result = await sshService.executeCommand(connectionConfig, 
        "uptime | awk -F'load average:' '{print $2}' | awk '{print $1,$2,$3}' | sed 's/,//g'"
      );
      
      const values = result.stdout.trim().split(' ').map(Number);
      const [load1 = 0, load5 = 0, load15 = 0] = values;

      return {
        load1: Math.round(Math.max(0, load1) * 100) / 100,
        load5: Math.round(Math.max(0, load5) * 100) / 100,
        load15: Math.round(Math.max(0, load15) * 100) / 100
      };
    } catch (error) {
      logger.error_dev('getLoadAverage error:', error);
      return {
        load1: 0,
        load5: 0,
        load15: 0
      };
    }
  }

  /**
   * 获取网络信息（包含速度计算）
   */
  static async getNetworkInfo(connectionConfig, serverId = null) {
    try {
      // 获取网络流量统计（从 /proc/net/dev）
      const result = await sshService.executeCommand(connectionConfig, 
        "cat /proc/net/dev | grep -E '(eth|ens|enp)' | head -1 | awk '{print $2, $10}'"
      );
      
      const output = result.stdout.trim();
      let rxBytes = 0, txBytes = 0;
      
      if (!output) {
        // 如果没有找到网络接口，尝试获取所有非loopback接口的总和
        const allResult = await sshService.executeCommand(connectionConfig,
          "cat /proc/net/dev | awk 'NR>2 && !/lo:/ {rx+=$2; tx+=$10} END {print rx, tx}'"
        );
        const allOutput = allResult.stdout.trim();
        [rxBytes = 0, txBytes = 0] = allOutput.split(' ').map(Number);
      } else {
        [rxBytes = 0, txBytes = 0] = output.split(' ').map(Number);
      }

      const currentTime = Date.now();
      const currentData = { rxBytes, txBytes, timestamp: currentTime };
      
      // 计算网络速度
      let rxSpeed = 0, txSpeed = 0;
      if (serverId && networkHistory.has(serverId)) {
        const lastData = networkHistory.get(serverId);
        const timeDiff = (currentTime - lastData.timestamp) / 1000; // 秒
        
        if (timeDiff > 0 && timeDiff < 300) { // 只在5分钟内的数据有效
          const rxDiff = Math.max(0, rxBytes - lastData.rxBytes);
          const txDiff = Math.max(0, txBytes - lastData.txBytes);
          
          rxSpeed = Math.round((rxDiff / timeDiff) / 1024); // KB/s
          txSpeed = Math.round((txDiff / timeDiff) / 1024); // KB/s
        }
      }
      
      // 存储当前数据用于下次计算
      if (serverId) {
        networkHistory.set(serverId, currentData);
      }

      return {
        rxBytes: rxBytes,
        txBytes: txBytes,
        rxMB: Math.round((rxBytes / (1024 * 1024)) * 100) / 100,
        txMB: Math.round((txBytes / (1024 * 1024)) * 100) / 100,
        rxSpeed: rxSpeed, // KB/s
        txSpeed: txSpeed  // KB/s
      };
    } catch (error) {
      logger.error_dev('getNetworkInfo error:', error);
      return {
        rxBytes: 0,
        txBytes: 0,
        rxMB: 0,
        txMB: 0,
        rxSpeed: 0,
        txSpeed: 0
      };
    }
  }

  /**
   * 获取top进程
   */
  static async getTopProcesses(connectionConfig) {
    try {
      const result = await sshService.executeCommand(connectionConfig, 
        "ps aux --sort=-%cpu | head -6 | tail -5 | awk '{print $11, $3, $4}'"
      );
      
      const lines = result.stdout.trim().split('\n').filter(line => line.trim());
      const processes = lines.map(line => {
        const parts = line.trim().split(/\s+/);
        const name = parts[0] || 'unknown';
        const cpu = parseFloat(parts[1]) || 0;
        const mem = parseFloat(parts[2]) || 0;
        
        return {
          name: name,
          cpu: Math.round(Math.max(0, cpu) * 100) / 100,
          memory: Math.round(Math.max(0, mem) * 100) / 100
        };
      });

      return processes.length > 0 ? processes : [];
    } catch (error) {
      logger.error_dev('getTopProcesses error:', error);
      return [];
    }
  }
}

module.exports = MonitorController;