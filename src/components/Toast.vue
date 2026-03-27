<script setup lang="ts">
import { ref, onMounted } from "vue";

export interface ToastOptions {
  message: string;
  type?: "success" | "error" | "warning" | "info";
  duration?: number;
}

const props = withDefaults(defineProps<ToastOptions>(), {
  type: "success",
  duration: 3000,
});

const emit = defineEmits<{
  close: [];
}>();

const visible = ref(false);
const timer = ref<ReturnType<typeof setTimeout> | null>(null);

onMounted(() => {
  // 触发进入动画
  visible.value = true;

  // 自动关闭
  if (props.duration > 0) {
    timer.value = setTimeout(() => {
      handleClose();
    }, props.duration);
  }
});

const handleClose = () => {
  visible.value = false;
  // 等待退出动画完成后触发 close 事件
  setTimeout(() => {
    emit("close");
  }, 200);
};

// 清理定时器
if (timer.value) {
  clearTimeout(timer.value);
}
</script>

<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" :class="type">
      <span class="toast-icon">
        <template v-if="type === 'success'">✓</template>
        <template v-else-if="type === 'error'">✕</template>
        <template v-else-if="type === 'warning'">⚠</template>
        <template v-else>ℹ</template>
      </span>
      <span class="toast-message">{{ message }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background-color: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-button);
  box-shadow: var(--shadow-elevated);
  z-index: 9999;
  min-width: 280px;
  max-width: 480px;
}

.toast.success {
  background-color: rgba(52, 199, 89, 0.95);
  border-color: rgba(52, 199, 89, 0.3);
  color: white;
}

.toast.error {
  background-color: rgba(255, 59, 48, 0.95);
  border-color: rgba(255, 59, 48, 0.3);
  color: white;
}

.toast.warning {
  background-color: rgba(255, 149, 0, 0.95);
  border-color: rgba(255, 149, 0, 0.3);
  color: white;
}

.toast.info {
  background-color: rgba(0, 122, 255, 0.95);
  border-color: rgba(0, 122, 255, 0.3);
  color: white;
}

.toast-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
}

/* ==================== 过渡动画 ==================== */

.toast-enter-active {
  transition: all 0.2s var(--ease-apple);
}

.toast-leave-active {
  transition: all 0.2s var(--ease-apple);
}

.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>
