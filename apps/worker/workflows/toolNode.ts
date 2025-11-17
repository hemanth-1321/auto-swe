import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { pool } from "../utils/vectordb";
import { indexRepo } from "../controllers/indexRepo";
import { publishUpdate } from "@repo/redis/client";

export const queryRepo = async (
  jobId: string,
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

  // Check if repo is indexed
  if (filtered.length === 0) {
    console.log(
      `Repository "${normalizedRepo}" not found in database. Starting indexing...`
    );

    const repoUrl = `https://github.com/${normalizedRepo}.git`;

    try {
      await publishUpdate(jobId, {
        stage: "indexing",
        message: `${repoUrl} is not indexed,indexing it please sit tight!.`,
      });

      // Wait for full indexing
      await indexRepo(repoUrl, jobId);
      console.log(
        ` Repository "${normalizedRepo}" indexed successfully. Retrying query...`
      );

      // -----------------------
      // FIX: Recreate vectorstore to read fresh data
      const freshVectorstore = await PGVectorStore.initialize(embeddings, {
        pool,
        tableName: "repo_vector",
      });

      const retryResults = await freshVectorstore.similaritySearch(prompt, 20);
      const retryFiltered = retryResults
        .filter((doc) => doc.metadata.repo?.endsWith(normalizedRepo))
        .slice(0, topK);

      return {
        repo: normalizedRepo,
        prompt,
        topK,
        totalMatches: retryFiltered.length,
        indexed: true,
        results: retryFiltered.map((doc, i) => ({
          index: i + 1,
          path: doc.metadata.path,
          repo: doc.metadata.repo,
          content: doc.pageContent,
        })),
      };
    } catch (error) {
      console.error(`Failed to index repository "${normalizedRepo}":`, error);
      throw new Error(`Repository not found and indexing failed: ${error}`);
    }
  }

  const output = {
    repo: normalizedRepo,
    prompt,
    topK,
    totalMatches: filtered.length,
    indexed: false,
    results: filtered.map((doc, i) => ({
      index: i + 1,
      path: doc.metadata.path,
      repo: doc.metadata.repo,
      content: doc.pageContent,
    })),
  };

  return output;
};
