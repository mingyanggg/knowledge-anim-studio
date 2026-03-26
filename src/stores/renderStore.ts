import { defineStore } from "pinia";
import { ref, computed } from "vue";

interface RenderJob {
  id: string;
  script: string;
  status: "pending" | "rendering" | "completed" | "failed";
  progress: number;
  outputUrl?: string;
  error?: string;
  startTime: number;
  endTime?: number;
}

export const useRenderStore = defineStore("render", () => {
  const currentJob = ref<RenderJob | null>(null);
  const jobs = ref<RenderJob[]>([]);
  const isRendering = computed(() => currentJob.value?.status === "rendering");

  const startRender = async (script: string) => {
    const jobId = `job-${Date.now()}`;

    const job: RenderJob = {
      id: jobId,
      script,
      status: "pending",
      progress: 0,
      startTime: Date.now(),
    };

    currentJob.value = job;
    jobs.value.push(job);

    // Simulate rendering process
    job.status = "rendering";

    const totalSteps = 100;
    for (let i = 0; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      job.progress = i;

      if (i === totalSteps) {
        job.status = "completed";
        job.endTime = Date.now();
        job.outputUrl = `file://output/${jobId}.mp4`;
      }
    }

    return job;
  };

  const cancelRender = () => {
    if (currentJob.value && currentJob.value.status === "rendering") {
      currentJob.value.status = "failed";
      currentJob.value.error = "渲染已取消";
      currentJob.value.endTime = Date.now();
    }
  };

  const clearJob = () => {
    currentJob.value = null;
  };

  const getJobById = (id: string) => {
    return jobs.value.find(job => job.id === id);
  };

  const getCompletedJobs = computed(() => {
    return jobs.value.filter(job => job.status === "completed");
  });

  return {
    currentJob,
    jobs,
    isRendering,
    startRender,
    cancelRender,
    clearJob,
    getJobById,
    getCompletedJobs,
  };
});
