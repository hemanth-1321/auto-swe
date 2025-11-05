import { Queue, Worker } from "bullmq";
import { createClient } from "redis";
export const redisUrl = "redis://localhost:6379";

export const queue = new Queue("indexQueue", { connection: { url: redisUrl } });

export const publisher = createClient({
  url: redisUrl,
});
await publisher.connect();

export const publishUpdate = (jobId: string, data: any) => {
  publisher.publish(`job:${jobId}:updates`, JSON.stringify(data));
};
