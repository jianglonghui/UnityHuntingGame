# 端口配置指南

本指南说明如何自定义服务器端口和地址。

## 📋 配置方式

游戏支持三种配置方式，按优先级排序：

### 1. 环境变量 (.env 文件) - 推荐

这是最灵活的配置方式，适合不同环境部署。

#### 步骤：

1. 复制 `.env.example` 文件为 `.env`：
   ```bash
   cd threejs-version
   cp .env.example .env
   ```

2. 编辑 `.env` 文件：
   ```env
   # 修改端口（默认: 3000）
   PORT=8080

   # 修改服务器地址
   # 本地开发使用 localhost
   SERVER_HOST=localhost

   # 或者使用局域网IP（局域网多人游戏）
   # SERVER_HOST=192.168.1.100

   # 或者使用域名（公网部署）
   # SERVER_HOST=game.example.com
   ```

3. 重启服务器：
   ```bash
   cd server
   npm start
   ```

### 2. 客户端配置文件

修改客户端连接的服务器地址。

#### 步骤：

编辑 `js/config/ClientConfig.js`：

```javascript
export const ClientConfig = {
    // 修改这里的服务器地址和端口
    SERVER_HOST: 'localhost',  // 改为服务器IP或域名
    SERVER_PORT: 8080,          // 改为实际端口

    // ... 其他配置
};
```

**注意**：如果使用 `autoDetect()`（默认），客户端会自动使用当前页面的地址。

### 3. 命令行环境变量

适合临时测试或容器部署。

```bash
# Linux/macOS
PORT=8080 npm start

# Windows CMD
set PORT=8080 && npm start

# Windows PowerShell
$env:PORT=8080; npm start
```

## 🌐 常见场景

### 场景1：本地开发（默认）

**配置**：无需修改
- 服务器端口：3000
- 访问地址：http://localhost:3000

```bash
cd threejs-version/server
npm start
```

### 场景2：本地开发 - 自定义端口

**原因**：端口3000被占用

**配置 .env**：
```env
PORT=8080
SERVER_HOST=localhost
```

**访问地址**：http://localhost:8080

### 场景3：局域网多人游戏

**场景**：多台电脑在同一局域网内联机

**配置 .env**：
```env
PORT=3000
SERVER_HOST=192.168.1.100  # 改为服务器电脑的局域网IP
```

**步骤**：
1. 查找服务器电脑的局域网IP：
   - Windows: `ipconfig`
   - macOS/Linux: `ifconfig` 或 `ip addr`

2. 在服务器电脑上启动服务器

3. 其他玩家访问：http://192.168.1.100:3000

**注意**：确保防火墙允许该端口的连接。

### 场景4：公网部署

**场景**：部署到云服务器供公网玩家访问

**配置 .env**：
```env
PORT=3000
SERVER_HOST=game.example.com  # 改为你的域名或公网IP
```

**或使用自动检测**：
客户端会自动使用页面URL的地址，无需额外配置。

**注意**：
- 确保云服务器安全组/防火墙开放该端口
- 建议使用 Nginx 反向代理 + SSL
- 考虑使用进程管理工具如 PM2：
  ```bash
  npm install -g pm2
  pm2 start server/server.js --name hunting-game
  ```

## 🔧 配置文件详解

### 服务器配置文件

#### `config.js`
共享配置文件，同时用于服务器和客户端：

```javascript
const config = {
    // 服务器端口（可通过环境变量 PORT 覆盖）
    SERVER_PORT: process.env.PORT || 3000,

    // 服务器地址（可通过环境变量 SERVER_HOST 覆盖）
    SERVER_HOST: process.env.SERVER_HOST || 'localhost',

    // 完整URL（自动生成）
    get SERVER_URL() {
        return `http://${this.SERVER_HOST}:${this.SERVER_PORT}`;
    },

    // 房间配置
    ROOM: {
        MAX_PLAYERS: 4,
        MIN_PLAYERS: 2,
        GAME_DURATION: 60,
    },
};
```

### 客户端配置文件

#### `js/config/ClientConfig.js`
客户端专用配置：

```javascript
export const ClientConfig = {
    SERVER_HOST: 'localhost',
    SERVER_PORT: 3000,

    get SERVER_URL() {
        return `http://${this.SERVER_HOST}:${this.SERVER_PORT}`;
    },

    // 自动检测当前页面地址
    autoDetect() {
        if (window.location.hostname !== 'localhost') {
            this.SERVER_HOST = window.location.hostname;
            this.SERVER_PORT = window.location.port || 80;
        }
        return this.SERVER_URL;
    }
};
```

## 🚨 常见问题

### 问题1：修改端口后无法连接

**可能原因**：
- 服务器端口和客户端端口配置不一致
- 防火墙阻止连接
- 端口被其他程序占用

**解决方案**：
1. 确保服务器和客户端配置的端口一致
2. 检查防火墙设置
3. 检查端口占用：
   ```bash
   # Windows
   netstat -ano | findstr :端口号

   # macOS/Linux
   lsof -i :端口号
   ```

### 问题2：局域网其他电脑无法访问

**可能原因**：
- 防火墙阻止
- IP地址配置错误
- 未在同一网络

**解决方案**：
1. 检查防火墙设置（Windows防火墙/macOS防火墙）
2. 确认IP地址正确（不要使用127.0.0.1）
3. 确保在同一局域网（相同路由器）
4. 尝试 ping 服务器IP

### 问题3：公网部署后客户端无法连接

**可能原因**：
- 云服务器安全组未开放端口
- 客户端配置的地址不正确
- 需要使用域名而非IP

**解决方案**：
1. 在云服务商控制台开放端口
2. 使用 `autoDetect()` 自动检测地址
3. 配置域名解析

## 📝 配置检查清单

部署前请检查：

- [ ] 服务器端口配置正确
- [ ] 客户端服务器地址配置正确
- [ ] 防火墙/安全组已开放端口
- [ ] 能够通过浏览器访问服务器地址
- [ ] WebSocket连接正常（浏览器控制台无错误）

## 🎯 快速测试

测试服务器是否正常运行：

```bash
# 启动服务器
cd threejs-version/server
npm start

# 在浏览器访问
http://localhost:3000  # 或你配置的地址

# 检查控制台输出
# 应显示: Server running on port 3000
```

## 💡 最佳实践

1. **本地开发**：使用默认配置（localhost:3000）
2. **团队协作**：在 `.env` 中配置，不提交到Git
3. **生产部署**：
   - 使用环境变量配置
   - 使用进程管理工具（PM2）
   - 配置反向代理（Nginx）
   - 使用HTTPS（推荐）
4. **安全性**：
   - 不要在代码中硬编码敏感信息
   - 使用 `.gitignore` 忽略 `.env` 文件
   - 定期更新依赖包

## 🔗 相关文档

- [多人游戏测试指南](./MULTIPLAYER_TESTING.md)
- [多人游戏说明](./MULTIPLAYER_README.md)
