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
     * 支持子路径部署（如 /game/）
     */
    autoDetect() {
        // 1. 优先使用URL参数中的配置（方便部署时指定）
        const urlParams = new URLSearchParams(window.location.search);
        const serverUrl = urlParams.get('serverUrl');

        if (serverUrl) {
            try {
                const url = new URL(serverUrl);
                this.SERVER_HOST = url.hostname;
                this.SERVER_PORT = parseInt(url.port || (url.protocol === 'https:' ? '443' : '80'), 10);
                console.log(`[ClientConfig] Using URL parameter server: ${this.SERVER_URL}`);
                return this.SERVER_URL;
            } catch (e) {
                console.warn('[ClientConfig] Invalid serverUrl parameter:', serverUrl);
            }
        }

        // 2. 尝试从localStorage读取配置（用户手动设置）
        const savedHost = localStorage.getItem('socketio_server_host');
        const savedPort = localStorage.getItem('socketio_server_port');

        if (savedHost && savedPort) {
            this.SERVER_HOST = savedHost;
            this.SERVER_PORT = parseInt(savedPort, 10);
            console.log(`[ClientConfig] Using saved server config: ${this.SERVER_URL}`);
            return this.SERVER_URL;
        }

        // 3. 自动检测当前页面的地址、端口和路径
        const currentHost = window.location.hostname;
        const currentPort = window.location.port;
        const currentPath = window.location.pathname;

        // 始终使用当前页面的地址
        this.SERVER_HOST = currentHost || 'localhost';

        // 如果当前URL有端口，使用它；否则根据协议推断
        if (currentPort) {
            this.SERVER_PORT = parseInt(currentPort, 10);
        } else {
            // 没有显式端口，根据协议推断（http=80, https=443）
            this.SERVER_PORT = window.location.protocol === 'https:' ? 443 : 80;
        }

        // 提取基础路径（子路径部署支持）
        // 例如: /game/index.html -> /game
        //      /game/ -> /game
        //      / -> /
        let basePath = '';
        if (currentPath && currentPath !== '/') {
            // 移除文件名，只保留目录路径
            const pathParts = currentPath.split('/').filter(p => p);
            if (pathParts.length > 0) {
                // 如果最后一部分包含 .html，移除它
                if (pathParts[pathParts.length - 1].includes('.')) {
                    pathParts.pop();
                }
                if (pathParts.length > 0) {
                    basePath = '/' + pathParts.join('/');
                }
            }
        }

        // 构建完整的服务器URL（包含子路径）
        const protocol = window.location.protocol;
        const portStr = (this.SERVER_PORT === 80 && protocol === 'http:') ||
                        (this.SERVER_PORT === 443 && protocol === 'https:')
                        ? '' : `:${this.SERVER_PORT}`;

        const fullUrl = `${protocol}//${this.SERVER_HOST}${portStr}${basePath}`;

        console.log(`[ClientConfig] Auto-detected server: ${fullUrl}`);
        return fullUrl;
    },

    /**
     * 保存服务器配置到localStorage
     */
    saveServerConfig(host, port) {
        this.SERVER_HOST = host;
        this.SERVER_PORT = parseInt(port, 10);
        localStorage.setItem('socketio_server_host', host);
        localStorage.setItem('socketio_server_port', port.toString());
        console.log(`[ClientConfig] Saved server config: ${this.SERVER_URL}`);
    },

    /**
     * 清除保存的服务器配置
     */
    clearServerConfig() {
        localStorage.removeItem('socketio_server_host');
        localStorage.removeItem('socketio_server_port');
        console.log('[ClientConfig] Cleared saved server config');
    }
};
