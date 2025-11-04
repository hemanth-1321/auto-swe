import { tool } from "langchain";
import { z } from "zod";
import { queryRepo } from "./toolNode";

export const queryRepoTool = tool(
  async ({ prompt, repoName, topK }) => {
    const result = await queryRepo(prompt, repoName, topK);
    return JSON.stringify(result, null, 2);
  },
  {
    name: "query_repo",
    description:
      "Searches the indexed repository for code relevant to a query.",
    schema: z.object({
      prompt: z.string(),
      repoName: z.string(),
      topK: z.number().optional().default(5),
    }),
  }
);
