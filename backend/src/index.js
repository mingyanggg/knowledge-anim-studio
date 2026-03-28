/**
 * Knowledge Anim Studio — Cloudflare Workers 后端代理
 * 
 * 支持 AI 模型：DeepSeek（默认）、Gemini（后期）
 * API Key 安全存储在服务端，客户端不可见
 * 
 * 功能：代理 AI 调用、用量统计、订阅配额、风控
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      if (path === '/api/generate' && request.method === 'POST') return handleGenerate(request, env);
      if (path === '/api/usage' && request.method === 'GET') return handleGetUsage(request, env);
      if (path === '/api/subscription' && request.method === 'GET') return handleGetSubscription(request, env);
      if (path === '/api/health' && request.method === 'GET') {
        return jsonResponse({ status: 'ok', time: new Date().toISOString(), model: getModelName(env) });
      }
      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  },
};

// ========== 订阅配额 ==========
const SUBSCRIPTION_PLANS = {
  free:     { name: '免费版', maxPerMonth: -1,   price: 0 },
  basic:    { name: '基础版', maxPerMonth: 50,  price: 29 },
  pro:      { name: '专业版', maxPerMonth: 150, price: 59 },
  ultimate: { name: '旗舰版', maxPerMonth: -1,  price: 199 },
};

// ========== AI 模型配置 ==========
const AI_MODELS = {
  deepseek: {
    name: 'DeepSeek V3',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    getKey: (env) => env.DEEPSEEK_API_KEY,
    buildBody: (systemPrompt, userPrompt) => JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8192,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || '',
  },
  gemini: {
    name: 'Gemini 2.5 Flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent',
    model: 'gemini-2.5-flash',
    getKey: (env) => env.GEMINI_API_KEY,
    buildBody: (systemPrompt, userPrompt) => JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
    }),
    parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || '',
  },
};

function getModelConfig(env) {
  const model = env.AI_MODEL || 'deepseek';
  return AI_MODELS[model] || AI_MODELS.deepseek;
}

function getModelName(env) {
  return getModelConfig(env).name;
}

// ========== 生成动画脚本 ==========
async function handleGenerate(request, env) {
  const body = await request.json();
  const { user_id, description, narration_style, visual_style, duration, fps } = body;

  if (!user_id || !description) {
    return jsonResponse({ error: '缺少 user_id 或 description' }, 400);
  }

  // 1. 获取用户数据
  const userKey = `user:${user_id}`;
  const userData = await env.USAGE_KV.get(userKey, 'json') || {
    plan: 'free', usedThisMonth: 0, monthKey: getMonthKey(),
  };

  // 2. 跨月重置
  const currentMonth = getMonthKey();
  if (userData.monthKey !== currentMonth) {
    userData.usedThisMonth = 0;
    userData.monthKey = currentMonth;
  }

  // 3. 配额检查
  const plan = SUBSCRIPTION_PLANS[userData.plan] || SUBSCRIPTION_PLANS.free;
  if (plan.maxPerMonth !== -1 && userData.usedThisMonth >= plan.maxPerMonth) {
    return jsonResponse({
      error: '本月配额已用完',
      plan: userData.plan, used: userData.usedThisMonth, max: plan.maxPerMonth,
    }, 429);
  }

  // 4. 构建 Prompt
  const stylePrompts = {
    classroom: '用教师课堂讲解的口吻，循序渐进，重点用文字标注强调，适合教学场景。在动画中每个关键步骤都要有清晰的中文标注。',
    'popular-science': '用通俗易懂的大白话，生动有趣的比喻，面向大众科普。用生活中的例子来解释抽象概念。',
    academic: '用学术严谨的表达，包含公式推导和逻辑链条，适合学术场合。注重精确性和完整性。',
    'fun-animation': '用轻松幽默的方式，加入生活化类比和趣味元素，吸引眼球。可以用搞笑的比喻。',
    'minimal-tech': '用简洁精准的表达，极简叙事风格，科技感强。少即是多，信息密度高。',
    storytelling: '用讲故事的方式，有起承转合，从生活场景切入知识概念。像纪录片一样娓娓道来。',
  };

  const systemPrompt = `你是一个专业的 Manim Studio 动画配置专家。用户会给你一个知识点描述，你需要生成完整的、可直接渲染的 Manim Studio YAML 配置。

【Manim Studio YAML 格式完整说明】

=== 场景配置 (scene 根节点) ===
- name: 场景名称（英文，如 "PythagoreanTheorem"）
- description: 场景描述
- duration: 总时长（秒）
- fps: 帧率（默认60）
- resolution: 分辨率数组，如 [1920, 1080]
- background_color: 背景色（如 "#000000" 或 "#1a1a2e"）
- objects: 对象数组
- animations: 动画数组

=== 对象类型 (objects) 完整列表 ===

📝 基础文本类：
1. type: "text" - 普通文本
   params: text, font_size (默认48), color, gradient (渐变色数组)
   例子: {text: "勾股定理", font_size: 60, color: "#ff6b6b"}

2. type: "latex" - 数学公式（必须用 LaTeX 语法！）
   params: text (LaTeX公式), font_size (默认48), color
   例子: {text: "a^2 + b^2 = c^2", font_size: 56}
   例子: {text: "\\\\int_0^\\\\infty e^{-x^2} dx = \\\\frac{\\\\sqrt{\\\\pi}}{2}"}

3. type: "formula" - 带装饰框的公式
   params: text (LaTeX), font_size, color, box_color (框颜色), box_opacity (框透明度)
   例子: {text: "E = mc^2", box_color: "#ffd700", box_opacity: 0.3}

📐 几何形状类：
4. type: "shape" - 几何图形
   params: shape_type (circle/square/rectangle/polygon/arrow), radius/side_length, color, fill_opacity, stroke_width

5. type: "axes" - 坐标轴
   params: x_range (如 [-5, 5]), y_range, color

6. type: "graph" - 函数图像
   params: function (如 "x^2"), x_range, color, axes_ref (引用的坐标轴对象名)

7. type: "number_line" - 数轴
   params: x_range, color, label_direction

⚡ 物理对象类：
8. type: "physics_charge" - 电荷
   params: charge (正负值), radius, color

9. type: "physics_field" - 电场/磁场
   params: field_type ("electric"或"magnetic"), charges_ref (引用的电荷对象数组)

10. type: "physics_bar_magnet" - 条形磁铁
    params: color, strength

11. type: "physics_spring" - 弹簧
    params: start_point, end_point, coils, radius

⚗️ 化学对象类：
12. type: "chemistry_molecule" - 分子结构
    params: smiles (SMILES字符串), size

13. type: "chemistry_orbital" - 原子轨道
    params: orbital_type ("s"/"p"/"d"/"f"), principal_n (主量子数), size

🎨 装饰元素类：
14. type: "background" - 背景装饰
    params: gradient_colors (渐变色数组), opacity

15. type: "braces" - 大括号标注
    params: target_ref (目标对象), label (标注文字), direction

16. type: "arrow_between" - 对象间箭头
    params: from_ref, to_ref, color, tip_length

=== 定位方式 (position vs next_to) ===

✅ 强烈推荐使用相对定位 next_to：
- next_to: {target: "对象名", direction: "UP"/"DOWN"/"LEFT"/"RIGHT", buff: 0.5}
- direction 可选: UP, DOWN, LEFT, RIGHT, UR, UL, DR, DL
- buff: 间距（默认0.5）

❌ 尽量避免绝对定位 position：
- position: [x, y, z] - 仅用于背景或固定位置的元素

=== 动画类型 (animations) ===

type 可选值：
- "write" - 书写动画（适合文字和公式）
- "create" - 创建动画（适合形状）
- "fadein"/"fade_out" - 淡入淡出
- "move" - 移动到新位置
- "scale" - 缩放
- "rotate" - 旋转
- "transform" - 变形（一个对象变成另一个）
- "lagged" - 延迟动画（带 lag_ratio 参数）

动画参数：
- start_time: 开始时间
- duration: 持续时间
- params: {run_time (可选), lag_ratio (0-1), rate_func ("linear"/"smooth"/"there_and_back")}

=== 设计原则（必须遵守！）===

1. 🎯 数学公式必须用 type: "latex"，LaTeX 语法
   ✅ {type: "latex", params: {text: "\\\\frac{-b \\\\pm \\\\sqrt{b^2-4ac}}{2a}"}}
   ❌ {type: "text", params: {text: "x = (-b ± √(b²-4ac)) / 2a"}}

2. 📍 优先使用 next_to 相对定位
   ✅ {next_to: {target: "title", direction: "DOWN", buff: 1.0}}
   ❌ {position: [0, -1, 0]}

3. 🎨 每个场景必须包含装饰元素
   - 背景渐变 (type: "background")
   - 重要公式加框 (type: "formula")
   - 关键部分用括号标注 (type: "braces")

4. ⏱️ 动画节奏要合理
   - 标题展示：2-3秒
   - 概念讲解：5-8秒
   - 公式推导：8-12秒
   - 可视化演示：10-15秒
   - 总结收尾：3-5秒

5. 🎭 使用 transform 动画展示变形过程
   例如：从 a² 展开到 (a+b)(a-b) 的分解过程

=== 高质量示例模板 ===

📘 数学主题（勾股定理）：
scene:
  name: "PythagoreanTheorem"
  description: "勾股定理可视化证明"
  duration: 45
  fps: 60
  resolution: [1920, 1080]
  background_color: "#0a0e27"
  objects:
    - name: "bg_gradient"
      type: "background"
      params:
        gradient_colors: ["#0a0e27", "#1a1a3e"]
        opacity: 0.8

    - name: "title"
      type: "text"
      params:
        text: "勾股定理"
        font_size: 72
        gradient: ["#ff6b6b", "#ffd93d"]
      next_to:
        target: null
        direction: "UP"
        buff: 2

    - name: "triangle"
      type: "shape"
      params:
        shape_type: "polygon"
        vertices: [[0, 0, 0], [3, 0, 0], [0, 4, 0]]
        color: "#4ecdc4"
        fill_opacity: 0.3
        stroke_width: 3
      next_to:
        target: "title"
        direction: "DOWN"
        buff: 1.5

    - name: "formula_label"
      type: "latex"
      params:
        text: "a^2 + b^2 = c^2"
        font_size: 56
        color: "#ffd93d"
      next_to:
        target: "triangle"
        direction: "DOWN"
        buff: 1

    - name: "side_a_brace"
      type: "braces"
      params:
        target_ref: "triangle"
        label: "a = 3"
        direction: "DOWN"
      position: [1.5, -0.3, 0]

    - name: "side_b_brace"
      type: "braces"
      params:
        target_ref: "triangle"
        label: "b = 4"
        direction: "LEFT"
      position: [-0.3, 2, 0]

    - name: "side_c_brace"
      type: "braces"
      params:
        target_ref: "triangle"
        label: "c = 5"
        direction: "UR"
      position: [1.5, 2.3, 0]

  animations:
    - target: "title"
      type: "write"
      start_time: 0
      duration: 2.5

    - target: "triangle"
      type: "create"
      start_time: 3
      duration: 2

    - target: "formula_label"
      type: "write"
      start_time: 5.5
      duration: 3

    - target: "side_a_brace"
      type: "fadein"
      start_time: 9
      duration: 1

    - target: "side_b_brace"
      type: "fadein"
      start_time: 10.5
      duration: 1

    - target: "side_c_brace"
      type: "fadein"
      start_time: 12
      duration: 1

⚡ 物理主题（电场）：
scene:
  name: "ElectricField"
  description: "点电荷电场可视化"
  duration: 30
  fps: 60
  background_color: "#0a0a0a"
  objects:
    - name: "positive_charge"
      type: "physics_charge"
      params:
        charge: 1
        radius: 0.5
        color: "#ff4757"
      position: [-2, 0, 0]

    - name: "negative_charge"
      type: "physics_charge"
      params:
        charge: -1
        radius: 0.5
        color: "#3742fa"
      position: [2, 0, 0]

    - name: "field"
      type: "physics_field"
      params:
        field_type: "electric"
        charges_ref: ["positive_charge", "negative_charge"]
      position: [0, 0, 0]

⚗️ 化学主题（水分子）：
scene:
  name: "WaterMolecule"
  description: "水分子结构"
  duration: 20
  fps: 60
  background_color: "#000000"
  objects:
    - name: "h2o"
      type: "chemistry_molecule"
      params:
        smiles: "O"
        size: 2
      position: [0, 0, 0]

=== 当前任务配置 ===
解说风格：${stylePrompts[narration_style] || stylePrompts.classroom}
视觉风格：主色 ${visual_style?.primary || '#007aff'}，辅色 ${visual_style?.secondary || '#5856d6'}
目标时长：${duration || 30} 秒
帧率：${fps || 60} FPS

=== 最终要求 ===
1. 严格遵循上述 YAML 格式
2. 数学公式必须用 LaTeX（type: "latex"）
3. 优先使用 next_to 相对定位
4. 包含装饰元素（背景、标注框等）
5. 动画时间错开，避免冲突
6. 只输出 YAML，不要其他文字
7. 确保每个 target 都在 objects 中存在
8. 动画节奏符合教学规律`;

  const userPrompt = `请为以下知识点生成 Manim 动画脚本：\n\n${description}`;

  // 5. 调用 AI
  const modelConfig = getModelConfig(env);
  const apiKey = modelConfig.getKey(env);
  if (!apiKey) {
    return jsonResponse({ error: '服务暂时不可用，请稍后再试' }, 503);
  }

  const aiResponse = await callAI(modelConfig, apiKey, systemPrompt, userPrompt);
  if (!aiResponse.success) {
    return jsonResponse({ error: '生成失败，请检查输入内容或稍后再试' }, 502);
  }

  // 6. 更新用量
  userData.usedThisMonth += 1;
  userData.lastGenerateAt = new Date().toISOString();
  await env.USAGE_KV.put(userKey, JSON.stringify(userData), { expirationTtl: 90 * 24 * 3600 });

  // 7. 记录日志
  await env.USAGE_KV.put(`log:${user_id}:${Date.now()}`, JSON.stringify({
    user_id, description: description.slice(0, 100),
    narration_style, plan: userData.plan,
    model: modelConfig.name, timestamp: new Date().toISOString(),
  }), { expirationTtl: 30 * 24 * 3600 });

  return jsonResponse({
    success: true,
    script: aiResponse.script,
    scenes: aiResponse.scenes,
    model: modelConfig.name,
    usage: {
      plan: userData.plan, used: userData.usedThisMonth, max: plan.maxPerMonth,
    },
  });
}

// ========== AI 调用 ==========
async function callAI(modelConfig, apiKey, systemPrompt, userPrompt) {
  const endpoint = modelConfig.endpoint;
  const reqBody = modelConfig.buildBody(systemPrompt, userPrompt);

  let fetchUrl = endpoint;
  const headers = { 'Content-Type': 'application/json' };

  // Gemini 用 query param 传 key
  if (modelConfig.model === 'gemini') {
    fetchUrl += `?key=${apiKey}`;
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(fetchUrl, {
    method: 'POST',
    headers,
    body: reqBody,
  });

  if (!response.ok) {
    const err = await response.text();
    return { success: false, error: `${modelConfig.name} API error: ${response.status} - ${err}` };
  }

  const data = await response.json();
  const text = modelConfig.parseResponse(data);

  // 提取 YAML 配置
  // 尝试匹配 YAML 代码块
  const yamlMatch = text.match(/```(?:yaml)?\s*\n([\s\S]*?)```/);
  let yamlConfig = yamlMatch ? yamlMatch[1].trim() : text.trim();

  // 如果没有代码块，尝试找到 scene: 开头的内容
  if (!yamlConfig.includes('scene:')) {
    const sceneMatch = text.match(/scene:\s*\n((?:[\s\S]*?)(?=\n\w+:|\n\n\n|$))/);
    if (sceneMatch) {
      yamlConfig = 'scene:\n' + sceneMatch[1].trim();
    }
  }

  // 清理可能的 markdown 格式
  yamlConfig = yamlConfig
    .replace(/^```\w*\n/, '')  // 移除开头的代码块标记
    .replace(/```$/, '')        // 移除结尾的代码块标记
    .trim();

  // 验证基本结构
  if (!yamlConfig.includes('scene:') || !yamlConfig.includes('objects:') || !yamlConfig.includes('animations:')) {
    return {
      success: false,
      error: '生成的配置缺少必要字段（scene/objects/animations）',
      raw: yamlConfig
    };
  }

  // 解析场景信息（从 objects 中提取标题作为场景名称）
  const scenes = [];
  try {
    // 简单的 YAML 解析（不用引入 yaml 解析库）
    const titleMatch = yamlConfig.match(/-\s*name:\s*["'](.+?)["']\s*\n\s*type:\s*["']text["']\s*\n\s*params:\s*\n\s*text:\s*["'](.+?)["']/);
    if (titleMatch) {
      scenes.push({ index: 1, title: titleMatch[2] });
    }
  } catch (e) {
    // 解析失败不影响返回
  }

  return { success: true, script: yamlConfig, scenes };
}

// ========== 用量查询 ==========
async function handleGetUsage(request, env) {
  const userId = new URL(request.url).searchParams.get('user_id');
  if (!userId) return jsonResponse({ error: '缺少 user_id' }, 400);

  const userData = await env.USAGE_KV.get(`user:${userId}`, 'json') || {
    plan: 'free', usedThisMonth: 0, monthKey: getMonthKey(),
  };

  if (userData.monthKey !== getMonthKey()) {
    userData.usedThisMonth = 0;
    userData.monthKey = getMonthKey();
  }

  const plan = SUBSCRIPTION_PLANS[userData.plan] || SUBSCRIPTION_PLANS.free;

  return jsonResponse({
    plan: userData.plan, planName: plan.name,
    usedThisMonth: userData.usedThisMonth,
    maxPerMonth: plan.maxPerMonth,
    remaining: plan.maxPerMonth === -1 ? -1 : plan.maxPerMonth - userData.usedThisMonth,
    resetDate: getMonthEnd(),
  });
}

// ========== 订阅查询 ==========
async function handleGetSubscription(request, env) {
  const userId = new URL(request.url).searchParams.get('user_id');
  if (!userId) return jsonResponse({ error: '缺少 user_id' }, 400);

  const userData = await env.USAGE_KV.get(`user:${userId}`, 'json') || { plan: 'free' };
  const plan = SUBSCRIPTION_PLANS[userData.plan] || SUBSCRIPTION_PLANS.free;

  return jsonResponse({
    currentPlan: userData.plan, planName: plan.name,
    price: plan.price, plans: SUBSCRIPTION_PLANS,
    currentModel: getModelName(env),
  });
}

// ========== 工具 ==========
function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function getMonthEnd() {
  return new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];
}
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}
