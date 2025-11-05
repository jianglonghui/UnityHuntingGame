// 主入口文件
import { Game } from './Game.js';

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    console.log('Starting Hunting Game - Three.js Version');

    // 创建游戏实例
    const game = new Game();

    // 初始化游戏
    game.init();

    // 禁用右键菜单
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    console.log('Game ready!');
});
