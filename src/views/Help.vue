<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

function goToCreate() {
  router.push("/create");
}
</script>

<template>
  <div class="help-page">
    <!-- Header -->
    <header class="help-header">
      <div class="header-content">
        <button class="back-button" @click="goToCreate">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M12.5 5.5L8 10l4.5 4.5M4 10h12" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          返回
        </button>
        <h1 class="page-title">帮助中心</h1>
      </div>
    </header>

    <!-- Content -->
    <main class="help-content">
      <!-- How to use section -->
      <section class="help-section">
        <div class="section-card">
          <h2 class="section-title">
            <span class="section-icon">🚀</span>
            如何使用
          </h2>
          <div class="steps-list">
            <div class="step-item">
              <div class="step-number">1</div>
              <div class="step-content">
                <h3 class="step-title">输入知识点</h3>
                <p class="step-description">在输入框中描述你想要制作动画的知识点，例如"勾股定理的证明"</p>
              </div>
            </div>
            <div class="step-item">
              <div class="step-number">2</div>
              <div class="step-content">
                <h3 class="step-title">选择风格</h3>
                <p class="step-description">选择合适的解说风格和视觉风格，打造个性化的动画效果</p>
              </div>
            </div>
            <div class="step-item">
              <div class="step-number">3</div>
              <div class="step-content">
                <h3 class="step-title">点击生成</h3>
                <p class="step-description">点击"生成动画"按钮，AI 将自动编写脚本并渲染视频</p>
              </div>
            </div>
            <div class="step-item">
              <div class="step-number">4</div>
              <div class="step-content">
                <h3 class="step-title">预览并导出</h3>
                <p class="step-description">预览生成的视频，满意后点击"导出视频"保存到本地</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Narration styles section -->
      <section class="help-section">
        <div class="section-card">
          <h2 class="section-title">
            <span class="section-icon">🎙️</span>
            解说风格说明
          </h2>
          <div class="styles-grid">
            <div class="style-card">
              <div class="style-header">
                <span class="style-icon">🎓</span>
                <h3 class="style-name">课堂讲解</h3>
              </div>
              <p class="style-description">教师口吻，循序渐进，适合教学场景</p>
            </div>
            <div class="style-card">
              <div class="style-header">
                <span class="style-icon">📢</span>
                <h3 class="style-name">科普传播</h3>
              </div>
              <p class="style-description">生动有趣，通俗易懂，适合大众科普</p>
            </div>
            <div class="style-card">
              <div class="style-header">
                <span class="style-icon">🎯</span>
                <h3 class="style-name">学术报告</h3>
              </div>
              <p class="style-description">专业严谨，逻辑清晰，适合学术交流</p>
            </div>
            <div class="style-card">
              <div class="style-header">
                <span class="style-icon">🎬</span>
                <h3 class="style-name">趣味动画</h3>
              </div>
              <p class="style-description">轻松活泼，富有创意，适合吸引注意力</p>
            </div>
            <div class="style-card">
              <div class="style-header">
                <span class="style-icon">🖥️</span>
                <h3 class="style-name">极简科技</h3>
              </div>
              <p class="style-description">简洁精准，专业可靠，适合技术展示</p>
            </div>
            <div class="style-card">
              <div class="style-header">
                <span class="style-icon">📖</span>
                <h3 class="style-name">故事叙述</h3>
              </div>
              <p class="style-description">叙事性强，引人入胜，适合讲述知识背景</p>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ section -->
      <section class="help-section">
        <div class="section-card">
          <h2 class="section-title">
            <span class="section-icon">❓</span>
            常见问题
          </h2>
          <div class="faq-list">
            <div class="faq-item">
              <h3 class="faq-question">生成一个视频需要多长时间？</h3>
              <p class="faq-answer">通常情况下，AI 编写脚本需要 10-30 秒，视频渲染需要 1-3 分钟，具体时间取决于知识点的复杂程度。</p>
            </div>
            <div class="faq-item">
              <h3 class="faq-question">支持导出哪些格式？</h3>
              <p class="faq-answer">目前支持导出 MP4 格式的视频文件，可以在大多数设备和平台上播放。</p>
            </div>
            <div class="faq-item">
              <h3 class="faq-question">可以自定义视频的分辨率和帧率吗？</h3>
              <p class="faq-answer">目前视频默认使用 1080p 分辨率和 30fps 帧率，我们计划在未来的版本中添加更多自定义选项。</p>
            </div>
            <div class="faq-item">
              <h3 class="faq-question">生成的视频可以用于商业用途吗？</h3>
              <p class="faq-answer">可以！您生成的视频内容完全属于您，可以自由用于教育、商业或其他任何用途。</p>
            </div>
          </div>
        </div>
      </section>

      <!-- About section -->
      <section class="help-section">
        <div class="section-card">
          <h2 class="section-title">
            <span class="section-icon">ℹ️</span>
            关于
          </h2>
          <div class="about-content">
            <div class="about-info">
              <h3 class="about-title">Knowledge Anim Studio</h3>
              <p class="about-description">
                Knowledge Anim Studio 是一款基于 AI 的知识动画生成工具，通过简单的文字描述即可生成专业的教学动画视频。
                无论你是教师、学生还是内容创作者，都可以轻松地将抽象的知识转化为生动的视觉内容。
              </p>
            </div>
            <div class="about-meta">
              <div class="meta-item">
                <span class="meta-label">版本</span>
                <span class="meta-value">1.0.0</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">技术栈</span>
                <span class="meta-value">Vue 3 + Tauri + Manim</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
/* ==================== Page Layout ==================== */

.help-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-primary);
  overflow: hidden;
}

/* ==================== Header ==================== */

.help-header {
  flex-shrink: 0;
  padding: 12px 24px;
  border-bottom: 1px solid var(--border);
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.back-button:hover {
  background-color: var(--bg-tertiary);
  transform: translateX(-2px);
}

.page-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

/* ==================== Content ==================== */

.help-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.help-content::-webkit-scrollbar {
  width: 8px;
}

.help-content::-webkit-scrollbar-track {
  background: transparent;
}

.help-content::-webkit-scrollbar-thumb {
  background: var(--bg-tertiary);
  border-radius: var(--radius-small);
}

.help-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-tertiary);
}

/* ==================== Section Card ==================== */

.help-section {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.section-card {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  padding: 24px;
  box-shadow: var(--shadow-card);
}

.section-title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-icon {
  font-size: 24px;
}

/* ==================== Steps List ==================== */

.steps-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.step-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.step-number {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--accent);
  color: white;
  border-radius: 50%;
  font-size: 16px;
  font-weight: 600;
}

.step-content {
  flex: 1;
}

.step-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 6px 0;
}

.step-description {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* ==================== Styles Grid ==================== */

.styles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.style-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-button);
  padding: 16px;
  transition: all var(--transition-base) var(--ease-apple);
}

.style-card:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}

.style-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.style-icon {
  font-size: 24px;
}

.style-name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.style-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
}

/* ==================== FAQ List ==================== */

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.faq-item {
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.faq-item:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.faq-question {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.faq-answer {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

/* ==================== About Content ==================== */

.about-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.about-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.about-title {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.about-description {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.about-meta {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 13px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.meta-value {
  font-size: 15px;
  color: var(--text-primary);
  font-weight: 500;
}

/* ==================== Responsive ==================== */

@media (max-width: 768px) {
  .help-header {
    padding: 12px 16px;
  }

  .help-content {
    padding: 16px;
  }

  .section-card {
    padding: 20px;
  }

  .styles-grid {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 18px;
  }

  .about-meta {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
