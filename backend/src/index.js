/**
 * Knowledge Anim Studio — Cloudflare Workers 后端代理
 * 
 * 功能：
 * 1. 代理 Gemini API 调用（API Key 不暴露给客户端）
 * 2. 用户用量统计（KV 存储）
 * 3. 订阅配额检查
 * 4. 风控（频率限制）
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    try {
      // 路由
      if (path === '/api/generate' && request.method === 'POST') {
        return handleGenerate(request, env);
      }
      if (path === '/api/usage' && request.method === 'GET') {
        return handleGetUsage(request, env);
      }
      if (path === '/api/subscription' && request.method === 'GET') {
        return handleGetSubscription(request, env);
      }
      if (path === '/api/health' && request.method === 'GET') {
        return jsonResponse({ status: 'ok', time: new Date().toISOString() });
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  },
};

// ========== 订阅配额 ==========
const SUBSCRIPTION_PLANS = {
  free:     { name: '免费版', maxPerMonth: 3,   price: 0 },
  basic:    { name: '基础版', maxPerMonth: 50,  price: 29 },
  pro:      { name: '专业版', maxPerMonth: 150, price: 59 },
  ultimate: { name: '旗舰版', maxPerMonth: -1,  price: 199 }, // -1 = 不限
};

// ========== 生成动画脚本 ==========
async function handleGenerate(request, env) {
  const body = await request.json();
  const { user_id, description, narration_style, visual_style, duration, fps } = body;

  if (!user_id || !description) {
    return jsonResponse({ error: '缺少 user_id 或 description' }, 400);
  }

  // 1. 获取用户订阅信息
  const userKey = `user:${user_id}`;
  const userData = await env.USAGE_KV.get(userKey, 'json') || {
    plan: 'free',
    usedThisMonth: 0,
    monthKey: getMonthKey(),
  };

  // 2. 检查月份是否跨月，跨月则重置用量
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
      plan: userData.plan,
      used: userData.usedThisMonth,
      max: plan.maxPerMonth,
    }, 429);
  }

  // 4. 构建 Gemini Prompt
  const stylePrompts = {
    classroom: '用教师课堂讲解的口吻，循序渐进，重点用文字标注强调，适合教学场景',
    'popular-science': '用通俗易懂的大白话，生动有趣的比喻，面向大众科普',
    academic: '用学术严谨的表达，包含公式推导和逻辑链条，适合学术场合',
    'fun-animation': '用轻松幽默的方式，加入生活化类比和趣味元素，吸引眼球',
    'minimal-tech': '用简洁精准的表达，极简叙事风格，科技感强',
    storytelling: '用讲故事的方式，有起承转合，从生活场景切入知识概念',
  };

  const systemPrompt = `你是一个专业的 Manim 动画脚本编写专家。用户会给你一个知识点描述，你需要生成完整的 Manim Python 脚本。

解说风格要求：${stylePrompts[narration_style] || stylePrompts.classroom}
视觉风格：主色 ${visual_style?.primary || '#007aff'}，辅色 ${visual_style?.secondary || '#5856d6'}
目标时长：${duration || 30} 秒
帧率：${fps || 60} FPS

要求：
1. 生成完整的可运行 Manim Python 脚本
2. 脚本必须包含 class Scene(Scene) 和 construct 方法
3. 动画要有节奏感，不要太快或太慢
4. 用中文文字标注（Text 对象）解释每个步骤
5. 确保代码可以直接用 manim render 运行
6. 只输出 Python 代码，不要其他解释`;

  const userPrompt = `请为以下知识点生成 Manim 动画脚本：\n\n${description}`;

  // 5. 调用 Gemini API
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: '服务器 API Key 未配置' }, 500);
  }

  const geminiResponse = await callGeminiAPI(apiKey, systemPrompt, userPrompt);

  if (!geminiResponse.success) {
    return jsonResponse({ error: 'AI 生成失败', detail: geminiResponse.error }, 502);
  }

  // 6. 更新用量
  userData.usedThisMonth += 1;
  userData.lastGenerateAt = new Date().toISOString();
  await env.USAGE_KV.put(userKey, JSON.stringify(userData), {
    expirationTtl: 90 * 24 * 3600, // 90 天过期
  });

  // 7. 记录生成日志
  const logKey = `log:${user_id}:${Date.now()}`;
  await env.USAGE_KV.put(logKey, JSON.stringify({
    user_id,
    description: description.slice(0, 100),
    narration_style,
    plan: userData.plan,
    timestamp: new Date().toISOString(),
  }), { expirationTtl: 30 * 24 * 3600 });

  return jsonResponse({
    success: true,
    script: geminiResponse.script,
    scenes: geminiResponse.scenes,
    usage: {
      plan: userData.plan,
      used: userData.usedThisMonth,
      max: plan.maxPerMonth,
    },
  });
}

// ========== 查询用量 ==========
async function handleGetUsage(request, env) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  if (!userId) return jsonResponse({ error: '缺少 user_id' }, 400);

  const userData = await env.USAGE_KV.get(`user:${userId}`, 'json') || {
    plan: 'free',
    usedThisMonth: 0,
    monthKey: getMonthKey(),
  };

  const currentMonth = getMonthKey();
  if (userData.monthKey !== currentMonth) {
    userData.usedThisMonth = 0;
    userData.monthKey = currentMonth;
  }

  const plan = SUBSCRIPTION_PLANS[userData.plan] || SUBSCRIPTION_PLANS.free;

  return jsonResponse({
    plan: userData.plan,
    planName: plan.name,
    usedThisMonth: userData.usedThisMonth,
    maxPerMonth: plan.maxPerMonth,
    remaining: plan.maxPerMonth === -1 ? -1 : plan.maxPerMonth - userData.usedThisMonth,
    resetDate: getMonthEnd(),
  });
}

// ========== 查询订阅 ==========
async function handleGetSubscription(request, env) {
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  if (!userId) return jsonResponse({ error: '缺少 user_id' }, 400);

  const userData = await env.USAGE_KV.get(`user:${userId}`, 'json') || { plan: 'free' };
  const plan = SUBSCRIPTION_PLANS[userData.plan] || SUBSCRIPTION_PLANS.free;

  return jsonResponse({
    currentPlan: userData.plan,
    planName: plan.name,
    price: plan.price,
    plans: SUBSCRIPTION_PLANS,
  });
}

// ========== Gemini API 调用 ==========
async function callGeminiAPI(apiKey, systemPrompt, userPrompt) {
  const model = 'gemini-2.5-flash-preview-05-20';

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [{
      parts: [{ text: userPrompt }],
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    return { success: false, error: `Gemini API error: ${response.status} - ${err}` };
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // 提取 Python 代码块
  const codeMatch = text.match(/```(?:python)?\s*\n([\s\S]*?)```/);
  const script = codeMatch ? codeMatch[1].trim() : text.trim();

  // 简单解析场景（从脚本注释中提取）
  const scenes = [];
  const sceneComments = script.matchAll(/#\s*===\s*场景\s*(\d+)[：:]\s*(.+?)(?:\n|$)/g);
  for (const match of sceneComments) {
    scenes.push({
      index: parseInt(match[1]),
      title: match[2].trim(),
    });
  }

  return { success: true, script, scenes };
}

// ========== 工具函数 ==========
function getMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthEnd() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
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
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}
