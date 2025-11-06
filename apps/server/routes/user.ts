import express from "express";
import { prisma } from "@repo/db/prisma";
import jwt from "jsonwebtoken";
import { getUserFromInstallation } from "@repo/github/github";
import { authMiddleware } from "../middleware/middleware";
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET!;

router.post("/create", async (req, res) => {
  const { installationId } = req.body;

  try {
    const userFromGitHub = await getUserFromInstallation(installationId);
    const username = userFromGitHub.name;
    const avatarUrl = userFromGitHub.avatarUrl;

    const user = await prisma.user.upsert({
      where: { username },
      update: { installationId, avatarUrl },
      create: { username, installationId, avatarUrl },
    });

    const token = jwt.sign(
      { username: user.username, id: user.id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({ user, token });
  } catch (error) {
    console.error("Prisma error:", error);
    res.status(500).json({
      message: "error creating the user",
      error,
    });
  }
});

router.get("/get/user", authMiddleware, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { username } = req.user;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Cannot get the user" });
  }
});

export default router;
