// 分数管理器
export class ScoreManager {
    constructor() {
        this.score = 0;
        this.highScore = this.loadHighScore();
    }

    /**
     * 增加分数
     */
    addScore(points = 1) {
        this.score += points;
        return this.score;
    }

    /**
     * 重置分数
     */
    resetScore() {
        this.score = 0;
    }

    /**
     * 获取当前分数
     */
    getScore() {
        return this.score;
    }

    /**
     * 获取最高分
     */
    getHighScore() {
        return this.highScore;
    }

    /**
     * 保存最高分
     */
    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('huntingGameHighScore', this.highScore.toString());
            return true;  // 新纪录
        }
        return false;
    }

    /**
     * 加载最高分
     */
    loadHighScore() {
        const saved = localStorage.getItem('huntingGameHighScore');
        return saved ? parseInt(saved) : 0;
    }
}
