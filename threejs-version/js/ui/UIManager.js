// UI管理器
export class UIManager {
    constructor() {
        // 菜单元素
        this.mainMenu = document.getElementById('mainMenu');
        this.instructionsMenu = document.getElementById('instructionsMenu');
        this.pauseMenu = document.getElementById('pauseMenu');
        this.gameOverMenu = document.getElementById('gameOverMenu');

        // HUD元素
        this.gameUI = document.getElementById('gameUI');
        this.scoreText = document.getElementById('score');
        this.timeText = document.getElementById('time');
        this.zoomText = document.getElementById('zoom');
        this.scopeOverlay = document.getElementById('scope');
        this.healthText = document.getElementById('health');
        this.healthContainer = document.getElementById('healthContainer');

        // 右上角信息面板元素
        this.versionText = document.getElementById('version');
        this.pingText = document.getElementById('ping');
        this.pingContainer = document.getElementById('pingContainer');

        // 冻结倒计时元素
        this.freezeCountdown = document.getElementById('freezeCountdown');
        this.freezeCountdownNumber = this.freezeCountdown ? this.freezeCountdown.querySelector('.countdown-number') : null;

        // 游戏结束元素
        this.finalScoreText = document.getElementById('finalScore');
        this.finalHighScoreText = document.getElementById('finalHighScore');
        this.highScoreDisplay = document.getElementById('highScoreDisplay');
        this.newHighScoreText = document.getElementById('newHighScore');

        // 主菜单元素
        this.highScoreText = document.getElementById('highScore');

        // 按钮回调
        this.onPlayButton = null;
        this.onResumeButton = null;
        this.onMainMenuButton = null;
        this.onQuitButton = null;

        this.setupButtons();
    }

    /**
     * 设置按钮事件
     */
    setupButtons() {
        // 主菜单按钮（检查是否存在，因为联机模式下按钮结构不同）
        const playButton = document.getElementById('playButton');
        if (playButton) {
            playButton.addEventListener('click', () => {
                if (this.onPlayButton) this.onPlayButton();
            });
        }

        const instructionsButton = document.getElementById('instructionsButton');
        if (instructionsButton) {
            instructionsButton.addEventListener('click', () => {
                this.showInstructions();
            });
        }

        const backButton = document.getElementById('backButton');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.showMainMenu();
            });
        }

        const quitButton = document.getElementById('quitButton');
        if (quitButton) {
            quitButton.addEventListener('click', () => {
                window.close();
            });
        }

        // 暂停菜单按钮
        const resumeButton = document.getElementById('resumeButton');
        if (resumeButton) {
            resumeButton.addEventListener('click', () => {
                if (this.onResumeButton) this.onResumeButton();
            });
        }

        const mainMenuButton = document.getElementById('mainMenuButton');
        if (mainMenuButton) {
            mainMenuButton.addEventListener('click', () => {
                if (this.onMainMenuButton) this.onMainMenuButton();
            });
        }

        // 游戏结束按钮
        const playAgainButton = document.getElementById('playAgainButton');
        if (playAgainButton) {
            playAgainButton.addEventListener('click', () => {
                if (this.onPlayButton) this.onPlayButton();
            });
        }

        const menuButton = document.getElementById('menuButton');
        if (menuButton) {
            menuButton.addEventListener('click', () => {
                if (this.onMainMenuButton) this.onMainMenuButton();
            });
        }
    }

    /**
     * 显示主菜单
     */
    showMainMenu() {
        this.hideAll();
        this.mainMenu.classList.remove('hidden');
        this.mainMenu.classList.add('active');
    }

    /**
     * 显示游戏说明
     */
    showInstructions() {
        this.hideAll();
        this.instructionsMenu.classList.remove('hidden');
        this.instructionsMenu.classList.add('active');
    }

    /**
     * 显示游戏UI
     */
    showGameUI() {
        this.hideAll();
        this.gameUI.classList.remove('hidden');
    }

    /**
     * 显示暂停菜单
     */
    showPauseMenu() {
        this.pauseMenu.classList.remove('hidden');
        this.pauseMenu.classList.add('active');
    }

    /**
     * 隐藏暂停菜单
     */
    hidePauseMenu() {
        this.pauseMenu.classList.add('hidden');
        this.pauseMenu.classList.remove('active');
    }

    /**
     * 显示游戏结束菜单
     */
    showGameOverMenu(score, highScore, isNewHighScore) {
        console.log('Showing game over menu:', { score, highScore, isNewHighScore });

        this.hideAll();
        this.finalScoreText.textContent = score;
        this.finalHighScoreText.textContent = highScore;

        // 联机模式下隐藏最高分（highScore === 0）
        if (highScore === 0) {
            this.highScoreDisplay.style.display = 'none';
            this.newHighScoreText.classList.add('hidden');
        } else {
            this.highScoreDisplay.style.display = 'block';
            if (isNewHighScore) {
                this.newHighScoreText.classList.remove('hidden');
            } else {
                this.newHighScoreText.classList.add('hidden');
            }
        }

        // 确保游戏结束菜单显示
        this.gameOverMenu.classList.remove('hidden');
        this.gameOverMenu.classList.add('active');

        console.log('Game over menu element:', this.gameOverMenu);
        console.log('Game over menu classes:', this.gameOverMenu.className);
    }

    /**
     * 隐藏所有菜单
     */
    hideAll() {
        // 隐藏所有菜单并移除active类
        this.mainMenu.classList.add('hidden');
        this.mainMenu.classList.remove('active');

        this.instructionsMenu.classList.add('hidden');
        this.instructionsMenu.classList.remove('active');

        this.pauseMenu.classList.add('hidden');
        this.pauseMenu.classList.remove('active');

        this.gameOverMenu.classList.add('hidden');
        this.gameOverMenu.classList.remove('active');

        this.gameUI.classList.add('hidden');
    }

    /**
     * 更新分数显示
     */
    updateScore(score) {
        this.scoreText.textContent = score;
    }

    /**
     * 更新时间显示
     */
    updateTime(time) {
        this.timeText.textContent = time;
    }

    /**
     * 更新缩放显示
     */
    updateZoom(zoom) {
        this.zoomText.textContent = zoom.toFixed(1) + 'x';
    }

    /**
     * 更新生命值显示
     */
    updateHealth(health, maxHealth = 3) {
        if (this.healthText) {
            this.healthText.textContent = health;

            // 根据生命值改变颜色
            if (health <= 1) {
                this.healthText.style.color = '#ff0000';  // 红色
            } else if (health <= 2) {
                this.healthText.style.color = '#ffaa00';  // 橙色
            } else {
                this.healthText.style.color = '#00ff00';  // 绿色
            }
        }
    }

    /**
     * 显示生命值容器（敌人模式）
     */
    showHealth() {
        if (this.healthContainer) {
            this.healthContainer.style.display = 'block';
        }
    }

    /**
     * 隐藏生命值容器（狙击手模式）
     */
    hideHealth() {
        if (this.healthContainer) {
            this.healthContainer.style.display = 'none';
        }
    }

    /**
     * 更新最高分显示
     */
    updateHighScore(highScore) {
        this.highScoreText.textContent = highScore;
    }

    /**
     * 显示瞄准镜
     */
    showScope() {
        this.scopeOverlay.classList.remove('hidden');
    }

    /**
     * 隐藏瞄准镜
     */
    hideScope() {
        this.scopeOverlay.classList.add('hidden');
    }

    /**
     * 切换瞄准镜显示
     */
    toggleScope(show) {
        if (show) {
            this.showScope();
        } else {
            this.hideScope();
        }
    }

    /**
     * 更新延迟显示
     */
    updatePing(ping) {
        if (this.pingText) {
            this.pingText.textContent = ping;

            // 根据延迟改变颜色
            if (ping < 50) {
                this.pingText.style.color = '#00ff00';  // 绿色 - 良好
            } else if (ping < 100) {
                this.pingText.style.color = '#ffaa00';  // 橙色 - 一般
            } else {
                this.pingText.style.color = '#ff0000';  // 红色 - 较差
            }
        }
    }

    /**
     * 显示延迟容器（联机模式）
     */
    showPing() {
        if (this.pingContainer) {
            this.pingContainer.style.display = 'block';
        }
    }

    /**
     * 隐藏延迟容器（单人模式）
     */
    hidePing() {
        if (this.pingContainer) {
            this.pingContainer.style.display = 'none';
        }
    }

    /**
     * 更新冻结倒计时
     */
    updateFreezeCountdown(seconds) {
        if (this.freezeCountdown && this.freezeCountdownNumber) {
            this.freezeCountdown.classList.remove('hidden');
            this.freezeCountdownNumber.textContent = seconds;
        }
    }

    /**
     * 隐藏冻结倒计时
     */
    hideFreezeCountdown() {
        if (this.freezeCountdown) {
            this.freezeCountdown.classList.add('hidden');
        }
    }
}
