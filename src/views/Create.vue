<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import VideoPlayer from "../components/VideoPlayer.vue";
import Toast from "../components/Toast.vue";
import { convertFileSrc } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

const router = useRouter();
const route = useRoute();

// ==================== 输入状态 ====================

const description = ref("");

// ==================== 示例建议 ====================

interface ExamplePrompt {
  text: string;
  icon: string;
}

const examplePrompts: ExamplePrompt[] = [
  { text: "勾股定理的几何证明", icon: "📐" },
  { text: "牛顿第三定律", icon: "🍎" },
  { text: "原子结构模型", icon: "⚛️" },
  { text: "二次函数图像", icon: "📈" },
];

function handleExampleClick(example: ExamplePrompt) {
  description.value = example.text;
}

// ==================== 解说风格 ====================

interface NarrationStyle {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const narrationStyles: NarrationStyle[] = [
  { id: "classroom", name: "课堂讲解", icon: "🎓", description: "教师口吻，循序渐进" },
  { id: "popular-science", name: "科普传播", icon: "📢", description: "生动有趣，通俗易懂" },
  { id: "academic", name: "学术报告", icon: "🎯", description: "专业严谨，逻辑清晰" },
  { id: "fun-animation", name: "趣味动画", icon: "🎬", description: "轻松活泼，富有创意" },
  { id: "minimal-tech", name: "极简科技", icon: "🖥️", description: "简洁精准，专业可靠" },
  { id: "storytelling", name: "故事叙述", icon: "📖", description: "叙事性强，引人入胜" },
];

const selectedNarrationStyle = ref<NarrationStyle>(narrationStyles[0]);

// ==================== 视觉风格 ====================

interface VisualStyle {
  id: string;
  name: string;
  color: string;
}

const visualStyles: VisualStyle[] = [
  { id: "deep-space", name: "深空科技", color: "#00d4ff" },
  { id: "classic-minimal", name: "经典极简", color: "#2c3e50" },
  { id: "vibrant-campus", name: "活力学院", color: "#e17055" },
  { id: "math-classic", name: "数学经典", color: "#58c4dd" },
];

const selectedVisualStyle = ref<VisualStyle>(visualStyles[0]);

// ==================== 生成状态 ====================

type GenerationPhase = "idle" | "generating" | "rendering" | "done";
const phase = ref<GenerationPhase>("idle");
const progress = ref(0);
const statusMessage = ref("");

// ==================== 视频路径 ====================

const videoPath = ref<string>("");

// ==================== Toast 反馈 ====================

const toastVisible = ref(false);
const toastMessage = ref("");
const toastType = ref<"success" | "error" | "warning" | "info">("success");

function showToast(message: string, type: "success" | "error" | "warning" | "info" = "success") {
  toastMessage.value = message;
  toastType.value = type;
  toastVisible.value = true;
  setTimeout(() => {
    toastVisible.value = false;
  }, 3000);
}

// ==================== 用户ID ====================

const getUserId = () => {
  const userId = localStorage.getItem("user_id");
  if (userId) return userId;
  const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem("user_id", newId);
  return newId;
};

// ==================== 计算属性 ====================

const canGenerate = computed(() => description.value.trim().length > 0);

// ==================== 生成动画 ====================

async function handleGenerate() {
  if (!canGenerate.value || phase.value !== "idle") return;

  phase.value = "generating";
  progress.value = 0;

  // 用户友好的进度文案（不含技术术语）
  const sciStatuses = [
    "正在理解你的知识点...",
    "构思动画场景中...",
    "搭建视觉框架...",
    "设计动画效果...",
    "绘制图形元素...",
    "编排过渡动画...",
    "优化视觉细节...",
    "合成最终画面...",
    "渲染高质量视频...",
    "即将完成...",
  ];

  // 全程持续动画的进度条，不会卡住
  let stopProgress = false;
  let statusIdx = 0;
  const startTime = Date.now();
  const progressLoop = () => {
    if (stopProgress) return;
    const elapsed = (Date.now() - startTime) / 1000;
    // 先快后慢的曲线：前 3 秒到 60%，之后每秒涨 2-3%，最终卡在 95%
    let p: number;
    if (elapsed < 3) {
      p = (elapsed / 3) * 60;
    } else {
      p = 60 + (elapsed - 3) * 1.5;
    }
    p = Math.min(p, 95);
    progress.value = Math.round(p);
    const newIdx = Math.min(Math.floor(p / 10), sciStatuses.length - 1);
    if (newIdx !== statusIdx) {
      statusIdx = newIdx;
      statusMessage.value = sciStatuses[statusIdx];
    }
    requestAnimationFrame(progressLoop);
  };
  requestAnimationFrame(progressLoop);

  try {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";

    // 后台发送请求，进度条不卡
    const response = await fetch(`${apiUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: getUserId(),
        description: description.value,
        narration_style: selectedNarrationStyle.value.id,
        visual_style: selectedVisualStyle.value.id,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `请求失败 (${response.status})`);
    }

    const data = await response.json();

    if (data.script) {
      try {
        statusMessage.value = "正在生成动画场景...";
        const result = await invoke<any>("render_animation", {
          script: data.script,
        });

        if (result.success && result.output_path) {
          stopProgress = true;
          progress.value = 100;
          statusMessage.value = "生成完成！";
          videoPath.value = result.output_path;
          phase.value = "done";
        } else {
          throw new Error(result.log || "视频渲染失败");
        }
      } catch (renderError: any) {
        console.error("Render error:", renderError);
        const errMsg = String(renderError || "");
        console.log("[DEBUG render error]", errMsg.substring(0, 1000));
        statusMessage.value = "视频渲染遇到问题，请稍后重试";
        phase.value = "error";
        return;
      }
    } else {
      throw new Error("未能成功生成内容");
    }
  } catch (error: any) {
    stopProgress = true;
    console.error("Generation error:", error);
    statusMessage.value = error.message || "生成失败，请稍后重试";
    phase.value = "error";
  }
}

// ==================== 导出视频 ====================

async function handleExport() {
  if (!videoPath.value) return;

  try {
    const filePath = await save({
      defaultPath: `animation_${Date.now()}.mp4`,
      filters: [
        {
          name: "MP4 Video",
          extensions: ["mp4"],
        },
      ],
    });

    if (filePath) {
      await invoke("export_to_path", {
        sourcePath: videoPath.value,
        destPath: filePath,
      });
      showToast("视频导出成功！", "success");
    }
  } catch (error) {
    console.error("Export error:", error);
    showToast("导出失败，请重试", "error");
  }
}

// ==================== 重新生成 ====================

function handleRegenerate() {
  videoPath.value = "";
  phase.value = "idle";
  progress.value = 0;
}

// ==================== 初始化 ====================

onMounted(() => {
  const desc = route.query.desc as string;
  if (desc) {
    description.value = desc;
  }

  const style = route.query.style as string;
  if (style) {
    const styleObj = narrationStyles.find(s => s.id === style);
    if (styleObj) {
      selectedNarrationStyle.value = styleObj;
    }
  }
});

</script>

<template>
  <div class="create-page">
    <!-- Toast notification -->
    <Toast
      v-if="toastVisible"
      :message="toastMessage"
      :type="toastType"
      @close="toastVisible = false"
    />
    <!-- Main content -->
    <main class="main-content">
      <!-- Input section -->
      <section class="input-section">
        <input
          v-model="description"
          type="text"
          class="main-input"
          placeholder="输入知识点，例如：勾股定理的证明"
          @keypress.enter="canGenerate && phase === 'idle' && handleGenerate()"
        />

        <!-- Example prompts -->
        <div class="example-prompts">
          <button
            v-for="example in examplePrompts"
            :key="example.text"
            class="example-chip"
            @click="handleExampleClick(example)"
          >
            <span class="example-icon">{{ example.icon }}</span>
            <span class="example-text">{{ example.text }}</span>
          </button>
        </div>

        <!-- Style selector row -->
        <div class="style-row">
          <!-- Narration styles -->
          <div class="narration-styles">
            <button
              v-for="style in narrationStyles"
              :key="style.id"
              class="style-pill"
              :class="{ active: selectedNarrationStyle.id === style.id }"
              @click="selectedNarrationStyle = style"
            >
              <span class="style-icon">{{ style.icon }}</span>
              <span class="style-name">{{ style.name }}</span>
            </button>
          </div>

          <!-- Visual styles -->
          <div class="visual-styles">
            <button
              v-for="style in visualStyles"
              :key="style.id"
              class="color-circle"
              :class="{ active: selectedVisualStyle.id === style.id }"
              :style="{ '--style-color': style.color }"
              :title="style.name"
              @click="selectedVisualStyle = style"
            />
          </div>
        </div>

        <!-- Generate button -->
        <button
          class="generate-button"
          :disabled="!canGenerate || phase !== 'idle'"
          @click="handleGenerate"
        >
          ✨ 生成动画
        </button>
      </section>

      <!-- Result area -->
      <section class="result-section">
        <!-- Empty state with animation -->
        <div v-if="phase === 'idle'" class="empty-result">
          <div class="empty-animation">
            <div class="film-reel">
              <div class="reel-left"></div>
              <div class="reel-center"></div>
              <div class="reel-right"></div>
            </div>
          </div>
          <p class="empty-text">输入知识点，开始创作你的动画</p>
        </div>

        <!-- Generating state -->
        <div v-else-if="phase === 'generating' || phase === 'rendering'" class="generating-result">
          <p class="status-text">{{ statusMessage }}</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }" />
          </div>
          <p class="encourage-text">正在精心制作中，请耐心等待，马上就好 ✨</p>
        </div>

        <!-- Done state with video player -->
        <div v-else-if="phase === 'done'" class="done-result">
          <VideoPlayer v-if="videoPath" :src="videoPath" :autoplay="true" class="video-player-wrapper" />
          <div v-else class="demo-result">
            <p>演示模式：视频生成完成</p>
          </div>
          <div class="action-buttons">
            <button class="action-button secondary" @click="handleExport">
              📥 导出视频
            </button>
            <button class="action-button primary" @click="handleRegenerate">
              🔄 重新生成
            </button>
          </div>
        </div>

        <!-- Error state -->
        <div v-else-if="phase === 'error'" class="error-result">
          <p class="error-text">{{ statusMessage }}</p>
          <button class="action-button primary" @click="handleRegenerate">
            🔄 重新生成
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
/* ==================== Page Layout ==================== */

.create-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  overflow: hidden;
}

/* ==================== Top Bar ==================== */

.top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.app-logo {
  font-size: 24px;
  line-height: 1;
}

.app-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
}

.top-nav {
  display: flex;
  gap: 4px;
}

.nav-link {
  padding: 8px 16px;
  background-color: transparent;
  border: none;
  border-radius: var(--radius-input);
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.nav-link:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

/* ==================== Main Content ==================== */

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ==================== Input Section ==================== */

.input-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px 24px 16px;
  flex-shrink: 0;
}

.main-input {
  width: 100%;
  max-width: 640px;
  height: 44px;
  padding: 0 20px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 22px;
  color: var(--text-primary);
  font-size: 15px;
  transition: all var(--transition-base) var(--ease-apple);
}

.main-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
}

.main-input::placeholder {
  color: var(--text-tertiary);
}

/* ==================== Example Prompts ==================== */

.example-prompts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 640px;
}

.example-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.example-chip:hover {
  border-color: var(--accent);
  background-color: var(--bg-tertiary);
  transform: translateY(-1px);
}

.example-icon {
  font-size: 14px;
  line-height: 1;
}

.example-text {
  line-height: 1;
}

/* ==================== Style Row ==================== */

.style-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 640px;
}

.narration-styles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.style-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
  min-width: 80px;
  justify-content: center;
}

.style-pill:hover {
  border-color: var(--accent);
  background-color: var(--bg-tertiary);
}

.style-pill.active {
  background-color: var(--accent);
  border-color: var(--accent);
  color: white;
}

.style-icon {
  font-size: 16px;
  line-height: 1;
}

.style-name {
  line-height: 1;
}

.visual-styles {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--style-color);
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.color-circle:hover {
  transform: scale(1.1);
}

.color-circle.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--accent);
}

/* ==================== Generate Button ==================== */

.generate-button {
  padding: 0 28px;
  height: 38px;
  background-color: var(--accent);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.generate-button:hover:not(:disabled) {
  background-color: var(--accent-hover);
  transform: scale(1.02);
}

.generate-button:active:not(:disabled) {
  transform: scale(0.98);
}

.generate-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ==================== Result Section ==================== */

.result-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24px 16px;
  overflow: hidden;
  min-height: 0;
}

/* Empty state with animation */
.empty-result {
  text-align: center;
  color: var(--text-tertiary);
}

.empty-animation {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

.film-reel {
  position: relative;
  width: 80px;
  height: 80px;
}

.film-reel::before,
.film-reel::after {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  border: 3px solid var(--bg-tertiary);
  border-radius: 50%;
  animation: rotate 8s linear infinite;
}

.film-reel::after {
  width: 60px;
  height: 60px;
  top: 10px;
  left: 10px;
  border-color: var(--text-tertiary);
  animation-direction: reverse;
  animation-duration: 6s;
}

.reel-left,
.reel-right {
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: var(--bg-tertiary);
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
}

.reel-left {
  left: -6px;
  animation: pulse 2s ease-in-out infinite;
}

.reel-right {
  right: -6px;
  animation: pulse 2s ease-in-out infinite 0.5s;
}

.reel-center {
  position: absolute;
  width: 20px;
  height: 20px;
  background-color: var(--accent);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 2s ease-in-out infinite 1s;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
    transform: translateY(-50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translateY(-50%) scale(1.1);
  }
}

.empty-text {
  font-size: 17px;
  margin: 0;
  color: var(--text-secondary);
}

/* Generating state */
.generating-result {
  text-align: center;
  width: 100%;
  max-width: 400px;
}

.status-text {
  font-size: 15px;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
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
  transition: width 0.3s var(--ease-apple);
  border-radius: 99px;
}

.encourage-text {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-tertiary);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* Done state */
.done-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 720px;
  height: 100%;
}

.video-player-wrapper {
  width: 100%;
  max-width: 800px;
  aspect-ratio: 16 / 9;
  min-height: 0;
}

.demo-result {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.error-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px 20px;
}

.error-text {
  color: var(--text-secondary);
  font-size: 15px;
  text-align: center;
}

.action-buttons {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.action-button {
  padding: 8px 20px;
  border-radius: var(--radius-button);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.action-button.secondary {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  color: var(--text-primary);
}

.action-button.secondary:hover {
  background-color: var(--bg-tertiary);
}

.action-button.primary {
  background-color: var(--accent);
  border: none;
  color: white;
}

.action-button.primary:hover {
  background-color: var(--accent-hover);
  transform: scale(1.02);
}

/* ==================== Responsive ==================== */

@media (max-width: 768px) {
  .input-section {
    padding: 24px 16px;
  }

  .narration-styles {
    gap: 6px;
  }

  .style-pill {
    padding: 6px 12px;
    font-size: 12px;
    min-width: 70px;
  }

  .action-buttons {
    flex-direction: column;
    width: 100%;
  }

  .action-button {
    width: 100%;
  }
}
</style>
