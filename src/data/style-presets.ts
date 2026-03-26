/**
 * 视觉风格预设系统
 * 4 套配色方案，供生成页和设置页使用
 */

export interface StylePreset {
  /** 预设唯一 ID */
  id: string
  /** 展示名称 */
  name: string
  /** 预览描述 */
  description: string
  /** 背景色 */
  background: string
  /** 主色 */
  primaryColor: string
  /** 辅色 */
  secondaryColor: string
  /** 文字颜色 */
  textColor: string
  /** 辅助文字色 */
  subtextColor: string
}

export const stylePresets: StylePreset[] = [
  {
    id: 'deep-space',
    name: '深空科技',
    description: '深邃背景搭配青紫渐变，适合科技类主题',
    background: '#1a1a2e',
    primaryColor: '#00d4ff',
    secondaryColor: '#7c3aed',
    textColor: '#ffffff',
    subtextColor: '#9ca3af',
  },
  {
    id: 'classic-minimal',
    name: '经典极简',
    description: '白色背景深色文字，清晰易读',
    background: '#ffffff',
    primaryColor: '#2c3e50',
    secondaryColor: '#3498db',
    textColor: '#1a1a2e',
    subtextColor: '#6b7280',
  },
  {
    id: 'vibrant-campus',
    name: '活力学院',
    description: '暖黄底配珊瑚青色，活泼有活力',
    background: '#ffeaa7',
    primaryColor: '#e17055',
    secondaryColor: '#00cec9',
    textColor: '#2d3436',
    subtextColor: '#636e72',
  },
  {
    id: 'math-classic',
    name: '数学经典',
    description: '致敬经典数学教学视频的配色',
    background: '#1c1c2e',
    primaryColor: '#58c4dd',
    secondaryColor: '#83c167',
    textColor: '#e5e7eb',
    subtextColor: '#9ca3af',
  },
]

/** 根据 ID 获取预设，默认返回第一个 */
export function getPreset(id: string): StylePreset {
  return stylePresets.find(p => p.id === id) ?? stylePresets[0]
}
