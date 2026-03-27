<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useGenerateStore } from "../stores/generateStore";

const router = useRouter();
const generateStore = useGenerateStore();

interface HistoryItem {
  id: string;
  description: string;
  templateId: string;
  templateTitle: string;
  timestamp: number;
  status: "completed" | "failed";
}

const historyItems = ref<HistoryItem[]>([]);
const filterStatus = ref<"all" | "completed" | "failed">("all");

const STORAGE_KEY = "anim-history";

/** 从 localStorage 加载历史 */
const loadHistory = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      historyItems.value = JSON.parse(saved);
    }
  } catch {
    historyItems.value = [];
  }
};

/** 保存历史到 localStorage */
const saveHistory = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(historyItems.value));
};

onMounted(() => {
  loadHistory();
  // 如果 generateStore 有未保存的生成记录，同步过来
  for (const item of generateStore.history) {
    if (!historyItems.value.find(h => h.timestamp === item.timestamp)) {
      historyItems.value.push({
        id: `h-${item.timestamp}`,
        description: item.description,
        templateId: "",
        templateTitle: "",
        timestamp: item.timestamp,
        status: "completed",
      });
    }
  }
  saveHistory();
});

const filteredItems = computed(() => {
  if (filterStatus.value === "all") return historyItems.value;
  return historyItems.value.filter(item => item.status === filterStatus.value);
});

const statusLabels: Record<string, string> = {
  all: "全部",
  completed: "已完成",
  failed: "失败",
};

/** 格式化时间 */
const formatTime = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
};

/** 删除单条记录 */
const handleDelete = (id: string) => {
  historyItems.value = historyItems.value.filter(item => item.id !== id);
  saveHistory();
};

/** 清空全部 */
const handleClearAll = () => {
  if (confirm("确定要清空所有历史记录吗？")) {
    historyItems.value = [];
    saveHistory();
  }
};

/** 点击记录跳转到生成页并预填充 */
const handleView = (item: HistoryItem) => {
  router.push({ path: "/generate", query: { desc: item.description } });
};
</script>

<template>
  <div class="history-page">
    <header class="page-header">
      <h1 class="page-title">历史记录</h1>
      <p class="page-subtitle">查看和管理你的生成历史</p>
    </header>

    <!-- 筛选标签 -->
    <div class="filter-tabs">
      <button
        v-for="(label, key) in statusLabels"
        :key="key"
        class="filter-tab"
        :class="{ active: filterStatus === key }"
        @click="filterStatus = key as 'all' | 'completed' | 'failed'"
      >
        {{ label }}
      </button>
    </div>

    <!-- 列表 -->
    <div v-if="filteredItems.length > 0" class="history-grid">
      <div v-for="item in filteredItems" :key="item.id" class="history-card">
        <div class="card-content">
          <div class="card-header">
            <span class="status-badge" :class="item.status">
              {{ item.status === "completed" ? "✓" : "✕" }}
            </span>
            <span class="card-time">{{ formatTime(item.timestamp) }}</span>
          </div>
          <p class="card-description">{{ item.description }}</p>
          <div class="card-actions">
            <button class="action-button primary" @click="handleView(item)">
              重新生成
            </button>
            <button class="action-button danger" @click="handleDelete(item.id)">
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <span class="empty-icon">📭</span>
      <h3>还没有生成记录</h3>
      <p>去创作你的第一个动画吧</p>
      <button class="create-button" @click="router.push('/generate')">
        开始创作
      </button>
    </div>

    <!-- 清空按钮 -->
    <div v-if="historyItems.length > 0" class="clear-section">
      <button class="clear-button" @click="handleClearAll">
        清空所有记录
      </button>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  max-width: 1000px;
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

/* ==================== 筛选标签 ==================== */

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: var(--spacing-relaxed);
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
  white-space: nowrap;
  transition: all var(--transition-base) var(--ease-apple);
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

/* ==================== 历史记录网格 ==================== */

.history-grid {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-component);
}

.history-card {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--spacing-card);
  transition: all var(--transition-base) var(--ease-apple);
  box-shadow: var(--shadow-card);
}

.history-card:hover {
  border-color: var(--accent);
  box-shadow: var(--shadow-elevated);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 15px;
  font-weight: 600;
}

.status-badge.completed {
  background-color: rgba(52, 199, 89, 0.1);
  color: var(--success);
}

.status-badge.failed {
  background-color: rgba(255, 59, 48, 0.1);
  color: var(--error);
}

.card-time {
  font-size: 13px;
  color: var(--text-tertiary);
}

.card-description {
  font-size: 15px;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 8px 16px;
  border-radius: var(--radius-input);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.action-button.primary {
  background-color: var(--accent);
  border: 1px solid var(--accent);
  color: white;
}

.action-button.primary:hover {
  background-color: var(--accent-hover);
}

.action-button.danger {
  background-color: transparent;
  color: var(--error);
  border: 1px solid rgba(255, 59, 48, 0.3);
}

.action-button.danger:hover {
  background-color: rgba(255, 59, 48, 0.08);
}

/* ==================== 空状态 ==================== */

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
}

.empty-state h3 {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.empty-state p {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 32px 0;
}

.create-button {
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

.create-button:hover {
  background-color: var(--accent-hover);
  transform: scale(1.02);
}

.create-button:active {
  transform: scale(0.98);
}

/* ==================== 清空按钮 ==================== */

.clear-section {
  margin-top: var(--spacing-relaxed);
  text-align: center;
}

.clear-button {
  padding: 10px 20px;
  background-color: transparent;
  border: 1px solid var(--error);
  border-radius: var(--radius-input);
  color: var(--error);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.clear-button:hover {
  background-color: rgba(255, 59, 48, 0.08);
}
</style>
