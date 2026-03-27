<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useTemplateStore } from "../stores/templateStore";

const router = useRouter();
const templateStore = useTemplateStore();

const searchQuery = ref("");
const selectedCategory = ref("全部");
const categories = ["全部", "数学", "物理", "化学"];

// 按分类过滤 + 搜索
const filteredTemplates = computed(() => {
  let list = templateStore.templates;
  if (selectedCategory.value !== "全部") {
    list = list.filter((t) => t.category === selectedCategory.value);
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
    );
  }
  return list;
});

// 跳转到生成页
const goToGenerate = (templateId?: string) => {
  const query = templateId ? `?template=${templateId}` : "";
  router.push(`/generate${query}`);
};

// 首页核心卖点
const features = [
  { icon: "🤖", title: "AI 智能生成", desc: "输入知识点描述，AI 自动生成精美动画脚本" },
  { icon: "👁️", title: "实时预览", desc: "边编辑边预览，所见即所得的动画效果" },
  { icon: "🎬", title: "高清导出", desc: "支持 1080p / 4K 分辨率，满足不同场景需求" },
  { icon: "📦", title: "丰富模板", desc: "覆盖数学、物理、化学三大领域，开箱即用" },
];
</script>

<template>
  <div class="home-page">
    <!-- ====== Hero 区域 ====== -->
    <section class="hero-section">
      <h1 class="hero-title">让知识动起来</h1>
      <p class="hero-subtitle">
        用动画的方式理解数学、物理、化学 —— 输入知识点，一键生成教学动画
      </p>
      <button class="hero-cta" @click="goToGenerate()">
        开始创作
      </button>
    </section>

    <!-- ====== 特色功能 ====== -->
    <section class="features-section">
      <div class="features-grid">
        <div v-for="f in features" :key="f.title" class="feature-card">
          <span class="feature-icon">{{ f.icon }}</span>
          <h3 class="feature-title">{{ f.title }}</h3>
          <p class="feature-desc">{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <!-- ====== 模板预览网格 ====== -->
    <section class="templates-section">
      <header class="section-header">
        <h2 class="section-title">模板库</h2>
        <p class="section-subtitle">选择一个模板，快速开始创作</p>
      </header>

      <!-- 搜索 -->
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索模板..."
        class="search-input"
      />

      <!-- 分类标签 -->
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

      <!-- 模板网格 -->
      <div class="template-grid">
        <div
          v-for="tpl in filteredTemplates"
          :key="tpl.id"
          class="template-card"
          @click="goToGenerate(tpl.id)"
        >
          <div class="template-cover">
            <span class="template-emoji">{{ tpl.emoji }}</span>
          </div>
          <div class="template-info">
            <div class="template-header">
              <h3 class="template-title">{{ tpl.title }}</h3>
              <span
                class="template-badge"
                :class="tpl.isPro ? 'pro' : 'free'"
              >
                {{ tpl.isPro ? "Pro" : "免费" }}
              </span>
            </div>
            <p class="template-desc">{{ tpl.description }}</p>
            <div class="template-meta">
              <span class="meta-tag">{{ tpl.category }}</span>
              <span class="meta-tag">{{ tpl.complexity }}</span>
              <span class="meta-tag">{{ tpl.duration }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredTemplates.length === 0" class="empty-state">
        <span>🔍</span>
        <p>没有找到匹配的模板</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-page);
}

/* ==================== Hero 区域 ==================== */

.hero-section {
  text-align: center;
  padding: 60px 20px;
}

.hero-title {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 16px;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  font-size: 17px;
  color: var(--text-secondary);
  margin: 0 0 32px;
  max-width: 540px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 32px;
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-button);
  color: white;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.hero-cta:hover {
  background-color: var(--accent-hover);
  transform: scale(1.02);
}

.hero-cta:active {
  transform: scale(0.98);
}

/* ==================== 特色功能 ==================== */

.features-section {
  padding: var(--spacing-relaxed) 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--spacing-component);
}

.feature-card {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--spacing-card);
  text-align: center;
  transition: all var(--transition-base) var(--ease-apple);
  box-shadow: var(--shadow-card);
}

.feature-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.feature-icon {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
}

.feature-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.feature-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
}

/* ==================== 模板区域 ==================== */

.templates-section {
  padding-top: var(--spacing-relaxed);
}

.section-header {
  margin-bottom: var(--spacing-component);
}

.section-title {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.section-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0;
}

.search-input {
  width: 100%;
  max-width: 480px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-size: 15px;
  margin-bottom: var(--spacing-component);
  transition: all var(--transition-base) var(--ease-apple);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: var(--spacing-relaxed);
}

.category-tab {
  padding: 8px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: 13px;
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

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-component);
}

.template-card {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
  box-shadow: var(--shadow-card);
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.template-cover {
  aspect-ratio: 16 / 9;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--border);
}

.template-emoji {
  font-size: 64px;
}

.template-info {
  padding: 16px;
}

.template-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.template-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.template-badge {
  padding: 4px 8px;
  border-radius: var(--radius-small);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.template-badge.free {
  background-color: rgba(52, 199, 89, 0.1);
  color: var(--success);
}

.template-badge.pro {
  background-color: rgba(10, 132, 255, 0.1);
  color: var(--accent);
}

.template-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 12px;
  line-height: 1.5;
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
  padding: 4px 8px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-small);
  color: var(--text-tertiary);
}

.empty-state {
  text-align: center;
  padding: 64px 20px;
  color: var(--text-secondary);
}

.empty-state span {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

/* ==================== 响应式 ==================== */

@media (max-width: 900px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .hero-title {
    font-size: 36px;
  }
}

@media (max-width: 600px) {
  .features-grid {
    grid-template-columns: 1fr;
  }

  .hero-title {
    font-size: 28px;
  }
}
</style>
