// 烟雾弹效果类 - 战术烟雾遮挡视线
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
     * 创建战术烟雾粒子（密集、大范围）
     */
    createSmoke() {
        // 创建50-80个烟雾粒子，形成密集烟雾墙
        const particleCount = 50 + Math.floor(Math.random() * 31);

        for (let i = 0; i < particleCount; i++) {
            // 创建更大的球体作为烟雾粒子
            const size = 1.5 + Math.random() * 1.0;  // 1.5-2.5米直径
            const geometry = new THREE.SphereGeometry(size, 8, 8);

            // 浓密的白色/灰色烟雾
            const grayValue = 0.7 + Math.random() * 0.3;  // 0.7-1.0 (浅灰到白色)
            const material = new THREE.MeshBasicMaterial({
                color: new THREE.Color(grayValue, grayValue, grayValue),
                transparent: true,
                opacity: 0.85 + Math.random() * 0.15,  // 高不透明度，遮挡视线
                depthWrite: false,
                fog: false
            });

            const particle = new THREE.Mesh(geometry, material);

            // 随机初始位置（在击中点周围大范围分布）
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 2.5;  // 扩大到2.5米半径
            const height = Math.random() * 2.0;  // 0-2米高度范围

            particle.position.set(
                this.position.x + Math.cos(angle) * radius,
                this.position.y + height,
                this.position.z + Math.sin(angle) * radius
            );

            // 存储初始属性用于动画
            particle.userData = {
                initialOpacity: material.opacity,
                initialScale: 1.0,
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 1.5,  // 横向快速扩散
                    0.3 + Math.random() * 0.5,    // 缓慢上升
                    (Math.random() - 0.5) * 1.5   // 横向快速扩散
                ),
                rotationSpeed: (Math.random() - 0.5) * 1.0
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

            // 根据速度移动粒子（快速扩散）
            particle.position.add(
                particle.userData.velocity.clone().multiplyScalar(deltaTime)
            );

            // 速度逐渐衰减（但保持扩散）
            particle.userData.velocity.multiplyScalar(0.98);

            // 旋转粒子
            particle.rotation.y += particle.userData.rotationSpeed * deltaTime;
            particle.rotation.x += particle.userData.rotationSpeed * 0.5 * deltaTime;

            // 快速膨胀形成大范围烟雾墙
            const scale = 1.0 + lifeProgress * 4.0;  // 最终变为5倍大小
            particle.scale.set(scale, scale, scale);

            // 不透明度变化：前40%时间保持高不透明（战术遮挡），后60%逐渐消散
            let opacity;
            if (lifeProgress < 0.4) {
                // 前2秒：保持浓密，微弱淡化
                opacity = particle.userData.initialOpacity * (1.0 - lifeProgress * 0.3);
            } else {
                // 后3秒：快速消散
                const fadeProgress = (lifeProgress - 0.4) / 0.6;
                opacity = particle.userData.initialOpacity * 0.88 * (1.0 - Math.pow(fadeProgress, 1.5));
            }
            particle.material.opacity = opacity;

            // 颜色保持浓密的灰白色，不变太白
            const colorFade = 0.7 + lifeProgress * 0.3;  // 从0.7变到1.0
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
