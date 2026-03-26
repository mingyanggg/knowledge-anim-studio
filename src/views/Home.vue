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
      <div class="hero-glow" />
      <h1 class="hero-title">让知识动起来</h1>
      <p class="hero-subtitle">
        用动画的方式理解数学、物理、化学 —— 输入知识点，一键生成教学动画
      </p>
      <button class="hero-cta" @click="goToGenerate()">
        ✨ 开始创作
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
/* ---- Hero ---- */
.hero-section {
  position: relative;
  text-align: center;
  padding: 5rem 2rem 4rem;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(0, 212, 255, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  margin: 0 0 1rem;
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: #9ca3af;
  margin: 0 0 2rem;
  max-width: 540px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem;
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  border: none;
  border-radius: 2rem;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 212, 255, 0.35);
}

/* ---- Features ---- */
.features-section {
  padding: 3rem 0;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.feature-card {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  transition: border-color 0.2s, transform 0.2s;
}

.feature-card:hover {
  border-color: #00d4ff;
  transform: translateY(-4px);
}

.feature-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 0.75rem;
}

.feature-title {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 0.5rem;
}

.feature-desc {
  font-size: 0.85rem;
  color: #9ca3af;
  margin: 0;
  line-height: 1.5;
}

/* ---- Templates Section ---- */
.templates-section {
  padding-top: 2rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.section-subtitle {
  font-size: 1rem;
  color: #9ca3af;
  margin: 0;
}

.search-input {
  width: 100%;
  max-width: 480px;
  padding: 0.875rem 1rem;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  color: #fff;
  font-size: 1rem;
  margin-bottom: 1rem;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
}

.search-input::placeholder {
  color: #6b7280;
}

.category-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.category-tab {
  padding: 0.625rem 1.25rem;
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 2rem;
  color: #9ca3af;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.category-tab:hover {
  background: #2a2a4a;
  color: #fff;
}

.category-tab.active {
  background: #00d4ff;
  border-color: #00d4ff;
  color: #0f0f1a;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.template-card {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}

.template-card:hover {
  border-color: #00d4ff;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 212, 255, 0.15);
}

.template-cover {
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #1a1a2e 0%, #2a2a4a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.template-cover::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(0, 212, 255, 0.1) 0%, transparent 70%);
}

.template-emoji {
  font-size: 4rem;
  position: relative;
}

.template-info {
  padding: 1rem;
}

.template-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.template-title {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.template-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.template-badge.free {
  background: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.template-badge.pro {
  background: rgba(124, 58, 237, 0.2);
  color: #7c3aed;
}

.template-desc {
  font-size: 0.85rem;
  color: #9ca3af;
  margin: 0 0 0.75rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-meta {
  display: flex;
  gap: 0.5rem;
}

.meta-tag {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: #2a2a4a;
  border-radius: 0.25rem;
  color: #6b7280;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: #9ca3af;
}

.empty-state span {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}

/* 响应式 */
@media (max-width: 900px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .hero-title {
    font-size: 2.5rem;
  }
}
</style>
