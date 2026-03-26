import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { templates, type Template } from "../data/templates";

export const useTemplateStore = defineStore("template", () => {
  const templates = ref<Template[]>(templates);

  const getTemplateById = (id: string) => {
    return templates.value.find(t => t.id === id);
  };

  const getTemplatesByCategory = (category: string) => {
    if (category === "全部") return templates.value;
    return templates.value.filter(t => t.category === category);
  };

  const searchTemplates = (query: string) => {
    const q = query.toLowerCase();
    return templates.value.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    );
  };

  return {
    templates,
    getTemplateById,
    getTemplatesByCategory,
    searchTemplates,
  };
});
