/**
 * AI 动画脚本生成器
 * 通过 Tauri Command 调用后端 AI 服务生成动画脚本
 */

import { invoke } from '@tauri-apps/api/core'
import type { StylePreset } from '../data/style-presets'

/** 生成请求参数 */
export interface GenerateRequest {
  description: string
  style: StylePreset
  difficulty: string
}

/** 单个场景计划 */
export interface ScenePlan {
  index: number
  title: string
  description: string
  duration: number
}

/** AI 生成结果 */
export interface GenerateResult {
  script: string
  scenes: ScenePlan[]
}

/**
 * 调用 AI 生成动画脚本
 * 通过 Tauri Command 调用后端 Gemini CLI
 */
export async function generateAnimationScript(
  description: string,
  style: string,
): Promise<GenerateResult> {
  const result = await invoke<GenerateResult>('generate_animation_script', {
    params: { description, style },
  })
  return result
}

/**
 * 导出脚本文件
 * 通过 Tauri Command 保存到本地
 */
export async function exportScriptFile(
  script: string,
  filename: string,
): Promise<string> {
  return invoke<string>('export_script_file', { script, filename })
}
