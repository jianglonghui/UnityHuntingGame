/**
 * 种子随机数生成器
 * 使用相同的种子可以生成相同的随机序列
 */
export class SeededRandom {
    constructor(seed) {
        this.seed = seed;
        this.current = seed;
    }

    /**
     * 生成 [0, 1) 范围内的随机数
     */
    random() {
        // 使用简单的线性同余生成器 (LCG)
        this.current = (this.current * 9301 + 49297) % 233280;
        return this.current / 233280;
    }

    /**
     * 重置种子
     */
    setSeed(seed) {
        this.seed = seed;
        this.current = seed;
    }
}
