import { Worker } from "bullmq";
import { redisUrl } from "@repo/redis/client";
import { indexRepo } from "./controllers/indexRepo";
import { processRepo } from "./controllers/processRepo";

const connection = { url: redisUrl };

const workerIndex = new Worker(
  "indexQueue",
  async (job) => {
    console.log("Indexing job received:", job.data);
    await indexRepo(job.data.url);
    return { success: true, processedAt: new Date().toISOString() };
  },
  {
    connection,
    stalledInterval: 30000,
  }
);

workerIndex.on("completed", (job) => {
  console.log(`Index job ${job.id} completed`);
});
workerIndex.on("failed", (job, err) => {
  console.error(`Index job ${job?.id} failed:`, err);
});

const workerProcessRepo = new Worker(
  "processRepo",
  async (job) => {
    console.log("Process repo job received:", job.data);

    const { repoUrl, prompt, installationId, jobId } = job.data;
    if (!repoUrl || !prompt || !installationId || !jobId) {
      throw new Error("Missing required job data fields");
    }

    await processRepo(repoUrl, prompt, installationId, jobId);
    return { success: true, jobId, processedAt: new Date().toISOString() };
  },
  {
    connection,
    stalledInterval: 30000,
  }
);

workerProcessRepo.on("completed", (job) => {
  console.log(`processRepo job ${job.id} completed`);
});
workerProcessRepo.on("failed", (job, err) => {
  console.error(`processRepo job ${job?.id} failed:`, err);
});
