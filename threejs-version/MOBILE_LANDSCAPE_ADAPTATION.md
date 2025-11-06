# 手机横屏适配说明

本文档说明了狩猎游戏 Three.js 版本的手机横屏适配功能。

## 适配特性

### 1. 横屏强制提示
- 当用户在移动设备上使用竖屏模式时，会显示提示信息要求旋转设备
- 竖屏模式下游戏画面会被模糊处理，确保最佳游戏体验

### 2. 触摸控制
- **屏幕滑动瞄准**：在屏幕上滑动手指即可控制准星移动
- **虚拟按钮**：
  - 🔭 瞄准按钮：开启/关闭瞄准镜（右下角蓝色按钮）
  - 🎯 射击按钮：射击（右下角红色大按钮）
  - +/- 缩放按钮：调整瞄准镜缩放等级

### 3. 响应式布局
- UI 元素在横屏模式下自动调整大小和位置
- HUD 信息（分数、时间等）缩小以节省屏幕空间
- 菜单按钮和文字适配小屏幕

### 4. 移动端优化
- 禁用用户缩放，防止意外操作
- 禁用长按选择文本
- 优化触摸响应速度
- 全屏模式支持（iOS Safari）

## 技术实现

### HTML 变更
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="screen-orientation" content="landscape">
```

### CSS 响应式设计
- 使用 `@media (max-width: 768px)` 检测移动设备
- 使用 `@media (orientation: landscape)` 针对横屏优化
- 使用 `@media (orientation: portrait)` 显示竖屏提示

### JavaScript 触摸支持
- `InputManager` 类新增触摸事件处理
- 自动检测移动设备并启用虚拟控制按钮
- 触摸移动模拟鼠标移动用于瞄准
- 虚拟按钮模拟键盘/鼠标输入

## 控制说明

### 桌面端控制（保持不变）
- 鼠标移动：瞄准
- 右键/Shift：开启瞄准镜
- 滚轮：调整缩放
- 左键/空格：射击
- P：暂停

### 移动端控制（新增）
- 触摸滑动：瞄准
- 蓝色瞄准按钮：开启/关闭瞄准镜（切换状态）
- 红色射击按钮：射击（按住射击，松开停止）
- +/- 按钮：调整瞄准镜缩放
- （暂停功能可通过菜单访问）

## 测试建议

### 在真实设备上测试
1. 使用手机浏览器访问游戏
2. 旋转设备至横屏模式
3. 测试触摸滑动瞄准功能
4. 测试虚拟按钮功能

### Chrome DevTools 模拟测试
1. 打开 Chrome 开发者工具（F12）
2. 点击设备模拟图标（Toggle device toolbar）
3. 选择移动设备（如 iPhone 12 Pro）
4. 将设备方向设置为横屏（Landscape）
5. 测试触摸功能

### 浏览器兼容性
- Chrome/Safari/Firefox 移动版
- iOS Safari（iOS 13+）
- Android Chrome（Android 8+）

## 已知限制

1. **指针锁定**：移动端浏览器可能不支持指针锁定 API，因此使用触摸滑动代替
2. **全屏模式**：某些浏览器需要用户手动触发全屏
3. **屏幕旋转锁定**：某些设备可能锁定了屏幕方向，需要用户手动解锁

## 未来改进方向

- [ ] 添加虚拟摇杆支持（左侧控制区域）
- [ ] 支持多点触控（双指缩放）
- [ ] 添加触摸反馈（震动）
- [ ] 优化触摸灵敏度设置
- [ ] 支持横屏左右方向自适应
- [ ] 添加控制按钮位置自定义功能

## 文件修改清单

### 修改的文件
1. `index.html` - 添加移动端 meta 标签和虚拟控制按钮
2. `css/style.css` - 添加移动端响应式样式和虚拟控制样式
3. `js/core/InputManager.js` - 添加触摸事件处理和虚拟按钮支持

### 新增功能
- 移动设备检测
- 触摸事件处理（touchstart, touchmove, touchend）
- 虚拟按钮事件绑定
- 触摸移动转换为鼠标移动
- 竖屏提示覆盖层

## 调试技巧

### 查看移动端日志
在移动设备上调试时，可以使用：
- iOS Safari：连接 Mac 使用 Safari 开发者工具
- Android Chrome：使用 chrome://inspect 远程调试

### 触摸事件调试
在 `InputManager.js` 中取消注释以下代码可以看到触摸移动数据：
```javascript
console.log('Touch movement:', deltaX, deltaY);
```

## 性能优化建议

1. 降低渲染分辨率（移动设备性能有限）
2. 减少敌人数量
3. 简化阴影效果
4. 使用较低的纹理质量

---

**最后更新时间**：2025-11-06
**适配版本**：v1.1.0
