import { Queue, Worker } from "bullmq";
import { createClient } from "redis";
export const redisUrl = process.env.REDIS_URL!;

export const queue = new Queue("indexQueue", { connection: { url: redisUrl } });

export const publisher = createClient({
  url: redisUrl,
  socket: {
    tls: true,
    rejectUnauthorized: false,
    reconnectStrategy: (retries) => {
      console.log(`🔁 Redis reconnect attempt ${retries}`);
      return Math.min(retries * 200, 2000); // 0.2s → 2s
    },
  },
});

publisher.on("connect", () => console.log("✅ publisher connected"));
publisher.on("ready", () => console.log("🚀 publisher ready for commands"));
publisher.on("reconnecting", () => console.log("♻️ publisher reconnecting..."));
publisher.on("end", () => console.log("❌ publisher connection closed"));
publisher.on("error", (err) => console.error("⚠️ Redis error:", err));

await publisher.connect();

export const publishUpdate = (jobId: string, data: any) => {
  publisher.publish(`job:${jobId}:updates`, JSON.stringify(data));
};
