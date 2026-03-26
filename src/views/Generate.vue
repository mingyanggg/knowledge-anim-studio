<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useTemplateStore } from "../stores/templateStore";
import { useGenerateStore } from "../stores/generateStore";
import { useSettingsStore } from "../stores/settingsStore";
import { analyzeConcept, type AnalysisResult } from "../services/concept-analyzer";
import { stylePresets, type StylePreset } from "../data/style-presets";
import { exportScriptFile } from "../services/ai-generator";
import * as jobManager from "../services/job-manager";

// 导出反馈
const exportMsg = ref("");
let exportMsgTimer: ReturnType<typeof setTimeout> | null = null;

const router = useRouter();
const route = useRoute();
const templateStore = useTemplateStore();
const generateStore = useGenerateStore();
const settingsStore = useSettingsStore();

const description = ref("");
const selectedTemplateId = ref("");
const showAdvanced = ref(false);
const maxChars = 2000;

// 概念分析
const analysis = ref<AnalysisResult | null>(null);

// 风格预设
const selectedPresetId = ref("deep-space");
const selectedPreset = computed<StylePreset>(() =>
  stylePresets.find(p => p.id === selectedPresetId.value) ?? stylePresets[0]
);

// 高级参数
const params = ref({
  primaryColor: "#00d4ff",
  secondaryColor: "#7c3aed",
  duration: 30,
  fps: 60,
  resolution: "1080p" as "1080p" | "4k",
});

const selectedTemplate = computed(() => {
  if (!selectedTemplateId.value) return null;
  return templateStore.templates.find((t) => t.id === selectedTemplateId.value);
});

const canGenerate = computed(() => description.value.trim().length > 0);

// 字符数统计
const charCount = computed(() => description.value.length);
const charPercent = computed(() => Math.min((charCount.value / maxChars) * 100, 100));
const charColor = computed(() => {
  if (charCount.value > maxChars) return "#ef4444";
  if (charCount.value > maxChars * 0.9) return "#f59e0b";
  return "#6b7280";
});

// 生成按钮 loading 状态
const isGenerating = ref(false);

// 任务状态
const activeJob = ref<jobManager.Job | null>(null);
const jobProgress = computed(() => activeJob.value?.progress ?? 0);
const jobMessage = computed(() => activeJob.value?.message ?? "");


// 输入时实时分析
watch(description, () => {
  const input = description.value.trim();
  if (!input) {
    analysis.value = null;
    return;
  }
  analysis.value = analyzeConcept(input);

  // 模板匹配时自动选中
  if (analysis.value.type === "template" && analysis.value.templateId) {
    selectedTemplateId.value = analysis.value.templateId;
  }
});

// 风格预设切换时同步颜色
watch(selectedPresetId, () => {
  params.value.primaryColor = selectedPreset.value.primaryColor;
  params.value.secondaryColor = selectedPreset.value.secondaryColor;
  // 保存到设置
  settingsStore.updateSettings({ stylePreset: selectedPresetId.value } as any);
});

onMounted(() => {
  const templateId = route.query.template as string;
  if (templateId) {
    selectedTemplateId.value = templateId;
    fillFromTemplate();
  }
  const desc = route.query.desc as string;
  if (desc) {
    description.value = desc;
  }
  // 从设置恢复风格
  const saved = (settingsStore.settings as any).stylePreset;
  if (saved) selectedPresetId.value = saved;
});

watch(selectedTemplateId, () => {
  fillFromTemplate();
});

/** 根据选中模板自动填充描述和高级参数 */
function fillFromTemplate() {
  const tpl = selectedTemplate.value;
  if (!tpl) return;
  description.value = tpl.description;
  if (tpl.defaultParams) {
    params.value.duration = tpl.defaultParams.duration;
    params.value.fps = tpl.defaultParams.fps;
  }
}

/** 点击生成：创建任务 → mock 进度 → 跳转渲染页 */
async function handleGenerate() {
  if (!canGenerate.value || isGenerating.value) return;
  isGenerating.value = true;

  // 创建任务
  const job = jobManager.createJob("generate", "正在排队…");
  activeJob.value = job;

  // 模拟进度
  jobManager.startMockProgress(job.id, {
    duration: 4000,
    steps: ["分析概念…", "生成脚本…", "优化动画…", "脚本就绪！"],
    onDone: async (finishedJob) => {
      await generateStore.generateScript({
        description: description.value,
        templateId: selectedTemplateId.value,
        params: { ...params.value, style: "modern" },
      });
      activeJob.value = finishedJob;
      isGenerating.value = false;
      // 跳转渲染页
      router.push("/render");
    },
    onFail: (failedJob) => {
      activeJob.value = failedJob;
      isGenerating.value = false;
    },
  });
}

/** 导出脚本为 .py 文件 */
async function handleExportScript() {
  if (!generateStore.generatedScript) return;
  try {
    const filename = `animation_${Date.now()}.py`;
    await exportScriptFile(generateStore.generatedScript, filename);
    exportMsg.value = "脚本已保存";
  } catch {
    // 浏览器端降级：用 Blob 下载
    const blob = new Blob([generateStore.generatedScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `animation_${Date.now()}.py`;
    a.click();
    URL.revokeObjectURL(url);
    exportMsg.value = "脚本已下载";
  }
  if (exportMsgTimer) clearTimeout(exportMsgTimer);
  exportMsgTimer = setTimeout(() => { exportMsg.value = ""; }, 3000);
}
</script>

<template>
  <div class="generate-page">
    <header class="page-header">
      <h2 class="page-title">AI 生成</h2>
      <p class="page-subtitle">描述你的知识点，AI 将自动生成动画脚本</p>
    </header>

    <div class="generate-content">
      <!-- ===== 左侧：输入面板 ===== -->
      <div class="input-panel">
        <!-- 模板选择 -->
        <div class="form-group">
          <label class="form-label">选择模板（可选）</label>
          <select v-model="selectedTemplateId" class="form-select">
            <option value="">从头开始</option>
            <option
              v-for="tpl in templateStore.templates"
              :key="tpl.id"
              :value="tpl.id"
            >
              {{ tpl.emoji }} {{ tpl.title }}
            </option>
          </select>
        </div>

        <!-- 描述输入 -->
        <div class="form-group">
          <label class="form-label">知识点描述</label>
          <textarea
            v-model="description"
            class="form-textarea"
            rows="8"
            placeholder="例如：演示勾股定理的几何证明，展示直角三角形三边的关系..."
          ></textarea>
          <!-- 概念分析标签 -->
          <div v-if="analysis" class="analysis-tag" :class="analysis.type">
            <span class="tag-dot" />
            <span>{{ analysis.label }}</span>
          </div>
          <!-- 字数统计 -->
          <div class="char-count" :style="{ color: charColor }">
            {{ charCount }} / {{ maxChars }}
          </div>
          <div class="char-bar">
            <div
              class="char-bar-fill"
              :style="{ width: charPercent + '%', background: charColor }"
            />
          </div>
        </div>

        <!-- 高级参数切换 -->
        <button class="toggle-button" @click="showAdvanced = !showAdvanced">
          <span>⚙️ 高级参数</span>
          <span class="toggle-arrow" :class="{ open: showAdvanced }">▶</span>
        </button>

        <!-- 高级参数面板 -->
        <Transition name="slide">
          <div v-if="showAdvanced" class="advanced-params">
            <!-- 风格预设选择 -->
            <div class="param-group">
              <label class="param-label">视觉风格</label>
              <div class="preset-grid">
                <button
                  v-for="preset in stylePresets"
                  :key="preset.id"
                  class="preset-card"
                  :class="{ active: selectedPresetId === preset.id }"
                  @click="selectedPresetId = preset.id"
                >
                  <div class="preset-colors">
                    <span class="color-dot" :style="{ background: preset.primaryColor }" />
                    <span class="color-dot" :style="{ background: preset.secondaryColor }" />
                    <span class="color-dot" :style="{ background: preset.background }" />
                  </div>
                  <span class="preset-name">{{ preset.name }}</span>
                  <span class="preset-desc">{{ preset.description }}</span>
                </button>
              </div>
            </div>

            <div class="param-group">
              <label class="param-label">颜色主题</label>
              <div class="color-picker-group">
                <div class="color-input">
                  <label>主色</label>
                  <input type="color" v-model="params.primaryColor" />
                </div>
                <div class="color-input">
                  <label>强调色</label>
                  <input type="color" v-model="params.secondaryColor" />
                </div>
              </div>
            </div>

            <div class="param-group">
              <label class="param-label">时长（秒）：{{ params.duration }}</label>
              <input v-model.number="params.duration" type="range" min="10" max="120" step="5" class="range-input" />
            </div>

            <div class="param-group">
              <label class="param-label">帧率：{{ params.fps }} FPS</label>
              <input v-model.number="params.fps" type="range" min="24" max="60" step="6" class="range-input" />
            </div>

            <div class="param-group">
              <label class="param-label">分辨率</label>
              <select v-model="params.resolution" class="form-select">
                <option value="1080p">1080p (Full HD)</option>
                <option value="4k">4K (Ultra HD) - Pro</option>
              </select>
            </div>
          </div>
        </Transition>

        <!-- 任务进度条 -->
        <div v-if="isGenerating && activeJob" class="job-progress">
          <div class="progress-header">
            <span class="progress-message">{{ jobMessage }}</span>
            <span class="progress-percent">{{ jobProgress }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: jobProgress + '%' }" />
          </div>
        </div>

        <!-- 生成按钮 -->
        <button
          class="generate-button"
          :disabled="!canGenerate || isGenerating"
          @click="handleGenerate"
        >
          <span v-if="!isGenerating">✨ 生成脚本</span>
          <span v-else class="btn-loading">
            <span class="spinner" /> 处理中…
          </span>
        </button>
      </div>

      <!-- ===== 右侧：脚本预览 ===== -->
      <div class="preview-panel">
        <div class="preview-header">
          <h3 class="preview-title">生成的脚本</h3>
          <button
            v-if="generateStore.generatedScript"
            class="action-button"
            @click="generateStore.copyScript"
          >
            📋 复制
          </button>
          <button
            v-if="generateStore.generatedScript"
            class="action-button"
            @click="handleExportScript"
          >
            💾 导出脚本
          </button>
        </div>
        <div v-if="exportMsg" class="export-toast">{{ exportMsg }}</div>

        <div class="code-preview">
          <div v-if="generateStore.isLoading" class="loading-state">
            <div class="spinner" />
            <p>AI 正在生成脚本...</p>
          </div>

          <div v-else-if="generateStore.generatedScript" class="code-content">
            <pre><code>{{ generateStore.generatedScript }}</code></pre>
          </div>

          <div v-else class="empty-state">
            <span class="empty-icon">📝</span>
            <p>输入描述并点击"生成脚本"</p>
            <p class="empty-hint">输入知识点名称，智能生成精美动画脚本</p>
          </div>
        </div>

        <div v-if="generateStore.error" class="error-message">
          ❌ {{ generateStore.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.generate-page {
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  background: linear-gradient(135deg, #00d4ff, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-subtitle {
  font-size: 1rem;
  color: #9ca3af;
  margin: 0;
}

.generate-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

/* ---- 输入面板 ---- */
.input-panel {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  margin-bottom: 0.5rem;
}

.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  color: #fff;
  font-size: 0.875rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
}

.form-select option,
.form-textarea::placeholder {
  color: #6b7280;
}

.form-textarea {
  resize: vertical;
  min-height: 150px;
}

/* ---- 概念分析标签 ---- */
.analysis-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.375rem 0.875rem;
  border-radius: 1rem;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: all 0.25s;
}

.analysis-tag .tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.analysis-tag.latex {
  background: rgba(124, 58, 237, 0.15);
  color: #a78bfa;
  border: 1px solid rgba(124, 58, 237, 0.3);
}
.analysis-tag.latex .tag-dot { background: #a78bfa; }

.analysis-tag.template {
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
  border: 1px solid rgba(0, 212, 255, 0.3);
}
.analysis-tag.template .tag-dot { background: #00d4ff; }

.analysis-tag.ai {
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.3);
}
.analysis-tag.ai .tag-dot { background: #34d399; }

/* 字数统计 */
.char-count {
  font-size: 0.75rem;
  text-align: right;
  margin-top: 0.5rem;
  transition: color 0.2s;
}

.char-bar {
  height: 3px;
  background: #2a2a4a;
  border-radius: 2px;
  margin-top: 0.25rem;
  overflow: hidden;
}

.char-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.2s, background 0.2s;
}

/* ---- 高级参数折叠 ---- */
.toggle-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #2a2a4a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-button:hover {
  background: #3a3a5a;
}

.toggle-arrow {
  transition: transform 0.25s ease;
  font-size: 0.7rem;
}

.toggle-arrow.open {
  transform: rotate(90deg);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
  max-height: 800px;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  padding-top: 0;
}

.advanced-params {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #2a2a4a;
}

.param-group {
  margin-bottom: 1.25rem;
}

.param-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  margin-bottom: 0.5rem;
}

/* ---- 风格预设网格 ---- */
.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.375rem;
  padding: 0.75rem;
  background: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.preset-card:hover {
  border-color: #00d4ff;
}

.preset-card.active {
  border-color: #00d4ff;
  background: rgba(0, 212, 255, 0.05);
}

.preset-colors {
  display: flex;
  gap: 0.375rem;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.15);
}

.preset-name {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fff;
}

.preset-desc {
  font-size: 0.6875rem;
  color: #6b7280;
  line-height: 1.3;
}

.color-picker-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.color-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.color-input label {
  font-size: 0.75rem;
  color: #9ca3af;
}

.color-input input[type="color"] {
  width: 100%;
  height: 40px;
  padding: 0.25rem;
  background: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  cursor: pointer;
}

.range-input {
  width: 100%;
  height: 6px;
  background: #2a2a4a;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #00d4ff;
  border-radius: 50%;
  cursor: pointer;
}

.range-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #00d4ff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

/* ---- 任务进度 ---- */
.job-progress {
  margin-top: 1rem;
  padding: 0.875rem 1rem;
  background: rgba(0, 212, 255, 0.05);
  border: 1px solid rgba(0, 212, 255, 0.15);
  border-radius: 0.5rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.progress-message {
  font-size: 0.8125rem;
  color: #9ca3af;
}

.progress-percent {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #00d4ff;
}

.progress-bar {
  height: 6px;
  background: #2a2a4a;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #00d4ff, #7c3aed);
  border-radius: 3px;
  transition: width 0.4s ease;
}

/* ---- 生成按钮 ---- */
.generate-button {
  width: 100%;
  margin-top: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, #00d4ff, #7c3aed);
  border: none;
  border-radius: 0.5rem;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.generate-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 212, 255, 0.3);
}

.generate-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-loading {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

/* ---- 预览面板 ---- */
.preview-panel {
  position: sticky;
  top: 2rem;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.preview-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  margin: 0;
}

.action-button {
  padding: 0.5rem 1rem;
  background: #2a2a4a;
  border: 1px solid #2a2a4a;
  border-radius: 0.375rem;
  color: #fff;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s;
}

.action-button:hover {
  background: #3a3a5a;
}

.code-preview {
  background: #1a1a2e;
  border: 1px solid #2a2a4a;
  border-radius: 0.75rem;
  height: 500px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.code-content {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.code-content pre {
  margin: 0;
  font-family: "Monaco", "Menlo", monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #e5e7eb;
}

.code-content code {
  color: inherit;
}

.loading-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #9ca3af;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #2a2a4a;
  border-top-color: #00d4ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: #9ca3af;
  text-align: center;
  padding: 2rem;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.875rem;
  color: #6b7280;
}

.error-message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  color: #ef4444;
  font-size: 0.875rem;
}

.export-toast {
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  background: rgba(52, 211, 153, 0.1);
  border: 1px solid rgba(52, 211, 153, 0.3);
  border-radius: 0.5rem;
  color: #34d399;
  font-size: 0.8125rem;
  text-align: center;
}

@media (max-width: 1024px) {
  .generate-content { grid-template-columns: 1fr; }
  .preview-panel { position: static; }
  .preset-grid { grid-template-columns: 1fr; }
}
</style>
