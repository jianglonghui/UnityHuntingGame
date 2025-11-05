// 网络管理器
import { ClientConfig } from '../config/ClientConfig.js';

export class NetworkManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.roomId = null;
        this.playerId = null;
        this.playerRole = null; // 'sniper' or 'enemy'
        this.currentPlayers = [];  // 当前房间的玩家列表

        // 使用配置文件中的服务器地址，支持自动检测
        this.serverUrl = ClientConfig.autoDetect();

        // 回调函数
        this.onRoomCreated = null;
        this.onRoomJoined = null;
        this.onRoomList = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onGameStarted = null;
        this.onPlayerMoved = null;
        this.onPlayerShot = null;
        this.onEnemyHit = null;
        this.onGameOver = null;
        this.onRoomClosed = null;
        this.onError = null;
    }

    /**
     * 连接到服务器
     */
    connect() {
        return new Promise((resolve, reject) => {
            // 检查socket.io是否已加载（应该在index.html中已经加载）
            if (typeof io === 'undefined') {
                reject(new Error('Socket.io not loaded. Please ensure socket.io is loaded via <script> tag in index.html'));
                return;
            }

            this.initializeSocket();
            resolve();
        });
    }

    /**
     * 初始化Socket连接
     */
    initializeSocket() {
        console.log('[NetworkManager] Connecting to:', this.serverUrl);

        // 解析服务器URL，提取路径用于socket.io的path选项
        let socketHost = this.serverUrl;
        let socketPath = '/socket.io';

        try {
            const url = new URL(this.serverUrl);
            // 如果URL包含路径（如 /game），需要添加到socket.io的path中
            if (url.pathname && url.pathname !== '/') {
                socketPath = url.pathname + '/socket.io';
                // 移除路径部分，只保留host
                socketHost = `${url.protocol}//${url.host}`;
            }
        } catch (e) {
            console.warn('[NetworkManager] Failed to parse server URL:', e);
        }

        console.log('[NetworkManager] Socket host:', socketHost);
        console.log('[NetworkManager] Socket path:', socketPath);

        // 配置socket.io选项
        this.socket = io(socketHost, {
            path: socketPath,  // 指定socket.io端点路径
            transports: ['websocket', 'polling'], // 使用websocket和轮询
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        this.socket.on('connect', () => {
            console.log('✓ Connected to server successfully');
            console.log('Socket ID:', this.socket.id);
            this.connected = true;
            this.playerId = this.socket.id;
        });

        this.socket.on('connect_error', (error) => {
            console.error('✗ Connection error:', error.message);
            console.error('Server URL:', this.serverUrl);
            console.error('Make sure the Socket.io server is running on port 8099');
            this.connected = false;
        });

        this.socket.on('connect_timeout', () => {
            console.error('✗ Connection timeout');
            console.error('Server URL:', this.serverUrl);
            this.connected = false;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server. Reason:', reason);
            this.connected = false;
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`Reconnection attempt ${attemptNumber}...`);
        });

        this.socket.on('reconnect_failed', () => {
            console.error('✗ Reconnection failed after all attempts');
        });

        this.socket.on('roomCreated', (data) => {
            console.log('Room created:', data);
            this.roomId = data.roomId;
            this.playerRole = data.role;
            this.currentPlayers = data.players || [];
            if (this.onRoomCreated) this.onRoomCreated(data);
        });

        this.socket.on('roomJoined', (data) => {
            console.log('Room joined:', data);
            this.roomId = data.roomId;
            this.playerRole = data.role;
            this.currentPlayers = data.players || [];
            if (this.onRoomJoined) this.onRoomJoined(data);
        });

        this.socket.on('roomList', (data) => {
            console.log('Room list received:', data);
            if (this.onRoomList) this.onRoomList(data);
        });

        this.socket.on('playerJoined', (data) => {
            console.log('Player joined:', data);
            this.currentPlayers = data.players || [];
            if (this.onPlayerJoined) this.onPlayerJoined(data);
        });

        this.socket.on('playerLeft', (data) => {
            console.log('Player left:', data);
            this.currentPlayers = data.players || [];
            if (this.onPlayerLeft) this.onPlayerLeft(data);
        });

        this.socket.on('gameStarted', (data) => {
            console.log('Game started:', data);
            if (this.onGameStarted) this.onGameStarted(data);
        });

        this.socket.on('playerMoved', (data) => {
            if (this.onPlayerMoved) this.onPlayerMoved(data);
        });

        this.socket.on('playerShot', (data) => {
            console.log('Player shot:', data);
            if (this.onPlayerShot) this.onPlayerShot(data);
        });

        this.socket.on('enemyHit', (data) => {
            console.log('Enemy hit:', data);
            if (this.onEnemyHit) this.onEnemyHit(data);
        });

        this.socket.on('gameOver', (data) => {
            console.log('Game over:', data);
            if (this.onGameOver) this.onGameOver(data);
        });

        this.socket.on('roomClosed', () => {
            console.log('Room closed');
            this.roomId = null;
            if (this.onRoomClosed) this.onRoomClosed();
        });

        this.socket.on('error', (data) => {
            console.error('Server error:', data);
            if (this.onError) this.onError(data);
        });
    }

    /**
     * 获取房间列表
     */
    getRooms() {
        if (!this.connected) {
            console.error('Not connected to server');
            return;
        }
        this.socket.emit('getRooms');
    }

    /**
     * 创建房间
     */
    createRoom(playerName) {
        if (!this.connected) {
            console.error('Not connected to server');
            return;
        }
        this.socket.emit('createRoom', playerName);
    }

    /**
     * 加入房间
     */
    joinRoom(roomId, playerName) {
        if (!this.connected) {
            console.error('Not connected to server');
            return;
        }
        this.socket.emit('joinRoom', { roomId, playerName });
    }

    /**
     * 开始游戏
     */
    startGame() {
        if (!this.connected || !this.roomId) {
            console.error('Not in a room');
            return;
        }
        this.socket.emit('startGame');
    }

    /**
     * 发送玩家移动
     */
    sendPlayerMove(position, rotation) {
        if (!this.connected || !this.roomId) return;
        this.socket.emit('playerMove', { position, rotation });
    }

    /**
     * 发送射击事件
     */
    sendShoot(position, direction, hitEnemyId = null) {
        if (!this.connected || !this.roomId) return;
        this.socket.emit('shoot', { position, direction, hitEnemyId });
    }

    /**
     * 离开房间
     */
    leaveRoom() {
        if (!this.connected || !this.roomId) return;
        this.socket.emit('leaveRoom');
        this.roomId = null;
        this.playerRole = null;
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.connected = false;
        }
    }

    /**
     * 检查是否是狙击手
     */
    isSniper() {
        return this.playerRole === 'sniper';
    }

    /**
     * 检查是否是敌人
     */
    isEnemy() {
        return this.playerRole === 'enemy';
    }
}
