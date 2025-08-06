// 权限检查中间件
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      // 管理员拥有所有权限
      if (user.role === 'admin') {
        return next();
      }
      
      // 检查用户是否有相应权限
      if (!user.permissions || !Array.isArray(user.permissions)) {
        return res.status(403).json({
          success: false,
          message: '权限不足，请联系管理员'
        });
      }
      
      if (!user.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: `缺少权限：${requiredPermission}`
        });
      }
      
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: '权限验证失败'
      });
    }
  };
};

// 管理员权限检查
const checkAdminPermission = (req, res, next) => {
  try {
    const user = req.user;
    
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '只有管理员可以访问此功能'
      });
    }
    
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: '权限验证失败'
    });
  }
};

// 允许多个权限中任一个即可访问
const checkAnyPermission = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      const user = req.user;
      
      // 管理员拥有所有权限
      if (user.role === 'admin') {
        return next();
      }
      
      // 检查用户是否有相应权限
      if (!user.permissions || !Array.isArray(user.permissions)) {
        return res.status(403).json({
          success: false,
          message: '权限不足，请联系管理员'
        });
      }
      
      // 检查是否拥有任一所需权限
      const hasPermission = requiredPermissions.some(permission => 
        user.permissions.includes(permission)
      );
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `缺少权限，需要以下权限之一：${requiredPermissions.join(', ')}`
        });
      }
      
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: '权限验证失败'
      });
    }
  };
};

module.exports = {
  checkPermission,
  checkAdminPermission,
  checkAnyPermission
};