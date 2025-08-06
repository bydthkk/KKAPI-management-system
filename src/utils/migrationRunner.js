const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

/**
 * 数据库迁移执行器
 * 用于运行数据库性能优化索引迁移
 */
class MigrationRunner {
  constructor() {
    this.migrationPath = path.join(__dirname, '../migrations');
  }

  async runMigration(migrationName) {
    try {
      const migrationFile = path.join(this.migrationPath, `${migrationName}.js`);
      
      if (!fs.existsSync(migrationFile)) {
        throw new Error(`Migration file not found: ${migrationFile}`);
      }

      logger.info(`Running migration: ${migrationName}`);
      
      // 动态加载迁移文件
      const migration = require(migrationFile);
      
      // 执行up方法
      await migration.up(sequelize.getQueryInterface());
      
      logger.info(`Migration completed successfully: ${migrationName}`);
      return true;

    } catch (error) {
      logger.error(`Migration failed: ${migrationName}`, error);
      throw error;
    }
  }

  async rollbackMigration(migrationName) {
    try {
      const migrationFile = path.join(this.migrationPath, `${migrationName}.js`);
      
      if (!fs.existsSync(migrationFile)) {
        throw new Error(`Migration file not found: ${migrationFile}`);
      }

      logger.info(`Rolling back migration: ${migrationName}`);
      
      // 动态加载迁移文件
      const migration = require(migrationFile);
      
      // 执行down方法
      await migration.down(sequelize.getQueryInterface());
      
      logger.info(`Migration rollback completed: ${migrationName}`);
      return true;

    } catch (error) {
      logger.error(`Migration rollback failed: ${migrationName}`, error);
      throw error;
    }
  }

  async checkDatabaseConnection() {
    try {
      await sequelize.authenticate();
      logger.info('Database connection established successfully');
      return true;
    } catch (error) {
      logger.error('Unable to connect to database:', error);
      throw error;
    }
  }
}

module.exports = MigrationRunner;

// 如果直接执行此文件，运行性能索引迁移
if (require.main === module) {
  (async () => {
    const runner = new MigrationRunner();
    
    try {
      // 检查数据库连接
      await runner.checkDatabaseConnection();
      
      // 运行性能索引迁移
      await runner.runMigration('add_performance_indexes');
      
      logger.info('All migrations completed successfully');
      process.exit(0);
      
    } catch (error) {
      logger.error('Migration process failed:', error);
      process.exit(1);
    }
  })();
}