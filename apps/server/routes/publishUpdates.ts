import express from "express";
import { subscriber } from "@repo/redis/client";

const router = express.Router();

// Track active job subscriptions to avoid multiple subscribes
const activeJobs: Set<string> = new Set();

router.get("/updates/:jobId", async (req, res) => {
  const { jobId } = req.params;

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Keepalive ping
  const keepAlive = setInterval(() => {
    res.write("event: ping\n");
    res.write("data: keepalive\n\n");
  }, 10000);

  // Subscribe only if not already active
  if (!activeJobs.has(jobId)) {
    activeJobs.add(jobId);

    await subscriber.subscribe(`job:${jobId}:updates`, (message) => {
      res.write(`data: ${message}\n\n`);
      console.log(`[SSE] job:${jobId} -> ${message}`);
    });
  }

  // Handle client disconnect
  req.on("close", async () => {
    console.log(`[SSE] Connection closed for job ${jobId}`);
    clearInterval(keepAlive);
    await subscriber.unsubscribe(`job:${jobId}:updates`);
    activeJobs.delete(jobId);
  });
});

export default router;
