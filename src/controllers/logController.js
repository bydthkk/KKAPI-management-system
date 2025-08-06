const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const getLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 20, // 减少默认页面大小
      level,
      service,
      keyword,
      startTime,
      endTime
    } = req.query;

    const logFile = path.join(__dirname, '../../logs/app.log');
    
    // 确保日志目录和文件存在
    await ensureLogFileExists(logFile);
    
    // 使用流式读取和优化过滤
    const logs = await readLogsOptimized(logFile, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      level,
      service,
      keyword,
      startTime,
      endTime
    });

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    logger.error('Failed to get logs:', error);
    next(error);
  }
};

// 优化的日志读取函数
const readLogsOptimized = async (logFile, filters) => {
  const { page, pageSize, level, service, keyword, startTime, endTime } = filters;
  
  try {
    // 使用流式读取，避免一次性加载整个文件
    const readline = require('readline');
    const fileStream = require('fs').createReadStream(logFile, { 
      encoding: 'utf8',
      highWaterMark: 64 * 1024 // 64KB chunks
    });

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let allLogs = [];
    let lineNumber = 0;

    // 逐行读取和过滤
    for await (const line of rl) {
      if (!line.trim()) continue;
      
      lineNumber++;
      let logEntry;
      
      try {
        const logData = JSON.parse(line);
        logEntry = {
          id: lineNumber,
          timestamp: formatTimestamp(logData.timestamp),
          level: logData.level || 'info',
          service: logData.service || 'system',
          message: logData.message || line,
          details: logData
        };
      } catch (error) {
        logEntry = {
          id: lineNumber,
          timestamp: new Date().toISOString(),
          level: 'info', 
          service: 'system',
          message: line,
          details: null
        };
      }

      // 早期过滤，减少内存使用
      if (level && logEntry.level !== level) continue;
      if (service && logEntry.service !== service) continue;
      if (keyword && !logEntry.message.toLowerCase().includes(keyword.toLowerCase())) continue;
      
      if (startTime && endTime) {
        const logTime = new Date(logEntry.details?.timestamp || logEntry.timestamp);
        if (logTime < new Date(startTime) || logTime > new Date(endTime)) continue;
      }

      allLogs.push(logEntry);
    }

    // 倒序排列（最新的在前）
    allLogs.reverse();

    // 计算分页
    const total = allLogs.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedLogs = allLogs.slice(startIndex, endIndex);

    // 简化details字段以减少传输大小
    const optimizedLogs = paginatedLogs.map(log => ({
      ...log,
      details: log.details ? JSON.stringify(log.details) : null
    }));

    return {
      list: optimizedLogs,
      total,
      page,
      pageSize,
      hasMore: endIndex < total
    };

  } catch (error) {
    logger.error('Failed to read logs:', error);
    
    // 返回空结果而不是抛出错误
    return {
      list: [],
      total: 0,
      page: 1,
      pageSize,
      hasMore: false
    };
  }
};

const clearLogs = async (req, res, next) => {
  try {
    const logFile = path.join(__dirname, '../../logs/app.log');
    const errorLogFile = path.join(__dirname, '../../logs/error.log');

    // 确保日志目录存在
    const logsDir = path.dirname(logFile);
    await fs.mkdir(logsDir, { recursive: true });

    // 清空日志文件
    await Promise.all([
      fs.writeFile(logFile, ''),
      fs.writeFile(errorLogFile, '')
    ]);

    logger.info('Logs cleared by user', { 
      clearedBy: req.user?.username || 'system',
      ip: req.ip 
    });

    res.json({
      success: true,
      message: '日志清空成功'
    });
  } catch (error) {
    logger.error('Failed to clear logs:', error);
    next(error);
  }
};

// 确保日志文件存在的辅助函数
const ensureLogFileExists = async (logFile) => {
  try {
    const logsDir = path.dirname(logFile);
    
    // 创建日志目录（如果不存在）
    await fs.mkdir(logsDir, { recursive: true });
    
    // 检查文件是否存在，如果不存在则创建
    try {
      await fs.access(logFile);
    } catch (error) {
      // 文件不存在，创建空文件
      await fs.writeFile(logFile, '');
    }
  } catch (error) {
    logger.error('Failed to ensure log file exists:', error);
    // 不抛出错误，让后续处理继续
  }
};

const downloadLogs = async (req, res, next) => {
  try {
    const { type = 'app' } = req.query;
    const logFile = path.join(__dirname, `../../logs/${type}.log`);

    // 确保日志文件存在
    await ensureLogFileExists(logFile);

    try {
      await fs.access(logFile);
      
      const filename = `${type}-logs-${new Date().toISOString().split('T')[0]}.log`;
      
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.setHeader('Content-Type', 'text/plain');
      
      const logContent = await fs.readFile(logFile, 'utf8');
      res.send(logContent);

      logger.info('Logs downloaded', { 
        type,
        downloadedBy: req.user?.username || 'system',
        ip: req.ip 
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: '日志文件不存在'
      });
    }
  } catch (error) {
    logger.error('Failed to download logs:', error);
    next(error);
  }
};

// 辅助函数
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

module.exports = {
  getLogs,
  clearLogs,
  downloadLogs
};