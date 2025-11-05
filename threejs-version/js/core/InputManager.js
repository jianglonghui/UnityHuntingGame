// 输入管理器
export class InputManager {
    constructor() {
        this.keys = {};
        this.mouseButtons = {};
        this.mouseLocked = false;
        this.mouseMovement = { x: 0, y: 0 };
        this.wheelDelta = 0;

        // 回调函数
        this.onMouseMove = null;
        this.onMouseDown = null;
        this.onMouseUp = null;
        this.onKeyDown = null;
        this.onKeyUp = null;
        this.onWheel = null;
        this.onPointerLockChange = null;

        this.setupEventListeners();
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

        // 指针锁定事件
        document.addEventListener('pointerlockchange', () => this.handlePointerLockChange());
        document.addEventListener('pointerlockerror', () => {
            console.error('Pointer lock error');
        });
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
     * 清除所有输入
     */
    clear() {
        this.keys = {};
        this.mouseButtons = {};
        this.mouseMovement = { x: 0, y: 0 };
        this.wheelDelta = 0;
    }
}
