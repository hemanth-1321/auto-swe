import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { App } from "@octokit/app";
import { Octokit } from "octokit";

const GITHUB_APP_ID = process.env.GITHUB_APP_ID;
const GITHUB_PRIVATE_KEY_PATH = process.env.GITHUB_PRIVATE_KEY_PATH;

if (!GITHUB_APP_ID) throw new Error("GITHUB_APP_ID is not set");
if (!GITHUB_PRIVATE_KEY_PATH)
  throw new Error("GITHUB_PRIVATE_KEY_PATH is not set");

const GITHUB_PRIVATE_KEY = fs.readFileSync(GITHUB_PRIVATE_KEY_PATH, "utf-8");

const app = new App({
  appId: Number(GITHUB_APP_ID),
  privateKey: GITHUB_PRIVATE_KEY,
});

export const getInstallationAccessToken = async (installationId: number) => {
  const octokit = await app.getInstallationOctokit(installationId);
  const { token } = (await octokit.auth({ type: "installation" })) as {
    token: string;
  };
  return token;
};

export const get_repos = async (installationId: number) => {
  try {
    const token = await getInstallationAccessToken(installationId);

    const octokit = new Octokit({ auth: token });
    const { data: repositories } =
      await octokit.rest.apps.listReposAccessibleToInstallation();

    return repositories;
  } catch (error) {
    console.log("error fetching repos");
  }
};

export const get_repo_by_name = async (
  installationId: number,
  owner: string,
  repo: string
) => {
  try {
    const token = await getInstallationAccessToken(installationId);

    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.request("GET /repos/{owner}/{repo}", {
      owner,
      repo,
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    return data;
  } catch (error: any) {
    console.error(
      `Error fetching repo ${owner}/${repo}:`,
      error?.response?.data || error.message
    );
    throw error;
  }
};

export const getUserFromInstallation = async (installationId: number) => {
  try {
    const { data: installation } = await app.octokit.request(
      "GET /app/installations/{installation_id}",
      {
        installation_id: installationId,
      }
    );
    const account = installation.account;

    return {
      githubId: account?.id,
      name: account?.login,
      avatarUrl: account?.avatar_url,
    };
  } catch (error: any) {
    console.error(
      `Error fetching user for installation ${installationId}:`,
      error
    );
    throw error;
  }
};
