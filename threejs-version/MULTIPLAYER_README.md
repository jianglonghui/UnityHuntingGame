# 联机模式使用说明

## 🎮 功能概述

游戏现已支持联机模式！可以让2-4名玩家一起游戏：
- **1名狙击手**：原有的第一人称瞄准射击玩家
- **2-3名敌人玩家**：使用WASD控制移动的玩家，需要躲避狙击手的射击

## 📦 安装依赖

### 服务器端

```bash
cd threejs-version/server
npm install
```

这将安装以下依赖：
- `express`: Web服务器
- `socket.io`: 实时通信库
- `nodemon`: 开发工具（可选）

## 🚀 启动服务器

### 方式1：直接启动
```bash
cd threejs-version/server
npm start
```

### 方式2：开发模式（自动重启）
```bash
cd threejs-version/server
npm run dev
```

服务器将在 `http://localhost:3000` 上运行。

## 🎯 游戏流程

### 1. 打开游戏
在浏览器中访问：`http://localhost:3000`

### 2. 选择模式
主菜单提供两个选项：
- **单人模式**：传统的AI敌人狩猎模式
- **联机模式**：多人对战模式

### 3. 创建或加入房间

#### 创建房间：
1. 点击"联机模式"
2. 输入玩家名称
3. 点击"创建房间"
4. 你将成为**狙击手**
5. 等待其他玩家加入（显示房间ID）
6. 至少需要2人才能开始游戏
7. 点击"开始游戏"

#### 加入房间：
1. 点击"联机模式"
2. 输入玩家名称
3. 点击"加入房间"
4. 从列表中选择房间
5. 你将成为**敌人**（蓝色或绿色角色）
6. 等待房主开始游戏

### 4. 游戏中

#### 狙击手（第一个玩家）：
- **鼠标移动**：瞄准
- **右键/Shift**：开启/关闭瞄准镜
- **滚轮**：调整缩放（1x-15x）
- **左键/空格**：射击
- **目标**：在60秒内击杀所有敌人玩家（每个敌人3条命）

#### 敌人玩家（其他玩家）：
- **W**：向前移动
- **S**：向后移动
- **A**：向左移动
- **D**：向右移动
- **目标**：躲避狙击手的射击，存活60秒

### 5. 游戏结束

游戏在以下情况结束：
- **60秒时间到**：狙击手获胜，统计击杀数
- **所有敌人玩家死亡**：狙击手获胜
- **房主离开**：游戏结束，所有玩家返回主菜单

## 🎨 视觉标识

### 玩家颜色
- **狙击手**：固定位置（山顶）
- **本地玩家敌人**：绿色模型
- **远程玩家敌人**：蓝色模型
- **AI敌人**：棕色模型（单人模式）
- **AI领袖**：红色模型（单人模式）

### 生命系统
- 每个敌人玩家有**3条命**
- 被击中时会**闪红**
- 生命耗尽时倒下并淡出

## 🔧 技术架构

### 服务器端
- **Node.js + Express**：HTTP服务器
- **Socket.io**：实时通信
- **房间管理**：支持多个独立游戏房间
- **事件驱动**：实时同步玩家位置、射击、伤害

### 客户端
- **NetworkManager**：封装Socket.io客户端
- **MultiplayerUIManager**：处理联机UI
- **PlayerEnemy**：玩家控制的敌人实体
- **实时插值**：平滑远程玩家移动

## 🛠️ 开发状态

### ✅ 已完成
- [x] Socket.io服务器
- [x] 房间系统（创建/加入/离开）
- [x] 角色分配（狙击手/敌人）
- [x] PlayerEnemy类（WASD控制）
- [x] 生命系统（3条命）
- [x] 实时位置同步
- [x] 联机UI（菜单/大厅）
- [x] 网络事件处理

### 🚧 进行中
- [ ] 集成到Game.js（联机模式完整流程）
- [ ] 射击同步优化
- [ ] 延迟补偿

### 📋 待完成
- [ ] 房间列表功能
- [ ] 重连机制
- [ ] 观战模式
- [ ] 更多游戏模式

## 🐛 已知问题

1. **房间列表暂未实现**：需要手动输入房间ID加入
2. **Game.js集成未完成**：联机模式还不能完整运行
3. **网络延迟补偿**：高延迟下可能有卡顿

## 📝 多人测试

### 本地测试（推荐）

1. 启动服务器
2. 打开多个浏览器标签页
3. 标签页1：创建房间，成为狙击手
4. 标签页2-4：加入房间，成为敌人
5. 狙击手标签页点击"开始游戏"

### 局域网测试

1. 查看本机IP地址：
   ```bash
   # Windows
   ipconfig

   # macOS/Linux
   ifconfig
   ```

2. 修改 `js/network/NetworkManager.js` 中的服务器地址：
   ```javascript
   this.serverUrl = 'http://你的IP地址:3000';
   ```

3. 其他设备在浏览器访问：`http://你的IP地址:3000`

## 🎓 代码示例

### 创建房间
```javascript
// NetworkManager
networkManager.connect().then(() => {
    networkManager.createRoom('玩家名称');
});
```

### 发送移动数据
```javascript
networkManager.sendPlayerMove(
    { x: 10, y: 0, z: 20 },
    { x: 0, y: 1.57, z: 0 }
);
```

### 发送射击事件
```javascript
networkManager.sendShoot(
    position,
    direction,
    hitEnemyId  // 击中的敌人ID（可选）
);
```

## 📚 API文档

### Socket.io事件

#### 客户端 → 服务器
- `createRoom(playerName)` - 创建房间
- `joinRoom({ roomId, playerName })` - 加入房间
- `startGame()` - 开始游戏
- `playerMove({ position, rotation })` - 玩家移动
- `shoot({ position, direction, hitEnemyId })` - 射击
- `leaveRoom()` - 离开房间

#### 服务器 → 客户端
- `roomCreated({ roomId, role, players })` - 房间创建成功
- `roomJoined({ roomId, role, players })` - 加入房间成功
- `playerJoined({ player, players })` - 新玩家加入
- `playerLeft({ playerId, players })` - 玩家离开
- `gameStarted({ startTime, duration })` - 游戏开始
- `playerMoved({ playerId, position, rotation })` - 玩家移动
- `playerShot({ playerId, position, direction })` - 玩家射击
- `enemyHit({ enemyId, remainingLives, score })` - 敌人被击中
- `gameOver({ reason, finalScore })` - 游戏结束
- `roomClosed()` - 房间关闭
- `error({ message })` - 错误信息

## 🤝 贡献

欢迎提交问题和改进建议！

## 📄 许可

与主项目相同
