<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useTemplateStore } from "../stores/templateStore";

const router = useRouter();
const templateStore = useTemplateStore();

const searchQuery = ref("");
const selectedCategory = ref("全部");

const categories = ["全部", "数学", "物理", "化学"];

const filteredTemplates = computed(() => {
  let templates = templateStore.templates;

  if (selectedCategory.value !== "全部") {
    templates = templates.filter(t => t.category === selectedCategory.value);
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    templates = templates.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query)
    );
  }

  return templates;
});

const selectTemplate = (templateId: string) => {
  router.push(`/generate?template=${templateId}`);
};
</script>

<template>
  <div class="home-page">
    <!-- Header -->
    <header class="page-header">
      <h2 class="page-title">模板库</h2>
      <p class="page-subtitle">选择一个模板开始创建你的知识动画</p>
    </header>

    <!-- Search Bar -->
    <div class="search-section">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索模板..."
        class="search-input"
      />
    </div>

    <!-- Category Tabs -->
    <div class="category-tabs">
      <button
        v-for="category in categories"
        :key="category"
        class="category-tab"
        :class="{ active: selectedCategory === category }"
        @click="selectedCategory = category"
      >
        {{ category }}
      </button>
    </div>

    <!-- Template Grid -->
    <div class="template-grid">
      <div
        v-for="template in filteredTemplates"
        :key="template.id"
        class="template-card"
        @click="selectTemplate(template.id)"
      >
        <div class="template-cover">
          <span class="template-emoji">{{ template.emoji }}</span>
        </div>
        <div class="template-info">
          <div class="template-header">
            <h3 class="template-title">{{ template.title }}</h3>
            <span
              class="template-badge"
              :class="template.isPro ? 'pro' : 'free'"
            >
              {{ template.isPro ? 'Pro' : '免费' }}
            </span>
          </div>
          <p class="template-description">{{ template.description }}</p>
          <div class="template-meta">
            <span class="template-category">{{ template.category }}</span>
            <span class="template-duration">{{ template.duration }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="filteredTemplates.length === 0" class="empty-state">
      <span class="empty-icon">🔍</span>
      <p>没有找到匹配的模板</p>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1rem;
  color: #9ca3af;
  margin: 0;
}

.search-section {
  margin-bottom: 1.5rem;
}

.search-input {
  width: 100%;
  padding: 0.875rem 1rem;
  background-color: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 1rem;
  transition: all 0.2s;
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
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.category-tab {
  padding: 0.625rem 1.25rem;
  background-color: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 2rem;
  color: #9ca3af;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.category-tab:hover {
  background-color: #2a2a4a;
  color: #ffffff;
}

.category-tab.active {
  background-color: #00d4ff;
  border-color: #00d4ff;
  color: #0f0f1a;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.template-card {
  background-color: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 0.75rem;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
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
  overflow: hidden;
}

.template-cover::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(0, 212, 255, 0.1) 0%, transparent 70%);
}

.template-emoji {
  font-size: 4rem;
  position: relative;
  z-index: 1;
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
  margin: 0;
  color: #ffffff;
}

.template-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.template-badge.free {
  background-color: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.template-badge.pro {
  background-color: rgba(124, 58, 237, 0.2);
  color: #7c3aed;
}

.template-description {
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.template-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.template-category {
  padding: 0.25rem 0.5rem;
  background-color: #2a2a4a;
  border-radius: 0.25rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  display: block;
}

.empty-state p {
  font-size: 1rem;
  color: #9ca3af;
  margin: 0;
}
</style>
