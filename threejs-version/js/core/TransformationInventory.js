// 变身道具管理器
export class TransformationInventory {
    constructor() {
        this.slots = [null, null, null];  // 3个物品槽
        this.maxSlots = 3;
        this.transformationTypes = ['tree', 'rock', 'grass'];

        // UI元素
        this.inventoryUI = null;
        this.slotElements = [];

        this.createUI();
    }

    /**
     * 创建UI物品栏
     */
    createUI() {
        // 创建物品栏容器
        this.inventoryUI = document.createElement('div');
        this.inventoryUI.id = 'transformationInventory';
        this.inventoryUI.className = 'transformation-inventory hidden';

        // 创建3个物品槽
        for (let i = 0; i < this.maxSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'transformation-slot';
            slot.dataset.index = i;

            // 槽位编号
            const keyHint = document.createElement('div');
            keyHint.className = 'slot-key';
            keyHint.textContent = (i + 1).toString();

            // 物品图标
            const icon = document.createElement('div');
            icon.className = 'slot-icon empty';

            slot.appendChild(keyHint);
            slot.appendChild(icon);
            this.inventoryUI.appendChild(slot);
            this.slotElements.push(slot);
        }

        document.body.appendChild(this.inventoryUI);
    }

    /**
     * 显示物品栏
     */
    show() {
        if (this.inventoryUI) {
            this.inventoryUI.classList.remove('hidden');
        }
    }

    /**
     * 隐藏物品栏
     */
    hide() {
        if (this.inventoryUI) {
            this.inventoryUI.classList.add('hidden');
        }
    }

    /**
     * 随机添加变身道具
     */
    addRandomTransformation() {
        // 找到第一个空槽
        const emptySlotIndex = this.slots.findIndex(slot => slot === null);

        if (emptySlotIndex === -1) {
            console.log('物品栏已满');
            return null;
        }

        // 随机选择变身类型
        const randomType = this.transformationTypes[
            Math.floor(Math.random() * this.transformationTypes.length)
        ];

        this.slots[emptySlotIndex] = randomType;
        this.updateSlotUI(emptySlotIndex);

        console.log(`获得变身道具: ${randomType} (槽位 ${emptySlotIndex + 1})`);
        return { type: randomType, slot: emptySlotIndex };
    }

    /**
     * 使用指定槽位的变身道具
     */
    useTransformation(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.maxSlots) {
            return null;
        }

        const type = this.slots[slotIndex];
        if (!type) {
            console.log(`槽位 ${slotIndex + 1} 为空`);
            return null;
        }

        // 使用后清空槽位
        this.slots[slotIndex] = null;
        this.updateSlotUI(slotIndex);

        console.log(`使用变身道具: ${type}`);
        return type;
    }

    /**
     * 更新槽位UI
     */
    updateSlotUI(slotIndex) {
        const slot = this.slotElements[slotIndex];
        const icon = slot.querySelector('.slot-icon');
        const type = this.slots[slotIndex];

        if (type) {
            icon.className = `slot-icon ${type}`;
            icon.textContent = this.getTypeEmoji(type);
        } else {
            icon.className = 'slot-icon empty';
            icon.textContent = '';
        }
    }

    /**
     * 获取类型对应的emoji
     */
    getTypeEmoji(type) {
        const emojis = {
            tree: '🌲',
            rock: '🪨',
            grass: '🌿'
        };
        return emojis[type] || '?';
    }

    /**
     * 获取类型名称
     */
    getTypeName(type) {
        const names = {
            tree: '树',
            rock: '石头',
            grass: '草丛'
        };
        return names[type] || '未知';
    }

    /**
     * 清空所有槽位
     */
    clear() {
        this.slots = [null, null, null];
        for (let i = 0; i < this.maxSlots; i++) {
            this.updateSlotUI(i);
        }
    }

    /**
     * 检查是否有道具
     */
    hasAnyTransformation() {
        return this.slots.some(slot => slot !== null);
    }

    /**
     * 获取所有道具信息
     */
    getInventoryData() {
        return [...this.slots];
    }

    /**
     * 设置道具（用于网络同步）
     */
    setInventoryData(data) {
        this.slots = [...data];
        for (let i = 0; i < this.maxSlots; i++) {
            this.updateSlotUI(i);
        }
    }
}
