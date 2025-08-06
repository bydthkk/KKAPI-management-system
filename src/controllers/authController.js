const { User } = require('../models');
const { generateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 验证用户存在
    const user = await User.findOne({ where: { username } });
    if (!user) {
      logger.warn('Login attempt with non-existent username', { username });
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 验证密码
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      logger.warn('Login attempt with invalid password', { username });
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }

    // 检查用户状态
    if (user.status !== 'active') {
      logger.warn('Login attempt with inactive user', { username });
      return res.status(401).json({
        success: false,
        message: '账户已被禁用'
      });
    }

    // 更新最后登录时间
    const now = new Date();
    await user.update({ lastLoginAt: now });
    
    // 重新获取用户信息以包含更新后的lastLoginAt
    await user.reload();

    // 生成token
    const token = generateToken(user);

    // 获取设备信息用于日志记录
    const deviceInfo = req.device || {};
    
    logger.info('User logged in successfully', { 
      username, 
      ip: req.ip,
      deviceType: deviceInfo.deviceType,
      platform: deviceInfo.platform,
      browser: deviceInfo.browser
    });

    // 构建响应数据
    const responseData = {
      token,
      user: user.toJSON(),
      serverTime: new Date().toISOString()
    };

    // 为移动设备添加额外的配置信息
    if (deviceInfo.isMobile || deviceInfo.isTablet) {
      responseData.mobile = {
        optimized: true,
        deviceDetected: deviceInfo.deviceType,
        features: {
          quickActions: true,
          pushNotifications: false, // 暂不支持
          offlineSync: false        // 暂不支持
        },
        recommendations: {
          useHorizontalMode: deviceInfo.isMobile,
          enableDataSaving: true,
          cacheExpiry: 300 // 5分钟
        }
      };
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    logger.info('User logged out', { 
      username: req.user.username,
      ip: req.ip 
    });

    res.json({
      success: true,
      message: '退出登录成功'
    });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: req.user.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    // 验证旧密码
    const isValidPassword = await user.validatePassword(oldPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 更新密码
    await user.update({ password: newPassword });

    logger.info('User changed password', { 
      username: user.username,
      ip: req.ip 
    });

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { nickname, avatar } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    const updateData = {};
    if (nickname !== undefined) {
      updateData.nickname = nickname;
    }
    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    // 更新用户信息
    await user.update(updateData);

    logger.info('User updated profile', { 
      username: user.username,
      nickname: nickname,
      ip: req.ip 
    });

    res.json({
      success: true,
      data: user.toJSON(),
      message: '个人资料更新成功'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  logout,
  getProfile,
  changePassword,
  updateProfile
};