const { Parameter, Server } = require('../models');
const logger = require('../utils/logger');
const sshService = require('../services/sshService');

const getParameters = async (req, res, next) => {
  try {
    const parameters = await Parameter.findAll({
      include: [{
        model: Server,
        as: 'server',
        attributes: ['id', 'name', 'host', 'port']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: parameters
    });
  } catch (error) {
    next(error);
  }
};

const getParameter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parameter = await Parameter.findByPk(id, {
      include: [{
        model: Server,
        as: 'server',
        attributes: ['id', 'name', 'host', 'port']
      }]
    });

    if (!parameter) {
      return res.status(404).json({
        success: false,
        message: '参数组不存在'
      });
    }

    res.json({
      success: true,
      data: parameter
    });
  } catch (error) {
    next(error);
  }
};

const createParameter = async (req, res, next) => {
  try {
    const { name, serverId, method, command, description, parameters, apiEndpoint, apiKey } = req.body;

    // 验证服务器是否存在
    const server = await Server.findByPk(serverId);
    if (!server) {
      return res.status(400).json({
        success: false,
        message: '指定的服务器不存在'
      });
    }

    const parameter = await Parameter.create({
      name,
      serverId,
      method,
      command,
      description,
      parameters,
      apiEndpoint,
      apiKey
    });

    logger.info('Parameter created', { 
      parameterId: parameter.id, 
      name: parameter.name,
      serverId: parameter.serverId,
      method: parameter.method,
      createdBy: req.user.username 
    });

    res.status(201).json({
      success: true,
      data: parameter,
      message: '参数组添加成功'
    });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.errors.map(e => e.message)
      });
    }
    next(error);
  }
};

const updateParameter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, serverId, method, command, description, parameters, apiEndpoint, apiKey } = req.body;

    const parameter = await Parameter.findByPk(id);
    if (!parameter) {
      return res.status(404).json({
        success: false,
        message: '参数组不存在'
      });
    }

    // 如果更新了serverId，验证服务器是否存在
    if (serverId && serverId !== parameter.serverId) {
      const server = await Server.findByPk(serverId);
      if (!server) {
        return res.status(400).json({
          success: false,
          message: '指定的服务器不存在'
        });
      }
    }

    await parameter.update({
      name,
      serverId,
      method,
      command,
      description,
      parameters,
      apiEndpoint,
      apiKey
    });

    logger.info('Parameter updated', { 
      parameterId: parameter.id, 
      name: parameter.name,
      updatedBy: req.user.username 
    });

    res.json({
      success: true,
      data: parameter,
      message: '参数组更新成功'
    });
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        success: false,
        message: '数据验证失败',
        errors: error.errors.map(e => e.message)
      });
    }
    next(error);
  }
};

const deleteParameter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parameter = await Parameter.findByPk(id);

    if (!parameter) {
      return res.status(404).json({
        success: false,
        message: '参数组不存在'
      });
    }

    await parameter.destroy();

    logger.info('Parameter deleted', { 
      parameterId: id, 
      name: parameter.name,
      deletedBy: req.user.username 
    });

    res.json({
      success: true,
      message: '参数组删除成功'
    });
  } catch (error) {
    next(error);
  }
};

const executeParameter = async (req, res, next) => {
  try {
    const { id } = req.params;
    const paramValues = req.query; // 从查询参数中获取动态参数值

    const parameter = await Parameter.findByPk(id, {
      include: [{
        model: Server,
        as: 'server',
        attributes: ['id', 'name', 'host', 'port', 'username', 'password']
      }]
    });

    if (!parameter) {
      return res.status(404).json({
        success: false,
        message: '参数组不存在'
      });
    }

    if (!parameter.server) {
      return res.status(400).json({
        success: false,
        message: '关联的服务器不存在'
      });
    }

    // 替换命令中的参数变量
    let command = parameter.command;
    
    if (parameter.parameters && Array.isArray(parameter.parameters)) {
      for (const param of parameter.parameters) {
        if (param.name && param.required && !paramValues[param.name]) {
          return res.status(400).json({
            success: false,
            message: `缺少必需参数: ${param.name}`,
            requiredParameters: parameter.parameters
          });
        }
        
        const value = paramValues[param.name] || param.default || '';
        const placeholder = `[${param.name}]`;
        command = command.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      }
    }

    logger.info('Executing parameterized command', {
      parameterId: parameter.id,
      parameterName: parameter.name,
      serverId: parameter.server.id,
      serverHost: parameter.server.host,
      originalCommand: parameter.command,
      finalCommand: command,
      parameters: paramValues,
      executedBy: req.user?.username || 'system'
    });

    // 执行SSH命令
    const result = await sshService.executeCommand({
      host: parameter.server.host,
      port: parameter.server.port,
      username: parameter.server.username,
      password: parameter.server.password
    }, command);

    res.json({
      success: true,
      data: {
        parameter: {
          id: parameter.id,
          name: parameter.name,
          command: parameter.command,
          finalCommand: command
        },
        server: {
          id: parameter.server.id,
          name: parameter.server.name,
          host: parameter.server.host
        },
        result: result,
        executedAt: new Date().toISOString()
      },
      message: '命令执行成功'
    });

  } catch (error) {
    logger.error('Parameter execution failed', {
      parameterId: req.params.id,
      error: error.message,
      executedBy: req.user?.username || 'system'
    });
    
    res.status(500).json({
      success: false,
      message: '命令执行失败',
      error: error.message
    });
  }
};

module.exports = {
  getParameters,
  getParameter,
  createParameter,
  updateParameter,
  deleteParameter,
  executeParameter
};