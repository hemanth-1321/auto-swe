import express from "express";
import { createClient } from "redis";
import { redisUrl } from "@repo/redis/client";
const router = express.Router();

const redis = createClient({
  url: redisUrl,
});
await redis.connect();

router.post("/updates/:jobId", async (req, res) => {
  const { jobId } = req.params;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  console.log(`Received update for job ${jobId}`);
  const sub = redis.duplicate();
  await sub.connect();
  await sub.subscribe(`job:${jobId}:updates`, (message) => {
    console.log("job", message);
    res.write(`data: ${message}\n\n`);
  });

  req.on("close", async () => {
    await sub.unsubscribe(`job:${jobId}:updates`);
    await sub.quit();
  });
  res.status(200).json({ message: `Update received for job ${jobId}` });
});

export default router;
