<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useTemplateStore } from "../stores/templateStore";
import { useGenerateStore } from "../stores/generateStore";

const router = useRouter();
const route = useRoute();
const templateStore = useTemplateStore();
const generateStore = useGenerateStore();

const description = ref("");
const selectedTemplateId = ref("");
const showAdvanced = ref(false);

// Advanced parameters
const params = ref({
  primaryColor: "#00d4ff",
  secondaryColor: "#7c3aed",
  style: "modern" as "modern" | "classic" | "minimal",
  duration: 30,
  fps: 60,
  resolution: "1080p" as "1080p" | "4k",
});

const selectedTemplate = computed(() => {
  if (!selectedTemplateId.value) return null;
  return templateStore.templates.find(t => t.id === selectedTemplateId.value);
});

const canGenerate = computed(() => {
  return description.value.trim().length > 0;
});

onMounted(() => {
  const templateId = route.query.template as string;
  if (templateId) {
    selectedTemplateId.value = templateId;
    const template = templateStore.templates.find(t => t.id === templateId);
    if (template) {
      description.value = template.description;
    }
  }
});

const handleGenerateScript = async () => {
  if (!canGenerate.value) return;

  await generateStore.generateScript({
    description: description.value,
    templateId: selectedTemplateId.value,
    params: params.value,
  });
};

const handleStartRender = () => {
  router.push("/render");
};

const handleTemplateChange = () => {
  if (selectedTemplate.value) {
    description.value = selectedTemplate.value.description;
  }
};
</script>

<template>
  <div class="generate-page">
    <!-- Header -->
    <header class="page-header">
      <h2 class="page-title">AI 生成</h2>
      <p class="page-subtitle">描述你的知识点，AI 将自动生成动画脚本</p>
    </header>

    <div class="generate-content">
      <!-- Left Panel -->
      <div class="input-panel">
        <!-- Template Selection -->
        <div class="form-group">
          <label class="form-label">选择模板（可选）</label>
          <select v-model="selectedTemplateId" class="form-select" @change="handleTemplateChange">
            <option value="">从头开始</option>
            <option v-for="template in templateStore.templates" :key="template.id" :value="template.id">
              {{ template.emoji }} {{ template.title }}
            </option>
          </select>
        </div>

        <!-- Description Input -->
        <div class="form-group">
          <label class="form-label">知识点描述</label>
          <textarea
            v-model="description"
            class="form-textarea"
            rows="8"
            placeholder="例如：演示勾股定理的几何证明，展示直角三角形三边的关系..."
          ></textarea>
          <p class="form-hint">
            {{ description.length }} / 2000 字符
          </p>
        </div>

        <!-- Advanced Parameters Toggle -->
        <button class="toggle-button" @click="showAdvanced = !showAdvanced">
          <span>⚙️ 高级参数</span>
          <span class="toggle-icon">{{ showAdvanced ? '▼' : '▶' }}</span>
        </button>

        <!-- Advanced Parameters -->
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
            <label class="param-label">视觉风格</label>
            <div class="style-options">
              <button
                v-for="style in ['modern', 'classic', 'minimal']"
                :key="style"
                class="style-option"
                :class="{ active: params.style === style }"
                @click="params.style = style as any"
              >
                {{ style === 'modern' ? '现代' : style === 'classic' ? '经典' : '极简' }}
              </button>
            </div>
          </div>

          <div class="param-group">
            <label class="param-label">时长（秒）：{{ params.duration }}</label>
            <input
              v-model.number="params.duration"
              type="range"
              min="10"
              max="120"
              step="5"
              class="range-input"
            />
          </div>

          <div class="param-group">
            <label class="param-label">帧率：{{ params.fps }} FPS</label>
            <input
              v-model.number="params.fps"
              type="range"
              min="24"
              max="60"
              step="6"
              class="range-input"
            />
          </div>

          <div class="param-group">
            <label class="param-label">分辨率</label>
            <select v-model="params.resolution" class="form-select">
              <option value="1080p">1080p (Full HD)</option>
              <option value="4k">4K (Ultra HD) - Pro</option>
            </select>
          </div>
        </div>

        <!-- Generate Button -->
        <button
          class="generate-button"
          :class="{ loading: generateStore.isLoading }"
          :disabled="!canGenerate || generateStore.isLoading"
          @click="handleGenerateScript"
        >
          <span v-if="!generateStore.isLoading">✨ 生成脚本</span>
          <span v-else>生成中...</span>
        </button>
      </div>

      <!-- Right Panel - Code Preview -->
      <div class="preview-panel">
        <div class="preview-header">
          <h3 class="preview-title">生成的脚本</h3>
          <div v-if="generateStore.generatedScript" class="preview-actions">
            <button class="action-button" @click="generateStore.copyScript">📋 复制</button>
          </div>
        </div>

        <div class="code-preview">
          <div v-if="generateStore.isLoading" class="loading-state">
            <div class="spinner"></div>
            <p>AI 正在生成脚本...</p>
          </div>

          <div v-else-if="generateStore.generatedScript" class="code-content">
            <pre><code>{{ generateStore.generatedScript }}</code></pre>
          </div>

          <div v-else class="empty-state">
            <span class="empty-icon">📝</span>
            <p>输入描述并点击"生成脚本"</p>
            <p class="empty-hint">AI 将为你生成完整的 Manim Python 代码</p>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="generateStore.error" class="error-message">
          ❌ {{ generateStore.error }}
        </div>

        <!-- Render Button -->
        <button
          v-if="generateStore.generatedScript"
          class="render-button"
          @click="handleStartRender"
        >
          🎬 开始渲染
        </button>
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

.generate-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}

.input-panel {
  background-color: #1a1a2e;
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
  color: #ffffff;
  margin-bottom: 0.5rem;
}

.form-select,
.form-textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.875rem;
  font-family: inherit;
  transition: all 0.2s;
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

.form-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.5rem;
  text-align: right;
}

.toggle-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.toggle-button:hover {
  background-color: #3a3a5a;
}

.toggle-icon {
  font-size: 0.75rem;
  transition: transform 0.2s;
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
  color: #ffffff;
  margin-bottom: 0.5rem;
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
  background-color: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  cursor: pointer;
}

.style-options {
  display: flex;
  gap: 0.5rem;
}

.style-option {
  flex: 1;
  padding: 0.625rem 1rem;
  background-color: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  color: #9ca3af;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.style-option:hover {
  border-color: #00d4ff;
  color: #ffffff;
}

.style-option.active {
  background-color: #00d4ff;
  border-color: #00d4ff;
  color: #0f0f1a;
}

.range-input {
  width: 100%;
  height: 6px;
  background-color: #2a2a4a;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

.range-input::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background-color: #00d4ff;
  border-radius: 50%;
  cursor: pointer;
}

.range-input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background-color: #00d4ff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.generate-button {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  border: none;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.generate-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 212, 255, 0.3);
}

.generate-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.generate-button.loading {
  opacity: 0.7;
}

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
  margin: 0;
  color: #ffffff;
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.5rem 1rem;
  background-color: #2a2a4a;
  border: 1px solid #2a2a4a;
  border-radius: 0.375rem;
  color: #ffffff;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.action-button:hover {
  background-color: #3a3a5a;
}

.code-preview {
  background-color: #1a1a2e;
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
  font-family: 'Monaco', 'Menlo', monospace;
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
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  color: #ef4444;
  font-size: 0.875rem;
}

.render-button {
  width: 100%;
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border: none;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.render-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
}

@media (max-width: 1024px) {
  .generate-content {
    grid-template-columns: 1fr;
  }

  .preview-panel {
    position: static;
  }
}
</style>
