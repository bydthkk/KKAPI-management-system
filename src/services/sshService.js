const { Client } = require('ssh2');
const logger = require('../utils/logger');
const config = require('../config/config');
const SystemSettings = require('../models/SystemSettings');

class SSHService {
  constructor() {
    this.activeConnections = new Map();
  }

  async getSecuritySettings() {
    try {
      const [whitelistEnabled, allowedCommands, maxCommandLength] = await Promise.all([
        SystemSettings.findOne({ where: { key: 'ssh_whitelist_enabled' } }),
        SystemSettings.findOne({ where: { key: 'ssh_allowed_commands' } }),
        SystemSettings.findOne({ where: { key: 'ssh_max_command_length' } })
      ]);
      
      return {
        enableWhitelist: whitelistEnabled ? (whitelistEnabled.value === 'true') : config.security.enableWhitelist,
        allowedCommands: allowedCommands ? JSON.parse(allowedCommands.value) : config.security.allowedCommands,
        maxCommandLength: maxCommandLength ? parseInt(maxCommandLength.value) : config.security.maxCommandLength
      };
    } catch (error) {
      logger.error('Failed to get security settings from database, using config defaults', error);
      return {
        enableWhitelist: config.security.enableWhitelist,
        allowedCommands: config.security.allowedCommands,
        maxCommandLength: config.security.maxCommandLength
      };
    }
  }

  async executeCommand(connectionConfig, command) {
    // Get current security settings from database
    const securitySettings = await this.getSecuritySettings();
    
    return new Promise((resolve, reject) => {
      if (command.length > securitySettings.maxCommandLength) {
        return reject(new Error('Command too long'));
      }

      // 检查是否启用白名单
      if (securitySettings.enableWhitelist) {
        const commandBase = command.split(' ')[0];
        const allowedCommands = securitySettings.allowedCommands;
        if (!allowedCommands.includes(commandBase)) {
          return reject(new Error(`Command '${commandBase}' is not allowed`));
        }
      }

      const conn = new Client();
      const connectionId = `${connectionConfig.host}:${connectionConfig.port || config.ssh.defaultPort}`;
      
      logger.info(`Attempting SSH connection to ${connectionId}`);

      conn.on('ready', () => {
        logger.info(`SSH connection established to ${connectionId}`);
        
        conn.exec(command, (err, stream) => {
          if (err) {
            logger.error(`Command execution error: ${err.message}`);
            conn.end();
            return reject(err);
          }

          let stdout = '';
          let stderr = '';

          stream.on('close', (code, signal) => {
            logger.info(`Command completed with exit code: ${code}`);
            conn.end();
            
            resolve({
              success: true,
              exitCode: code,
              stdout: stdout.trim(),
              stderr: stderr.trim(),
              command,
              timestamp: new Date().toISOString()
            });
          });

          stream.on('data', (data) => {
            stdout += data.toString();
          });

          stream.stderr.on('data', (data) => {
            stderr += data.toString();
          });
        });
      });

      conn.on('error', (err) => {
        logger.error(`SSH connection error: ${err.message}`, {
          host: connectionConfig.host,
          port: connectionConfig.port || config.ssh.defaultPort,
          username: connectionConfig.username,
          errorLevel: err.level,
          errorCode: err.code
        });
        const sshError = new Error(`SSH connection failed: ${err.message}`);
        sshError.name = 'SSHError';
        reject(sshError);
      });

      const connectOptions = {
        host: connectionConfig.host,
        port: connectionConfig.port || config.ssh.defaultPort,
        username: connectionConfig.username,
        readyTimeout: config.ssh.timeout,
        // 跳过主机密钥验证（仅用于测试环境）
        hostVerify: false,
        // 添加算法兼容性设置，支持较老的SSH服务器
        algorithms: {
          kex: [
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group-exchange-sha1',
            'diffie-hellman-group1-sha1'
          ],
          cipher: [
            'aes128-ctr',
            'aes192-ctr', 
            'aes256-ctr',
            'aes128-gcm',
            'aes256-gcm',
            'aes128-cbc',
            'aes192-cbc',
            'aes256-cbc',
            '3des-cbc'
          ],
          hmac: [
            'hmac-sha2-256',
            'hmac-sha2-512',
            'hmac-sha1'
          ]
        },
        ...connectionConfig
      };

      if (connectionConfig.password) {
        connectOptions.password = connectionConfig.password;
      } else if (connectionConfig.privateKey) {
        connectOptions.privateKey = connectionConfig.privateKey;
        if (connectionConfig.passphrase) {
          connectOptions.passphrase = connectionConfig.passphrase;
        }
      }

      conn.connect(connectOptions);
    });
  }


  async detectOSInfo(connectionConfig) {
    try {
      // 检测操作系统信息的命令
      const commands = [
        'cat /etc/os-release',
        'uname -m',
        'uname -s'
      ];
      
      const results = {};
      
      for (const command of commands) {
        try {
          const result = await this.executeCommand(connectionConfig, command);
          if (result.success) {
            results[command] = result.stdout;
          }
        } catch (error) {
          logger.warn(`Failed to execute ${command}: ${error.message}`);
        }
      }
      
      // 解析操作系统信息
      const osInfo = this.parseOSInfo(results);
      return osInfo;
    } catch (error) {
      logger.error(`Failed to detect OS info: ${error.message}`);
      return null;
    }
  }

  parseOSInfo(results) {
    const osInfo = {
      osName: 'Linux',
      osVersion: 'Unknown',
      osIcon: 'linux',
      architecture: 'Unknown'
    };

    // 解析 /etc/os-release
    if (results['cat /etc/os-release']) {
      const osRelease = results['cat /etc/os-release'];
      
      // 提取发行版名称
      const nameMatch = osRelease.match(/^NAME="?([^"]+)"?/m);
      if (nameMatch) {
        const fullName = nameMatch[1];
        
        // 根据名称确定图标
        if (fullName.toLowerCase().includes('ubuntu')) {
          osInfo.osName = 'Ubuntu';
          osInfo.osIcon = 'ubuntu';
        } else if (fullName.toLowerCase().includes('centos')) {
          osInfo.osName = 'CentOS';
          osInfo.osIcon = 'centos';
        } else if (fullName.toLowerCase().includes('debian')) {
          osInfo.osName = 'Debian';
          osInfo.osIcon = 'debian';
        } else if (fullName.toLowerCase().includes('red hat') || fullName.toLowerCase().includes('rhel')) {
          osInfo.osName = 'Red Hat';
          osInfo.osIcon = 'centos'; // 使用centos图标作为Red Hat的替代
        } else if (fullName.toLowerCase().includes('fedora')) {
          osInfo.osName = 'Fedora';
          osInfo.osIcon = 'fedora';
        } else if (fullName.toLowerCase().includes('suse')) {
          osInfo.osName = 'SUSE';
          osInfo.osIcon = 'centos'; // 使用centos图标作为SUSE的替代
        } else if (fullName.toLowerCase().includes('alpine')) {
          osInfo.osName = 'Alpine';
          osInfo.osIcon = 'debian'; // 使用debian图标作为Alpine的替代
        } else if (fullName.toLowerCase().includes('arch')) {
          osInfo.osName = 'Arch';
          osInfo.osIcon = 'arch';
        } else if (fullName.toLowerCase().includes('almalinux') || fullName.toLowerCase().includes('alma')) {
          osInfo.osName = 'AlmaLinux';
          osInfo.osIcon = 'almalinux';
        } else if (fullName.toLowerCase().includes('rocky')) {
          osInfo.osName = 'Rocky Linux';
          osInfo.osIcon = 'rocky';
        } else if (fullName.toLowerCase().includes('oracle')) {
          osInfo.osName = 'Oracle Linux';
          osInfo.osIcon = 'oracle';
        } else if (fullName.toLowerCase().includes('kali')) {
          osInfo.osName = 'Kali Linux';
          osInfo.osIcon = 'kali';
        } else if (fullName.toLowerCase().includes('deepin')) {
          osInfo.osName = 'Deepin';
          osInfo.osIcon = 'deepin';
        } else if (fullName.toLowerCase().includes('macos') || fullName.toLowerCase().includes('darwin')) {
          osInfo.osName = 'macOS';
          osInfo.osIcon = 'macos';
        } else {
          osInfo.osName = fullName;
          osInfo.osIcon = 'ubuntu'; // 默认使用ubuntu图标
        }
      }
      
      // 提取版本信息
      const versionMatch = osRelease.match(/^VERSION="?([^"]+)"?/m) || 
                          osRelease.match(/^VERSION_ID="?([^"]+)"?/m);
      if (versionMatch) {
        osInfo.osVersion = versionMatch[1];
      }
    }

    // 解析架构信息
    if (results['uname -m']) {
      osInfo.architecture = results['uname -m'].trim();
    }

    return osInfo;
  }

  async testConnection(connectionConfig) {
    try {
      const result = await this.executeCommand(connectionConfig, 'echo "Connection test successful"');
      
      // 如果连接成功，尝试检测操作系统信息
      let osInfo = null;
      if (result.success) {
        osInfo = await this.detectOSInfo(connectionConfig);
      }
      
      return {
        success: true,
        message: 'Connection test successful',
        timestamp: new Date().toISOString(),
        osInfo: osInfo
      };
    } catch (error) {
      logger.error(`Connection test failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  validateConnectionConfig(config) {
    const required = ['host', 'username'];
    const missing = required.filter(field => !config[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (!config.password && !config.privateKey) {
      throw new Error('Either password or privateKey must be provided');
    }

    return true;
  }
}

module.exports = new SSHService();