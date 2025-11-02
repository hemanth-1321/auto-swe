import express, { raw } from "express";
import crypto, { sign } from "crypto";

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
  console.log("rawbody", rawBody);

  if (!verifySignature(rawBody, signature)) {
    return res.status(403).json({
      error: "invalid signature ",
    });
  }

  if (event === "push" && body?.ref) {
    const ref = body.ref.replace("refs/heads/", "");
    if (ref === "main" || ref === "master") {
      //todo put the diff to a queue
      console.log(`[Webhook] Changes detected on branch: ${ref}`);
      return res.json({ status: "branch_updated", branch: ref });
    }
  }

  res.json({ status: "ignored" });
});

export default router;
