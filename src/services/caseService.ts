/**
 * Case Service - Manages inspiration cases from SQLite database
 */

import { invoke } from '@tauri-apps/api/core';

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

export interface NarrationStyle {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface VisualStyle {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

/**
 * Get all cases from database
 */
export async function getCases(): Promise<Case[]> {
  try {
    const cases = await invoke<Case[]>('get_cases');
    return cases;
  } catch (error) {
    console.error('Failed to fetch cases:', error);
    return getMockCases();
  }
}

/**
 * Get cases filtered by narration style
 */
export async function getCasesByStyle(styleId: string): Promise<Case[]> {
  const allCases = await getCases();
  return allCases.filter(c => c.narration_style === styleId);
}

/**
 * Get a single case by ID
 */
export async function getCaseById(id: string): Promise<Case | null> {
  const allCases = await getCases();
  return allCases.find(c => c.id === id) || null;
}

/**
 * Get narration style info by ID
 */
export function getNarrationStyleById(styleId: string): NarrationStyle | null {
  const styles: NarrationStyle[] = [
    { id: 'default-classroom', name: '课堂讲解', icon: '🎓', description: '专业严谨的课堂讲解风格' },
    { id: 'default-popular-science', name: '科普传播', icon: '📢', description: '通俗易懂的科普风格' },
    { id: 'default-academic', name: '学术报告', icon: '🎯', description: '正式严谨的学术报告' },
    { id: 'default-fun-animation', name: '趣味动画', icon: '🎬', description: '轻松有趣的动画解说' },
    { id: 'default-minimal-tech', name: '极简科技', icon: '🖥️', description: '简洁高效的科技风格' },
    { id: 'default-storytelling', name: '故事叙述', icon: '📖', description: '娓娓道来的故事风格' },
  ];
  return styles.find(s => s.id === styleId) || null;
}

/**
 * Get visual style info by ID
 */
export function getVisualStyleById(styleId: string): VisualStyle | null {
  const styles: VisualStyle[] = [
    { id: 'default-deep-space', name: '深空科技', icon: '🌌', description: '深邃宇宙风格，适合科技主题' },
    { id: 'default-classic-minimal', name: '经典极简', icon: '⚪', description: '简洁明快，适合学术演示' },
    { id: 'default-vibrant-campus', name: '活力学院', icon: '🎨', description: '青春活力，适合校园场景' },
    { id: 'default-math-classic', name: '数学经典', icon: '📐', description: '经典数学风格，清晰严谨' },
  ];
  return styles.find(s => s.id === styleId) || null;
}

/**
 * Mock cases data (fallback when Tauri commands are not available)
 * Matches the 8 seed cases from db.rs
 */
function getMockCases(): Case[] {
  const now = Date.now();
  return [
    {
      id: 'default-case-1',
      title: '微积分导数入门',
      description: '什么是导数？从物理变化率到数学定义',
      narration_style: 'default-classroom',
      visual_style: 'default-deep-space',
      prompt: '请用课堂讲解的方式，解释导数的概念，从物理变化率引入',
      created_at: now,
    },
    {
      id: 'default-case-2',
      title: '量子力学基础',
      description: '波粒二象性：探索微观世界的奥秘',
      narration_style: 'default-popular-science',
      visual_style: 'default-math-classic',
      prompt: '用科普的方式讲解波粒二象性，让初学者也能理解',
      created_at: now,
    },
    {
      id: 'default-case-3',
      title: '线性代数应用',
      description: '矩阵变换在计算机图形学中的应用',
      narration_style: 'default-academic',
      visual_style: 'default-classic-minimal',
      prompt: '学术报告风格，讲解矩阵变换的数学原理和实际应用',
      created_at: now,
    },
    {
      id: 'default-case-4',
      title: '概率统计趣谈',
      description: '贝叶斯定理：从直觉到公式',
      narration_style: 'default-fun-animation',
      visual_style: 'default-vibrant-campus',
      prompt: '趣味动画讲解贝叶斯定理，用生活中的例子',
      created_at: now,
    },
    {
      id: 'default-case-5',
      title: '算法可视化',
      description: '快速排序算法的分治思想',
      narration_style: 'default-minimal-tech',
      visual_style: 'default-deep-space',
      prompt: '极简科技风，可视化展示快速排序的过程',
      created_at: now,
    },
    {
      id: 'default-case-6',
      title: '数学史话',
      description: '欧拉公式的发现之旅',
      narration_style: 'default-storytelling',
      visual_style: 'default-math-classic',
      prompt: '用故事叙述的方式，讲述欧拉如何发现这个美丽的公式',
      created_at: now,
    },
    {
      id: 'default-case-7',
      title: '物理概念解析',
      description: '相对论时间膨胀',
      narration_style: 'default-classroom',
      visual_style: 'default-deep-space',
      prompt: '课堂讲解风格，深入浅出解释时间膨胀原理',
      created_at: now,
    },
    {
      id: 'default-case-8',
      title: '化学动画演示',
      description: '原子轨道与电子云',
      narration_style: 'default-fun-animation',
      visual_style: 'default-vibrant-campus',
      prompt: '趣味动画展示原子轨道和电子云的分布',
      created_at: now,
    },
  ];
}

/**
 * Get recommended cases (for the generate page)
 */
export async function getRecommendedCases(limit: number = 4): Promise<Case[]> {
  const allCases = await getCases();
  // Return a diverse selection covering different styles
  const selected: Case[] = [];
  const usedStyles = new Set<string>();

  for (const caseItem of allCases) {
    if (selected.length >= limit) break;
    if (caseItem.narration_style && !usedStyles.has(caseItem.narration_style)) {
      selected.push(caseItem);
      usedStyles.add(caseItem.narration_style);
    }
  }

  // If we don't have enough, fill with remaining cases
  if (selected.length < limit) {
    for (const caseItem of allCases) {
      if (selected.length >= limit) break;
      if (!selected.includes(caseItem)) {
        selected.push(caseItem);
      }
    }
  }

  return selected;
}
