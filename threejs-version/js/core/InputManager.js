// 输入管理器
export class InputManager {
    constructor() {
        this.keys = {};
        this.mouseButtons = {};
        this.mouseLocked = false;
        this.mouseMovement = { x: 0, y: 0 };
        this.wheelDelta = 0;

        // 触摸相关
        this.touches = {};
        this.touchMovement = { x: 0, y: 0 };
        this.isMobile = this.detectMobile();
        this.virtualButtons = {
            scope: false,
            shoot: false,
            zoomIn: false,
            zoomOut: false
        };

        // 回调函数
        this.onMouseMove = null;
        this.onMouseDown = null;
        this.onMouseUp = null;
        this.onKeyDown = null;
        this.onKeyUp = null;
        this.onWheel = null;
        this.onPointerLockChange = null;
        this.onTouchMove = null;

        this.setupEventListeners();
        if (this.isMobile) {
            this.setupMobileControls();
        }
    }

    /**
     * 检测是否为移动设备
     */
    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
               (window.innerWidth <= 768);
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 键盘事件
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // 鼠标事件
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));

        // 滚轮事件 - 必须设置 passive: false 才能使用 preventDefault()
        document.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        // 触摸事件
        document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // 指针锁定事件
        document.addEventListener('pointerlockchange', () => this.handlePointerLockChange());
        document.addEventListener('pointerlockerror', () => {
            console.error('Pointer lock error');
        });
    }

    /**
     * 设置移动端虚拟控制
     */
    setupMobileControls() {
        const mobileControls = document.getElementById('mobileControls');
        if (mobileControls) {
            mobileControls.classList.remove('hidden');

            // 开镜按钮
            const scopeButton = document.getElementById('scopeButton');
            if (scopeButton) {
                scopeButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.virtualButtons.scope = !this.virtualButtons.scope;
                    scopeButton.classList.toggle('active', this.virtualButtons.scope);
                });
            }

            // 射击按钮
            const shootButton = document.getElementById('shootButton');
            if (shootButton) {
                shootButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.virtualButtons.shoot = true;
                    // 模拟鼠标点击
                    this.mouseButtons[0] = true;
                    if (this.onMouseDown) {
                        this.onMouseDown({ button: 0 });
                    }
                });
                shootButton.addEventListener('touchend', (e) => {
                    e.preventDefault();
                    this.virtualButtons.shoot = false;
                    this.mouseButtons[0] = false;
                    if (this.onMouseUp) {
                        this.onMouseUp({ button: 0 });
                    }
                });
            }

            // 放大按钮
            const zoomInButton = document.getElementById('zoomInButton');
            if (zoomInButton) {
                zoomInButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.wheelDelta = -100; // 模拟滚轮向上
                    if (this.onWheel) {
                        this.onWheel(-100);
                    }
                });
            }

            // 缩小按钮
            const zoomOutButton = document.getElementById('zoomOutButton');
            if (zoomOutButton) {
                zoomOutButton.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.wheelDelta = 100; // 模拟滚轮向下
                    if (this.onWheel) {
                        this.onWheel(100);
                    }
                });
            }
        }
    }

    /**
     * 处理触摸开始
     */
    handleTouchStart(event) {
        // 检查是否点击在UI元素上
        const target = event.target;
        if (target.closest('.menu') || target.closest('.control-button')) {
            return; // 让按钮的事件处理器处理
        }

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            this.touches[touch.identifier] = {
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY
            };
        }
    }

    /**
     * 处理触摸移动
     */
    handleTouchMove(event) {
        // 检查是否在UI元素上
        const target = event.target;
        if (target.closest('.menu') || target.closest('.control-button')) {
            return;
        }

        event.preventDefault();

        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            const touchData = this.touches[touch.identifier];

            if (touchData) {
                const deltaX = touch.clientX - touchData.currentX;
                const deltaY = touch.clientY - touchData.currentY;

                // 累积移动量（用于瞄准）
                this.touchMovement.x += deltaX * 0.5; // 调整灵敏度
                this.touchMovement.y += deltaY * 0.5;

                // 更新当前位置
                touchData.currentX = touch.clientX;
                touchData.currentY = touch.clientY;

                // 触发回调
                if (this.onTouchMove) {
                    this.onTouchMove(deltaX * 0.5, deltaY * 0.5);
                }
                if (this.onMouseMove) {
                    this.onMouseMove(deltaX * 0.5, deltaY * 0.5);
                }
            }
        }
    }

    /**
     * 处理触摸结束
     */
    handleTouchEnd(event) {
        for (let i = 0; i < event.changedTouches.length; i++) {
            const touch = event.changedTouches[i];
            delete this.touches[touch.identifier];
        }
    }

    /**
     * 处理键盘按下
     */
    handleKeyDown(event) {
        this.keys[event.code] = true;
        if (this.onKeyDown) {
            this.onKeyDown(event);
        }
    }

    /**
     * 处理键盘释放
     */
    handleKeyUp(event) {
        this.keys[event.code] = false;
        if (this.onKeyUp) {
            this.onKeyUp(event);
        }
    }

    /**
     * 处理鼠标按下
     */
    handleMouseDown(event) {
        this.mouseButtons[event.button] = true;
        if (this.onMouseDown) {
            this.onMouseDown(event);
        }
    }

    /**
     * 处理鼠标释放
     */
    handleMouseUp(event) {
        this.mouseButtons[event.button] = false;
        if (this.onMouseUp) {
            this.onMouseUp(event);
        }
    }

    /**
     * 处理鼠标移动
     */
    handleMouseMove(event) {
        if (this.mouseLocked) {
            this.mouseMovement.x = event.movementX || 0;
            this.mouseMovement.y = event.movementY || 0;

            if (this.onMouseMove) {
                this.onMouseMove(event.movementX, event.movementY);
            }
        }
    }

    /**
     * 处理滚轮
     */
    handleWheel(event) {
        event.preventDefault();
        this.wheelDelta = event.deltaY;

        if (this.onWheel) {
            this.onWheel(event.deltaY);
        }
    }

    /**
     * 处理指针锁定改变
     */
    handlePointerLockChange() {
        const wasLocked = this.mouseLocked;
        this.mouseLocked = document.pointerLockElement === document.body;

        // 通知状态改变
        if (this.onPointerLockChange) {
            this.onPointerLockChange(this.mouseLocked, wasLocked);
        }
    }

    /**
     * 请求指针锁定
     */
    requestPointerLock() {
        document.body.requestPointerLock();
    }

    /**
     * 退出指针锁定
     */
    exitPointerLock() {
        document.exitPointerLock();
    }

    /**
     * 检查键是否按下
     */
    isKeyDown(code) {
        return this.keys[code] === true;
    }

    /**
     * 检查鼠标按钮是否按下
     */
    isMouseButtonDown(button) {
        return this.mouseButtons[button] === true;
    }

    /**
     * 获取鼠标移动
     */
    getMouseMovement() {
        // 在移动端，如果有触摸移动，优先使用触摸移动
        if (this.isMobile && (this.touchMovement.x !== 0 || this.touchMovement.y !== 0)) {
            const movement = { ...this.touchMovement };
            this.touchMovement.x = 0;
            this.touchMovement.y = 0;
            return movement;
        }

        const movement = { ...this.mouseMovement };
        this.mouseMovement.x = 0;
        this.mouseMovement.y = 0;
        return movement;
    }

    /**
     * 获取滚轮增量
     */
    getWheelDelta() {
        const delta = this.wheelDelta;
        this.wheelDelta = 0;
        return delta;
    }

    /**
     * 检查是否按下右键或Shift（开镜）
     * 移动端通过虚拟按钮实现
     */
    isScopeButtonPressed() {
        if (this.isMobile) {
            return this.virtualButtons.scope;
        }
        return this.isMouseButtonDown(2) || this.isKeyDown('ShiftLeft') || this.isKeyDown('ShiftRight');
    }

    /**
     * 检查是否按下射击键
     * 移动端通过虚拟按钮实现
     */
    isShootButtonPressed() {
        if (this.isMobile) {
            return this.virtualButtons.shoot;
        }
        return this.isMouseButtonDown(0) || this.isKeyDown('Space');
    }

    /**
     * 清除所有输入
     */
    clear() {
        this.keys = {};
        this.mouseButtons = {};
        this.mouseMovement = { x: 0, y: 0 };
        this.wheelDelta = 0;
        this.touches = {};
        this.touchMovement = { x: 0, y: 0 };
        this.virtualButtons = {
            scope: false,
            shoot: false,
            zoomIn: false,
            zoomOut: false
        };
    }
}
