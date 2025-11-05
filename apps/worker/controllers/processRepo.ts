import Sandbox from "@e2b/code-interpreter";
import type { GraphState } from "../utils/state";
import { codeEditorGraph } from "../workflows/graph";
import { getInstallationAccessToken } from "@repo/github/github";
import { groqModel } from "../utils/llm";
import { generateCommitMessage } from "../utils/commitMessage";
import { Octokit } from "@octokit/rest";

export const processRepo = async (
  repoUrl: string,
  userPrompt: string,
  installationId: number
) => {
  const baseDir = "/home/user/project";
  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: 30 * 60 * 1000,
  });

  const repoName = repoUrl.split("/").pop()!.replace(".git", "");
  const cloneDir = `${baseDir}/${repoName}`;

  await sandbox.commands.run(`rm -rf ${baseDir}`);
  await sandbox.commands.run(`mkdir -p ${baseDir}`);
  await sandbox.commands.run(`rm -rf "${baseDir}" && mkdir -p "${baseDir}"`);
  const cloneResult = await sandbox.commands.run(
    `git clone "${repoUrl}" "${cloneDir}"`,
    { timeoutMs: 30 * 60 * 1000 }
  );

  if (cloneResult.exitCode !== 0)
    throw new Error(`Failed to clone repo: ${cloneResult.stderr}`);
  const initialState: GraphState = {
    prompt: userPrompt,
    repoPath: cloneDir,
    repoUrl: repoUrl,
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

  console.log("starting graph execution");

  const graphResult = await codeEditorGraph.invoke(initialState);
  console.log("Graph result keys:", Object.keys(graphResult));
  const aiResult = Array.isArray(graphResult.filesToModify)
    ? graphResult.filesToModify
    : (graphResult.filesToModify as any)?.value || [];

  const isValid =
    typeof graphResult.validationSuccess === "boolean"
      ? graphResult.validationSuccess
      : ((graphResult.validationSuccess as any)?.value ?? true);

  console.log(`Files to modify: ${aiResult.length}`);
  console.log(`Validation status: ${isValid}`);

  if (graphResult.error) {
    console.log("Graph execution error:", graphResult.error);
    return { sandbox, cloneDir };
  }

  const status = await sandbox.commands.run(
    `cd ${cloneDir} && git status --porcelain`
  );

  if (!status.stdout.trim()) {
    console.log("No changes detected, skipping commit.");
    return;
  }

  console.log("changes detected,preparing commit ...");

  await sandbox.commands.run(
    `git config --global user.email "autoswe-bot@users.noreply.github.com"`
  );
  await sandbox.commands.run(`git config --global user.name "AutoSWE Bot"`);
  const commitMessage = await generateCommitMessage(userPrompt);
  await sandbox.commands.run(`cd ${cloneDir} && git add -A`);
  await sandbox.commands.run(
    `cd ${cloneDir} && git commit -m "${commitMessage}"`
  );

  const token = await getInstallationAccessToken(installationId);
  const pushUrl = repoUrl.replace(
    "https://",
    `https://x-access-token:${token}@`
  );
  const branchName = `autoswe-edits-${Date.now()}`;
  await sandbox.commands.run(`cd ${cloneDir} && git checkout -b ${branchName}`);
  const pushResult = await sandbox.commands.run(
    `cd ${cloneDir} && git push ${pushUrl} HEAD:${branchName}`
  );
  if (pushResult.exitCode !== 0) {
    console.error("Push failed:", pushResult.stderr);
    return;
  }

  console.log("Pushed successfully. Creating PR...");

  const octokit = new Octokit({ auth: token });
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid GitHub repo URL: ${repoUrl}`);
  }
  const owner = match[1];
  const repo = match[2];
  const { data: pr } = await octokit.pulls.create({
    owner,
    repo,
    head: branchName,
    base: "main",
    title: `AI edits: ${userPrompt}`,
    body: `This PR contains AI-suggested changes:\n\n${userPrompt}`,
  });

  console.log("Pull request created:", pr.html_url);
};
