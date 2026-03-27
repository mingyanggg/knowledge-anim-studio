# Knowledge Anim Studio — 产品完善路线图

## 架构总览

```
用户输入知识点 + 选择解说风格 + 选择视觉风格
        ↓
  Gemini AI 生成 Manim Python 脚本（解说风格控制 prompt）
        ↓
  Manim 渲染引擎执行脚本 → 输出 mp4 视频
        ↓
  SQLite 存储项目/视频元数据 → 软件内播放预览 → 导出
```

## 风格体系（两轴独立）

### 视觉风格（已有，控制画面配色）
- 深空科技 / 经典极简 / 活力学院 / 数学经典

### 解说风格（新增，控制 AI 脚本文案风格）
| ID | 名称 | Emoji | 说明 | 典型场景 |
|----|------|-------|------|----------|
| classroom | 课堂讲解 | 🎓 | 老师上课感，循序渐进，重点突出 | 学生复习、教学课件 |
| popular-science | 科普传播 | 📢 | 大白话讲知识，生动有趣 | 自媒体视频、公众号配视频 |
| academic | 学术报告 | 🎯 | 严谨专业，重公式推导和逻辑链 | 论文答辩、学术分享 |
| fun-animation | 趣味动画 | 🎬 | 生活类比讲知识，轻松幽默 | 吸引注意力、低门槛入门 |
| minimal-tech | 极简科技 | 🖥️ | 少即是多，大字标题，高级感 | 产品发布、演示展示 |
| storytelling | 故事叙述 | 📖 | 从故事切入，有起承转合 | 知识科普、引人入胜 |

## 开发阶段

### Phase 1：基础可用
- [ ] **P1-1** SQLite 本地数据库（Rust 侧 rusqlite + Tauri Command）
  - 表：projects, videos, templates, style_presets, cases, settings
  - 数据库路径：~/Library/Application Support/knowledge-anim-studio/studio.db
  - 自动建表、迁移
- [ ] **P1-2** 解说风格系统
  - 前端风格选择 UI（Generate.vue 里，视觉风格下方）
  - 风格数据结构定义（TypeScript + Rust）
  - 生成时传入风格参数
- [ ] **P1-3** 真实 AI 接入（Gemini API）
  - Rust 侧调用 Gemini API 替换 mock
  - prompt 模板：根据解说风格 + 视觉风格 + 用户描述生成 Manim 脚本
  - 错误处理 + 重试机制
- [ ] **P1-4** 视频预览播放器
  - Render.vue 增加 `<video>` 播放器
  - 用 `convertFileSrc()` 转换本地路径
  - 播放/暂停、进度条、全屏
  - 渲染完成后自动预览

### Phase 2：核心卖点
- [ ] **P2-1** 案例库系统
  - SQLite cases 表 + 前端展示
  - 精选 8-10 个案例（带风格标签、描述、提示词）
  - 一键复用案例的提示词和风格设置
  - 生成页展示灵感案例区块
- [ ] **P2-2** localStorage → SQLite 数据迁移
  - 现有 settings、jobs 数据迁入 SQLite
  - 移除 localStorage 依赖

### Phase 3：体验优化
- [ ] 案例缩略图预览
- [ ] 导出 GIF
- [ ] 模板编辑器
- [ ] 自定义风格配色
