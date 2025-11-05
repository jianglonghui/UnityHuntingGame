// 主游戏类
import { Player } from './entities/Player.js';
import { Spawner } from './entities/Spawner.js';
import { Bullet } from './entities/Bullet.js';
import { ScoreManager } from './core/ScoreManager.js';
import { TimeManager } from './core/TimeManager.js';
import { InputManager } from './core/InputManager.js';
import { PhysicsManager } from './core/PhysicsManager.js';
import { UIManager } from './ui/UIManager.js';

export class Game {
    constructor() {
        this.isInitialized = false;
        this.isPlaying = false;
        this.isPaused = false;

        // Three.js核心对象
        this.scene = null;
        this.renderer = null;
        this.clock = null;

        // 游戏实体
        this.player = null;
        this.spawner = null;
        this.bullets = [];

        // 管理器
        this.scoreManager = new ScoreManager();
        this.timeManager = new TimeManager(60);
        this.inputManager = new InputManager();
        this.physicsManager = new PhysicsManager();
        this.uiManager = new UIManager();

        // 环境
        this.ground = null;
        this.obstacles = [];

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

        // 创建一些树木和岩石作为障碍物
        this.createObstacles();
    }

    /**
     * 创建障碍物
     */
    createObstacles() {
        // 创建随机分布的树木
        for (let i = 0; i < 50; i++) {
            const tree = this.createTree();
            const angle = Math.random() * Math.PI * 2;
            const radius = 20 + Math.random() * 70;
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
            const angle = Math.random() * Math.PI * 2;
            const radius = 15 + Math.random() * 75;
            rock.position.set(
                Math.cos(angle) * radius,
                0,
                Math.sin(angle) * radius
            );
            this.scene.add(rock);
            this.obstacles.push(rock);
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

        return tree;
    }

    /**
     * 创建岩石
     */
    createRock() {
        const geometry = new THREE.DodecahedronGeometry(1 + Math.random());
        const material = new THREE.MeshStandardMaterial({
            color: 0x808080,
            roughness: 0.9
        });
        const rock = new THREE.Mesh(geometry, material);
        rock.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        rock.castShadow = true;
        rock.receiveShadow = true;
        return rock;
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
        this.uiManager.onPlayButton = () => this.startGame();
        this.uiManager.onResumeButton = () => this.resumeGame();
        this.uiManager.onMainMenuButton = () => this.returnToMainMenu();
    }

    /**
     * 设置输入回调
     */
    setupInputCallbacks() {
        // 鼠标移动
        this.inputManager.onMouseMove = (x, y) => {
            if (this.player && this.isPlaying && !this.isPaused) {
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
            // 空格射击
            else if (event.code === 'Space') {
                this.shoot();
            }
        };

        // 滚轮缩放
        this.inputManager.onWheel = (delta) => {
            if (this.player && this.isPlaying && !this.isPaused) {
                const zoom = this.player.adjustZoom(delta * 0.001);
                this.uiManager.updateZoom(zoom);
            }
        };
    }

    /**
     * 开始游戏
     */
    startGame() {
        console.log('Starting game...');

        // 重置游戏状态
        this.resetGame();

        // 创建玩家
        this.player = new Player(this.scene, new THREE.Vector3(0, 10, 0));

        // 创建敌人生成器
        this.spawner = new Spawner(
            this.scene,
            new THREE.Vector3(0, 0, 0),
            80,   // 生成半径
            100,  // 敌人数量
            10    // 每10个敌人1个领袖
        );
        this.spawner.setObstacles(this.obstacles);
        this.spawner.spawnAll();

        // 开始游戏
        this.isPlaying = true;
        this.isPaused = false;
        this.timeManager.start();

        // 锁定鼠标
        this.inputManager.requestPointerLock();

        // 显示游戏UI
        this.uiManager.showGameUI();

        // 默认开启瞄准镜
        this.player.isScoped = true;
        this.uiManager.showScope();

        // 添加点击提示事件监听
        const clickPrompt = document.getElementById('clickPrompt');
        const hidePrompt = () => {
            clickPrompt.style.display = 'none';
            document.removeEventListener('click', hidePrompt);
        };
        clickPrompt.addEventListener('click', hidePrompt);
        document.addEventListener('click', hidePrompt, { once: true });

        // 开始渲染循环
        this.animate();

        console.log('Game started! 提示：右键或Shift切换瞄准镜，左键或空格射击');
    }

    /**
     * 重置游戏
     */
    resetGame() {
        // 清除旧的游戏对象
        if (this.spawner) {
            this.spawner.clearAll();
        }

        for (const bullet of this.bullets) {
            bullet.destroy();
        }
        this.bullets = [];

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
            // 使用射线检测立即击中
            const ray = this.player.getShootRay();
            const hitEnemy = this.spawner.checkShootHit(ray);

            if (hitEnemy) {
                hitEnemy.onHit();
                const newScore = this.scoreManager.addScore(1);
                this.uiManager.updateScore(newScore);
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
    gameOver() {
        console.log('Game Over!');

        this.isPlaying = false;
        this.timeManager.pause();
        this.inputManager.exitPointerLock();

        // 保存最高分
        const isNewHighScore = this.scoreManager.saveHighScore();

        // 显示游戏结束菜单
        this.uiManager.showGameOverMenu(
            this.scoreManager.getScore(),
            this.scoreManager.getHighScore(),
            isNewHighScore
        );
    }

    /**
     * 返回主菜单
     */
    returnToMainMenu() {
        this.isPlaying = false;
        this.isPaused = false;
        this.inputManager.exitPointerLock();
        this.resetGame();
        this.uiManager.showMainMenu();
        this.uiManager.updateHighScore(this.scoreManager.getHighScore());
    }

    /**
     * 更新游戏
     */
    update(deltaTime) {
        if (!this.isPlaying || this.isPaused) return;

        // 更新时间
        this.timeManager.update(deltaTime);
        this.uiManager.updateTime(this.timeManager.getFormattedTime());

        // 更新玩家
        if (this.player) {
            this.player.update(deltaTime);
        }

        // 更新敌人
        if (this.spawner) {
            this.spawner.update(
                deltaTime,
                this.player.position,
                this.bullets
            );
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
        if (this.player && this.renderer) {
            this.renderer.render(this.scene, this.player.camera);
        }
    }

    /**
     * 动画循环
     */
    animate() {
        if (!this.isPlaying) return;

        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();
        this.update(deltaTime);
        this.render();
    }

    /**
     * 窗口大小改变
     */
    onWindowResize() {
        if (this.player) {
            this.player.onWindowResize();
        }
        if (this.renderer) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
}
