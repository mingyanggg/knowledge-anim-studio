var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-KkkJIb/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// src/index.js
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    try {
      if (path === "/api/generate" && request.method === "POST")
        return handleGenerate(request, env);
      if (path === "/api/usage" && request.method === "GET")
        return handleGetUsage(request, env);
      if (path === "/api/subscription" && request.method === "GET")
        return handleGetSubscription(request, env);
      if (path === "/api/health" && request.method === "GET") {
        return jsonResponse({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString(), model: getModelName(env) });
      }
      return jsonResponse({ error: "Not found" }, 404);
    } catch (err) {
      return jsonResponse({ error: err.message }, 500);
    }
  }
};
var SUBSCRIPTION_PLANS = {
  free: { name: "\u514D\u8D39\u7248", maxPerMonth: -1, price: 0 },
  basic: { name: "\u57FA\u7840\u7248", maxPerMonth: 50, price: 29 },
  pro: { name: "\u4E13\u4E1A\u7248", maxPerMonth: 150, price: 59 },
  ultimate: { name: "\u65D7\u8230\u7248", maxPerMonth: -1, price: 199 }
};
var AI_MODELS = {
  deepseek: {
    name: "DeepSeek V3",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
    getKey: (env) => env.DEEPSEEK_API_KEY,
    buildBody: (systemPrompt, userPrompt) => JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 8192
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ""
  },
  gemini: {
    name: "Gemini 2.5 Flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent",
    model: "gemini-2.5-flash",
    getKey: (env) => env.GEMINI_API_KEY,
    buildBody: (systemPrompt, userPrompt) => JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
    }),
    parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  }
};
function getModelConfig(env) {
  const model = env.AI_MODEL || "deepseek";
  return AI_MODELS[model] || AI_MODELS.deepseek;
}
__name(getModelConfig, "getModelConfig");
function getModelName(env) {
  return getModelConfig(env).name;
}
__name(getModelName, "getModelName");
async function handleGenerate(request, env) {
  const body = await request.json();
  const { user_id, description, narration_style, visual_style, duration, fps } = body;
  if (!user_id || !description) {
    return jsonResponse({ error: "\u7F3A\u5C11 user_id \u6216 description" }, 400);
  }
  const userKey = `user:${user_id}`;
  const userData = await env.USAGE_KV.get(userKey, "json") || {
    plan: "free",
    usedThisMonth: 0,
    monthKey: getMonthKey()
  };
  const currentMonth = getMonthKey();
  if (userData.monthKey !== currentMonth) {
    userData.usedThisMonth = 0;
    userData.monthKey = currentMonth;
  }
  const plan = SUBSCRIPTION_PLANS[userData.plan] || SUBSCRIPTION_PLANS.free;
  if (plan.maxPerMonth !== -1 && userData.usedThisMonth >= plan.maxPerMonth) {
    return jsonResponse({
      error: "\u672C\u6708\u914D\u989D\u5DF2\u7528\u5B8C",
      plan: userData.plan,
      used: userData.usedThisMonth,
      max: plan.maxPerMonth
    }, 429);
  }
  const stylePrompts = {
    classroom: "\u7528\u6559\u5E08\u8BFE\u5802\u8BB2\u89E3\u7684\u53E3\u543B\uFF0C\u5FAA\u5E8F\u6E10\u8FDB\uFF0C\u91CD\u70B9\u7528\u6587\u5B57\u6807\u6CE8\u5F3A\u8C03\uFF0C\u9002\u5408\u6559\u5B66\u573A\u666F\u3002\u5728\u52A8\u753B\u4E2D\u6BCF\u4E2A\u5173\u952E\u6B65\u9AA4\u90FD\u8981\u6709\u6E05\u6670\u7684\u4E2D\u6587\u6807\u6CE8\u3002",
    "popular-science": "\u7528\u901A\u4FD7\u6613\u61C2\u7684\u5927\u767D\u8BDD\uFF0C\u751F\u52A8\u6709\u8DA3\u7684\u6BD4\u55BB\uFF0C\u9762\u5411\u5927\u4F17\u79D1\u666E\u3002\u7528\u751F\u6D3B\u4E2D\u7684\u4F8B\u5B50\u6765\u89E3\u91CA\u62BD\u8C61\u6982\u5FF5\u3002",
    academic: "\u7528\u5B66\u672F\u4E25\u8C28\u7684\u8868\u8FBE\uFF0C\u5305\u542B\u516C\u5F0F\u63A8\u5BFC\u548C\u903B\u8F91\u94FE\u6761\uFF0C\u9002\u5408\u5B66\u672F\u573A\u5408\u3002\u6CE8\u91CD\u7CBE\u786E\u6027\u548C\u5B8C\u6574\u6027\u3002",
    "fun-animation": "\u7528\u8F7B\u677E\u5E7D\u9ED8\u7684\u65B9\u5F0F\uFF0C\u52A0\u5165\u751F\u6D3B\u5316\u7C7B\u6BD4\u548C\u8DA3\u5473\u5143\u7D20\uFF0C\u5438\u5F15\u773C\u7403\u3002\u53EF\u4EE5\u7528\u641E\u7B11\u7684\u6BD4\u55BB\u3002",
    "minimal-tech": "\u7528\u7B80\u6D01\u7CBE\u51C6\u7684\u8868\u8FBE\uFF0C\u6781\u7B80\u53D9\u4E8B\u98CE\u683C\uFF0C\u79D1\u6280\u611F\u5F3A\u3002\u5C11\u5373\u662F\u591A\uFF0C\u4FE1\u606F\u5BC6\u5EA6\u9AD8\u3002",
    storytelling: "\u7528\u8BB2\u6545\u4E8B\u7684\u65B9\u5F0F\uFF0C\u6709\u8D77\u627F\u8F6C\u5408\uFF0C\u4ECE\u751F\u6D3B\u573A\u666F\u5207\u5165\u77E5\u8BC6\u6982\u5FF5\u3002\u50CF\u7EAA\u5F55\u7247\u4E00\u6837\u5A13\u5A13\u9053\u6765\u3002"
  };
  const systemPrompt = `\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684 Manim Studio \u52A8\u753B\u914D\u7F6E\u4E13\u5BB6\u3002\u7528\u6237\u4F1A\u7ED9\u4F60\u4E00\u4E2A\u77E5\u8BC6\u70B9\u63CF\u8FF0\uFF0C\u4F60\u9700\u8981\u751F\u6210\u5B8C\u6574\u7684\u3001\u53EF\u76F4\u63A5\u6E32\u67D3\u7684 Manim Studio YAML \u914D\u7F6E\u3002

Manim Studio YAML \u683C\u5F0F\u8BF4\u660E\uFF1A
- scene: \u573A\u666F\u914D\u7F6E\u6839\u8282\u70B9
  - name: \u573A\u666F\u540D\u79F0\uFF08\u82F1\u6587\uFF0C\u5982 "KnowledgeAnimation"\uFF09
  - description: \u573A\u666F\u63CF\u8FF0
  - duration: \u603B\u65F6\u957F\uFF08\u79D2\uFF09
  - fps: \u5E27\u7387\uFF08\u9ED8\u8BA460\uFF09
  - resolution: \u5206\u8FA8\u7387\u6570\u7EC4\uFF0C\u5982 [1920, 1080]
  - background_color: \u80CC\u666F\u8272\uFF08\u5982 "#000000"\uFF09
  - objects: \u5BF9\u8C61\u6570\u7EC4
    - name: \u5BF9\u8C61\u552F\u4E00\u6807\u8BC6
    - type: \u5BF9\u8C61\u7C7B\u578B\uFF08text/shape/group\uFF09
    - params: \u5BF9\u8C61\u53C2\u6570
      - \u5BF9\u4E8E text: text\uFF08\u6587\u5B57\u5185\u5BB9\uFF09, font_size, color, gradient
      - \u5BF9\u4E8E shape: shape_type\uFF08circle/square/rectangle/polygon\uFF09, radius, side_length, color, fill_opacity, stroke_width
    - position: \u4F4D\u7F6E\u6570\u7EC4 [x, y, z]
  - animations: \u52A8\u753B\u6570\u7EC4
    - target: \u76EE\u6807\u5BF9\u8C61\u540D\u79F0
    - type: \u52A8\u753B\u7C7B\u578B\uFF08write/create/fadein/fadeout/move/scale/rotate/transform\uFF09
    - start_time: \u5F00\u59CB\u65F6\u95F4\uFF08\u79D2\uFF09
    - duration: \u52A8\u753B\u65F6\u957F\uFF08\u79D2\uFF09
    - params: \u52A8\u753B\u53C2\u6570\uFF08\u53EF\u9009\uFF09
      - \u5BF9\u4E8E move: to\uFF08\u76EE\u6807\u4F4D\u7F6E\uFF09
      - \u5BF9\u4E8E scale: factor\uFF08\u7F29\u653E\u56E0\u5B50\uFF09
      - \u5BF9\u4E8E rotate: angle\uFF08\u89D2\u5EA6\uFF0C\u5EA6\u6570\uFF09

\u89E3\u8BF4\u98CE\u683C\u8981\u6C42\uFF1A${stylePrompts[narration_style] || stylePrompts.classroom}
\u89C6\u89C9\u98CE\u683C\uFF1A\u4E3B\u8272 ${visual_style?.primary || "#007aff"}\uFF0C\u8F85\u8272 ${visual_style?.secondary || "#5856d6"}
\u76EE\u6807\u65F6\u957F\uFF1A${duration || 30} \u79D2
\u5E27\u7387\uFF1A${fps || 60} FPS

\u8981\u6C42\uFF1A
1. \u751F\u6210\u5B8C\u6574\u7684 Manim Studio YAML \u914D\u7F6E
2. \u5FC5\u987B\u5305\u542B scene \u6839\u8282\u70B9\uFF0C\u5185\u90E8\u5305\u542B name\u3001duration\u3001objects\u3001animations
3. \u52A8\u753B\u8981\u6709\u8282\u594F\u611F\uFF1A\u6807\u9898\u5C55\u793A \u2192 \u6838\u5FC3\u6982\u5FF5\u8BB2\u89E3 \u2192 \u53EF\u89C6\u5316\u6F14\u793A \u2192 \u603B\u7ED3
4. \u6240\u6709\u6587\u5B57\u4F7F\u7528 text \u7C7B\u578B\u5BF9\u8C61\uFF0Cfont_size \u5EFA\u8BAE 36-48
5. \u6570\u5B66\u516C\u5F0F\u7528\u7EAF\u6587\u672C\u65B9\u5F0F\u5448\u73B0\uFF08\u5982 "a\xB2 - b\xB2 = (a+b)(a-b)"\uFF09
6. \u53EA\u8F93\u51FA YAML \u914D\u7F6E\uFF0C\u4E0D\u8981\u4EFB\u4F55\u5176\u4ED6\u89E3\u91CA\u6587\u5B57
7. \u786E\u4FDD\u6BCF\u4E2A\u52A8\u753B\u7684 target \u90FD\u80FD\u5728 objects \u4E2D\u627E\u5230\u5BF9\u5E94\u5BF9\u8C61
8. \u52A8\u753B\u65F6\u95F4\u8981\u5408\u7406\u5B89\u6392\uFF0C\u907F\u514D\u91CD\u53E0\u51B2\u7A81

\u793A\u4F8B\u683C\u5F0F\uFF1A
scene:
  name: "ExampleScene"
  description: "\u793A\u4F8B\u573A\u666F"
  duration: 30
  fps: 60
  resolution: [1920, 1080]
  background_color: "#000000"
  objects:
    - name: "title"
      type: "text"
      params:
        text: "\u6807\u9898"
        font_size: 48
        color: "#007aff"
      position: [0, 2, 0]
  animations:
    - target: "title"
      type: "write"
      start_time: 0
      duration: 2`;
  const userPrompt = `\u8BF7\u4E3A\u4EE5\u4E0B\u77E5\u8BC6\u70B9\u751F\u6210 Manim \u52A8\u753B\u811A\u672C\uFF1A

${description}`;
  const modelConfig = getModelConfig(env);
  const apiKey = modelConfig.getKey(env);
  if (!apiKey) {
    return jsonResponse({ error: "\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5" }, 503);
  }
  const aiResponse = await callAI(modelConfig, apiKey, systemPrompt, userPrompt);
  if (!aiResponse.success) {
    return jsonResponse({ error: "\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8F93\u5165\u5185\u5BB9\u6216\u7A0D\u540E\u518D\u8BD5" }, 502);
  }
  userData.usedThisMonth += 1;
  userData.lastGenerateAt = (/* @__PURE__ */ new Date()).toISOString();
  await env.USAGE_KV.put(userKey, JSON.stringify(userData), { expirationTtl: 90 * 24 * 3600 });
  await env.USAGE_KV.put(`log:${user_id}:${Date.now()}`, JSON.stringify({
    user_id,
    description: description.slice(0, 100),
    narration_style,
    plan: userData.plan,
    model: modelConfig.name,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }), { expirationTtl: 30 * 24 * 3600 });
  return jsonResponse({
    success: true,
    script: aiResponse.script,
    scenes: aiResponse.scenes,
    model: modelConfig.name,
    usage: {
      plan: userData.plan,
      used: userData.usedThisMonth,
      max: plan.maxPerMonth
    }
  });
}
__name(handleGenerate, "handleGenerate");
async function callAI(modelConfig, apiKey, systemPrompt, userPrompt) {
  const endpoint = modelConfig.endpoint;
  const reqBody = modelConfig.buildBody(systemPrompt, userPrompt);
  let fetchUrl = endpoint;
  const headers = { "Content-Type": "application/json" };
  if (modelConfig.model === "gemini") {
    fetchUrl += `?key=${apiKey}`;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  const response = await fetch(fetchUrl, {
    method: "POST",
    headers,
    body: reqBody
  });
  if (!response.ok) {
    const err = await response.text();
    return { success: false, error: `${modelConfig.name} API error: ${response.status} - ${err}` };
  }
  const data = await response.json();
  const text = modelConfig.parseResponse(data);
  const yamlMatch = text.match(/```(?:yaml)?\s*\n([\s\S]*?)```/);
  let yamlConfig = yamlMatch ? yamlMatch[1].trim() : text.trim();
  if (!yamlConfig.includes("scene:")) {
    const sceneMatch = text.match(/scene:\s*\n((?:[\s\S]*?)(?=\n\w+:|\n\n\n|$))/);
    if (sceneMatch) {
      yamlConfig = "scene:\n" + sceneMatch[1].trim();
    }
  }
  yamlConfig = yamlConfig.replace(/^```\w*\n/, "").replace(/```$/, "").trim();
  if (!yamlConfig.includes("scene:") || !yamlConfig.includes("objects:") || !yamlConfig.includes("animations:")) {
    return {
      success: false,
      error: "\u751F\u6210\u7684\u914D\u7F6E\u7F3A\u5C11\u5FC5\u8981\u5B57\u6BB5\uFF08scene/objects/animations\uFF09",
      raw: yamlConfig
    };
  }
  const scenes = [];
  try {
    const titleMatch = yamlConfig.match(/-\s*name:\s*["'](.+?)["']\s*\n\s*type:\s*["']text["']\s*\n\s*params:\s*\n\s*text:\s*["'](.+?)["']/);
    if (titleMatch) {
      scenes.push({ index: 1, title: titleMatch[2] });
    }
  } catch (e) {
  }
  return { success: true, script: yamlConfig, scenes };
}
__name(callAI, "callAI");
async function handleGetUsage(request, env) {
  const userId = new URL(request.url).searchParams.get("user_id");
  if (!userId)
    return jsonResponse({ error: "\u7F3A\u5C11 user_id" }, 400);
  const userData = await env.USAGE_KV.get(`user:${userId}`, "json") || {
    plan: "free",
    usedThisMonth: 0,
    monthKey: getMonthKey()
  };
  if (userData.monthKey !== getMonthKey()) {
    userData.usedThisMonth = 0;
    userData.monthKey = getMonthKey();
  }
  const plan = SUBSCRIPTION_PLANS[userData.plan] || SUBSCRIPTION_PLANS.free;
  return jsonResponse({
    plan: userData.plan,
    planName: plan.name,
    usedThisMonth: userData.usedThisMonth,
    maxPerMonth: plan.maxPerMonth,
    remaining: plan.maxPerMonth === -1 ? -1 : plan.maxPerMonth - userData.usedThisMonth,
    resetDate: getMonthEnd()
  });
}
__name(handleGetUsage, "handleGetUsage");
async function handleGetSubscription(request, env) {
  const userId = new URL(request.url).searchParams.get("user_id");
  if (!userId)
    return jsonResponse({ error: "\u7F3A\u5C11 user_id" }, 400);
  const userData = await env.USAGE_KV.get(`user:${userId}`, "json") || { plan: "free" };
  const plan = SUBSCRIPTION_PLANS[userData.plan] || SUBSCRIPTION_PLANS.free;
  return jsonResponse({
    currentPlan: userData.plan,
    planName: plan.name,
    price: plan.price,
    plans: SUBSCRIPTION_PLANS,
    currentModel: getModelName(env)
  });
}
__name(handleGetSubscription, "handleGetSubscription");
function getMonthKey() {
  const d = /* @__PURE__ */ new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
__name(getMonthKey, "getMonthKey");
function getMonthEnd() {
  return new Date((/* @__PURE__ */ new Date()).getFullYear(), (/* @__PURE__ */ new Date()).getMonth() + 1, 0).toISOString().split("T")[0];
}
__name(getMonthEnd, "getMonthEnd");
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(corsHeaders, "corsHeaders");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}
__name(jsonResponse, "jsonResponse");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-KkkJIb/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-KkkJIb/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
