const { Client } = require('ssh2');
const logger = require('../utils/logger');
const config = require('../config/config');

class TerminalService {
  constructor() {
    this.activeTerminals = new Map();
  }

  createTerminal(serverId, connectionConfig, socket) {
    const terminalId = `${serverId}_${socket.id}`;
    
    const conn = new Client();
    const terminal = {
      connection: conn,
      socket: socket,
      serverId: serverId,
      id: terminalId,
      isConnected: false
    };

    logger.info(`Creating terminal session: ${terminalId}`);

    conn.on('ready', () => {
      logger.info(`Terminal SSH connection established: ${terminalId}`);
      terminal.isConnected = true;
      
      conn.shell((err, stream) => {
        if (err) {
          logger.error(`Failed to create shell: ${err.message}`);
          socket.emit('terminal-error', { error: err.message });
          return;
        }

        terminal.stream = stream;
        socket.emit('terminal-ready');

        // 处理终端输出
        stream.on('data', (data) => {
          socket.emit('terminal-output', { data: data.toString() });
        });

        stream.stderr.on('data', (data) => {
          socket.emit('terminal-output', { data: data.toString() });
        });

        stream.on('close', () => {
          logger.info(`Terminal stream closed: ${terminalId}`);
          socket.emit('terminal-closed');
          this.closeTerminal(terminalId);
        });

        // 处理客户端输入
        socket.on('terminal-input', (data) => {
          if (terminal.stream && terminal.isConnected) {
            terminal.stream.write(data.input);
          }
        });

        // 处理窗口大小调整
        socket.on('terminal-resize', (data) => {
          if (terminal.stream && terminal.isConnected) {
            terminal.stream.setWindow(data.rows, data.cols);
          }
        });
      });
    });

    conn.on('error', (err) => {
      logger.error(`Terminal SSH connection error: ${err.message}`);
      socket.emit('terminal-error', { error: `连接失败: ${err.message}` });
      this.closeTerminal(terminalId);
    });

    conn.on('end', () => {
      logger.info(`Terminal SSH connection ended: ${terminalId}`);
      socket.emit('terminal-closed');
      this.closeTerminal(terminalId);
    });

    // 连接配置
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

    // 存储终端会话
    this.activeTerminals.set(terminalId, terminal);

    // 监听客户端断开连接
    socket.on('disconnect', () => {
      logger.info(`Client disconnected, closing terminal: ${terminalId}`);
      this.closeTerminal(terminalId);
    });

    // 建立SSH连接
    conn.connect(connectOptions);

    return terminalId;
  }

  closeTerminal(terminalId) {
    const terminal = this.activeTerminals.get(terminalId);
    if (terminal) {
      logger.info(`Closing terminal: ${terminalId}`);
      
      if (terminal.stream) {
        terminal.stream.end();
      }
      
      if (terminal.connection) {
        terminal.connection.end();
      }

      this.activeTerminals.delete(terminalId);
    }
  }

  getActiveTerminals() {
    return Array.from(this.activeTerminals.keys());
  }

  closeAllTerminals() {
    for (const terminalId of this.activeTerminals.keys()) {
      this.closeTerminal(terminalId);
    }
  }
}

module.exports = new TerminalService();