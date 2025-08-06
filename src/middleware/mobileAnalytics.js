const logger = require('../utils/logger');

/**
 * 移动端访问分析中间件
 * 收集移动端用户的使用统计信息，用于后续优化
 */
class MobileAnalytics {
  constructor() {
    this.stats = new Map();
    this.dailyStats = new Map();
    
    // 每小时清理过期数据
    setInterval(() => {
      this.cleanupExpiredStats();
    }, 3600000);
  }

  /**
   * 记录移动端访问统计
   */
  recordAccess(req) {
    if (!req.device) return;

    const key = this.getStatsKey();
    const deviceInfo = req.device;
    const endpoint = req.originalUrl;
    const method = req.method;

    // 获取或创建今日统计
    if (!this.dailyStats.has(key)) {
      this.dailyStats.set(key, {
        date: new Date().toDateString(),
        total: 0,
        mobile: 0,
        tablet: 0,
        desktop: 0,
        platforms: new Map(),
        browsers: new Map(),
        endpoints: new Map(),
        responseTime: [],
        errors: 0
      });
    }

    const stats = this.dailyStats.get(key);
    stats.total++;

    // 记录设备类型
    if (deviceInfo.isMobile) {
      stats.mobile++;
    } else if (deviceInfo.isTablet) {
      stats.tablet++;
    } else {
      stats.desktop++;
    }

    // 记录平台统计
    const platform = deviceInfo.platform || 'unknown';
    stats.platforms.set(platform, (stats.platforms.get(platform) || 0) + 1);

    // 记录浏览器统计
    const browser = deviceInfo.browser || 'unknown';
    stats.browsers.set(browser, (stats.browsers.get(browser) || 0) + 1);

    // 记录端点访问统计
    const endpointKey = `${method} ${endpoint}`;
    stats.endpoints.set(endpointKey, (stats.endpoints.get(endpointKey) || 0) + 1);

    // 记录请求开始时间，用于计算响应时间
    req.startTime = Date.now();
  }

  /**
   * 记录响应统计
   */
  recordResponse(req, res) {
    if (!req.device || !req.startTime) return;

    const key = this.getStatsKey();
    const stats = this.dailyStats.get(key);
    
    if (stats) {
      const responseTime = Date.now() - req.startTime;
      stats.responseTime.push(responseTime);

      // 记录错误
      if (res.statusCode >= 400) {
        stats.errors++;
      }

      // 保持响应时间数组大小
      if (stats.responseTime.length > 1000) {
        stats.responseTime = stats.responseTime.slice(-500);
      }
    }
  }

  /**
   * 获取移动端使用统计
   */
  getStats(days = 7) {
    const result = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toDateString();
      
      const dayStats = this.dailyStats.get(key);
      if (dayStats) {
        result.push({
          date: key,
          ...this.formatStats(dayStats)
        });
      }
    }

    return result.reverse();
  }

  /**
   * 获取实时统计摘要
   */
  getCurrentSummary() {
    const key = this.getStatsKey();
    const todayStats = this.dailyStats.get(key);
    
    if (!todayStats) {
      return {
        total: 0,
        mobile: 0,
        tablet: 0,
        desktop: 0,
        avgResponseTime: 0,
        errorRate: 0
      };
    }

    return this.formatStats(todayStats);
  }

  /**
   * 获取移动端优化建议
   */
  getOptimizationRecommendations() {
    const summary = this.getCurrentSummary();
    const recommendations = [];

    // 基于移动端访问比例的建议
    if (summary.mobilePercentage > 60) {
      recommendations.push({
        type: 'high-mobile-usage',
        priority: 'high',
        message: '移动端访问量较高，建议优化移动端界面和API响应速度',
        suggestion: '启用数据压缩和缓存策略'
      });
    }

    // 基于响应时间的建议
    if (summary.avgResponseTime > 2000) {
      recommendations.push({
        type: 'slow-response',
        priority: 'medium',
        message: '平均响应时间较长，影响移动端用户体验',
        suggestion: '考虑实现API数据分页和懒加载'
      });
    }

    // 基于错误率的建议
    if (summary.errorRate > 5) {
      recommendations.push({
        type: 'high-error-rate',
        priority: 'high',
        message: '错误率较高，可能影响移动端稳定性',
        suggestion: '检查移动端特有的API兼容性问题'
      });
    }

    return recommendations;
  }

  /**
   * 格式化统计数据
   */
  formatStats(stats) {
    const total = stats.total || 0;
    const avgResponseTime = stats.responseTime.length > 0 
      ? stats.responseTime.reduce((a, b) => a + b, 0) / stats.responseTime.length 
      : 0;

    return {
      total,
      mobile: stats.mobile || 0,
      tablet: stats.tablet || 0,
      desktop: stats.desktop || 0,
      mobilePercentage: total > 0 ? ((stats.mobile || 0) / total * 100) : 0,
      tabletPercentage: total > 0 ? ((stats.tablet || 0) / total * 100) : 0,
      desktopPercentage: total > 0 ? ((stats.desktop || 0) / total * 100) : 0,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: total > 0 ? ((stats.errors || 0) / total * 100) : 0,
      topPlatforms: this.mapToArray(stats.platforms).slice(0, 5),
      topBrowsers: this.mapToArray(stats.browsers).slice(0, 5),
      topEndpoints: this.mapToArray(stats.endpoints).slice(0, 10)
    };
  }

  /**
   * Map转Array并排序
   */
  mapToArray(map) {
    return Array.from(map.entries())
      .map(([key, value]) => ({ name: key, count: value }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 获取统计key（基于日期）
   */
  getStatsKey() {
    return new Date().toDateString();
  }

  /**
   * 清理过期统计数据
   */
  cleanupExpiredStats() {
    const now = new Date();
    const expiredKeys = [];

    for (const [key] of this.dailyStats) {
      const keyDate = new Date(key);
      const diffDays = (now - keyDate) / (1000 * 60 * 60 * 24);
      
      if (diffDays > 30) { // 保留30天数据
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.dailyStats.delete(key);
    });

    if (expiredKeys.length > 0) {
      logger.info('Cleaned up expired mobile analytics data', { 
        removedKeys: expiredKeys.length 
      });
    }
  }
}

// 创建全局实例
const mobileAnalytics = new MobileAnalytics();

/**
 * 移动端分析中间件
 */
const analyticsMiddleware = (req, res, next) => {
  // 记录访问
  mobileAnalytics.recordAccess(req);

  // 拦截响应结束事件以记录响应统计
  const originalEnd = res.end;
  res.end = function(...args) {
    mobileAnalytics.recordResponse(req, res);
    originalEnd.apply(this, args);
  };

  next();
};

/**
 * 获取分析数据的路由处理器
 */
const getAnalyticsData = (req, res) => {
  const { days } = req.query;
  
  const stats = mobileAnalytics.getStats(parseInt(days) || 7);
  const summary = mobileAnalytics.getCurrentSummary();
  const recommendations = mobileAnalytics.getOptimizationRecommendations();

  res.json({
    success: true,
    data: {
      summary,
      daily: stats,
      recommendations,
      lastUpdated: new Date().toISOString()
    }
  });
};

module.exports = {
  analyticsMiddleware,
  getAnalyticsData,
  mobileAnalytics
};