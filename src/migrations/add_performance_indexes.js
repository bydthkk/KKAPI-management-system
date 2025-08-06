const { QueryInterface, DataTypes } = require('sequelize');
const logger = require('../utils/logger');

/**
 * 数据库索引优化迁移
 * 
 * 基于代码分析，添加以下性能优化索引：
 * 1. Tasks表 - 状态、服务器ID、参数ID、创建时间索引
 * 2. Parameters表 - 服务器ID、API端点索引
 * 3. Users表 - 用户名、邮箱、角色索引
 * 4. Servers表 - 状态、主机索引
 * 5. SystemSettings表 - 键名索引
 */

module.exports = {
  up: async (queryInterface) => {
    try {
      logger.info('Starting database performance index migration...');

      // 1. Tasks表索引 - 最频繁查询的表
      await queryInterface.addIndex('tasks', {
        fields: ['status'],
        name: 'idx_tasks_status'
      });
      logger.info('Added index on tasks.status');

      await queryInterface.addIndex('tasks', {
        fields: ['serverId'],
        name: 'idx_tasks_server_id'
      });
      logger.info('Added index on tasks.serverId');

      await queryInterface.addIndex('tasks', {
        fields: ['parameterId'],
        name: 'idx_tasks_parameter_id'
      });
      logger.info('Added index on tasks.parameterId');

      await queryInterface.addIndex('tasks', {
        fields: ['createdAt'],
        name: 'idx_tasks_created_at'
      });
      logger.info('Added index on tasks.createdAt');

      // 复合索引用于常见的组合查询
      await queryInterface.addIndex('tasks', {
        fields: ['status', 'createdAt'],
        name: 'idx_tasks_status_created'
      });
      logger.info('Added composite index on tasks.status+createdAt');

      await queryInterface.addIndex('tasks', {
        fields: ['serverId', 'status'],
        name: 'idx_tasks_server_status'
      });
      logger.info('Added composite index on tasks.serverId+status');

      // 2. Parameters表索引
      await queryInterface.addIndex('parameters', {
        fields: ['serverId'],
        name: 'idx_parameters_server_id'
      });
      logger.info('Added index on parameters.serverId');

      await queryInterface.addIndex('parameters', {
        fields: ['apiEndpoint'],
        name: 'idx_parameters_api_endpoint'
      });
      logger.info('Added index on parameters.apiEndpoint');

      await queryInterface.addIndex('parameters', {
        fields: ['method'],
        name: 'idx_parameters_method'
      });
      logger.info('Added index on parameters.method');

      // 3. Users表索引 (部分已有unique约束)
      await queryInterface.addIndex('users', {
        fields: ['role'],
        name: 'idx_users_role'
      });
      logger.info('Added index on users.role');

      await queryInterface.addIndex('users', {
        fields: ['status'],
        name: 'idx_users_status'
      });
      logger.info('Added index on users.status');

      await queryInterface.addIndex('users', {
        fields: ['lastLoginAt'],
        name: 'idx_users_last_login'
      });
      logger.info('Added index on users.lastLoginAt');

      // 4. Servers表索引
      await queryInterface.addIndex('servers', {
        fields: ['status'],
        name: 'idx_servers_status'
      });
      logger.info('Added index on servers.status');

      await queryInterface.addIndex('servers', {
        fields: ['host'],
        name: 'idx_servers_host'
      });
      logger.info('Added index on servers.host');

      await queryInterface.addIndex('servers', {
        fields: ['lastTestAt'],
        name: 'idx_servers_last_test'
      });
      logger.info('Added index on servers.lastTestAt');

      // 复合索引用于服务器排序查询
      await queryInterface.addIndex('servers', {
        fields: ['status', 'name'],
        name: 'idx_servers_status_name'
      });
      logger.info('Added composite index on servers.status+name');

      // 5. SystemSettings表索引 (已在模型中定义，跳过)
      logger.info('SystemSettings indexes already defined in model, skipping...');

      logger.info('Database performance index migration completed successfully');

    } catch (error) {
      logger.error('Database index migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    try {
      logger.info('Rolling back database performance indexes...');

      // 删除所有添加的索引
      const indexesToRemove = [
        // Tasks表索引
        'idx_tasks_status',
        'idx_tasks_server_id', 
        'idx_tasks_parameter_id',
        'idx_tasks_created_at',
        'idx_tasks_status_created',
        'idx_tasks_server_status',
        
        // Parameters表索引
        'idx_parameters_server_id',
        'idx_parameters_api_endpoint',
        'idx_parameters_method',
        
        // Users表索引
        'idx_users_role',
        'idx_users_status',
        'idx_users_last_login',
        
        // Servers表索引
        'idx_servers_status',
        'idx_servers_host',
        'idx_servers_last_test',
        'idx_servers_status_name'
        
        // SystemSettings索引已在模型中定义，无需删除
      ];

      for (const indexName of indexesToRemove) {
        try {
          // 根据索引名称确定对应的表
          let tableName = 'tasks';
          if (indexName.includes('parameters')) tableName = 'parameters';
          else if (indexName.includes('users')) tableName = 'users';  
          else if (indexName.includes('servers')) tableName = 'servers';
          
          await queryInterface.removeIndex(tableName, indexName);
        } catch (error) {
          // 忽略索引不存在的错误
          if (!error.message.includes('does not exist')) {
            logger.warn(`Failed to remove index ${indexName}:`, error.message);
          }
        }
      }

      logger.info('Database performance index rollback completed');

    } catch (error) {
      logger.error('Database index rollback failed:', error);
      throw error;
    }
  }
};