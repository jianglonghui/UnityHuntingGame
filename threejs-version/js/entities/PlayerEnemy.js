// 玩家控制的敌人类
export class PlayerEnemy {
    constructor(scene, position, playerId, playerName, isLocal = false, obstacles = []) {
        this.scene = scene;
        this.position = position.clone();
        this.playerId = playerId;
        this.playerName = playerName;
        this.isLocal = isLocal;  // 是否是本地玩家
        this.isAlive = true;
        this.lives = 3;
        this.obstacles = obstacles;  // 场景中的障碍物

        // 运动属性
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.speed = 5.0;  // 比AI敌人稍快
        this.rotation = 0;

        // 跳跃属性
        this.isGrounded = true;
        this.jumpVelocity = 0;
        this.jumpForce = 8.0;
        this.gravity = -20.0;
        this.groundLevel = 0;

        // 方向向量
        this.forward = new THREE.Vector3(0, 0, 1);

        // 键盘状态（仅本地玩家）
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false
        };

        // 创建3D模型
        this.createModel();

        // 创建激光瞄准线（用于显示狙击手的瞄准方向）
        this.laserSight = null;
        this.isScoped = false;  // 是否开启瞄准镜
        this.createLaserSight();

        // 添加到场景
        this.scene.add(this.mesh);
    }

    /**
     * 创建激光瞄准线（显示狙击手瞄准方向）
     */
    createLaserSight() {
        const laserMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.6,
            linewidth: 2
        });

        const points = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -100)
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        this.laserSight = new THREE.Line(geometry, laserMaterial);
        this.laserSight.visible = false;
        this.scene.add(this.laserSight);
    }

    /**
     * 创建3D模型
     */
    createModel() {
        // 创建身体（胶囊形状）
        const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1.5, 8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.isLocal ? 0x00ff00 : 0x0088ff,  // 本地玩家绿色，其他玩家蓝色
            roughness: 0.7,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;

        // 创建头部
        const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: this.isLocal ? 0x00aa00 : 0x0066cc,
            roughness: 0.6,
            metalness: 0.2
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 1.5, 0);
        head.castShadow = true;

        // 创建容器
        this.mesh = new THREE.Group();
        this.mesh.add(body);
        this.mesh.add(head);
        this.mesh.position.copy(this.position);

        // 添加玩家名称标签（使用CSS2DRenderer更好，这里简化处理）
        // TODO: 添加名称标签

        // 存储模型引用
        this.bodyMesh = body;
        this.headMesh = head;
    }

    /**
     * 设置键盘状态（仅本地玩家）
     */
    setKeyState(key, pressed) {
        if (!this.isLocal) return;

        switch(key) {
            case 'KeyW':
                this.keys.forward = pressed;
                break;
            case 'KeyS':
                this.keys.backward = pressed;
                break;
            case 'KeyA':
                this.keys.left = pressed;
                break;
            case 'KeyD':
                this.keys.right = pressed;
                break;
        }
    }

    /**
     * 更新本地玩家
     */
    updateLocal(deltaTime, cameraRotation = 0) {
        if (!this.isLocal || !this.isAlive) return;

        // 计算移动方向（相对于相机）
        const moveDirection = new THREE.Vector3(0, 0, 0);

        if (this.keys.forward) moveDirection.z -= 1;
        if (this.keys.backward) moveDirection.z += 1;
        if (this.keys.left) moveDirection.x -= 1;
        if (this.keys.right) moveDirection.x += 1;

        // 归一化并应用速度
        if (moveDirection.length() > 0) {
            moveDirection.normalize();

            // 根据相机旋转角度转换移动方向（Y轴旋转矩阵）
            const rotatedX = moveDirection.x * Math.cos(cameraRotation) + moveDirection.z * Math.sin(cameraRotation);
            const rotatedZ = -moveDirection.x * Math.sin(cameraRotation) + moveDirection.z * Math.cos(cameraRotation);

            this.velocity.set(
                rotatedX * this.speed,
                this.velocity.y,  // 保持Y轴速度（跳跃）
                rotatedZ * this.speed
            );
        } else {
            this.velocity.set(0, this.velocity.y, 0);
        }

        // 跳跃逻辑
        if (this.keys.jump && this.isGrounded) {
            this.jumpVelocity = this.jumpForce;
            this.isGrounded = false;
            this.keys.jump = false;  // 防止连续跳跃
        }

        // 应用重力
        if (!this.isGrounded) {
            this.jumpVelocity += this.gravity * deltaTime;
        }

        this.velocity.y = this.jumpVelocity;

        // 保存旧位置用于碰撞检测
        const oldPosition = this.position.clone();

        // 应用移动
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // 障碍物碰撞检测
        if (this.checkCollision()) {
            // 如果碰撞，恢复到旧位置
            this.position.copy(oldPosition);
        }

        // 地面检测
        if (this.position.y <= this.groundLevel) {
            this.position.y = this.groundLevel;
            this.jumpVelocity = 0;
            this.isGrounded = true;
        }

        // 限制在地图范围内
        const mapSize = 90;
        this.position.x = Math.max(-mapSize, Math.min(mapSize, this.position.x));
        this.position.z = Math.max(-mapSize, Math.min(mapSize, this.position.z));

        // 更新旋转（朝向移动方向）
        const horizontalVelocity = new THREE.Vector2(this.velocity.x, this.velocity.z);
        if (horizontalVelocity.length() > 0.1) {
            this.rotation = Math.atan2(this.velocity.x, this.velocity.z);
        }

        // 更新3D模型位置和旋转
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;

        return {
            position: {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            },
            rotation: {
                x: 0,
                y: this.rotation,
                z: 0
            }
        };
    }

    /**
     * 通用更新方法（每帧调用）
     */
    update(deltaTime) {
        // 远程玩家不需要每帧更新（位置通过网络事件更新）
        // 这个方法主要是为了兼容Game.js中的统一调用
        if (!this.isLocal) {
            return;
        }

        // 本地玩家的更新在 updateLocal 中处理
        // 这里可以添加一些通用的逻辑，比如动画
    }

    /**
     * 更新远程玩家（从网络同步）
     */
    updateRemote(position, rotation, isScoped = false) {
        if (this.isLocal) return;

        // 目标位置
        const targetPos = new THREE.Vector3(position.x, position.y, position.z);

        // 平滑插值
        this.position.lerp(targetPos, 0.3);
        this.rotation = rotation.y;

        // 更新瞄准镜状态
        this.isScoped = isScoped;

        // 更新3D模型
        this.mesh.position.copy(this.position);
        this.mesh.rotation.y = this.rotation;

        // 更新激光瞄准线（只有狙击手才有）
        if (this.laserSight) {
            this.laserSight.visible = this.isScoped;

            if (this.isScoped && rotation) {
                // 使用和 Player.js 相同的方式计算方向向量
                // 创建欧拉角（YXZ 顺序，与 Player.js 保持一致）
                const euler = new THREE.Euler(rotation.x, rotation.y, 0, 'YXZ');

                // 创建临时四元数
                const quaternion = new THREE.Quaternion();
                quaternion.setFromEuler(euler);

                // 计算前向方向向量（与 Player.getForwardVector() 相同）
                const direction = new THREE.Vector3(0, 0, -1);
                direction.applyQuaternion(quaternion);

                const laserLength = 100;

                // 狙击手的激光从相机位置发出（即 position），不需要加高度
                // 因为狙击手的 camera.position = player.position
                const startPoint = this.position.clone();

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
     * 被击中
     */
    onHit() {
        this.lives--;

        console.log(`${this.playerName} hit! Lives remaining: ${this.lives}`);

        // 闪烁效果
        this.playHitEffect();

        if (this.lives <= 0) {
            this.isAlive = false;
            this.playDeathAnimation();
        }

        return this.lives;
    }

    /**
     * 播放被击中效果
     */
    playHitEffect() {
        const originalColor = this.bodyMesh.material.color.getHex();

        // 变红
        this.bodyMesh.material.color.setHex(0xff0000);
        this.headMesh.material.color.setHex(0xff0000);

        // 0.2秒后恢复
        setTimeout(() => {
            this.bodyMesh.material.color.setHex(originalColor);
            this.headMesh.material.color.setHex(originalColor);
        }, 200);
    }

    /**
     * 检查与障碍物的碰撞
     */
    checkCollision() {
        if (!this.obstacles || this.obstacles.length === 0) return false;

        const playerRadius = 0.6;  // 玩家的碰撞半径

        for (const obstacle of this.obstacles) {
            const dx = this.position.x - obstacle.position.x;
            const dz = this.position.z - obstacle.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            // 根据障碍物类型设置不同的碰撞半径
            let obstacleRadius = 1.0;  // 默认半径

            // 检查是否是树（有树干子网格）
            if (obstacle.children && obstacle.children.length > 0) {
                // 树的碰撞半径较小（只有树干）
                obstacleRadius = 0.5;
            }

            // 如果距离小于两个半径之和，发生碰撞
            if (distance < playerRadius + obstacleRadius) {
                return true;
            }
        }

        return false;
    }

    /**
     * 播放死亡动画
     */
    playDeathAnimation() {
        // 倒下动画
        const duration = 500;
        const startRotation = this.mesh.rotation.x;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            this.mesh.rotation.x = startRotation + (Math.PI / 2) * progress;
            this.mesh.position.y = -progress * 0.5;

            // 淡出
            this.bodyMesh.material.opacity = 1 - progress * 0.5;
            this.bodyMesh.material.transparent = true;
            this.headMesh.material.opacity = 1 - progress * 0.5;
            this.headMesh.material.transparent = true;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * 销毁敌人
     */
    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);

            // 清理几何体和材质
            this.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }

    /**
     * 检查是否被射线击中
     */
    checkRayHit(ray) {
        if (!this.isAlive) return false;

        // 创建边界球进行碰撞检测
        const boundingSphere = new THREE.Sphere(this.position, 0.8);
        return ray.intersectsSphere(boundingSphere);
    }
}
