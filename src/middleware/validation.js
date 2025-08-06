const Joi = require('joi');
const SystemSettings = require('../models/SystemSettings');

const validateSSHConnection = (req, res, next) => {
  const schema = Joi.object({
    host: Joi.string().required().messages({
      'string.empty': 'Host is required',
      'any.required': 'Host is required'
    }),
    port: Joi.number().integer().min(1).max(65535).default(22),
    username: Joi.string().required().messages({
      'string.empty': 'Username is required',
      'any.required': 'Username is required'
    }),
    password: Joi.string().when('privateKey', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required().messages({
        'any.required': 'Password is required when privateKey is not provided'
      })
    }),
    privateKey: Joi.string().optional(),
    passphrase: Joi.string().optional()
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.details = error.details.map(detail => detail.message);
    return next(validationError);
  }

  req.body = value;
  next();
};

const validateCommand = async (req, res, next) => {
  try {
    // 从数据库读取安全设置
    const [whitelistEnabled, allowedCommands, maxCommandLength] = await Promise.all([
      SystemSettings.findOne({ where: { key: 'ssh_whitelist_enabled' } }),
      SystemSettings.findOne({ where: { key: 'ssh_allowed_commands' } }),
      SystemSettings.findOne({ where: { key: 'ssh_max_command_length' } })
    ]);
    
    // 获取配置值，如果数据库中没有则使用默认值
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

    const schema = Joi.object({
      command: Joi.string().required().max(maxLength).messages({
        'string.empty': 'Command is required',
        'any.required': 'Command is required',
        'string.max': `Command too long (max ${maxLength} characters)`
      }),
      connection: Joi.object({
        host: Joi.string().required(),
        port: Joi.number().integer().min(1).max(65535).default(22),
        username: Joi.string().required(),
        password: Joi.string().when('privateKey', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required()
        }),
        privateKey: Joi.string().optional(),
        passphrase: Joi.string().optional()
      }).required()
    });

    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const validationError = new Error('Validation failed');
      validationError.name = 'ValidationError';
      validationError.details = error.details.map(detail => detail.message);
      return next(validationError);
    }

    // 如果启用了白名单，检查命令是否在允许列表中
    if (enableWhitelist) {
      const command = value.command.trim().split(' ')[0]; // 取第一个词作为命令
      
      if (!commands.includes(command)) {
        const securityError = new Error('Command not allowed');
        securityError.name = 'SecurityError';
        securityError.details = [`Command "${command}" is not in the allowed commands list`];
        return next(securityError);
      }
    }

    req.body = value;
    next();
  } catch (error) {
    // 如果数据库查询失败，使用默认配置进行验证
    const config = require('../config/config');
    
    const schema = Joi.object({
      command: Joi.string().required().max(config.security.maxCommandLength).messages({
        'string.empty': 'Command is required',
        'any.required': 'Command is required',
        'string.max': `Command too long (max ${config.security.maxCommandLength} characters)`
      }),
      connection: Joi.object({
        host: Joi.string().required(),
        port: Joi.number().integer().min(1).max(65535).default(22),
        username: Joi.string().required(),
        password: Joi.string().when('privateKey', {
          is: Joi.exist(),
          then: Joi.optional(),
          otherwise: Joi.required()
        }),
        privateKey: Joi.string().optional(),
        passphrase: Joi.string().optional()
      }).required()
    });

    const { error: validationError, value } = schema.validate(req.body);
    
    if (validationError) {
      const validationErr = new Error('Validation failed');
      validationErr.name = 'ValidationError';
      validationErr.details = validationError.details.map(detail => detail.message);
      return next(validationErr);
    }

    // 使用默认配置的白名单检查
    if (config.security.enableWhitelist) {
      const command = value.command.trim().split(' ')[0];
      
      if (!config.security.allowedCommands.includes(command)) {
        const securityError = new Error('Command not allowed');
        securityError.name = 'SecurityError';
        securityError.details = [`Command "${command}" is not in the allowed commands list`];
        return next(securityError);
      }
    }

    req.body = value;
    next();
  }
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().required().messages({
      'string.empty': '用户名不能为空',
      'any.required': '用户名是必填项'
    }),
    password: Joi.string().required().messages({
      'string.empty': '密码不能为空',
      'any.required': '密码是必填项'
    })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.details = error.details.map(detail => detail.message);
    return next(validationError);
  }

  req.body = value;
  next();
};

const validateChangePassword = (req, res, next) => {
  const schema = Joi.object({
    oldPassword: Joi.string().required().messages({
      'string.empty': '当前密码不能为空',
      'any.required': '当前密码是必填项'
    }),
    newPassword: Joi.string().min(6).required().messages({
      'string.empty': '新密码不能为空',
      'string.min': '新密码至少6位',
      'any.required': '新密码是必填项'
    })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.details = error.details.map(detail => detail.message);
    return next(validationError);
  }

  req.body = value;
  next();
};

const validateServer = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().required().max(100).messages({
      'string.empty': '服务器名称不能为空',
      'any.required': '服务器名称是必填项',
      'string.max': '服务器名称不能超过100个字符'
    }),
    host: Joi.alternatives().try(
      Joi.string().ip(),
      Joi.string().hostname()
    ).required().messages({
      'string.empty': '主机地址不能为空',
      'alternatives.match': '请输入有效的IP地址或域名',
      'any.required': '主机地址是必填项'
    }),
    port: Joi.number().integer().min(1).max(65535).default(22),
    username: Joi.string().required().messages({
      'string.empty': '用户名不能为空',
      'any.required': '用户名是必填项'
    }),
    password: Joi.string().required().messages({
      'string.empty': '密码不能为空',
      'any.required': '密码是必填项'
    }),
    description: Joi.string().allow('').optional()
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.details = error.details.map(detail => detail.message);
    return next(validationError);
  }

  req.body = value;
  next();
};

const validateParameter = (req, res, next) => {
  const parameterItemSchema = Joi.object({
    name: Joi.string().required().messages({
      'string.empty': '参数名称不能为空',
      'any.required': '参数名称是必填项'
    }),
    description: Joi.string().allow('').optional(),
    required: Joi.boolean().default(false),
    default: Joi.string().allow('').optional()
  });

  const schema = Joi.object({
    name: Joi.string().required().max(100).messages({
      'string.empty': '参数组名称不能为空',
      'any.required': '参数组名称是必填项',
      'string.max': '参数组名称不能超过100个字符'
    }),
    serverId: Joi.number().integer().required().messages({
      'any.required': '服务器ID是必填项',
      'number.base': '服务器ID必须是数字'
    }),
    method: Joi.string().required().max(50).messages({
      'string.empty': '执行方法不能为空',
      'any.required': '执行方法是必填项',
      'string.max': '执行方法不能超过50个字符'
    }),
    command: Joi.string().required().messages({
      'string.empty': '执行命令不能为空',
      'any.required': '执行命令是必填项'
    }),
    description: Joi.string().allow('').optional(),
    parameters: Joi.array().items(parameterItemSchema).optional(),
    apiEndpoint: Joi.string().max(200).optional().messages({
      'string.max': 'API端点名称不能超过200个字符'
    }),
    apiKey: Joi.string().max(500).allow('').optional().messages({
      'string.max': 'API密钥不能超过500个字符'
    })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.details = error.details.map(detail => detail.message);
    return next(validationError);
  }

  req.body = value;
  next();
};

const validateTaskExecution = (req, res, next) => {
  const schema = Joi.object({
    parameterId: Joi.number().integer().required().messages({
      'any.required': '参数组ID是必填项',
      'number.base': '参数组ID必须是数字'
    }),
    method: Joi.string().required().max(50).messages({
      'string.empty': '执行方法不能为空',
      'any.required': '执行方法是必填项',
      'string.max': '执行方法不能超过50个字符'
    }),
    command: Joi.string().required().messages({
      'string.empty': '执行命令不能为空',
      'any.required': '执行命令是必填项'
    }),
    serverId: Joi.number().integer().required().messages({
      'any.required': '服务器ID是必填项',
      'number.base': '服务器ID必须是数字'
    })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.details = error.details.map(detail => detail.message);
    return next(validationError);
  }

  req.body = value;
  next();
};

const validateUpdateProfile = (req, res, next) => {
  const schema = Joi.object({
    nickname: Joi.string().max(100).allow('').optional().messages({
      'string.max': '昵称不能超过100个字符'
    }),
    avatar: Joi.string().allow('').optional().messages({
      'string.base': '头像必须是字符串格式'
    })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.details = error.details.map(detail => detail.message);
    return next(validationError);
  }

  req.body = value;
  next();
};

const validateCreateUser = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(50).required().messages({
      'string.empty': '用户名不能为空',
      'string.min': '用户名至少3个字符',
      'string.max': '用户名不能超过50个字符',
      'any.required': '用户名是必填项'
    }),
    password: Joi.string().min(6).max(255).required().messages({
      'string.empty': '密码不能为空',
      'string.min': '密码至少6个字符',
      'string.max': '密码不能超过255个字符',
      'any.required': '密码是必填项'
    }),
    email: Joi.string().email().optional().allow('', null).default(null).messages({
      'string.email': '请输入有效的邮箱地址'
    }),
    role: Joi.string().valid('admin', 'user').default('user').messages({
      'any.only': '角色只能是admin或user'
    }),
    nickname: Joi.string().max(100).optional().allow('', null).default(null).messages({
      'string.max': '昵称不能超过100个字符'
    }),
    permissions: Joi.array().items(Joi.string()).optional().allow(null).messages({
      'array.base': '权限必须是数组格式'
    })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.details = error.details.map(detail => detail.message);
    return next(validationError);
  }

  req.body = value;
  next();
};

const validateUpdateUser = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(50).optional().messages({
      'string.min': '用户名至少3个字符',
      'string.max': '用户名不能超过50个字符'
    }),
    email: Joi.string().email().optional().allow('', null).default(null).messages({
      'string.email': '请输入有效的邮箱地址'
    }),
    role: Joi.string().valid('admin', 'user').optional().messages({
      'any.only': '角色只能是admin或user'
    }),
    nickname: Joi.string().max(100).optional().allow('', null).default(null).messages({
      'string.max': '昵称不能超过100个字符'
    }),
    permissions: Joi.array().items(Joi.string()).optional().allow(null).messages({
      'array.base': '权限必须是数组格式'
    }),
    status: Joi.string().valid('active', 'inactive').optional().messages({
      'any.only': '状态只能是active或inactive'
    })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.details = error.details.map(detail => detail.message);
    return next(validationError);
  }

  req.body = value;
  next();
};

const validateResetPassword = (req, res, next) => {
  const schema = Joi.object({
    newPassword: Joi.string().min(6).max(255).required().messages({
      'string.empty': '新密码不能为空',
      'string.min': '新密码至少6个字符',
      'string.max': '新密码不能超过255个字符',
      'any.required': '新密码是必填项'
    })
  });

  const { error, value } = schema.validate(req.body);
  
  if (error) {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.details = error.details.map(detail => detail.message);
    return next(validationError);
  }

  req.body = value;
  next();
};

module.exports = {
  validateSSHConnection,
  validateCommand,
  validateLogin,
  validateChangePassword,
  validateServer,
  validateParameter,
  validateTaskExecution,
  validateUpdateProfile,
  validateCreateUser,
  validateUpdateUser,
  validateResetPassword
};