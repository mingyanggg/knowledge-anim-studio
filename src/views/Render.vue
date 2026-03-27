<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useGenerateStore } from "../stores/generateStore";
import VideoPlayer from "../components/VideoPlayer.vue";

const router = useRouter();
const generateStore = useGenerateStore();

// 进度日志
const logs = ref<string[]>([]);

// 渲染阶段状态机
type RenderPhase = "idle" | "generating" | "rendering" | "done";
const phase = ref<RenderPhase>("idle");
const progress = ref(0);
const estimatedTime = ref(0);

// Tab 切换：脚本预览 / 动画预览 / 视频播放
type TabType = "script" | "preview" | "video";
const activeTab = ref<TabType>("script");

// 视频路径（渲染完成后设置）
const videoPath = ref<string>("");

// 导出视频反馈
const exportVideoMsg = ref("");
let exportTimer: ReturnType<typeof setTimeout> | null = null;

/** 添加日志 */
const addLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  logs.value.push(`[${timestamp}] ${message}`);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 导出视频 */
const handleExportVideo = () => {
  if (!videoPath.value) {
    exportVideoMsg.value = "暂无视频可导出";
    if (exportTimer) clearTimeout(exportTimer);
    exportTimer = setTimeout(() => {
      exportVideoMsg.value = "";
    }, 3000);
    return;
  }

  // TODO: Implement actual video export
  exportVideoMsg.value = "视频导出功能开发中...";
  if (exportTimer) clearTimeout(exportTimer);
  exportTimer = setTimeout(() => {
    exportVideoMsg.value = "";
  }, 3000);
};

/** 导出脚本 */
const handleExportScript = () => {
  if (!generateStore.generatedScript) return;
  const blob = new Blob([generateStore.generatedScript], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `animation_${Date.now()}.py`;
  a.click();
  URL.revokeObjectURL(url);
};

/** 开始渲染流程 */
const startRender = async () => {
  if (!generateStore.generatedScript) {
    phase.value = "idle";
    return;
  }

  logs.value = [];
  phase.value = "rendering";
  addLog("初始化渲染环境...");
  await sleep(500);
  addLog("解析脚本...");
  await sleep(400);
  addLog("开始渲染场景（演示模式）...");

  const totalSteps = 100;
  for (let i = 0; i <= totalSteps; i++) {
    progress.value = i;
    estimatedTime.value = Math.ceil((totalSteps - i) * 0.1);
    if (i % 25 === 0 && i > 0) {
      addLog(`渲染进度: ${i}%`);
    }
    await sleep(80);
  }

  addLog("渲染完成！");
  phase.value = "done";

  // 模拟设置视频路径（实际应从渲染结果获取）
  // videoPath.value = "/path/to/rendered/video.mp4";

  // 自动切换到视频标签
  if (videoPath.value) {
    activeTab.value = "video";
  }
};

onMounted(() => {
  if (generateStore.generatedScript) {
    startRender();
  } else {
    phase.value = "idle";
  }
});

const handleBackToGenerate = () => {
  router.push("/generate");
};
</script>

<template>
  <div class="render-page">
    <header class="page-header">
      <h1 class="page-title">渲染动画</h1>
      <p class="page-subtitle">实时渲染进度和预览</p>
    </header>

    <!-- 空状态 -->
    <div v-if="phase === 'idle'" class="empty-state">
      <span class="empty-icon">📝</span>
      <h3>还没有可渲染的动画</h3>
      <p>请先在生成页创建动画脚本</p>
      <button class="hero-cta" @click="handleBackToGenerate">
        去生成脚本
      </button>
    </div>

    <div v-else class="render-content">
      <!-- 左侧：进度 & 日志 -->
      <div class="progress-panel">
        <div class="card">
          <h2 class="card-title">渲染进度</h2>

          <div class="demo-banner">
            当前为演示模式，渲染进度为模拟数据
          </div>

          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
            </div>
            <div class="progress-info">
              <span class="progress-percentage">{{ progress }}%</span>
              <span v-if="phase === 'rendering'" class="progress-time">
                预计剩余: {{ estimatedTime }}秒
              </span>
              <span v-else-if="phase === 'done'" class="progress-status">完成</span>
            </div>
          </div>

          <div class="status-grid">
            <div class="status-item">
              <span class="status-label">状态</span>
              <span class="status-value" :class="{ active: phase === 'rendering' }">
                {{ phase === 'rendering' ? '渲染中' : '已完成' }}
              </span>
            </div>
            <div class="status-item">
              <span class="status-label">场景数</span>
              <span class="status-value">{{ generateStore.generatedScenes.length || '-' }}</span>
            </div>
          </div>
        </div>

        <!-- 日志 -->
        <div class="card">
          <h2 class="card-title">渲染日志</h2>
          <div class="logs-container">
            <div v-for="(log, index) in logs" :key="index" class="log-entry">
              {{ log }}
            </div>
            <div v-if="logs.length === 0" class="logs-empty">等待渲染开始...</div>
          </div>
        </div>
      </div>

      <!-- 右侧：预览 & 操作 -->
      <div class="preview-panel">
        <div class="card">
          <!-- Tab 切换 -->
          <div class="tab-bar">
            <button
              class="tab-button"
              :class="{ active: activeTab === 'script' }"
              @click="activeTab = 'script'"
            >
              查看脚本
            </button>
            <button
              class="tab-button"
              :class="{ active: activeTab === 'preview' }"
              @click="activeTab = 'preview'"
            >
              动画预览
            </button>
            <button
              v-if="phase === 'done' && videoPath"
              class="tab-button"
              :class="{ active: activeTab === 'video' }"
              @click="activeTab = 'video'"
            >
              视频播放
            </button>
          </div>

          <!-- 脚本预览 -->
          <div v-if="activeTab === 'script'" class="script-preview">
            <div v-if="generateStore.generatedScript" class="code-content">
              <pre><code>{{ generateStore.generatedScript }}</code></pre>
            </div>
            <div v-else class="preview-empty">暂无脚本内容</div>
          </div>

          <!-- 动画预览（占位） -->
          <div v-else-if="activeTab === 'preview'" class="animation-preview">
            <div v-if="phase === 'rendering'" class="preview-loading">
              <div class="spinner"></div>
              <p>渲染中...</p>
            </div>
            <div v-else-if="phase === 'done'" class="preview-placeholder">
              <span class="placeholder-icon">🎬</span>
              <p>动画预览即将上线</p>
              <p class="placeholder-hint">真实渲染引擎接入后可在此预览动画效果</p>
            </div>
          </div>

          <!-- 视频播放器 -->
          <div v-else-if="activeTab === 'video'" class="video-player-wrapper">
            <VideoPlayer :src="videoPath" :autoplay="false" />
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button class="secondary-button" @click="handleBackToGenerate">
            返回修改
          </button>
          <button
            class="secondary-button"
            @click="handleExportScript"
          >
            导出脚本
          </button>
          <button
            class="primary-button"
            @click="handleExportVideo"
            :disabled="phase !== 'done'"
          >
            导出视频
          </button>
        </div>

        <!-- 导出提示 -->
        <div v-if="exportVideoMsg" class="export-toast">{{ exportVideoMsg }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.render-page {
  max-width: 1400px;
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
  margin: 0 0 8px;
}

.empty-state p {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 32px;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.hero-cta:hover {
  background-color: var(--accent-hover);
  transform: scale(1.02);
}

.hero-cta:active {
  transform: scale(0.98);
}

/* ==================== 渲染布局 ==================== */

.render-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-component);
}

.card {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--spacing-card);
  margin-bottom: var(--spacing-component);
  box-shadow: var(--shadow-card);
}

.card:last-child {
  margin-bottom: 0;
}

.card-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 var(--spacing-component) 0;
  color: var(--text-primary);
}

.demo-banner {
  padding: 10px 16px;
  margin-bottom: var(--spacing-component);
  background-color: rgba(255, 149, 0, 0.1);
  border: 1px solid rgba(255, 149, 0, 0.2);
  border-radius: var(--radius-input);
  font-size: 13px;
  color: var(--warning);
}

/* ==================== 进度条 ==================== */

.progress-container {
  margin-bottom: var(--spacing-component);
}

.progress-bar {
  height: 4px;
  background-color: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent);
  transition: width 0.3s var(--ease-apple);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-percentage {
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
}

.progress-time,
.progress-status {
  font-size: 13px;
  color: var(--text-secondary);
}

/* ==================== 状态网格 ==================== */

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-component);
}

.status-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.status-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.status-value.active {
  color: var(--success);
}

/* ==================== 日志 ==================== */

.logs-container {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  padding: var(--spacing-card);
  height: 300px;
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: 13px;
}

.log-entry {
  color: var(--text-secondary);
  margin-bottom: 8px;
  line-height: 1.5;
}

.logs-empty {
  color: var(--text-tertiary);
  text-align: center;
  padding: 32px 0;
}

/* ==================== Tab 切换 ==================== */

.tab-bar {
  display: flex;
  gap: 8px;
  margin-bottom: var(--spacing-component);
}

.tab-button {
  flex: 1;
  padding: 10px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.tab-button:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

.tab-button.active {
  background-color: rgba(0, 122, 255, 0.08);
  border-color: var(--accent);
  color: var(--accent);
}

/* ==================== 预览区域 ==================== */

.script-preview,
.animation-preview {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  min-height: 350px;
  overflow: hidden;
}

.code-content {
  padding: var(--spacing-card);
  max-height: 450px;
  overflow: auto;
}

.code-content pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-all;
}

.code-content code {
  color: inherit;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 350px;
  color: var(--text-tertiary);
}

/* ==================== 动画预览占位 ==================== */

.animation-preview {
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-loading,
.preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-component);
  color: var(--text-secondary);
  text-align: center;
  padding: var(--spacing-relaxed);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--bg-tertiary);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.placeholder-icon {
  font-size: 48px;
}

.placeholder-hint {
  font-size: 13px;
  color: var(--text-tertiary);
  margin: 0;
}

/* ==================== 视频播放器 ==================== */

.video-player-wrapper {
  padding: 0;
  animation: fadeIn 0.3s var(--ease-apple);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ==================== 操作按钮 ==================== */

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.secondary-button {
  flex: 1;
  min-width: 100px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-button);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.secondary-button:hover {
  background-color: var(--bg-tertiary);
}

.primary-button {
  flex: 1;
  min-width: 100px;
  padding: 12px 16px;
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-button);
  color: white;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.primary-button:hover:not(:disabled) {
  background-color: var(--accent-hover);
  transform: scale(1.01);
}

.primary-button:active:not(:disabled) {
  transform: scale(0.99);
}

.primary-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.export-toast {
  margin-top: var(--spacing-component);
  padding: 12px 16px;
  background-color: rgba(255, 149, 0, 0.1);
  border: 1px solid rgba(255, 149, 0, 0.2);
  border-radius: var(--radius-input);
  color: var(--warning);
  font-size: 13px;
  text-align: center;
}

/* ==================== 响应式 ==================== */

@media (max-width: 1024px) {
  .render-content {
    grid-template-columns: 1fr;
  }
}
</style>
