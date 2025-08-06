require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  ssh: {
    defaultPort: parseInt(process.env.DEFAULT_SSH_PORT) || 22,
    timeout: parseInt(process.env.SSH_TIMEOUT) || 30000,
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log'
  },
  
  security: {
    maxCommandLength: parseInt(process.env.MAX_COMMAND_LENGTH) || 1000,
    enableWhitelist: process.env.ENABLE_WHITELIST !== 'false', // 默认启用白名单
    allowedCommands: process.env.ALLOWED_COMMANDS ? 
      process.env.ALLOWED_COMMANDS.split(',') : 
      [
        // 基础命令
        'ls', 'pwd', 'whoami', 'ps', 'df', 'free', 'uptime', 'date', 'echo',
        // 系统信息命令
        'uname', 'lscpu', 'lsblk', 'lsmem', 'dmidecode', 'hostnamectl', 'nproc',
        // 网络命令
        'netstat', 'ss', 'ping', 'curl', 'wget', 'nslookup', 'dig',
        // 进程和服务命令  
        'top', 'htop', 'pgrep', 'pkill', 'systemctl', 'service', 'journalctl',
        // 文件操作命令
        'cat', 'head', 'tail', 'grep', 'find', 'locate', 'which', 'whereis',
        'du', 'wc', 'sort', 'uniq', 'awk', 'sed', 'cut', 'tr',
        // Docker命令
        'docker',
        // 归档和压缩
        'tar', 'gzip', 'gunzip', 'zip', 'unzip',
        // 环境和变量
        'env', 'printenv', 'export', 'history',
        // 终端和编辑器命令
        'vi', 'vim', 'nano', 'less', 'more', 'clear', 'reset', 'tty',
        // 权限和用户管理
        'chmod', 'chown', 'chgrp', 'su', 'sudo', 'passwd', 'id', 'groups',
        // 网络工具
        'ifconfig', 'ip', 'route', 'arp', 'traceroute', 'telnet',
        // 系统控制
        'mount', 'umount', 'lsof', 'strace', 'crontab', 'at',
        // 文本处理
        'diff', 'patch', 'tee', 'xargs', 'basename', 'dirname',
        // 自定义可执行文件
        './cc'
      ]
  }
};

module.exports = config;