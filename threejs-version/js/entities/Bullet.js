// 子弹实体类
export class Bullet {
    constructor(scene, position, direction, speed = 100) {
        this.scene = scene;
        this.position = position.clone();
        this.direction = direction.clone().normalize();
        this.speed = speed;
        this.isActive = true;
        this.lifetime = 5;  // 5秒后自动销毁
        this.age = 0;

        // 创建3D模型
        this.createModel();

        // 添加到场景
        this.scene.add(this.mesh);
    }

    /**
     * 创建3D模型
     */
    createModel() {
        // 创建子弹模型（小球体）
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 1
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(this.position);

        // 添加轨迹光效
        const trailGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const trailMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.5
        });
        this.trail = new THREE.Mesh(trailGeometry, trailMaterial);
        this.mesh.add(this.trail);

        // 添加点光源
        const light = new THREE.PointLight(0xffff00, 0.5, 5);
        this.mesh.add(light);
    }

    /**
     * 更新子弹
     */
    update(deltaTime) {
        if (!this.isActive) return;

        // 更新年龄
        this.age += deltaTime;

        // 检查是否超时
        if (this.age > this.lifetime) {
            this.destroy();
            return;
        }

        // 移动子弹
        const movement = this.direction.clone().multiplyScalar(this.speed * deltaTime);
        this.position.add(movement);
        this.mesh.position.copy(this.position);

        // 轨迹效果动画
        this.trail.scale.set(1 + Math.sin(Date.now() * 0.01) * 0.2, 1 + Math.sin(Date.now() * 0.01) * 0.2, 1);
    }

    /**
     * 检查是否击中敌人
     */
    checkEnemyHit(enemies) {
        if (!this.isActive) return null;

        for (const enemy of enemies) {
            if (enemy.isAlive) {
                const distance = this.position.distanceTo(enemy.position);
                if (distance < 1) {  // 碰撞距离
                    return enemy;
                }
            }
        }
        return null;
    }

    /**
     * 检查是否击中地面或障碍物
     */
    checkGroundHit() {
        // 如果子弹低于地面，则销毁
        if (this.position.y < 0) {
            return true;
        }
        return false;
    }

    /**
     * 销毁子弹
     */
    destroy() {
        this.isActive = false;

        if (this.mesh) {
            this.scene.remove(this.mesh);

            // 清理资源
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            if (this.trail && this.trail.geometry) this.trail.geometry.dispose();
            if (this.trail && this.trail.material) this.trail.material.dispose();
        }
    }
}
