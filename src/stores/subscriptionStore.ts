import { defineStore } from "pinia";
import { ref, computed } from "vue";

interface SubscriptionState {
  isPro: boolean;
  expiryDate: string | null;
  activatedCodes: string[];
}

export const useSubscriptionStore = defineStore("subscription", () => {
  const state = ref<SubscriptionState>({
    isPro: false,
    expiryDate: null,
    activatedCodes: [],
  });

  const isPro = computed(() => state.value.isPro);

  const checkSubscription = async () => {
    // Mock check - replace with actual API call
    return {
      isPro: state.value.isPro,
      expiryDate: state.value.expiryDate,
    };
  };

  const activateCode = async (code: string): Promise<{ success: boolean; message: string }> => {
    // Mock activation - replace with actual API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if code is already activated
    if (state.value.activatedCodes.includes(code)) {
      return {
        success: false,
        message: "该激活码已被使用",
      };
    }

    // Mock validation (accept any code starting with "PRO-")
    if (code.startsWith("PRO-")) {
      state.value.isPro = true;
      state.value.expiryDate = "永久";
      state.value.activatedCodes.push(code);

      return {
        success: true,
        message: "激活成功！欢迎成为 Pro 用户",
      };
    }

    return {
      success: false,
      message: "无效的激活码",
    };
  };

  const deactivate = () => {
    state.value.isPro = false;
    state.value.expiryDate = null;
  };

  return {
    state,
    isPro,
    checkSubscription,
    activateCode,
    deactivate,
  };
});
