<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useTemplateStore } from "../stores/templateStore";
import { getCases, getNarrationStyleById, getVisualStyleById, type Case } from "../services/caseService";

const router = useRouter();
const templateStore = useTemplateStore();

const searchQuery = ref("");
const selectedCategory = ref("全部");
const categories = ["全部", "数学", "物理", "化学"];

// 案例数据
const cases = ref<Case[]>([]);
const casesLoading = ref(true);

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

// 使用案例创建生成
const useCase = (caseItem: Case) => {
  const desc = caseItem.prompt || caseItem.description || "";
  const style = caseItem.narration_style || "";
  router.push(`/generate?desc=${encodeURIComponent(desc)}&style=${style}`);
};

// 获取解说风格信息
const getNarrationInfo = (styleId: string) => {
  return getNarrationStyleById(styleId);
};

// 获取视觉风格信息
const getVisualInfo = (styleId: string) => {
  return getVisualStyleById(styleId);
};

// 加载案例
onMounted(async () => {
  try {
    cases.value = await getCases();
  } catch (error) {
    console.error('Failed to load cases:', error);
  } finally {
    casesLoading.value = false;
  }
});

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

    <!-- ====== 灵感案例 ====== -->
    <section class="cases-section">
      <header class="section-header">
        <h2 class="section-title">灵感案例</h2>
        <p class="section-subtitle">浏览精选案例，获取创作灵感</p>
      </header>

      <!-- 案例网格 -->
      <div v-if="casesLoading" class="loading-cases">
        <div class="spinner" />
        <p>加载案例中...</p>
      </div>

      <div v-else class="case-grid">
        <div
          v-for="caseItem in cases"
          :key="caseItem.id"
          class="case-card"
          @click="useCase(caseItem)"
        >
          <!-- 解说风格标签 -->
          <div class="case-badge">
            <span v-if="caseItem.narration_style">
              {{ getNarrationInfo(caseItem.narration_style)?.icon || '💡' }}
              {{ getNarrationInfo(caseItem.narration_style)?.name || '默认风格' }}
            </span>
          </div>

          <!-- 案例内容 -->
          <div class="case-content">
            <h3 class="case-title">{{ caseItem.title }}</h3>
            <p class="case-desc">{{ caseItem.description }}</p>
          </div>

          <!-- 视觉风格标签 -->
          <div class="case-meta">
            <span v-if="caseItem.visual_style" class="meta-tag">
              {{ getVisualInfo(caseItem.visual_style)?.icon || '🎨' }}
              {{ getVisualInfo(caseItem.visual_style)?.name || '默认视觉' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!casesLoading && cases.length === 0" class="empty-state">
        <span>📦</span>
        <p>暂无案例</p>
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

/* ==================== 案例区域 ==================== */

.cases-section {
  padding-top: var(--spacing-relaxed);
}

.case-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-component);
}

.case-card {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 20px;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.case-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
  border-color: var(--accent);
}

.case-badge {
  align-self: flex-start;
}

.case-badge span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: var(--accent);
  color: white;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 600;
}

.case-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.case-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.4;
}

.case-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.case-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.case-meta .meta-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background-color: var(--bg-secondary);
  border-radius: var(--radius-small);
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.loading-cases {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-component);
  padding: 64px 20px;
  color: var(--text-secondary);
}

/* ==================== 响应式 ==================== */

@media (max-width: 900px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .hero-title {
    font-size: 36px;
  }

  .case-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}

@media (max-width: 600px) {
  .features-grid {
    grid-template-columns: 1fr;
  }

  .hero-title {
    font-size: 28px;
  }

  .case-grid {
    grid-template-columns: 1fr;
  }
}
</style>
