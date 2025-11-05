// 主入口文件
import { Game } from './Game.js';
import { NetworkManager } from './network/NetworkManager.js';
import { MultiplayerUIManager } from './ui/MultiplayerUIManager.js';

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {
    console.log('Starting Hunting Game - Three.js Version');

    // 创建游戏实例
    const game = new Game();

    // 创建网络管理器
    const networkManager = new NetworkManager();

    // 创建联机UI管理器
    const multiplayerUIManager = new MultiplayerUIManager(networkManager);

    // 初始化游戏
    game.init();

    // 设置联机UI回调
    multiplayerUIManager.onSinglePlayer = () => {
        console.log('Starting single player mode');
        game.startGame(false); // false = 单人模式
    };

    multiplayerUIManager.onMultiplayerGameStart = (data) => {
        console.log('Starting multiplayer mode');
        game.startGame(true, networkManager, multiplayerUIManager); // true = 联机模式
        multiplayerUIManager.showGameUI();
    };

    // 禁用右键菜单
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    console.log('Game ready!');
});
