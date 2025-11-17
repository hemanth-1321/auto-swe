import { Queue } from "bullmq";
import { createClient } from "redis";

export const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const connection = {
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries: number) => {
      const delay = Math.min(1000 + retries * 50, 5000);
      console.log(`🔄 Redis reconnect attempt: ${retries}, delay: ${delay}ms`);
      return delay;
    },
  },
};

async function createSafeClient(): Promise<ReturnType<typeof createClient>> {
  const client = createClient(connection);

  client.on("error", (err) => {
    console.error("❌ Redis Client Error:", err.message);
  });

  client.on("end", () => {
    console.warn("⚠️ Redis connection ended. Will auto reconnect…");
  });

  client.on("reconnecting", () => {
    console.log("🔄 Redis client reconnecting…");
  });

  try {
    await client.connect();
    console.log("✅ Redis connected");
  } catch (err) {
    console.error("❌ Initial Redis connection failed:", err);
  }

  return client;
}

// Init clients
export const publisher = await createSafeClient();
export const subscriber = await createSafeClient();

// Safe publish wrapper
export const publishUpdate = async (jobId: string, data: any) => {
  try {
    await publisher.publish(`job:${jobId}:updates`, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to publish update:", err);
  }
};

// BullMQ queues (BullMQ internally handles reconnect)
export const indexQueue = new Queue("indexQueue", { connection });
export const processRepoQueue = new Queue("processRepo", { connection });
