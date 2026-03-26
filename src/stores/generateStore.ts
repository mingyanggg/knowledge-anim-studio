import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  generateAnimationScript,
  type GenerateResult,
  type ScenePlan,
} from "../services/ai-generator";

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
  const generatedScenes = ref<ScenePlan[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const history = ref<Array<{ description: string; script: string; timestamp: number }>>([]);

  const hasGeneratedScript = computed(() => generatedScript.value.length > 0);

  /**
   * 生成脚本：调用后端 AI 服务
   * 失败时降级为前端 mock
   */
  const generateScript = async (params: GenerateParams) => {
    isLoading.value = true;
    error.value = null;

    try {
      // 尝试调用后端 Tauri Command
      const result: GenerateResult = await generateAnimationScript(
        params.description,
        params.params.style,
      );

      generatedScript.value = result.script;
      generatedScenes.value = result.scenes;

      // 记录到历史
      addToHistory(params.description, result.script);
    } catch (e) {
      console.warn("[generateStore] 后端调用失败，使用前端 mock:", e);

      // 降级：前端 mock 生成
      try {
        await mockGenerate(params);
      } catch (mockErr) {
        error.value = mockErr instanceof Error ? mockErr.message : "生成失败";
        console.error("Mock generation error:", mockErr);
      }
    } finally {
      isLoading.value = false;
    }
  };

  /** 前端 mock 生成（降级方案） */
  const mockGenerate = async (params: GenerateParams) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    generatedScript.value = `# ===== 知识动画脚本 =====
# 主题: ${params.description.substring(0, 50)}

from manim import *

class KnowledgeAnimation(Scene):
    def construct(self):
        # --- 场景 1: 标题 ---
        title = Text("${params.description.substring(0, 30)}")
        self.play(Write(title))
        self.wait(1)

        # --- 场景 2: 核心内容 ---
        formula = MathTex("E = mc^2", color="${params.params.primaryColor}")
        formula.scale(1.5)
        self.play(Transform(title, formula))
        self.wait(2)

        # --- 场景 3: 收尾 ---
        self.play(FadeOut(formula))
        self.wait()
`;

    generatedScenes.value = [
      { index: 1, title: "标题展示", description: "展示知识点标题", duration: 3 },
      { index: 2, title: "核心概念", description: "展示核心公式", duration: 5 },
      { index: 3, title: "总结", description: "结束动画", duration: 2 },
    ];

    addToHistory(params.description, generatedScript.value);
  };

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
    history,
    hasGeneratedScript,
    generateScript,
    copyScript,
    clearScript,
  };
});
