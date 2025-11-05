// 网络管理器
export class NetworkManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.roomId = null;
        this.playerId = null;
        this.playerRole = null; // 'sniper' or 'enemy'
        this.currentPlayers = [];  // 当前房间的玩家列表
        this.serverUrl = 'http://localhost:3000';

        // 回调函数
        this.onRoomCreated = null;
        this.onRoomJoined = null;
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
            // 加载Socket.io客户端
            if (typeof io === 'undefined') {
                const script = document.createElement('script');
                script.src = '/socket.io/socket.io.js';
                script.onload = () => {
                    this.initializeSocket();
                    resolve();
                };
                script.onerror = () => {
                    reject(new Error('Failed to load Socket.io'));
                };
                document.head.appendChild(script);
            } else {
                this.initializeSocket();
                resolve();
            }
        });
    }

    /**
     * 初始化Socket连接
     */
    initializeSocket() {
        this.socket = io(this.serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.connected = true;
            this.playerId = this.socket.id;
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
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
