import express from "express";
import { prisma } from "@repo/db/prisma";
import { getUserFromInstallation } from "@repo/github/github";
const router = express.Router();

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

    res.cookie("githubId", username, {
      httpOnly: true,
      sameSite: "none",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ user });
  } catch (error) {
    console.error("Prisma error:", error);
    res.status(500).json({
      message: "error creating the user",
      error,
    });
  }
});

router.get("/get/user", async (req, res) => {
  const { username } = req.cookies.githubId;
  try {
    const user = await prisma.user.findUnique({
      where: {
        username,
      },
    });
    res.status(200).json({
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "cannot get the user",
    });
    console.log(error);
  }
});

export default router;
