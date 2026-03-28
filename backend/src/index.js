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

Manim Studio YAML 格式说明：
- scene: 场景配置根节点
  - name: 场景名称（英文，如 "KnowledgeAnimation"）
  - description: 场景描述
  - duration: 总时长（秒）
  - fps: 帧率（默认60）
  - resolution: 分辨率数组，如 [1920, 1080]
  - background_color: 背景色（如 "#000000"）
  - objects: 对象数组
    - name: 对象唯一标识
    - type: 对象类型（text/shape/group）
    - params: 对象参数
      - 对于 text: text（文字内容）, font_size, color, gradient
      - 对于 shape: shape_type（circle/square/rectangle/polygon）, radius, side_length, color, fill_opacity, stroke_width
    - position: 位置数组 [x, y, z]
  - animations: 动画数组
    - target: 目标对象名称
    - type: 动画类型（write/create/fadein/fadeout/move/scale/rotate/transform）
    - start_time: 开始时间（秒）
    - duration: 动画时长（秒）
    - params: 动画参数（可选）
      - 对于 move: to（目标位置）
      - 对于 scale: factor（缩放因子）
      - 对于 rotate: angle（角度，度数）

解说风格要求：${stylePrompts[narration_style] || stylePrompts.classroom}
视觉风格：主色 ${visual_style?.primary || '#007aff'}，辅色 ${visual_style?.secondary || '#5856d6'}
目标时长：${duration || 30} 秒
帧率：${fps || 60} FPS

要求：
1. 生成完整的 Manim Studio YAML 配置
2. 必须包含 scene 根节点，内部包含 name、duration、objects、animations
3. 动画要有节奏感：标题展示 → 核心概念讲解 → 可视化演示 → 总结
4. 所有文字使用 text 类型对象，font_size 建议 36-48
5. 数学公式用纯文本方式呈现（如 "a² - b² = (a+b)(a-b)"）
6. 只输出 YAML 配置，不要任何其他解释文字
7. 确保每个动画的 target 都能在 objects 中找到对应对象
8. 动画时间要合理安排，避免重叠冲突

示例格式：
scene:
  name: "ExampleScene"
  description: "示例场景"
  duration: 30
  fps: 60
  resolution: [1920, 1080]
  background_color: "#000000"
  objects:
    - name: "title"
      type: "text"
      params:
        text: "标题"
        font_size: 48
        color: "#007aff"
      position: [0, 2, 0]
  animations:
    - target: "title"
      type: "write"
      start_time: 0
      duration: 2`;

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
