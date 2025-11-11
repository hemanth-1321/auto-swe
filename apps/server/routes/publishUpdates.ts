import express from "express";
import { subscriber } from "@repo/redis/client";

const router = express.Router();

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

  await subscriber.subscribe(`job:${jobId}:updates`, (message) => {
    res.write(`data: ${message}\n\n`);
  });

  // Handle client disconnect
  req.on("close", async () => {
    console.log(`SSE connection closed for job ${jobId}`);
    await subscriber.unsubscribe(`job:${jobId}:updates`);
    await subscriber.quit();
  });
});

export default router;
