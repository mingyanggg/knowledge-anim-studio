# Knowledge Anim Studio — Apple-inspired Design System

## 设计理念
简约、大气、可靠。参考 iOS/macOS 原生应用的设计语言。
不模仿，但学习其核心原则：大量留白、清晰的层次、克制的装饰、精致的细节。

## 色彩系统

### 浅色模式（默认）
```css
--bg-primary: #ffffff
--bg-secondary: #f5f5f7          /* Apple 标志性浅灰 */
--bg-tertiary: #e8e8ed
--bg-elevated: #ffffff            /* 卡片/浮层 */
--text-primary: #1d1d1f
--text-secondary: #6e6e73
--text-tertiary: #aeaeb2
--accent: #007aff                 /* iOS 蓝 */
--accent-hover: #0066d6
--border: rgba(0, 0, 0, 0.08)
--shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
--shadow-elevated: 0 4px 24px rgba(0,0,0,0.08)
```

### 深色模式
```css
--bg-primary: #1c1c1e
--bg-secondary: #2c2c2e
--bg-tertiary: #3a3a3c
--bg-elevated: #2c2c2e
--text-primary: #f5f5f7
--text-secondary: #98989d
--text-tertiary: #636366
--accent: #0a84ff
--accent-hover: #409cff
--border: rgba(255, 255, 255, 0.08)
--shadow-card: 0 1px 3px rgba(0,0,0,0.2)
--shadow-elevated: 0 4px 24px rgba(0,0,0,0.3)
```

## 字体
```css
--font-display: -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif
--font-body: -apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif
--font-mono: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace
```

字号层级：
- h1: 28px, font-weight 700
- h2: 22px, font-weight 600
- h3: 17px, font-weight 600
- body: 15px, font-weight 400
- caption: 13px, font-weight 400
- small: 11px, font-weight 500

## 间距
基准单位 4px
- 页面内边距: 24px
- 卡片内边距: 20px
- 组件间距: 16px
- 紧凑间距: 8px
- 宽松间距: 32px

## 圆角
- 按钮: 12px
- 卡片: 16px
- 输入框: 10px
- 标签/胶囊: 100px (全圆)
- 小元素: 8px

## 动效
- transition-duration: 200ms（常规）、350ms（复杂动画）
- transition-timing: cubic-bezier(0.25, 0.1, 0.25, 1)（Apple 标准曲线）
- hover: 微妙的背景色变化或 scale(1.01)，不用阴影膨胀
- 按钮: hover 时背景色加深，active 时 scale(0.97)

## 组件规范

### 卡片
- 背景: var(--bg-elevated)
- 边框: 1px solid var(--border)
- 圆角: 16px
- 阴影: var(--shadow-card)
- 内边距: 20px
- 不要填充过满，内容要透气

### 按钮
- 主按钮: accent 色背景，白色文字，圆角 12px，高度 44px
- 次按钮: transparent 背景，accent 色文字，1px border
- 悬浮效果: 简单的颜色过渡
- 无渐变背景按钮（这是旧设计）

### 输入框
- 背景: var(--bg-secondary)
- 边框: 1px solid var(--border)，focus 时 border 变 accent 色
- 圆角: 10px
- 高度: 44px（单行）/ min-height 120px（多行）
- focus 时: box-shadow 0 0 0 3px rgba(0,122,255,0.15)

### 选择器/下拉
- 与输入框样式一致
- 选中项用 accent 色标记

### 进度条
- 高度: 4px
- 背景: var(--bg-tertiary)
- 填充: accent 色
- 圆角: 2px

### 标签/徽章
- 胶囊形状 (border-radius: 100px)
- 小字号 13px
- 半透明背景色

## 侧边栏
- 宽度: 260px
- 背景: var(--bg-secondary)
- 导航项: 圆角 10px 的悬浮高亮，选中时 accent 色背景
- 图标 + 文字，图标 20px

## 页面布局
- 顶部: 页面标题（左）+ 操作按钮（右）
- 内容区: 不拥挤，卡片之间 16-24px 间距
- 响应式: 大屏双栏，小屏单栏

## 核心转变（相比旧设计）
1. **去掉深空科幻主题** → 改为 Apple 系统级设计
2. **去掉青紫渐变按钮** → 改为纯色 accent 按钮
3. **去掉 #1a1a2e 深色背景** → 改为浅色/深色双模式
4. **加大留白** → 内容不挤，呼吸感
5. **精简装饰** → 不用发光效果、渐变背景
6. **统一的 CSS 变量系统** → 全局一致
