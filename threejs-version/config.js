// 游戏配置文件
// 可以通过修改这个文件来自定义服务器设置

const config = {
    // 服务器端口（可以通过环境变量 PORT 覆盖）
    SERVER_PORT: process.env.PORT || 3000,

    // 服务器地址（在生产环境中需要修改为实际的服务器地址）
    // 本地开发使用 localhost，部署后改为服务器的实际地址
    SERVER_HOST: process.env.SERVER_HOST || 'localhost',

    // 完整的服务器URL
    get SERVER_URL() {
        return `http://${this.SERVER_HOST}:${this.SERVER_PORT}`;
    },

    // 房间配置
    ROOM: {
        MAX_PLAYERS: 4,           // 最多4个玩家：1个狙击手 + 3个敌人
        MIN_PLAYERS: 2,           // 最少2个玩家：1个狙击手 + 1个敌人
        GAME_DURATION: 60,        // 游戏时长（秒）
    },

    // 网络配置
    NETWORK: {
        UPDATE_RATE: 60,          // 位置更新频率（次/秒）
        RECONNECT_ATTEMPTS: 5,    // 重连尝试次数
        RECONNECT_DELAY: 1000,    // 重连延迟（毫秒）
    }
};

// Node.js 环境（服务器端）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = config;
}

// 浏览器环境（客户端）
if (typeof window !== 'undefined') {
    window.GameConfig = config;
}
