# 狩猎游戏 - Three.js版本

这是Unity狩猎游戏的Three.js移植版本，实现了完整的游戏玩法和AI系统。

## 游戏简介

一个3D第一人称狙击游戏，玩家需要在60秒内射杀尽可能多的敌人。敌人具有复杂的AI行为系统，包括：
- 转向行为（徘徊、追求、逃避、避障、分离、跟随）
- 有限状态机（移动、警戒、群体、攻击、待机）
- 群体智能（领袖-跟随者模式）

## 主要特性

### AI系统
- **6种转向行为**：Seek（追求）、Evade（逃避）、Wander（徘徊）、Follow（跟随）、Separate（分离）、Avoid（避障）
- **5种AI状态**：Moving（正常移动）、Alert（警戒）、Flock（群体）、Attack（攻击）、Idling（待机）
- **领袖系统**：红色敌人是领袖，会主动攻击玩家
- **群体行为**：普通敌人会跟随领袖并保持合适距离

### 游戏机制
- 第一人称瞄准镜系统
- 可调节缩放（1x-15x）
- 射击冷却系统
- 60秒倒计时
- 分数和最高分系统
- 暂停功能

## 项目结构

```
threejs-version/
├── index.html                 # 主HTML文件
├── css/
│   └── style.css             # 样式文件
├── js/
│   ├── main.js               # 入口文件
│   ├── Game.js               # 主游戏类
│   ├── utils/
│   │   └── Vector3Utils.js   # 向量工具类
│   ├── ai/
│   │   ├── Steerings.js      # 转向行为系统
│   │   └── FiniteStateMachine.js  # AI状态机
│   ├── entities/
│   │   ├── Player.js         # 玩家类
│   │   ├── Enemy.js          # 敌人类
│   │   ├── Bullet.js         # 子弹类
│   │   └── Spawner.js        # 敌人生成器
│   ├── core/
│   │   ├── ScoreManager.js   # 分数管理器
│   │   ├── TimeManager.js    # 时间管理器
│   │   ├── InputManager.js   # 输入管理器
│   │   └── PhysicsManager.js # 物理管理器
│   └── ui/
│       └── UIManager.js      # UI管理器
└── README.md
```

## 如何运行

### 方法1：使用本地服务器（推荐）

由于浏览器的CORS策略，需要使用本地服务器运行：

```bash
# 使用Python 3
cd threejs-version
python -m http.server 8000

# 或使用Python 2
python -m SimpleHTTPServer 8000

# 或使用Node.js (需要先安装http-server)
npx http-server -p 8000
```

然后在浏览器中打开：`http://localhost:8000`

### 方法2：使用VS Code Live Server

1. 在VS Code中安装"Live Server"扩展
2. 右键点击`index.html`
3. 选择"Open with Live Server"

## 游戏控制

| 操作 | 按键 |
|------|------|
| 瞄准 | 鼠标移动 |
| 开启瞄准镜 | 右键 / Shift |
| 调整缩放 | 鼠标滚轮 |
| 射击 | 左键 / 空格 |
| 暂停 | P |

## 游戏规则

1. **目标**：在60秒内射杀尽可能多的敌人
2. **敌人类型**：
   - 棕色敌人：普通敌人，会徘徊和逃跑
   - 红色敌人：领袖，会主动攻击玩家
3. **游戏结束条件**：
   - 时间用完
   - 被领袖击中
4. **得分**：每击杀一个敌人得1分

## 技术实现

### Three.js核心特性
- PerspectiveCamera（透视相机）
- WebGLRenderer（WebGL渲染器）
- 阴影系统
- 雾效果
- 多种光源（环境光、平行光、半球光）

### AI算法
- 向量数学运算
- 转向行为组合
- 有限状态机
- 邻居检测
- 射线碰撞检测

### 性能优化
- 对象池（可扩展）
- 简化的物理系统
- 高效的碰撞检测
- 死亡敌人自动清理

## 与Unity版本的对比

| 特性 | Unity版本 | Three.js版本 |
|------|-----------|-------------|
| AI转向行为 | ✅ | ✅ |
| 有限状态机 | ✅ | ✅ |
| 群体行为 | ✅ | ✅ |
| 瞄准镜系统 | ✅ | ✅ |
| 射击系统 | ✅ | ✅ (简化) |
| 3D模型 | 导入资源 | 程序生成 |
| 音效 | ✅ | ⚠️ (待添加) |
| 动画 | 完整骨骼动画 | 简单程序动画 |
| 光照 | 烘焙光照贴图 | 实时光照 |

## 已知限制

1. **音效**：音效系统已实现但需要添加实际音频文件
2. **模型**：使用程序生成的简单几何体，而非导入的3D模型
3. **动画**：简单的程序动画，而非完整的骨骼动画
4. **物理**：简化的物理系统，没有使用物理引擎

## 未来改进

- [ ] 添加音效文件
- [ ] 导入更真实的3D模型
- [ ] 添加粒子效果（枪口火焰、击中特效）
- [ ] 实现完整的物理系统
- [ ] 添加更多敌人类型
- [ ] 添加武器系统
- [ ] 添加关卡系统
- [ ] 优化移动端支持

## 开发说明

### 添加新的转向行为

在`js/ai/Steerings.js`中添加新的静态方法：

```javascript
static NewBehavior(originPosition, targetPosition) {
    // 实现转向逻辑
    return steeringForce;
}
```

### 添加新的AI状态

在`js/ai/FiniteStateMachine.js`中：

1. 在`AIState`枚举中添加新状态
2. 实现`updateNewState()`方法
3. 在`update()`中添加状态分支

### 自定义敌人数量

在`js/Game.js`的`startGame()`方法中修改：

```javascript
this.spawner = new Spawner(
    this.scene,
    new THREE.Vector3(0, 0, 0),
    80,   // 生成半径
    200,  // 敌人数量（可修改）
    10    // 每10个敌人1个领袖
);
```

## 许可证

本项目基于原Unity项目改编，用于教育目的。

## 致谢

- 原Unity项目：UnityHuntingGame
- Three.js库：https://threejs.org/
- AI算法参考：Programming Game AI by Example

---

**注意**：这是一个教育项目，展示了如何将Unity游戏移植到Web平台。代码结构清晰，适合学习游戏开发和AI编程。
