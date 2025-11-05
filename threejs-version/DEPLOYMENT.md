# 部署指南

## 服务器配置

### 1. 服务器端部署

**启动 Socket.io 服务器：**
```bash
cd threejs-version/server
npm install
npm start
```

服务器默认运行在 `3000` 端口。可以通过修改 `.env` 文件来更改端口：

```bash
# threejs-version/.env
PORT=3000
SERVER_HOST=0.0.0.0
```

### 2. 客户端部署

将 `threejs-version` 目录（除了 `server` 文件夹）部署到 Web 服务器。

### 3. 配置 Socket.io 服务器地址

当页面地址和 Socket.io 服务器地址不同时（例如页面在80端口，Socket.io在3000端口），需要指定服务器地址。

#### 方法1：使用 URL 参数（推荐）

访问时在 URL 后添加 `serverUrl` 参数：

```
http://113.44.233.34/?serverUrl=http://113.44.233.34:3000
```

#### 方法2：浏览器控制台设置（永久保存）

打开浏览器控制台（F12），输入：

```javascript
// 打开控制台，导入配置模块
import('/js/config/ClientConfig.js').then(module => {
    const { ClientConfig } = module;
    // 设置服务器地址
    ClientConfig.saveServerConfig('113.44.233.34', 3000);
    // 刷新页面
    location.reload();
});
```

这会将配置保存到 localStorage，下次访问时自动使用。

**清除已保存的配置：**
```javascript
import('/js/config/ClientConfig.js').then(module => {
    const { ClientConfig } = module;
    ClientConfig.clearServerConfig();
    location.reload();
});
```

#### 方法3：修改默认配置

直接修改 `js/config/ClientConfig.js` 文件：

```javascript
export const ClientConfig = {
    SERVER_HOST: '113.44.233.34',  // 修改为你的服务器IP
    SERVER_PORT: 3000,              // 修改为Socket.io服务器端口
    // ...
};
```

## 配置优先级

1. **URL 参数** - 最高优先级
2. **localStorage 保存的配置** - 中等优先级
3. **自动检测** - 最低优先级（默认使用当前页面地址和端口）

## 常见部署场景

### 场景1：开发环境（页面和服务器在同一端口）

访问 `http://localhost:3000`，会自动检测并连接到同一地址。

### 场景2：生产环境（页面和服务器在不同端口）

- 页面：`http://113.44.233.34` (80端口)
- 服务器：`http://113.44.233.34:3000` (3000端口)

**使用 URL 参数访问：**
```
http://113.44.233.34/?serverUrl=http://113.44.233.34:3000
```

### 场景3：反向代理（推荐生产环境）

使用 Nginx 或 Apache 配置反向代理，将 Socket.io 请求转发到后端服务器：

**Nginx 配置示例：**
```nginx
server {
    listen 80;
    server_name 113.44.233.34;

    # 静态文件
    location / {
        root /path/to/threejs-version;
        index index.html;
    }

    # Socket.io 代理
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

使用反向代理后，页面和 Socket.io 使用相同的地址和端口，无需额外配置。

## 防火墙配置

确保 Socket.io 服务器端口（默认 3000）已开放：

```bash
# Ubuntu/Debian
sudo ufw allow 3000

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

## 测试连接

打开浏览器控制台，检查是否有以下日志：

```
[ClientConfig] Auto-detected server: http://113.44.233.34:3000
Connected to server, socket ID: xxxxx
```

如果看到连接错误，检查：
1. Socket.io 服务器是否正在运行
2. 防火墙是否开放端口
3. 服务器地址配置是否正确
