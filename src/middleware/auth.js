const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../utils/logger');

// 强制要求JWT密钥，避免使用不安全的默认值
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// 验证JWT密钥是否已设置
if (!JWT_SECRET) {
  logger.error('CRITICAL: JWT_SECRET environment variable is not set!');
  logger.error('Please set JWT_SECRET before starting the application');
  process.exit(1);
}

// 验证JWT密钥强度
if (JWT_SECRET.length < 32) {
  logger.warn('WARNING: JWT_SECRET should be at least 32 characters long for security');
}

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      role: user.role,
      permissions: user.permissions // 包含用户权限信息
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    // 如果没有从header获取到token，尝试从URL参数中获取key
    if (!token && req.query.key) {
      token = req.query.key;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.'
      });
    }

    // 尝试作为JWT token验证
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (!user || user.status !== 'active') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token or user inactive.'
        });
      }

      req.user = user;
      return next();
    } catch (jwtError) {
      // 如果JWT验证失败，并且token来自URL参数key，则检查是否匹配参数组的apiKey
      if (req.query.key && req.params.apiEndpoint) {
        const { Parameter } = require('../models');
        const parameter = await Parameter.findOne({
          where: { apiEndpoint: req.params.apiEndpoint }
        });
        
        if (parameter && parameter.apiKey && parameter.apiKey === token) {
          // API密钥匹配，创建一个虚拟用户对象
          req.user = {
            id: 'api-key-user',
            username: 'api-key-access',
            role: 'user'
          };
          return next();
        }
      }
      
      // 如果既不是有效JWT也不是匹配的API密钥，返回错误
      throw jwtError;
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token.'
    });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions.'
      });
    }

    next();
  };
};

module.exports = {
  generateToken,
  authenticateToken,
  requireRole
};