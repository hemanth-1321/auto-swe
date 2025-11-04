import "dotenv/config";
import { Worker } from "bullmq";
import { indexRepo } from "./controllers/indexRepo";

const redisUrl = "redis://localhost:6379";

const processor = async (job: any) => {
  console.log(" Received job:", job.data);
  await indexRepo(job.data.url);
  return {
    success: true,
    processedAt: new Date().toISOString(),
  };
};

const worker = new Worker("indexQueue", processor, {
  connection: { url: redisUrl },
});

worker.on("completed", (job) => {
  console.log(` Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
