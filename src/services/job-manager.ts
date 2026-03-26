/**
 * 任务状态管理器
 * 前端 mock + 后端接口预留
 * 支持 localStorage 持久化
 */

export type JobType = 'generate' | 'render' | 'export'
export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface Job {
  id: string
  type: JobType
  status: JobStatus
  progress: number       // 0-100
  message: string
  createdAt: number      // 时间戳
  updatedAt: number
  result?: unknown
  error?: string
}

const STORAGE_KEY = 'anim-jobs'

/** 生成简易 ID */
function genId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** 从 localStorage 读取任务列表 */
function loadJobs(): Job[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** 写入 localStorage */
function persistJobs(jobs: Job[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
}

// 内存缓存
let jobs: Job[] = loadJobs()

// ---------- 公开 API ----------

/** 创建任务 */
export function createJob(type: JobType, message?: string): Job {
  const job: Job = {
    id: genId(),
    type,
    status: 'pending',
    progress: 0,
    message: message ?? `等待处理…`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  jobs.unshift(job)
  persistJobs(jobs)
  return job
}

/** 获取所有任务（按创建时间倒序） */
export function getJobs(): Job[] {
  return [...jobs]
}

/** 获取单个任务 */
export function getJob(id: string): Job | undefined {
  return jobs.find(j => j.id === id)
}

/** 更新任务状态（内部用） */
export function updateJob(id: string, patch: Partial<Job>): Job | undefined {
  const job = jobs.find(j => j.id === id)
  if (!job) return undefined
  Object.assign(job, patch, { updatedAt: Date.now() })
  persistJobs(jobs)
  return job
}

/** 模拟任务进度推进（mock 用，后端就绪后替换为真实轮询） */
export function startMockProgress(
  id: string,
  options?: {
    duration?: number       // 总时长 ms，默认 5000
    steps?: string[]        // 各阶段消息
    onDone?: (job: Job) => void
    onFail?: (job: Job) => void
  }
): { cancel: () => void } {
  const duration = options?.duration ?? 5000
  const steps = options?.steps ?? ['分析中…', '生成脚本…', '渲染动画…', '完成！']
  let cancelled = false

  const stepDuration = duration / steps.length

  let stepIdx = 0
  const tick = () => {
    if (cancelled) return
    const job = getJob(id)
    if (!job || job.status === 'done' || job.status === 'failed') return

    stepIdx++
    const progress = Math.min(Math.round((stepIdx / steps.length) * 100), 100)
    const isLast = stepIdx >= steps.length

    updateJob(id, {
      status: isLast ? 'done' : 'processing',
      progress,
      message: steps[Math.min(stepIdx - 1, steps.length - 1)],
    })

    if (isLast) {
      const finished = getJob(id)
      options?.onDone?.(finished!)
    } else {
      setTimeout(tick, stepDuration + Math.random() * 500)
    }
  }

  setTimeout(tick, 300)
  return { cancel: () => { cancelled = true } }
}

/** 重试失败任务 */
export function retryJob(id: string): Job | undefined {
  const job = getJob(id)
  if (!job || job.status !== 'failed') return undefined
  return updateJob(id, {
    status: 'pending',
    progress: 0,
    message: '重新排队…',
    error: undefined,
  })
}

/** 清除已完成/失败的任务 */
export function clearFinished() {
  jobs = jobs.filter(j => j.status === 'pending' || j.status === 'processing')
  persistJobs(jobs)
}
