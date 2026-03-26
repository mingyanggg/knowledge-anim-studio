<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useGenerateStore } from "../stores/generateStore";

const router = useRouter();
const generateStore = useGenerateStore();

// 进度日志
const logs = ref<string[]>([]);

// 渲染阶段状态机
type RenderPhase = "idle" | "generating" | "rendering" | "done";
const phase = ref<RenderPhase>("idle");
const progress = ref(0);
const estimatedTime = ref(0);

// Tab 切换：脚本预览 / 动画预览
type TabType = "script" | "preview";
const activeTab = ref<TabType>("script");

// 导出视频反馈
const exportVideoMsg = ref("");
let exportTimer: ReturnType<typeof setTimeout> | null = null;

/** 添加日志 */
const addLog = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  logs.value.push(`[${timestamp}] ${message}`);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 导出视频（即将上线） */
const handleExportVideo = () => {
  exportVideoMsg.value = "🎬 视频导出功能即将上线，敬请期待！";
  if (exportTimer) clearTimeout(exportTimer);
  exportTimer = setTimeout(() => {
    exportVideoMsg.value = "";
  }, 4000);
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
      <h2 class="page-title">渲染动画</h2>
      <p class="page-subtitle">实时渲染进度和预览</p>
    </header>

    <!-- 空状态 -->
    <div v-if="phase === 'idle'" class="empty-state">
      <span class="empty-icon">📝</span>
      <h3>还没有可渲染的动画</h3>
      <p>请先在生成页创建动画脚本</p>
      <button class="hero-cta" @click="handleBackToGenerate">
        ✨ 去生成脚本
      </button>
    </div>

    <div v-else class="render-content">
      <!-- 左侧：进度 & 日志 -->
      <div class="progress-panel">
        <div class="card">
          <h3 class="card-title">渲染进度</h3>

          <div class="demo-banner">
            ⚠️ 当前为演示模式，渲染进度为模拟数据
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
          <h3 class="card-title">渲染日志</h3>
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
              📜 查看脚本
            </button>
            <button
              class="tab-button"
              :class="{ active: activeTab === 'preview' }"
              @click="activeTab = 'preview'"
            >
              🎬 动画预览
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
          <div v-else class="animation-preview">
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
        </div>

        <!-- 操作按钮 -->
        <div class="action-buttons">
          <button class="secondary-button" @click="handleBackToGenerate">
            ← 返回修改
          </button>
          <button
            class="secondary-button"
            @click="handleExportScript"
          >
            💾 导出脚本
          </button>
          <button
            class="primary-button"
            @click="handleExportVideo"
            :disabled="phase !== 'done'"
          >
            🎥 导出视频
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

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 6rem 2rem;
}

.empty-icon {
  font-size: 5rem;
  display: block;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #fff;
  margin: 0 0 0.5rem;
}

.empty-state p {
  font-size: 1rem;
  color: #9ca3af;
  margin: 0 0 2rem;
}

.hero-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem;
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  border: none;
  border-radius: 2rem;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.hero-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 212, 255, 0.35);
}

/* 渲染布局 */
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

.demo-banner {
  padding: 0.5rem 1rem;
  margin-bottom: 1rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 0.375rem;
  font-size: 0.8rem;
  color: #f59e0b;
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

/* 日志 */
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

.logs-empty {
  color: #6b7280;
  text-align: center;
  padding: 2rem 0;
}

/* Tab 切换 */
.tab-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab-button {
  flex: 1;
  padding: 0.625rem 1rem;
  background: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  color: #9ca3af;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-button:hover {
  border-color: #00d4ff;
  color: #fff;
}

.tab-button.active {
  background: rgba(0, 212, 255, 0.1);
  border-color: #00d4ff;
  color: #00d4ff;
}

/* 脚本预览 */
.script-preview,
.animation-preview {
  background-color: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  min-height: 350px;
  overflow: hidden;
}

.code-content {
  padding: 1rem;
  max-height: 450px;
  overflow: auto;
}

.code-content pre {
  margin: 0;
  font-family: "Monaco", "Menlo", monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: #e5e7eb;
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
  color: #6b7280;
}

/* 动画预览占位 */
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
  gap: 1rem;
  color: #9ca3af;
  text-align: center;
  padding: 2rem;
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
  to { transform: rotate(360deg); }
}

.placeholder-icon {
  font-size: 3rem;
}

.placeholder-hint {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.secondary-button {
  flex: 1;
  min-width: 100px;
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

.primary-button {
  flex: 1;
  min-width: 100px;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  border: none;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.primary-button:hover:not(:disabled) {
  box-shadow: 0 4px 16px rgba(0, 212, 255, 0.3);
}

.primary-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.export-toast {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 0.5rem;
  color: #f59e0b;
  font-size: 0.875rem;
  text-align: center;
}

@media (max-width: 1024px) {
  .render-content {
    grid-template-columns: 1fr;
  }
}
</style>
