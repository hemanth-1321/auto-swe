import express from "express";
import crypto from "crypto";
import { queue } from "@repo/redis/client";

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "hemanth";

function verifySignature(payload: Buffer, signature: string): boolean {
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

const router = express.Router();

router.post("/github", async (req, res) => {
  const signature = req.header("X-Hub-Signature-256") || "";
  const event = req.header("X-GitHub-Event") || "";
  const body = req.body;
  const rawBody = (req as any).rawBody as Buffer;

  if (!verifySignature(rawBody, signature)) {
    return res.status(403).json({
      error: "invalid signature ",
    });
  }
  const repoName = body?.repository?.full_name || "unknown-repo";
  const repoUrl = body?.repository?.html_url || "unknown-url";

  console.log(`[Webhook] Event: ${event} | Repo: ${repoName} (${repoUrl})`);

  if (event === "push" && body?.ref) {
    const ref = body.ref.replace("refs/heads/", "");
    if (ref === "main" || ref === "master") {
      //todo put the diff to a queue
      console.log(
        `[Webhook] Changes detected on branch: ${ref} in ${repoName}`
      );
      await queue.add("index_repo", {
        repo: repoName,
        branch: ref,
        url: repoUrl,
      });
      return res.json({ status: "branch_updated", branch: ref });
    }
  }

  res.json({ status: "ignored" });
});

export default router;
