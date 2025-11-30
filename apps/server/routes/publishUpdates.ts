import express from "express";
import  type { Request, Response } from "express"
import { subscriber } from "@repo/redis/client";

const router = express.Router();


type JobId = string;

interface SSEClients {
  [jobId: string]: Set<Response>;
}

interface RedisMessageEvent {
  channel: string;
  message: string;
}

const clients: SSEClients = {};

subscriber.on("message", (channel: string, message: string) => {
  const parts = channel.split(":"); 
  const jobId: JobId = parts[1]!;

  if (!jobId) return;

  const payload = `data: ${message}\n\n`;

  const jobClients = clients[jobId];
  if (jobClients) {
    jobClients.forEach((client) => client.write(payload));
  }

  console.log(`[SSE] ${channel} -> ${message}`);
});

router.get(
  "/updates/:jobId",
  async (req: Request<{ jobId: JobId }>, res: Response): Promise<void> => {
    const { jobId } = req.params;
    console.log("SSE connected jobId:", jobId);

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Track clients
    if (!clients[jobId]) clients[jobId] = new Set<Response>();
    clients[jobId].add(res);

    // Subscribe once per jobId
    if (clients[jobId].size === 1) {
      await subscriber.subscribe(`job:${jobId}:updates`);
      console.log(`[SSE] Subscribed to job:${jobId}:updates`);
    }

    // Keep-alive ping
    const keepAlive = setInterval(() => {
      res.write(`event: ping\ndata: keepalive\n\n`);
    }, 10000);

    // Handle disconnect
    req.on("close", async () => {
      clearInterval(keepAlive);

      const jobClients = clients[jobId];
      if (jobClients) {
        jobClients.delete(res);
        console.log(`Client disconnected jobId=${jobId}`);
      }

      // If last client disconnects, unsubscribe
      if (jobClients && jobClients.size === 0) {
        delete clients[jobId];
        await subscriber.unsubscribe(`job:${jobId}:updates`);
        console.log(`[SSE] Unsubscribed from job:${jobId}:updates`);
      }
    });
  }
);

export default router;
