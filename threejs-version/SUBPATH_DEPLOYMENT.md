# 子路径部署指南

当你的游戏部署在子路径下（例如 `http://113.44.233.34/game/`）而不是根路径时，需要进行特殊配置。

## 架构说明

```
客户端访问: http://113.44.233.34/game/
    ↓
Nginx (80端口)
    ↓
    ├─ /game/ → 静态文件
    └─ /game/socket.io/ → 反向代理到 127.0.0.1:8090
```

## 方案 1: Nginx 反向代理（推荐）

### 1. 配置 Nginx

编辑 nginx 配置文件：

```nginx
server {
    listen 80;
    server_name 113.44.233.34;

    # 游戏静态文件（子路径）
    location /game/ {
        alias /path/to/UnityHuntingGame/threejs-version/;
        index index.html;
        try_files $uri $uri/ /game/index.html;
    }

    # Socket.io 代理（子路径）
    location /game/socket.io/ {
        # 重写路径：去掉 /game 前缀，转发到后端
        rewrite ^/game/socket.io/(.*)$ /socket.io/$1 break;

        proxy_pass http://127.0.0.1:8090;

        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 客户端信息
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;

        # 禁用缓冲
        proxy_buffering off;
    }
}
```

### 2. 配置 Socket.io 服务器

```bash
# threejs-version/.env
PORT=8090
SERVER_HOST=127.0.0.1
```

### 3. 启动服务器

```bash
cd /path/to/UnityHuntingGame/threejs-version/server
npm start
```

### 4. 测试并重载 Nginx

```bash
sudo nginx -t
sudo nginx -s reload
```

### 5. 访问游戏

**直接访问子路径，无需 URL 参数：**

```
http://113.44.233.34/game/
```

客户端会自动检测到当前 URL，socket.io 请求会发送到 `/game/socket.io/`，nginx 会将其转发到后端 8090 端口。

## 方案 2: 使用 URL 参数（如果反向代理无法配置）

如果无法修改 nginx 配置，可以使用 URL 参数指定完整的 socket.io 服务器地址：

### 访问方式

```
http://113.44.233.34/game/?serverUrl=http://113.44.233.34:8090
```

**注意**：
- 需要确保防火墙开放 8090 端口
- 客户端会直接连接到 8090 端口（绕过 nginx）
- 不够优雅，但可以作为临时方案

## 验证连接

打开浏览器控制台（F12），应该看到：

**方案 1（反向代理）：**
```
[ClientConfig] Auto-detected server: http://113.44.233.34/game
[NetworkManager] Connecting to: http://113.44.233.34/game
✓ Connected to server successfully
Socket ID: xxxxx
```

**方案 2（URL 参数）：**
```
[ClientConfig] Using URL parameter server: http://113.44.233.34:8090
[NetworkManager] Connecting to: http://113.44.233.34:8090
✓ Connected to server successfully
Socket ID: xxxxx
```

## 故障排查

### 问题 1: 404 Not Found - /game/socket.io/

**原因**: Nginx 配置中缺少 `/game/socket.io/` location

**解决**:
```bash
# 检查 nginx 配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 测试路径是否正确
curl -I http://127.0.0.1/game/socket.io/
```

### 问题 2: 502 Bad Gateway

**原因**: Socket.io 服务器未运行

**解决**:
```bash
# 检查服务器进程
ps aux | grep node

# 检查端口监听
netstat -tlnp | grep 8090

# 重启服务器
cd threejs-version/server
npm start
```

### 问题 3: WebSocket 连接失败

**原因**: Nginx WebSocket 配置错误或路径重写问题

**解决**:
确保 nginx 配置中包含：
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

并且使用正确的路径重写：
```nginx
rewrite ^/game/socket.io/(.*)$ /socket.io/$1 break;
```

### 问题 4: 静态资源 404

**原因**: `alias` 路径配置错误

**解决**:
检查 alias 路径是否正确：
```nginx
location /game/ {
    alias /path/to/UnityHuntingGame/threejs-version/;
    # 注意：alias 路径必须以 / 结尾
}
```

测试：
```bash
# 应该能访问到 index.html
curl http://127.0.0.1/game/

# 应该能访问到 JS 文件
curl http://127.0.0.1/game/js/main.js
```

## 调试技巧

### 1. 查看 Socket.io 请求路径

打开浏览器 Network 面板（F12 → Network），筛选 "WS"（WebSocket），查看实际的连接 URL。

应该看到类似：
```
ws://113.44.233.34/game/socket.io/?EIO=4&transport=websocket
```

### 2. 测试 Nginx 转发

从服务器本地测试：
```bash
# 测试主页
curl http://127.0.0.1/game/

# 测试 Socket.io 路径（应该返回 HTTP 400 或连接升级）
curl -I http://127.0.0.1/game/socket.io/

# 直接测试后端
curl -I http://127.0.0.1:8090/socket.io/
```

### 3. 查看 Nginx 日志

实时查看访问日志和错误日志：
```bash
# 访问日志
sudo tail -f /var/log/nginx/access.log | grep socket.io

# 错误日志
sudo tail -f /var/log/nginx/error.log
```

### 4. 测试 Socket.io 服务器

直接测试 8090 端口：
```bash
# 从服务器本地测试
curl http://127.0.0.1:8090/socket.io/

# 应该看到类似：
# {"code":0,"message":"Transport unknown"}
# 这是正常的，说明服务器在运行
```

## 使用 PM2 管理进程

推荐使用 PM2 保持 Socket.io 服务器持续运行：

```bash
# 安装 PM2
npm install -g pm2

# 启动服务器
cd /path/to/UnityHuntingGame/threejs-version/server
pm2 start server.js --name hunting-game

# 开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs hunting-game

# 重启
pm2 restart hunting-game
```

## 完整示例配置

假设：
- 游戏目录: `/var/www/hunting-game/threejs-version`
- 访问路径: `http://113.44.233.34/game/`
- Socket.io 端口: 8090

### Nginx 配置
```nginx
server {
    listen 80;
    server_name 113.44.233.34;

    location /game/ {
        alias /var/www/hunting-game/threejs-version/;
        index index.html;
        try_files $uri $uri/ /game/index.html;
    }

    location /game/socket.io/ {
        rewrite ^/game/socket.io/(.*)$ /socket.io/$1 break;
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_buffering off;
    }
}
```

### .env 文件
```bash
PORT=8090
SERVER_HOST=127.0.0.1
```

### 启动命令
```bash
cd /var/www/hunting-game/threejs-version/server
pm2 start server.js --name hunting-game
sudo nginx -s reload
```

### 访问
```
http://113.44.233.34/game/
```

## 总结

子路径部署的关键点：
1. **Nginx alias** 正确配置静态文件路径
2. **路径重写** 去掉 `/game` 前缀转发到 Socket.io 服务器
3. **WebSocket 支持** 必需的 proxy 头部配置
4. **无需 URL 参数**，客户端自动检测当前路径
