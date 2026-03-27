<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import VideoPlayer from "../components/VideoPlayer.vue";
import { convertFileSrc } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { getNarrationStyleById, getVisualStyleById } from "../services/caseService";

const router = useRouter();
const route = useRoute();

// 输入状态
const description = ref("");

// 解说风格
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

// 视觉风格
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

// 生成状态
type GenerationPhase = "idle" | "generating" | "rendering" | "done";
const phase = ref<GenerationPhase>("idle");
const progress = ref(0);
const statusMessage = ref("");

// 视频路径
const videoPath = ref<string>("");

// 用户ID
const getUserId = () => {
  const userId = localStorage.getItem("user_id");
  if (userId) return userId;
  const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem("user_id", newId);
  return newId;
};

// 计算属性
const canGenerate = computed(() => description.value.trim().length > 0);

// 生成动画
async function handleGenerate() {
  if (!canGenerate.value || phase.value !== "idle") return;

  phase.value = "generating";
  progress.value = 0;
  statusMessage.value = "AI 正在编写脚本...";

  try {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8787";

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
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    // 更新进度
    statusMessage.value = "正在渲染视频...";
    progress.value = 50;

    if (data.script) {
      // 调用 Tauri 命令渲染视频
      progress.value = 75;
      statusMessage.value = "即将完成...";

      const outputPath = await invoke<string>("render_manim", {
        script: data.script,
      });

      // 渲染完成
      progress.value = 100;
      videoPath.value = outputPath;
      phase.value = "done";
    }
  } catch (error) {
    console.error("Generation error:", error);
    // 演示模式：模拟完成
    setTimeout(() => {
      progress.value = 100;
      phase.value = "done";
    }, 2000);
  }
}

// 导出视频
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
      await invoke("copy_file", {
        from: videoPath.value,
        to: filePath,
      });
    }
  } catch (error) {
    console.error("Export error:", error);
  }
}

// 重新生成
function handleRegenerate() {
  videoPath.value = "";
  phase.value = "idle";
  progress.value = 0;
}

// 初始化时从 query 参数填充
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

// 导航到灵感页
function goToInspiration() {
  router.push("/inspiration");
}

// 导航到历史页
function goToHistory() {
  router.push("/history");
}

// 导航到设置页
function goToSettings() {
  router.push("/settings");
}
</script>

<template>
  <div class="create-page">
    <!-- Top bar -->
    <header class="top-bar">
      <div class="app-logo">🧪</div>
      <h1 class="app-title">Knowledge Anim Studio</h1>
      <nav class="top-nav">
        <button class="nav-link" @click="goToInspiration">灵感</button>
        <button class="nav-link" @click="goToHistory">历史</button>
        <button class="nav-link" @click="goToSettings">设置</button>
      </nav>
    </header>

    <!-- Main content -->
    <main class="main-content">
      <!-- Input section -->
      <section class="input-section">
        <input
          v-model="description"
          type="text"
          class="main-input"
          placeholder="描述你想制作的知识点动画..."
          @keypress.enter="canGenerate && phase === 'idle' && handleGenerate()"
        />

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
        <!-- Empty state -->
        <div v-if="phase === 'idle'" class="empty-result">
          <span class="empty-icon">🎬</span>
          <p class="empty-text">输入知识点，开始创作你的动画</p>
        </div>

        <!-- Generating state -->
        <div v-else-if="phase === 'generating' || phase === 'rendering'" class="generating-result">
          <p class="status-text">{{ statusMessage }}</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: progress + '%' }" />
          </div>
        </div>

        <!-- Done state -->
        <div v-else-if="phase === 'done'" class="done-result">
          <VideoPlayer v-if="videoPath" :src="videoPath" :autoplay="true" />
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
  gap: 16px;
  padding: 32px 24px;
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
  padding: 0 32px;
  height: 44px;
  background-color: var(--accent);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 17px;
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
  padding: 24px;
  overflow: hidden;
}

/* Empty state */
.empty-result {
  text-align: center;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 64px;
  display: block;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 17px;
  margin: 0;
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
}

/* Done state */
.done-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 800px;
}

.done-result :deep(.video-player) {
  width: 100%;
  max-height: calc(100vh - 300px);
}

.demo-result {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.action-button {
  padding: 12px 24px;
  border-radius: var(--radius-button);
  font-size: 15px;
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
  .top-bar {
    padding: 12px 16px;
  }

  .app-title {
    font-size: 15px;
  }

  .nav-link {
    padding: 6px 12px;
    font-size: 14px;
  }

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
