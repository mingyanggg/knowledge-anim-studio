<script setup lang="ts">
import { onMounted } from "vue";
import { runMigration } from "./services/migration";

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
    <nav class="global-nav">
      <div class="nav-left">
        <router-link to="/create" class="nav-brand">✦ Knowledge Anim Studio</router-link>
      </div>
      <div class="nav-right">
        <router-link to="/create" class="nav-link" active-class="active">创作</router-link>
        <router-link to="/inspiration" class="nav-link" active-class="active">灵感</router-link>
        <router-link to="/history" class="nav-link" active-class="active">历史</router-link>
        <router-link to="/settings" class="nav-link" active-class="active">设置</router-link>
        <router-link to="/help" class="nav-link" active-class="active">帮助</router-link>
      </div>
    </nav>
    <router-view v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </router-view>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  display: flex;
  flex-direction: column;
}

/* ==================== 全局导航栏 ==================== */
.global-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 24px;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.nav-left {
  -webkit-app-region: no-drag;
}

.nav-brand {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  text-decoration: none;
  letter-spacing: -0.01em;
}

.nav-right {
  display: flex;
  gap: 4px;
  -webkit-app-region: no-drag;
}

.nav-link {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.nav-link:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.nav-link.active {
  color: var(--accent);
  background: rgba(0, 122, 255, 0.08);
}

/* ==================== 页面过渡动画 ==================== */

.page-enter-active,
.page-leave-active {
  transition: all 0.2s var(--ease-apple);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
