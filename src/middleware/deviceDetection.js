const logger = require('../utils/logger');

/**
 * 移动设备检测中间件
 * 根据User-Agent检测设备类型并添加到请求对象
 */
const deviceDetection = (req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  
  // 移动设备检测模式
  const mobilePattern = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone|webOS|Opera Mini/i;
  const tabletPattern = /iPad|Android(?!.*Mobile)|Tablet/i;
  
  // 设备信息
  const deviceInfo = {
    userAgent,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    deviceType: 'desktop',
    platform: 'unknown',
    browser: 'unknown'
  };
  
  // 检测移动设备
  if (mobilePattern.test(userAgent)) {
    deviceInfo.isMobile = true;
    deviceInfo.isDesktop = false;
    deviceInfo.deviceType = 'mobile';
  }
  
  // 检测平板设备
  if (tabletPattern.test(userAgent)) {
    deviceInfo.isTablet = true;
    deviceInfo.isMobile = false;
    deviceInfo.isDesktop = false;
    deviceInfo.deviceType = 'tablet';
  }
  
  // 检测平台
  if (/Android/i.test(userAgent)) {
    deviceInfo.platform = 'android';
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    deviceInfo.platform = 'ios';
  } else if (/Windows/i.test(userAgent)) {
    deviceInfo.platform = 'windows';
  } else if (/Mac/i.test(userAgent)) {
    deviceInfo.platform = 'macos';
  } else if (/Linux/i.test(userAgent)) {
    deviceInfo.platform = 'linux';
  }
  
  // 检测浏览器
  if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) {
    deviceInfo.browser = 'chrome';
  } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    deviceInfo.browser = 'safari';
  } else if (/Firefox/i.test(userAgent)) {
    deviceInfo.browser = 'firefox';
  } else if (/Edge/i.test(userAgent)) {
    deviceInfo.browser = 'edge';
  }
  
  // 将设备信息添加到请求对象
  req.device = deviceInfo;
  
  // 记录设备访问日志（可选，仅在需要时启用）
  if (process.env.LOG_DEVICE_ACCESS === 'true') {
    logger.info('Device access detected', {
      ip: req.ip,
      deviceType: deviceInfo.deviceType,
      platform: deviceInfo.platform,
      browser: deviceInfo.browser,
      endpoint: req.originalUrl,
      method: req.method
    });
  }
  
  next();
};

/**
 * 移动设备优化响应中间件
 * 为移动设备提供优化的响应
 */
const mobileOptimization = (req, res, next) => {
  if (!req.device) {
    return next();
  }
  
  // 为移动设备添加特殊的响应头
  if (req.device.isMobile || req.device.isTablet) {
    res.setHeader('X-Device-Type', req.device.deviceType);
    res.setHeader('Cache-Control', 'public, max-age=300'); // 移动设备缓存5分钟
    
    // 为移动设备设置较短的连接超时
    if (req.setTimeout) {
      req.setTimeout(30000); // 30秒超时
    }
  } else {
    res.setHeader('Cache-Control', 'public, max-age=600'); // 桌面设备缓存10分钟
  }
  
  next();
};

/**
 * API响应格式优化中间件
 * 根据设备类型优化API响应格式
 */
const apiResponseOptimization = (req, res, next) => {
  if (!req.device) {
    return next();
  }
  
  // 保存原始的json方法
  const originalJson = res.json;
  
  // 重写json方法以添加设备特定的优化
  res.json = function(data) {
    if (req.device.isMobile || req.device.isTablet) {
      // 为移动设备优化响应
      if (data && typeof data === 'object') {
        // 添加设备类型信息到响应
        data._device = {
          type: req.device.deviceType,
          optimized: true
        };
        
        // 如果是分页数据，为移动设备减少默认页面大小
        if (data.pagination && !req.query.limit) {
          data.pagination.suggested_mobile_limit = Math.min(10, data.pagination.limit || 20);
        }
        
        // 为移动设备简化复杂的嵌套数据
        if (Array.isArray(data.data) && data.data.length > 0) {
          data._mobile_optimized = true;
        }
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  deviceDetection,
  mobileOptimization,
  apiResponseOptimization
};