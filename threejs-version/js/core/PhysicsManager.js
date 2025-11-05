// 物理管理器（简化版）
export class PhysicsManager {
    constructor() {
        this.gravity = -9.8;
        this.objects = [];
    }

    /**
     * 添加物理对象
     */
    addObject(object) {
        this.objects.push(object);
    }

    /**
     * 移除物理对象
     */
    removeObject(object) {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
    }

    /**
     * 更新物理
     */
    update(deltaTime) {
        for (const object of this.objects) {
            if (object.useGravity) {
                object.velocity.y += this.gravity * deltaTime;
            }
        }
    }

    /**
     * 射线检测
     */
    raycast(ray, objects) {
        const intersections = [];

        for (const object of objects) {
            if (object.mesh) {
                const intersects = ray.intersectObject(object.mesh, true);
                if (intersects.length > 0) {
                    intersections.push({
                        object: object,
                        point: intersects[0].point,
                        distance: intersects[0].distance
                    });
                }
            }
        }

        // 按距离排序
        intersections.sort((a, b) => a.distance - b.distance);
        return intersections;
    }

    /**
     * 球体碰撞检测
     */
    sphereCollision(position1, radius1, position2, radius2) {
        const distance = position1.distanceTo(position2);
        return distance < (radius1 + radius2);
    }

    /**
     * 清除所有物理对象
     */
    clear() {
        this.objects = [];
    }
}
