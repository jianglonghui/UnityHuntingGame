// 敌人实体类
import { FiniteStateMachine } from '../ai/FiniteStateMachine.js';
import { Vector3Utils } from '../utils/Vector3Utils.js';

export class Enemy {
    constructor(scene, position, isLeader = false) {
        this.scene = scene;
        this.position = position.clone();
        this.isLeader = isLeader;
        this.isAlive = true;

        // 运动属性
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.maxSpeed = isLeader ? 3.5 : 3.0;  // 领袖更快
        this.maxForce = 0.1;

        // 方向向量
        this.forward = new THREE.Vector3(0, 0, 1);
        this.right = new THREE.Vector3(1, 0, 0);

        // 障碍物列表（从游戏中获取）
        this.obstacles = [];

        // 创建3D模型
        this.createModel();

        // 创建AI状态机
        this.fsm = new FiniteStateMachine(this);

        // 添加到场景
        this.scene.add(this.mesh);
    }

    /**
     * 创建3D模型
     */
    createModel() {
        // 创建身体（胶囊形状）
        const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1.5, 8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: this.isLeader ? 0xff3333 : 0x8b4513,  // 领袖是红色，普通敌人是棕色
            roughness: 0.7,
            metalness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        body.receiveShadow = true;

        // 创建头部
        const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: this.isLeader ? 0xff5555 : 0xa0522d,
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

        // 如果是领袖，添加标记
        if (this.isLeader) {
            const crownGeometry = new THREE.ConeGeometry(0.3, 0.5, 8);
            const crownMaterial = new THREE.MeshStandardMaterial({
                color: 0xffff00,
                emissive: 0xffaa00,
                emissiveIntensity: 0.5
            });
            const crown = new THREE.Mesh(crownGeometry, crownMaterial);
            crown.position.set(0, 2.2, 0);
            this.mesh.add(crown);
        }

        // 存储模型引用
        this.bodyMesh = body;
        this.headMesh = head;
    }

    /**
     * 应用转向力
     */
    applySteeringForce(steeringForce) {
        // 限制转向力
        if (steeringForce.length() > this.maxForce) {
            steeringForce.normalize().multiplyScalar(this.maxForce);
        }

        // 更新速度
        this.velocity.add(steeringForce);

        // 限制速度
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }
    }

    /**
     * 更新敌人
     */
    update(deltaTime, playerPosition, enemies, bullets) {
        if (!this.isAlive) return;

        // 更新AI状态机
        this.fsm.update(deltaTime, playerPosition, enemies, bullets);

        // 应用速度
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        // 更新方向
        if (this.velocity.length() > 0.1) {
            this.forward = this.velocity.clone().normalize();
            this.right = new THREE.Vector3(-this.forward.z, 0, this.forward.x);

            // 旋转模型朝向移动方向
            const angle = Math.atan2(this.forward.x, this.forward.z);
            this.mesh.rotation.y = angle;
        }

        // 更新3D模型位置
        this.mesh.position.copy(this.position);

        // 添加简单的上下摆动动画
        const bobAmount = Math.sin(Date.now() * 0.005) * 0.1;
        this.bodyMesh.position.y = bobAmount;
    }

    /**
     * 设置障碍物列表
     */
    setObstacles(obstacles) {
        this.obstacles = obstacles;
    }

    /**
     * 被击中
     */
    onHit() {
        this.isAlive = false;

        // 死亡动画
        this.playDeathAnimation();

        // 2秒后移除
        setTimeout(() => {
            this.destroy();
        }, 2000);
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
