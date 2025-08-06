const sshService = require('../services/sshService');
const logger = require('../utils/logger');
const SystemSettings = require('../models/SystemSettings');

const testConnection = async (req, res, next) => {
  try {
    logger.info('Testing SSH connection', { host: req.body.host, username: req.body.username });
    
    const result = await sshService.testConnection(req.body);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const executeCommand = async (req, res, next) => {
  try {
    const { command, connection } = req.body;
    
    logger.info('Executing SSH command', { 
      host: connection.host, 
      username: connection.username, 
      command 
    });
    
    const result = await sshService.executeCommand(connection, command);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

const getServerInfo = async (req, res, next) => {
  try {
    const { connection } = req.body;
    
    logger.info('Getting server info', { host: connection.host, username: connection.username });
    
    const commands = [
      'uname -a',
      'uptime',
      'df -h',
      'free -h',
      'ps aux | head -10'
    ];

    const results = {};
    
    for (const cmd of commands) {
      try {
        const result = await sshService.executeCommand(connection, cmd);
        results[cmd] = result;
      } catch (error) {
        results[cmd] = { error: error.message };
      }
    }
    
    res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        server: `${connection.host}:${connection.port || 22}`,
        results
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAllowedCommands = async (req, res) => {
  try {
    // 从数据库读取安全设置
    const [whitelistEnabled, allowedCommands, maxCommandLength] = await Promise.all([
      SystemSettings.findOne({ where: { key: 'ssh_whitelist_enabled' } }),
      SystemSettings.findOne({ where: { key: 'ssh_allowed_commands' } }),
      SystemSettings.findOne({ where: { key: 'ssh_max_command_length' } })
    ]);
    
    // 解析设置值，如果数据库中没有则使用默认配置
    const config = require('../config/config');
    const enableWhitelist = whitelistEnabled ? 
      (whitelistEnabled.value === 'true') : 
      config.security.enableWhitelist;
    
    const commands = allowedCommands ? 
      JSON.parse(allowedCommands.value) : 
      config.security.allowedCommands;
    
    const maxLength = maxCommandLength ? 
      parseInt(maxCommandLength.value) : 
      config.security.maxCommandLength;
    
    res.json({
      success: true,
      data: {
        enableWhitelist: enableWhitelist,
        allowedCommands: commands,
        maxCommandLength: maxLength
      }
    });
  } catch (error) {
    logger.error('Failed to get allowed commands', error);
    
    // 如果数据库查询失败，返回默认配置
    const config = require('../config/config');
    res.json({
      success: true,
      data: {
        enableWhitelist: config.security.enableWhitelist,
        allowedCommands: config.security.allowedCommands,
        maxCommandLength: config.security.maxCommandLength
      }
    });
  }
};

const updateSecuritySettings = async (req, res) => {
  try {
    const { enableWhitelist, allowedCommands } = req.body;
    const userId = req.user?.id || null;
    const username = req.user?.username || 'system';
    
    // 准备要更新的设置
    const updates = [];
    
    if (typeof enableWhitelist === 'boolean') {
      updates.push({
        key: 'ssh_whitelist_enabled',
        value: enableWhitelist.toString(),
        type: 'boolean',
        category: 'security',
        description: '启用SSH命令白名单',
        updatedBy: userId
      });
    }
    
    if (Array.isArray(allowedCommands)) {
      updates.push({
        key: 'ssh_allowed_commands',
        value: JSON.stringify(allowedCommands),
        type: 'json',
        category: 'security',
        description: 'SSH允许执行的命令列表',
        updatedBy: userId
      });
    }
    
    // 批量更新数据库设置
    for (const setting of updates) {
      await SystemSettings.upsert({
        key: setting.key,
        value: setting.value,
        type: setting.type,
        category: setting.category,
        description: setting.description,
        updatedBy: setting.updatedBy,
        isEditable: true
      });
    }
    
    logger.info('Security settings updated and persisted', {
      enableWhitelist: enableWhitelist,
      commandCount: allowedCommands?.length || 0,
      updatedBy: username,
      settingsUpdated: updates.length
    });
    
    // 重新读取数据库中的最新设置返回给客户端
    const [whitelistEnabled, commands, maxCommandLength] = await Promise.all([
      SystemSettings.findOne({ where: { key: 'ssh_whitelist_enabled' } }),
      SystemSettings.findOne({ where: { key: 'ssh_allowed_commands' } }),
      SystemSettings.findOne({ where: { key: 'ssh_max_command_length' } })
    ]);
    
    res.json({
      success: true,
      data: {
        enableWhitelist: whitelistEnabled ? (whitelistEnabled.value === 'true') : config.security.enableWhitelist,
        allowedCommands: commands ? JSON.parse(commands.value) : config.security.allowedCommands,
        maxCommandLength: maxCommandLength ? parseInt(maxCommandLength.value) : config.security.maxCommandLength
      },
      message: '安全设置更新成功并已持久化保存'
    });
  } catch (error) {
    logger.error('Failed to update security settings', error);
    res.status(500).json({
      success: false,
      error: '更新安全设置失败: ' + error.message
    });
  }
};

module.exports = {
  testConnection,
  executeCommand,
  getServerInfo,
  getAllowedCommands,
  updateSecuritySettings
};