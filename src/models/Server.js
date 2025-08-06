const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Server = sequelize.define('Server', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  host: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 22,
    validate: {
      min: 1,
      max: 65535
    }
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('online', 'offline', 'unknown'),
    defaultValue: 'unknown'
  },
  lastTestAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  osName: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Linux发行版名称 (Ubuntu, CentOS, Debian等)'
  },
  osVersion: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '操作系统版本'
  },
  osIcon: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '操作系统图标标识'
  },
  architecture: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '系统架构 (x86_64, aarch64等)'
  }
}, {
  tableName: 'servers',
  timestamps: true
});

module.exports = Server;