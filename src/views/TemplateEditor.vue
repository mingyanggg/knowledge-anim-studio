<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useTemplateStore } from "../stores/templateStore";
import { generateId } from "../services/database";

interface Template {
  id: string;
  title: string;
  emoji: string;
  category: "数学" | "物理" | "化学";
  description: string;
  complexity: "初级" | "中级" | "高级";
  isPro: boolean;
  defaultParams?: {
    duration: number;
    fps: number;
    resolution: "1080p" | "4k";
  };
  defaultVisualStyle?: string;
  defaultDuration?: number;
}

const templateStore = useTemplateStore();

// 表单状态
const isEditing = ref(false);
const editingTemplate = ref<Template | null>(null);

// 新模板表单
const form = ref({
  title: "",
  emoji: "",
  category: "数学" as Template["category"],
  description: "",
  complexity: "初级" as Template["complexity"],
  isPro: false,
  defaultDuration: 30,
  defaultVisualStyle: "minimal-light",
});

// 常用 emoji 快速选择
const commonEmojis = [
  "📐", "🔢", "📊", "📈", "📉", // 数学
  "⚛️", "⚡", "🔬", "🧪", "🌡️", // 物理
  "🧬", "⚗️", "🔥", "💧", "💎", // 化学
  "🎯", "✨", "🌟", "⭐", "💫", // 通用
];

// 视觉风格预设
const visualStyles = [
  { id: "minimal-light", name: "简约浅色", icon: "🌕" },
  { id: "minimal-dark", name: "简约深色", icon: "🌑" },
  { id: "vibrant", name: "鲜艳活力", icon: "🌈" },
  { id: "professional", name: "专业蓝调", icon: "🔵" },
  { id: "warm", name: "温暖橙调", icon: "🟠" },
];

// 分类筛选
const selectedCategory = ref<string>("全部");
const categories = ["全部", "数学", "物理", "化学"];

// 自定义模板列表（从 localStorage 加载）
const customTemplates = ref<Template[]>([]);
const STORAGE_KEY = "custom-templates";

// 加载自定义模板
const loadCustomTemplates = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      customTemplates.value = JSON.parse(saved);
    }
  } catch {
    customTemplates.value = [];
  }
};

// 保存自定义模板
const saveCustomTemplates = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customTemplates.value));
};

// 合并默认模板和自定义模板
const allTemplates = computed(() => {
  return [...templateStore.templates, ...customTemplates.value];
});

// 筛选后的模板
const filteredTemplates = computed(() => {
  if (selectedCategory.value === "全部") {
    return allTemplates.value;
  }
  return allTemplates.value.filter(t => t.category === selectedCategory.value);
});

// 重置表单
const resetForm = () => {
  form.value = {
    title: "",
    emoji: "",
    category: "数学",
    description: "",
    complexity: "初级",
    isPro: false,
    defaultDuration: 30,
    defaultVisualStyle: "minimal-light",
  };
  isEditing.value = false;
  editingTemplate.value = null;
};

// 开始编辑
const startEdit = (template: Template) => {
  isEditing.value = true;
  editingTemplate.value = template;
  form.value = {
    title: template.title,
    emoji: template.emoji,
    category: template.category,
    description: template.description,
    complexity: template.complexity,
    isPro: template.isPro,
    defaultDuration: template.defaultDuration || 30,
    defaultVisualStyle: template.defaultVisualStyle || "minimal-light",
  };
};

// 保存模板
const handleSave = () => {
  if (!form.value.title.trim() || !form.value.emoji) {
    alert("请填写模板标题和选择图标");
    return;
  }

  const templateData: Template = {
    id: editingTemplate.value?.id || generateId(),
    title: form.value.title.trim(),
    emoji: form.value.emoji,
    category: form.value.category,
    description: form.value.description.trim(),
    complexity: form.value.complexity,
    isPro: form.value.isPro,
    defaultParams: {
      duration: form.value.defaultDuration,
      fps: 60,
      resolution: "1080p",
    },
    defaultVisualStyle: form.value.defaultVisualStyle,
    defaultDuration: form.value.defaultDuration,
  };

  if (isEditing.value && editingTemplate.value) {
    // 更新自定义模板
    const index = customTemplates.value.findIndex(t => t.id === editingTemplate.value!.id);
    if (index !== -1) {
      customTemplates.value[index] = templateData;
    }
  } else {
    // 添加新模板
    customTemplates.value.push(templateData);
  }

  saveCustomTemplates();
  resetForm();
};

// 删除模板
const handleDelete = (id: string) => {
  if (confirm("确定要删除这个模板吗？")) {
    customTemplates.value = customTemplates.value.filter(t => t.id !== id);
    saveCustomTemplates();
  }
};

// 选择 emoji
const selectEmoji = (emoji: string) => {
  form.value.emoji = emoji;
};

onMounted(() => {
  loadCustomTemplates();
});
</script>

<template>
  <div class="template-editor-page">
    <header class="page-header">
      <h1 class="page-title">模板管理</h1>
      <p class="page-subtitle">创建和管理自定义动画模板</p>
    </header>

    <div class="editor-layout">
      <!-- 左侧：表单 -->
      <div class="form-panel">
        <div class="panel-header">
          <h2 class="panel-title">{{ isEditing ? '编辑模板' : '新建模板' }}</h2>
          <button v-if="isEditing" class="cancel-button" @click="resetForm">
            取消编辑
          </button>
        </div>

        <div class="form-content">
          <!-- 基本信息 -->
          <div class="form-section">
            <h3 class="section-title">基本信息</h3>

            <div class="form-group">
              <label class="form-label">模板标题 *</label>
              <input
                v-model="form.title"
                type="text"
                class="form-input"
                placeholder="例如：二次函数图像"
              />
            </div>

            <div class="form-group">
              <label class="form-label">图标 Emoji *</label>
              <div class="emoji-picker">
                <button
                  v-for="emoji in commonEmojis"
                  :key="emoji"
                  class="emoji-button"
                  :class="{ selected: form.emoji === emoji }"
                  @click="selectEmoji(emoji)"
                >
                  {{ emoji }}
                </button>
                <input
                  v-model="form.emoji"
                  type="text"
                  class="emoji-input"
                  placeholder="或输入其他 emoji"
                  maxlength="2"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">分类 *</label>
              <select v-model="form.category" class="form-select">
                <option value="数学">数学</option>
                <option value="物理">物理</option>
                <option value="化学">化学</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">描述</label>
              <textarea
                v-model="form.description"
                class="form-textarea"
                rows="3"
                placeholder="简要描述模板用途..."
              ></textarea>
            </div>
          </div>

          <!-- 难度设置 -->
          <div class="form-section">
            <h3 class="section-title">难度等级</h3>
            <div class="complexity-options">
              <button
                v-for="level in ['初级', '中级', '高级']"
                :key="level"
                class="complexity-button"
                :class="{ selected: form.complexity === level }"
                @click="form.complexity = level as Template['complexity']"
              >
                {{ level }}
              </button>
            </div>
          </div>

          <!-- 默认参数 -->
          <div class="form-section">
            <h3 class="section-title">默认参数</h3>

            <div class="form-group">
              <label class="form-label">视觉风格</label>
              <div class="style-grid">
                <button
                  v-for="style in visualStyles"
                  :key="style.id"
                  class="style-card"
                  :class="{ selected: form.defaultVisualStyle === style.id }"
                  @click="form.defaultVisualStyle = style.id"
                >
                  <span class="style-icon">{{ style.icon }}</span>
                  <span class="style-name">{{ style.name }}</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">默认时长：{{ form.defaultDuration }}秒</label>
              <input
                v-model.number="form.defaultDuration"
                type="range"
                min="10"
                max="120"
                step="5"
                class="range-input"
              />
            </div>

            <div class="form-group">
              <label class="form-checkbox">
                <input
                  v-model="form.isPro"
                  type="checkbox"
                />
                <span>Pro 专属模板</span>
              </label>
            </div>
          </div>

          <!-- 保存按钮 -->
          <div class="form-actions">
            <button class="save-button" @click="handleSave">
              {{ isEditing ? '保存修改' : '创建模板' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧：模板列表 -->
      <div class="list-panel">
        <div class="panel-header">
          <h2 class="panel-title">模板库</h2>
          <!-- 分类筛选 -->
          <div class="category-tabs">
            <button
              v-for="cat in categories"
              :key="cat"
              class="category-tab"
              :class="{ active: selectedCategory === cat }"
              @click="selectedCategory = cat"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <div class="template-list">
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            class="template-item"
          >
            <div class="template-emoji">{{ template.emoji }}</div>
            <div class="template-info">
              <div class="template-header">
                <h3 class="template-title">{{ template.title }}</h3>
                <div class="template-badges">
                  <span v-if="template.isPro" class="badge pro">Pro</span>
                  <span class="badge">{{ template.complexity }}</span>
                </div>
              </div>
              <p class="template-desc">{{ template.description }}</p>
              <div class="template-meta">
                <span class="meta-tag">{{ template.category }}</span>
                <span v-if="template.defaultDuration" class="meta-tag">
                  {{ template.defaultDuration }}秒
                </span>
              </div>
            </div>
            <div class="template-actions">
              <button
                v-if="customTemplates.find(t => t.id === template.id)"
                class="action-button edit"
                @click="startEdit(template)"
              >
                编辑
              </button>
              <button
                v-if="customTemplates.find(t => t.id === template.id)"
                class="action-button delete"
                @click="handleDelete(template.id)"
              >
                删除
              </button>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredTemplates.length === 0" class="empty-state">
          <span class="empty-icon">📦</span>
          <p>该分类下暂无模板</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-editor-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-page);
}

/* ==================== 页面头部 ==================== */

.page-header {
  margin-bottom: var(--spacing-relaxed);
}

.page-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.page-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

/* ==================== 布局 ==================== */

.editor-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-component);
  align-items: start;
}

/* ==================== 面板 ==================== */

.form-panel,
.list-panel {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--spacing-card);
  box-shadow: var(--shadow-card);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--spacing-component);
}

.panel-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.cancel-button {
  padding: 6px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.cancel-button:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

/* ==================== 表单 ==================== */

.form-section {
  margin-bottom: var(--spacing-component);
  padding-bottom: var(--spacing-component);
  border-bottom: 1px solid var(--border);
}

.form-section:last-of-type {
  border-bottom: none;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-component) 0;
}

.form-group {
  margin-bottom: var(--spacing-component);
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-size: 15px;
  font-family: inherit;
  transition: all var(--transition-base) var(--ease-apple);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

/* Emoji 选择器 */
.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.emoji-button {
  width: 44px;
  height: 44px;
  padding: 0;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  font-size: 24px;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.emoji-button:hover {
  background-color: var(--bg-tertiary);
  transform: scale(1.1);
}

.emoji-button.selected {
  background-color: rgba(0, 122, 255, 0.1);
  border-color: var(--accent);
}

.emoji-input {
  flex: 1;
  min-width: 120px;
}

/* 难度选择 */
.complexity-options {
  display: flex;
  gap: 8px;
}

.complexity-button {
  flex: 1;
  padding: 10px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.complexity-button:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.complexity-button.selected {
  background-color: var(--accent);
  border-color: var(--accent);
  color: white;
}

/* 风格网格 */
.style-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.style-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.style-card:hover {
  border-color: var(--accent);
  background-color: var(--bg-tertiary);
}

.style-card.selected {
  border-color: var(--accent);
  background-color: rgba(0, 122, 255, 0.08);
}

.style-icon {
  font-size: 24px;
}

.style-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
}

/* Range input */
.range-input {
  width: 100%;
  height: 6px;
  background-color: var(--bg-tertiary);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background-color: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.range-input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background-color: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

/* Checkbox */
.form-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.form-checkbox input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-checkbox span {
  font-size: 13px;
  color: var(--text-primary);
}

/* 表单操作 */
.form-actions {
  margin-top: var(--spacing-component);
}

.save-button {
  width: 100%;
  padding: 12px;
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-button);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.save-button:hover {
  background-color: var(--accent-hover);
  transform: scale(1.01);
}

.save-button:active {
  transform: scale(0.99);
}

/* ==================== 模板列表 ==================== */

.category-tabs {
  display: flex;
  gap: 6px;
}

.category-tab {
  padding: 6px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.category-tab:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.category-tab.active {
  background-color: var(--accent);
  border-color: var(--accent);
  color: white;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-component);
  max-height: 600px;
  overflow-y: auto;
}

.template-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  transition: all var(--transition-base) var(--ease-apple);
}

.template-item:hover {
  border-color: var(--accent);
  background-color: var(--bg-tertiary);
}

.template-emoji {
  font-size: 40px;
  line-height: 1;
  flex-shrink: 0;
}

.template-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.template-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.template-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.template-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.badge {
  padding: 3px 8px;
  border-radius: var(--radius-small);
  font-size: 10px;
  font-weight: 600;
  background-color: var(--bg-tertiary);
  color: var(--text-tertiary);
}

.badge.pro {
  background-color: rgba(0, 122, 255, 0.1);
  color: var(--accent);
}

.template-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 11px;
  padding: 3px 8px;
  background-color: var(--bg-tertiary);
  border-radius: var(--radius-small);
  color: var(--text-tertiary);
}

.template-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}

.action-button {
  padding: 6px 12px;
  border-radius: var(--radius-small);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
  white-space: nowrap;
}

.action-button.edit {
  background-color: var(--accent);
  border: 1px solid var(--accent);
  color: white;
}

.action-button.edit:hover {
  background-color: var(--accent-hover);
}

.action-button.delete {
  background-color: transparent;
  border: 1px solid rgba(255, 59, 48, 0.3);
  color: var(--error);
}

.action-button.delete:hover {
  background-color: rgba(255, 59, 48, 0.08);
}

/* ==================== 空状态 ==================== */

.empty-state {
  text-align: center;
  padding: 64px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

/* ==================== 响应式 ==================== */

@media (max-width: 1024px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }

  .list-panel {
    position: static;
  }
}

@media (max-width: 600px) {
  .template-item {
    flex-direction: column;
  }

  .template-emoji {
    font-size: 32px;
  }

  .style-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
