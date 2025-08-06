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
    // 检查文件大小，如果过大则限制读取
    const fs = require('fs');
    const stats = await fs.promises.stat(logFile);
    const fileSizeInMB = stats.size / (1024 * 1024);
    
    // 如果文件超过50MB，只读取最后部分
    const maxSizeInMB = 50;
    const shouldLimitRead = fileSizeInMB > maxSizeInMB;
    
    if (shouldLimitRead) {
      logger.warn(`Log file size (${fileSizeInMB.toFixed(2)}MB) exceeds limit, reading last ${maxSizeInMB}MB only`);
    }

    const readline = require('readline');
    const fileStream = shouldLimitRead 
      ? require('fs').createReadStream(logFile, { 
          encoding: 'utf8',
          start: stats.size - (maxSizeInMB * 1024 * 1024), // 从文件后部开始读取
          highWaterMark: 64 * 1024
        })
      : require('fs').createReadStream(logFile, { 
          encoding: 'utf8',
          highWaterMark: 64 * 1024
        });

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let allLogs = [];
    let lineNumber = 0;
    let processedCount = 0;
    const maxProcessLines = 10000; // 限制处理的行数

    // 逐行读取和过滤
    for await (const line of rl) {
      if (!line.trim()) continue;
      
      lineNumber++;
      processedCount++;
      
      // 限制处理的行数，避免内存过载
      if (processedCount > maxProcessLines) {
        logger.warn(`Stopped processing after ${maxProcessLines} lines to prevent memory issues`);
        break;
      }

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
      
      // 如果已经收集了足够的日志（比分页需要的多一些），可以提前结束
      if (allLogs.length > (page * pageSize + pageSize * 2)) {
        break;
      }
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
      hasMore: endIndex < total,
      fileInfo: {
        sizeInMB: fileSizeInMB.toFixed(2),
        limitedRead: shouldLimitRead,
        processedLines: processedCount
      }
    };

  } catch (error) {
    logger.error('Failed to read logs:', error);
    
    // 返回空结果而不是抛出错误
    return {
      list: [],
      total: 0,
      page: 1,
      pageSize,
      hasMore: false,
      fileInfo: {
        error: error.message
      }
    };
  }
};

const clearLogs = async (req, res, next) => {
  try {
    const logFile = path.join(__dirname, '../../logs/app.log');
    const errorLogFile = path.join(__dirname, '../../logs/error.log');

    // 立即返回成功响应，异步处理文件操作
    res.json({
      success: true,
      message: '日志清空成功'
    });

    // 异步清理日志文件，不阻塞响应
    setImmediate(async () => {
      try {
        // 确保日志目录存在
        const logsDir = path.dirname(logFile);
        await fs.mkdir(logsDir, { recursive: true });

        // 清空日志文件 - 使用更快的方式
        await Promise.all([
          fs.truncate(logFile, 0).catch(() => fs.writeFile(logFile, '')),
          fs.truncate(errorLogFile, 0).catch(() => fs.writeFile(errorLogFile, ''))
        ]);

        logger.info('Logs cleared by user (async)', { 
          clearedBy: req.user?.username || 'system',
          ip: req.ip,
          logFile: logFile,
          errorLogFile: errorLogFile
        });
      } catch (error) {
        logger.error('Failed to clear logs asynchronously:', error);
      }
    });

  } catch (error) {
    logger.error('Failed to clear logs:', error);
    res.status(500).json({
      success: false,
      message: '清空日志失败: ' + error.message
    });
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