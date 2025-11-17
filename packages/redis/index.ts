import { Queue } from "bullmq";
import { createClient } from "redis";

export const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const connection = {
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries: number) => Math.min(retries * 200, 2000),
  },
};

export const publisher = createClient(connection);
export const subscriber = createClient(connection);

await publisher.connect();
await subscriber.connect();

export const publishUpdate = (jobId: string, data: any) => {
  publisher.publish(`job:${jobId}:updates`, JSON.stringify(data));
};

export const indexQueue = new Queue("indexQueue", { connection });
export const processRepoQueue = new Queue("processRepo", { connection });
