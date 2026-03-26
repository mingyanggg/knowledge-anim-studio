/**
 * 概念智能分析器
 * 输入用户描述 → 判断类型（LaTeX / 模板匹配 / AI 创作）
 */

/** 分析结果类型 */
export type AnalysisType = 'latex' | 'template' | 'ai'

export interface AnalysisResult {
  /** 分析类型 */
  type: AnalysisType
  /** 展示标签 */
  label: string
  /** 匹配到的模板 ID（仅 template 类型） */
  templateId?: string
  /** 匹配到的模板名称 */
  templateName?: string
  /** 置信度 0-1 */
  confidence: number
}

// ---------- LaTeX 常见命令 ----------
const LATEX_COMMANDS = [
  '\\frac', '\\sum', '\\int', '\\sqrt', '\\lim',
  '\\alpha', '\\beta', '\\gamma', '\\theta', '\\pi',
  '\\sin', '\\cos', '\\tan', '\\log', '\\ln',
  '\\partial', '\\nabla', '\\infty', '\\pm',
  '\\times', '\\div', '\\cdot', '\\leq', '\\geq',
  '\\neq', '\\approx', '\\equiv', '\\in', '\\subset',
  '\\forall', '\\exists', '\\rightarrow', '\\Rightarrow',
  '\\left', '\\right', '\\begin', '\\end',
  '\\mathbf', '\\mathrm', '\\text',
]

// ---------- 关键词 → 模板 ID 映射 ----------
const KEYWORD_MAP: Array<{ keywords: string[]; templateId: string; templateName: string }> = [
  { keywords: ['勾股定理', '勾股', '直角三角形三边', 'a²+b²=c²', 'a^2+b^2=c^2'], templateId: 'math-001', templateName: '勾股定理证明' },
  { keywords: ['微积分', '导数', '积分', '求导', '不定积分', '定积分'], templateId: 'math-002', templateName: '微积分基础' },
  { keywords: ['几何变换', '平移', '旋转', '缩放', '矩阵变换'], templateId: 'math-003', templateName: '几何变换' },
  { keywords: ['复数', '复平面', '虚数', 'i²'], templateId: 'math-004', templateName: '复数运算' },
  { keywords: ['牛顿第二定律', 'F=ma', 'F=ma', '力 质量 加速度'], templateId: 'phys-001', templateName: '牛顿第二定律' },
  { keywords: ['波的传播', '机械波', '电磁波', '波长', '振幅'], templateId: 'phys-002', templateName: '波的传播' },
  { keywords: ['电磁波', '电场', '磁场', '横波'], templateId: 'phys-003', templateName: '电磁波传播原理' },
  { keywords: ['量子', '叠加态', '薛定谔', '量子比特'], templateId: 'phys-004', templateName: '量子叠加态可视化' },
  { keywords: ['原子结构', '原子核', '电子云', '电子轨道'], templateId: 'chem-001', templateName: '原子结构' },
  { keywords: ['化学键', '离子键', '共价键'], templateId: 'chem-002', templateName: '化学键形成' },
  { keywords: ['分子轨道'], templateId: 'chem-003', templateName: '分子轨道理论' },
  { keywords: ['SN1', 'SN2', '亲核取代', '有机反应'], templateId: 'chem-004', templateName: '有机反应机理' },
  // 额外扩展关键词
  { keywords: ['二次函数', '抛物线', 'y=ax²'], templateId: 'math-002', templateName: '微积分基础' },
  { keywords: ['傅里叶', '傅里叶变换', '频域', 'Fourier'], templateId: 'math-002', templateName: '微积分基础' },
  { keywords: ['牛顿定律', '牛顿第一', '惯性定律'], templateId: 'phys-001', templateName: '牛顿第二定律' },
]

/**
 * 分析用户输入，返回分析结果
 */
export function analyzeConcept(input: string): AnalysisResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { type: 'ai', label: '等待输入', confidence: 0 }
  }

  // 1) LaTeX 检测：至少命中 2 个命令才算
  const latexHits = LATEX_COMMANDS.filter(cmd => trimmed.includes(cmd))
  if (latexHits.length >= 1) {
    return {
      type: 'latex',
      label: 'LaTeX 公式',
      confidence: Math.min(latexHits.length / 3, 1),
    }
  }

  // 2) 关键词匹配
  for (const mapping of KEYWORD_MAP) {
    for (const kw of mapping.keywords) {
      if (trimmed.toLowerCase().includes(kw.toLowerCase())) {
        return {
          type: 'template',
          label: `模板匹配：${mapping.templateName}`,
          templateId: mapping.templateId,
          templateName: mapping.templateName,
          confidence: 0.9,
        }
      }
    }
  }

  // 3) 兜底：AI 创作
  return {
    type: 'ai',
    label: 'AI 创作',
    confidence: 0.5,
  }
}

/**
 * AI 生成接口预留
 * 后端就绪后替换此 mock
 */
export async function aiGenerate(input: string): Promise<string> {
  // TODO: 替换为真实 API 调用
  console.log('[concept-analyzer] AI 生成预留接口，输入:', input)
  return `AI 将为 "${input.substring(0, 50)}" 生成专属动画脚本…`
}
