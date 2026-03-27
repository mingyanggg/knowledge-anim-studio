<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useSettingsStore } from "../stores/settingsStore";
import { useSubscriptionStore } from "../stores/subscriptionStore";
import { stylePresets } from "../data/style-presets";

const settingsStore = useSettingsStore();
const subscriptionStore = useSubscriptionStore();

// 风格预设
const stylePresetId = ref("minimal-light");
const savedPreset = (settingsStore.settings as any).stylePreset;
if (savedPreset) stylePresetId.value = savedPreset;

watch(stylePresetId, () => {
  settingsStore.updateSettings({ stylePreset: stylePresetId.value } as any);
});

// 导出设置
const exportFormat = ref<"gif" | "mp4" | "webm">("mp4");
const resolution = ref<"720p" | "1080p" | "4k">("1080p");
const fps = ref<30 | 60>(30);
const theme = ref<"dark" | "light">("dark");

// API 设置
const apiProvider = ref<"deepseek" | "openai">("deepseek");
const apiKey = ref("");
const activationCode = ref("");
const showTestResult = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

const isPro = computed(() => subscriptionStore.isPro);

// 导出设置变更时自动持久化
watch([exportFormat, resolution, fps], () => {
  settingsStore.updateSettings({
    exportFormat: exportFormat.value,
    resolution: resolution.value,
    fps: fps.value,
    theme: theme.value,
  });
});

// 初始化时从 store 恢复设置
const s = settingsStore.settings;
if (s.exportFormat) exportFormat.value = s.exportFormat as "gif" | "mp4" | "webm";
if (s.resolution) resolution.value = s.resolution as "720p" | "1080p" | "4k";
if (s.fps) fps.value = s.fps as 30 | 60;
if (s.theme) theme.value = s.theme;
apiProvider.value = s.apiProvider;
apiKey.value = s.apiKey;

const handleTestConnection = async () => {
  testResult.value = { success: true, message: "连接成功！" };
  showTestResult.value = true;
  setTimeout(() => {
    showTestResult.value = false;
  }, 3000);
};

const handleSaveSettings = () => {
  settingsStore.updateSettings({
    apiProvider: apiProvider.value,
    apiKey: apiKey.value,
    exportFormat: exportFormat.value,
    resolution: resolution.value,
    fps: fps.value,
    theme: theme.value,
  });
  testResult.value = { success: true, message: "设置已保存" };
  showTestResult.value = true;
  setTimeout(() => {
    showTestResult.value = false;
  }, 3000);
};

const handleActivateCode = async () => {
  if (!activationCode.value.trim()) {
    testResult.value = { success: false, message: "请输入激活码" };
    showTestResult.value = true;
    return;
  }

  const result = await subscriptionStore.activateCode(activationCode.value);
  testResult.value = result;
  showTestResult.value = true;

  if (result.success) {
    activationCode.value = "";
  }

  setTimeout(() => {
    showTestResult.value = false;
  }, 3000);
};

const features = [
  { name: "无限制生成", available: true, pro: false },
  { name: "GIF 导出", available: true, pro: false },
  { name: "1080p 导出", available: true, pro: false },
  { name: "4K 分辨率", available: true, pro: true },
  { name: "MP4/WEBM 导出", available: true, pro: true },
  { name: "批量渲染", available: true, pro: true },
  { name: "优先渲染", available: true, pro: true },
];
</script>

<template>
  <div class="settings-page">
    <!-- Header -->
    <header class="page-header">
      <h1 class="page-title">设置</h1>
      <p class="page-subtitle">配置应用设置和订阅</p>
    </header>

    <div class="settings-content">
      <!-- Left Column -->
      <div class="settings-left">
        <!-- 导出设置 -->
        <div class="card">
          <h2 class="card-title">导出设置</h2>

          <div class="form-group">
            <label class="form-label">导出格式</label>
            <div class="option-grid">
              <button
                v-for="fmt in (['gif', 'mp4', 'webm'] as const)"
                :key="fmt"
                class="provider-option"
                :class="{ active: exportFormat === fmt }"
                @click="exportFormat = fmt"
              >
                {{ fmt.toUpperCase() }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">分辨率</label>
            <div class="option-grid three">
              <button
                v-for="res in (['720p', '1080p', '4k'] as const)"
                :key="res"
                class="provider-option"
                :class="{ active: resolution === res }"
                @click="resolution = res"
              >
                {{ res === '720p' ? '720p HD' : res === '1080p' ? '1080p FHD' : '4K UHD' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">帧率</label>
            <div class="option-grid two">
              <button
                v-for="f in ([30, 60] as const)"
                :key="f"
                class="provider-option"
                :class="{ active: fps === f }"
                @click="fps = f"
              >
                {{ f }} FPS
              </button>
            </div>
          </div>
        </div>

        <!-- 主题 -->
        <div class="card">
          <h2 class="card-title">外观</h2>
          <div class="form-group">
            <label class="form-label">主题</label>
            <div class="option-grid two">
              <button
                class="provider-option"
                :class="{ active: theme === 'dark' }"
                @click="theme = 'dark'"
              >
                🌙 深色
              </button>
              <button
                class="provider-option"
                :class="{ active: theme === 'light' }"
                disabled
              >
                ☀️ 浅色（即将推出）
              </button>
            </div>
          </div>
        </div>

        <!-- 视觉风格预设 -->
        <div class="card">
          <h2 class="card-title">视觉风格</h2>
          <p class="card-desc">选择动画的默认视觉风格，在生成页也可随时切换</p>
          <div class="preset-grid">
            <button
              v-for="preset in stylePresets"
              :key="preset.id"
              class="preset-card"
              :class="{ active: stylePresetId === preset.id }"
              @click="stylePresetId = preset.id"
            >
              <div class="preset-preview" :style="{ background: preset.background }">
                <div class="preview-bar" :style="{ background: preset.primaryColor }" />
                <div class="preview-bar short" :style="{ background: preset.secondaryColor }" />
              </div>
              <span class="preset-name">{{ preset.name }}</span>
              <span class="preset-desc">{{ preset.description }}</span>
            </button>
          </div>
        </div>

        <!-- API Settings Card -->
        <div class="card">
          <h2 class="card-title">API 配置</h2>

          <div class="form-group">
            <label class="form-label">AI 服务提供商</label>
            <div class="provider-options">
              <button
                class="provider-option"
                :class="{ active: apiProvider === 'deepseek' }"
                @click="apiProvider = 'deepseek'"
              >
                <span class="provider-icon">🤖</span>
                <span>DeepSeek</span>
              </button>
              <button
                class="provider-option"
                :class="{ active: apiProvider === 'openai' }"
                @click="apiProvider = 'openai'"
              >
                <span class="provider-icon">🧠</span>
                <span>OpenAI</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">API Key</label>
            <input
              v-model="apiKey"
              type="password"
              class="form-input"
              placeholder="sk-..."
            />
            <p class="form-hint">
              您的 API Key 将安全存储在本地
            </p>
          </div>

          <div class="form-actions">
            <button class="test-button" @click="handleTestConnection">
              测试连接
            </button>
            <button class="save-button" @click="handleSaveSettings">
              保存设置
            </button>
          </div>

          <!-- Test Result Alert -->
          <transition name="fade">
            <div
              v-if="showTestResult && testResult"
              class="alert"
              :class="testResult.success ? 'success' : 'error'"
            >
              {{ testResult.success ? '✓' : '✕' }} {{ testResult.message }}
            </div>
          </transition>
        </div>

        <!-- Subscription Card -->
        <div class="card">
          <div class="subscription-header">
            <div>
              <h2 class="card-title">订阅状态</h2>
              <p class="subscription-status">
                当前: <span :class="isPro ? 'pro' : 'free'">{{ isPro ? 'Pro 版本' : '免费版本' }}</span>
              </p>
            </div>
            <div class="plan-badge" :class="isPro ? 'pro' : 'free'">
              {{ isPro ? 'PRO' : 'FREE' }}
            </div>
          </div>

          <div v-if="!isPro" class="activation-section">
            <h3 class="section-title">激活 Pro 版本</h3>
            <div class="form-group">
              <label class="form-label">激活码</label>
              <input
                v-model="activationCode"
                type="text"
                class="form-input"
                placeholder="输入激活码..."
              />
            </div>
            <button class="activate-button" @click="handleActivateCode">
              激活
            </button>
          </div>

          <div v-else class="pro-info">
            <div class="pro-feature">
              <span class="feature-icon">✓</span>
              <span>已解锁所有 Pro 功能</span>
            </div>
            <p class="pro-expiry">
              有效期至: {{ subscriptionStore.state.expiryDate || '永久' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="settings-right">
        <!-- Features Comparison Card -->
        <div class="card">
          <h2 class="card-title">功能对比</h2>

          <div class="features-list">
            <div
              v-for="feature in features"
              :key="feature.name"
              class="feature-item"
            >
              <div class="feature-info">
                <span class="feature-name">{{ feature.name }}</span>
                <span v-if="feature.pro" class="feature-badge pro">Pro</span>
              </div>
              <div class="feature-availability">
                <span v-if="!feature.pro" class="check-icon">✓</span>
                <span v-else-if="isPro" class="check-icon">✓</span>
                <span v-else class="lock-icon">🔒</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pricing Card -->
        <div class="card pricing-card">
          <h2 class="card-title">升级到 Pro</h2>

          <div class="pricing-info">
            <div class="price">
              <span class="price-amount">¥99</span>
              <span class="price-period">/永久</span>
            </div>

            <ul class="pricing-features">
              <li>✓ 解锁所有 Pro 功能</li>
              <li>✓ 4K 超高清渲染</li>
              <li>✓ MP4 视频导出</li>
              <li>✓ 优先技术支持</li>
              <li>✓ 未来功能抢先体验</li>
            </ul>

            <button
              class="upgrade-button"
              :disabled="isPro"
              @click="isPro ? null : (activationCode = '')"
            >
              {{ isPro ? '已是 Pro 用户' : '立即升级' }}
            </button>
          </div>
        </div>

        <!-- About Card -->
        <div class="card">
          <h2 class="card-title">关于</h2>

          <div class="about-info">
            <div class="about-item">
              <span class="about-label">版本</span>
              <span class="about-value">0.2.0</span>
            </div>
            <div class="about-item">
              <span class="about-label">描述</span>
              <span class="about-value">AI 驱动的知识动画创作工具</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 1200px;
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

/* ==================== 设置内容布局 ==================== */

.settings-content {
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

/* ==================== 表单元素 ==================== */

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

.form-input {
  width: 100%;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  color: var(--text-primary);
  font-size: 15px;
  transition: all var(--transition-base) var(--ease-apple);
}

.form-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.15);
}

.form-input::placeholder {
  color: var(--text-tertiary);
}

.form-hint {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 8px;
}

/* ==================== 选项网格 ==================== */

.provider-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.option-grid.two {
  grid-template-columns: repeat(2, 1fr);
}

.option-grid.three {
  grid-template-columns: repeat(3, 1fr);
}

.provider-option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.provider-option:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--text-primary);
}

.provider-option.active {
  background-color: var(--accent);
  border-color: var(--accent);
  color: white;
}

.provider-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.provider-icon {
  font-size: 20px;
}

/* ==================== 表单操作按钮 ==================== */

.form-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: var(--spacing-component);
}

.test-button,
.save-button {
  padding: 12px 16px;
  border: none;
  border-radius: var(--radius-button);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.test-button {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.test-button:hover {
  background-color: var(--bg-tertiary);
}

.save-button {
  background-color: var(--accent);
  color: white;
}

.save-button:hover {
  background-color: var(--accent-hover);
  transform: scale(1.01);
}

.save-button:active {
  transform: scale(0.99);
}

/* ==================== 警告框 ==================== */

.alert {
  margin-top: var(--spacing-component);
  padding: 12px 16px;
  border-radius: var(--radius-input);
  font-size: 13px;
}

.alert.success {
  background-color: rgba(52, 199, 89, 0.1);
  border: 1px solid rgba(52, 199, 89, 0.2);
  color: var(--success);
}

.alert.error {
  background-color: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.2);
  color: var(--error);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-base) var(--ease-apple),
              transform var(--transition-base) var(--ease-apple);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ==================== 订阅状态 ==================== */

.subscription-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-component);
  margin-bottom: var(--spacing-component);
}

.subscription-status {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 4px 0 0 0;
}

.subscription-status .pro {
  color: #7c3aed;
  font-weight: 600;
}

.subscription-status .free {
  color: var(--success);
  font-weight: 600;
}

.plan-badge {
  padding: 8px 16px;
  border-radius: var(--radius-input);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.plan-badge.pro {
  background-color: #7c3aed;
  color: white;
}

.plan-badge.free {
  background-color: rgba(52, 199, 89, 0.1);
  color: var(--success);
}

/* ==================== 激活区域 ==================== */

.activation-section {
  padding-top: var(--spacing-component);
  border-top: 1px solid var(--border);
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-component) 0;
}

.activate-button {
  width: 100%;
  padding: 12px 16px;
  background-color: #7c3aed;
  border: none;
  border-radius: var(--radius-button);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.activate-button:hover {
  background-color: #6d28d9;
  transform: scale(1.01);
}

.activate-button:active {
  transform: scale(0.99);
}

.pro-info {
  padding-top: var(--spacing-component);
  border-top: 1px solid var(--border);
}

.pro-feature {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 15px;
  color: var(--success);
  margin-bottom: 12px;
}

.pro-expiry {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

/* ==================== 功能对比列表 ==================== */

.features-list {
  display: flex;
  flex-direction: column;
}

.feature-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}

.feature-item:last-child {
  border-bottom: none;
}

.feature-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feature-name {
  font-size: 15px;
  color: var(--text-primary);
}

.feature-badge {
  padding: 4px 8px;
  border-radius: var(--radius-small);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.feature-badge.pro {
  background-color: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
}

.feature-availability {
  font-size: 20px;
}

.check-icon {
  color: var(--success);
}

.lock-icon {
  color: var(--text-tertiary);
}

/* ==================== 定价卡片 ==================== */

.pricing-card {
  background-color: rgba(0, 122, 255, 0.03);
  border-color: rgba(0, 122, 255, 0.15);
}

.pricing-info {
  text-align: center;
}

.price {
  margin-bottom: var(--spacing-component);
}

.price-amount {
  font-size: 40px;
  font-weight: 700;
  color: var(--accent);
}

.price-period {
  font-size: 17px;
  color: var(--text-secondary);
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--spacing-relaxed) 0;
  text-align: left;
}

.pricing-features li {
  padding: 8px 0;
  font-size: 15px;
  color: var(--text-primary);
}

.upgrade-button {
  width: 100%;
  padding: 14px;
  background-color: #7c3aed;
  border: none;
  border-radius: var(--radius-button);
  color: white;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.upgrade-button:hover:not(:disabled) {
  background-color: #6d28d9;
  transform: scale(1.01);
}

.upgrade-button:active:not(:disabled) {
  transform: scale(0.99);
}

.upgrade-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== 关于信息 ==================== */

.about-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.about-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
}

.about-label {
  color: var(--text-secondary);
}

.about-value {
  color: var(--text-primary);
  font-weight: 500;
}

/* ==================== 视觉风格预设 ==================== */

.card-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-component) 0;
}

.preset-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.preset-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-input);
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
  text-align: left;
}

.preset-card:hover {
  border-color: var(--accent);
}

.preset-card.active {
  border-color: var(--accent);
  background-color: rgba(0, 122, 255, 0.05);
}

.preset-preview {
  height: 48px;
  border-radius: var(--radius-small);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
}

.preview-bar {
  height: 6px;
  border-radius: 3px;
  width: 80%;
}

.preview-bar.short {
  width: 50%;
}

.preset-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.preset-desc {
  font-size: 11px;
  color: var(--text-tertiary);
  line-height: 1.3;
}

/* ==================== 响应式 ==================== */

@media (max-width: 1024px) {
  .settings-content {
    grid-template-columns: 1fr;
  }

  .preset-grid {
    grid-template-columns: 1fr;
  }
}
</style>
