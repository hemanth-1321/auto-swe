import { Queue, Worker } from "bullmq";
import { createClient } from "redis";
const redisUrl = "redis://localhost:6379";

export const queue = new Queue("indexQueue", { connection: { url: redisUrl } });

export const publisher = createClient({
  url: redisUrl,
});
await publisher.connect();
