const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Parameter = sequelize.define('Parameter', {
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
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'servers',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  method: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    }
  },
  command: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  parameters: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '参数变量定义，例如: [{"name": "host", "description": "目标URL", "required": true, "default": ""}, {"name": "port", "description": "端口", "required": true, "default": "80"}]'
  },
  apiEndpoint: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [1, 200]
    },
    comment: 'API访问端点名称，例如: stress-test'
  },
  apiKey: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [1, 500]
    },
    comment: 'API访问密钥，用于URL参数认证'
  }
}, {
  tableName: 'parameters',
  timestamps: true
});

module.exports = Parameter;