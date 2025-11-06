// 烟雾效果类
export class SmokeEffect {
    constructor(scene, position) {
        this.scene = scene;
        this.position = position.clone();
        this.smokeParticles = [];
        this.lifetime = 5.0;  // 5秒生命周期
        this.age = 0;
        this.isActive = true;

        this.createSmoke();
    }

    /**
     * 创建烟雾粒子
     */
    createSmoke() {
        // 创建10-15个烟雾粒子
        const particleCount = 10 + Math.floor(Math.random() * 6);

        for (let i = 0; i < particleCount; i++) {
            // 创建球体几何体作为烟雾粒子
            const size = 0.3 + Math.random() * 0.4;
            const geometry = new THREE.SphereGeometry(size, 8, 8);

            // 半透明灰色材质
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(0.5 + Math.random() * 0.2, 0.5 + Math.random() * 0.2, 0.5 + Math.random() * 0.2),
                transparent: true,
                opacity: 0.6 + Math.random() * 0.2,
                depthWrite: false,  // 避免透明度问题
                fog: false
            });

            const particle = new THREE.Mesh(geometry, material);

            // 随机初始位置（在击中点周围小范围内）
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.5;
            particle.position.set(
                this.position.x + Math.cos(angle) * radius,
                this.position.y + 0.2 + Math.random() * 0.3,
                this.position.z + Math.sin(angle) * radius
            );

            // 存储初始属性用于动画
            particle.userData = {
                initialOpacity: material.opacity,
                initialScale: 1.0,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,  // x方向随机速度
                    0.5 + Math.random() * 0.8,    // y方向向上
                    (Math.random() - 0.5) * 0.5   // z方向随机速度
                ),
                rotationSpeed: (Math.random() - 0.5) * 2.0  // 随机旋转速度
            };

            this.scene.add(particle);
            this.smokeParticles.push(particle);
        }
    }

    /**
     * 更新烟雾效果
     */
    update(deltaTime) {
        if (!this.isActive) return;

        this.age += deltaTime;

        // 计算生命周期进度 (0-1)
        const lifeProgress = Math.min(this.age / this.lifetime, 1.0);

        // 更新每个烟雾粒子
        for (const particle of this.smokeParticles) {
            if (!particle.userData) continue;

            // 根据速度移动粒子
            particle.position.add(
                particle.userData.velocity.clone().multiplyScalar(deltaTime)
            );

            // 速度逐渐衰减（模拟阻力）
            particle.userData.velocity.multiplyScalar(0.95);

            // 旋转粒子
            particle.rotation.y += particle.userData.rotationSpeed * deltaTime;
            particle.rotation.x += particle.userData.rotationSpeed * 0.5 * deltaTime;

            // 逐渐变大（膨胀效果）
            const scale = 1.0 + lifeProgress * 2.5;  // 最终变为3.5倍大小
            particle.scale.set(scale, scale, scale);

            // 逐渐变透明（消散效果）
            // 使用缓动函数使消散更自然
            const fadeOutCurve = 1.0 - Math.pow(lifeProgress, 2);
            particle.material.opacity = particle.userData.initialOpacity * fadeOutCurve;

            // 颜色逐渐变淡（变白）
            const colorFade = 0.5 + lifeProgress * 0.5;  // 从0.5变到1.0
            particle.material.color.setRGB(colorFade, colorFade, colorFade);
        }

        // 生命周期结束，标记为不活跃
        if (lifeProgress >= 1.0) {
            this.isActive = false;
        }
    }

    /**
     * 销毁烟雾效果
     */
    destroy() {
        for (const particle of this.smokeParticles) {
            this.scene.remove(particle);
            if (particle.geometry) particle.geometry.dispose();
            if (particle.material) particle.material.dispose();
        }
        this.smokeParticles = [];
    }

    /**
     * 检查是否还活跃
     */
    isAlive() {
        return this.isActive;
    }
}
