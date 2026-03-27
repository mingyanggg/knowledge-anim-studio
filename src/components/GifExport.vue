<script setup lang="ts">
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  videoPath: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  success: [gifPath: string];
  error: [error: string];
}>();

const isExporting = ref(false);
const progress = ref(0);
const currentStatus = ref("");

// 调用 Rust 后端的 export_gif 命令
const handleExport = async () => {
  if (!props.videoPath) {
    emit("error", "没有可导出的视频");
    return;
  }

  isExporting.value = true;
  progress.value = 0;
  currentStatus.value = "准备导出...";

  try {
    // 调用 Rust 后端的 GIF 导出命令
    const result = await invoke<string>("export_gif", {
      videoPath: props.videoPath,
    });

    // 模拟进度更新（实际应从 Rust 后端获取）
    progress.value = 100;
    currentStatus.value = "导出完成！";

    emit("success", result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "导出失败";
    currentStatus.value = errorMessage;
    emit("error", errorMessage);
  } finally {
    isExporting.value = false;
  }
};

// 格式化百分比
const formatProgress = (value: number) => {
  return Math.round(value);
};
</script>

<template>
  <div class="gif-export">
    <!-- 导出按钮 -->
    <button
      v-if="!isExporting"
      class="export-button"
      :disabled="!videoPath"
      @click="handleExport"
    >
      <span class="button-icon">🎞️</span>
      <span>导出 GIF</span>
    </button>

    <!-- 导出进度 -->
    <div v-else class="export-progress">
      <div class="progress-header">
        <span class="progress-status">{{ currentStatus }}</span>
        <span class="progress-percent">{{ formatProgress(progress) }}%</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gif-export {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.export-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-button);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
  white-space: nowrap;
}

.export-button:hover:not(:disabled) {
  background-color: var(--accent-hover);
  transform: scale(1.02);
}

.export-button:active:not(:disabled) {
  transform: scale(0.98);
}

.export-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button-icon {
  font-size: 18px;
  line-height: 1;
}

/* ==================== 导出进度 ==================== */

.export-progress {
  padding: 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-status {
  font-size: 13px;
  color: var(--text-secondary);
}

.progress-percent {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.progress-bar {
  height: 6px;
  background-color: var(--bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent);
  border-radius: 3px;
  transition: width 0.3s var(--ease-apple);
}

/* 进度动画 */
.progress-fill {
  animation: progress-pulse 1.5s ease-in-out infinite;
}

@keyframes progress-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>
