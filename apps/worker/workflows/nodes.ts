import { createAgent } from "langchain";
import { ChatGroq } from "@langchain/groq";
import { GraphState } from "../utils/state";
import { queryRepoTool } from "./tools";

export const searchAgent = createAgent({
  model: new ChatGroq({
    model: "openai/gpt-oss-20b",
    apiKey: process.env.GROQ_API_KEY!,
  }),
  tools: [queryRepoTool],
});

export const searchFiles = async (state: GraphState) => {
  const { prompt, repoUrl } = state;
  if (!repoUrl) throw new Error("repoUrl missing in GraphState");

  const repoName = repoUrl.split("/").pop()!.replace(".git", "");

  const result = await searchAgent.invoke({
    messages: [
      {
        role: "system",
        content: `
          You are a code search assistant.
          You have access to a tool called "query_repo" that searches repositories.
          The repository name is: ${repoName}.
          Always use the tool to answer questions about the codebase.
        `,
      },
      {
        role: "user",
        content: `Find code related to: ${prompt}`,
      },
    ],
  });

  console.log("🔍 Search Result:", result);
  return result;
};
