const { User } = require('../models');
const logger = require('../utils/logger');

// 获取用户列表
const getUsers = async (req, res, next) => {
  try {
    // 只有管理员可以查看用户列表
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以管理用户'
      });
    }

    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const whereCondition = {};
    if (search) {
      whereCondition.username = {
        [require('sequelize').Op.like]: `%${search}%`
      };
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      data: {
        users: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 创建用户
const createUser = async (req, res, next) => {
  try {
    // 只有管理员可以创建用户
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以创建用户'
      });
    }

    const { username, password, email, role = 'user', nickname, permissions } = req.body;

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: '邮箱已存在'
        });
      }
    }

    const user = await User.create({
      username,
      password,
      email,
      role,
      nickname,
      permissions,
      status: 'active'
    });

    logger.info('User created by admin', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      newUserId: user.id,
      newUsername: user.username,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      data: user.toJSON(),
      message: '用户创建成功'
    });
  } catch (error) {
    next(error);
  }
};

// 更新用户
const updateUser = async (req, res, next) => {
  try {
    // 只有管理员可以更新用户
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以管理用户'
      });
    }

    const { id } = req.params;
    const { username, email, role, nickname, permissions, status } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 检查用户名是否已被其他用户使用
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ where: { username } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '用户名已存在'
        });
      }
    }

    // 检查邮箱是否已被其他用户使用
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: '邮箱已存在'
        });
      }
    }

    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (nickname !== undefined) updateData.nickname = nickname;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (status !== undefined) updateData.status = status;

    await user.update(updateData);

    logger.info('User updated by admin', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      updatedUserId: user.id,
      updatedUsername: user.username,
      changes: Object.keys(updateData),
      ip: req.ip
    });

    res.json({
      success: true,
      data: user.toJSON(),
      message: '用户更新成功'
    });
  } catch (error) {
    next(error);
  }
};

// 重置用户密码
const resetPassword = async (req, res, next) => {
  try {
    // 只有管理员可以重置密码
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以重置密码'
      });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    await user.update({ password: newPassword });

    logger.info('Password reset by admin', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      targetUserId: user.id,
      targetUsername: user.username,
      ip: req.ip
    });

    res.json({
      success: true,
      message: '密码重置成功'
    });
  } catch (error) {
    next(error);
  }
};

// 删除用户
const deleteUser = async (req, res, next) => {
  try {
    // 只有管理员可以删除用户
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足，只有管理员可以删除用户'
      });
    }

    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 不能删除自己
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: '不能删除自己的账户'
      });
    }

    await user.destroy();

    logger.info('User deleted by admin', {
      adminId: req.user.id,
      adminUsername: req.user.username,
      deletedUserId: user.id,
      deletedUsername: user.username,
      ip: req.ip
    });

    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 获取权限菜单列表
const getMenuPermissions = async (req, res, next) => {
  try {
    // 只有管理员可以查看权限菜单
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    const menuPermissions = [
      {
        key: 'dashboard',
        name: '仪表板',
        description: '查看系统统计信息和概览'
      },
      {
        key: 'servers',
        name: '服务器管理',
        description: '管理SSH服务器连接配置'
      },
      {
        key: 'parameters',
        name: '参数管理',
        description: '管理命令参数和API配置'
      },
      {
        key: 'tasks',
        name: '任务管理',
        description: '查看和管理任务执行记录'
      },
      {
        key: 'remote-monitor',
        name: '远程监控',
        description: '监控远程服务器状态'
      },
      {
        key: 'logs',
        name: '日志查看',
        description: '查看系统日志和操作记录'
      },
      {
        key: 'users',
        name: '用户管理',
        description: '管理系统用户和权限（仅管理员）'
      },
      {
        key: 'system-settings',
        name: '系统设置',
        description: '修改系统配置（仅管理员）'
      }
    ];

    res.json({
      success: true,
      data: menuPermissions
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  resetPassword,
  deleteUser,
  getMenuPermissions
};