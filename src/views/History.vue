<script setup lang="ts">
import { ref, computed } from "vue";

interface HistoryItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  createdAt: string;
  duration: number;
  status: "completed" | "rendering" | "failed";
}

const mockHistory: HistoryItem[] = [
  {
    id: "1",
    title: "勾股定理证明",
    description: "演示勾股定理的几何证明过程",
    thumbnail: "📐",
    createdAt: "2024-03-25 14:30",
    duration: 30,
    status: "completed",
  },
  {
    id: "2",
    title: "牛顿第二定律",
    description: "F = ma 动画演示",
    thumbnail: "🍎",
    createdAt: "2024-03-24 16:45",
    duration: 45,
    status: "completed",
  },
  {
    id: "3",
    title: "化学键形成",
    description: "离子键和共价键的可视化",
    thumbnail: "⚗️",
    createdAt: "2024-03-23 10:20",
    duration: 35,
    status: "completed",
  },
];

const historyItems = ref<HistoryItem[]>(mockHistory);
const filterStatus = ref<"all" | "completed" | "rendering" | "failed">("all");

const filteredItems = computed(() => {
  if (filterStatus.value === "all") return historyItems.value;
  return historyItems.value.filter(item => item.status === filterStatus.value);
});

const statusLabels = {
  all: "全部",
  completed: "已完成",
  rendering: "渲染中",
  failed: "失败",
};

const handleDelete = (id: string) => {
  const index = historyItems.value.findIndex(item => item.id === id);
  if (index !== -1) {
    historyItems.value.splice(index, 1);
  }
};

const handleClearAll = () => {
  if (confirm("确定要清空所有历史记录吗？")) {
    historyItems.value = [];
  }
};
</script>

<template>
  <div class="history-page">
    <!-- Header -->
    <header class="page-header">
      <h2 class="page-title">历史记录</h2>
      <p class="page-subtitle">查看和管理你的渲染历史</p>
    </header>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button
        v-for="(label, key) in statusLabels"
        :key="key"
        class="filter-tab"
        :class="{ active: filterStatus === key }"
        @click="filterStatus = key as any"
      >
        {{ label }}
      </button>
    </div>

    <!-- History Grid -->
    <div v-if="filteredItems.length > 0" class="history-grid">
      <div
        v-for="item in filteredItems"
        :key="item.id"
        class="history-card"
      >
        <div class="card-thumbnail">
          <span class="thumbnail-emoji">{{ item.thumbnail }}</span>
          <span class="status-badge" :class="item.status">
            {{ statusLabels[item.status] }}
          </span>
        </div>

        <div class="card-content">
          <h3 class="card-title">{{ item.title }}</h3>
          <p class="card-description">{{ item.description }}</p>

          <div class="card-meta">
            <span class="meta-item">📅 {{ item.createdAt }}</span>
            <span class="meta-item">⏱️ {{ item.duration }}秒</span>
          </div>

          <div class="card-actions">
            <button class="action-button primary">
              📂 查看
            </button>
            <button class="action-button secondary">
              📤 导出
            </button>
            <button
              class="action-button danger"
              @click="handleDelete(item.id)"
            >
              🗑️ 删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <span class="empty-icon">📭</span>
      <h3>暂无历史记录</h3>
      <p>开始创建你的第一个动画吧！</p>
      <button class="create-button" @click="$router.push('/generate')">
        ✨ 开始创建
      </button>
    </div>

    <!-- Clear All Button -->
    <div v-if="historyItems.length > 0" class="clear-section">
      <button class="clear-button" @click="handleClearAll">
        🗑️ 清空所有记录
      </button>
    </div>
  </div>
</template>

<style scoped>
.history-page {
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

.filter-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
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
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.history-card {
  background-color: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 0.75rem;
  overflow: hidden;
  transition: all 0.2s;
}

.history-card:hover {
  border-color: #00d4ff;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 212, 255, 0.15);
}

.card-thumbnail {
  aspect-ratio: 16 / 9;
  background: linear-gradient(135deg, #1a1a2e 0%, #2a2a4a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.thumbnail-emoji {
  font-size: 4rem;
}

.status-badge {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.completed {
  background-color: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.status-badge.rendering {
  background-color: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
}

.status-badge.failed {
  background-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.card-content {
  padding: 1rem;
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 0.5rem 0;
}

.card-description {
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.card-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.card-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.action-button {
  padding: 0.5rem 0.75rem;
  border: 1px solid #2a2a4a;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-button.primary {
  background-color: #00d4ff;
  border-color: #00d4ff;
  color: #0f0f1a;
}

.action-button.primary:hover {
  background-color: #00b8e6;
  border-color: #00b8e6;
}

.action-button.secondary {
  background-color: #2a2a4a;
  color: #ffffff;
}

.action-button.secondary:hover {
  background-color: #3a3a5a;
}

.action-button.danger {
  background-color: transparent;
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.action-button.danger:hover {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.5);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
}

.empty-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
  display: block;
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

@media (max-width: 640px) {
  .card-actions {
    grid-template-columns: 1fr;
  }

  .action-button {
    width: 100%;
  }
}
</style>
