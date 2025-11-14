import express from "express";
import { PassThrough } from "stream";
import { subscriber } from "@repo/redis/client";

const router = express.Router();

const clients: Record<string, PassThrough[]> = {};

router.get("/updates/:jobId", async (req, res) => {
  const { jobId } = req.params;

  // SSE required headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Create streaming channel
  const stream = new PassThrough();

  // Pipe stream into response so TCP flushes automatically
  stream.pipe(res);

  if (!clients[jobId]) clients[jobId] = [];
  clients[jobId].push(stream);

  // Heartbeat to keep connection alive
  const keepAlive = setInterval(() => {
    stream.write(`event: ping\ndata: keepalive\n\n`);
  }, 15000);

  if (clients[jobId].length === 1) {
    await subscriber.subscribe(`job:${jobId}:updates`, (msg) => {
      const payload = `data: ${msg}\n\n`;
      console.log(`[SSE] job:${jobId} => ${msg}`);

      // Broadcast to all streams
      clients[jobId]!.forEach((clientStream) => clientStream.write(payload));
    });
  }

  req.on("close", async () => {
    clearInterval(keepAlive);

    // Remove dead stream
    clients[jobId] = clients[jobId]!.filter((s) => s !== stream);
    stream.end();

    if (clients[jobId].length === 0) {
      await subscriber.unsubscribe(`job:${jobId}:updates`);
      delete clients[jobId];
      console.log(`[SSE] Unsubscribed from job:${jobId}`);
    }
  });
});

export default router;
