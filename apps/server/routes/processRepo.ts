import express from "express";
import { redisUrl } from "@repo/redis/client";
import { Queue } from "bullmq";
import { authMiddleware } from "../middleware/middleware";
import { prisma } from "@repo/db/prisma";

const router = express.Router();
const queue = new Queue("processRepo", { connection: { url: redisUrl } });

router.post("/create", authMiddleware, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { username } = req.user;
    const user = await prisma.user.findUnique({ where: { username } });

    const { repoUrl, prompt } = req.body;
    console.log(repoUrl, prompt);

    const installationId = user?.installationId;
    const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const job = await queue.add(
      "processRepo",
      { repoUrl, prompt, installationId, jobId },
      { jobId }
    );

    res.json({
      message: "Job successfully queued",
      jobId,
    });
  } catch (error) {
    console.error("Error processing repo:", error);
    res.status(500).json({ message: "Server error while queuing job" });
  }
});

export default router;
