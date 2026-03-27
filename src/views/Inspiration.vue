<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { getCases, getNarrationStyleById, getVisualStyleById, type Case } from "../services/caseService";

const router = useRouter();

// 搜索和筛选
const searchQuery = ref("");
const selectedStyleFilter = ref("全部");

// 案例数据
const cases = ref<Case[]>([]);
const loading = ref(true);

// 获取所有可用的解说风格
const narrationStyles = [
  { id: "classroom", name: "课堂讲解", icon: "🎓" },
  { id: "popular-science", name: "科普传播", icon: "📢" },
  { id: "academic", name: "学术报告", icon: "🎯" },
  { id: "fun-animation", name: "趣味动画", icon: "🎬" },
  { id: "minimal-tech", name: "极简科技", icon: "🖥️" },
  { id: "storytelling", name: "故事叙述", icon: "📖" },
];

// 筛选选项
const filterOptions = ["全部", ...narrationStyles.map(s => s.name)];

// 过滤后的案例
const filteredCases = ref<Case[]>([]);

// 计算过滤后的案例列表
const applyFilters = () => {
  let filtered = cases.value;

  // 按搜索关键词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(c =>
      c.title.toLowerCase().includes(query) ||
      (c.description && c.description.toLowerCase().includes(query))
    );
  }

  // 按解说风格过滤
  if (selectedStyleFilter.value !== "全部") {
    const style = narrationStyles.find(s => s.name === selectedStyleFilter.value);
    if (style) {
      filtered = filtered.filter(c => c.narration_style === style.id);
    }
  }

  filteredCases.value = filtered;
};

// 监听筛选条件变化
const handleSearchChange = () => {
  applyFilters();
};

// 使用案例
const useCase = (caseItem: Case) => {
  const desc = caseItem.prompt || caseItem.description || "";
  router.push({
    path: "/create",
    query: { desc, style: caseItem.narration_style }
  });
};

// 获取风格信息
const getNarrationInfo = (styleId: string) => {
  return getNarrationStyleById(styleId);
};

const getVisualInfo = (styleId: string) => {
  return getVisualStyleById(styleId);
};

// 返回创作页
const goBack = () => {
  router.push("/create");
};

// 导航到其他页面
const goToHistory = () => {
  router.push("/history");
};

const goToSettings = () => {
  router.push("/settings");
};

// 加载案例
onMounted(async () => {
  try {
    cases.value = await getCases();
    applyFilters();
  } catch (error) {
    console.error('Failed to load cases:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="inspiration-page">
    <!-- Header -->
    <header class="page-header">
      <button class="back-button" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12 4L6 10L12 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回
      </button>
      <h1 class="page-title">灵感库</h1>
      <nav class="header-nav">
        <button class="nav-link" @click="goToHistory">历史</button>
        <button class="nav-link" @click="goToSettings">设置</button>
      </nav>
    </header>

    <!-- Content -->
    <main class="page-content">
      <!-- Search bar -->
      <div class="search-section">
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索案例..."
          @input="handleSearchChange"
        />
      </div>

      <!-- Filter tabs -->
      <div class="filter-section">
        <button
          v-for="filter in filterOptions"
          :key="filter"
          class="filter-tab"
          :class="{ active: selectedStyleFilter === filter }"
          @click="selectedStyleFilter = filter; applyFilters()"
        >
          {{ filter }}
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载案例中...</p>
      </div>

      <!-- Cases grid -->
      <div v-else-if="filteredCases.length > 0" class="cases-grid">
        <div
          v-for="caseItem in filteredCases"
          :key="caseItem.id"
          class="case-card"
          @click="useCase(caseItem)"
        >
          <!-- Narration style badge -->
          <div class="case-badge">
            <span v-if="caseItem.narration_style">
              {{ getNarrationInfo(caseItem.narration_style)?.icon || '💡' }}
              {{ getNarrationInfo(caseItem.narration_style)?.name || '默认风格' }}
            </span>
          </div>

          <!-- Case content -->
          <div class="case-content">
            <h3 class="case-title">{{ caseItem.title }}</h3>
            <p class="case-desc">{{ caseItem.description }}</p>
          </div>

          <!-- Visual style tag -->
          <div class="case-meta">
            <span v-if="caseItem.visual_style" class="meta-tag">
              {{ getVisualInfo(caseItem.visual_style)?.icon || '🎨' }}
              {{ getVisualInfo(caseItem.visual_style)?.name || '默认视觉' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state">
        <span class="empty-icon">🔍</span>
        <h3>没有找到匹配的案例</h3>
        <p>尝试调整搜索词或筛选条件</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* ==================== Page Layout ==================== */

.inspiration-page {
  min-height: 100vh;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

/* ==================== Header ==================== */

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.back-button:hover {
  background-color: var(--bg-tertiary);
}

.page-title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.header-nav {
  display: flex;
  gap: 4px;
}

.nav-link {
  padding: 8px 16px;
  background-color: transparent;
  border: none;
  border-radius: var(--radius-input);
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.nav-link:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

/* ==================== Content ==================== */

.page-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* ==================== Search Section ==================== */

.search-section {
  margin-bottom: 24px;
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

/* ==================== Filter Section ==================== */

.filter-section {
  display: flex;
  gap: 8px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 8px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
  white-space: nowrap;
}

.filter-tab:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.filter-tab.active {
  background-color: var(--accent);
  border-color: var(--accent);
  color: white;
}

/* ==================== Loading State ==================== */

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 20px;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--bg-tertiary);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ==================== Cases Grid ==================== */

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
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

.meta-tag {
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

/* ==================== Empty State ==================== */

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 15px;
  margin: 0;
}

/* ==================== Responsive ==================== */

@media (max-width: 768px) {
  .page-header {
    padding: 12px 16px;
  }

  .page-title {
    font-size: 20px;
  }

  .page-content {
    padding: 16px;
  }

  .cases-grid {
    grid-template-columns: 1fr;
  }

  .filter-section {
    gap: 6px;
  }

  .filter-tab {
    padding: 6px 12px;
    font-size: 12px;
  }
}
</style>
