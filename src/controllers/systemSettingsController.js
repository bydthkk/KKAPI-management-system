const SystemSettings = require('../models/SystemSettings');
const bcrypt = require('bcryptjs');
const { User } = require('../models');
require('dotenv').config();

// 获取所有系统设置
const getSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.findAll({
      order: [['category', 'ASC'], ['key', 'ASC']]
    });

    // 按分类组织设置
    const categorizedSettings = {};
    settings.forEach(setting => {
      if (!categorizedSettings[setting.category]) {
        categorizedSettings[setting.category] = {};
      }
      
      let value = setting.value;
      // 转换数据类型
      if (setting.type === 'boolean') {
        value = value === 'true';
      } else if (setting.type === 'number') {
        value = parseInt(value, 10);
      } else if (setting.type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          value = {};
        }
      }
      
      categorizedSettings[setting.category][setting.key] = {
        value,
        type: setting.type,
        description: setting.description,
        isEditable: setting.isEditable
      };
    });

    res.json({
      success: true,
      data: categorizedSettings
    });
  } catch (error) {
    logger.error_dev('获取系统设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取系统设置失败',
      error: error.message
    });
  }
};

// 更新系统设置
const updateSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    const userId = req.user?.id;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: '设置数据格式错误'
      });
    }

    const updates = [];
    
    // 遍历所有分类的设置
    for (const [category, categorySettings] of Object.entries(settings)) {
      for (const [key, settingData] of Object.entries(categorySettings)) {
        if (settingData && typeof settingData === 'object' && settingData.hasOwnProperty('value')) {
          let value = settingData.value;
          
          // 转换为字符串存储
          if (typeof value === 'boolean') {
            value = value.toString();
          } else if (typeof value === 'number') {
            value = value.toString();
          } else if (typeof value === 'object') {
            value = JSON.stringify(value);
          }
          
          updates.push({ key, value, userId });
        }
      }
    }

    // 批量更新设置
    for (const update of updates) {
      const setting = await SystemSettings.findOne({ where: { key: update.key } });
      if (setting && setting.isEditable) {
        await setting.update({
          value: update.value,
          updatedBy: update.userId
        });
      }
    }

    res.json({
      success: true,
      message: '设置更新成功'
    });
  } catch (error) {
    logger.error_dev('更新系统设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新系统设置失败',
      error: error.message
    });
  }
};

// 修改密码
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '当前密码和新密码不能为空'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: '新密码长度不能少于6位'
      });
    }

    // 查找用户
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证当前密码
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: '当前密码错误'
      });
    }

    // 更新密码 - 让User模型的hook处理加密
    await user.update({
      password: newPassword
    });

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    logger.error_dev('修改密码失败:', error);
    res.status(500).json({
      success: false,
      message: '修改密码失败',
      error: error.message
    });
  }
};

// 获取单个设置值
const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    
    const setting = await SystemSettings.findOne({ where: { key } });
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: '设置项不存在'
      });
    }

    let value = setting.value;
    // 转换数据类型
    if (setting.type === 'boolean') {
      value = value === 'true';
    } else if (setting.type === 'number') {
      value = parseInt(value, 10);
    } else if (setting.type === 'json') {
      try {
        value = JSON.parse(value);
      } catch (e) {
        value = {};
      }
    }

    res.json({
      success: true,
      data: {
        key: setting.key,
        value,
        type: setting.type,
        category: setting.category,
        description: setting.description,
        isEditable: setting.isEditable
      }
    });
  } catch (error) {
    logger.error_dev('获取设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取设置失败',
      error: error.message
    });
  }
};

// 重置默认设置
const resetToDefaults = async (req, res) => {
  try {
    const userId = req.user?.id;
    
    // 重新初始化默认设置
    await SystemSettings.initializeDefaults();
    
    res.json({
      success: true,
      message: '已重置为默认设置'
    });
  } catch (error) {
    logger.error_dev('重置设置失败:', error);
    res.status(500).json({
      success: false,
      message: '重置设置失败',
      error: error.message
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  changePassword,
  getSetting,
  resetToDefaults
};