import express from "express";
import { redisUrl } from "@repo/redis/client";
import { Queue } from "bullmq";
const router = express.Router();
const queue = new Queue("processRepo", { connection: { url: redisUrl } });

router.post("/create", async (req, res) => {
  try {
    const { repoUrl, prompt, installationId } = req.body;

    const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const job = await queue.add(
      "processRepo",
      { repoUrl, prompt, installationId, jobId },
      { jobId }
    );

    res.json({
      Job: job,
      jobId,
    });
  } catch (error) {
    console.error("error ", error);
  }
});

export default router;
