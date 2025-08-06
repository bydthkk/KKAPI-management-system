const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class LocalMonitorController {
  /**
   * 获取本地服务器监控数据
   */
  static async getLocalMonitoring(req, res) {
    try {
      const [cpuInfo, memInfo, diskInfo, systemInfo] = await Promise.allSettled([
        LocalMonitorController.getCpuUsage(),
        LocalMonitorController.getMemoryUsage(),
        LocalMonitorController.getDiskUsage(),
        LocalMonitorController.getSystemInfo()
      ]);

      const monitoringData = {
        serverName: 'API 管理服务器',
        host: 'localhost',
        status: 'online',
        cpu: cpuInfo.status === 'fulfilled' ? cpuInfo.value : { usage: 0, cores: os.cpus().length },
        memory: memInfo.status === 'fulfilled' ? memInfo.value : { used: 0, total: 0, usage: 0 },
        disk: diskInfo.status === 'fulfilled' ? diskInfo.value : { used: 0, total: 0, usage: 0 },
        system: systemInfo.status === 'fulfilled' ? systemInfo.value : {},
        uptime: os.uptime(),
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        timestamp: new Date()
      };

      res.json({
        success: true,
        data: monitoringData
      });

    } catch (error) {
      console.error('获取本地监控数据失败:', error);
      res.status(500).json({
        success: false,
        message: '获取本地监控数据失败',
        error: error.message
      });
    }
  }

  /**
   * 获取CPU使用率
   */
  static async getCpuUsage() {
    try {
      const cpus = os.cpus();
      
      // 等待一段时间再次采样
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (let type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - (100 * idle / total);

      return {
        usage: Math.round(usage * 100) / 100,
        cores: cpus.length
      };
    } catch (error) {
      return {
        usage: 0,
        cores: os.cpus().length
      };
    }
  }

  /**
   * 获取内存使用情况
   */
  static async getMemoryUsage() {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usage = (usedMem / totalMem) * 100;

      return {
        used: Math.round(usedMem / 1024 / 1024), // MB
        total: Math.round(totalMem / 1024 / 1024), // MB
        free: Math.round(freeMem / 1024 / 1024), // MB
        usage: Math.round(usage * 100) / 100
      };
    } catch (error) {
      return {
        used: 0,
        total: 0,
        free: 0,
        usage: 0
      };
    }
  }

  /**
   * 获取磁盘使用情况
   */
  static async getDiskUsage() {
    try {
      if (os.platform() === 'win32') {
        // Windows系统
        const { stdout } = await execAsync('wmic logicaldisk get Size,FreeSpace,Caption /format:csv');
        const lines = stdout.split('\n').filter(line => line.includes(','));
        
        let totalSize = 0;
        let totalFree = 0;
        
        lines.forEach(line => {
          const parts = line.split(',');
          if (parts.length >= 4) {
            const size = parseInt(parts[3]) || 0;
            const free = parseInt(parts[2]) || 0;
            totalSize += size;
            totalFree += free;
          }
        });

        const used = totalSize - totalFree;
        const usage = totalSize > 0 ? (used / totalSize) * 100 : 0;

        return {
          used: Math.round(used / 1024 / 1024 / 1024 * 10) / 10, // GB
          total: Math.round(totalSize / 1024 / 1024 / 1024 * 10) / 10, // GB
          usage: Math.round(usage * 100) / 100
        };
      } else {
        // Linux/Unix系统
        const { stdout } = await execAsync('df -h / | tail -1');
        const parts = stdout.trim().split(/\s+/);
        
        if (parts.length >= 5) {
          const total = LocalMonitorController.parseSize(parts[1]);
          const used = LocalMonitorController.parseSize(parts[2]);
          const usage = parseFloat(parts[4].replace('%', ''));

          return {
            used: used,
            total: total,
            usage: usage
          };
        }
      }
      
      return { used: 0, total: 0, usage: 0 };
    } catch (error) {
      return { used: 0, total: 0, usage: 0 };
    }
  }

  /**
   * 获取系统信息
   */
  static async getSystemInfo() {
    try {
      const loadAvg = os.loadavg();
      
      return {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: os.uptime(),
        loadAverage: {
          load1: Math.round(loadAvg[0] * 100) / 100,
          load5: Math.round(loadAvg[1] * 100) / 100,
          load15: Math.round(loadAvg[2] * 100) / 100
        },
        networkInterfaces: Object.keys(os.networkInterfaces()).length
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * 解析磁盘大小字符串 (如 "10G" -> 10)
   */
  static parseSize(sizeStr) {
    if (!sizeStr) return 0;
    
    const size = parseFloat(sizeStr);
    const unit = sizeStr.slice(-1).toUpperCase();
    
    switch (unit) {
      case 'K': return Math.round(size / 1024 / 1024 * 10) / 10;
      case 'M': return Math.round(size / 1024 * 10) / 10;
      case 'G': return Math.round(size * 10) / 10;
      case 'T': return Math.round(size * 1024 * 10) / 10;
      default: return Math.round(size / 1024 / 1024 / 1024 * 10) / 10;
    }
  }
}

module.exports = LocalMonitorController;