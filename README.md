# API管理系统

一个功能强大的API管理平台，提供服务器监控、SSH远程执行、参数化API、任务管理和系统设置等功能。

## ✨ 主要特性

- 🖥️ **服务器管理** - 添加、监控和管理多台服务器
- 🔐 **SSH远程执行** - 安全的SSH命令执行，支持命令白名单
- ⚙️ **参数化API** - 创建动态API端点，支持参数替换
- 📊 **实时监控** - 服务器状态监控和系统信息展示
- 📝 **任务管理** - API执行历史和任务追踪
- 👥 **用户管理** - 多用户支持，角色权限控制
- 🌐 **多语言支持** - 中英文界面切换
- 📱 **响应式设计** - 支持桌面和移动设备
- 🐳 **Docker支持** - 容器化部署

## 🏗️ 技术栈

### 后端
- **Node.js** - 服务器运行环境
- **Express.js** - Web应用框架
- **Sequelize** - ORM数据库操作
- **SQLite** - 轻量级数据库
- **SSH2** - SSH连接和命令执行
- **Socket.io** - 实时通信
- **Winston** - 日志记录

### 前端
- **Vue.js 3** - 前端框架
- **Element Plus** - UI组件库
- **Vue Router** - 路由管理
- **Pinia** - 状态管理
- **Vue I18n** - 国际化
- **Vite** - 构建工具
- **Axios** - HTTP客户端

## 📦 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/yourusername/api-management-system.git
cd api-management-system
```

2. **安装依赖**
```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd frontend
npm install
cd ..
```

3. **环境配置**
```bash
# 复制环境变量文件
cp .env.example .env

# 根据需要修改配置
vim .env
```

4. **构建前端**
```bash
cd frontend
npm run build
cd ..
```

5. **启动服务**
```bash
npm start
```

6. **访问应用**
打开浏览器访问 `http://localhost:3000`

默认管理员账户：
- 用户名: `admin`
- 密码: `admin123`

## 🔧 配置说明

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `PORT` | 服务器端口 | `3000` |
| `NODE_ENV` | 运行环境 | `development` |
| `DEFAULT_SSH_PORT` | 默认SSH端口 | `22` |
| `SSH_TIMEOUT` | SSH连接超时(毫秒) | `30000` |
| `LOG_LEVEL` | 日志级别 | `info` |
| `ENABLE_WHITELIST` | 启用SSH命令白名单 | `true` |
| `MAX_COMMAND_LENGTH` | 最大命令长度 | `1000` |

### SSH安全配置

系统默认启用SSH命令白名单，只允许执行预设的安全命令。可通过管理界面进行配置：

**默认允许的命令:**
- 基础命令: `ls`, `pwd`, `whoami`, `ps`, `df`, `free` 等
- 系统信息: `uname`, `lscpu`, `uptime`, `date` 等
- 网络工具: `ping`, `curl`, `wget`, `netstat` 等
- 文件操作: `cat`, `head`, `tail`, `grep`, `find` 等

**安全特性:**
- 命令长度限制
- 白名单机制
- 命令执行记录
- 用户权限控制

## 🚀 功能详解

### 1. 服务器管理
- 添加服务器连接信息
- 支持密码和密钥认证
- 自动检测操作系统类型
- 服务器状态实时监控
- 连接测试功能

### 2. SSH远程执行
- 安全的远程命令执行
- 命令白名单保护
- 实时输出显示
- 执行历史记录
- 错误处理和日志

### 3. 参数化API
- 创建动态API端点
- 支持URL参数替换
- API密钥认证
- 执行结果缓存
- 使用统计

### 4. 监控面板
- 服务器资源监控
- 系统信息展示
- 网络状态检查
- 历史数据图表

### 5. 任务管理
- API执行历史
- 任务状态追踪
- 结果查看和下载
- 批量操作

### 6. 系统设置
- 用户权限管理
- 安全策略配置
- 系统参数调整
- 日志级别设置

## 📊 API文档

### 认证
所有API请求需要在Header中包含认证信息：
```
Authorization: Bearer <token>
```

### 主要端点

#### 服务器管理
```
GET    /api/servers          # 获取服务器列表
POST   /api/servers          # 添加服务器
PUT    /api/servers/:id      # 更新服务器
DELETE /api/servers/:id      # 删除服务器
POST   /api/servers/:id/test # 测试连接
```

#### SSH执行
```
GET    /api/ssh/allowed-commands  # 获取允许的命令
PUT    /api/ssh/security-settings # 更新安全设置
POST   /api/ssh/execute           # 执行命令
POST   /api/ssh/server-info       # 获取服务器信息
```

#### 参数管理
```
GET    /api/parameters       # 获取参数列表
POST   /api/parameters       # 创建参数
PUT    /api/parameters/:id   # 更新参数
DELETE /api/parameters/:id   # 删除参数
```

#### 动态API
```
GET    /api/:endpoint        # 执行参数化API
```

## 🐳 Docker部署

### 使用Docker Compose

1. **克隆项目并配置**
```bash
git clone https://github.com/yourusername/api-management-system.git
cd api-management-system
cp .env.example .env
```

2. **启动服务**
```bash
docker-compose up -d
```

3. **访问应用**
```
http://localhost:3000
```

### Dockerfile构建

```bash
# 构建镜像
docker build -t api-management-system .

# 运行容器
docker run -d \
  --name api-management \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  api-management-system
```

## 🔒 安全建议

1. **更改默认密码**
   - 首次登录后立即修改admin密码

2. **启用HTTPS**
   - 生产环境建议使用HTTPS
   - 配置SSL证书

3. **网络安全**
   - 使用防火墙限制访问
   - 配置VPN或专用网络

4. **SSH安全**
   - 保持命令白名单启用
   - 定期审查允许的命令
   - 监控命令执行日志

5. **数据备份**
   - 定期备份数据库文件
   - 配置自动备份策略

## 📚 开发指南

### 项目结构
```
api-management-system/
├── src/                    # 后端源码
│   ├── config/            # 配置文件
│   ├── controllers/       # 控制器
│   ├── middleware/        # 中间件
│   ├── models/           # 数据模型
│   ├── routes/           # 路由定义
│   ├── services/         # 业务服务
│   └── utils/            # 工具函数
├── frontend/              # 前端源码
│   ├── src/
│   │   ├── components/   # 组件
│   │   ├── views/        # 页面
│   │   ├── utils/        # 工具函数
│   │   └── i18n/         # 国际化
│   └── dist/             # 构建输出
├── public/               # 静态文件
├── icon/                 # 系统图标
├── docker-compose.yml    # Docker编排
├── Dockerfile           # Docker镜像
└── package.json         # 项目配置
```

### 开发模式运行

```bash
# 后端开发模式
npm run dev

# 前端开发模式
cd frontend
npm run dev
```

### 代码规范
- 使用ESLint进行代码检查
- 遵循JavaScript/Vue.js最佳实践
- 提交前运行测试和代码检查

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建Pull Request

## 📄 许可证

本项目采用 MIT 许可证。查看 [LICENSE](LICENSE) 文件了解更多信息。

## ❓ 常见问题

### Q: 如何添加新的SSH命令？
A: 登录管理界面，进入"安全设置"页面，在命令白名单中添加需要的命令。

### Q: 忘记管理员密码怎么办？
A: 可以通过直接修改数据库中的用户记录来重置密码。

### Q: 如何备份数据？
A: 复制项目目录下的 `database.sqlite` 文件即可完成数据备份。

### Q: 支持哪些操作系统？
A: 系统可以连接到任何支持SSH的Linux/Unix系统，包括Ubuntu、CentOS、Debian等。

### Q: 可以同时连接多少台服务器？
A: 理论上没有限制，但建议根据服务器性能合理控制并发连接数。

## 📞 支持与反馈

如果您遇到问题或有建议，请通过以下方式联系：

- 创建 [GitHub Issue](https://github.com/yourusername/api-management-system/issues)
- 发送邮件到 your.email@example.com

## 🔄 更新日志

### v1.0.0 (2025-01-XX)
- 初始版本发布
- 基础服务器管理功能
- SSH远程执行
- 参数化API
- 用户权限管理
- 安全设置功能
- 命令白名单状态持久化修复

---

**感谢使用API管理系统！** 🎉