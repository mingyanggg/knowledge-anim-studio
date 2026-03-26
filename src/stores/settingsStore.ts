import { defineStore } from "pinia";
import { ref } from "vue";

interface Settings {
  apiProvider: "deepseek" | "openai";
  apiKey: string;
  theme: "dark" | "light";
  exportFormat: "gif" | "mp4" | "webm";
  resolution: "720p" | "1080p" | "4k";
  fps: 30 | 60;
  language: "zh" | "en";
}

export const useSettingsStore = defineStore("settings", () => {
  const settings = ref<Settings>({
    apiProvider: "deepseek",
    apiKey: "",
    theme: "dark",
    exportFormat: "mp4",
    resolution: "1080p",
    fps: 30,
    language: "zh",
  });

  const updateSettings = (newSettings: Partial<Settings>) => {
    settings.value = { ...settings.value, ...newSettings };
    localStorage.setItem("settings", JSON.stringify(settings.value));
  };

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem("settings");
      if (saved) {
        settings.value = { ...settings.value, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  const resetSettings = () => {
    settings.value = {
      apiProvider: "deepseek",
      apiKey: "",
      theme: "dark",
      exportFormat: "mp4",
      resolution: "1080p",
      fps: 30,
      language: "zh",
    };
    localStorage.removeItem("settings");
  };

  // 初始化加载
  loadSettings();

  return {
    settings,
    updateSettings,
    loadSettings,
    resetSettings,
  };
});
