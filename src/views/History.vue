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
      <h2 class="page-title">历史记录</h2>
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
              {{ item.status === "completed" ? "✅" : "❌" }}
            </span>
            <span class="card-time">{{ formatTime(item.timestamp) }}</span>
          </div>
          <p class="card-description">{{ item.description }}</p>
          <div class="card-actions">
            <button class="action-button primary" @click="handleView(item)">
              📂 重新生成
            </button>
            <button class="action-button danger" @click="handleDelete(item.id)">
              🗑️ 删除
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
        ✨ 开始创作
      </button>
    </div>

    <!-- 清空按钮 -->
    <div v-if="historyItems.length > 0" class="clear-section">
      <button class="clear-button" @click="handleClearAll">
        🗑️ 清空所有记录
      </button>
    </div>
  </div>
</template>

<style scoped>
.history-page {
  max-width: 1200px;
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

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.filter-tab {
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

.filter-tab:hover {
  background-color: #2a2a4a;
  color: #ffffff;
}

.filter-tab.active {
  background-color: #00d4ff;
  border-color: #00d4ff;
  color: #0f0f1a;
}

.history-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-card {
  background-color: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 0.75rem;
  padding: 1rem;
  transition: border-color 0.2s;
}

.history-card:hover {
  border-color: #00d4ff;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.status-badge.completed {
  font-size: 1rem;
}

.status-badge.failed {
  font-size: 1rem;
}

.card-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.card-description {
  font-size: 0.875rem;
  color: #e5e7eb;
  margin: 0;
  line-height: 1.5;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button.primary {
  background-color: #00d4ff;
  border: 1px solid #00d4ff;
  color: #0f0f1a;
}

.action-button.primary:hover {
  background-color: #00b8e6;
}

.action-button.danger {
  background-color: transparent;
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.action-button.danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 5rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
}

.empty-state p {
  font-size: 1rem;
  color: #9ca3af;
  margin: 0 0 2rem 0;
}

.create-button {
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  border: none;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.create-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 212, 255, 0.3);
}

.clear-section {
  margin-top: 2rem;
  text-align: center;
}

.clear-button {
  padding: 0.75rem 1.5rem;
  background-color: transparent;
  border: 1px solid #ef4444;
  border-radius: 0.5rem;
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-button:hover {
  background-color: rgba(239, 68, 68, 0.1);
}
</style>
