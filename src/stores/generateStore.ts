import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  generateAnimationScript,
  getUsage,
  type GenerateResult,
  type ScenePlan,
  type UsageResult,
  QuotaExceededError,
} from "../services/ai-generator";

interface GenerateParams {
  description: string;
  templateId?: string;
  params: {
    primaryColor: string;
    secondaryColor: string;
    style: "modern" | "classic" | "minimal";
    narrationStyle?: string;
    duration: number;
    fps: number;
    resolution: "1080p" | "4k";
  };
}

export const useGenerateStore = defineStore("generate", () => {
  const generatedScript = ref<string>("");
  const generatedScenes = ref<ScenePlan[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const usage = ref<UsageResult | null>(null);
  const history = ref<Array<{ description: string; script: string; timestamp: number }>>([]);

  const hasGeneratedScript = computed(() => generatedScript.value.length > 0);

  /**
   * 生成脚本：调用后端 AI 服务
   * 使用新的 Cloudflare Workers API
   */
  const generateScript = async (params: GenerateParams) => {
    isLoading.value = true;
    error.value = null;

    try {
      // 调用新的后端 API
      const result: GenerateResult = await generateAnimationScript(
        params.description,
        params.params.narrationStyle || "classroom",
        {
          primary: params.params.primaryColor,
          secondary: params.params.secondaryColor,
        },
        params.params.duration,
        params.params.fps,
      );

      generatedScript.value = result.script;
      generatedScenes.value = result.scenes;

      // 更新用量信息
      usage.value = {
        plan: result.usage.plan,
        planName: getPlanName(result.usage.plan),
        usedThisMonth: result.usage.used,
        maxPerMonth: result.usage.max,
        remaining: result.usage.max === -1 ? -1 : result.usage.max - result.usage.used,
        resetDate: getMonthEnd(),
      };

      // 记录到历史
      addToHistory(params.description, result.script);
    } catch (e) {
      if (e instanceof QuotaExceededError) {
        // 配额超限错误
        error.value = `本月配额已用完（${e.used}/${e.max}），请升级订阅以继续使用`;
        usage.value = {
          plan: e.plan,
          planName: getPlanName(e.plan),
          usedThisMonth: e.used,
          maxPerMonth: e.max,
          remaining: 0,
          resetDate: getMonthEnd(),
        };
      } else {
        // 其他错误
        const message = e instanceof Error ? e.message : "生成失败";
        error.value = message;
        console.error("Generation error:", e);
      }
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * 查询当前使用量
   */
  const fetchUsage = async () => {
    try {
      usage.value = await getUsage();
    } catch (e) {
      console.error("Failed to fetch usage:", e);
    }
  };

  /** 获取计划名称 */
  function getPlanName(plan: string): string {
    const names: Record<string, string> = {
      free: "免费版",
      basic: "基础版",
      pro: "专业版",
      ultimate: "旗舰版",
    };
    return names[plan] || "免费版";
  }

  /** 获取月底日期 */
  function getMonthEnd(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  }

  /** 记录到历史 */
  const addToHistory = (description: string, script: string) => {
    const historyItem = {
      description,
      script,
      timestamp: Date.now(),
    };
    history.value.push(historyItem);

    // 同步到 localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("anim-history") || "[]");
      saved.push({
        id: `h-${historyItem.timestamp}`,
        description,
        templateId: "",
        templateTitle: "",
        timestamp: historyItem.timestamp,
        status: "completed" as const,
      });
      localStorage.setItem("anim-history", JSON.stringify(saved));
    } catch {
      // ignore
    }

    // 只保留最近 10 条
    if (history.value.length > 10) {
      history.value = history.value.slice(-10);
    }
  };

  const copyScript = async () => {
    if (!generatedScript.value) return false;
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
    generatedScenes.value = [];
    error.value = null;
  };

  return {
    generatedScript,
    generatedScenes,
    isLoading,
    error,
    usage,
    history,
    hasGeneratedScript,
    generateScript,
    fetchUsage,
    copyScript,
    clearScript,
  };
});
