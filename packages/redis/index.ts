import { Queue } from "bullmq";
import { createClient } from "redis";

export const redisUrl = process.env.REDIS_URL!;
const useTLS = redisUrl.startsWith("rediss://");

export const connection = {
  url: redisUrl,
  socket: useTLS
    ? {
        tls: true,
        rejectUnauthorized: false,
        reconnectStrategy: (retries: number) => Math.min(retries * 200, 2000),
      }
    : {
        reconnectStrategy: (retries: number) => Math.min(retries * 200, 2000),
      },
};

export const publisher = createClient({ url: redisUrl });

publisher.on("connect", () => console.log("Redis connected"));
publisher.on("ready", () => console.log(" Redis ready for commands"));
publisher.on("reconnecting", () => console.log("Redis reconnecting..."));
publisher.on("end", () => console.log(" Redis connection closed"));
publisher.on("error", (err) => console.error(" Redis error:", err));

await publisher.connect();

export const publishUpdate = (jobId: string, data: any) => {
  publisher.publish(`job:${jobId}:updates`, JSON.stringify(data));
};

export const indexQueue = new Queue("indexQueue", { connection });
export const processRepoQueue = new Queue("processRepo", { connection });
