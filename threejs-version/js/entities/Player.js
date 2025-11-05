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

        // 激光瞄准线（敌人可见）
        this.laserSight = null;
        this.laserSightEnabled = true;
        this.createLaserSight();

        // 音频
        this.setupAudio();
    }

    /**
     * 创建激光瞄准线
     */
    createLaserSight() {
        // 创建激光线材质（红色半透明）
        const laserMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
        });

        // 创建线的几何体（从相机位置到很远的点）
        const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -100)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        this.laserSight = new THREE.Line(geometry, laserMaterial);
        this.laserSight.visible = false; // 默认隐藏
        this.scene.add(this.laserSight);
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

        // 更新激光瞄准线
        if (this.laserSight && this.laserSightEnabled) {
            // 只在瞄准镜激活时显示激光线
            this.laserSight.visible = this.isScoped;

            if (this.isScoped) {
                // 获取相机朝向
                const direction = this.getForwardVector();
                const laserLength = 100;

                // 更新激光线的起点和终点
                const startPoint = this.camera.position.clone();
                const endPoint = startPoint.clone().add(direction.multiplyScalar(laserLength));

                const positions = this.laserSight.geometry.attributes.position.array;
                positions[0] = startPoint.x;
                positions[1] = startPoint.y;
                positions[2] = startPoint.z;
                positions[3] = endPoint.x;
                positions[4] = endPoint.y;
                positions[5] = endPoint.z;

                this.laserSight.geometry.attributes.position.needsUpdate = true;
            }
        }
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
