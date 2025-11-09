import { BACKEND_URL } from "@/lib/constants";
import axios from "axios";

export const processRepo = async (repoUrl: string, prompt: string) => {
  const TOKEN = localStorage.getItem("token");

  if (!TOKEN) {
    console.error("No auth token found in localStorage.");
    return { success: false, error: "Not authenticated" };
  }

  let formattedRepoUrl = repoUrl;
  if (!repoUrl.startsWith("http")) {
    formattedRepoUrl = `https://github.com/${repoUrl}`;
  }

  try {
    const response = await axios.post(
      `${BACKEND_URL}/process/create`,
      {
        repoUrl: formattedRepoUrl,
        prompt,
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
      }
    );

    if (response.status === 200 || response.status === 201) {
      return {
        success: true,
        data: response.data,
      };
    } else {
      return {
        success: false,
        error: response.data?.message || "Unexpected response",
      };
    }
  } catch (error: any) {
    console.error("Error processing repo:", error);

    return {
      success: false,
      error:
        error.response?.data?.message ||
        error.message ||
        "Something went wrong while processing the repo",
    };
  }
};
