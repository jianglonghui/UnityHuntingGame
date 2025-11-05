// 联机UI管理器
export class MultiplayerUIManager {
    constructor(networkManager) {
        this.networkManager = networkManager;

        // 菜单元素
        this.mainMenu = document.getElementById('mainMenu');
        this.multiplayerMenu = document.getElementById('multiplayerMenu');
        this.roomListMenu = document.getElementById('roomListMenu');
        this.createRoomMenu = document.getElementById('createRoomMenu');

        // 输入元素
        this.playerNameInput = document.getElementById('playerNameInput');

        // 房间相关元素
        this.roomListContainer = document.getElementById('roomListContainer');
        this.roomIdDisplay = document.getElementById('roomIdDisplay');
        this.yourRoleDisplay = document.getElementById('yourRoleDisplay');
        this.playerCountDisplay = document.getElementById('playerCountDisplay');
        this.lobbyPlayerList = document.getElementById('lobbyPlayerList');
        this.startGameButton = document.getElementById('startGameButton');
        this.readyButton = document.getElementById('readyButton');

        // 准备状态
        this.isReady = false;

        // 回调函数
        this.onSinglePlayer = null;
        this.onMultiplayerGameStart = null;

        this.setupButtons();
        this.setupNetworkCallbacks();
    }

    /**
     * 设置按钮事件
     */
    setupButtons() {
        // 单人模式
        document.getElementById('singlePlayerButton').addEventListener('click', () => {
            if (this.onSinglePlayer) this.onSinglePlayer();
        });

        // 联机模式
        document.getElementById('multiplayerButton').addEventListener('click', async () => {
            await this.showMultiplayerMenu();
        });

        // 创建房间
        document.getElementById('createRoomButton').addEventListener('click', () => {
            this.createRoom();
        });

        // 加入房间（显示房间列表）
        document.getElementById('joinRoomButton').addEventListener('click', () => {
            this.showRoomList();
        });

        // 刷新房间列表
        document.getElementById('refreshRoomsButton').addEventListener('click', () => {
            this.refreshRoomList();
        });

        // 准备按钮
        this.readyButton.addEventListener('click', () => {
            this.toggleReady();
        });

        // 开始游戏
        this.startGameButton.addEventListener('click', () => {
            this.startGame();
        });

        // 离开房间
        document.getElementById('leaveLobbyButton').addEventListener('click', () => {
            this.leaveRoom();
        });

        // 返回按钮
        document.getElementById('backToMainButton').addEventListener('click', () => {
            this.showMainMenu();
        });

        document.getElementById('backToMultiplayerButton').addEventListener('click', () => {
            this.showMultiplayerMenuFromRoomList();
        });
    }

    /**
     * 设置网络回调
     */
    setupNetworkCallbacks() {
        this.networkManager.onRoomCreated = (data) => {
            console.log('Room created:', data);
            this.handleRoomCreated(data);
        };

        this.networkManager.onRoomJoined = (data) => {
            console.log('Room joined:', data);
            this.handleRoomJoined(data);
        };

        this.networkManager.onPlayerJoined = (data) => {
            console.log('Player joined:', data);
            this.updateLobbyPlayerList(data.players);
        };

        this.networkManager.onPlayerLeft = (data) => {
            console.log('Player left:', data);
            this.updateLobbyPlayerList(data.players);
        };

        this.networkManager.onPlayerReady = (data) => {
            console.log('Player ready status changed:', data);
            this.updateLobbyPlayerList(data.players);

            // 同步本地的准备状态
            const myPlayer = data.players.find(p => p.id === this.networkManager.playerId);
            if (myPlayer) {
                this.isReady = myPlayer.isReady;
                this.updateReadyButton();
            }
        };

        this.networkManager.onGameStarted = (data) => {
            console.log('Game started:', data);
            // 重置准备状态
            this.isReady = false;
            this.updateReadyButton();
            if (this.onMultiplayerGameStart) {
                this.onMultiplayerGameStart(data);
            }
        };

        this.networkManager.onRoomList = (rooms) => {
            console.log('Room list:', rooms);
            this.displayRoomList(rooms);
        };

        this.networkManager.onRoomClosed = () => {
            alert('房主已离开，房间关闭');
            this.showMainMenu();
        };

        this.networkManager.onError = (data) => {
            alert('错误: ' + data.message);
        };
    }

    /**
     * 显示联机菜单
     */
    async showMultiplayerMenu() {
        try {
            await this.networkManager.connect();
            this.hideAll();
            this.multiplayerMenu.classList.remove('hidden');
            this.multiplayerMenu.classList.add('active');
        } catch (error) {
            console.error('Failed to connect:', error);
            alert('无法连接到服务器');
        }
    }

    /**
     * 显示联机菜单（从房间列表返回）
     */
    showMultiplayerMenuFromRoomList() {
        this.hideAll();
        this.multiplayerMenu.classList.remove('hidden');
        this.multiplayerMenu.classList.add('active');
    }

    /**
     * 创建房间
     */
    createRoom() {
        const playerName = this.playerNameInput.value.trim() || '玩家';
        this.networkManager.createRoom(playerName);
    }

    /**
     * 显示房间列表
     */
    showRoomList() {
        this.hideAll();
        this.roomListMenu.classList.remove('hidden');
        this.roomListMenu.classList.add('active');
        this.refreshRoomList();
    }

    /**
     * 刷新房间列表
     */
    refreshRoomList() {
        this.roomListContainer.innerHTML = '<p class="loading-text">正在加载房间...</p>';
        this.networkManager.getRooms();
    }

    /**
     * 显示房间列表
     */
    displayRoomList(rooms) {
        this.roomListContainer.innerHTML = '';

        if (!rooms || rooms.length === 0) {
            this.roomListContainer.innerHTML = '<p class="loading-text">暂无可用房间</p>';
            return;
        }

        // 只显示等待中的房间
        const availableRooms = rooms.filter(room => room.state === 'waiting');

        if (availableRooms.length === 0) {
            this.roomListContainer.innerHTML = '<p class="loading-text">暂无可用房间</p>';
            return;
        }

        availableRooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = 'room-item';

            const roomInfo = document.createElement('div');
            roomInfo.className = 'room-info';

            const roomId = document.createElement('div');
            roomId.className = 'room-id';
            roomId.textContent = `房间 ${room.id}`;

            const playerCount = document.createElement('div');
            playerCount.className = 'player-count';
            playerCount.textContent = `${room.playerCount}/${room.maxPlayers} 玩家`;

            roomInfo.appendChild(roomId);
            roomInfo.appendChild(playerCount);

            const joinButton = document.createElement('button');
            joinButton.className = 'join-button';
            joinButton.textContent = '加入';
            joinButton.onclick = () => this.joinRoomById(room.id);

            roomItem.appendChild(roomInfo);
            roomItem.appendChild(joinButton);
            this.roomListContainer.appendChild(roomItem);
        });
    }

    /**
     * 通过房间ID加入房间
     */
    joinRoomById(roomId) {
        const playerName = this.playerNameInput.value.trim() || '玩家';
        this.networkManager.joinRoom(roomId, playerName);
    }

    /**
     * 处理房间创建成功
     */
    handleRoomCreated(data) {
        this.hideAll();
        this.createRoomMenu.classList.remove('hidden');
        this.createRoomMenu.classList.add('active');

        this.roomIdDisplay.textContent = data.roomId;
        this.yourRoleDisplay.textContent = this.getRoleDisplayName(data.role);
        this.updateLobbyPlayerList(data.players);

        // 房主显示开始按钮，所有人准备才能开始
        this.startGameButton.style.display = 'block';
        this.startGameButton.disabled = true;

        // 房主不需要准备，隐藏准备按钮
        this.readyButton.style.display = 'none';
        this.isReady = true; // 房主自动准备
    }

    /**
     * 处理加入房间成功
     */
    handleRoomJoined(data) {
        this.hideAll();
        this.createRoomMenu.classList.remove('hidden');
        this.createRoomMenu.classList.add('active');

        this.roomIdDisplay.textContent = data.roomId;
        this.yourRoleDisplay.textContent = this.getRoleDisplayName(data.role);
        this.updateLobbyPlayerList(data.players);

        // 非房主不能开始游戏，但能准备
        this.startGameButton.style.display = 'none';
        this.readyButton.style.display = 'block';
        this.isReady = false;
        this.updateReadyButton();
    }

    /**
     * 更新大厅玩家列表
     */
    updateLobbyPlayerList(players) {
        this.playerCountDisplay.textContent = players.length;

        this.lobbyPlayerList.innerHTML = '';
        players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'lobby-player-item';

            const playerName = document.createElement('span');
            playerName.className = 'player-name';
            playerName.textContent = player.name;

            const playerRole = document.createElement('span');
            playerRole.className = `player-role ${player.role}`;
            playerRole.textContent = this.getRoleDisplayName(player.role);

            // 显示准备状态
            const readyStatus = document.createElement('span');
            readyStatus.className = 'ready-status';
            readyStatus.textContent = player.isReady ? ' ✓' : ' ○';
            readyStatus.style.color = player.isReady ? '#00ff00' : '#666';

            playerItem.appendChild(playerName);
            playerItem.appendChild(playerRole);
            playerItem.appendChild(readyStatus);
            this.lobbyPlayerList.appendChild(playerItem);
        });

        // 更新开始按钮状态（房主）
        if (this.startGameButton.style.display !== 'none') {
            // 至少2人，且所有人都准备好了
            const allReady = players.length >= 2 && players.every(p => p.isReady);
            this.startGameButton.disabled = !allReady;
        }
    }

    /**
     * 开始游戏
     */
    startGame() {
        this.networkManager.startGame();
    }

    /**
     * 切换准备状态
     */
    toggleReady() {
        this.isReady = !this.isReady;
        this.updateReadyButton();
        this.networkManager.setReady(this.isReady);
    }

    /**
     * 更新准备按钮显示
     */
    updateReadyButton() {
        if (this.readyButton) {
            this.readyButton.textContent = this.isReady ? '取消准备' : '准备';
            // 准备=橙色，取消准备=黄色
            this.readyButton.style.backgroundColor = this.isReady ? '#ffaa00' : '#ff6600';
        }
    }

    /**
     * 显示房间界面（游戏结束后）
     */
    showLobby() {
        this.hideAll();
        this.createRoomMenu.classList.remove('hidden');
        this.createRoomMenu.classList.add('active');

        // 不在这里设置准备状态，等待服务器的playerReady事件更新
        // 服务器会在gameOver后广播正确的准备状态
    }

    /**
     * 离开房间
     */
    leaveRoom() {
        this.networkManager.leaveRoom();
        this.isReady = false;
        this.showMultiplayerMenuFromRoomList();
    }

    /**
     * 显示主菜单
     */
    showMainMenu() {
        this.hideAll();
        this.mainMenu.classList.remove('hidden');
        this.mainMenu.classList.add('active');
    }

    /**
     * 隐藏所有菜单
     */
    hideAll() {
        this.mainMenu.classList.add('hidden');
        this.mainMenu.classList.remove('active');

        this.multiplayerMenu.classList.add('hidden');
        this.multiplayerMenu.classList.remove('active');

        this.roomListMenu.classList.add('hidden');
        this.roomListMenu.classList.remove('active');

        this.createRoomMenu.classList.add('hidden');
        this.createRoomMenu.classList.remove('active');
    }

    /**
     * 获取角色显示名称
     */
    getRoleDisplayName(role) {
        switch (role) {
            case 'sniper':
                return '狙击手';
            case 'enemy':
                return '敌人';
            default:
                return '未知';
        }
    }

    /**
     * 显示游戏UI
     */
    showGameUI() {
        this.hideAll();
        document.getElementById('gameUI').classList.remove('hidden');
    }
}
