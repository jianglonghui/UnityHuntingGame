// 加载环境变量
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const config = require('../config');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = config.SERVER_PORT;

// 静态文件服务
app.use(express.static(path.join(__dirname, '..')));

// 房间管理
const rooms = new Map();

// 房间配置（从配置文件读取）
const ROOM_CONFIG = config.ROOM;

// 房间状态
const ROOM_STATE = {
    WAITING: 'waiting',
    PLAYING: 'playing',
    FINISHED: 'finished'
};

// 玩家角色
const PLAYER_ROLE = {
    SNIPER: 'sniper',
    ENEMY: 'enemy'
};

class Room {
    constructor(id, hostId) {
        this.id = id;
        this.hostId = hostId;
        this.players = new Map();
        this.state = ROOM_STATE.WAITING;
        this.gameStartTime = null;
        this.sniperScore = 0;
        this.enemyLives = new Map();
    }

    addPlayer(socketId, playerName) {
        // 检查名字是否重复
        for (const player of this.players.values()) {
            if (player.name === playerName) {
                return { error: '名字已被使用，请换一个名字' };
            }
        }

        // 分配角色
        const role = this.players.size === 0 ? PLAYER_ROLE.SNIPER : PLAYER_ROLE.ENEMY;

        this.players.set(socketId, {
            id: socketId,
            name: playerName,
            role: role,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            isAlive: true
        });

        if (role === PLAYER_ROLE.ENEMY) {
            this.enemyLives.set(socketId, 3); // 每个玩家敌人3条命
        }

        return { role };
    }

    removePlayer(socketId) {
        this.players.delete(socketId);
        this.enemyLives.delete(socketId);
    }

    canStart() {
        return this.players.size >= ROOM_CONFIG.MIN_PLAYERS &&
               this.state === ROOM_STATE.WAITING;
    }

    startGame() {
        this.state = ROOM_STATE.PLAYING;
        this.gameStartTime = Date.now();
        this.sniperScore = 0;

        // 重置所有玩家状态
        for (const [socketId, player] of this.players) {
            player.isAlive = true;
            if (player.role === PLAYER_ROLE.ENEMY) {
                this.enemyLives.set(socketId, 3);
            }
        }
    }

    getPlayers() {
        return Array.from(this.players.values());
    }

    getPlayerCount() {
        return this.players.size;
    }

    getSniperPlayer() {
        for (const player of this.players.values()) {
            if (player.role === PLAYER_ROLE.SNIPER) {
                return player;
            }
        }
        return null;
    }

    hitEnemy(enemyId) {
        const lives = this.enemyLives.get(enemyId) || 0;
        if (lives > 0) {
            this.enemyLives.set(enemyId, lives - 1);
            this.sniperScore += 1;

            if (lives - 1 <= 0) {
                const player = this.players.get(enemyId);
                if (player) {
                    player.isAlive = false;
                }
            }
            return true;
        }
        return false;
    }

    checkGameOver() {
        if (this.state !== ROOM_STATE.PLAYING) return false;

        const elapsed = (Date.now() - this.gameStartTime) / 1000;

        // 时间到
        if (elapsed >= ROOM_CONFIG.GAME_DURATION) {
            this.state = ROOM_STATE.FINISHED;
            return true;
        }

        // 所有敌人玩家死亡
        const aliveEnemies = Array.from(this.players.values())
            .filter(p => p.role === PLAYER_ROLE.ENEMY && p.isAlive);

        if (aliveEnemies.length === 0) {
            this.state = ROOM_STATE.FINISHED;
            return true;
        }

        return false;
    }
}

// Socket.io 连接处理
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // 获取房间列表
    socket.on('getRooms', () => {
        const roomList = Array.from(rooms.values()).map(room => ({
            id: room.id,
            playerCount: room.getPlayerCount(),
            maxPlayers: ROOM_CONFIG.MAX_PLAYERS,
            state: room.state
        }));
        socket.emit('roomList', roomList);
    });

    // 创建房间
    socket.on('createRoom', (playerName) => {
        const roomId = generateRoomId();
        const room = new Room(roomId, socket.id);
        const result = room.addPlayer(socket.id, playerName);

        // 检查是否有错误（名字重复）
        if (result.error) {
            socket.emit('error', { message: result.error });
            return;
        }

        rooms.set(roomId, room);
        socket.join(roomId);
        socket.roomId = roomId;

        socket.emit('roomCreated', {
            roomId: roomId,
            role: result.role,
            players: room.getPlayers()
        });

        console.log(`Room created: ${roomId} by ${playerName}`);
    });

    // 加入房间
    socket.on('joinRoom', ({ roomId, playerName }) => {
        const room = rooms.get(roomId);

        if (!room) {
            socket.emit('error', { message: '房间不存在' });
            return;
        }

        if (room.getPlayerCount() >= ROOM_CONFIG.MAX_PLAYERS) {
            socket.emit('error', { message: '房间已满' });
            return;
        }

        if (room.state !== ROOM_STATE.WAITING) {
            socket.emit('error', { message: '游戏已经开始' });
            return;
        }

        const result = room.addPlayer(socket.id, playerName);

        // 检查是否有错误（名字重复）
        if (result.error) {
            socket.emit('error', { message: result.error });
            return;
        }

        socket.join(roomId);
        socket.roomId = roomId;

        socket.emit('roomJoined', {
            roomId: roomId,
            role: result.role,
            players: room.getPlayers()
        });

        // 通知房间其他玩家
        socket.to(roomId).emit('playerJoined', {
            player: room.players.get(socket.id),
            players: room.getPlayers()
        });

        console.log(`${playerName} joined room ${roomId} as ${result.role}`);
    });

    // 开始游戏
    socket.on('startGame', () => {
        const room = rooms.get(socket.roomId);
        if (!room || socket.id !== room.hostId) {
            socket.emit('error', { message: 'Only host can start game' });
            return;
        }

        if (!room.canStart()) {
            socket.emit('error', { message: 'Not enough players' });
            return;
        }

        room.startGame();
        io.to(room.id).emit('gameStarted', {
            startTime: room.gameStartTime,
            duration: ROOM_CONFIG.GAME_DURATION
        });

        console.log(`Game started in room ${room.id}`);
    });

    // 玩家移动
    socket.on('playerMove', (data) => {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (!player || !player.isAlive) return;

        player.position = data.position;
        player.rotation = data.rotation;
        player.isScoped = data.isScoped || false;  // 保存瞄准镜状态

        // 广播给其他玩家
        socket.to(room.id).emit('playerMoved', {
            playerId: socket.id,
            position: data.position,
            rotation: data.rotation,
            isScoped: data.isScoped || false  // 广播瞄准镜状态
        });
    });

    // 狙击手射击
    socket.on('shoot', (data) => {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        const player = room.players.get(socket.id);
        if (!player || player.role !== PLAYER_ROLE.SNIPER) return;

        // 广播射击事件
        io.to(room.id).emit('playerShot', {
            playerId: socket.id,
            position: data.position,
            direction: data.direction
        });

        // 检查是否击中敌人
        if (data.hitEnemyId) {
            const hit = room.hitEnemy(data.hitEnemyId);
            if (hit) {
                const lives = room.enemyLives.get(data.hitEnemyId);
                io.to(room.id).emit('enemyHit', {
                    enemyId: data.hitEnemyId,
                    remainingLives: lives,
                    score: room.sniperScore
                });
            }
        }

        // 检查游戏是否结束
        if (room.checkGameOver()) {
            io.to(room.id).emit('gameOver', {
                reason: 'allEnemiesKilled',
                finalScore: room.sniperScore
            });
        }
    });

    // 游戏时间更新
    socket.on('timeUpdate', () => {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        if (room.checkGameOver()) {
            io.to(room.id).emit('gameOver', {
                reason: 'timeout',
                finalScore: room.sniperScore
            });
        }
    });

    // 离开房间
    socket.on('leaveRoom', () => {
        const room = rooms.get(socket.roomId);
        if (!room) return;

        room.removePlayer(socket.id);
        socket.leave(room.id);

        // 通知其他玩家
        socket.to(room.id).emit('playerLeft', {
            playerId: socket.id,
            players: room.getPlayers()
        });

        // 如果房主离开，删除房间
        if (socket.id === room.hostId) {
            io.to(room.id).emit('roomClosed');
            rooms.delete(room.id);
            console.log(`Room ${room.id} closed`);
        }

        socket.roomId = null;
    });

    // 断开连接
    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);

        const room = rooms.get(socket.roomId);
        if (room) {
            room.removePlayer(socket.id);
            socket.to(room.id).emit('playerLeft', {
                playerId: socket.id,
                players: room.getPlayers()
            });

            // 如果房主断开，删除房间
            if (socket.id === room.hostId) {
                io.to(room.id).emit('roomClosed');
                rooms.delete(room.id);
            }
        }
    });
});

// 生成随机房间ID
function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access game at http://localhost:${PORT}`);
});
