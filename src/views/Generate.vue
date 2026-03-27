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
import type { UsageResult } from "../services/ai-generator";
import { getRecommendedCases, getNarrationStyleById, type Case } from "../services/caseService";

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
const selectedPresetId = ref("minimal-light");
const selectedPreset = computed<StylePreset>(() =>
  stylePresets.find(p => p.id === selectedPresetId.value) ?? stylePresets[0]
);

// 解说风格
interface NarrationStyle {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const narrationStyles: NarrationStyle[] = [
  { id: "classroom", name: "课堂讲解", icon: "🎓", description: "教师口吻，循序渐进，适合教学场景" },
  { id: "popular-science", name: "科普传播", icon: "📢", description: "生动有趣，通俗易懂，面向大众" },
  { id: "academic", name: "学术报告", icon: "🎯", description: "专业严谨，逻辑清晰，适合学术场合" },
  { id: "fun-animation", name: "趣味动画", icon: "🎬", description: "轻松活泼，富有创意，吸引眼球" },
  { id: "minimal-tech", name: "极简科技", icon: "🖥️", description: "简洁精准，专业可靠，科技感强" },
  { id: "storytelling", name: "故事叙述", icon: "📖", description: "叙事性强，引人入胜，情感共鸣" },
];

const selectedNarrationStyle = ref<NarrationStyle>(narrationStyles[0]);

// 高级参数
const params = ref({
  primaryColor: "#007aff",
  secondaryColor: "#5856d6",
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
  if (charCount.value > maxChars) return "var(--error)";
  if (charCount.value > maxChars * 0.9) return "var(--warning)";
  return "var(--text-tertiary)";
});

// 生成按钮 loading 状态
const isGenerating = ref(false);

// 任务状态
const activeJob = ref<jobManager.Job | null>(null);
const jobProgress = computed(() => activeJob.value?.progress ?? 0);
const jobMessage = computed(() => activeJob.value?.message ?? "");

// 用量信息
const usageInfo = computed<UsageResult | null>(() => generateStore.usage);
const usageText = computed(() => {
  const usage = usageInfo.value;
  if (!usage) return "";
  const max = usage.maxPerMonth === -1 ? "不限" : usage.maxPerMonth;
  return `${usage.planName} · 本月已用 ${usage.usedThisMonth}/${max} 次`;
});

// 参考案例
const recommendedCases = ref<Case[]>([]);
const showCases = ref(false);

// 错误提示
const showError = ref(false);
const errorMessage = ref("");


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

onMounted(async () => {
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

  // 获取用量信息
  await generateStore.fetchUsage();

  // 加载推荐案例
  try {
    recommendedCases.value = await getRecommendedCases(4);
  } catch (error) {
    console.error('Failed to load recommended cases:', error);
  }
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

/** 点击生成：创建任务 → 调用 API → 跳转渲染页 */
async function handleGenerate() {
  if (!canGenerate.value || isGenerating.value) return;
  isGenerating.value = true;
  showError.value = false;

  // 创建任务
  const job = jobManager.createJob("generate", "正在生成…");
  activeJob.value = job;

  // 模拟进度
  jobManager.startMockProgress(job.id, {
    duration: 4000,
    steps: ["分析概念…", "生成脚本…", "优化动画…", "完成！"],
    onDone: async (finishedJob) => {
      // 调用 API 生成
      await generateStore.generateScript({
        description: description.value,
        templateId: selectedTemplateId.value,
        params: {
          ...params.value,
          style: "modern",
          narrationStyle: selectedNarrationStyle.value.id,
        },
      });

      activeJob.value = finishedJob;
      isGenerating.value = false;

      // 检查是否有错误
      if (generateStore.error) {
        showError.value = true;
        errorMessage.value = generateStore.error;
        return;
      }

      // 跳转渲染页
      router.push("/render");
    },
    onFail: (failedJob) => {
      activeJob.value = failedJob;
      isGenerating.value = false;
      showError.value = true;
      errorMessage.value = "生成失败，请稍后重试";
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

/** 使用参考案例 */
function useCase(caseItem: Case) {
  description.value = caseItem.prompt || caseItem.description || "";

  // 如果案例有解说风格，自动选择
  if (caseItem.narration_style) {
    const styleInfo = getNarrationStyleById(caseItem.narration_style);
    if (styleInfo) {
      selectedNarrationStyle.value = styleInfo as any;
    }
  }

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<template>
  <div class="generate-page">
    <header class="page-header">
      <h1 class="page-title">AI 生成</h1>
      <p class="page-subtitle">描述你的知识点，AI 将自动生成动画脚本</p>
      <!-- 用量显示 -->
      <div v-if="usageInfo" class="usage-display">
        {{ usageText }}
      </div>
    </header>

    <div class="generate-content">
      <!-- 左侧：输入面板 -->
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

        <!-- 风格预设选择 -->
        <div class="style-section">
          <label class="section-label">视觉风格</label>
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
              </div>
              <span class="preset-name">{{ preset.name }}</span>
            </button>
          </div>
        </div>

        <!-- 解说风格选择 -->
        <div class="style-section">
          <label class="section-label">解说风格</label>
          <div class="narration-grid">
            <button
              v-for="style in narrationStyles"
              :key="style.id"
              class="narration-card"
              :class="{ active: selectedNarrationStyle.id === style.id }"
              @click="selectedNarrationStyle = style"
            >
              <span class="narration-icon">{{ style.icon }}</span>
              <div class="narration-content">
                <span class="narration-name">{{ style.name }}</span>
                <span class="narration-desc">{{ style.description }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- 高级参数切换 -->
        <button class="toggle-button" @click="showAdvanced = !showAdvanced">
          <span>高级参数</span>
          <span class="toggle-icon" :class="{ open: showAdvanced }">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>

        <!-- 高级参数面板 -->
        <Transition name="slide">
          <div v-if="showAdvanced" class="advanced-params">
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
          <span v-if="!isGenerating">生成脚本</span>
          <span v-else class="btn-loading">
            <span class="spinner" />
            处理中…
          </span>
        </button>
      </div>

      <!-- 右侧：脚本预览 -->
      <div class="preview-panel">
        <div class="preview-header">
          <h2 class="preview-title">生成的脚本</h2>
          <div class="preview-actions">
            <button
              v-if="generateStore.generatedScript"
              class="action-button"
              @click="generateStore.copyScript"
            >
              复制
            </button>
            <button
              v-if="generateStore.generatedScript"
              class="action-button"
              @click="handleExportScript"
            >
              导出脚本
            </button>
          </div>
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

        <!-- 错误提示 -->
        <Transition name="fade">
          <div v-if="showError && errorMessage" class="error-message-inline">
            <span class="error-icon">⚠️</span>
            <span class="error-text">{{ errorMessage }}</span>
            <button
              v-if="errorMessage.includes('升级')"
              class="upgrade-button"
              @click="router.push('/settings')"
            >
              升级订阅
            </button>
          </div>
        </Transition>

        <div v-if="generateStore.error && !showError" class="error-message">
          {{ generateStore.error }}
        </div>

        <!-- 参考案例面板 -->
        <div v-if="recommendedCases.length > 0" class="reference-cases">
          <div class="reference-header">
            <h3 class="reference-title">参考案例</h3>
            <button class="toggle-cases-btn" @click="showCases = !showCases">
              {{ showCases ? '收起' : '展开' }}
              <span class="toggle-icon" :class="{ open: showCases }">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </button>
          </div>

          <Transition name="slide-down">
            <div v-if="showCases" class="reference-list">
              <div
                v-for="caseItem in recommendedCases"
                :key="caseItem.id"
                class="reference-item"
                @click="useCase(caseItem)"
              >
                <div class="reference-icon">
                  {{ getNarrationStyleById(caseItem.narration_style || '')?.icon || '💡' }}
                </div>
                <div class="reference-info">
                  <span class="reference-name">{{ caseItem.title }}</span>
                  <span class="reference-desc">{{ caseItem.description }}</span>
                </div>
                <span class="reference-arrow">→</span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.generate-page {
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

/* 用量显示 */
.usage-display {
  display: inline-block;
  margin-top: 12px;
  padding: 6px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  font-size: 13px;
  color: var(--text-tertiary);
  font-weight: 500;
}

/* ==================== 内容布局 ==================== */

.generate-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-component);
  align-items: start;
}

/* ==================== 输入面板 ==================== */

.input-panel {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: var(--spacing-card);
  box-shadow: var(--shadow-card);
}

/* 表单组 */
.form-group {
  margin-bottom: var(--spacing-component);
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.form-select,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-size: 15px;
  font-family: inherit;
  transition: all var(--transition-base) var(--ease-apple);
}

.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
}

.form-select option,
.form-textarea::placeholder {
  color: var(--text-tertiary);
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
}

/* 概念分析标签 */
.analysis-tag {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-base) var(--ease-apple);
}

.analysis-tag .tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.analysis-tag.latex {
  background-color: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
  border: 1px solid rgba(124, 58, 237, 0.2);
}
.analysis-tag.latex .tag-dot { background: #7c3aed; }

.analysis-tag.template {
  background-color: rgba(0, 122, 255, 0.1);
  color: var(--accent);
  border: 1px solid rgba(0, 122, 255, 0.2);
}
.analysis-tag.template .tag-dot { background: var(--accent); }

.analysis-tag.ai {
  background-color: rgba(52, 199, 89, 0.1);
  color: var(--success);
  border: 1px solid rgba(52, 199, 89, 0.2);
}
.analysis-tag.ai .tag-dot { background: var(--success); }

/* 字数统计 */
.char-count {
  font-size: 11px;
  text-align: right;
  margin-top: 8px;
  transition: color var(--transition-base) var(--ease-apple);
}

.char-bar {
  height: 4px;
  background-color: var(--bg-tertiary);
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;
}

.char-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width var(--transition-base) var(--ease-apple),
              background var(--transition-base) var(--ease-apple);
}

/* ==================== 风格选择 ==================== */

.style-section {
  margin-bottom: var(--spacing-component);
}

.section-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 12px;
}

/* 视觉风格网格 */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.preset-card:hover {
  border-color: var(--accent);
  background-color: var(--bg-tertiary);
}

.preset-card.active {
  border-color: var(--accent);
  background-color: rgba(0, 122, 255, 0.08);
}

.preset-colors {
  display: flex;
  gap: 4px;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.15);
}

.preset-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 解说风格网格 */
.narration-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.narration-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
  text-align: left;
}

.narration-card:hover {
  border-color: var(--accent);
  background-color: var(--bg-tertiary);
}

.narration-card.active {
  border-color: var(--accent);
  background-color: rgba(0, 122, 255, 0.08);
}

.narration-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.narration-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.narration-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.narration-desc {
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.4;
}

/* ==================== 高级参数 ==================== */

.toggle-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
  margin-bottom: var(--spacing-component);
}

.toggle-button:hover {
  background-color: var(--bg-tertiary);
}

.toggle-icon {
  transition: transform var(--transition-base) var(--ease-apple);
  color: var(--text-secondary);
}

.toggle-icon.open {
  transform: rotate(180deg);
}

.slide-enter-active,
.slide-leave-active {
  transition: all var(--transition-slow) var(--ease-apple);
  overflow: hidden;
  max-height: 500px;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  padding-top: 0;
}

.advanced-params {
  padding-top: var(--spacing-component);
  border-top: 1px solid var(--border);
}

.param-group {
  margin-bottom: var(--spacing-component);
}

.param-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.color-picker-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-component);
}

.color-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-input label {
  font-size: 13px;
  color: var(--text-secondary);
}

.color-input input[type="color"] {
  width: 100%;
  height: 44px;
  padding: 4px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  cursor: pointer;
}

.range-input {
  width: 100%;
  height: 6px;
  background-color: var(--bg-tertiary);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background-color: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.range-input::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background-color: var(--accent);
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* ==================== 任务进度 ==================== */

.job-progress {
  margin-top: var(--spacing-component);
  padding: 12px 16px;
  background-color: rgba(0, 122, 255, 0.05);
  border: 1px solid rgba(0, 122, 255, 0.15);
  border-radius: var(--radius-input);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-message {
  font-size: 13px;
  color: var(--text-secondary);
}

.progress-percent {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.progress-bar {
  height: 4px;
  background-color: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: var(--accent);
  border-radius: 2px;
  transition: width 0.4s var(--ease-apple);
}

/* ==================== 生成按钮 ==================== */

.generate-button {
  width: 100%;
  margin-top: var(--spacing-component);
  padding: 12px;
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-button);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.generate-button:hover:not(:disabled) {
  background-color: var(--accent-hover);
  transform: scale(1.01);
}

.generate-button:active:not(:disabled) {
  transform: scale(0.99);
}

.generate-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-loading {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* ==================== 预览面板 ==================== */

.preview-panel {
  position: sticky;
  top: var(--spacing-page);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-component);
}

.preview-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.preview-actions {
  display: flex;
  gap: 8px;
}

.action-button {
  padding: 8px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.action-button:hover {
  background-color: var(--bg-tertiary);
}

.code-preview {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  height: 600px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-card);
}

.code-content {
  flex: 1;
  overflow: auto;
  padding: var(--spacing-card);
}

.code-content pre {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary);
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
  gap: var(--spacing-component);
  color: var(--text-secondary);
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--bg-tertiary);
  border-top-color: var(--accent);
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
  gap: 8px;
  color: var(--text-secondary);
  text-align: center;
  padding: var(--spacing-relaxed);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 13px;
  color: var(--text-tertiary);
}

.error-message {
  margin-top: var(--spacing-component);
  padding: 12px 16px;
  background-color: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.2);
  border-radius: var(--radius-input);
  color: var(--error);
  font-size: 13px;
}

/* 内联错误提示 */
.error-message-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: var(--spacing-component);
  padding: 12px 16px;
  background-color: rgba(255, 149, 0, 0.1);
  border: 1px solid rgba(255, 149, 0, 0.2);
  border-radius: var(--radius-input);
  font-size: 13px;
}

.error-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.error-text {
  flex: 1;
  color: var(--text-secondary);
}

.upgrade-button {
  padding: 6px 12px;
  background-color: var(--accent);
  border: none;
  border-radius: var(--radius-input);
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
  white-space: nowrap;
}

.upgrade-button:hover {
  background-color: var(--accent-hover);
  transform: scale(1.02);
}

/* Fade 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base) var(--ease-apple);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.export-toast {
  margin-bottom: var(--spacing-component);
  padding: 10px 16px;
  background-color: rgba(52, 199, 89, 0.1);
  border: 1px solid rgba(52, 199, 89, 0.2);
  border-radius: var(--radius-input);
  color: var(--success);
  font-size: 13px;
  text-align: center;
}

/* ==================== 参考案例面板 ==================== */

.reference-cases {
  margin-top: var(--spacing-component);
  padding: var(--spacing-card);
  background-color: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}

.reference-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-component);
}

.reference-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.toggle-cases-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-small);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.toggle-cases-btn:hover {
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
}

.toggle-icon {
  transition: transform var(--transition-base) var(--ease-apple);
}

.toggle-icon.open {
  transform: rotate(180deg);
}

.reference-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reference-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.reference-item:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--accent);
  transform: translateX(4px);
}

.reference-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.reference-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reference-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
}

.reference-desc {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.reference-arrow {
  font-size: 18px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: color var(--transition-base) var(--ease-apple);
}

.reference-item:hover .reference-arrow {
  color: var(--accent);
}

/* Slide down animation */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all var(--transition-base) var(--ease-apple);
  overflow: hidden;
  max-height: 500px;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ==================== 响应式 ==================== */

@media (max-width: 1024px) {
  .generate-content {
    grid-template-columns: 1fr;
  }

  .preview-panel {
    position: static;
  }

  .preset-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .narration-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .preset-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
