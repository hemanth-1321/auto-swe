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

  // Set up Server-Sent Events headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
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
