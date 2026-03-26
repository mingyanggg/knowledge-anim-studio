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

      generatedScript.value = `from manim import *

class GeneratedScene(Scene):
    def construct(self):
        # Generated from: ${params.description.substring(0, 50)}...

        # Title
        title = Text("${params.description.substring(0, 30)}...")
        title.scale(0.8)
        self.play(Write(title))
        self.wait()

        # Main content
        content = MathTex(
            "E = mc^2",
            color="${params.params.primaryColor}"
        )
        content.scale(1.5)
        self.play(Transform(title, content))
        self.wait(2)

        # Conclusion
        self.play(FadeOut(content))
        self.wait()
`;

      // Add to history
      history.value.push({
        description: params.description,
        script: generatedScript.value,
        timestamp: Date.now(),
      });

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
