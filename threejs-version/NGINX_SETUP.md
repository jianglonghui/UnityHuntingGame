# Nginx 反向代理配置指南

当你的部署架构是：
- **静态文件**: Nginx 在 80 端口
- **Socket.io 服务器**: Node.js 在 8090 端口

## 步骤 1: 配置 Nginx

编辑你的 nginx 配置文件（通常在 `/etc/nginx/sites-available/default` 或 `/etc/nginx/conf.d/default.conf`）:

```nginx
server {
    listen 80;
    server_name 113.44.233.34;  # 改为你的域名或IP

    # 静态文件目录
    root /path/to/UnityHuntingGame/threejs-version;
    index index.html;

    # 主页面
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Socket.io WebSocket 代理 - 关键配置！
    location /socket.io/ {
        proxy_pass http://127.0.0.1:8090;

        # WebSocket 必需配置
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 转发客户端信息
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

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

## 步骤 2: 修改 .env 配置

确保 Socket.io 服务器监听正确的端口：

```bash
# threejs-version/.env
PORT=8090
SERVER_HOST=127.0.0.1
```

**注意**: 因为 nginx 在同一台服务器上转发请求，所以 `SERVER_HOST` 可以使用 `127.0.0.1`。

## 步骤 3: 启动 Socket.io 服务器

```bash
cd /path/to/UnityHuntingGame/threejs-version/server
npm install
npm start
```

应该看到输出：
```
Server running on port 8090
```

## 步骤 4: 测试 Nginx 配置并重载

```bash
# 测试配置文件语法
sudo nginx -t

# 如果测试通过，重载 nginx
sudo nginx -s reload
# 或
sudo systemctl reload nginx
```

## 步骤 5: 访问游戏

**现在直接访问主域名，不需要任何 URL 参数：**

```
http://113.44.233.34/
```

客户端会自动连接到同一域名的 `/socket.io/` 路径，nginx 会将请求转发到后端的 8090 端口。

## 验证连接

打开浏览器控制台（F12），应该看到：

```
[ClientConfig] Auto-detected server: http://113.44.233.34
[NetworkManager] Connecting to: http://113.44.233.34
✓ Connected to server successfully
Socket ID: xxxxx
```

## 常见问题

### 问题 1: 502 Bad Gateway

**原因**: Socket.io 服务器未运行或无法连接

**解决**:
```bash
# 检查服务器是否运行
ps aux | grep node

# 检查端口监听
netstat -tlnp | grep 8090

# 重启服务器
cd threejs-version/server
npm start
```

### 问题 2: WebSocket 连接失败

**原因**: Nginx 配置缺少 WebSocket 支持

**解决**: 确保有以下配置：
```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### 问题 3: 404 Not Found for /socket.io/

**原因**: `location /socket.io/` 配置位置错误或 nginx 未重载

**解决**:
```bash
# 确认配置文件路径正确
sudo nginx -t

# 重载 nginx
sudo nginx -s reload
```

### 问题 4: 连接超时

**原因**: 防火墙阻止本地转发或超时设置太短

**解决**:
```bash
# 允许本地转发（如果有 iptables）
sudo iptables -I INPUT -s 127.0.0.1 -j ACCEPT

# 增加 nginx 超时设置
proxy_read_timeout 300s;
```

## 测试反向代理

从服务器本地测试：

```bash
# 测试静态文件
curl http://127.0.0.1/

# 测试 Socket.io 路径（应返回非 404）
curl -I http://127.0.0.1/socket.io/

# 查看 nginx 错误日志
sudo tail -f /var/log/nginx/error.log
```

## 进程管理（推荐）

使用 PM2 保持 Socket.io 服务器持续运行：

```bash
# 安装 PM2
npm install -g pm2

# 启动服务器
cd /path/to/UnityHuntingGame/threejs-version/server
pm2 start server.js --name hunting-game

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs hunting-game
```

## 架构图

```
客户端浏览器 (80)
    ↓ HTTP请求
Nginx (80端口)
    ↓
    ├─ 静态文件 (.html, .js, .css) → 直接返回
    └─ /socket.io/* → 反向代理 → Node.js Socket.io (8090端口)
```

这样配置后，客户端只需要访问 80 端口，所有 Socket.io 请求会被 nginx 自动转发到 8090 端口。
