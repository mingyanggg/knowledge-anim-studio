/**
 * 动画模板数据
 * 覆盖数学/物理/化学各至少4个模板
 */
export interface Template {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: "数学" | "物理" | "化学";
  isPro: boolean;
  duration: string;
  complexity: "初级" | "中级" | "高级";
  /** 模板默认参数，选择模板后自动填充 */
  defaultParams?: {
    style: "modern" | "classic" | "minimal";
    duration: number;
    fps: number;
  };
}

export const templates: Template[] = [
  // ========== 数学模板（4个） ==========
  {
    id: "math-001",
    title: "勾股定理证明",
    description: "通过几何动画演示勾股定理的证明过程，展示直角三角形三边的关系",
    emoji: "📐",
    category: "数学",
    isPro: false,
    duration: "30秒",
    complexity: "初级",
    defaultParams: { style: "modern", duration: 30, fps: 60 },
  },
  {
    id: "math-002",
    title: "微积分基础",
    description: "可视化导数和积分的概念，通过动态图形展示变化率和面积累积",
    emoji: "📈",
    category: "数学",
    isPro: true,
    duration: "45秒",
    complexity: "中级",
    defaultParams: { style: "modern", duration: 45, fps: 60 },
  },
  {
    id: "math-003",
    title: "几何变换",
    description: "演示平移、旋转、缩放等几何变换，展示矩阵变换的视觉效果",
    emoji: "🔄",
    category: "数学",
    isPro: false,
    duration: "35秒",
    complexity: "初级",
    defaultParams: { style: "modern", duration: 35, fps: 60 },
  },
  {
    id: "math-004",
    title: "复数运算",
    description: "通过复平面动画展示复数的加法、乘法和幂运算，直观理解复数性质",
    emoji: "🔢",
    category: "数学",
    isPro: true,
    duration: "50秒",
    complexity: "高级",
    defaultParams: { style: "classic", duration: 50, fps: 60 },
  },

  // ========== 物理模板（4个） ==========
  {
    id: "phys-001",
    title: "牛顿第二定律",
    description: "F = ma 动画演示，展示力、质量和加速度之间的关系",
    emoji: "🍎",
    category: "物理",
    isPro: false,
    duration: "30秒",
    complexity: "初级",
    defaultParams: { style: "modern", duration: 30, fps: 60 },
  },
  {
    id: "phys-002",
    title: "波的传播",
    description: "演示机械波和电磁波的传播特性，包括波长、频率和振幅",
    emoji: "🌊",
    category: "物理",
    isPro: true,
    duration: "40秒",
    complexity: "中级",
    defaultParams: { style: "modern", duration: 40, fps: 60 },
  },
  {
    id: "phys-003",
    title: "电磁波传播原理",
    description: "直观展示电磁波的电场与磁场相互作用，理解横波的本质",
    emoji: "⚡",
    category: "物理",
    isPro: true,
    duration: "55秒",
    complexity: "中级",
    defaultParams: { style: "classic", duration: 55, fps: 60 },
  },
  {
    id: "phys-004",
    title: "量子叠加态可视化",
    description: "用动态图形展示量子比特的叠加原理，直观理解薛定谔猫的思想实验",
    emoji: "🔮",
    category: "物理",
    isPro: true,
    duration: "60秒",
    complexity: "高级",
    defaultParams: { style: "minimal", duration: 60, fps: 30 },
  },

  // ========== 化学模板（4个） ==========
  {
    id: "chem-001",
    title: "原子结构",
    description: "展示原子核和电子云的分布，通过动画演示电子轨道和能级跃迁",
    emoji: "⚛️",
    category: "化学",
    isPro: false,
    duration: "35秒",
    complexity: "初级",
    defaultParams: { style: "modern", duration: 35, fps: 60 },
  },
  {
    id: "chem-002",
    title: "化学键形成",
    description: "可视化离子键和共价键的形成过程，展示电子转移和共享机制",
    emoji: "⚗️",
    category: "化学",
    isPro: true,
    duration: "45秒",
    complexity: "中级",
    defaultParams: { style: "modern", duration: 45, fps: 60 },
  },
  {
    id: "chem-003",
    title: "分子轨道理论",
    description: "展示原子轨道如何组合形成分子轨道，理解化学键的本质",
    emoji: "🧬",
    category: "化学",
    isPro: true,
    duration: "50秒",
    complexity: "高级",
    defaultParams: { style: "classic", duration: 50, fps: 30 },
  },
  {
    id: "chem-004",
    title: "有机反应机理",
    description: "SN1、SN2 反应的详细动画步骤演示，理解亲核取代反应机制",
    emoji: "🧪",
    category: "化学",
    isPro: true,
    duration: "65秒",
    complexity: "高级",
    defaultParams: { style: "minimal", duration: 65, fps: 30 },
  },
];
