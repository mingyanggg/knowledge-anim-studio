<script setup lang="ts">
import { useRoute } from "vue-router";

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
</script>

<template>
  <div class="app-container">
    <!-- 顶部导航栏 -->
    <header class="top-nav">
      <div class="nav-left">
        <span class="app-logo">🧪</span>
        <h1 class="app-title">知识动画工坊</h1>
      </div>
      <nav class="nav-center">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          :class="{ active: isActive(item.path) }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.name }}</span>
        </router-link>
      </nav>
      <div class="nav-right">
        <span class="status-pill free">Free</span>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 底部状态栏 -->
    <footer class="status-bar">
      <span class="status-text">● 就绪</span>
      <span class="version-text">v0.1.0</span>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #0f0f1a;
  color: #ffffff;
}

/* 顶部导航 */
.top-nav {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 1.5rem;
  background-color: #1a1a2e;
  border-bottom: 1px solid #2a2a4a;
  flex-shrink: 0;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 200px;
}

.app-logo {
  font-size: 1.5rem;
}

.app-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-center {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  justify-content: center;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  color: #9ca3af;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
}

.nav-link:hover {
  background-color: #2a2a4a;
  color: #ffffff;
}

.nav-link.active {
  background-color: #2a2a4a;
  color: #00d4ff;
}

.nav-icon {
  font-size: 1rem;
}

.nav-right {
  min-width: 200px;
  display: flex;
  justify-content: flex-end;
}

.status-pill {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-pill.free {
  background-color: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.status-pill.pro {
  background-color: rgba(124, 58, 237, 0.15);
  color: #7c3aed;
}

/* 主内容 */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

/* 底部状态栏 */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 1.5rem;
  background-color: #1a1a2e;
  border-top: 1px solid #2a2a4a;
  flex-shrink: 0;
}

.status-text {
  font-size: 0.75rem;
  color: #22c55e;
}

.version-text {
  font-size: 0.75rem;
  color: #6b7280;
}
</style>
