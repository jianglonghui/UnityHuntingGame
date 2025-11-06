// 主游戏类
import { Player } from './entities/Player.js';
import { Spawner } from './entities/Spawner.js';
import { Bullet } from './entities/Bullet.js';
import { PlayerEnemy } from './entities/PlayerEnemy.js';
import { SmokeEffect } from './entities/SmokeEffect.js';
import { ScoreManager } from './core/ScoreManager.js';
import { TimeManager } from './core/TimeManager.js';
import { InputManager } from './core/InputManager.js';
import { PhysicsManager } from './core/PhysicsManager.js';
import { UIManager } from './ui/UIManager.js';
import { AudioManager } from './core/AudioManager.js';
import { TransformationInventory } from './core/TransformationInventory.js';
import { SeededRandom } from './utils/SeededRandom.js';

export class Game {
    constructor() {
        this.isInitialized = false;
        this.isPlaying = false;
        this.isPaused = false;
        this.isGameOver = false;  // 防止重复触发游戏结束

        // Three.js核心对象
        this.scene = null;
        this.renderer = null;
        this.clock = null;

        // 游戏实体
        this.player = null;
        this.spawner = null;
        this.bullets = [];
        this.smokeEffects = [];  // 烟雾效果数组

        // 联机模式
        this.isMultiplayer = false;
        this.networkManager = null;
        this.playerEnemies = new Map();  // 存储玩家控制的敌人
        this.localPlayerEnemy = null;    // 本地玩家控制的敌人
        this.playerRole = null;          // 'sniper' 或 'enemy'
        this.pingInterval = null;        // Ping测量定时器

        // 敌人视角控制
        this.cameraRotationY = 0;        // 水平旋转
        this.cameraRotationX = 0.3;      // 垂直旋转（俯视角度）
        this.cameraSensitivity = 0.002;  // 鼠标灵敏度

        // 游戏开始冻结期（狙击手准备时间）
        this.FREEZE_DURATION = 5.0;      // 5秒冻结时间
        this.freezeTime = 0;             // 冻结倒计时
        this.isFrozen = false;           // 是否处于冻结状态

        // 变身系统
        this.transformationState = {
            isTransformed: false,
            currentType: null,
            transformModel: null,
            transformTimer: 0,
            transformDuration: 10.0,  // 变身持续10秒
            isFalling: false,
            fallProgress: 0,
            fallDirection: new THREE.Vector3()
        };

        // 管理器
        this.scoreManager = new ScoreManager();
        this.timeManager = new TimeManager(60);
        this.inputManager = new InputManager();
        this.physicsManager = new PhysicsManager();
        this.uiManager = new UIManager();
        this.audioManager = new AudioManager();
        this.transformationInventory = new TransformationInventory();

        // 随机数生成器（用于场景生成）
        this.random = null;

        // 环境
        this.ground = null;
        this.obstacles = [];
        this.grassBushes = []; // 草丛掩体数组

        // 设置UI回调
        this.setupUICallbacks();

        // 设置输入回调
        this.setupInputCallbacks();

        // 时间结束回调
        this.timeManager.onTimeUp = () => this.gameOver();

        // 全局引用（用于状态机触发游戏结束）
        window.game = this;
    }

    /**
     * 初始化Three.js
     */
    init() {
        if (this.isInitialized) return;

        console.log('Initializing game...');

        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);  // 天空蓝
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // 创建时钟
        this.clock = new THREE.Clock();

        // 创建场景内容
        this.createEnvironment();
        this.createLighting();

        // 预加载音效
        this.audioManager.preloadSounds();

        // 窗口大小改变
        window.addEventListener('resize', () => this.onWindowResize());

        this.isInitialized = true;

        // 显示主菜单
        this.uiManager.showMainMenu();
        this.uiManager.updateHighScore(this.scoreManager.getHighScore());

        console.log('Game initialized!');
    }

    /**
     * 创建环境
     */
    createEnvironment() {
        // 创建地面
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a7d44,  // 草绿色
            roughness: 0.8,
            metalness: 0.2
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        // 添加地面纹理（简单的格子）
        const gridHelper = new THREE.GridHelper(200, 40, 0x000000, 0x2a6d34);
        gridHelper.material.opacity = 0.2;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);

        // 创建玩家位置（山顶）
        const hillGeometry = new THREE.ConeGeometry(8, 10, 8);
        const hillMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b7355,  // 棕色
            roughness: 0.9
        });
        const hill = new THREE.Mesh(hillGeometry, hillMaterial);
        hill.position.set(0, 0, 0);
        hill.receiveShadow = true;
        hill.castShadow = true;
        this.scene.add(hill);

        // 障碍物会在 startGame() 中创建（需要随机种子）
    }

    /**
     * 清理障碍物
     */
    clearObstacles() {
        for (const obstacle of this.obstacles) {
            this.scene.remove(obstacle);
        }
        this.obstacles = [];

        // 清理草丛
        for (const bush of this.grassBushes) {
            this.scene.remove(bush);
        }
        this.grassBushes = [];
    }

    /**
     * 创建障碍物
     */
    createObstacles() {
        // 创建随机分布的树木
        for (let i = 0; i < 50; i++) {
            const tree = this.createTree();
            const angle = this.random.random() * Math.PI * 2;
            const radius = 20 + this.random.random() * 70;
            tree.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            this.scene.add(tree);
            this.obstacles.push(tree);
        }

        // 创建随机分布的岩石
        for (let i = 0; i < 30; i++) {
            const rock = this.createRock();
            const angle = this.random.random() * Math.PI * 2;
            const radius = 15 + this.random.random() * 75;
            rock.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            this.scene.add(rock);
            this.obstacles.push(rock);
        }

        // 创建随机分布的草丛掩体
        for (let i = 0; i < 25; i++) {
            const bush = this.createGrassBush();
            const angle = this.random.random() * Math.PI * 2;
            const radius = 10 + this.random.random() * 80;
            bush.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            this.scene.add(bush);
            this.grassBushes.push(bush);
        }
    }

    /**
     * 创建树木
     */
    createTree() {
        const tree = new THREE.Group();

        // 树干
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2511 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1.5;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        tree.add(trunk);

        // 树冠
        const foliageGeometry = new THREE.ConeGeometry(2, 4, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 4.5;
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        tree.add(foliage);

        // 标记为可击中的树
        tree.userData.isTree = true;
        tree.userData.isFallen = false;
        tree.userData.fallProgress = 0;
        tree.userData.fallDirection = new THREE.Vector3();

        return tree;
    }

    /**
     * 创建岩石
     */
    createRock() {
        const geometry = new THREE.DodecahedronGeometry(1 + this.random.random());
        const material = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.9
        });
        const rock = new THREE.Mesh(geometry, material);
        rock.rotation.set(
            this.random.random() * Math.PI,
            this.random.random() * Math.PI,
            this.random.random() * Math.PI
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        return rock;
    }

    /**
     * 创建草丛掩体
     */
    createGrassBush() {
        const bush = new THREE.Group();

        // 底部草丛基座（圆柱体）- 尺寸翻倍
        const baseGeometry = new THREE.CylinderGeometry(3.0, 3.6, 2.4, 8);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5016,
            roughness: 0.9,
            transparent: true,
            opacity: 0.8
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 1.2;
        base.receiveShadow = true;
        bush.add(base);

        // 创建多层草叶
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: 0x3a7d44,
            roughness: 0.8,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });

        // 添加几层草叶（扁平的圆锥体）- 尺寸翻倍
        for (let i = 0; i < 3; i++) {
            const leafGeometry = new THREE.ConeGeometry(
                2.4 - i * 0.6,
                1.6,
                6
            );
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            leaf.position.y = 2.4 + i * 0.8;
            leaf.rotation.y = (this.random.random() * Math.PI) / 3;
            bush.add(leaf);
        }

        // 添加一些突出的草叶（使用平面）- 尺寸翻倍
        for (let i = 0; i < 6; i++) {
            const bladeGeometry = new THREE.PlaneGeometry(0.6, 3.0);
            const blade = new THREE.Mesh(bladeGeometry, leafMaterial);
            const angle = (i / 6) * Math.PI * 2;
            blade.position.x = Math.cos(angle) * 2.4;
            blade.position.z = Math.sin(angle) * 2.4;
            blade.position.y = 3.0;
            blade.rotation.y = angle + Math.PI / 2;
            blade.rotation.x = 0.2;
            bush.add(blade);
        }

        // 存储草丛半径用于碰撞检测 - 翻倍
        bush.userData.radius = 3.6;
        bush.userData.isGrassBush = true;

        return bush;
    }

    /**
     * 创建光照
     */
    createLighting() {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // 平行光（太阳）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // 半球光（天空和地面）
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3a7d44, 0.4);
        this.scene.add(hemisphereLight);
    }

    /**
     * 设置UI回调
     */
    setupUICallbacks() {
        this.uiManager.onPlayButton = () => {
            // 在多人模式下，"再来一次"应该返回房间等待界面
            if (this.isMultiplayer && this.multiplayerUIManager) {
                this.uiManager.hideAll(); // 先隐藏游戏结束菜单
                this.multiplayerUIManager.showLobby();
            } else {
                // 单人模式：重新开始游戏
                this.startGame();
            }
        };
        this.uiManager.onResumeButton = () => this.resumeGame();
        this.uiManager.onMainMenuButton = () => this.returnToMainMenu();
    }

    /**
     * 设置输入回调
     */
    setupInputCallbacks() {
        // 鼠标移动
        this.inputManager.onMouseMove = (x, y) => {
            if (!this.isPlaying || this.isPaused) return;

            if (this.isMultiplayer && this.playerRole === 'enemy') {
                // 敌人模式：旋转第三人称相机
                this.cameraRotationY -= x * this.cameraSensitivity;
                this.cameraRotationX -= y * this.cameraSensitivity;

                // 限制垂直旋转角度（不能看向地面以下）
                // 最小值 -0.1 （略微向下）到最大值 Math.PI / 2（向上90度）
                this.cameraRotationX = Math.max(-0.1, Math.min(Math.PI / 2, this.cameraRotationX));

                console.log('Camera rotation:', this.cameraRotationY.toFixed(2), this.cameraRotationX.toFixed(2));
            } else if (this.player) {
                // 狙击手模式：第一人称视角
                this.player.onMouseMove(x, y);
            }
        };

        // 鼠标按下
        this.inputManager.onMouseDown = (event) => {
            if (!this.isPlaying || this.isPaused) return;

            // 左键射击
            if (event.button === 0) {
                this.shoot();
            }
            // 右键瞄准镜
            else if (event.button === 2) {
                this.toggleScope();
            }
        };

        // 键盘按下
        this.inputManager.onKeyDown = (event) => {
            if (!this.isPlaying) return;

            // P键暂停
            if (event.code === 'KeyP') {
                this.togglePause();
            }
            // Shift键瞄准镜
            else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
                this.toggleScope();
            }
            // 空格键：狙击手射击 / 敌人跳跃
            else if (event.code === 'Space') {
                if (this.isMultiplayer && this.playerRole === 'enemy' && this.localPlayerEnemy) {
                    // 敌人模式：跳跃
                    this.localPlayerEnemy.keys.jump = true;
                } else {
                    // 狙击手模式：射击
                    this.shoot();
                }
            }
            // 1/2/3键：敌人使用变身道具
            else if (event.code === 'Digit1' && this.playerRole === 'enemy') {
                this.useTransformation(0);
            }
            else if (event.code === 'Digit2' && this.playerRole === 'enemy') {
                this.useTransformation(1);
            }
            else if (event.code === 'Digit3' && this.playerRole === 'enemy') {
                this.useTransformation(2);
            }

            // WASD移动（联机敌人模式）
            if (this.isMultiplayer && this.playerRole === 'enemy' && this.localPlayerEnemy) {
                switch (event.code) {
                    case 'KeyW':
                        this.localPlayerEnemy.keys.forward = true;
                        break;
                    case 'KeyS':
                        this.localPlayerEnemy.keys.backward = true;
                        break;
                    case 'KeyA':
                        this.localPlayerEnemy.keys.left = true;
                        break;
                    case 'KeyD':
                        this.localPlayerEnemy.keys.right = true;
                        break;
                }
            }
        };

        // 键盘抬起
        this.inputManager.onKeyUp = (event) => {
            // WASD移动（联机敌人模式）
            if (this.isMultiplayer && this.playerRole === 'enemy' && this.localPlayerEnemy) {
                switch (event.code) {
                    case 'KeyW':
                        this.localPlayerEnemy.keys.forward = false;
                        break;
                    case 'KeyS':
                        this.localPlayerEnemy.keys.backward = false;
                        break;
                    case 'KeyA':
                        this.localPlayerEnemy.keys.left = false;
                        break;
                    case 'KeyD':
                        this.localPlayerEnemy.keys.right = false;
                        break;
                }
            }
        };

        // 滚轮缩放
        this.inputManager.onWheel = (delta) => {
            if (this.player && this.isPlaying && !this.isPaused) {
                const zoom = this.player.adjustZoom(delta * 0.001);
                this.uiManager.updateZoom(zoom);
            }
        };

        // 指针锁定状态改变（按ESC释放鼠标时自动暂停）
        this.inputManager.onPointerLockChange = (isLocked, wasLocked) => {
            // 如果游戏正在进行，且鼠标从锁定变为未锁定，则自动暂停
            if (this.isPlaying && !this.isPaused && wasLocked && !isLocked) {
                console.log('Pointer lock released, pausing game...');
                this.pauseGame();
            }
        };
    }

    /**
     * 开始游戏
     */
    startGame(isMultiplayer = false, networkManager = null, multiplayerUIManager = null, sceneSeed = null) {
        console.log('Starting game...', isMultiplayer ? 'Multiplayer Mode' : 'Single Player Mode');

        // 初始化随机数生成器
        // 多人模式使用服务器提供的种子，单人模式使用随机种子
        const seed = sceneSeed || Math.floor(Math.random() * 1000000);
        this.random = new SeededRandom(seed);
        console.log('Scene seed:', seed);

        // 重置游戏状态
        this.resetGame();

        // 清理旧障碍物并生成新场景
        this.clearObstacles();
        this.createObstacles();

        // 设置联机模式
        this.isMultiplayer = isMultiplayer;
        this.networkManager = networkManager;
        this.multiplayerUIManager = multiplayerUIManager;

        if (isMultiplayer && networkManager) {
            // 联机模式
            this.playerRole = networkManager.playerRole;
            this.setupNetworkCallbacks();

            // 显示 ping 信息并开始测量延迟
            this.uiManager.showPing();
            this.startPingMeasurement();

            if (this.playerRole === 'sniper') {
                // 狙击手：创建第一人称视角
                this.player = new Player(this.scene, new THREE.Vector3(0, 10, 0));

                // 不创建AI敌人，等待玩家加入
                console.log('Sniper mode: Waiting for enemy players...');
            } else {
                // 敌人：创建第三人称视角的玩家控制角色
                const spawnPos = this.getRandomSpawnPosition();
                this.localPlayerEnemy = new PlayerEnemy(
                    this.scene,
                    spawnPos,
                    networkManager.playerId,
                    '本地玩家',
                    true,  // isLocal
                    this.obstacles  // 传递障碍物
                );
                this.playerEnemies.set(networkManager.playerId, this.localPlayerEnemy);

                // 创建第三人称相机
                this.createThirdPersonCamera();

                // 显示生命值UI
                this.uiManager.showHealth();
                this.uiManager.updateHealth(this.localPlayerEnemy.lives);

                // 显示变身物品栏
                this.transformationInventory.show();

                console.log('Enemy mode: Use WASD to move, avoid the sniper!');
            }
        } else {
            // 单人模式
            this.player = new Player(this.scene, new THREE.Vector3(0, 10, 0));

            // 创建AI敌人生成器
            this.spawner = new Spawner(
                this.scene,
                new THREE.Vector3(0, 0, 0),
                80,   // 生成半径
                100,  // 敌人数量
                10    // 每10个敌人1个领袖
            );
            this.spawner.setObstacles(this.obstacles);
            this.spawner.spawnAll();
        }

        // 开始游戏
        this.isPlaying = true;
        this.isPaused = false;

        // 联机模式下，设置5秒冻结期供敌人躲藏
        if (this.isMultiplayer) {
            this.isFrozen = true;
            this.freezeTime = this.FREEZE_DURATION;
            console.log('游戏开始 - 5秒准备时间');
            // 联机模式下不立即开始计时，等待冻结期结束
        } else {
            // 单人模式立即开始计时
            this.timeManager.start();
        }

        // 播放游戏开始音效
        try {
            this.audioManager.playGameStart();
        } catch (error) {
            console.warn('Failed to play game start sound:', error);
        }

        // 显示游戏UI
        this.uiManager.showGameUI();

        // 获取点击提示元素
        const clickPrompt = document.getElementById('clickPrompt');

        // 狙击手模式设置
        if (!isMultiplayer || this.playerRole === 'sniper') {
            // 锁定鼠标
            this.inputManager.requestPointerLock();

            // 默认开启瞄准镜
            this.player.isScoped = true;
            this.uiManager.showScope();

            // 显示点击提示
            if (clickPrompt) {
                clickPrompt.textContent = '点击屏幕开始游戏';
                clickPrompt.style.display = 'flex';
                const hidePrompt = () => {
                    clickPrompt.style.display = 'none';
                    document.removeEventListener('click', hidePrompt);
                };
                clickPrompt.addEventListener('click', hidePrompt);
                document.addEventListener('click', hidePrompt, { once: true });
            }
        } else {
            // 敌人模式：需要点击激活鼠标控制
            if (clickPrompt) {
                clickPrompt.textContent = '点击激活鼠标控制 - 移动鼠标旋转视角';
                clickPrompt.style.display = 'flex';
                const hidePrompt = () => {
                    clickPrompt.style.display = 'none';
                    this.inputManager.requestPointerLock();
                    document.removeEventListener('click', hidePrompt);
                };
                clickPrompt.addEventListener('click', hidePrompt);
                document.addEventListener('click', hidePrompt, { once: true });
            }
            // 初始化敌人视角旋转
            this.cameraRotationY = 0;
            this.cameraRotationX = 0.3;
        }

        // 开始渲染循环
        this.animate();

        console.log('Game started!');
    }

    /**
     * 设置网络回调
     */
    setupNetworkCallbacks() {
        if (!this.networkManager) return;

        // Ping 更新回调
        this.networkManager.onPingUpdate = (ping) => {
            this.uiManager.updatePing(ping);
        };

        // 时间更新回调（从服务器同步）
        this.networkManager.onTimeUpdate = (remainingTime) => {
            this.uiManager.updateTime(remainingTime);
        };

        // 初始化已存在的玩家（游戏开始时）
        if (this.networkManager.currentPlayers) {
            this.networkManager.currentPlayers.forEach(player => {
                // 不创建自己的模型
                if (player.id === this.networkManager.playerId) return;

                // 创建其他玩家的模型（包括狙击手和敌人）
                const spawnPos = player.role === 'sniper' ?
                    new THREE.Vector3(0, 10, 0) :  // 狙击手在山顶
                    this.getRandomSpawnPosition(); // 敌人随机位置

                const playerEnemy = new PlayerEnemy(
                    this.scene,
                    spawnPos,
                    player.id,
                    player.name,
                    false,  // 远程玩家
                    this.obstacles  // 传递障碍物
                );
                this.playerEnemies.set(player.id, playerEnemy);
                console.log(`Spawned existing ${player.role} player:`, player.name);
            });
        }

        // 玩家加入
        this.networkManager.onPlayerJoined = (data) => {
            console.log('Player joined:', data);

            // 显示所有新加入的玩家（对于所有角色）
            data.players.forEach(player => {
                // 不创建自己的模型
                if (player.id === this.networkManager.playerId) return;

                // 如果还没有创建这个玩家的模型
                if (!this.playerEnemies.has(player.id)) {
                    const spawnPos = player.role === 'sniper' ?
                        new THREE.Vector3(0, 10, 0) :  // 狙击手在山顶
                        this.getRandomSpawnPosition(); // 敌人随机位置

                    const playerEnemy = new PlayerEnemy(
                        this.scene,
                        spawnPos,
                        player.id,
                        player.name,
                        false,  // 远程玩家
                        this.obstacles  // 传递障碍物
                    );
                    this.playerEnemies.set(player.id, playerEnemy);
                    console.log(`Created ${player.role} player:`, player.name);
                }
            });
        };

        // 玩家移动
        this.networkManager.onPlayerMoved = (data) => {
            const { playerId, position, rotation, isScoped } = data;

            // 更新远程玩家位置和瞄准镜状态
            if (playerId !== this.networkManager.playerId && this.playerEnemies.has(playerId)) {
                const playerEnemy = this.playerEnemies.get(playerId);
                playerEnemy.updateRemote(position, rotation, isScoped);
            }
        };

        // 玩家射击
        this.networkManager.onPlayerShot = (data) => {
            console.log('Player shot:', data);
            // TODO: 显示射击效果
        };

        // 敌人被击中
        this.networkManager.onEnemyHit = (data) => {
            const { enemyId, remainingLives, score } = data;
            console.log('Enemy hit:', enemyId, 'remaining lives:', remainingLives, 'local player:', this.networkManager.playerId);

            // 检查是否是本地玩家被击中
            if (enemyId === this.networkManager.playerId && this.localPlayerEnemy) {
                console.log('Local player hit!');
                this.localPlayerEnemy.onHit();
                this.localPlayerEnemy.lives = remainingLives;

                // 播放击中音效
                this.audioManager.playHit();

                // 创建烟雾效果
                const smoke = new SmokeEffect(this.scene, this.localPlayerEnemy.position);
                this.smokeEffects.push(smoke);

                // 给敌人添加随机变身道具
                const item = this.transformationInventory.addRandomTransformation();
                if (item) {
                    console.log(`[变身] 获得${this.transformationInventory.getTypeName(item.type)}道具 (槽位${item.slot + 1})`);
                }

                // 更新生命值显示
                this.uiManager.updateHealth(remainingLives);

                // 显示屏幕闪烁效果
                this.showHitEffect();

                // 敌人死亡
                if (remainingLives <= 0) {
                    console.log('Local player died!');
                    this.localPlayerEnemy.onDeath();
                    // 播放死亡音效
                    this.audioManager.playDeath();
                    // 游戏结束将由服务器的gameOver事件触发
                }
            }
            // 检查是否是其他玩家被击中
            else if (this.playerEnemies.has(enemyId)) {
                const playerEnemy = this.playerEnemies.get(enemyId);
                playerEnemy.onHit();
                playerEnemy.lives = remainingLives;

                // 播放击中音效
                this.audioManager.playHit();

                // 创建烟雾效果
                const smoke = new SmokeEffect(this.scene, playerEnemy.position);
                this.smokeEffects.push(smoke);

                // 敌人死亡
                if (remainingLives <= 0) {
                    playerEnemy.onDeath();
                    // 播放死亡音效
                    this.audioManager.playDeath();
                    setTimeout(() => {
                        this.playerEnemies.delete(enemyId);
                    }, 2000);
                }
            }

            // 更新分数（狙击手视角）
            if (this.playerRole === 'sniper') {
                this.scoreManager.setScore(score);
                this.uiManager.updateScore(score);
            }
        };

        // 玩家变身
        this.networkManager.onPlayerTransformation = (data) => {
            const { playerId, type, isTransformed } = data;
            this.handlePlayerTransformation(playerId, type, isTransformed);
        };

        // 树倒地
        this.networkManager.onTreeFall = (data) => {
            const { playerId, shootDirection } = data;
            this.handleTreeFall(playerId, shootDirection);
        };

        // 游戏结束
        this.networkManager.onGameOver = (data) => {
            console.log('Game over:', data);
            this.gameOver(data.reason, data.sniperScore || data.finalScore || 0);
        };

        // 房间关闭
        this.networkManager.onRoomClosed = () => {
            console.log('Room closed');
            this.returnToMainMenu();
        };
    }

    /**
     * 获取随机生成位置
     */
    getRandomSpawnPosition() {
        const angle = this.random.random() * Math.PI * 2;
        const radius = 30 + this.random.random() * 40;
        return new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        );
    }

    /**
     * 创建第三人称相机
     */
    createThirdPersonCamera() {
        if (!this.localPlayerEnemy) return;

        // 创建相机
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // 设置相机位置（跟随本地玩家）
        const offset = new THREE.Vector3(0, 10, 15);
        camera.position.copy(this.localPlayerEnemy.position).add(offset);
        camera.lookAt(this.localPlayerEnemy.position);

        this.thirdPersonCamera = camera;
    }

    /**
     * 重置游戏
     */
    resetGame() {
        // 重置游戏状态标志
        this.isGameOver = false;

        // 清除旧的游戏对象
        if (this.spawner) {
            this.spawner.clearAll();
        }

        for (const bullet of this.bullets) {
            bullet.destroy();
        }
        this.bullets = [];

        // 清除玩家敌人
        for (const [id, playerEnemy] of this.playerEnemies) {
            playerEnemy.destroy();
        }
        this.playerEnemies.clear();
        this.localPlayerEnemy = null;

        // 清理变身状态
        if (this.transformationState.isTransformed) {
            this.endTransformation();
        }

        // 清空变身物品栏
        this.transformationInventory.clear();

        // 重置管理器
        this.scoreManager.resetScore();
        this.timeManager.reset();
        this.physicsManager.clear();

        // 重置UI
        this.uiManager.updateScore(0);
        this.uiManager.updateTime(60);
        this.uiManager.updateZoom(1);
        this.uiManager.hideScope();
    }

    /**
     * 切换暂停
     */
    togglePause() {
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    /**
     * 暂停游戏
     */
    pauseGame() {
        this.isPaused = true;
        this.timeManager.pause();
        this.inputManager.exitPointerLock();
        this.uiManager.showPauseMenu();
    }

    /**
     * 恢复游戏
     */
    resumeGame() {
        this.isPaused = false;
        this.timeManager.resume();
        this.inputManager.requestPointerLock();
        this.uiManager.hidePauseMenu();
    }

    /**
     * 切换瞄准镜
     */
    toggleScope() {
        if (this.player) {
            const isScoped = this.player.toggleScope();
            this.uiManager.toggleScope(isScoped);
        }
    }

    /**
     * 射击
     */
    shoot() {
        if (!this.player) return;

        const shootData = this.player.shoot();
        if (shootData) {
            // 播放射击音效
            this.audioManager.playShoot();

            // 使用射线检测立即击中
            const ray = this.player.getShootRay();
            const raycaster = new THREE.Raycaster(ray.origin, ray.direction);
            let hitEnemyId = null;

            if (this.isMultiplayer) {
                // 联机模式：检测玩家敌人
                let closestDistance = Infinity;
                let closestEnemy = null;

                for (const [id, playerEnemy] of this.playerEnemies) {
                    if (!playerEnemy.isAlive) continue;

                    // 如果玩家变身了，检测变身模型；否则检测玩家mesh
                    let targetMesh = playerEnemy.mesh;
                    if (playerEnemy.transformationState?.isTransformed && playerEnemy.transformationState.transformModel) {
                        targetMesh = playerEnemy.transformationState.transformModel;
                    }

                    const intersect = raycaster.intersectObject(targetMesh, true);
                    if (intersect.length > 0 && intersect[0].distance < closestDistance) {
                        closestDistance = intersect[0].distance;
                        closestEnemy = playerEnemy;
                        hitEnemyId = id;
                    }
                }

                // 检测场景中的树
                let hitTree = null;
                for (let i = 0; i < this.obstacles.length; i++) {
                    const obstacle = this.obstacles[i];
                    if (!obstacle.userData.isTree) continue;
                    if (obstacle.userData.isFallen) continue; // 已经倒地的树不再检测

                    const intersect = raycaster.intersectObject(obstacle, true);
                    if (intersect.length > 0 && intersect[0].distance < closestDistance) {
                        closestDistance = intersect[0].distance;
                        hitTree = obstacle;
                        hitEnemyId = null; // 击中树，不是敌人
                    }
                }

                // 如果击中了树，触发倒地
                if (hitTree && !hitEnemyId) {
                    this.makeTreeFall(hitTree, shootData.direction);
                }

                // 发送射击事件到服务器
                if (this.networkManager) {
                    if (hitEnemyId) {
                        console.log(`[Shoot] Hit enemy ${hitEnemyId} at distance ${closestDistance.toFixed(2)}`);
                    } else {
                        console.log(`[Shoot] Miss - no enemy hit`);
                    }

                    this.networkManager.sendShoot(
                        shootData.position,
                        shootData.direction,
                        hitEnemyId
                    );
                }

                // 注意：不在本地立即显示击中效果，等待服务器的权威判定
                // 这样可以避免客户端和服务器的生命值不同步
            } else {
                // 单人模式：检测AI敌人和场景树
                const hitEnemy = this.spawner.checkShootHit(ray);

                if (hitEnemy) {
                    hitEnemy.onHit();
                    // 播放击中音效
                    this.audioManager.playHit();

                    // 创建烟雾效果
                    const smoke = new SmokeEffect(this.scene, hitEnemy.position);
                    this.smokeEffects.push(smoke);

                    const newScore = this.scoreManager.addScore(1);
                    this.uiManager.updateScore(newScore);
                } else {
                    // 没有击中敌人，检测场景中的树
                    let closestDistance = Infinity;
                    let hitTree = null;

                    for (const obstacle of this.obstacles) {
                        if (!obstacle.userData.isTree) continue;
                        if (obstacle.userData.isFallen) continue;

                        const intersect = raycaster.intersectObject(obstacle, true);
                        if (intersect.length > 0 && intersect[0].distance < closestDistance) {
                            closestDistance = intersect[0].distance;
                            hitTree = obstacle;
                        }
                    }

                    if (hitTree) {
                        this.makeTreeFall(hitTree, shootData.direction);
                    }
                }
            }

            // 创建子弹视觉效果
            const bullet = new Bullet(
                this.scene,
                shootData.position,
                shootData.direction,
                100
            );
            this.bullets.push(bullet);
        }
    }

    /**
     * 游戏结束
     */
    gameOver(reason = 'timeout', multiplayerScore = 0) {
        // 防止重复触发
        if (this.isGameOver) return;

        this.isGameOver = true;
        console.log('Game Over! Reason:', reason);

        // 播放游戏结束音效
        this.audioManager.playGameOver();

        this.isPlaying = false;
        this.timeManager.pause();
        this.inputManager.exitPointerLock();

        // 清理变身状态
        if (this.transformationState.isTransformed) {
            this.endTransformation();
        }

        // 如果是被领袖杀死，显示伤害效果
        if (reason === 'killed_by_leader') {
            const damageOverlay = document.getElementById('damageOverlay');
            damageOverlay.classList.remove('hidden');
            setTimeout(() => {
                damageOverlay.classList.add('hidden');
            }, 500);
        }

        // 延迟显示菜单，给玩家一点反应时间
        setTimeout(() => {
            // 无论单人还是联机模式，都显示游戏结束菜单
            if (this.isMultiplayer) {
                // 联机模式：显示狙击手得分，不显示最高分和新记录
                this.uiManager.showGameOverMenu(multiplayerScore, 0, false);
            } else {
                // 单人模式：正常显示得分和最高分
                const isNewHighScore = this.scoreManager.saveHighScore();
                this.uiManager.showGameOverMenu(
                    this.scoreManager.getScore(),
                    this.scoreManager.getHighScore(),
                    isNewHighScore
                );
            }
        }, 800);
    }

    /**
     * 显示击中效果（屏幕闪红）
     */
    showHitEffect() {
        // 创建或获取击中效果覆盖层
        let hitOverlay = document.getElementById('hit-overlay');
        if (!hitOverlay) {
            hitOverlay = document.createElement('div');
            hitOverlay.id = 'hit-overlay';
            hitOverlay.style.position = 'fixed';
            hitOverlay.style.top = '0';
            hitOverlay.style.left = '0';
            hitOverlay.style.width = '100%';
            hitOverlay.style.height = '100%';
            hitOverlay.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            hitOverlay.style.pointerEvents = 'none';
            hitOverlay.style.zIndex = '9999';
            hitOverlay.style.opacity = '0';
            hitOverlay.style.transition = 'opacity 0.2s';
            document.body.appendChild(hitOverlay);
        }

        // 显示效果
        hitOverlay.style.opacity = '1';

        // 0.3秒后淡出
        setTimeout(() => {
            hitOverlay.style.opacity = '0';
        }, 300);
    }

    /**
     * 返回主菜单
     */
    returnToMainMenu() {
        this.isPlaying = false;
        this.isPaused = false;
        this.inputManager.exitPointerLock();

        // 如果是多人模式，离开房间
        if (this.isMultiplayer && this.networkManager) {
            this.networkManager.leaveRoom();
            this.isMultiplayer = false;
            this.playerRole = null;

            // 停止 ping 测量并隐藏 ping 显示
            this.stopPingMeasurement();
            this.uiManager.hidePing();
        }

        // 隐藏生命值UI
        this.uiManager.hideHealth();

        this.resetGame();
        this.uiManager.showMainMenu();
        this.uiManager.updateHighScore(this.scoreManager.getHighScore());
    }

    /**
     * 更新游戏
     */
    update(deltaTime) {
        if (!this.isPlaying) return;

        // 时间更新（即使暂停也继续更新，但仅在单人模式下）
        // 联机模式下时间由服务器管理
        if (!this.isMultiplayer) {
            this.timeManager.update(deltaTime);
            this.uiManager.updateTime(this.timeManager.getFormattedTime());
        }

        // 更新烟雾效果（即使暂停也要更新，保持多人同步）
        for (let i = this.smokeEffects.length - 1; i >= 0; i--) {
            const smoke = this.smokeEffects[i];
            smoke.update(deltaTime);

            // 移除已经消散的烟雾
            if (!smoke.isAlive()) {
                smoke.destroy();
                this.smokeEffects.splice(i, 1);
            }
        }

        // 更新场景树倒地动画（即使暂停也要更新）
        this.updateSceneTreesFall(deltaTime);

        // 如果游戏暂停，只更新时间、烟雾和树倒地，不更新其他游戏逻辑
        if (this.isPaused) return;

        // 处理冻结期倒计时
        if (this.isFrozen) {
            this.freezeTime -= deltaTime;

            // 更新冻结倒计时UI
            this.uiManager.updateFreezeCountdown(Math.ceil(this.freezeTime));

            if (this.freezeTime <= 0) {
                // 冻结期结束
                this.isFrozen = false;
                this.freezeTime = 0;

                // 开始计时
                this.timeManager.start();

                // 隐藏倒计时UI
                this.uiManager.hideFreezeCountdown();

                console.log('准备时间结束 - 游戏正式开始！');
            }

            // 如果是狙击手，在冻结期内不能移动和射击
            if (this.playerRole === 'sniper') {
                return;
            }
        }

        // 更新玩家
        if (this.player) {
            this.player.update(deltaTime);

            // 联机模式下狙击手也需要同步位置和瞄准镜状态
            if (this.isMultiplayer && this.playerRole === 'sniper' && this.networkManager) {
                this.networkManager.sendPlayerMove(
                    {
                        x: this.player.position.x,
                        y: this.player.position.y,
                        z: this.player.position.z
                    },
                    {
                        x: this.player.rotation.x,
                        y: this.player.rotation.y,
                        z: 0
                    },
                    this.player.isScoped  // 发送瞄准镜状态
                );
            }
        }

        // 更新敌人
        if (this.spawner) {
            this.spawner.update(
                deltaTime,
                this.player.position,
                this.bullets
            );
        }

        // 更新玩家敌人（联机模式）
        if (this.isMultiplayer) {
            // 更新本地玩家敌人
            if (this.localPlayerEnemy && this.playerRole === 'enemy') {
                const moveData = this.localPlayerEnemy.updateLocal(deltaTime, this.cameraRotationY);

                // 发送位置更新到服务器（每帧发送）
                if (moveData && this.networkManager) {
                    this.networkManager.sendPlayerMove(moveData.position, moveData.rotation);
                }

                // 更新第三人称相机（跟随玩家并响应鼠标旋转）
                if (this.thirdPersonCamera) {
                    const cameraDistance = 8;  // 相机距离玩家的距离
                    const cameraHeight = 4;    // 相机高度偏移

                    // 根据旋转角度计算相机位置
                    const offsetX = Math.sin(this.cameraRotationY) * Math.cos(this.cameraRotationX) * cameraDistance;
                    const offsetY = Math.sin(this.cameraRotationX) * cameraDistance + cameraHeight;
                    const offsetZ = Math.cos(this.cameraRotationY) * Math.cos(this.cameraRotationX) * cameraDistance;

                    const offset = new THREE.Vector3(offsetX, offsetY, offsetZ);
                    const targetPos = this.localPlayerEnemy.position.clone().add(offset);

                    // 平滑移动相机
                    this.thirdPersonCamera.position.lerp(targetPos, 0.15);

                    // 相机看向玩家位置稍微上方
                    const lookAtTarget = this.localPlayerEnemy.position.clone();
                    lookAtTarget.y += 1.5;  // 看向玩家上半身
                    this.thirdPersonCamera.lookAt(lookAtTarget);
                }

                // 更新变身状态
                if (this.transformationState.isTransformed) {
                    // 同步变身模型位置到玩家位置
                    if (this.transformationState.transformModel) {
                        this.transformationState.transformModel.position.copy(this.localPlayerEnemy.position);
                    }

                    // 更新变身计时器
                    this.transformationState.transformTimer -= deltaTime;
                    if (this.transformationState.transformTimer <= 0) {
                        // 变身时间到，解除变身
                        this.endTransformation();
                    }

                    // 处理树倒地动画（本地玩家）
                    if (this.transformationState.isFalling && this.transformationState.transformModel) {
                        this.updateTreeFallAnimation(this.transformationState, deltaTime, true);
                    }
                }
            }

            // 更新所有玩家敌人
            for (const [id, playerEnemy] of this.playerEnemies) {
                if (id !== this.networkManager?.playerId) {
                    playerEnemy.update(deltaTime);

                    // 同步变身模型位置
                    if (playerEnemy.transformationState?.isTransformed && playerEnemy.transformationState.transformModel) {
                        playerEnemy.transformationState.transformModel.position.copy(playerEnemy.position);

                        // 处理树倒地动画（远程玩家）
                        if (playerEnemy.transformationState.isFalling) {
                            this.updateTreeFallAnimation(playerEnemy.transformationState, deltaTime, false);
                        }
                    }
                }
            }

            // 检测激光与本地玩家（敌人）的碰撞
            if (this.playerRole === 'enemy' && this.localPlayerEnemy) {
                this.checkLaserCollision();
            }

            // 检测所有玩家敌人是否在草丛内
            this.checkGrassBushCover();
        }

        // 更新子弹
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(deltaTime);

            // 移除不活跃的子弹
            if (!bullet.isActive || bullet.checkGroundHit()) {
                bullet.destroy();
                this.bullets.splice(i, 1);
            }
        }

        // 更新物理
        this.physicsManager.update(deltaTime);
    }

    /**
     * 渲染
     */
    render() {
        if (!this.renderer) return;

        // 选择正确的相机
        let camera = null;
        if (this.isMultiplayer && this.playerRole === 'enemy' && this.thirdPersonCamera) {
            camera = this.thirdPersonCamera;
        } else if (this.player) {
            camera = this.player.camera;
        }

        if (camera) {
            this.renderer.render(this.scene, camera);
        }
    }

    /**
     * 动画循环
     */
    animate() {
        // 持续动画循环，即使游戏结束也继续渲染
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();

        // 只在游戏进行时更新逻辑
        if (this.isPlaying && !this.isPaused) {
            this.update(deltaTime);
        }

        // 始终渲染场景
        this.render();
    }

    /**
     * 检测激光是否与敌人重合（敌人视角）
     */
    checkLaserCollision() {
        if (!this.localPlayerEnemy) return;

        // 查找狙击手玩家
        for (const [id, playerEnemy] of this.playerEnemies) {
            // 跳过自己，只检查狙击手
            if (id === this.networkManager.playerId || !playerEnemy.isScoped) continue;

            // 获取激光射线的起点和方向
            const laserStart = playerEnemy.position.clone();
            const laserDirection = new THREE.Vector3();

            // 从激光线的几何体中获取方向
            if (playerEnemy.laserSight && playerEnemy.laserSight.geometry) {
                const positions = playerEnemy.laserSight.geometry.attributes.position.array;
                const start = new THREE.Vector3(positions[0], positions[1], positions[2]);
                const end = new THREE.Vector3(positions[3], positions[4], positions[5]);
                laserDirection.subVectors(end, start).normalize();

                // 计算本地玩家位置到激光射线的距离
                const playerPos = this.localPlayerEnemy.position.clone();
                playerPos.y += 1; // 身体中心

                // 点到射线的距离
                const laserToPlayer = new THREE.Vector3();
                laserToPlayer.subVectors(playerPos, start);
                const projection = laserToPlayer.dot(laserDirection);
                const closestPoint = start.clone().add(laserDirection.multiplyScalar(projection));
                const distance = playerPos.distanceTo(closestPoint);

                // 如果距离小于玩家半径，说明激光穿过了玩家
                const playerRadius = 0.6;
                if (distance < playerRadius && projection > 0) {
                    console.log(`[Laser Collision] 狙击手激光正在瞄准你！距离身体中心: ${distance.toFixed(2)}m, 投影距离: ${projection.toFixed(2)}m`);
                }
            }
        }
    }

    /**
     * 检测玩家是否在草丛内并应用隐藏效果
     */
    checkGrassBushCover() {
        if (!this.isMultiplayer) return;

        // 检测所有玩家敌人
        for (const [id, playerEnemy] of this.playerEnemies) {
            if (!playerEnemy || !playerEnemy.mesh) continue;

            let inBush = false;

            // 检测是否在任何草丛范围内
            for (const bush of this.grassBushes) {
                const distance = playerEnemy.position.distanceTo(bush.position);
                if (distance < bush.userData.radius) {
                    inBush = true;
                    break;
                }
            }

            // 应用或移除隐藏效果
            if (inBush && !playerEnemy.userData?.isHiddenInBush) {
                // 进入草丛，降低可见性
                this.applyBushCover(playerEnemy, true);
                // 确保 userData 存在
                if (!playerEnemy.userData) playerEnemy.userData = {};
                playerEnemy.userData.isHiddenInBush = true;

                // 如果是本地玩家，显示提示
                if (id === this.networkManager?.playerId) {
                    console.log('[Grass Bush] 你进入了草丛，狙击手更难发现你！');
                }
            } else if (!inBush && playerEnemy.userData?.isHiddenInBush) {
                // 离开草丛，恢复可见性
                this.applyBushCover(playerEnemy, false);
                playerEnemy.userData.isHiddenInBush = false;

                // 如果是本地玩家，显示提示
                if (id === this.networkManager?.playerId) {
                    console.log('[Grass Bush] 你离开了草丛。');
                }
            }
        }
    }

    /**
     * 应用草丛掩护效果
     */
    applyBushCover(playerEnemy, hide) {
        if (!playerEnemy.mesh) return;

        // 遍历所有子网格并设置透明度
        playerEnemy.mesh.traverse((child) => {
            if (child.isMesh && child.material) {
                // 确保材质支持透明度
                child.material.transparent = true;

                if (hide) {
                    // 在草丛中：降低透明度（30%可见）
                    child.material.opacity = 0.3;
                } else {
                    // 离开草丛：恢复完全可见
                    child.material.opacity = 1.0;
                }
            }
        });
    }

    /**
     * 使用变身道具
     */
    /**
     * 创建变身模型（使用现有的场景物体）
     * @param {string} type - 变身类型：'tree', 'rock', 'grass'
     * @returns {THREE.Group|THREE.Mesh} 变身后的3D模型
     */
    createTransformationModel(type) {
        let model;

        switch (type) {
            case 'tree':
                // 使用现有的树木创建方法
                const tree = new THREE.Group();

                // 树干
                const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 3, 8);
                const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a2511 });
                const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
                trunk.position.y = 1.5;
                trunk.castShadow = true;
                trunk.receiveShadow = true;
                tree.add(trunk);

                // 树冠
                const foliageGeometry = new THREE.ConeGeometry(2, 4, 8);
                const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5016 });
                const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                foliage.position.y = 4.5;
                foliage.castShadow = true;
                foliage.receiveShadow = true;
                tree.add(foliage);

                model = tree;
                break;

            case 'rock':
                // 使用现有的岩石创建方法
                const geometry = new THREE.DodecahedronGeometry(1 + Math.random() * 0.5);
                const material = new THREE.MeshStandardMaterial({
                    color: 0x808080,
                    roughness: 0.9
                });
                const rock = new THREE.Mesh(geometry, material);
                rock.position.y = 1;
                rock.rotation.set(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                rock.castShadow = true;
                rock.receiveShadow = true;
                model = rock;
                break;

            case 'grass':
                // 使用现有的草丛创建方法
                const bush = new THREE.Group();

                // 底部草丛基座（圆柱体）
                const baseGeometry = new THREE.CylinderGeometry(3.0, 3.6, 2.4, 8);
                const baseMaterial = new THREE.MeshStandardMaterial({
                    color: 0x2d5016,
                    roughness: 0.9,
                    transparent: true,
                    opacity: 0.8
                });
                const base = new THREE.Mesh(baseGeometry, baseMaterial);
                base.position.y = 1.2;
                base.receiveShadow = true;
                bush.add(base);

                // 创建多层草叶
                const leafMaterial = new THREE.MeshStandardMaterial({
                    color: 0x3a7d44,
                    roughness: 0.8,
                    transparent: true,
                    opacity: 0.7,
                    side: THREE.DoubleSide
                });

                // 添加几层草叶
                for (let i = 0; i < 3; i++) {
                    const leafGeometry = new THREE.ConeGeometry(
                        2.4 - i * 0.6,
                        1.6,
                        6
                    );
                    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
                    leaf.position.y = 2.4 + i * 0.8;
                    leaf.rotation.y = (Math.random() * Math.PI) / 3;
                    bush.add(leaf);
                }

                model = bush;
                break;
        }

        return model;
    }

    /**
     * 使用变身道具
     * @param {number} slotIndex - 物品槽索引（0-2）
     */
    useTransformation(slotIndex) {
        if (!this.localPlayerEnemy || this.playerRole !== 'enemy') {
            return;
        }

        // 如果已经变身，先结束当前变身
        if (this.transformationState.isTransformed) {
            this.endTransformation();
        }

        const type = this.transformationInventory.useTransformation(slotIndex);
        if (!type) {
            return; // 槽位为空
        }

        console.log(`[变身] 使用${this.transformationInventory.getTypeName(type)}道具`);

        // 隐藏玩家原始模型
        if (this.localPlayerEnemy.mesh) {
            this.localPlayerEnemy.mesh.visible = false;
        }

        // 创建变身模型
        const transformModel = this.createTransformationModel(type);
        transformModel.position.copy(this.localPlayerEnemy.position);
        this.scene.add(transformModel);

        // 保存变身状态
        this.transformationState.isTransformed = true;
        this.transformationState.currentType = type;
        this.transformationState.transformModel = transformModel;
        this.transformationState.transformTimer = this.transformationState.transformDuration;

        // 播放UI点击音效
        this.audioManager.playUIClick();

        console.log(`[变身] 变为${this.transformationInventory.getTypeName(type)}，持续${this.transformationState.transformDuration}秒`);

        // 发送变身状态到服务器（多人模式）
        if (this.isMultiplayer && this.networkManager) {
            this.networkManager.sendTransformation(type, true);
        }
    }

    /**
     * 结束变身状态
     * @param {boolean} sendToNetwork - 是否发送到网络（默认true）
     */
    endTransformation(sendToNetwork = true) {
        if (!this.transformationState.isTransformed) {
            return;
        }

        console.log(`[变身] 解除变身`);

        // 移除变身模型
        if (this.transformationState.transformModel) {
            this.scene.remove(this.transformationState.transformModel);
            this.transformationState.transformModel = null;
        }

        // 显示玩家原始模型
        if (this.localPlayerEnemy && this.localPlayerEnemy.mesh) {
            this.localPlayerEnemy.mesh.visible = true;
        }

        // 重置变身状态
        this.transformationState.isTransformed = false;
        this.transformationState.currentType = null;
        this.transformationState.transformTimer = 0;

        // 发送解除变身到服务器（多人模式）
        if (sendToNetwork && this.isMultiplayer && this.networkManager) {
            this.networkManager.sendTransformation(null, false);
        }
    }

    /**
     * 处理其他玩家的变身状态更新（网络同步）
     * @param {string} playerId - 玩家ID
     * @param {string|null} type - 变身类型（'tree', 'rock', 'grass'）或null表示解除变身
     * @param {boolean} isTransformed - 是否变身
     */
    handlePlayerTransformation(playerId, type, isTransformed) {
        // 不处理本地玩家的变身（本地玩家直接调用useTransformation）
        if (playerId === this.networkManager?.playerId) {
            return;
        }

        const playerEnemy = this.playerEnemies.get(playerId);
        if (!playerEnemy) {
            console.warn(`[变身] 玩家 ${playerId} 不存在`);
            return;
        }

        if (isTransformed && type) {
            // 变身：隐藏原始模型，创建变身模型
            if (playerEnemy.mesh) {
                playerEnemy.mesh.visible = false;
            }

            // 如果已有变身模型，先移除
            if (playerEnemy.transformationState.transformModel) {
                this.scene.remove(playerEnemy.transformationState.transformModel);
            }

            // 创建新的变身模型
            const transformModel = this.createTransformationModel(type);
            transformModel.position.copy(playerEnemy.position);
            this.scene.add(transformModel);

            playerEnemy.transformationState.isTransformed = true;
            playerEnemy.transformationState.currentType = type;
            playerEnemy.transformationState.transformModel = transformModel;

            console.log(`[变身] 玩家 ${playerId} 变身为 ${type}`);
        } else {
            // 解除变身：移除变身模型，显示原始模型
            if (playerEnemy.transformationState.transformModel) {
                this.scene.remove(playerEnemy.transformationState.transformModel);
                playerEnemy.transformationState.transformModel = null;
            }

            if (playerEnemy.mesh) {
                playerEnemy.mesh.visible = true;
            }

            playerEnemy.transformationState.isTransformed = false;
            playerEnemy.transformationState.currentType = null;

            console.log(`[变身] 玩家 ${playerId} 解除变身`);
        }
    }

    /**
     * 更新树倒地动画
     * @param {Object} transformState - 变身状态对象
     * @param {number} deltaTime - 时间增量
     * @param {boolean} isLocal - 是否是本地玩家
     */
    updateTreeFallAnimation(transformState, deltaTime, isLocal) {
        if (!transformState.isFalling) return;
        if (!transformState.transformModel) return;

        const model = transformState.transformModel;
        const fallSpeed = 1.5; // 倒地速度（1.5秒倒地）

        // 更新倒地进度
        transformState.fallProgress += deltaTime * fallSpeed;

        if (transformState.fallProgress >= 1.0) {
            // 倒地完成
            transformState.fallProgress = 1.0;
            transformState.isFalling = false;

            // 2秒后解除变身
            setTimeout(() => {
                if (isLocal) {
                    // 本地玩家解除变身
                    this.endTransformation();
                } else {
                    // 远程玩家解除变身（本地移除模型）
                    if (transformState.transformModel) {
                        this.scene.remove(transformState.transformModel);
                        transformState.transformModel = null;
                    }
                    // 需要找到对应的playerEnemy来显示mesh
                    for (const [id, playerEnemy] of this.playerEnemies) {
                        if (playerEnemy.transformationState === transformState) {
                            if (playerEnemy.mesh) {
                                playerEnemy.mesh.visible = true;
                            }
                            playerEnemy.transformationState.isTransformed = false;
                            playerEnemy.transformationState.currentType = null;
                            break;
                        }
                    }
                }
            }, 2000);
        }

        // 平滑倒地旋转（从0度到90度）
        const targetRotation = Math.PI / 2 * transformState.fallProgress;

        // 计算倒地的旋转轴（垂直于倒地方向）
        const fallDir = transformState.fallDirection;
        const rotationAxis = new THREE.Vector3(-fallDir.z, 0, fallDir.x).normalize();

        // 应用旋转
        model.quaternion.setFromAxisAngle(rotationAxis, targetRotation);
    }

    /**
     * 处理树倒地事件（网络同步）
     * @param {string} playerId - 玩家ID
     * @param {Object} shootDirection - 射击方向
     */
    handleTreeFall(playerId, shootDirection) {
        // 确定是本地玩家还是远程玩家
        let transformState = null;
        let isLocal = false;

        if (playerId === this.networkManager?.playerId && this.localPlayerEnemy) {
            // 本地玩家使用Game.js中的transformationState
            transformState = this.transformationState;
            isLocal = true;
        } else {
            // 远程玩家使用PlayerEnemy中的transformationState
            const playerEnemy = this.playerEnemies.get(playerId);
            if (playerEnemy) {
                transformState = playerEnemy.transformationState;
            }
        }

        if (!transformState) {
            console.warn(`[树倒地] 玩家 ${playerId} 不存在`);
            return;
        }

        if (!transformState.isTransformed || transformState.currentType !== 'tree') {
            console.warn(`[树倒地] 玩家 ${playerId} 没有变身为树`);
            return;
        }

        console.log(`[树倒地] 玩家 ${playerId} 的树开始倒地`);

        const transformModel = transformState.transformModel;
        if (!transformModel) return;

        // 计算倒地方向（与射击方向相同）
        const fallDir = new THREE.Vector3(
            shootDirection.x,
            0,
            shootDirection.z
        ).normalize();

        // 保存倒地信息
        transformState.isFalling = true;
        transformState.fallProgress = 0;
        transformState.fallDirection.copy(fallDir);

        // 倒地动画将在update循环中处理
    }

    /**
     * 让场景中的树倒地
     * @param {THREE.Group} tree - 树对象
     * @param {THREE.Vector3} shootDirection - 射击方向
     */
    makeTreeFall(tree, shootDirection) {
        if (!tree || !tree.userData.isTree) return;
        if (tree.userData.isFallen) return; // 已经倒地了

        console.log('[场景树倒地] 树开始倒地');

        // 计算倒地方向（与射击方向相同）
        const fallDir = new THREE.Vector3(
            shootDirection.x,
            0,
            shootDirection.z
        ).normalize();

        // 标记为正在倒地
        tree.userData.isFalling = true;
        tree.userData.fallProgress = 0;
        tree.userData.fallDirection.copy(fallDir);

        // 播放击中音效
        this.audioManager.playHit();
    }

    /**
     * 更新场景树倒地动画
     * @param {number} deltaTime - 时间增量
     */
    updateSceneTreesFall(deltaTime) {
        const fallSpeed = 1.5; // 倒地速度（1.5秒倒地）

        for (const obstacle of this.obstacles) {
            if (!obstacle.userData.isTree) continue;
            if (!obstacle.userData.isFalling) continue;

            // 更新倒地进度
            obstacle.userData.fallProgress += deltaTime * fallSpeed;

            if (obstacle.userData.fallProgress >= 1.0) {
                // 倒地完成
                obstacle.userData.fallProgress = 1.0;
                obstacle.userData.isFalling = false;
                obstacle.userData.isFallen = true;
            }

            // 平滑倒地旋转（从0度到90度）
            const targetRotation = Math.PI / 2 * obstacle.userData.fallProgress;

            // 计算倒地的旋转轴（垂直于倒地方向）
            const fallDir = obstacle.userData.fallDirection;
            const rotationAxis = new THREE.Vector3(-fallDir.z, 0, fallDir.x).normalize();

            // 应用旋转
            obstacle.quaternion.setFromAxisAngle(rotationAxis, targetRotation);
        }
    }

    /**
     * 开始 Ping 测量（联机模式）
     */
    startPingMeasurement() {
        if (!this.isMultiplayer || !this.networkManager) return;

        // 立即测量一次
        this.networkManager.measurePing();

        // 每2秒测量一次延迟
        this.pingInterval = setInterval(() => {
            if (this.networkManager && this.networkManager.connected) {
                this.networkManager.measurePing();
            }
        }, 2000);
    }

    /**
     * 停止 Ping 测量
     */
    stopPingMeasurement() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    /**
     * 窗口大小改变
     */
    onWindowResize() {
        if (this.player) {
            this.player.onWindowResize();
        }

        if (this.thirdPersonCamera) {
            this.thirdPersonCamera.aspect = window.innerWidth / window.innerHeight;
            this.thirdPersonCamera.updateProjectionMatrix();
        }

        if (this.renderer) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
}
