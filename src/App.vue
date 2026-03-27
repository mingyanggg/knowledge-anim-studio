<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { runMigration } from "./services/migration";

const route = useRoute();

const menuItems = [
  { name: "首页", path: "/", icon: "🏠" },
  { name: "生成", path: "/generate", icon: "✨" },
  { name: "渲染", path: "/render", icon: "🎬" },
  { name: "历史", path: "/history", icon: "📜" },
  { name: "设置", path: "/settings", icon: "⚙️" },
];

const isActive = (path: string) => {
  if (path === "/") return route.path === "/";
  return route.path.startsWith(path);
};

// Initialize app: run migration from localStorage to SQLite
onMounted(async () => {
  try {
    const result = await runMigration();
    if (result.migrated > 0) {
      console.log(`Migration completed: ${result.migrated} jobs migrated to SQLite`);
    }
    if (result.failed > 0) {
      console.warn(`Migration warning: ${result.failed} jobs failed to migrate`);
    }
  } catch (error) {
    console.error('Migration error:', error);
  }
});
</script>

<template>
  <div class="app-container">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <!-- Logo 区域 -->
      <div class="sidebar-header">
        <span class="app-logo">🧪</span>
        <h1 class="app-title">知识动画工坊</h1>
      </div>

      <!-- 导航菜单 -->
      <nav class="sidebar-nav">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.name }}</span>
        </router-link>
      </nav>

      <!-- 底部状态 -->
      <div class="sidebar-footer">
        <span class="status-pill free">Free</span>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

/* ==================== 侧边栏 ==================== */

.sidebar {
  width: 260px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* 侧边栏头部 */
.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px;
  border-bottom: 1px solid var(--border);
}

.app-logo {
  font-size: 32px;
  line-height: 1;
}

.app-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

/* 导航菜单 */
.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-input);
  color: var(--text-primary);
  text-decoration: none;
  font-size: 15px;
  font-weight: 500;
  transition: all var(--transition-base) var(--ease-apple);
}

.nav-item:hover {
  background-color: var(--bg-tertiary);
}

.nav-item.active {
  background-color: var(--accent);
  color: white;
}

.nav-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.nav-text {
  flex: 1;
}

/* 侧边栏底部 */
.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
}

.status-pill {
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 600;
}

.status-pill.free {
  background-color: rgba(52, 199, 89, 0.1);
  color: var(--success);
}

.status-pill.pro {
  background-color: rgba(10, 132, 255, 0.1);
  color: var(--accent);
}

/* ==================== 主内容区 ==================== */

.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-primary);
}
</style>
