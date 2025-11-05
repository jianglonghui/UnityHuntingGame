// AI转向行为系统
import { Vector3Utils } from '../utils/Vector3Utils.js';

export class Steerings {
    /**
     * 追求（Seek）- 全速朝向目标
     * @param {THREE.Vector3} originPosition - 起始位置
     * @param {THREE.Vector3} targetPosition - 目标位置
     * @returns {THREE.Vector3} 转向力
     */
    static Seek(originPosition, targetPosition) {
        const direction = new THREE.Vector3().subVectors(targetPosition, originPosition);
        const distance = direction.length();

        if (distance > 0.1) {
            return direction.normalize();
        }
        return new THREE.Vector3(0, 0, 0);
    }

    /**
     * 逃避（Evade）- 远离目标
     * @param {THREE.Vector3} originPosition - 起始位置
     * @param {THREE.Vector3} targetPosition - 目标位置
     * @param {number} safeDistance - 安全距离
     * @returns {THREE.Vector3} 转向力
     */
    static Evade(originPosition, targetPosition, safeDistance = 10) {
        const direction = new THREE.Vector3().subVectors(originPosition, targetPosition);
        const distance = direction.length();

        if (distance < safeDistance) {
            return direction.normalize();
        }
        return new THREE.Vector3(0, 0, 0);
    }

    /**
     * 分离（Separate）- 与邻居保持距离
     * @param {THREE.Vector3} originPosition - 起始位置
     * @param {Array} neighbors - 邻居数组
     * @param {number} separationRadius - 分离半径
     * @returns {THREE.Vector3} 转向力
     */
    static Separate(originPosition, neighbors, separationRadius = 3) {
        const separationForce = new THREE.Vector3(0, 0, 0);

        for (const neighbor of neighbors) {
            const direction = new THREE.Vector3().subVectors(originPosition, neighbor.position);
            const distance = direction.length();

            if (distance > 0 && distance < separationRadius) {
                // 越近推力越大
                const force = direction.normalize().multiplyScalar(1 / distance);
                separationForce.add(force);
            }
        }

        if (separationForce.length() > 0) {
            return separationForce.normalize();
        }
        return separationForce;
    }

    /**
     * 跟随（Follow）- 跟随目标
     * @param {THREE.Vector3} originPosition - 起始位置
     * @param {THREE.Vector3} targetPosition - 目标位置
     * @param {THREE.Vector3} targetForward - 目标前方向
     * @param {number} followDistance - 跟随距离
     * @returns {THREE.Vector3} 转向力
     */
    static Follow(originPosition, targetPosition, targetForward, followDistance = 5) {
        // 计算目标前方的跟随点
        const followPoint = new THREE.Vector3()
            .copy(targetPosition)
            .add(targetForward.clone().multiplyScalar(-followDistance));

        return this.Seek(originPosition, followPoint);
    }

    /**
     * 徘徊（Wander）- 随机移动
     * @param {THREE.Vector3} forward - 当前前进方向
     * @param {Object} wanderData - 徘徊数据 {angle, changeRate}
     * @returns {THREE.Vector3} 转向力
     */
    static Wander(forward, wanderData) {
        // 更新徘徊角度
        wanderData.angle += (Math.random() - 0.5) * wanderData.changeRate;

        // 创建徘徊圆上的点
        const circleCenter = forward.clone().multiplyScalar(2);
        const displacement = new THREE.Vector3(
            Math.sin(wanderData.angle),
            0,
            Math.cos(wanderData.angle)
        );

        const wanderForce = circleCenter.add(displacement);
        return wanderForce.normalize();
    }

    /**
     * 避障（Avoid）- 避开障碍物
     * @param {THREE.Vector3} originPosition - 起始位置
     * @param {THREE.Vector3} velocity - 当前速度
     * @param {THREE.Vector3} forward - 前进方向
     * @param {THREE.Vector3} right - 右方向
     * @param {Array} obstacles - 障碍物数组
     * @param {number} detectionRadius - 检测半径
     * @returns {THREE.Vector3} 转向力
     */
    static Avoid(originPosition, velocity, forward, right, obstacles, detectionRadius = 5) {
        // 预测前方位置
        const speed = velocity.length();
        const ahead = originPosition.clone()
            .add(forward.clone().multiplyScalar(speed * 0.5 + 1));

        // 找到最威胁的障碍物
        let mostThreatening = null;
        let closestDistance = Infinity;

        for (const obstacle of obstacles) {
            const obstaclePos = obstacle.position;
            const distance = ahead.distanceTo(obstaclePos);

            if (distance < detectionRadius) {
                // 检查障碍物是否在前方（使用点积）
                const toObstacle = new THREE.Vector3().subVectors(obstaclePos, originPosition);
                const dot = forward.dot(toObstacle.normalize());

                if (dot > 0.5 && distance < closestDistance) {
                    closestDistance = distance;
                    mostThreatening = obstacle;
                }
            }
        }

        // 如果找到威胁，计算避让方向
        if (mostThreatening) {
            const toObstacle = new THREE.Vector3()
                .subVectors(mostThreatening.position, originPosition);

            // 创建垂直于障碍物方向的避让力
            const avoidDirection = new THREE.Vector3(
                -toObstacle.z,
                0,
                toObstacle.x
            ).normalize();

            // 确定左右方向
            const sign = Math.sign(right.dot(toObstacle));
            return avoidDirection.multiplyScalar(sign);
        }

        return new THREE.Vector3(0, 0, 0);
    }

    /**
     * 追捕（Pursuit）- 预测目标位置并追求
     * @param {THREE.Vector3} originPosition - 起始位置
     * @param {THREE.Vector3} originVelocity - 起始速度
     * @param {THREE.Vector3} targetPosition - 目标位置
     * @param {THREE.Vector3} targetVelocity - 目标速度
     * @returns {THREE.Vector3} 转向力
     */
    static Pursuit(originPosition, originVelocity, targetPosition, targetVelocity) {
        const toTarget = new THREE.Vector3().subVectors(targetPosition, originPosition);
        const distance = toTarget.length();

        // 预测时间
        const speed = originVelocity.length();
        const lookAheadTime = speed > 0 ? distance / speed : 0;

        // 预测目标位置
        const predictedPosition = targetPosition.clone()
            .add(targetVelocity.clone().multiplyScalar(lookAheadTime));

        return this.Seek(originPosition, predictedPosition);
    }

    /**
     * 到达（Arrive）- 接近目标时减速
     * @param {THREE.Vector3} originPosition - 起始位置
     * @param {THREE.Vector3} targetPosition - 目标位置
     * @param {number} slowingRadius - 减速半径
     * @returns {THREE.Vector3} 转向力
     */
    static Arrive(originPosition, targetPosition, slowingRadius = 5) {
        const direction = new THREE.Vector3().subVectors(targetPosition, originPosition);
        const distance = direction.length();

        if (distance > 0.1) {
            const normalized = direction.normalize();
            if (distance < slowingRadius) {
                // 在减速区域内，根据距离调整速度
                const speed = distance / slowingRadius;
                return normalized.multiplyScalar(speed);
            }
            return normalized;
        }
        return new THREE.Vector3(0, 0, 0);
    }
}
