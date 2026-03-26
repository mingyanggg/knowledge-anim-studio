import { defineStore } from "pinia";
import { ref } from "vue";

interface Settings {
  apiProvider: "deepseek" | "openai";
  apiKey: string;
  theme: "dark" | "light";
  language: "zh" | "en";
}

export const useSettingsStore = defineStore("settings", () => {
  const settings = ref<Settings>({
    apiProvider: "deepseek",
    apiKey: "",
    theme: "dark",
    language: "zh",
  });

  const updateSettings = (newSettings: Partial<Settings>) => {
    settings.value = { ...settings.value, ...newSettings };
    // Save to local storage or Tauri store
    localStorage.setItem("settings", JSON.stringify(settings.value));
  };

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem("settings");
      if (saved) {
        settings.value = JSON.parse(saved);
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
      language: "zh",
    };
    localStorage.removeItem("settings");
  };

  // Load settings on init
  loadSettings();

  return {
    settings,
    updateSettings,
    loadSettings,
    resetSettings,
  };
});
