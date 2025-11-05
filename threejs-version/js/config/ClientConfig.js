// 客户端配置
// 在这里修改客户端连接的服务器地址和端口

export const ClientConfig = {
    // 服务器配置
    // 开发环境：使用 localhost
    // 生产环境：修改为服务器的实际地址
    SERVER_HOST: 'localhost',
    SERVER_PORT: 3000,

    // 自动生成服务器URL
    get SERVER_URL() {
        return `http://${this.SERVER_HOST}:${this.SERVER_PORT}`;
    },

    // 网络配置
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000,

    /**
     * 从当前页面URL自动检测服务器地址
     * 适用于部署到服务器后自动使用服务器地址
     */
    autoDetect() {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            this.SERVER_HOST = window.location.hostname;
            this.SERVER_PORT = window.location.port || (window.location.protocol === 'https:' ? 443 : 80);
        }
        return this.SERVER_URL;
    }
};
