<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { convertFileSrc } from "@tauri-apps/api/core";

// ==================== Props ====================

interface Props {
  src?: string;
  autoplay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  src: "",
  autoplay: false,
});

// ==================== Video State ====================

const videoRef = ref<HTMLVideoElement>();
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isMuted = ref(false);
const isFullscreen = ref(false);
const isLoading = ref(false);

// ==================== Computed ====================

const hasVideo = computed(() => Boolean(props.src));
const videoSrc = computed(() => {
  if (!props.src) return "";
  try {
    return convertFileSrc(props.src);
  } catch {
    return props.src;
  }
});

const formattedCurrentTime = computed(() => formatTime(currentTime.value));
const formattedDuration = computed(() => formatTime(duration.value));
const progress = computed(() =>
  duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
);

// ==================== Methods ====================

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function togglePlay() {
  if (!videoRef.value) return;

  if (isPlaying.value) {
    videoRef.value.pause();
  } else {
    videoRef.value.play();
  }
}

function toggleMute() {
  if (!videoRef.value) return;
  videoRef.value.muted = !videoRef.value.muted;
  isMuted.value = videoRef.value.muted;
}

async function toggleFullscreen() {
  if (!videoRef.value) return;
  isFullscreen.value = !isFullscreen.value;

  // CSS-based fullscreen for WKWebView compatibility (macOS)
  if (isFullscreen.value) {
    try { await document.documentElement.requestFullscreen?.(); } catch {}
  } else {
    try { await document.exitFullscreen?.(); } catch {}
  }
}

function handleSeek(event: Event) {
  const target = event.target as HTMLInputElement;
  const time = (parseFloat(target.value) / 100) * duration.value;
  if (videoRef.value) {
    videoRef.value.currentTime = time;
  }
}

function handleVolumeChange(event: Event) {
  const target = event.target as HTMLInputElement;
  const vol = parseFloat(target.value);
  if (videoRef.value) {
    videoRef.value.volume = vol;
    volume.value = vol;
    isMuted.value = vol === 0;
  }
}

function handleTimeUpdate() {
  if (videoRef.value) {
    currentTime.value = videoRef.value.currentTime;
  }
}

function handleLoadedMetadata() {
  if (videoRef.value) {
    duration.value = videoRef.value.duration;
    isLoading.value = false;
  }
}

function handlePlay() {
  isPlaying.value = true;
}

function handlePause() {
  isPlaying.value = false;
}

function handleEnded() {
  isPlaying.value = false;
}

function handleWaiting() {
  isLoading.value = true;
}

function handleCanPlay() {
  isLoading.value = false;
}

function handleFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement) || isFullscreen.value;
}

// ==================== Lifecycle ====================

onMounted(() => {
  document.addEventListener("fullscreenchange", handleFullscreenChange);
});

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", handleFullscreenChange);
});

watch(
  () => props.src,
  () => {
    if (videoRef.value) {
      videoRef.value.load();
      if (props.autoplay) {
        videoRef.value.play().catch(console.error);
      }
    }
  }
);
</script>

<template>
  <div class="video-player" :class="{ 'is-fullscreen': isFullscreen }" v-if="hasVideo">
    <div class="video-container">
      <video
        ref="videoRef"
        :src="videoSrc"
        class="video-element"
        @timeupdate="handleTimeUpdate"
        @loadedmetadata="handleLoadedMetadata"
        @play="handlePlay"
        @pause="handlePause"
        @ended="handleEnded"
        @waiting="handleWaiting"
        @canplay="handleCanPlay"
      />

      <!-- Loading overlay -->
      <div v-if="isLoading" class="loading-overlay">
        <div class="spinner"></div>
      </div>
    </div>

    <!-- Custom controls -->
    <div class="controls">
      <!-- Progress bar -->
      <div class="progress-bar-container">
        <input
          type="range"
          class="progress-bar"
          min="0"
          max="100"
          :value="progress"
          @input="handleSeek"
        />
      </div>

      <!-- Controls row -->
      <div class="controls-row">
        <!-- Left: Play/pause and time -->
        <div class="controls-left">
          <button class="control-button" @click="togglePlay" :title="isPlaying ? '暂停' : '播放'">
            <svg v-if="!isPlaying" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2v12l10-6-10-6z"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h4v12H2V2zm6 0h4v12H8V2z"/>
            </svg>
          </button>

          <span class="time-display">
            {{ formattedCurrentTime }} / {{ formattedDuration }}
          </span>
        </div>

        <!-- Right: Volume and fullscreen -->
        <div class="controls-right">
          <button class="control-button" @click="toggleMute" :title="isMuted ? '取消静音' : '静音'">
            <svg v-if="!isMuted" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 6h2.5L7 3.5v9L4.5 10H2V6zm7.5-1.5v9c1.5-.5 2.5-1.5 3-3 .5-1.5.5-2.5 0-4-.5-1.5-1.5-2-3-2zM11 3v10c2-.5 3.5-2 4-4.5-.5-2.5-2-4-4-4.5z"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 6h2.5L7 3.5v9L4.5 10H2V2zm9 1.5L9.5 7v2l1.5 1.5V7.5zM13 5l-1.5 1.5v3l1.5 1.5V5z"/>
              <line x1="12" y1="3" x2="12" y2="13" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>

          <button class="control-button" @click="toggleFullscreen" title="全屏">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2v5h2V4h3V2H2zm0 12h5v-2H4v-3H2v5zm12 0H9v2h5v-5zm0-12H9v2h3v3h2V2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Empty state -->
  <div v-else class="empty-state">
    <span class="empty-icon">🎬</span>
    <p>暂无视频</p>
  </div>
</template>

<style scoped>
.video-player {
  background-color: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;
}

/* CSS-based fullscreen for WKWebView compatibility */
.video-player.is-fullscreen {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 99999 !important;
  border-radius: 0 !important;
  border: none !important;
}

.video-container {
  position: relative;
  width: 100%;
  flex: 1;
  min-height: 0;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.video-element {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.controls {
  background-color: var(--bg-elevated);
  padding: 12px 16px;
}

.progress-bar-container {
  margin-bottom: 12px;
}

.progress-bar {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--bg-tertiary);
  outline: none;
  cursor: pointer;
}

.progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  transition: transform 0.1s var(--ease-apple);
}

.progress-bar::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.progress-bar::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  border: none;
}

.controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base) var(--ease-apple);
}

.control-button:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.control-button:active {
  transform: scale(0.95);
}

.time-display {
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: var(--text-secondary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background-color: var(--bg-elevated);
  border: 1px dashed var(--border);
  border-radius: 16px;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-state p {
  margin: 0;
  font-size: 15px;
}
</style>
