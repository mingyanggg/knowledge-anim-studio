import { defineStore } from "pinia";
import { ref, computed } from "vue";

interface GenerateParams {
  description: string;
  templateId?: string;
  params: {
    primaryColor: string;
    secondaryColor: string;
    style: "modern" | "classic" | "minimal";
    duration: number;
    fps: number;
    resolution: "1080p" | "4k";
  };
}

export const useGenerateStore = defineStore("generate", () => {
  const generatedScript = ref<string>("");
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const history = ref<Array<{ description: string; script: string; timestamp: number }>>([]);

  const hasGeneratedScript = computed(() => generatedScript.value.length > 0);

  const generateScript = async (params: GenerateParams) => {
    isLoading.value = true;
    error.value = null;

    try {
      // Mock AI generation - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      generatedScript.value = `# ===== 知识动画脚本 =====
# 主题: ${params.description.substring(0, 50)}

# --- 场景 1: 标题 ---
标题 = 文字("${params.description.substring(0, 30)}")
显示(标题)
等待(1秒)

# --- 场景 2: 核心内容 ---
公式 = 数学公式("E = mc^2", 颜色="${params.params.primaryColor}")
放大(公式, 1.5倍)
变换(标题, 公式)
等待(2秒)

# --- 场景 3: 收尾 ---
淡出(公式)
等待()
`;

      // Add to history
      const historyItem = {
        description: params.description,
        script: generatedScript.value,
        timestamp: Date.now(),
      };
      history.value.push(historyItem);

      // 同步到 localStorage 历史记录
      try {
        const saved = JSON.parse(localStorage.getItem("anim-history") || "[]");
        saved.push({
          id: `h-${historyItem.timestamp}`,
          description: params.description,
          templateId: params.templateId || "",
          templateTitle: "",
          timestamp: historyItem.timestamp,
          status: "completed" as const,
        });
        localStorage.setItem("anim-history", JSON.stringify(saved));
      } catch {
        // ignore
      }

      // Keep only last 10 items
      if (history.value.length > 10) {
        history.value = history.value.slice(-10);
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "生成失败";
      console.error("Generation error:", e);
    } finally {
      isLoading.value = false;
    }
  };

  const copyScript = async () => {
    if (!generatedScript.value) return;

    try {
      await navigator.clipboard.writeText(generatedScript.value);
      return true;
    } catch (e) {
      console.error("Copy error:", e);
      return false;
    }
  };

  const clearScript = () => {
    generatedScript.value = "";
    error.value = null;
  };

  return {
    generatedScript,
    isLoading,
    error,
    history,
    hasGeneratedScript,
    generateScript,
    copyScript,
    clearScript,
  };
});
