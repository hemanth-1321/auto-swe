import { Queue } from "bullmq";
import { createClient } from "redis";

export const redisUrl = process.env.REDIS_URL!;
const isTLS = redisUrl.startsWith("rediss://");

export const connection: any = {
  url: redisUrl,
  socket: isTLS
    ? {
        tls: true,
        reconnectStrategy: (retries: number) => Math.min(retries * 200, 2000),
      }
    : {
        reconnectStrategy: (retries: number) => Math.min(retries * 200, 2000),
      },
};

export const publisher = createClient(connection);
export const subscriber = createClient(connection);

const log = (prefix: string) => (msg: string) =>
  console.log(`[Redis ${prefix}] ${msg}`);

[publisher, subscriber].forEach((client, i) => {
  const name = i === 0 ? "Publisher" : "Subscriber";
  client.on("connect", log(`${name} connected`));
  client.on("ready", log(`${name} ready`));
  client.on("reconnecting", log(`${name} reconnecting`));
  client.on("end", log(`${name} closed`));
  client.on("error", (err) => console.error(`⚠️ ${name} error:`, err.message));
});

await publisher.connect();
await subscriber.connect();

export const publishUpdate = (jobId: string, data: any) => {
  publisher.publish(`job:${jobId}:updates`, JSON.stringify(data));
};

// ---- Queues ----
export const indexQueue = new Queue("indexQueue", { connection });
export const processRepoQueue = new Queue("processRepo", { connection });
