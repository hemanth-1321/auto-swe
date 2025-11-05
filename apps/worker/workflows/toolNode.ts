import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { pool } from "../utils/vectordb";
export const queryRepo = async (
  prompt: string,
  repoInput: string,
  topK = 10
) => {
  console.log(`Querying repository "${repoInput}" for:`, prompt);

  const embeddings = new HuggingFaceInferenceEmbeddings({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    apiKey: process.env.HF_TOKEN,
  });

  if (!process.env.PG_URL) throw new Error("Missing PG_URL");

  let normalizedRepo = repoInput
    .replace(/^https?:\/\//, "")
    .replace("github.com/", "")
    .replace(".git", "")
    .replace(/^\/|\/$/g, "");

  if (!normalizedRepo.includes("/")) {
    normalizedRepo = `hemanth-1321/${normalizedRepo}`;
  }

  console.log(`Normalized repo name: "${normalizedRepo}"`);

  const vectorstore = await PGVectorStore.initialize(embeddings, {
    pool,
    tableName: "repo_vector",
  });

  const results = await vectorstore.similaritySearch(prompt, 20);
  const filtered = results
    .filter((doc) => doc.metadata.repo?.endsWith(normalizedRepo))
    .slice(0, topK);

  const output = {
    repo: normalizedRepo,
    prompt,
    topK,
    totalMatches: filtered.length,
    results: filtered.map((doc, i) => ({
      index: i + 1,
      path: doc.metadata.path,
      repo: doc.metadata.repo,
      content: doc.pageContent,
    })),
  };

  return output;
};
