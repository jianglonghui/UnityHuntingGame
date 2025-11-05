// Vector3 工具类
export class Vector3Utils {
    /**
     * 计算两个向量之间的距离
     */
    static distance(v1, v2) {
        return v1.distanceTo(v2);
    }

    /**
     * 获取从v1指向v2的方向向量（已归一化）
     */
    static direction(from, to) {
        return new THREE.Vector3().subVectors(to, from).normalize();
    }

    /**
     * 限制向量的长度
     */
    static clampMagnitude(vector, maxLength) {
        if (vector.length() > maxLength) {
            return vector.normalize().multiplyScalar(maxLength);
        }
        return vector.clone();
    }

    /**
     * 获取随机方向向量
     */
    static randomDirection() {
        return new THREE.Vector3(
            Math.random() * 2 - 1,
            0,
            Math.random() * 2 - 1
        ).normalize();
    }

    /**
     * 在指定半径内获取随机位置
     */
    static randomPointInCircle(center, radius) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        return new THREE.Vector3(
            center.x + r * Math.cos(angle),
            center.y,
            center.z + r * Math.sin(angle)
        );
    }

    /**
     * 计算点积
     */
    static dot(v1, v2) {
        return v1.dot(v2);
    }

    /**
     * 插值
     */
    static lerp(v1, v2, t) {
        return new THREE.Vector3().lerpVectors(v1, v2, t);
    }

    /**
     * 将向量投影到XZ平面
     */
    static flattenY(vector) {
        return new THREE.Vector3(vector.x, 0, vector.z);
    }
}
