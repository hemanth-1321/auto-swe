import IORedis from "ioredis";
import { Queue } from "bullmq";

export const redisUrl = process.env.REDIS_URL!;
export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  reconnectOnError: () => true,
});

connection.on("connect", () => console.log(" Redis connected"));
connection.on("reconnecting", () => console.log(" Redis reconnecting…"));
connection.on("error", (err) => console.error(" Redis Error:", err.message));

export const publisher = new IORedis(redisUrl);
export const subscriber = new IORedis(redisUrl);

publisher.on("error", (err) => console.error(" Publisher error:", err));
subscriber.on("error", (err) => console.error("Subscriber error:", err));

export const publishUpdate = async (jobId: string, data: any) => {
  try {
    await publisher.publish(`job:${jobId}:updates`, JSON.stringify(data));
    console.log(`job:${jobId}:updates ${JSON.stringify(data)}`)
  } catch (err) {
    console.error("Failed to publish update:", err);
  }
};

export const indexQueue = new Queue("indexQueue", {
  connection,
});

export const processRepoQueue = new Queue("processRepo", {
  connection,
});
