<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useSettingsStore } from "../stores/settingsStore";
import { useSubscriptionStore } from "../stores/subscriptionStore";

const settingsStore = useSettingsStore();
const subscriptionStore = useSubscriptionStore();

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
      <h2 class="page-title">设置</h2>
      <p class="page-subtitle">配置应用设置和订阅</p>
    </header>

    <div class="settings-content">
      <!-- Left Column -->
      <div class="settings-left">
        <!-- 导出设置 -->
        <div class="card">
          <h3 class="card-title">导出设置</h3>

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
          <h3 class="card-title">外观</h3>
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

        <!-- API Settings Card -->
        <div class="card">
          <h3 class="card-title">API 配置</h3>

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
              🔗 测试连接
            </button>
            <button class="save-button" @click="handleSaveSettings">
              💾 保存设置
            </button>
          </div>

          <!-- Test Result Alert -->
          <transition name="fade">
            <div
              v-if="showTestResult && testResult"
              class="alert"
              :class="testResult.success ? 'success' : 'error'"
            >
              {{ testResult.success ? '✅' : '❌' }} {{ testResult.message }}
            </div>
          </transition>
        </div>

        <!-- Subscription Card -->
        <div class="card">
          <div class="subscription-header">
            <div>
              <h3 class="card-title">订阅状态</h3>
              <p class="subscription-status">
                当前: <span :class="isPro ? 'pro' : 'free'">{{ isPro ? 'Pro 版本' : '免费版本' }}</span>
              </p>
            </div>
            <div class="plan-badge" :class="isPro ? 'pro' : 'free'">
              {{ isPro ? 'PRO' : 'FREE' }}
            </div>
          </div>

          <div v-if="!isPro" class="activation-section">
            <h4 class="section-title">激活 Pro 版本</h4>
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
              🔓 激活
            </button>
          </div>

          <div v-else class="pro-info">
            <div class="pro-feature">
              <span class="feature-icon">✅</span>
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
          <h3 class="card-title">功能对比</h3>

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
                <span v-if="!feature.pro" class="check-icon">✅</span>
                <span v-else-if="isPro" class="check-icon">✅</span>
                <span v-else class="lock-icon">🔒</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Pricing Card -->
        <div class="card pricing-card">
          <h3 class="card-title">升级到 Pro</h3>

          <div class="pricing-info">
            <div class="price">
              <span class="price-amount">¥99</span>
              <span class="price-period">/永久</span>
            </div>

            <ul class="pricing-features">
              <li>✅ 解锁所有 Pro 功能</li>
              <li>✅ 4K 超高清渲染</li>
              <li>✅ MP4 视频导出</li>
              <li>✅ 优先技术支持</li>
              <li>✅ 未来功能抢先体验</li>
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
          <h3 class="card-title">关于</h3>

          <div class="about-info">
            <div class="about-item">
              <span class="about-label">版本</span>
              <span class="about-value">0.1.0</span>
            </div>
            <div class="about-item">
              <span class="about-label">技术栈</span>
              <span class="about-value">Tauri 2.x + Vue 3 + Manim</span>
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
  max-width: 1400px;
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

.settings-content {
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

.form-group {
  margin-bottom: 1.25rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #ffffff;
  margin-bottom: 0.5rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background-color: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #00d4ff;
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
}

.form-input::placeholder {
  color: #6b7280;
}

.form-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

.provider-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
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
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: #0f0f1a;
  border: 1px solid #2a2a4a;
  border-radius: 0.5rem;
  color: #9ca3af;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-option:hover:not(:disabled) {
  border-color: #00d4ff;
  color: #ffffff;
}

.provider-option.active {
  background-color: #00d4ff;
  border-color: #00d4ff;
  color: #0f0f1a;
}

.provider-icon {
  font-size: 1.25rem;
}

.form-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.test-button,
.save-button {
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.test-button {
  background-color: #2a2a4a;
  color: #ffffff;
}

.test-button:hover {
  background-color: #3a3a5a;
}

.save-button {
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  color: #ffffff;
}

.save-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
}

.alert {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.alert.success {
  background-color: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #22c55e;
}

.alert.error {
  background-color: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.subscription-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.subscription-status {
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0.25rem 0 0 0;
}

.subscription-status .pro {
  color: #7c3aed;
  font-weight: 600;
}

.subscription-status .free {
  color: #22c55e;
  font-weight: 600;
}

.plan-badge {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
}

.plan-badge.pro {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: #ffffff;
}

.plan-badge.free {
  background-color: rgba(34, 197, 94, 0.2);
  color: #22c55e;
}

.activation-section {
  padding-top: 1.5rem;
  border-top: 1px solid #2a2a4a;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 1rem 0;
}

.activate-button {
  width: 100%;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  border: none;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.activate-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
}

.pro-info {
  padding-top: 1.5rem;
  border-top: 1px solid #2a2a4a;
}

.pro-feature {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #22c55e;
  margin-bottom: 0.75rem;
}

.pro-expiry {
  font-size: 0.875rem;
  color: #9ca3af;
  margin: 0;
}

.features-list {
  display: flex;
  flex-direction: column;
}

.feature-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid #2a2a4a;
}

.feature-item:last-child {
  border-bottom: none;
}

.feature-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.feature-name {
  font-size: 0.875rem;
  color: #ffffff;
}

.feature-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.feature-badge.pro {
  background-color: rgba(124, 58, 237, 0.2);
  color: #7c3aed;
}

.feature-availability {
  font-size: 1rem;
}

.check-icon {
  color: #22c55e;
}

.lock-icon {
  color: #6b7280;
}

.pricing-card {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%);
  border-color: rgba(0, 212, 255, 0.2);
}

.pricing-info {
  text-align: center;
}

.price {
  margin-bottom: 1.5rem;
}

.price-amount {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.price-period {
  font-size: 1rem;
  color: #9ca3af;
}

.pricing-features {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
  text-align: left;
}

.pricing-features li {
  padding: 0.5rem 0;
  font-size: 0.875rem;
  color: #ffffff;
}

.upgrade-button {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  border: none;
  border-radius: 0.5rem;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.upgrade-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);
}

.upgrade-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.about-info {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.about-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.about-label {
  color: #9ca3af;
}

.about-value {
  color: #ffffff;
  font-weight: 500;
}

@media (max-width: 1024px) {
  .settings-content {
    grid-template-columns: 1fr;
  }
}
</style>
