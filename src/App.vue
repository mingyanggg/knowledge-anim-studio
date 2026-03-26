<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";

const router = useRouter();
const route = useRoute();

const menuItems = [
  { name: "首页", path: "/", icon: "🏠" },
  { name: "生成", path: "/generate", icon: "✨" },
  { name: "历史", path: "/history", icon: "📜" },
  { name: "设置", path: "/settings", icon: "⚙️" },
];

const isActive = (path: string) => route.path === path;
</script>

<template>
  <div class="app-container">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="app-title">知识动画工坊</h1>
        <p class="app-subtitle">Knowledge Animation Studio</p>
      </div>

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

      <div class="sidebar-footer">
        <div class="user-status">
          <span class="status-badge">Free</span>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  background-color: #0f0f1a;
  color: #ffffff;
}

.sidebar {
  width: 240px;
  background-color: #1a1a2e;
  border-right: 1px solid #2a2a4a;
  display: flex;
  flex-direction: column;
  padding: 1.5rem 1rem;
}

.sidebar-header {
  margin-bottom: 2rem;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.app-subtitle {
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0.25rem 0 0 0;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  color: #9ca3af;
  text-decoration: none;
  transition: all 0.2s;
}

.nav-item:hover {
  background-color: #2a2a4a;
  color: #ffffff;
}

.nav-item.active {
  background-color: #2a2a4a;
  color: #00d4ff;
}

.nav-icon {
  font-size: 1.25rem;
}

.nav-text {
  font-weight: 500;
}

.sidebar-footer {
  padding-top: 1rem;
  border-top: 1px solid #2a2a4a;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background-color: #2a2a4a;
  color: #9ca3af;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}
</style>
