/**
 * AI 动画脚本生成器
 * 通过 Cloudflare Workers 后端调用 Gemini API 生成动画脚本
 */

/** 生成请求参数 */
export interface GenerateRequest {
  user_id: string
  description: string
  narration_style: string
  visual_style: {
    primary: string
    secondary: string
  }
  duration: number
  fps: number
}

/** 单个场景计划 */
export interface ScenePlan {
  index: number
  title: string
  description: string
  duration: number
}

/** 使用情况 */
export interface UsageInfo {
  plan: string
  used: number
  max: number
}

/** AI 生成结果 */
export interface GenerateResult {
  success: boolean
  script: string
  scenes: ScenePlan[]
  usage: UsageInfo
}

/** 用量查询结果 */
export interface UsageResult {
  plan: string
  planName: string
  usedThisMonth: number
  maxPerMonth: number
  remaining: number
  resetDate: string
}

/** API 基础 URL */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

/**
 * 获取设备 ID（存储在 localStorage 中）
 */
function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id')
  if (!deviceId) {
    // 生成随机 UUID v4
    deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
    localStorage.setItem('device_id', deviceId)
  }
  return deviceId
}

/**
 * 调用后端 API 生成动画脚本
 */
export async function generateAnimationScript(
  description: string,
  narrationStyle: string,
  visualStyle: { primary: string; secondary: string },
  duration: number,
  fps: number,
): Promise<GenerateResult> {
  const userId = getDeviceId()

  const response = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      description,
      narration_style: narrationStyle,
      visual_style: visualStyle,
      duration,
      fps,
    } as GenerateRequest),
  })

  if (!response.ok) {
    // 处理 429 配额超限
    if (response.status === 429) {
      const errorData = await response.json()
      throw new QuotaExceededError(
        errorData.error || '本月配额已用完',
        errorData.plan,
        errorData.used,
        errorData.max,
      )
    }
    // 其他错误
    const errorData = await response.json().catch(() => ({ error: '请求失败' }))
    throw new Error(errorData.error || `API 错误: ${response.status}`)
  }

  return response.json()
}

/**
 * 查询当前使用量
 */
export async function getUsage(): Promise<UsageResult> {
  const userId = getDeviceId()

  const response = await fetch(
    `${API_BASE}/api/usage?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )

  if (!response.ok) {
    throw new Error(`查询用量失败: ${response.status}`)
  }

  return response.json()
}

/**
 * 配额超限错误类
 */
export class QuotaExceededError extends Error {
  constructor(
    message: string,
    public plan: string,
    public used: number,
    public max: number,
  ) {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

/**
 * 导出脚本文件
 * 通过 Tauri Command 保存到本地（降级功能）
 */
export async function exportScriptFile(
  script: string,
  filename: string,
): Promise<string> {
  // 这个功能在浏览器端使用 Blob 下载降级
  // 如果在 Tauri 环境中，可以尝试调用 Tauri API
  if (typeof window !== 'undefined' && (window as any).__TAURI__) {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<string>('export_script_file', { script, filename })
  }

  // 浏览器降级：抛出错误，让调用者处理
  throw new Error('需要使用浏览器下载方式')
}
