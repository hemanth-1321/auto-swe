// --- Express Route (SSE without terminal logs, only status updates) ---
import express from "express";
import { QueueEvents } from "bullmq";
import { processRepoQueue, connection } from "@repo/redis/client";

const router = express.Router();

router.get("/updates/:jobId", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const jobId = req.params.jobId;
  const queueEvents = new QueueEvents("processRepo", { connection });
  await queueEvents.waitUntilReady();

  const send = (event: any, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Keepalive
  const interval = setInterval(() => {
    send("ping", { alive: true });
  }, 15000);

  // Send initial state
  try {
    const job = await processRepoQueue.getJob(jobId);
    if (!job) {
      send("status", { status: "not_found" });
      clearInterval(interval);
      return res.end();
    }

    const state = await job.getState();
    send("status", { status: state });

    if (state === "completed") {
      send("status", { status: "completed", result: job.returnvalue });
      clearInterval(interval);
      return res.end();
    }

    if (state === "failed") {
      send("status", { status: "failed", reason: job.failedReason });
      clearInterval(interval);
      return res.end();
    }
  } catch (err: any) {
    send("status", { status: "error", error: err.message });
    clearInterval(interval);
    return res.end();
  }

  const onCompleted = async ({ jobId: doneId }: any) => {
    if (String(doneId) !== String(jobId)) return;
    const job = await processRepoQueue.getJob(jobId);
    send("status", { status: "completed", result: job?.returnvalue });
    cleanup();
  };

  const onFailed = ({ jobId: failId, failedReason }: any) => {
    if (String(failId) !== String(jobId)) return;
    send("status", { status: "failed", reason: failedReason });
    cleanup();
  };

  const cleanup = () => {
    clearInterval(interval);
    queueEvents.off("completed", onCompleted);
    queueEvents.off("failed", onFailed);
    res.end();
  };

  queueEvents.on("completed", onCompleted);
  queueEvents.on("failed", onFailed);

  req.on("close", cleanup);
});

export default router;
