<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useRenderStore } from "../stores/renderStore";
import { useSubscriptionStore } from "../stores/subscriptionStore";

const router = useRouter();
const renderStore = useRenderStore();
const subscriptionStore = useSubscriptionStore();

const progress = ref(0);
const estimatedTime = ref(0);
const logs = ref<string[]>([]);
const previewUrl = ref("");
const isRendering = ref(false);

const canExportGif = computed(() => true);
const canExportMp4 = computed(() => subscriptionStore.isPro);

onMounted(() => {
  // Simulate rendering process
  startRendering();
});

onUnmounted(() => {
  // Cleanup if needed
});

const startRendering = async () => {
  isRendering.value = true;
  logs.value = [];

  // Add initial log
  addLog("初始化渲染环境...");
  await sleep(500);

  addLog("正在加载渲染引擎...");
  await sleep(800);

  addLog("解析脚本...");
  await sleep(600);

  addLog("开始渲染场景...");
  await sleep(400);

  // Simulate progress
  const totalSteps = 100;
  for (let i = 0; i <= totalSteps; i++) {
    progress.value = i;
    estimatedTime.value = Math.ceil((totalSteps - i) * 0.1);

    if (i % 10 === 0 && i > 0) {
      addLog(`渲染进度: ${i}%`);
    }

    await sleep(100);
  }

  addLog("渲染完成！");
  addLog("生成预览...");
  await sleep(500);

  previewUrl.value = "https://via.placeholder.com/800x450/1a1a2e/00d4ff?text=Preview";
  isRendering.value = false;
};

const addLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  logs.value.push(`[${timestamp}] ${message}`);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handleExportGif = async () => {
  if (isRendering.value) return;

  addLog("开始导出 GIF...");
  await sleep(2000);
  addLog("GIF 导出完成！");
};

const handleExportMp4 = async () => {
  if (isRendering.value || !canExportMp4.value) return;

  addLog("开始导出 MP4...");
  await sleep(3000);
  addLog("MP4 导出完成！");
};

const handleBackToGenerate = () => {
  router.push("/generate");
};
</script>

<template>
  <div class="render-page">
    <!-- Header -->
    <header class="page-header">
      <h2 class="page-title">渲染动画</h2>
      <p class="page-subtitle">实时渲染进度和预览</p>
    </header>

    <div class="render-content">
      <!-- Left Panel - Progress & Logs -->
      <div class="progress-panel">
        <!-- Progress Card -->
        <div class="card">
          <h3 class="card-title">渲染进度</h3>

          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
            </div>
            <div class="progress-info">
              <span class="progress-percentage">{{ progress }}%</span>
              <span v-if="isRendering" class="progress-time">
                预计剩余: {{ estimatedTime }}秒
              </span>
              <span v-else class="progress-status">完成</span>
            </div>
          </div>

          <!-- Status Indicators -->
          <div class="status-grid">
            <div class="status-item">
              <span class="status-label">状态</span>
              <span class="status-value" :class="{ active: isRendering }">
                {{ isRendering ? '渲染中' : '已完成' }}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">分辨率</span>
              <span class="status-value">1080p</span>
            </div>
            <div class="status-item">
              <span class="status-label">帧率</span>
              <span class="status-value">60 FPS</span>
            </div>
            <div class="status-item">
              <span class="status-label">时长</span>
              <span class="status-value">30秒</span>
            </div>
          </div>
        </div>

        <!-- Logs Card -->
        <div class="card">
          <h3 class="card-title">渲染日志</h3>
          <div class="logs-container">
            <div v-for="(log, index) in logs" :key="index" class="log-entry">
              {{ log }}
            </div>
            <div v-if="logs.length === 0" class="logs-empty">
              等待渲染开始...
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel - Preview & Export -->
      <div class="preview-panel">
        <!-- Preview Card -->
        <div class="card">
          <h3 class="card-title">预览</h3>
          <div class="preview-container">
            <div v-if="isRendering" class="preview-loading">
              <div class="spinner"></div>
              <p>渲染中...</p>
            </div>
            <div v-else-if="previewUrl" class="preview-content">
              <img :src="previewUrl" alt="Preview" class="preview-image" />
            </div>
            <div v-else class="preview-empty">
              <span class="empty-icon">🎬</span>
              <p>等待渲染完成</p>
            </div>
          </div>
        </div>

        <!-- Export Card -->
        <div class="card">
          <h3 class="card-title">导出</h3>

          <div class="export-options">
            <!-- GIF Export -->
            <div class="export-option">
              <div class="export-info">
                <div class="export-header">
                  <span class="export-format">GIF</span>
                  <span class="export-badge free">免费</span>
                </div>
                <p class="export-description">动图格式，适合分享</p>
              </div>
              <button
                class="export-button"
                :disabled="isRendering || !previewUrl"
                @click="handleExportGif"
              >
                导出 GIF
              </button>
            </div>

            <!-- MP4 Export -->
            <div class="export-option">
              <div class="export-info">
                <div class="export-header">
                  <span class="export-format">MP4</span>
                  <span class="export-badge" :class="canExportMp4 ? 'pro' : 'locked'">
                    {{ canExportMp4 ? 'Pro' : '🔒 Pro' }}
                  </span>
                </div>
                <p class="export-description">高清视频，最佳质量</p>
              </div>
              <button
                class="export-button pro"
                :disabled="isRendering || !previewUrl || !canExportMp4"
                @click="handleExportMp4"
              >
                导出 MP4
              </button>
            </div>
          </div>

          <!-- Pro Upgrade Prompt -->
          <div v-if="!canExportMp4" class="upgrade-prompt">
            <p>升级到 Pro 版本解锁 MP4 导出</p>
            <button class="upgrade-button" @click="router.push('/settings')">
              升级到 Pro
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button class="secondary-button" @click="handleBackToGenerate">
            ← 返回修改
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.render-page {
  max-width: 1600px;
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

.render-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.card {
  background-color: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.card:last-child {
  margin-bottom: 0;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 1rem 0;
  color: #ffffff;
}

.progress-container {
  margin-bottom: 1.5rem;
}

.progress-bar {
  height: 8px;
  background-color: #2a2a4a;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00d4ff 0%, #7c3aed 100%);
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-percentage {
  font-size: 1.5rem;
  font-weight: 700;
  color: #00d4ff;
}

.progress-time,
.progress-status {
  font-size: 0.875rem;
  color: #9ca3af;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-label {
  font-size: 0.75rem;
  color: #9ca3af;
}

.status-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: #ffffff;
}

.status-value.active {
  color: #22c55e;
}

.logs-container {
  background-color: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  padding: 1rem;
  height: 300px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.875rem;
}

.log-entry {
  color: #9ca3af;
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.log-entry:last-child {
  margin-bottom: 0;
}

.logs-empty {
  color: #6b7280;
  text-align: center;
  padding: 2rem 0;
}

.preview-container {
  aspect-ratio: 16 / 9;
  background-color: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-loading,
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #9ca3af;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #2a2a4a;
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  font-size: 3rem;
}

.preview-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.export-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.export-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background-color: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
}

.export-info {
  flex: 1;
}

.export-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.export-format {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
}

.export-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.export-badge.free {
  background-color: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.export-badge.pro {
  background-color: rgba(124, 58, 237, 0.2);
  color: #7c3aed;
}

.export-badge.locked {
  background-color: rgba(107, 114, 128, 0.2);
  color: #6b7280;
}

.export-description {
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0;
}

.export-button {
  padding: 0.625rem 1.25rem;
  background-color: #00d4ff;
  border: none;
  border-radius: 0.375rem;
  color: #0f0f1a;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.export-button:hover:not(:disabled) {
  background-color: #00b8e6;
  transform: translateY(-1px);
}

.export-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.export-button.pro {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: #ffffff;
}

.export-button.pro:hover:not(:disabled) {
  background: linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%);
}

.upgrade-prompt {
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%);
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: 0.5rem;
  text-align: center;
}

.upgrade-prompt p {
  font-size: 0.875rem;
  color: #7c3aed;
  margin: 0 0 1rem 0;
}

.upgrade-button {
  width: 100%;
  padding: 0.75rem;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  border: none;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.upgrade-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

.action-buttons {
  display: flex;
  gap: 1rem;
}

.secondary-button {
  flex: 1;
  padding: 0.75rem 1rem;
  background-color: #2a2a4a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.secondary-button:hover {
  background-color: #3a3a5a;
}

@media (max-width: 1024px) {
  .render-content {
    grid-template-columns: 1fr;
  }
}
</style>
