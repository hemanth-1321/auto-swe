import Sandbox from "@e2b/code-interpreter";
import type { GraphState } from "../utils/state";
import { codeEditorGraph } from "../workflows/graph";
import { getInstallationAccessToken } from "@repo/github/github";
import { generateCommitMessage } from "../utils/commitMessage";
import { Octokit } from "@octokit/rest";
import { publishUpdate } from "@repo/redis/client";

const SANDBOX_PATH_REGEX = /\/home\/user\/project(?:[^ \n]*)?/g;

const sanitizeFrontendText = (value: any): any => {
  if (!value || typeof value !== "string") return value;

  return value
    .replace(SANDBOX_PATH_REGEX, (match) => {
      return match.replace("/home/user/project", "").replace(/^\/+/, "");
    })
    .replace(/\/+/g, "/")
    .trim();
};

const deepSanitize = (obj: any): any => {
  if (!obj) return obj;

  if (typeof obj === "string") return sanitizeFrontendText(obj);

  if (Array.isArray(obj)) return obj.map((v) => deepSanitize(v));

  if (typeof obj === "object") {
    const sanitizedObj: any = {};
    for (const key of Object.keys(obj)) {
      sanitizedObj[key] = deepSanitize(obj[key]);
    }
    return sanitizedObj;
  }

  return obj;
};

const send = async (jobId: string, payload: any) => {
  const sanitized = deepSanitize(payload);
  await publishUpdate(jobId, sanitized);
};

/* ---------------------------------------------------------
   MAIN LOGIC (UNCHANGED)
--------------------------------------------------------- */

export const processRepo = async (
  repoUrl: string,
  userPrompt: string,
  installationId: number,
  jobId: string
) => {
  try {
    await send(jobId, {
      stage: "start",
      message: "Starting repository processing...",
    });

    const baseDir = "/home/user/project";

    const sandbox = await Sandbox.create({
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 30 * 60 * 1000,
    });

    const repoName = repoUrl.split("/").pop()!.replace(".git", "");
    const cloneDir = `${baseDir}/${repoName}`;

    await send(jobId, {
      stage: "init",
      message: "Preparing sandbox environment...",
    });

    await sandbox.commands.run(`rm -rf ${baseDir}`);
    await sandbox.commands.run(`mkdir -p ${baseDir}`);

    await send(jobId, {
      stage: "clone",
      message: `Cloning repository into ${cloneDir}...`,
    });

    const cloneResult = await sandbox.commands.run(
      `git clone "${repoUrl}" "${cloneDir}"`,
      { timeoutMs: 30 * 60 * 1000 }
    );

    if (cloneResult.exitCode !== 0) {
      await send(jobId, {
        stage: "error",
        message: `Failed to clone repository: ${cloneResult.stderr}`,
      });
      throw new Error(`Failed to clone repo: ${cloneResult.stderr}`);
    }

    await send(jobId, {
      stage: "analysis",
      message: "Analyzing repository and planning changes...",
    });

    const initialState: GraphState = {
      prompt: userPrompt,
      repoPath: cloneDir,
      repoUrl,
      jobId,
      sandbox,
      filePaths: [],
      fileContents: {},
      relevantFiles: [],
      changePlan: [],
      diff: "",
      applyResult: null,
      summary: "",
      error: "",
      attempts: 0,
      validationAttempts: 0,
      validationSuccess: false,
      filesToModify: [],
      stack: "",
    };

    const graphResult = await codeEditorGraph.invoke(initialState);

    await send(jobId, {
      stage: "analysis_done",
      message: "Analysis and code generation completed.",
    });

    if (graphResult.error) {
      await send(jobId, {
        stage: "error",
        message: `Analysis failed: ${graphResult.error}`,
      });
      return { sandbox, cloneDir };
    }

    // ------------------------------
    // Validation
    // ------------------------------
    await send(jobId, {
      stage: "validation",
      message: graphResult.validationSuccess
        ? "Code validation succeeded."
        : "Code validation failed.",
    });

    const status = await sandbox.commands.run(
      `cd "${cloneDir}" && git status --porcelain`
    );

    if (!status.stdout.trim()) {
      await send(jobId, {
        stage: "no_changes",
        message: "No changes detected, skipping commit.",
      });
      return;
    }

    await send(jobId, {
      stage: "commit",
      message: "Committing AI-suggested changes...",
    });

    await sandbox.commands.run(
      `git config --global user.email "autoswe-bot@users.noreply.github.com"`
    );
    await sandbox.commands.run(`git config --global user.name "AutoSWE Bot"`);

    const commitMessage = await generateCommitMessage(userPrompt);

    await sandbox.commands.run(`cd "${cloneDir}" && git add -A`);
    await sandbox.commands.run(
      `cd "${cloneDir}" && git commit -m "${commitMessage}"`
    );

    await send(jobId, {
      stage: "push",
      message: "Pushing committed changes to GitHub...",
    });

    const token = await getInstallationAccessToken(installationId);

    const pushUrl = repoUrl.replace(
      "https://",
      `https://x-access-token:${token}@`
    );

    const branchName = `autoswe-edits-${Date.now()}`;

    await sandbox.commands.run(
      `cd "${cloneDir}" && git checkout -b ${branchName}`
    );

    const pushResult = await sandbox.commands.run(
      `cd "${cloneDir}" && git push ${pushUrl} HEAD:${branchName}`
    );

    if (pushResult.exitCode !== 0) {
      await send(jobId, {
        stage: "error",
        message: `Failed to push changes: ${pushResult.stderr}`,
      });
      return;
    }

    await send(jobId, {
      stage: "pr",
      message: "Creating pull request on GitHub...",
    });

    const octokit = new Octokit({ auth: token });
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);

    if (!match) {
      await send(jobId, {
        stage: "error",
        message: "Invalid GitHub repository URL.",
      });
      throw new Error(`Invalid GitHub repo URL: ${repoUrl}`);
    }

    const owner = match[1]!;
    const repo = match[2]!;

    const { data: pr } = await octokit.pulls.create({
      owner,
      repo,
      head: branchName,
      base: "main",
      title: `AI edits: ${userPrompt}`,
      body: `This pull request contains AI-suggested changes:\n\n${userPrompt}`,
    });

    await send(jobId, {
      stage: "complete",
      message: `Pull request created successfully: ${pr.html_url}`,
    });
  } catch (err: any) {
    console.error("processRepo failed:", err);
    await send(jobId, {
      stage: "error",
      message: err.message || "Unknown error occurred.",
    });
  } finally {
    await send(jobId, {
      stage: "end",
      message: "Repository processing job finished.",
    });
  }
};
