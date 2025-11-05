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
     * 也适用于本地开发时自动检测端口
     */
    autoDetect() {
        // 获取当前页面的地址和端口
        const currentHost = window.location.hostname;
        const currentPort = window.location.port;

        // 始终使用当前页面的地址
        this.SERVER_HOST = currentHost || 'localhost';

        // 如果当前URL有端口，使用它；否则根据协议推断
        if (currentPort) {
            this.SERVER_PORT = parseInt(currentPort, 10);
        } else {
            // 没有显式端口，根据协议推断（http=80, https=443）
            this.SERVER_PORT = window.location.protocol === 'https:' ? 443 : 80;
        }

        console.log(`[ClientConfig] Auto-detected server: ${this.SERVER_URL}`);
        return this.SERVER_URL;
    }
};
