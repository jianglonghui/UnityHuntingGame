// 敌人生成器
import { Enemy } from './Enemy.js';
import { Vector3Utils } from '../utils/Vector3Utils.js';

export class Spawner {
    constructor(scene, centerPosition, spawnRadius = 50, enemyCount = 100, leaderRatio = 10) {
        this.scene = scene;
        this.centerPosition = centerPosition;
        this.spawnRadius = spawnRadius;
        this.enemyCount = enemyCount;
        this.leaderRatio = leaderRatio;  // 每N个敌人中有1个领袖

        this.enemies = [];
        this.obstacles = [];
    }

    /**
     * 设置障碍物列表
     */
    setObstacles(obstacles) {
        this.obstacles = obstacles;
    }

    /**
     * 生成所有敌人
     */
    spawnAll() {
        console.log(`Spawning ${this.enemyCount} enemies...`);

        for (let i = 0; i < this.enemyCount; i++) {
            // 确定是否为领袖
            const isLeader = (i % this.leaderRatio === 0) && i > 0;

            // 在半径内随机位置生成
            const spawnPosition = this.getRandomSpawnPosition();

            // 创建敌人
            const enemy = new Enemy(this.scene, spawnPosition, isLeader);
            enemy.setObstacles(this.obstacles);

            this.enemies.push(enemy);
        }

        console.log(`Spawned ${this.enemies.length} enemies (${this.getLeaderCount()} leaders)`);
    }

    /**
     * 获取随机生成位置
     */
    getRandomSpawnPosition() {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.sqrt(Math.random()) * this.spawnRadius;

        return new THREE.Vector3(
            this.centerPosition.x + radius * Math.cos(angle),
            0,  // 地面高度
            this.centerPosition.z + radius * Math.sin(angle)
        );
    }

    /**
     * 在指定位置生成单个敌人
     */
    spawnAt(position, isLeader = false) {
        const enemy = new Enemy(this.scene, position, isLeader);
        enemy.setObstacles(this.obstacles);
        this.enemies.push(enemy);
        return enemy;
    }

    /**
     * 更新所有敌人
     */
    update(deltaTime, playerPosition, bullets) {
        // 更新所有存活的敌人
        for (const enemy of this.enemies) {
            if (enemy.isAlive) {
                enemy.update(deltaTime, playerPosition, this.enemies, bullets);
            }
        }

        // 清理死亡敌人
        this.enemies = this.enemies.filter(enemy => {
            if (!enemy.isAlive && enemy.mesh.parent === null) {
                return false;  // 已经从场景中移除
            }
            return true;
        });
    }

    /**
     * 获取所有存活的敌人
     */
    getAliveEnemies() {
        return this.enemies.filter(enemy => enemy.isAlive);
    }

    /**
     * 获取领袖数量
     */
    getLeaderCount() {
        return this.enemies.filter(enemy => enemy.isLeader).length;
    }

    /**
     * 获取存活的敌人数量
     */
    getAliveCount() {
        return this.getAliveEnemies().length;
    }

    /**
     * 清除所有敌人
     */
    clearAll() {
        for (const enemy of this.enemies) {
            enemy.destroy();
        }
        this.enemies = [];
    }

    /**
     * 检查射击是否击中敌人
     */
    checkShootHit(ray) {
        for (const enemy of this.enemies) {
            if (enemy.isAlive && enemy.checkRayHit(ray)) {
                return enemy;
            }
        }
        return null;
    }
}
