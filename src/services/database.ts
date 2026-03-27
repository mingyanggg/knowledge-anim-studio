// Database service for Knowledge Anim Studio
// Provides TypeScript interface to Tauri database commands

import { invoke } from "@tauri-apps/api/core";

// ==================== Type Definitions ====================

export interface Project {
  id: string;
  title: string;
  description?: string;
  narration_style?: string;
  visual_style?: string;
  status: string;
  script?: string;
  video_path?: string;
  duration?: number;
  resolution?: string;
  created_at: number;
  updated_at: number;
}

export interface StylePreset {
  id: string;
  type: string;
  name: string;
  icon?: string;
  description?: string;
  config: string;
}

export interface Case {
  id: string;
  title: string;
  description?: string;
  narration_style?: string;
  visual_style?: string;
  prompt?: string;
  thumbnail_path?: string;
  created_at: number;
}

// ==================== Database API ====================

export const database = {
  // Initialize database
  async init(): Promise<void> {
    return invoke("init_db");
  },

  // Project operations
  async createProject(project: Omit<Project, "created_at" | "updated_at">): Promise<Project> {
    const now = Math.floor(Date.now() / 1000);
    const fullProject: Project = {
      ...project,
      created_at: now,
      updated_at: now,
    };
    return invoke("create_project", { project: fullProject });
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    const currentProject = await this.getProject(id);
    const updatedProject: Project = {
      ...currentProject,
      ...updates,
      updated_at: Math.floor(Date.now() / 1000),
    };
    return invoke("update_project", { id, updates: updatedProject });
  },

  async getProject(id: string): Promise<Project> {
    return invoke("get_project", { id });
  },

  async listProjects(filter?: string): Promise<Project[]> {
    return invoke("list_projects", { filter });
  },

  async deleteProject(id: string): Promise<void> {
    return invoke("delete_project", { id });
  },

  // Settings operations
  async saveSetting(key: string, value: string): Promise<void> {
    return invoke("save_setting", { key, value });
  },

  async getSetting(key: string): Promise<string | null> {
    return invoke("get_setting", { key });
  },

  // Style presets
  async getStylePresets(): Promise<StylePreset[]> {
    return invoke("get_style_presets");
  },

  // Cases
  async getCases(): Promise<Case[]> {
    return invoke("get_cases");
  },
};

// ==================== Helper Functions ====================

/**
 * Generate a unique ID for new projects
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format timestamp to readable date
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Parse style config JSON safely
 */
export function parseStyleConfig(config: string): Record<string, unknown> {
  try {
    return JSON.parse(config);
  } catch {
    return {};
  }
}
