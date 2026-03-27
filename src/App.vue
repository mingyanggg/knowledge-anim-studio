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
