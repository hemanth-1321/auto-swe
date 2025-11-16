import express from "express";
import { subscriber } from "@repo/redis/client";

const router = express.Router();

// Track SSE clients per jobId
const clients: Record<string, Set<express.Response>> = {};

// SSE endpoint
router.get("/updates/:jobId", async (req, res) => {
  const { jobId } = req.params;

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Add this response to clients
  if (!clients[jobId]) clients[jobId] = new Set();
  clients[jobId].add(res);

  // Keepalive ping every 10 seconds
  const keepAlive = setInterval(() => {
    res.write("event: ping\n");
    res.write("data: keepalive\n\n");
  }, 10000);

  // Subscribe only once per jobId
  if (clients[jobId].size === 1) {
    await subscriber.subscribe(`job:${jobId}:updates`, (message) => {
      const data = `data: ${message}\n\n`;
      // Send message to all connected clients for this job
      clients[jobId]!.forEach((client) => client.write(data));
      console.log(`[SSE] job:${jobId} -> ${message}`);
    });
  }

  // Cleanup when client disconnects
  req.on("close", async () => {
    clearInterval(keepAlive);
    clients[jobId]!.delete(res);

    if (clients[jobId]!.size === 0) {
      delete clients[jobId];
      await subscriber.unsubscribe(`job:${jobId}:updates`);
      console.log(`[SSE] Unsubscribed from job:${jobId}`);
    }
  });
});

export default router;
