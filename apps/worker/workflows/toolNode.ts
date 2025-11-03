import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Pool } from "pg";

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

  if (!process.env.PG_URL) {
    console.error("Missing PG_URL");
    return [];
  }

  // 🧠 Normalize repo input into a consistent identifier
  let normalizedRepo = repoInput
    .replace("https://", "")
    .replace("http://", "")
    .replace("github.com/", "")
    .replace(".git", "")
    .replace(/^\/|\/$/g, "");
  if (!normalizedRepo.includes("/")) {
    const defaultUser = "hemanth-1321"; // change if needed
    normalizedRepo = `${defaultUser}/${normalizedRepo}`;
  }

  console.log(`Normalized repo name: "${normalizedRepo}"`);

  const pool = new Pool({ connectionString: process.env.PG_URL });
  const vectorstore = await PGVectorStore.initialize(embeddings, {
    pool,
    tableName: "repo_vector",
  });

  const results = await vectorstore.similaritySearch(prompt, 20);

  const filtered = results
    .filter((doc) => doc.metadata.repo?.endsWith(normalizedRepo))
    .slice(0, topK);

  console.log(` Found ${filtered.length} results for repo ${normalizedRepo}`);
  for (const [i, doc] of filtered.entries()) {
    console.log(`\nResult #${i + 1}:`);
    console.log("Path:", doc.metadata.path);
    console.log("Repo:", doc.metadata.repo);
    console.log("Content:", doc.pageContent);
  }

  await pool.end();
  return filtered;
};
