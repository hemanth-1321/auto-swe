import express from "express";
import { authMiddleware } from "../middleware/middleware";
import { prisma } from "@repo/db/prisma";
import { get_repos, get_repo_by_name } from "@repo/github/github";
const router = express.Router();

router.get("/repos", authMiddleware, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const { username } = req.user;
    const user = await prisma.user.findUnique({
      where: {
        username,
      },
    });
    const repos = await get_repos(user?.installationId!);
    const payload = {
      repository_full_names: repos?.repositories?.map((r) => r.full_name) ?? [],
    };
    console.log(payload);
    res.status(200).json({
      payload,
    });
  } catch (error) {
    console.log("error fetching repos", error);
    res.status(500).json({
      message: "error fetching repos",
    });
  }
});

router.post("/getrepo", authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { username } = req.user;
    const { owner, repo } = req.body;

    if (!owner || !repo) {
      return res.status(400).json({ message: "owner and repo are required" });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { installationId: true },
    });

    if (!user?.installationId) {
      return res
        .status(404)
        .json({ message: "Installation ID not found for user" });
    }

    const repoData = await get_repo_by_name(user.installationId, owner, repo);
    const response = {
      id: repoData.id,
      name: repoData.name,
      fullName: repoData.full_name,
    };
    return res.json(response);
  } catch (error: any) {
    console.error("Error in /getrepo:", error?.response?.data || error.message);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
});

export default router;
