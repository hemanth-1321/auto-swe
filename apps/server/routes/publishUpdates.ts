import express from "express";
import { createClient } from "redis";
import { redisUrl } from "@repo/redis/client";

const router = express.Router();

// Main Redis client for publishing (optional, if you need to publish from server)
const redis = createClient({ url: redisUrl });
redis.on("error", (err) => console.error("Redis Client Error:", err));

await redis.connect();

router.get("/updates/:jobId", async (req, res) => {
  const { jobId } = req.params;

  // Set SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.flushHeaders?.(); // flush headers immediately

  // Create a duplicate client for Pub/Sub
  const sub = redis.duplicate();
  sub.on("error", (err) => console.error("Redis Subscriber Error:", err));
  await sub.connect();

  // Heartbeat to keep connection alive (every 20s)
  const heartbeat = setInterval(() => {
    res.write(":\n\n"); // Comment line, SSE ping
  }, 20000);

  // Subscribe to job updates
  await sub.subscribe(`job:${jobId}:updates`, (message) => {
    try {
      res.write(`data: ${message}\n\n`);
    } catch (err) {
      console.error("SSE Write Error:", err);
    }
  });

  console.log(`SSE connection opened for job ${jobId}`);

  // Handle client disconnect
  req.on("close", async () => {
    clearInterval(heartbeat);
    console.log(`SSE connection closed for job ${jobId}`);
    try {
      await sub.unsubscribe(`job:${jobId}:updates`);
      await sub.quit();
    } catch (err) {
      console.error("Error closing Redis subscriber:", err);
    }
  });
});

export default router;
