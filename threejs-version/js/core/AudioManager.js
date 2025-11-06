/**
 * 音效管理器
 * 使用 Howler.js 管理游戏音效和音乐
 * 注意：Howler.js 通过 script 标签在 index.html 中加载，Howl 和 Howler 是全局变量
 */
export class AudioManager {
    constructor() {
        // 音效对象
        this.sounds = {};

        // 音乐对象
        this.music = null;

        // 音量设置
        this.masterVolume = 1.0;
        this.sfxVolume = 0.7;
        this.musicVolume = 0.3;

        // 是否静音
        this.muted = false;

        // 音效路径配置（使用相对路径，兼容服务器部署）
        this.soundPaths = {
            shoot: './assets/sounds/shoot.mp3',
            hit: './assets/sounds/hit.mp3',
            death: './assets/sounds/death.mp3',
            ui_click: './assets/sounds/ui_click.mp3',
            game_start: './assets/sounds/game_start.mp3',
            game_over: './assets/sounds/game_over.mp3',
            reload: './assets/sounds/reload.mp3',
            footstep: './assets/sounds/footstep.mp3'
        };

        // 音乐路径配置（使用相对路径，兼容服务器部署）
        this.musicPath = './assets/music/background.mp3';

        console.log('AudioManager initialized');
    }

    /**
     * 预加载所有音效
     */
    preloadSounds() {
        console.log('Preloading sounds...');

        // 预加载所有音效
        for (const [name, path] of Object.entries(this.soundPaths)) {
            this.loadSound(name, path);
        }

        console.log('All sounds preloaded');
    }

    /**
     * 加载单个音效
     */
    loadSound(name, path, config = {}) {
        // 检查Howl是否可用
        if (typeof Howl === 'undefined') {
            console.warn('Howl is not loaded yet, skipping sound loading');
            this.sounds[name] = { play: () => {}, stop: () => {}, volume: () => {} };
            return;
        }

        try {
            this.sounds[name] = new Howl({
                src: [path],
                volume: this.sfxVolume * this.masterVolume,
                preload: true,
                html5: false, // 使用 Web Audio API 以获得更好的性能
                ...config,
                onloaderror: (id, error) => {
                    console.warn(`Failed to load sound: ${name} at ${path}`, error);
                    // 创建一个空音效作为占位符，避免后续调用报错
                    this.sounds[name] = { play: () => {}, stop: () => {}, volume: () => {} };
                },
                onload: () => {
                    console.log(`Sound loaded: ${name}`);
                }
            });
        } catch (error) {
            console.warn(`Error loading sound: ${name}`, error);
            // 创建占位符
            this.sounds[name] = { play: () => {}, stop: () => {}, volume: () => {} };
        }
    }

    /**
     * 加载背景音乐
     */
    loadMusic(path = null) {
        const musicPath = path || this.musicPath;

        try {
            this.music = new Howl({
                src: [musicPath],
                volume: this.musicVolume * this.masterVolume,
                loop: true,
                html5: true, // 音乐使用 HTML5 Audio 以节省内存
                preload: true,
                onloaderror: (id, error) => {
                    console.warn(`Failed to load music at ${musicPath}`, error);
                    this.music = null;
                },
                onload: () => {
                    console.log('Background music loaded');
                }
            });
        } catch (error) {
            console.warn('Error loading music:', error);
            this.music = null;
        }
    }

    /**
     * 播放音效
     */
    playSound(name, config = {}) {
        if (!this.sounds[name]) {
            console.warn(`Sound not found: ${name}`);
            return null;
        }

        if (this.muted) return null;

        try {
            const soundId = this.sounds[name].play();

            // 应用配置
            if (config.volume !== undefined) {
                this.sounds[name].volume(config.volume * this.sfxVolume * this.masterVolume, soundId);
            }
            if (config.rate !== undefined) {
                this.sounds[name].rate(config.rate, soundId);
            }

            return soundId;
        } catch (error) {
            console.warn(`Error playing sound: ${name}`, error);
            return null;
        }
    }

    /**
     * 播放射击音效
     */
    playShoot() {
        return this.playSound('shoot', { volume: 0.5 });
    }

    /**
     * 播放击中音效
     */
    playHit() {
        return this.playSound('hit', { volume: 0.6 });
    }

    /**
     * 播放死亡音效
     */
    playDeath() {
        return this.playSound('death', { volume: 0.7 });
    }

    /**
     * 播放UI点击音效
     */
    playUIClick() {
        return this.playSound('ui_click', { volume: 0.4 });
    }

    /**
     * 播放游戏开始音效
     */
    playGameStart() {
        return this.playSound('game_start', { volume: 0.8 });
    }

    /**
     * 播放游戏结束音效
     */
    playGameOver() {
        return this.playSound('game_over', { volume: 0.8 });
    }

    /**
     * 播放换弹音效
     */
    playReload() {
        return this.playSound('reload', { volume: 0.5 });
    }

    /**
     * 播放脚步音效
     */
    playFootstep() {
        return this.playSound('footstep', { volume: 0.3 });
    }

    /**
     * 播放背景音乐
     */
    playMusic() {
        if (!this.music || this.muted) return;

        try {
            this.music.play();
            console.log('Background music playing');
        } catch (error) {
            console.warn('Error playing music:', error);
        }
    }

    /**
     * 停止背景音乐
     */
    stopMusic() {
        if (!this.music) return;

        try {
            this.music.stop();
        } catch (error) {
            console.warn('Error stopping music:', error);
        }
    }

    /**
     * 暂停背景音乐
     */
    pauseMusic() {
        if (!this.music) return;

        try {
            this.music.pause();
        } catch (error) {
            console.warn('Error pausing music:', error);
        }
    }

    /**
     * 恢复背景音乐
     */
    resumeMusic() {
        if (!this.music || this.muted) return;

        try {
            this.music.play();
        } catch (error) {
            console.warn('Error resuming music:', error);
        }
    }

    /**
     * 停止所有音效
     */
    stopAllSounds() {
        for (const sound of Object.values(this.sounds)) {
            try {
                sound.stop();
            } catch (error) {
                // 忽略错误
            }
        }
    }

    /**
     * 设置主音量
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        Howler.volume(this.masterVolume);
        console.log(`Master volume set to ${this.masterVolume}`);
    }

    /**
     * 设置音效音量
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));

        // 更新所有音效的音量
        for (const sound of Object.values(this.sounds)) {
            try {
                sound.volume(this.sfxVolume * this.masterVolume);
            } catch (error) {
                // 忽略错误
            }
        }

        console.log(`SFX volume set to ${this.sfxVolume}`);
    }

    /**
     * 设置音乐音量
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));

        if (this.music) {
            try {
                this.music.volume(this.musicVolume * this.masterVolume);
            } catch (error) {
                console.warn('Error setting music volume:', error);
            }
        }

        console.log(`Music volume set to ${this.musicVolume}`);
    }

    /**
     * 切换静音
     */
    toggleMute() {
        this.muted = !this.muted;
        Howler.mute(this.muted);

        console.log(`Audio ${this.muted ? 'muted' : 'unmuted'}`);
        return this.muted;
    }

    /**
     * 设置静音
     */
    setMuted(muted) {
        this.muted = muted;
        Howler.mute(this.muted);
    }

    /**
     * 清理所有音频资源
     */
    dispose() {
        console.log('Disposing AudioManager...');

        // 停止并卸载所有音效
        for (const sound of Object.values(this.sounds)) {
            try {
                sound.unload();
            } catch (error) {
                // 忽略错误
            }
        }

        // 停止并卸载音乐
        if (this.music) {
            try {
                this.music.unload();
            } catch (error) {
                // 忽略错误
            }
        }

        this.sounds = {};
        this.music = null;

        console.log('AudioManager disposed');
    }
}
