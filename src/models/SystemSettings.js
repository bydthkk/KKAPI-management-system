const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemSettings = sequelize.define('SystemSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '设置键名'
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '设置值'
  },
  type: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
    defaultValue: 'string',
    comment: '数据类型'
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'general',
    comment: '设置分类'
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '设置描述'
  },
  isEditable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否可编辑'
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '更新者ID'
  }
}, {
  tableName: 'system_settings',
  timestamps: true,
  indexes: [
    {
      fields: ['key']
    },
    {
      fields: ['category']
    }
  ]
});

// 初始化默认设置
SystemSettings.initializeDefaults = async () => {
  const defaultSettings = [
    {
      key: 'system_title',
      value: 'API Management System',
      type: 'string',
      category: 'general',
      description: '系统标题',
      isEditable: true
    },
    {
      key: 'backend_title',
      value: 'API管理系统',
      type: 'string',
      category: 'general',
      description: '后台管理系统标题',
      isEditable: true
    },
    {
      key: 'system_subtitle',
      value: '智能化API管理平台',
      type: 'string',
      category: 'general',
      description: '系统副标题',
      isEditable: true
    },
    {
      key: 'enable_notifications',
      value: 'true',
      type: 'boolean',
      category: 'general',
      description: '启用通知',
      isEditable: true
    },
    {
      key: 'session_timeout',
      value: '1440',
      type: 'number',
      category: 'security',
      description: '会话超时时间(分钟)',
      isEditable: true
    },
    {
      key: 'max_login_attempts',
      value: '5',
      type: 'number',
      category: 'security',
      description: '最大登录尝试次数',
      isEditable: true
    },
    {
      key: 'log_level',
      value: 'info',
      type: 'string',
      category: 'logging',
      description: '日志级别 (error/warn/info/debug)',
      isEditable: true
    },
    {
      key: 'max_log_files',
      value: '10',
      type: 'number',
      category: 'logging',
      description: '最大日志文件数',
      isEditable: true
    },
    {
      key: 'backup_enabled',
      value: 'false',
      type: 'boolean',
      category: 'maintenance',
      description: '启用自动备份',
      isEditable: true
    },
    {
      key: 'backup_interval',
      value: '24',
      type: 'number',
      category: 'maintenance',
      description: '备份间隔时间(小时)',
      isEditable: true
    },
    {
      key: 'ssh_whitelist_enabled',
      value: 'true',
      type: 'boolean',
      category: 'security',
      description: '启用SSH命令白名单',
      isEditable: true
    },
    {
      key: 'ssh_allowed_commands',
      value: JSON.stringify([
        'ls', 'pwd', 'whoami', 'ps', 'df', 'free', 'uptime', 'date', 'echo',
        'uname', 'lscpu', 'lsblk', 'lsmem', 'dmidecode', 'hostnamectl', 'nproc',
        'netstat', 'ss', 'ping', 'curl', 'wget', 'nslookup', 'dig',
        'top', 'htop', 'pgrep', 'pkill', 'systemctl', 'service', 'journalctl',
        'cat', 'head', 'tail', 'grep', 'find', 'locate', 'which', 'whereis',
        'du', 'wc', 'sort', 'uniq', 'awk', 'sed', 'cut', 'tr',
        'docker',
        'tar', 'gzip', 'gunzip', 'zip', 'unzip',
        'env', 'printenv', 'export', 'history',
        'vi', 'vim', 'nano', 'less', 'more', 'clear', 'reset', 'tty',
        'chmod', 'chown', 'chgrp', 'su', 'sudo', 'passwd', 'id', 'groups',
        'ifconfig', 'ip', 'route', 'arp', 'traceroute', 'telnet',
        'mount', 'umount', 'lsof', 'strace', 'crontab', 'at',
        'diff', 'patch', 'tee', 'xargs', 'basename', 'dirname',
        './cc'
      ]),
      type: 'json',
      category: 'security',
      description: 'SSH允许执行的命令列表',
      isEditable: true
    },
    {
      key: 'ssh_max_command_length',
      value: '1000',
      type: 'number',
      category: 'security',
      description: 'SSH命令最大长度',
      isEditable: true
    }
  ];

  for (const setting of defaultSettings) {
    await SystemSettings.findOrCreate({
      where: { key: setting.key },
      defaults: setting
    });
  }
};

module.exports = SystemSettings;