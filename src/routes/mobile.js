const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const mobileController = require('../controllers/mobileController');
const { getAnalyticsData } = require('../middleware/mobileAnalytics');

/**
 * 移动端专用API路由
 * 提供简化和优化的数据接口，专为移动设备设计
 */

// 移动端设备检测和推荐中间件
const mobileOnlyMiddleware = (req, res, next) => {
  // 允许所有设备访问移动端API，但会在响应中标记设备类型
  if (req.device) {
    res.setHeader('X-Mobile-Optimized', 'true');
    if (!req.device.isMobile && !req.device.isTablet) {
      res.setHeader('X-Mobile-Warning', 'This API is optimized for mobile devices');
    }
  }
  next();
};

// 应用移动端中间件
router.use(mobileOnlyMiddleware);

/**
 * @route GET /api/mobile/dashboard
 * @desc 获取移动端优化的仪表板数据
 * @access Private
 */
router.get('/dashboard', authenticateToken, mobileController.getMobileDashboard);

/**
 * @route GET /api/mobile/servers
 * @desc 获取移动端优化的服务器列表
 * @access Private
 * @params {number} page - 页码 (默认: 1)
 * @params {number} limit - 每页数量 (默认: 10, 建议移动端: 8)
 */
router.get('/servers', authenticateToken, mobileController.getMobileServers);

/**
 * @route GET /api/mobile/tasks
 * @desc 获取移动端优化的任务列表
 * @access Private
 * @params {number} page - 页码 (默认: 1)
 * @params {number} limit - 每页数量 (默认: 10, 建议移动端: 8)
 * @params {string} status - 任务状态过滤 (waiting|running|success|failed)
 */
router.get('/tasks', authenticateToken, mobileController.getMobileTasks);

/**
 * @route GET /api/mobile/device-info
 * @desc 获取移动端设备信息和推荐
 * @access Private
 */
router.get('/device-info', authenticateToken, mobileController.getMobileDeviceInfo);

/**
 * @route POST /api/mobile/quick-task/:parameterId
 * @desc 执行快速任务 (移动端专用)
 * @access Private
 * @params {string} parameterId - 参数ID
 * @body {object} params - 任务参数
 */
router.post('/quick-task/:parameterId', authenticateToken, mobileController.executeMobileQuickTask);

/**
 * @route GET /api/mobile/health
 * @desc 移动端健康检查接口
 * @access Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    mobile: {
      optimized: true,
      version: '1.0.0',
      features: [
        'device-detection',
        'response-optimization', 
        'mobile-dashboard',
        'quick-tasks'
      ]
    },
    device: req.device || null,
    timestamp: new Date().toISOString()
  });
});

/**
 * @route GET /api/mobile/config
 * @desc 获取移动端配置信息
 * @access Private
 */
router.get('/config', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      mobile: {
        pagination: {
          defaultLimit: 10,
          recommendedLimit: 8,
          maxLimit: 20
        },
        cache: {
          dashboardAge: 300, // 5分钟
          listAge: 180,      // 3分钟
          detailAge: 60      // 1分钟
        },
        features: {
          quickTasks: true,
          deviceDetection: true,
          responseOptimization: true,
          offlineSupport: false // 暂不支持
        },
        ui: {
          theme: 'mobile-optimized',
          layout: req.device?.isTablet ? 'tablet' : req.device?.isMobile ? 'mobile' : 'desktop'
        }
      },
      device: req.device
    }
  });
});

/**
 * @route GET /api/mobile/analytics
 * @desc 获取移动端使用分析数据 (仅管理员)
 * @access Private - Admin only
 * @params {number} days - 查询天数 (默认: 7)
 */
router.get('/analytics', authenticateToken, requireRole(['admin']), getAnalyticsData);

module.exports = router;