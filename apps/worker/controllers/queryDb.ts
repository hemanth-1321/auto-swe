import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { Pool } from "pg";
export const queryRepo = async (prompt: string, repoName: string, topK = 5) => {
  console.log(` Querying repository "${repoName}" for:`, prompt);

  const embeddings = new HuggingFaceInferenceEmbeddings({
    model: "sentence-transformers/all-MiniLM-L6-v2",
    apiKey: process.env.HF_TOKEN,
  });

  if (!process.env.PG_URL) {
    return;
  }
  const pool = new Pool({ connectionString: process.env.PG_URL });
  const vectorstore = await PGVectorStore.initialize(embeddings, {
    pool,
    tableName: "repo_vector",
  });

  const results = await vectorstore.similaritySearch(prompt, 20);
  const filtered = results
    .filter((doc) => doc.metadata.repo === repoName)
    .slice(0, topK);

  console.log(`Found ${filtered.length} results for repo ${repoName}`);
  for (const [i, doc] of filtered.entries()) {
    console.log(`\nResult #${i + 1}:`);
    console.log("Path:", doc.metadata.path);
    console.log("Repo:", doc.metadata.repo);
    console.log("Content:", doc.pageContent);
  }

  await pool.end();
  return filtered;
};

// Example usage:
// await queryRepo("change sum function to addtion ", "hemanth-1321/test");

// CREATE TABLE IF NOT EXISTS repo_index_state (
//   repo_name TEXT PRIMARY KEY,
//   last_commit TEXT NOT NULL,
//   last_indexed_at TIMESTAMP DEFAULT NOW(),
//   total_files INTEGER DEFAULT 0
// );
