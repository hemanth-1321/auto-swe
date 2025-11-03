import Sandbox from "@e2b/code-interpreter";

export const processRepo = async (repoUrl: string) => {
  const baseDir = "/home/user/project";
  const sandbox = await Sandbox.create({
    apiKey: process.env.E2B_API_KEY,
    timeoutMs: 30 * 60 * 1000,
  });

  const repoName = repoUrl.split("/").pop()!.replace(".git", "");
  const cloneDir = `${baseDir}/${repoName}`;

  await sandbox.commands.run(`rm -rf ${baseDir}`);
  await sandbox.commands.run(`mkdir -p ${baseDir}`);

  const cloneResult = await sandbox.commands.run(
    `cd clone ${repoUrl} ${cloneDir}`,
    { timeoutMs: 30 * 60 * 1000 }
  );

  if (cloneResult.exitCode !== 0)
    throw new Error(`Failed to clone repo: ${cloneResult.stderr}`);
};
