import express from "express";
import { createClient } from "redis";
import { redisUrl } from "@repo/redis/client";

const router = express.Router();

const redis = createClient({
  url: redisUrl,
});
await redis.connect();

router.get("/updates/:jobId", async (req, res) => {
  const { jobId } = req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const interval = setInterval(() => {
    res.write("event: ping\n");
    res.write("data: keepalive\n\n");
  });

  const sub = redis.duplicate();
  await sub.connect();

  await sub.subscribe(`job:${jobId}:updates`, (message) => {
    res.write(`data: ${message}\n\n`);
  });

  // Handle client disconnect
  req.on("close", async () => {
    console.log(`SSE connection closed for job ${jobId}`);
    await sub.unsubscribe(`job:${jobId}:updates`);
    await sub.quit();
  });
});

export default router;
