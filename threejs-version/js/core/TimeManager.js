// 时间管理器
export class TimeManager {
    constructor(initialTime = 60) {
        this.totalTime = initialTime;
        this.remainingTime = initialTime;
        this.isRunning = false;
        this.onTimeUp = null;  // 时间结束回调
    }

    /**
     * 开始计时
     */
    start() {
        this.isRunning = true;
    }

    /**
     * 暂停计时
     */
    pause() {
        this.isRunning = false;
    }

    /**
     * 恢复计时
     */
    resume() {
        this.isRunning = true;
    }

    /**
     * 重置计时
     */
    reset() {
        this.remainingTime = this.totalTime;
        this.isRunning = false;
    }

    /**
     * 更新时间
     */
    update(deltaTime) {
        if (!this.isRunning) return;

        this.remainingTime -= deltaTime;

        if (this.remainingTime <= 0) {
            this.remainingTime = 0;
            this.isRunning = false;

            // 触发时间结束回调
            if (this.onTimeUp) {
                this.onTimeUp();
            }
        }
    }

    /**
     * 获取剩余时间
     */
    getRemainingTime() {
        return this.remainingTime;
    }

    /**
     * 获取格式化的时间字符串
     */
    getFormattedTime() {
        const seconds = Math.ceil(this.remainingTime);
        return seconds.toString();
    }

    /**
     * 检查时间是否用完
     */
    isTimeUp() {
        return this.remainingTime <= 0;
    }
}
