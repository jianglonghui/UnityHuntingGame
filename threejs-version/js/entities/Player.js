// 玩家类
export class Player {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();

        // 相机设置
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.copy(this.position);

        // 鼠标控制
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.sensitivity = 0.002;
        this.scopedSensitivity = 0.0005;  // 瞄准镜时的灵敏度

        // 瞄准镜状态
        this.isScoped = false;
        this.zoomLevel = 1;
        this.minZoom = 1;
        this.maxZoom = 15;
        this.baseFOV = 75;

        // 射击
        this.canShoot = true;
        this.shootCooldown = 1.0;  // 1秒冷却
        this.shootTimer = 0;

        // 音频
        this.setupAudio();
    }

    /**
     * 设置音频
     */
    setupAudio() {
        this.audioListener = new THREE.AudioListener();
        this.camera.add(this.audioListener);

        // 创建音频源（这里使用占位符，实际需要加载音频文件）
        this.shootSound = new THREE.Audio(this.audioListener);
        this.reloadSound = new THREE.Audio(this.audioListener);

        // 注意：实际使用时需要加载真实的音频文件
        // const audioLoader = new THREE.AudioLoader();
        // audioLoader.load('sounds/shoot.mp3', (buffer) => {
        //     this.shootSound.setBuffer(buffer);
        //     this.shootSound.setVolume(0.5);
        // });
    }

    /**
     * 更新玩家
     */
    update(deltaTime) {
        // 更新射击冷却
        if (!this.canShoot) {
            this.shootTimer += deltaTime;
            if (this.shootTimer >= this.shootCooldown) {
                this.canShoot = true;
                this.shootTimer = 0;
                // 播放装填音效
                // if (this.reloadSound.buffer) this.reloadSound.play();
            }
        }

        // 更新相机旋转
        this.camera.rotation.copy(this.rotation);

        // 更新FOV（平滑过渡）
        const targetFOV = this.baseFOV / this.zoomLevel;
        this.camera.fov += (targetFOV - this.camera.fov) * 0.1;
        this.camera.updateProjectionMatrix();
    }

    /**
     * 处理鼠标移动
     */
    onMouseMove(movementX, movementY) {
        const sensitivity = this.isScoped ? this.scopedSensitivity : this.sensitivity;

        this.rotation.y -= movementX * sensitivity;
        this.rotation.x -= movementY * sensitivity;

        // 限制垂直旋转
        this.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.rotation.x));
    }

    /**
     * 切换瞄准镜
     */
    toggleScope() {
        this.isScoped = !this.isScoped;
        return this.isScoped;
    }

    /**
     * 调整缩放
     */
    adjustZoom(delta) {
        if (this.isScoped) {
            this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel - delta));
        }
        return this.zoomLevel;
    }

    /**
     * 射击
     */
    shoot() {
        if (!this.canShoot) {
            console.log('Weapon cooling down...');
            return null;
        }

        if (!this.isScoped) {
            console.log('Need to open scope first! Press Right Click or Shift');
            return null;
        }

        this.canShoot = false;
        this.shootTimer = 0;

        console.log('Shooting!');

        // 播放射击音效
        // if (this.shootSound.buffer) this.shootSound.play();

        // 获取射击方向
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);

        return {
            position: this.camera.position.clone(),
            direction: direction
        };
    }

    /**
     * 获取相机前方向量
     */
    getForwardVector() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        return direction;
    }

    /**
     * 获取射击射线
     */
    getShootRay() {
        const direction = this.getForwardVector();
        return new THREE.Ray(this.camera.position, direction);
    }

    /**
     * 窗口大小改变
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    }
}
