const { sequelize, testConnection } = require('../config/database');
const User = require('./User');
const Server = require('./Server');
const Parameter = require('./Parameter');
const Task = require('./Task');
const SystemSettings = require('./SystemSettings');

// 定义关联关系
Server.hasMany(Parameter, { foreignKey: 'serverId', as: 'parameters' });
Parameter.belongsTo(Server, { foreignKey: 'serverId', as: 'server' });

Parameter.hasMany(Task, { foreignKey: 'parameterId', as: 'tasks' });
Task.belongsTo(Parameter, { foreignKey: 'parameterId', as: 'parameter' });

// 同步数据库
const syncDatabase = async () => {
  try {
    // 首次运行或开发环境可以使用force重建表
    // 生产环境应该使用迁移脚本
    const fs = require('fs');
    const databaseExists = fs.existsSync('./database.sqlite');
    
    if (!databaseExists) {
      // 数据库不存在时，重新创建
      await sequelize.sync({ force: true });
      console.log('Database created successfully');
    } else {
      // 数据库存在时，使用安全模式同步（不修改表结构）
      await sequelize.sync();
      console.log('Database connection verified successfully');
    }
    console.log('Database synchronized successfully');
    
    // 创建默认管理员账户
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        password: 'admin123',
        email: 'admin@example.com',
        role: 'admin'
      });
      console.log('Default admin user created: admin/admin123');
    }
    
    // 初始化系统设置
    await SystemSettings.initializeDefaults();
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  User,
  Server,
  Parameter,
  Task,
  SystemSettings,
  syncDatabase
};