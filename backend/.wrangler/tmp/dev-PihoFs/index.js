var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-nvfA6s/strip-cf-connecting-ip-header.js
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
  free: { name: "\u514D\u8D39\u7248", maxPerMonth: 3, price: 0 },
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
  const systemPrompt = `\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684 Manim\uFF08Python \u52A8\u753B\u5F15\u64CE\uFF09\u811A\u672C\u7F16\u5199\u4E13\u5BB6\u3002\u7528\u6237\u4F1A\u7ED9\u4F60\u4E00\u4E2A\u77E5\u8BC6\u70B9\u63CF\u8FF0\uFF0C\u4F60\u9700\u8981\u751F\u6210\u5B8C\u6574\u7684\u3001\u53EF\u76F4\u63A5\u8FD0\u884C\u7684 Manim Python \u811A\u672C\u3002

\u89E3\u8BF4\u98CE\u683C\u8981\u6C42\uFF1A${stylePrompts[narration_style] || stylePrompts.classroom}
\u89C6\u89C9\u98CE\u683C\uFF1A\u4E3B\u8272 ${visual_style?.primary || "#007aff"}\uFF0C\u8F85\u8272 ${visual_style?.secondary || "#5856d6"}
\u76EE\u6807\u65F6\u957F\uFF1A${duration || 30} \u79D2
\u5E27\u7387\uFF1A${fps || 60} FPS

\u8981\u6C42\uFF1A
1. \u751F\u6210\u5B8C\u6574\u7684\u53EF\u8FD0\u884C Manim Python \u811A\u672C
2. \u811A\u672C\u5FC5\u987B\u5305\u542B\u4E00\u4E2A Scene \u7C7B\uFF0C\u7C7B\u540D\u4E3A KnowledgeAnimation
3. \u5FC5\u987B\u6709 def construct(self) \u65B9\u6CD5
4. \u52A8\u753B\u8981\u6709\u8282\u594F\u611F\uFF1A\u6807\u9898\u5C55\u793A(1-2\u79D2) \u2192 \u6838\u5FC3\u6982\u5FF5\u8BB2\u89E3 \u2192 \u53EF\u89C6\u5316\u6F14\u793A \u2192 \u603B\u7ED3
5. \u6240\u6709\u6587\u5B57\u6807\u6CE8\u4F7F\u7528\u4E2D\u6587\uFF08\u7528 Text \u5BF9\u8C61\uFF0Cfont_size=36-48\uFF09
6. \u6570\u5B66\u516C\u5F0F\u4F7F\u7528 MathTex \u5BF9\u8C61
7. \u6BCF\u4E2A\u573A\u666F\u4E4B\u95F4\u7528\u6CE8\u91CA\u6807\u8BB0\uFF1A# === \u573A\u666F N\uFF1A\u573A\u666F\u6807\u9898 ===
8. \u53EA\u8F93\u51FA Python \u4EE3\u7801\uFF0C\u4E0D\u8981\u4EFB\u4F55\u5176\u4ED6\u89E3\u91CA\u6587\u5B57
9. \u4F7F\u7528 from manim import * \u5BFC\u5165\u6240\u6709\u9700\u8981\u7684\u6A21\u5757
10. \u786E\u4FDD\u4EE3\u7801\u53EF\u4EE5\u76F4\u63A5\u7528 manim render \u547D\u4EE4\u8FD0\u884C`;
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
  const codeMatch = text.match(/```(?:python)?\s*\n([\s\S]*?)```/);
  const script = codeMatch ? codeMatch[1].trim() : text.trim();
  const scenes = [];
  const sceneComments = script.matchAll(/#\s*===\s*场景\s*(\d+)[：:]\s*(.+?)(?:\n|$)/g);
  for (const match of sceneComments) {
    scenes.push({ index: parseInt(match[1]), title: match[2].trim() });
  }
  return { success: true, script, scenes };
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

// .wrangler/tmp/bundle-nvfA6s/middleware-insertion-facade.js
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

// .wrangler/tmp/bundle-nvfA6s/middleware-loader.entry.ts
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
